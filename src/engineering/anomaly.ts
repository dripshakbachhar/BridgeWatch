import type { ComponentAssessment, Measurement, SensorAnalysis, SensorConfig, Severity } from './types';

export function calculateZScore(value: number, baselineMean: number, baselineStd: number): number {
  if (baselineStd <= 0) throw new Error('Baseline standard deviation must be greater than zero.');
  return (value - baselineMean) / baselineStd;
}

export function classifyZScore(zScore: number): Severity {
  const magnitude = Math.abs(zScore);
  if (magnitude >= 3) return 'high';
  if (magnitude >= 2) return 'elevated';
  if (magnitude >= 1.5) return 'watch';
  return 'normal';
}
export function classifyMeasurement(
  measurement: Measurement,
  sensor: SensorConfig
): Severity {

  return classifyZScore(zScore);
}

function severityRank(severity: Severity): number {
  return { normal: 0, watch: 1, elevated: 2, high: 3 }[severity];
}

export function analyzeSensor(
  sensor: SensorConfig,
  measurements: Measurement[]
): SensorAnalysis {
  if (measurements.length === 0) throw new Error(`No measurements found for ${sensor.id}.`);

  const latestValue = measurements[measurements.length - 1].value;
  const zScore = calculateZScore(latestValue, sensor.baselineMean, sensor.baselineStd);
  const severity = classifyZScore(zScore);


  const reason = severity === 'normal'
    ? 'Measurement remains close to baseline.'
    : `Measurement is ${Math.abs(zScore).toFixed(2)} standard deviations from baseline.`;

  return {
    sensorId: sensor.id,
    componentId: sensor.componentId,
    latestValue,
    zScore,
    severity,
    reason
  };
}

export function assessComponent(analyses: SensorAnalysis[], componentId: string): ComponentAssessment {
  const sensorAnalyses = analyses.filter((analysis) => analysis.componentId === componentId);
  if (sensorAnalyses.length === 0) {
    throw new Error(`No sensor analyses found for ${componentId}.`);
  }

  const positiveDeviation = sensorAnalyses.reduce(
    (sum, analysis) => sum + Math.abs(analysis.zScore),
    0
  );
  const score = positiveDeviation / sensorAnalyses.length;
  const worstSeverity = sensorAnalyses.reduce<Severity>(
    (worst, analysis) => severityRank(analysis.severity) > severityRank(worst) ? analysis.severity : worst,
    'normal'
  );

  return { componentId, score, severity: worstSeverity, sensorAnalyses };
}
