import type { Measurement, Scenario, SensorConfig } from './types';

export interface GeneratorOptions {
  points?: number;
  seed?: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function gaussian(random: () => number): number {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function scenarioShift(
  sensor: SensorConfig,
  scenario: Scenario,
  progress: number
): number {
  switch (scenario) {
    case 'heavy-traffic':
      return sensor.type === 'temperature' ? 0 : sensor.baselineStd * 0.8;
    case 'increased-vibration':
      return sensor.type === 'accelerometer' ? sensor.baselineStd * 2.8 : 0;
    case 'temperature-change':
      return sensor.type === 'temperature' ? progress * 6 : 0;
    case 'structural-anomaly':
      if (sensor.componentId === 'PIER-02') {
        if (sensor.type === 'accelerometer') return sensor.baselineStd * 3.8 * progress;
        if (sensor.type === 'tilt') return sensor.baselineStd * 3.4 * progress;
      }
      return 0;
    case 'sensor-failure':
      return 0;
    case 'normal':
    default:
      return 0;
  }
}

export function generateMeasurements(
  sensor: SensorConfig,
  scenario: Scenario,
  options: GeneratorOptions = {}
): Measurement[] {
  const points = options.points ?? 100;
  const random = seededRandom(options.seed ?? 42);
  const measurements: Measurement[] = [];

  for (let i = 0; i < points; i += 1) {
    const progress = points <= 1 ? 1 : i / (points - 1);
    const time = i / points;

    if (scenario === 'sensor-failure' && sensor.id === 'ACC-02') {
      measurements.push({ timestamp: i, sensorId: sensor.id, value: sensor.baselineMean });
      continue;
    }

    const seasonal = sensor.variationAmplitude * Math.sin(2 * Math.PI * sensor.frequency * i);
    const noise = sensor.noiseStd * gaussian(random);
    const shift = scenarioShift(sensor, scenario, progress);

    measurements.push({
      timestamp: i,
      sensorId: sensor.id,
      value: sensor.baselineMean + seasonal + noise + shift
    });
  }

  return measurements;
}
