import { describe, expect, it } from 'vitest';
import { analyzePersistence } from '../engineering/persistence';
import { sensors } from '../engineering/sensorConfig';
import type { Measurement } from '../engineering/types';

const sensor = sensors.find((item) => item.id === 'ACC-02')!;

function measurement(value: number, timestamp: number): Measurement {
  return {
    timestamp,
    sensorId: sensor.id,
    value
  };
}

describe('analyzePersistence', () => {
  it('does not classify isolated anomalies as persistent', () => {
    const measurements = [
      measurement(sensor.baselineMean, 0),
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.5,
        1
      ),
      measurement(sensor.baselineMean, 2)
    ];

    const result = analyzePersistence(measurements, sensor);

    expect(result.qualifyingMeasurements).toBe(1);
    expect(result.longestRun).toBe(1);
    expect(result.currentRun).toBe(0);
    expect(result.persistent).toBe(false);
    expect(result.severity).toBe('normal');
  });

  it('detects a sustained run of anomalous measurements', () => {
    const measurements = [
      measurement(sensor.baselineMean, 0),
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.5,
        1
      ),
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.8,
        2
      ),
      measurement(
        sensor.baselineMean + sensor.baselineStd * 3.2,
        3
      )
    ];

    const result = analyzePersistence(measurements, sensor);

    expect(result.qualifyingMeasurements).toBe(3);
    expect(result.longestRun).toBe(3);
    expect(result.currentRun).toBe(3);
    expect(result.persistent).toBe(true);
    expect(result.severity).toBe('high');
  });

  it('resets the current run after a normal measurement', () => {
    const measurements = [
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.5,
        0
      ),
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.5,
        1
      ),
      measurement(sensor.baselineMean, 2),
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.5,
        3
      )
    ];

    const result = analyzePersistence(measurements, sensor);

    expect(result.longestRun).toBe(2);
    expect(result.currentRun).toBe(1);
    expect(result.persistent).toBe(false);
  });

  it('allows the required persistence window to be changed', () => {
    const measurements = [
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.5,
        0
      ),
      measurement(
        sensor.baselineMean + sensor.baselineStd * 2.5,
        1
      )
    ];

    const result = analyzePersistence(measurements, sensor, {
      requiredConsecutivePoints: 2
    });

    expect(result.persistent).toBe(true);
    expect(result.longestRun).toBe(2);
  });
});