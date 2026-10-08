import type { Measurement, SensorConfig, Severity } from './types';
import { classifyMeasurement } from './anomaly';

export interface PersistenceResult {
  qualifyingMeasurements: number;
  longestRun: number;
  currentRun: number;
  persistent: boolean;
  severity: Severity;
}

export interface PersistenceOptions {
  minimumSeverity?: Exclude<Severity, 'normal'>;
  requiredConsecutivePoints?: number;
}

const severityRank: Record<Severity, number> = {
  normal: 0,
  watch: 1,
  elevated: 2,
  high: 3
};

export function analyzePersistence(
  measurements: Measurement[],
  sensor: SensorConfig,
  options: PersistenceOptions = {}
): PersistenceResult {
  const minimumSeverity = options.minimumSeverity ?? 'watch';
  const requiredConsecutivePoints =
    options.requiredConsecutivePoints ?? 3;

  if (measurements.length === 0) {
    throw new Error(`No measurements found for ${sensor.id}.`);
  }

  if (requiredConsecutivePoints < 1) {
    throw new Error('Required consecutive points must be at least one.');
  }

  let longestRun = 0;
  let currentRun = 0;
  let qualifyingMeasurements = 0;

  for (const measurement of measurements) {
    const severity = classifyMeasurement(measurement, sensor);

    if (severityRank[severity] >= severityRank[minimumSeverity]) {
      qualifyingMeasurements += 1;
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  const persistent =
    longestRun >= requiredConsecutivePoints;

  const finalSeverity = persistent
    ? measurements
        .slice(-currentRun)
        .map((measurement) =>
          classifyMeasurement(measurement, sensor)
        )
        .reduce<Severity>(
          (worst, severity) =>
            severityRank[severity] > severityRank[worst]
              ? severity
              : worst,
          'normal'
        )
    : 'normal';

  return {
    qualifyingMeasurements,
    longestRun,
    currentRun,
    persistent,
    severity: finalSeverity
  };
}