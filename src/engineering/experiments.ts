import { calculateMean, calculateStandardDeviation } from './baseline';
import { calculateZScore } from './anomaly';
import { compensateForTemperature } from './environment';
import {
  generateMeasurements,
  type AnomalyStrength
} from './generator';
import { sensors } from './sensorConfig';
import type { Measurement, Scenario, SensorConfig } from './types';

export interface NormalOperationSensorResult {
  sensorId: string;
  calibrationMean: number;
  calibrationStd: number;
  evaluationCount: number;
  falseAlarmCount: number;
  falseAlarmRate: number;
}

export interface NormalOperationExperiment {
  experimentId: 'EXP-01';
  scenario: 'normal';
  seed: number;
  calibrationPoints: number;
  evaluationPoints: number;
  sensorResults: NormalOperationSensorResult[];
  totalEvaluationMeasurements: number;
  totalFalseAlarms: number;
  overallFalseAlarmRate: number;
}

export interface SignalInspection {
  sensorId: string;
  configuredBaselineStd: number;
  observedMean: number;
  observedStd: number;
  observedMinimum: number;
  observedMaximum: number;
  variationAmplitude: number;
  noiseStd: number;
}

export interface StructuralAnomalyResult {
  sensorId: string;
  componentId: string;
  detectionRate: number;
  maximumAbsoluteZScore: number;
}

export interface StructuralAnomalyExperiment {
  experimentId: 'EXP-02';
  scenario: 'structural-anomaly';
  seed: number;
  calibrationPoints: number;
  evaluationPoints: number;
  threshold: number;
  results: StructuralAnomalyResult[];
}

export interface AnomalyRobustnessResult {
  sensorId: string;
  componentId: string;
  strength: AnomalyStrength;
  threshold: number;
  seed: number;
  detectionRate: number;
  maximumAbsoluteZScore: number;
}

export interface AnomalyRobustnessExperiment {
  experimentId: 'EXP-03';
  thresholds: number[];
  strengths: AnomalyStrength[];
  seeds: number[];
  calibrationPoints: number;
  evaluationPoints: number;
  results: AnomalyRobustnessResult[];
}

export interface PersistenceExperimentResult {
  sensorId: string;
  componentId: string;
  threshold: number;
  persistenceWindow: number;
  seed: number;
  scenario: 'normal' | 'structural-anomaly';
  strength?: AnomalyStrength;
  evaluationCount: number;
  qualifyingEvents: number;
  firstDetectionIndex: number | null;
  detectionRate: number;
  maximumAbsoluteZScore: number;
}

export interface TemporalPersistenceExperiment {
  experimentId: 'EXP-04';
  thresholds: number[];
  persistenceWindows: number[];
  strengths: AnomalyStrength[];
  seeds: number[];
  calibrationPoints: number;
  evaluationPoints: number;
  normalResults: PersistenceExperimentResult[];
  anomalyResults: PersistenceExperimentResult[];
}

export interface PersistenceTradeoffResult {
  sensorId: string;
  componentId: string;
  threshold: number;
  persistenceWindow: number;
  seed: number;
  strength: AnomalyStrength;

  evaluationCount: number;

  falsePositiveCount: number;
  falsePositiveRate: number;

  detected: boolean;
  detectionIndex: number | null;
  detectionDelay: number | null;

  maximumAbsoluteZScore: number;
}

export interface PersistenceTradeoffSummary {
  threshold: number;
  persistenceWindow: number;
  strength: AnomalyStrength;

  totalNormalMeasurements: number;
  totalFalsePositives: number;
  falsePositiveRate: number;

  totalAnomalyCases: number;
  detectedAnomalyCases: number;
  detectionRate: number;

  averageDetectionDelay: number | null;
}

export interface PersistenceTradeoffExperiment {
  experimentId: 'EXP-05';
  thresholds: number[];
  persistenceWindows: number[];
  strengths: AnomalyStrength[];
  seeds: number[];
  calibrationPoints: number;
  evaluationPoints: number;
  results: PersistenceTradeoffResult[];
  summaries: PersistenceTradeoffSummary[];
}

export interface EnvironmentalPersistenceMetric {
  /** Number of consecutive threshold exceedances required to alert. */
  persistenceWindow: number;
  /** Qualifying alert episodes in normal data or before anomaly onset. */
  falseAlarmEpisodes: number;
  /** Whether a qualifying persistence run completed after anomaly onset. */
  anomalyDetected: boolean;
  /** Evaluation index when the persistence requirement was first satisfied. */
  detectionDelay: number | null;
}

export interface EnvironmentalCompensationExperimentResult {
  sensorId: string;
  componentId: string;
  condition: 'normal' | 'structural-anomaly';
  compensationMode: 'without-compensation' | 'with-compensation';
  seed: number;
  threshold: number;
  trueTemperatureCoefficient: number;
  assumedTemperatureCoefficient: number;
  calibrationPoints: number;
  evaluationPoints: number;
  falseAlarms: number;
  anomalyDetected: boolean;
  detectionRate: number;
  latestRawZScore: number;
  latestAdjustedZScore: number;
  latestResidual: number;
  normalizationStrategy:
    | 'pipeline-default'
    | 'raw-calibration-std'
    | 'compensated-calibration-std';
  anomalySeverityMultiplier: number;
  /** True only when a non-zero synthetic structural step was injected. */
  anomalyInjected: boolean;
  /** Threshold crossing in the zero-severity negative control. */
  zeroSeverityFalsePositive: boolean;
  detectionDelay: number | null;
  /** Secondary alert metrics; existing single-sample metrics remain unchanged. */
  persistenceMetrics: EnvironmentalPersistenceMetric[];
}

export interface EnvironmentalCompensationExperiment {
  experimentId: 'EXP-07';
  thresholds: number[];
  trueTemperatureCoefficients: number[];
  assumedTemperatureCoefficients: number[];
  seeds: number[];
  calibrationPoints: number;
  evaluationPoints: number;
  normalizationStrategy:
    | 'pipeline-default'
    | 'raw-calibration-std'
    | 'compensated-calibration-std';
  anomalySeverityMultiplier: number;
  persistenceWindows: number[];
  results: EnvironmentalCompensationExperimentResult[];
}

export interface EnvironmentalAnomalySeveritySweepEntry {
  anomalySeverityMultiplier: number;
  results: EnvironmentalCompensationExperimentResult[];
}

export interface EnvironmentalAnomalySeveritySweep {
  experimentId: 'EXP-07-SEVERITY-SWEEP';
  severityMultipliers: number[];
  thresholds: number[];
  trueTemperatureCoefficients: number[];
  assumedTemperatureCoefficients: number[];
  seeds: number[];
  calibrationPoints: number;
  evaluationPoints: number;
  normalizationStrategy:
    | 'pipeline-default'
    | 'raw-calibration-std'
    | 'compensated-calibration-std';
  persistenceWindows: number[];
  results: EnvironmentalAnomalySeveritySweepEntry[];
}

function validatePersistenceWindows(
  persistenceWindows: number[]
): void {
  if (
    persistenceWindows.length === 0 ||
    persistenceWindows.some(
      (window) => !Number.isInteger(window) || window <= 0
    ) ||
    new Set(persistenceWindows).size !== persistenceWindows.length
  ) {
    throw new Error(
      'EXP-07 persistence windows must be a non-empty list of unique positive integers.'
    );
  }
}

function severityThresholdExceeded(
  zScore: number,
  threshold: number
): boolean {
  return Math.abs(zScore) >= threshold;
}

function calculatePersistentDetection(
  absoluteZScores: number[],
  threshold: number,
  persistenceWindow: number
): number | null {
  if (persistenceWindow <= 0) {
    throw new Error('Persistence window must be greater than zero.');
  }

  for (
    let index = 0;
    index <= absoluteZScores.length - persistenceWindow;
    index += 1
  ) {
    const window = absoluteZScores.slice(
      index,
      index + persistenceWindow
    );

    const persistent = window.every(
      (zScore) => zScore >= threshold
    );

    if (persistent) {
      // Detection is timestamped when the final required sample arrives,
      // matching EXP-07's persistence-delay convention.
      return index + persistenceWindow - 1;
    }
  }

  return null;
}

function countPersistentFalsePositiveEpisodes(
  absoluteZScores: number[],
  threshold: number,
  persistenceWindow: number
): {
  count: number;
  firstDetectionIndex: number | null;
} {
  let count = 0;
  let firstDetectionIndex: number | null = null;
  let index = 0;

  while (index <= absoluteZScores.length - persistenceWindow) {
    const persistent = absoluteZScores
      .slice(index, index + persistenceWindow)
      .every((zScore) => zScore >= threshold);

    if (!persistent) {
      index += 1;
      continue;
    }

    if (firstDetectionIndex === null) {
      firstDetectionIndex = index;
    }

    count += 1;

    let endIndex = index + persistenceWindow;

    while (
      endIndex < absoluteZScores.length &&
      severityThresholdExceeded(
        absoluteZScores[endIndex],
        threshold
      )
    ) {
      endIndex += 1;
    }

    index = endIndex;
  }

  return {
    count,
    firstDetectionIndex
  };
}

export function runNormalOperationExperiment(
  sensors: SensorConfig[],
  seed = 7,
  calibrationPoints = 50,
  evaluationPoints = 50,
  threshold = 1.5
): NormalOperationExperiment {
  const sensorResults: NormalOperationSensorResult[] = [];

  for (const sensor of sensors) {
    const calibrationMeasurements = generateMeasurements(
      sensor,
      'normal',
      {
        points: calibrationPoints,
        seed
      }
    );

    const calibrationValues = calibrationMeasurements.map(
      (measurement) => measurement.value
    );

    const calibrationMean = calculateMean(calibrationValues);
    const calibrationStd = calculateStandardDeviation(
      calibrationValues
    );

    const evaluationMeasurements = generateMeasurements(
      sensor,
      'normal',
      {
        points: evaluationPoints,
        seed: seed + 1
      }
    );

    const falseAlarmCount = evaluationMeasurements.filter(
      (measurement) =>
        Math.abs(
          calculateZScore(
            measurement.value,
            calibrationMean,
            calibrationStd
          )
        ) >= threshold
    ).length;

    sensorResults.push({
      sensorId: sensor.id,
      calibrationMean,
      calibrationStd,
      evaluationCount: evaluationMeasurements.length,
      falseAlarmCount,
      falseAlarmRate:
        falseAlarmCount / evaluationMeasurements.length
    });
  }

  const totalEvaluationMeasurements = sensorResults.reduce(
    (sum, result) => sum + result.evaluationCount,
    0
  );

  const totalFalseAlarms = sensorResults.reduce(
    (sum, result) => sum + result.falseAlarmCount,
    0
  );

  return {
    experimentId: 'EXP-01',
    scenario: 'normal',
    seed,
    calibrationPoints,
    evaluationPoints,
    sensorResults,
    totalEvaluationMeasurements,
    totalFalseAlarms,
    overallFalseAlarmRate:
      totalFalseAlarms / totalEvaluationMeasurements
  };
}

export function inspectSignalComponents(
  sensors: SensorConfig[],
  seed = 7,
  points = 50
): SignalInspection[] {
  return sensors.map((sensor) => {
    const measurements = generateMeasurements(
      sensor,
      'normal',
      {
        points,
        seed
      }
    );

    const values = measurements.map(
      (measurement) => measurement.value
    );

    return {
      sensorId: sensor.id,
      configuredBaselineStd: sensor.baselineStd,
      observedMean: calculateMean(values),
      observedStd: calculateStandardDeviation(values),
      observedMinimum: Math.min(...values),
      observedMaximum: Math.max(...values),
      variationAmplitude: sensor.variationAmplitude,
      noiseStd: sensor.noiseStd
    };
  });
}

export function runStructuralAnomalyExperiment(
  sensors: SensorConfig[],
  threshold = 1.5,
  seed = 7,
  calibrationPoints = 50,
  evaluationPoints = 50,
  strength: AnomalyStrength = 'medium'
): StructuralAnomalyExperiment {
  const results: StructuralAnomalyResult[] = [];

  for (const sensor of sensors) {
    const calibrationMeasurements = generateMeasurements(
      sensor,
      'normal',
      {
        points: calibrationPoints,
        seed
      }
    );

    const calibrationValues = calibrationMeasurements.map(
      (measurement) => measurement.value
    );

    const calibrationMean = calculateMean(calibrationValues);
    const calibrationStd = calculateStandardDeviation(
      calibrationValues
    );

    const evaluationMeasurements = generateMeasurements(
      sensor,
      'structural-anomaly',
      {
        points: evaluationPoints,
        seed: seed + 1,
        anomalyStrength: strength
      }
    );

    const zScores = evaluationMeasurements.map(
      (measurement) =>
        Math.abs(
          calculateZScore(
            measurement.value,
            calibrationMean,
            calibrationStd
          )
        )
    );

    const detectionCount = zScores.filter(
      (zScore) => zScore >= threshold
    ).length;

    const anomalyActive =
      sensor.componentId === 'PIER-02' &&
      (
        sensor.type === 'accelerometer' ||
        sensor.type === 'tilt'
      );

    if (anomalyActive) {
      results.push({
        sensorId: sensor.id,
        componentId: sensor.componentId,
        detectionRate:
          detectionCount / evaluationMeasurements.length,
        maximumAbsoluteZScore: Math.max(...zScores)
      });
    }
  }

  return {
    experimentId: 'EXP-02',
    scenario: 'structural-anomaly',
    seed,
    calibrationPoints,
    evaluationPoints,
    threshold,
    results
  };
}

export function runAnomalyRobustnessExperiment(
  sensors: SensorConfig[],
  thresholds = [1.5, 2, 3],
  strengths: AnomalyStrength[] = [
    'small',
    'medium',
    'strong'
  ],
  seeds = [7, 17, 27, 37, 47],
  calibrationPoints = 50,
  evaluationPoints = 50
): AnomalyRobustnessExperiment {
  const results: AnomalyRobustnessResult[] = [];

  for (const seed of seeds) {
    for (const threshold of thresholds) {
      for (const strength of strengths) {
        const experiment = runStructuralAnomalyExperiment(
          sensors,
          threshold,
          seed,
          calibrationPoints,
          evaluationPoints,
          strength
        );

        for (const result of experiment.results) {
          results.push({
            ...result,
            strength,
            threshold,
            seed
          });
        }
      }
    }
  }

  return {
    experimentId: 'EXP-03',
    thresholds,
    strengths,
    seeds,
    calibrationPoints,
    evaluationPoints,
    results
  };
}

function analyzePersistentAnomalies(
  sensor: SensorConfig,
  scenario: 'normal' | 'structural-anomaly',
  threshold: number,
  persistenceWindow: number,
  seed: number,
  calibrationPoints: number,
  evaluationPoints: number,
  strength?: AnomalyStrength
): PersistenceExperimentResult {
  const calibrationMeasurements = generateMeasurements(
    sensor,
    'normal',
    {
      points: calibrationPoints,
      seed
    }
  );

  const calibrationValues = calibrationMeasurements.map(
    (measurement) => measurement.value
  );

  const calibrationMean = calculateMean(calibrationValues);
  const calibrationStd = calculateStandardDeviation(
    calibrationValues
  );

  const evaluationMeasurements = generateMeasurements(
    sensor,
    scenario,
    {
      points: evaluationPoints,
      seed: seed + 1,
      anomalyStrength: strength
    }
  );

  const absoluteZScores = evaluationMeasurements.map(
    (measurement) =>
      Math.abs(
        calculateZScore(
          measurement.value,
          calibrationMean,
          calibrationStd
        )
      )
  );

  let qualifyingEvents = 0;
  let firstDetectionIndex: number | null = null;

  for (
    let index = 0;
    index <= absoluteZScores.length - persistenceWindow;
    index += 1
  ) {
    const window = absoluteZScores.slice(
      index,
      index + persistenceWindow
    );

    const persistent = window.every(
      (zScore) => zScore >= threshold
    );

    if (persistent) {
      qualifyingEvents += 1;

      if (firstDetectionIndex === null) {
        firstDetectionIndex = index;
      }
    }
  }

  const anomalyActive =
    scenario === 'structural-anomaly' &&
    sensor.componentId === 'PIER-02' &&
    (
      sensor.type === 'accelerometer' ||
      sensor.type === 'tilt'
    );

  const detectionRate = anomalyActive
    ? (
        firstDetectionIndex === null
          ? 0
          : 1
      )
    : 0;

  return {
    sensorId: sensor.id,
    componentId: sensor.componentId,
    threshold,
    persistenceWindow,
    seed,
    scenario,
    strength,
    evaluationCount: evaluationMeasurements.length,
    qualifyingEvents,
    firstDetectionIndex,
    detectionRate,
    maximumAbsoluteZScore: Math.max(...absoluteZScores)
  };
}

export function runTemporalPersistenceExperiment(
  sensors: SensorConfig[],
  thresholds = [1.5, 2, 3],
  persistenceWindows = [1, 2, 3, 5],
  strengths: AnomalyStrength[] = [
    'small',
    'medium',
    'strong'
  ],
  seeds = [7, 17, 27, 37, 47],
  calibrationPoints = 50,
  evaluationPoints = 50
): TemporalPersistenceExperiment {
  const normalResults: PersistenceExperimentResult[] = [];
  const anomalyResults: PersistenceExperimentResult[] = [];

  for (const seed of seeds) {
    for (const threshold of thresholds) {
      for (const persistenceWindow of persistenceWindows) {
        for (const sensor of sensors) {
          normalResults.push(
            analyzePersistentAnomalies(
              sensor,
              'normal',
              threshold,
              persistenceWindow,
              seed,
              calibrationPoints,
              evaluationPoints
            )
          );

          for (const strength of strengths) {
            const result = analyzePersistentAnomalies(
              sensor,
              'structural-anomaly',
              threshold,
              persistenceWindow,
              seed,
              calibrationPoints,
              evaluationPoints,
              strength
            );

            if (result.detectionRate > 0) {
              anomalyResults.push(result);
            }
          }
        }
      }
    }
  }

  return {
    experimentId: 'EXP-04',
    thresholds,
    persistenceWindows,
    strengths,
    seeds,
    calibrationPoints,
    evaluationPoints,
    normalResults,
    anomalyResults
  };
}

export function runPersistenceTradeoffExperiment(
  sensors: SensorConfig[],
  thresholds = [1.5, 2, 3],
  persistenceWindows = [1, 2, 3, 5],
  strengths: AnomalyStrength[] = [
    'small',
    'medium',
    'strong'
  ],
  seeds = [7, 17, 27, 37, 47],
  calibrationPoints = 50,
  evaluationPoints = 50
): PersistenceTradeoffExperiment {
  const results: PersistenceTradeoffResult[] = [];

  const affectedSensors = sensors.filter(
    (sensor) =>
      sensor.componentId === 'PIER-02' &&
      (
        sensor.type === 'accelerometer' ||
        sensor.type === 'tilt'
      )
  );

  for (const seed of seeds) {
    for (const threshold of thresholds) {
      for (const persistenceWindow of persistenceWindows) {
        for (const sensor of sensors) {
          const calibrationMeasurements = generateMeasurements(
            sensor,
            'normal',
            {
              points: calibrationPoints,
              seed
            }
          );

          const calibrationValues = calibrationMeasurements.map(
            (measurement) => measurement.value
          );

          const calibrationMean = calculateMean(
            calibrationValues
          );

          const calibrationStd =
            calculateStandardDeviation(calibrationValues);

          const normalEvaluation = generateMeasurements(
            sensor,
            'normal',
            {
              points: evaluationPoints,
              seed: seed + 1
            }
          );

          const normalZScores = normalEvaluation.map(
            (measurement) =>
              Math.abs(
                calculateZScore(
                  measurement.value,
                  calibrationMean,
                  calibrationStd
                )
              )
          );

          const normalEpisodes =
            countPersistentFalsePositiveEpisodes(
              normalZScores,
              threshold,
              persistenceWindow
            );

          for (const strength of strengths) {
            if (!affectedSensors.includes(sensor)) {
              continue;
            }

            const anomalyEvaluation = generateMeasurements(
              sensor,
              'structural-anomaly',
              {
                points: evaluationPoints,
                seed: seed + 1,
                anomalyStrength: strength
              }
            );

            const anomalyZScores = anomalyEvaluation.map(
              (measurement) =>
                Math.abs(
                  calculateZScore(
                    measurement.value,
                    calibrationMean,
                    calibrationStd
                  )
                )
            );

            const detectionIndex =
              calculatePersistentDetection(
                anomalyZScores,
                threshold,
                persistenceWindow
              );

            results.push({
              sensorId: sensor.id,
              componentId: sensor.componentId,
              threshold,
              persistenceWindow,
              seed,
              strength,
              evaluationCount:
                anomalyEvaluation.length,
              falsePositiveCount:
                normalEpisodes.count,
              falsePositiveRate:
                normalEpisodes.count /
                normalEvaluation.length,
              detected: detectionIndex !== null,
              detectionIndex,
              detectionDelay:
                detectionIndex === null
                  ? null
                  : detectionIndex,
              maximumAbsoluteZScore:
                Math.max(...anomalyZScores)
            });
          }
        }
      }
    }
  }

  const summaries: PersistenceTradeoffSummary[] = [];

  for (const threshold of thresholds) {
    for (const persistenceWindow of persistenceWindows) {
      for (const strength of strengths) {
        const matchingResults = results.filter(
          (result) =>
            result.threshold === threshold &&
            result.persistenceWindow === persistenceWindow &&
            result.strength === strength
        );

        const totalNormalMeasurements =
          matchingResults.reduce(
            (sum, result) => sum + result.evaluationCount,
            0
          );

        const totalFalsePositives =
          matchingResults.reduce(
            (sum, result) =>
              sum + result.falsePositiveCount,
            0
          );

        const detectedAnomalyCases =
          matchingResults.filter(
            (result) => result.detected
          ).length;

        const delays = matchingResults
          .map((result) => result.detectionDelay)
          .filter(
            (delay): delay is number =>
              delay !== null
          );

        summaries.push({
          threshold,
          persistenceWindow,
          strength,
          totalNormalMeasurements,
          totalFalsePositives,
          falsePositiveRate:
            totalFalsePositives /
            totalNormalMeasurements,
          totalAnomalyCases:
            matchingResults.length,
          detectedAnomalyCases,
          detectionRate:
            detectedAnomalyCases /
            matchingResults.length,
          averageDetectionDelay:
            delays.length === 0
              ? null
              : calculateMean(delays)
        });
      }
    }
  }

  return {
    experimentId: 'EXP-05',
    thresholds,
    persistenceWindows,
    strengths,
    seeds,
    calibrationPoints,
    evaluationPoints,
    results,
    summaries
  };
}
// ============================================================
// EXP-06 — Temporal Anomaly Patterns
// ============================================================

export type TemporalPattern =
  | 'progressive'
  | 'sudden-persistent'
  | 'intermittent'
  | 'transient';

export interface TemporalPatternResult {
  seed: number;
  threshold: number;
  persistence: number;
  anomalyStrength: AnomalyStrength;
  pattern: TemporalPattern;
  sensorId: string;
  detected: boolean;
  detectionIndex: number | null;
  detectionDelay: number | null;
  maximumAbsoluteZ: number;
}

export interface TemporalPatternSummary {
  threshold: number;
  persistence: number;
  anomalyStrength: AnomalyStrength;
  pattern: TemporalPattern;
  detectionRate: number;
  averageDetectionDelay: number | null;
  maximumAbsoluteZ: number;
  sampleCount: number;
}

function temporalPatternFactor(
  pattern: TemporalPattern,
  index: number,
  onsetIndex: number,
  totalPoints: number
): number {
  if (index < onsetIndex) {
    return 0;
  }

  switch (pattern) {
    case 'progressive': {
      const remaining = Math.max(totalPoints - onsetIndex - 1, 1);

      return Math.min(
        1,
        (index - onsetIndex) / remaining
      );
    }

    case 'sudden-persistent':
      return 1;

    case 'intermittent': {
      const relativeIndex = index - onsetIndex;
      const block = Math.floor(relativeIndex / 5);

      return block % 2 === 0 ? 1 : 0;
    }

    case 'transient': {
      const relativeIndex = index - onsetIndex;

      return relativeIndex >= 0 && relativeIndex < 3
        ? 1
        : 0;
    }

    default:
      return 0;
  }
}
function buildTemporalPatternSeries(
  normalSeries: Measurement[],
  anomalySeries: Measurement[],
  pattern: TemporalPattern
): Measurement[] {
  const length = Math.min(
    normalSeries.length,
    anomalySeries.length
  );

  if (length === 0) {
    return [];
  }

  const onsetIndex = Math.floor(length * 0.5);

  return normalSeries
    .slice(0, length)
    .map((normalMeasurement, index) => {
      const anomalyMeasurement = anomalySeries[index];

      const rawDeviation =
        anomalyMeasurement.value -
        normalMeasurement.value;

      /*
       * The structural-anomaly generator already scales
       * anomaly magnitude with progress. Remove that
       * built-in ramp so EXP-06 controls temporal shape
       * independently.
       */
      const generatorProgress =
        length <= 1
          ? 1
          : index / (length - 1);

      const constantDeviation =
        index >= onsetIndex && generatorProgress > 0
          ? rawDeviation / generatorProgress
          : 0;

      const factor = temporalPatternFactor(
        pattern,
        index,
        onsetIndex,
        length
      );

      return {
        timestamp: normalMeasurement.timestamp,
        sensorId: normalMeasurement.sensorId,
        value:
          normalMeasurement.value +
          constantDeviation * factor
      };
    });
}

function calculateMaximumAbsoluteZ(
  series: Measurement[],
  baselineMean: number,
  baselineStd: number
): number {
  if (series.length === 0) {
    return 0;
  }

  return Math.max(
    ...series.map((measurement) =>
      Math.abs(
        calculateZScore(
          measurement.value,
          baselineMean,
          baselineStd
        )
      )
    )
  );
}

function runTemporalPatternDetection(
  series: Measurement[],
  baselineMean: number,
  baselineStd: number,
  threshold: number,
  persistence: number,
  onsetIndex: number
): {
  detected: boolean;
  detectionIndex: number | null;
  detectionDelay: number | null;
} {
  let consecutive = 0;

  for (
    let index = 0;
    index < series.length;
    index += 1
  ) {
    const zScore = Math.abs(
      calculateZScore(
        series[index].value,
        baselineMean,
        baselineStd
      )
    );

    if (zScore >= threshold) {
      consecutive += 1;
    } else {
      consecutive = 0;
    }

    if (consecutive >= persistence) {
      const detectionIndex =
        index - persistence + 1;

      /*
       * Only count detections occurring after the
       * intended anomaly onset. This prevents normal
       * pre-onset variation from being treated as an
       * anomaly detection.
       */
      if (detectionIndex >= onsetIndex) {
        return {
          detected: true,
          detectionIndex,
          detectionDelay:
            detectionIndex - onsetIndex
        };
      }

      /*
       * A pre-onset qualifying sequence should not
       * contaminate the actual experiment.
       */
      consecutive = 0;
    }
  }

  return {
    detected: false,
    detectionIndex: null,
    detectionDelay: null
  };
}

export function runTemporalPatternExperiment(): {
  experiment: 'EXP-06';
  results: TemporalPatternResult[];
  summaries: TemporalPatternSummary[];
} {
  const seeds = [7, 17, 27, 37, 47];

  const thresholds = [1.5, 2, 3];

  const persistenceWindows = [1, 2, 3, 5];

  const strengths: AnomalyStrength[] = [
    'small',
    'medium',
    'strong'
  ];

  const patterns: TemporalPattern[] = [
    'progressive',
    'sudden-persistent',
    'intermittent',
    'transient'
  ];

  const sensorIds = ['ACC-02', 'TLT-01'];

  const points = 50;

  const results: TemporalPatternResult[] = [];

  for (const seed of seeds) {
    for (const threshold of thresholds) {
      for (const persistence of persistenceWindows) {
        for (const anomalyStrength of strengths) {
          for (const pattern of patterns) {
            for (const sensorId of sensorIds) {
              const sensor = sensors.find(
                (candidate) => candidate.id === sensorId
              );

              if (!sensor) {
                continue;
              }

              const normalSeries =
                generateMeasurements(
                  sensor,
                  'normal',
                  {
                    points,
                    seed
                  }
                );

              const anomalySeries =
                generateMeasurements(
                  sensor,
                  'structural-anomaly',
                  {
                    points,
                    seed,
                    anomalyStrength
                  }
                );

              const patternedSeries =
                buildTemporalPatternSeries(
                  normalSeries,
                  anomalySeries,
                  pattern
                );

              const onsetIndex =
                Math.floor(points * 0.5);

              const detection =
                runTemporalPatternDetection(
                  patternedSeries,
                  sensor.baselineMean,
                  sensor.baselineStd,
                  threshold,
                  persistence,
                  onsetIndex
                );

              const maximumAbsoluteZ =
                calculateMaximumAbsoluteZ(
                  patternedSeries,
                  sensor.baselineMean,
                  sensor.baselineStd
                );

              results.push({
                seed,
                threshold,
                persistence,
                anomalyStrength,
                pattern,
                sensorId,
                detected: detection.detected,
                detectionIndex:
                  detection.detectionIndex,
                detectionDelay:
                  detection.detectionDelay,
                maximumAbsoluteZ
              });
            }
          }
        }
      }
    }
  }

  const summaries: TemporalPatternSummary[] = [];

  for (const threshold of thresholds) {
    for (const persistence of persistenceWindows) {
      for (const anomalyStrength of strengths) {
        for (const pattern of patterns) {
          const matchingResults =
            results.filter(
              (result) =>
                result.threshold === threshold &&
                result.persistence === persistence &&
                result.anomalyStrength ===
                  anomalyStrength &&
                result.pattern === pattern
            );

          const detectedResults =
            matchingResults.filter(
              (result) => result.detected
            );

          const delays = detectedResults
            .map(
              (result) => result.detectionDelay
            )
            .filter(
              (delay): delay is number =>
                delay !== null
            );

          summaries.push({
            threshold,
            persistence,
            anomalyStrength,
            pattern,
            detectionRate:
              matchingResults.length === 0
                ? 0
                : detectedResults.length /
                  matchingResults.length,
            averageDetectionDelay:
              delays.length === 0
                ? null
                : delays.reduce(
                    (sum, delay) => sum + delay,
                    0
                  ) / delays.length,
            maximumAbsoluteZ:
              matchingResults.length === 0
                ? 0
                : Math.max(
                    ...matchingResults.map(
                      (result) =>
                        result.maximumAbsoluteZ
                    )
                  ),
            sampleCount: matchingResults.length
          });
        }
      }
    }
  }

  return {
    experiment: 'EXP-06',
    results,
    summaries
  };
}



 // ============================================================
 // EXP-07 — Environmental Compensation and Coefficient Mismatch
 // ============================================================

interface EnvironmentalSyntheticSeries {
  measurements: Measurement[];
  temperatures: Measurement[];
  onsetIndex: number;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createEnvironmentalSyntheticSeries(
  sensor: SensorConfig,
  seed: number,
  trueTemperatureCoefficient: number,
  calibrationPoints: number,
  evaluationPoints: number,
  condition: 'normal' | 'structural-anomaly',
  anomalySeverityMultiplier: number
): EnvironmentalSyntheticSeries {
  const random = createSeededRandom(seed);
  const totalPoints = calibrationPoints + evaluationPoints;

  const onsetIndex =
    calibrationPoints + Math.floor(evaluationPoints * 0.5);

  const baselineTemperature = 20;

  const anomalyOffset =
    condition === 'structural-anomaly'
      ? anomalySeverityMultiplier * sensor.baselineStd
      : 0;

  const measurements: Measurement[] = [];
  const temperatures: Measurement[] = [];

  for (let index = 0; index < totalPoints; index += 1) {
    // Simulated environmental temperature; not field data.
    const temperatureValue =
      baselineTemperature +
      0.045 * index +
      1.1 * Math.sin(index * 0.16) +
      (random() - 0.5) * 0.15;

    // Preserve the existing deterministic noise generation.
    const centeredNoise =
      random() + random() + random() - 1.5;

    // Periodic variation matching the generator model.
    const seasonal =
      sensor.variationAmplitude *
      Math.sin(2 * Math.PI * sensor.frequency * index);

    // Apply the structural change only after its onset.
    const structuralDeviation =
      condition === 'structural-anomaly' &&
      index >= onsetIndex
        ? anomalyOffset
        : 0;

    const value =
      sensor.baselineMean +
      seasonal +
      trueTemperatureCoefficient *
        (temperatureValue - baselineTemperature) +
      centeredNoise * sensor.noiseStd * 2 +
      structuralDeviation;

    measurements.push({
      timestamp: index,
      sensorId: sensor.id,
      value
    });

    temperatures.push({
      timestamp: index,
      sensorId: 'TMP-SYNTH-01',
      value: temperatureValue
    });
  }

  return {
    measurements,
    temperatures,
    onsetIndex
  };
}

function evaluateEnvironmentalSeries(
  sensor: SensorConfig,
  series: EnvironmentalSyntheticSeries,
  seed: number,
  threshold: number,
  trueTemperatureCoefficient: number,
  assumedTemperatureCoefficient: number,
  calibrationPoints: number,
  evaluationPoints: number,
  condition: 'normal' | 'structural-anomaly',
  compensationMode:
    | 'without-compensation'
    | 'with-compensation',
  normalizationStrategy:
    | 'pipeline-default'
    | 'raw-calibration-std'
    | 'compensated-calibration-std' = 'pipeline-default',
  anomalySeverityMultiplier = 2.5,
  persistenceWindows = [1, 2, 3, 5]
): EnvironmentalCompensationExperimentResult {
  const calibrationMeasurements =
    series.measurements.slice(0, calibrationPoints);

  const calibrationValues = calibrationMeasurements.map(
    (measurement) => measurement.value
  );

  const calibrationMean = calculateMean(calibrationValues);

  // Scale used by the uncompensated baseline method.
  const calibrationStd = Math.max(
    calculateStandardDeviation(calibrationValues),
    sensor.baselineStd * 0.1
  );

  /*
   * Calculate the compensated scale from calibration data only.
   *
   * Use the assumed coefficient so that the calibration scale
   * reflects the same coefficient assumption as evaluation.
   * No evaluation or anomaly samples enter this calculation.
   */
  const calibrationTemperatures = series.temperatures.slice(
    0,
    calibrationPoints
  );

  const calibrationTemperatureMean = calculateMean(
    calibrationTemperatures.map(
      (measurement) => measurement.value
    )
  );

  const calibrationResiduals = calibrationMeasurements.map(
    (measurement, index) =>
      measurement.value -
      (
        calibrationMean +
        assumedTemperatureCoefficient *
          (
            calibrationTemperatures[index].value -
            calibrationTemperatureMean
          )
      )
  );

  const compensatedCalibrationStd = Math.max(
    calculateStandardDeviation(calibrationResiduals),
    1e-9
  );

  const normalizationStd =
    normalizationStrategy === 'raw-calibration-std'
      ? calibrationStd
      : normalizationStrategy === 'compensated-calibration-std'
        ? compensatedCalibrationStd
        : compensationMode === 'without-compensation'
          ? calibrationStd
          : compensatedCalibrationStd;

  const evaluationMeasurements =
    series.measurements.slice(
      calibrationPoints,
      calibrationPoints + evaluationPoints
    );

  const scores: number[] = [];
  const rawScores: number[] = [];
  const residuals: number[] = [];

  for (const measurement of evaluationMeasurements) {
    const rawScore = calculateZScore(
      measurement.value,
      calibrationMean,
      calibrationStd
    );

    rawScores.push(rawScore);

    if (compensationMode === 'without-compensation') {
      scores.push(
        (measurement.value - calibrationMean) / normalizationStd
      );
      residuals.push(measurement.value - calibrationMean);
      continue;
    }

    /*
     * Evaluate the current timestamp while keeping the original
     * calibration window fixed. The compensation function receives
     * measurements only up to the current evaluation point.
     */
    const measurementIndex = measurement.timestamp;

    const measurementsThroughCurrentPoint =
      series.measurements.slice(0, measurementIndex + 1);

    const temperaturesThroughCurrentPoint =
      series.temperatures.slice(0, measurementIndex + 1);

    const compensated = compensateForTemperature(
      {
        ...sensor,
        temperatureCoefficient: assumedTemperatureCoefficient
      },
      measurementsThroughCurrentPoint,
      temperaturesThroughCurrentPoint,
      {
        calibrationPoints,
        assumedTemperatureCoefficient
      }
    );

    // Sensitivity runs can apply either calibration scale to either
    // processing mode; the default preserves the original pipeline.
    scores.push(compensated.residual / normalizationStd);

    residuals.push(compensated.residual);
  }

  const normalFalseAlarmCount = scores.filter(
    (score) => Math.abs(score) >= threshold
  ).length;

  // Convert the absolute series onset into an evaluation index.
  const localOnsetIndex = Math.max(
    0,
    series.onsetIndex - calibrationPoints
  );

  const postOnsetScores = scores.slice(localOnsetIndex);

  const firstPostOnsetDetectionIndex =
    postOnsetScores.findIndex(
      (score) => Math.abs(score) >= threshold
    );

  const detectionDelay =
    condition === 'structural-anomaly' &&
    firstPostOnsetDetectionIndex >= 0
      ? firstPostOnsetDetectionIndex
      : null;

  const anomalyDetected = detectionDelay !== null;

  const countPersistenceEpisodes = (
    values: number[],
    persistenceWindow: number
  ): number => {
    let consecutive = 0;
    let episodes = 0;

    for (const score of values) {
      if (Math.abs(score) >= threshold) {
        consecutive += 1;
        if (consecutive === persistenceWindow) {
          episodes += 1;
        }
      } else {
        consecutive = 0;
      }
    }

    return episodes;
  };

  const findPersistenceDetectionDelay = (
    values: number[],
    persistenceWindow: number
  ): number | null => {
    let consecutive = 0;

    for (let index = 0; index < values.length; index += 1) {
      if (Math.abs(values[index]!) >= threshold) {
        consecutive += 1;
        if (consecutive >= persistenceWindow) {
          // Alert time is when the final required consecutive sample arrives.
          return index;
        }
      } else {
        consecutive = 0;
      }
    }

    return null;
  };

  const persistenceMetrics: EnvironmentalPersistenceMetric[] =
    persistenceWindows.map((persistenceWindow) => {
      const preOnsetScores = scores.slice(0, localOnsetIndex);
      const postOnsetDetectionDelay =
        condition === 'structural-anomaly'
          ? findPersistenceDetectionDelay(
              postOnsetScores,
              persistenceWindow
            )
          : null;

      return {
        persistenceWindow,
        falseAlarmEpisodes:
          condition === 'normal' ||
          (
            condition === 'structural-anomaly' &&
            anomalySeverityMultiplier === 0
          )
            ? countPersistenceEpisodes(scores, persistenceWindow)
            : countPersistenceEpisodes(
                preOnsetScores,
                persistenceWindow
              ),
        anomalyDetected: postOnsetDetectionDelay !== null,
        detectionDelay: postOnsetDetectionDelay
      };
    });

  const detectionRate =
    condition === 'structural-anomaly' &&
    postOnsetScores.length > 0
      ? postOnsetScores.filter(
          (score) => Math.abs(score) >= threshold
        ).length / postOnsetScores.length
      : 0;

  return {
    sensorId: sensor.id,
    componentId: sensor.componentId,
    condition,
    compensationMode,
    seed,
    threshold,
    trueTemperatureCoefficient,
    assumedTemperatureCoefficient,
    calibrationPoints,
    evaluationPoints,
    falseAlarms:
      condition === 'normal' ||
      (
        condition === 'structural-anomaly' &&
        anomalySeverityMultiplier === 0
      )
        ? normalFalseAlarmCount
        : scores
            .slice(0, localOnsetIndex)
            .filter((score) => Math.abs(score) >= threshold)
            .length,
    anomalyDetected,
    detectionRate,
    latestRawZScore:
      rawScores.length > 0
        ? rawScores[rawScores.length - 1]
        : 0,
    latestAdjustedZScore:
      scores.length > 0
        ? scores[scores.length - 1]
        : 0,
    latestResidual:
      residuals.length > 0
        ? residuals[residuals.length - 1]
        : 0,
    normalizationStrategy,
    anomalySeverityMultiplier,
    anomalyInjected:
      condition === 'structural-anomaly' && anomalySeverityMultiplier > 0,
    zeroSeverityFalsePositive:
      condition === 'structural-anomaly' &&
      anomalySeverityMultiplier === 0 &&
      anomalyDetected,
    detectionDelay,
    persistenceMetrics
  };
}

export function runEnvironmentalCompensationExperiment(
  thresholds = [1.5, 2, 3],
  trueTemperatureCoefficients = [4, 8, 12],
  assumedTemperatureCoefficients = [0, 4, 8, 12, 16],
  seeds = [7, 17, 27],
  calibrationPoints = 30,
  evaluationPoints = 40,
  normalizationStrategy:
    | 'pipeline-default'
    | 'raw-calibration-std'
    | 'compensated-calibration-std' = 'pipeline-default',
  anomalySeverityMultiplier = 2.5,
  persistenceWindows = [1, 2, 3, 5]
): EnvironmentalCompensationExperiment {
  validatePersistenceWindows(persistenceWindows);

  if (
    !Number.isFinite(anomalySeverityMultiplier) ||
    anomalySeverityMultiplier < 0
  ) {
    throw new Error(
      'EXP-07 anomaly severity multiplier must be a finite number greater than or equal to zero.'
    );
  }

  if (
    !Number.isInteger(calibrationPoints) ||
    calibrationPoints < 2
  ) {
    throw new Error(
      'EXP-07 requires at least two calibration points.'
    );
  }

  if (
    !Number.isInteger(evaluationPoints) ||
    evaluationPoints < 1
  ) {
    throw new Error(
      'EXP-07 requires at least one evaluation point.'
    );
  }

  if (
    thresholds.length === 0 ||
    thresholds.some(
      (threshold) =>
        !Number.isFinite(threshold) || threshold <= 0
    )
  ) {
    throw new Error(
      'EXP-07 thresholds must be finite and greater than zero.'
    );
  }

  if (trueTemperatureCoefficients.length === 0) {
    throw new Error(
      'EXP-07 requires at least one true temperature coefficient.'
    );
  }

  if (assumedTemperatureCoefficients.length === 0) {
    throw new Error(
      'EXP-07 requires at least one assumed temperature coefficient.'
    );
  }

  if (seeds.length === 0) {
    throw new Error(
      'EXP-07 requires at least one random seed.'
    );
  }

  if (
    seeds.some(
      (seed) =>
        !Number.isInteger(seed) ||
        seed < 0 ||
        seed > 0xffff_ffff
    )
  ) {
    throw new Error(
      'EXP-07 random seeds must be unsigned 32-bit integers (0 through 4294967295).'
    );
  }

  if (
    trueTemperatureCoefficients.some(
      (coefficient) => !Number.isFinite(coefficient)
    ) ||
    assumedTemperatureCoefficients.some(
      (coefficient) => !Number.isFinite(coefficient)
    )
  ) {
    throw new Error(
      'EXP-07 temperature coefficients must be finite numbers.'
    );
  }

  const targetSensors = sensors.filter(
    (sensor) => sensor.type === 'strain'
  );

  if (targetSensors.length === 0) {
    throw new Error(
      'EXP-07 requires at least one configured strain sensor.'
    );
  }

  const results: EnvironmentalCompensationExperimentResult[] = [];

  const conditions: Array<
    'normal' | 'structural-anomaly'
  > = ['normal', 'structural-anomaly'];

  const modes: Array<
    'without-compensation' | 'with-compensation'
  > = ['without-compensation', 'with-compensation'];

  for (const sensor of targetSensors) {
    for (const seed of seeds) {
      for (
        const trueCoefficient of trueTemperatureCoefficients
      ) {
        for (
          const assumedCoefficient of assumedTemperatureCoefficients
        ) {
          const coefficientSeries =
            createEnvironmentalSyntheticSeries(
              sensor,
              seed,
              trueCoefficient,
              calibrationPoints,
              evaluationPoints,
              'normal',
              anomalySeverityMultiplier
            );

          for (const condition of conditions) {
            const series =
              condition === 'normal'
                ? coefficientSeries
                : createEnvironmentalSyntheticSeries(
                    sensor,
                    seed,
                    trueCoefficient,
                    calibrationPoints,
                    evaluationPoints,
                    condition,
                    anomalySeverityMultiplier
                  );

            for (const threshold of thresholds) {
              for (const compensationMode of modes) {
                results.push(
                  evaluateEnvironmentalSeries(
                    sensor,
                    series,
                    seed,
                    threshold,
                    trueCoefficient,
                    assumedCoefficient,
                    calibrationPoints,
                    evaluationPoints,
                    condition,
                    compensationMode,
                    normalizationStrategy,
                    anomalySeverityMultiplier,
                    persistenceWindows
                  )
                );
              }
            }
          }
        }
      }
    }
  }

  return {
    experimentId: 'EXP-07',
    thresholds,
    trueTemperatureCoefficients,
    assumedTemperatureCoefficients,
    seeds,
    calibrationPoints,
    evaluationPoints,
    normalizationStrategy,
    anomalySeverityMultiplier,
    persistenceWindows,
    results
  };
}

/**
 * Compare structural-anomaly detection across injected step magnitudes.
 * A multiplier of 0 is a negative-control case with no structural offset.
 */
export function runEnvironmentalAnomalySeveritySweep(
  thresholds = [1.5, 2, 3],
  trueTemperatureCoefficients = [4, 8, 12],
  assumedTemperatureCoefficients = [0, 4, 8, 12, 16],
  seeds = [7, 17, 27],
  calibrationPoints = 30,
  evaluationPoints = 40,
  severityMultipliers = [0, 0.5, 1, 1.5, 2.5],
  normalizationStrategy:
    | 'pipeline-default'
    | 'raw-calibration-std'
    | 'compensated-calibration-std' = 'pipeline-default',
  persistenceWindows = [1, 2, 3, 5]
): EnvironmentalAnomalySeveritySweep {
  validatePersistenceWindows(persistenceWindows);

  if (
    severityMultipliers.length === 0 ||
    severityMultipliers.some(
      (multiplier) =>
        !Number.isFinite(multiplier) || multiplier < 0
    )
  ) {
    throw new Error(
      'EXP-07 severity sweep requires finite severity multipliers greater than or equal to zero.'
    );
  }

  const results = severityMultipliers.map((anomalySeverityMultiplier) => {
    const experiment = runEnvironmentalCompensationExperiment(
      thresholds,
      trueTemperatureCoefficients,
      assumedTemperatureCoefficients,
      seeds,
      calibrationPoints,
      evaluationPoints,
      normalizationStrategy,
      anomalySeverityMultiplier,
      persistenceWindows
    );

    return {
      anomalySeverityMultiplier,
      results: experiment.results.filter(
        (result) => result.condition === 'structural-anomaly'
      )
    };
  });

  return {
    experimentId: 'EXP-07-SEVERITY-SWEEP',
    severityMultipliers,
    thresholds,
    trueTemperatureCoefficients,
    assumedTemperatureCoefficients,
    seeds,
    calibrationPoints,
    evaluationPoints,
    normalizationStrategy,
    persistenceWindows,
    results
  };
}