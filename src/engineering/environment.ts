
import type {
  Measurement,
  SensorConfig
} from './types';

export interface EnvironmentalCompensationResult {
  sensorId: string;
  temperatureSensorId: string;
  latestValue: number;
  latestTemperature: number;
  baselineTemperature: number;
  temperatureCoefficient: number;
  expectedValue: number;
  residual: number;
  rawZScore: number;
  adjustedZScore: number;
}

export interface EnvironmentalCompensationOptions {
  calibrationPoints?: number;
  assumedTemperatureCoefficient?: number;
}

interface TemperaturePair {
  value: number;
  temperature: number;
}

function calculateMean(values: number[]): number {
  if (values.length === 0) {
    throw new Error(
      'Cannot calculate a mean from empty data.'
    );
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function pairMeasurements(
  measurements: Measurement[],
  temperatures: Measurement[]
): TemperaturePair[] {
  const temperatureByTimestamp = new Map(
    temperatures.map((measurement) => [
      measurement.timestamp,
      measurement.value
    ])
  );

  return measurements
    .map((measurement) => {
      const temperature = temperatureByTimestamp.get(
        measurement.timestamp
      );

      if (temperature === undefined) {
        return null;
      }

      return {
        value: measurement.value,
        temperature
      };
    })
    .filter(
      (pair): pair is TemperaturePair => pair !== null
    );
}

function estimateTemperatureCoefficient(
  paired: TemperaturePair[]
): number {
  if (paired.length < 2) {
    throw new Error(
      'At least two synchronized measurements are required.'
    );
  }

  const meanTemperature = calculateMean(
    paired.map((pair) => pair.temperature)
  );

  const meanValue = calculateMean(
    paired.map((pair) => pair.value)
  );

  const covariance = paired.reduce(
    (sum, pair) =>
      sum +
      (pair.temperature - meanTemperature) *
        (pair.value - meanValue),
    0
  );

  const temperatureVariance = paired.reduce(
    (sum, pair) =>
      sum +
      (pair.temperature - meanTemperature) ** 2,
    0
  );

  if (temperatureVariance === 0) {
    return 0;
  }

  return covariance / temperatureVariance;
}

export function compensateForTemperature(
  sensor: SensorConfig,
  measurements: Measurement[],
  temperatureMeasurements: Measurement[],
  options: EnvironmentalCompensationOptions = {}
): EnvironmentalCompensationResult {
  if (measurements.length === 0) {
    throw new Error(
      `No measurements found for ${sensor.id}.`
    );
  }

  if (temperatureMeasurements.length === 0) {
    throw new Error(
      'No temperature measurements were provided.'
    );
  }

  // Validate the latest reading before calibration validation.
  const latestMeasurement =
    measurements[measurements.length - 1];

  const latestTemperatureMeasurement =
    temperatureMeasurements.find(
      (measurement) =>
        measurement.timestamp === latestMeasurement.timestamp
    );

  if (!latestTemperatureMeasurement) {
    throw new Error(
      `No synchronized temperature measurement found for timestamp ${latestMeasurement.timestamp}.`
    );
  }

  const calibrationPoints =
    options.calibrationPoints ??
    Math.min(
      50,
      measurements.length,
      temperatureMeasurements.length
    );

  if (
    !Number.isInteger(calibrationPoints) ||
    calibrationPoints < 2
  ) {
    throw new Error(
      'At least two calibration points are required.'
    );
  }

  const calibrationMeasurements =
    measurements.slice(0, calibrationPoints);

  const calibrationTimestamps = new Set(
    calibrationMeasurements.map(
      (measurement) => measurement.timestamp
    )
  );

  const calibrationTemperatures =
    temperatureMeasurements.filter(
      (measurement) =>
        calibrationTimestamps.has(measurement.timestamp)
    );

  const calibrationPairs = pairMeasurements(
    calibrationMeasurements,
    calibrationTemperatures
  );

  if (calibrationPairs.length < 2) {
    throw new Error(
      'At least two synchronized measurements are required.'
    );
  }

  const estimatedTemperatureCoefficient =
    estimateTemperatureCoefficient(calibrationPairs);

   if (
    options.assumedTemperatureCoefficient !== undefined &&
    !Number.isFinite(options.assumedTemperatureCoefficient)
  ) {
    throw new Error(
      'Assumed temperature coefficient must be a finite number.'
    );
  }

  const temperatureCoefficient =
    options.assumedTemperatureCoefficient ??
    estimatedTemperatureCoefficient;
  const baselineTemperature = calculateMean(
    calibrationPairs.map((pair) => pair.temperature)
  );

  const baselineValue = calculateMean(
    calibrationPairs.map((pair) => pair.value)
  );

  const expectedValue =
    baselineValue +
    temperatureCoefficient *
      (
        latestTemperatureMeasurement.value -
        baselineTemperature
      );

  const residual =
    latestMeasurement.value - expectedValue;

  const rawZScore =
    (
      latestMeasurement.value -
      sensor.baselineMean
    ) / sensor.baselineStd;

  const adjustedZScore =
    residual / sensor.baselineStd;

  return {
    sensorId: sensor.id,
    temperatureSensorId:
      latestTemperatureMeasurement.sensorId,
    latestValue: latestMeasurement.value,
    latestTemperature:
      latestTemperatureMeasurement.value,
    baselineTemperature,
    temperatureCoefficient,
    expectedValue,
    residual,
    rawZScore,
    adjustedZScore
  };
}