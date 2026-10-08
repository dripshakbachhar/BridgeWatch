import { describe, expect, it } from 'vitest';
import { generateMeasurements } from '../engineering/generator';
import { sensors } from '../engineering/sensorConfig';

describe('sensor generator', () => {
  it('generates the requested number of deterministic measurements', () => {
    const measurements = generateMeasurements(sensors[0], 'normal', { points: 25, seed: 11 });
    expect(measurements).toHaveLength(25);
    expect(measurements[0].sensorId).toBe(sensors[0].id);
  });

  it('makes the structural anomaly visible on Pier 02 accelerometer', () => {
    const sensor = sensors.find((item) => item.id === 'ACC-02')!;
    const measurements = generateMeasurements(sensor, 'structural-anomaly', { points: 100, seed: 7 });
    const threshold = sensor.baselineMean + sensor.baselineStd * 3;
    const strongestRecentMeasurement = Math.max(...measurements.slice(-20).map((item) => item.value));
    expect(strongestRecentMeasurement).toBeGreaterThan(threshold);
  });
});
