
import { describe, expect, it } from 'vitest';
import { compensateForTemperature } from '../engineering/environment';
import type {
  Measurement,
  SensorConfig
} from '../engineering/types';

const sensor: SensorConfig = {
  id: 'STR-TEST',
  type: 'strain',
  componentId: 'BEAM-01',
  unit: 'test',
  baselineMean: 100,
  baselineStd: 2,
  variationAmplitude: 0,
  frequency: 0,
  noiseStd: 0
};

function measurement(
  timestamp: number,
  value: number,
  sensorId = 'STR-TEST'
): Measurement {
  return { timestamp, value, sensorId };
}

function temperature(
  timestamp: number,
  value: number
): Measurement {
  return {
    timestamp,
    value,
    sensorId: 'TMP-01'
  };
}

describe('compensateForTemperature', () => {
  it('removes a temperature-driven sensor response', () => {
    const measurements = [
      measurement(0, 100),
      measurement(1, 101),
      measurement(2, 102),
      measurement(3, 103),
      measurement(4, 104)
    ];

    const temperatures = [
      temperature(0, 20),
      temperature(1, 21),
      temperature(2, 22),
      temperature(3, 23),
      temperature(4, 24)
    ];

    const result = compensateForTemperature(
      sensor,
      measurements,
      temperatures
    );

    expect(result.temperatureCoefficient).toBeCloseTo(1);
    expect(result.expectedValue).toBeCloseTo(104);
    expect(result.residual).toBeCloseTo(0);
    expect(result.adjustedZScore).toBeCloseTo(0);
  });

  it('uses the assumed temperature coefficient when provided', () => {
    const measurements = [
      measurement(0, 100),
      measurement(1, 101),
      measurement(2, 102),
      measurement(3, 103),
      measurement(4, 104)
    ];

    const temperatures = [
      temperature(0, 20),
      temperature(1, 21),
      temperature(2, 22),
      temperature(3, 23),
      temperature(4, 24)
    ];

    const result = compensateForTemperature(
      sensor,
      measurements,
      temperatures,
      {
        calibrationPoints: 4,
        assumedTemperatureCoefficient: 2
      }
    );

    expect(result.temperatureCoefficient).toBe(2);
    expect(result.baselineTemperature).toBeCloseTo(21.5);
    expect(result.expectedValue).toBeCloseTo(106.5);
    expect(result.residual).toBeCloseTo(-2.5);
  });

  it('preserves a structural deviation after temperature compensation', () => {
    const measurements = [
      measurement(0, 100),
      measurement(1, 101),
      measurement(2, 102),
      measurement(3, 103),
      measurement(4, 107)
    ];

    const temperatures = [
      temperature(0, 20),
      temperature(1, 21),
      temperature(2, 22),
      temperature(3, 23),
      temperature(4, 24)
    ];

    const result = compensateForTemperature(
      sensor,
      measurements,
      temperatures,
      { calibrationPoints: 4 }
    );

    expect(result.temperatureCoefficient).toBeCloseTo(1);
    expect(result.expectedValue).toBeCloseTo(104);
    expect(result.residual).toBeCloseTo(3);
    expect(result.adjustedZScore).toBeCloseTo(1.5);
  });

  it('does not create a temperature effect when temperature is constant', () => {
    const measurements = [
      measurement(0, 100),
      measurement(1, 101),
      measurement(2, 99),
      measurement(3, 100)
    ];

    const temperatures = [
      temperature(0, 20),
      temperature(1, 20),
      temperature(2, 20),
      temperature(3, 20)
    ];

    const result = compensateForTemperature(
      sensor,
      measurements,
      temperatures
    );

    expect(result.temperatureCoefficient).toBe(0);
    expect(result.baselineTemperature).toBe(20);
  });

  it('rejects insufficient calibration data', () => {
    expect(() =>
      compensateForTemperature(
        sensor,
        [measurement(0, 100)],
        [temperature(0, 20)]
      )
    ).toThrow(
      'At least two calibration points are required.'
    );
  });

  it('matches the latest temperature by timestamp, not array position', () => {
    const measurements = [
      measurement(0, 100),
      measurement(1, 101)
    ];

    const temperatures = [
      temperature(0, 20),
      temperature(1, 21),
      temperature(2, 99)
    ];

    const result = compensateForTemperature(
      sensor,
      measurements,
      temperatures,
      {
        calibrationPoints: 2,
        assumedTemperatureCoefficient: 1
      }
    );

    expect(result.latestTemperature).toBe(21);
    expect(result.temperatureSensorId).toBe('TMP-01');
    expect(result.residual).toBeCloseTo(0);
  });

  it('rejects a latest sensor reading without a matching temperature', () => {
    const measurements = [
      measurement(0, 100),
      measurement(1, 101)
    ];

    const temperatures = [temperature(0, 20)];

    expect(() =>
      compensateForTemperature(
        sensor,
        measurements,
        temperatures,
        { calibrationPoints: 2 }
      )
    ).toThrow(
      'No synchronized temperature measurement found for timestamp 1.'
    );
  });  it('rejects non-finite assumed temperature coefficients', () => {
    const measurements = [
      measurement(0, 100),
      measurement(1, 101),
      measurement(2, 102)
    ];

    const temperatures = [
      temperature(0, 20),
      temperature(1, 21),
      temperature(2, 22)
    ];

    for (const coefficient of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ]) {
      expect(() =>
        compensateForTemperature(
          sensor,
          measurements,
          temperatures,
          {
            calibrationPoints: 2,
            assumedTemperatureCoefficient: coefficient
          }
        )
      ).toThrow(
        'Assumed temperature coefficient must be a finite number.'
      );
    }
  });
});