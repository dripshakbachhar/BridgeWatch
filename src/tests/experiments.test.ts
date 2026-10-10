import { compensateForTemperature } from '../engineering/environment';
import { sensors } from '../engineering/sensorConfig';
import {
inspectSignalComponents,
runAnomalyRobustnessExperiment,
runEnvironmentalAnomalySeveritySweep,
runEnvironmentalCompensationExperiment,
runNormalOperationExperiment,
runPersistenceTradeoffExperiment,
runStructuralAnomalyExperiment,
runTemporalPatternExperiment,
runTemporalPersistenceExperiment
} from '../engineering/experiments';

describe('Experiment 01 — Normal Operation', () => {
  test('runs a reproducible calibration and evaluation experiment', () => {
    const result = runNormalOperationExperiment(
      sensors,
      7,
      50,
      50,
      1.5
    );

    expect(result.experimentId).toBe('EXP-01');
    expect(result.sensorResults).toHaveLength(8);
    expect(result.totalEvaluationMeasurements).toBe(400);
    expect(result.totalFalseAlarms).toBe(39);
    expect(result.overallFalseAlarmRate).toBe(0.0975);

    console.log(JSON.stringify(result, null, 2));
  });
});

describe('Experiment diagnostics', () => {
  test('inspects generated signal components', () => {
    const diagnostics = inspectSignalComponents(
      sensors,
      7,
      50
    );

    expect(diagnostics).toHaveLength(8);

    for (const diagnostic of diagnostics) {
      expect(diagnostic.observedStd).toBeGreaterThan(0);
      expect(diagnostic.observedMaximum).toBeGreaterThan(
        diagnostic.observedMinimum
      );

      console.log(diagnostic);
    }
  });

  test('compares calibration sizes', () => {
    const calibrationSizes = [50, 100, 500];

    for (const size of calibrationSizes) {
      const result = runNormalOperationExperiment(
        sensors,
        7,
        size,
        50,
        1.5
      );

      console.log(
        `Calibration ${size}:`,
        JSON.stringify(
          {
            falseAlarms: result.totalFalseAlarms,
            falseAlarmRate: result.overallFalseAlarmRate,
            sensors: result.sensorResults.map((sensor) => ({
              sensorId: sensor.sensorId,
              calibrationMean: sensor.calibrationMean,
              calibrationStd: sensor.calibrationStd,
              falseAlarmRate: sensor.falseAlarmRate
            }))
          },
          null,
          2
        )
      );
    }

    expect(
      runNormalOperationExperiment(
        sensors,
        7,
        50,
        50,
        1.5
      ).totalFalseAlarms
    ).toBe(39);

    expect(
      runNormalOperationExperiment(
        sensors,
        7,
        100,
        50,
        1.5
      ).totalFalseAlarms
    ).toBe(37);

    expect(
      runNormalOperationExperiment(
        sensors,
        7,
        500,
        50,
        1.5
      ).totalFalseAlarms
    ).toBe(43);
  });

  test('compares threshold sensitivity', () => {
    const expected = [
      { threshold: 1.5, falseAlarms: 39 },
      { threshold: 2, falseAlarms: 3 },
      { threshold: 3, falseAlarms: 0 }
    ];

    for (const item of expected) {
      const result = runNormalOperationExperiment(
        sensors,
        7,
        50,
        50,
        item.threshold
      );

      console.log(
        `Threshold ${item.threshold}σ:`,
        `${result.totalFalseAlarms}/400`,
        `(${(result.overallFalseAlarmRate * 100).toFixed(2)}%)`
      );

      expect(result.totalFalseAlarms).toBe(
        item.falseAlarms
      );
    }
  });

  test('compares structural anomaly detection across thresholds', () => {
    const thresholds = [1.5, 2, 3];

    for (const threshold of thresholds) {
      const result = runStructuralAnomalyExperiment(
        sensors,
        threshold,
        7,
        50,
        50,
        'medium'
      );

      console.log(
        `Structural anomaly threshold ${threshold}σ:`,
        JSON.stringify(result.results, null, 2)
      );

      expect(result.results).toHaveLength(2);
    }
  });

  test('tests structural anomaly robustness across strengths, thresholds, and seeds', () => {
    const result = runAnomalyRobustnessExperiment(sensors);

    expect(result.experimentId).toBe('EXP-03');
    expect(result.results).toHaveLength(90);

    for (const strength of [
      'small',
      'medium',
      'strong'
    ] as const) {
      for (const threshold of [1.5, 2, 3]) {
        const matching = result.results.filter(
          (item) =>
            item.strength === strength &&
            item.threshold === threshold
        );

        const average =
          matching.reduce(
            (sum, item) => sum + item.detectionRate,
            0
          ) / matching.length;

        console.log(
          `EXP-03 ${strength} anomaly @ ${threshold}σ:`,
          `${(average * 100).toFixed(2)}% average detection`
        );

        expect(matching).toHaveLength(10);
      }
    }
  });

  test('tests temporal persistence across thresholds and windows', () => {
    const result = runTemporalPersistenceExperiment(
      sensors
    );

    expect(result.experimentId).toBe('EXP-04');

    expect(result.normalResults.length).toBe(
      5 * 3 * 4 * 8
    );

    for (const threshold of [1.5, 2, 3]) {
      for (const persistenceWindow of [1, 2, 3, 5]) {
        const normalResults = result.normalResults.filter(
          (item) =>
            item.threshold === threshold &&
            item.persistenceWindow === persistenceWindow
        );

        const anomalyResults = result.anomalyResults.filter(
          (item) =>
            item.threshold === threshold &&
            item.persistenceWindow === persistenceWindow
        );

        const normalEvents = normalResults.reduce(
          (sum, item) => sum + item.qualifyingEvents,
          0
        );

        const anomalyDetections = anomalyResults.length;

        console.log(
          `EXP-04 ${threshold}σ / ${persistenceWindow} consecutive:`,
          `normal qualifying events = ${normalEvents}`,
          `anomaly detections = ${anomalyDetections}`
        );

        expect(normalResults).toHaveLength(40);
      }
    }
  });
});

describe('Experiment 05 — Persistence Trade-off', () => {
  test('measures false positives, detection rate, and detection delay', () => {
    const result = runPersistenceTradeoffExperiment(
      sensors
    );

    expect(result.experimentId).toBe('EXP-05');

    expect(result.results).toHaveLength(
      5 * 3 * 4 * 3 * 2
    );

    expect(result.summaries).toHaveLength(
      3 * 4 * 3
    );

    for (const item of result.results) {
      expect(item.detectionDelay).toBe(item.detectionIndex);

      if (item.detectionIndex !== null) {
        // A persistence alert is timestamped when the final required
        // consecutive sample arrives, not at the run's first sample.
        expect(item.detectionIndex).toBeGreaterThanOrEqual(
          item.persistenceWindow - 1
        );
        expect(item.detectionIndex).toBeLessThan(item.evaluationCount);
      }
    }

    for (const summary of result.summaries) {
      expect(
        summary.falsePositiveRate
      ).toBeGreaterThanOrEqual(0);

      expect(
        summary.falsePositiveRate
      ).toBeLessThanOrEqual(1);

      expect(
        summary.detectionRate
      ).toBeGreaterThanOrEqual(0);

      expect(
        summary.detectionRate
      ).toBeLessThanOrEqual(1);

      console.log(
        `EXP-05 ${summary.threshold}σ / ${summary.persistenceWindow} consecutive / ${summary.strength}:`,
        JSON.stringify({
          falsePositiveRate:
            summary.falsePositiveRate,
          detectionRate:
            summary.detectionRate,
          averageDetectionDelay:
            summary.averageDetectionDelay
        })
      );
    }
  });
});
describe(
  'Experiment 06 — Temporal Anomaly Patterns',
  () => {
    it(
      'compares progressive, sudden-persistent, intermittent, and transient anomalies',
      () => {
        const experiment =
          runTemporalPatternExperiment();

        expect(
          experiment.experiment,
        ).toBe('EXP-06');

        expect(
          experiment.results.length,
        ).toBe(1440);

        expect(
          experiment.summaries.length,
        ).toBe(144);

        const patterns = [
          'progressive',
          'sudden-persistent',
          'intermittent',
          'transient',
        ];

        for (const pattern of patterns) {
          const matching =
            experiment.results.filter(
              (result) =>
                result.pattern === pattern,
            );

          expect(
            matching.length,
          ).toBe(360);
        }

        console.log(
          'EXP-06 temporal anomaly patterns:',
        );

        for (const summary of experiment.summaries) {
          if (
            summary.threshold === 2 &&
            summary.persistence === 3 &&
            summary.anomalyStrength ===
              'medium'
          ) {
            console.log(
              `${summary.pattern}: ` +
                `detection=${summary.detectionRate}, ` +
                `delay=${summary.averageDetectionDelay}`,
            );
          }
        }
      },
    );
  },
);

describe('Experiment 07 — Environmental Compensation', () => {
test('rejects an empty true temperature coefficient list', () => {
  expect(() =>
    runEnvironmentalCompensationExperiment(
      [2],
      [],
      [0, 4],
      [7],
      10,
      12
    )
  ).toThrow(
    'EXP-07 requires at least one true temperature coefficient.'
  );
});

test('rejects an empty assumed temperature coefficient list', () => {
  expect(() =>
    runEnvironmentalCompensationExperiment(
      [2],
      [4],
      [],
      [7],
      10,
      12
    )
  ).toThrow(
    'EXP-07 requires at least one assumed temperature coefficient.'
  );
});

test('rejects an empty random seed list', () => {
  expect(() =>
    runEnvironmentalCompensationExperiment(
      [2],
      [4],
      [0, 4],
      [],
      10,
      12
    )
  ).toThrow(
    'EXP-07 requires at least one random seed.'
  );
});

test.each([
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  1.5,
  -1,
  4294967296,
  Number.MAX_SAFE_INTEGER
])('rejects invalid random seed %s', (seed) => {
  expect(() =>
    runEnvironmentalCompensationExperiment(
      [2],
      [4],
      [0, 4],
      [seed],
      10,
      12
    )
  ).toThrow(
    'EXP-07 random seeds must be unsigned 32-bit integers (0 through 4294967295).'
  );
});

test.each([0, 4294967295])(
  'accepts valid unsigned 32-bit seed boundary %s',
  (seed) => {
    expect(() =>
      runEnvironmentalCompensationExperiment(
        [2],
        [4],
        [0, 4],
        [seed],
        10,
        12
      )
    ).not.toThrow();
  }
);

test('produces reproducible results across conditions and modes', () => {
const run = () =>
runEnvironmentalCompensationExperiment(
[2],
[4],
[0, 4],
[7],
10,
12
);

const first = run();
const second = run();

expect(first.experimentId).toBe('EXP-07');
expect(first).toEqual(second);
expect(first.results.length).toBeGreaterThan(0);

expect(
  new Set(first.results.map((result) => result.condition))
).toEqual(new Set(['normal', 'structural-anomaly']));

expect(
  new Set(first.results.map((result) => result.compensationMode))
).toEqual(
  new Set(['without-compensation', 'with-compensation'])
);

for (const result of first.results) {
  expect(Number.isFinite(result.latestRawZScore)).toBe(true);
  expect(Number.isFinite(result.latestAdjustedZScore)).toBe(true);
  expect(Number.isFinite(result.latestResidual)).toBe(true);

  expect(result.detectionRate).toBeGreaterThanOrEqual(0);
  expect(result.detectionRate).toBeLessThanOrEqual(1);
}

});

test('reduces false alarms while retaining matched-condition anomaly detection', () => {
const experiment = runEnvironmentalCompensationExperiment(
[1.5, 2, 3],
[4, 8, 12],
[0, 4, 8, 12, 16],
[7, 17, 27],
30,
40
);

const isMatched = (
  result: (typeof experiment.results)[number]
) =>
  result.trueTemperatureCoefficient ===
  result.assumedTemperatureCoefficient;

const averageMetric = (
  results: typeof experiment.results,
  metric: 'falseAlarms' | 'detectionRate'
) => {
  expect(results.length).toBeGreaterThan(0);

  return (
    results.reduce((sum, result) => sum + result[metric], 0) /
    results.length
  );
};

const normalMatchedResults = experiment.results.filter(
  (result) =>
    result.condition === 'normal' && isMatched(result)
);

const normalWithoutCompensation = averageMetric(
  normalMatchedResults.filter(
    (result) =>
      result.compensationMode === 'without-compensation'
  ),
  'falseAlarms'
);

const normalWithCompensation = averageMetric(
  normalMatchedResults.filter(
    (result) =>
      result.compensationMode === 'with-compensation'
  ),
  'falseAlarms'
);

expect(normalWithCompensation).toBeLessThan(
  normalWithoutCompensation
);

const anomalyMatchedResults = experiment.results.filter(
  (result) =>
    result.condition === 'structural-anomaly' &&
    isMatched(result)
);

const anomalyWithoutCompensation = averageMetric(
  anomalyMatchedResults.filter(
    (result) =>
      result.compensationMode === 'without-compensation'
  ),
  'detectionRate'
);

const anomalyWithCompensation = averageMetric(
  anomalyMatchedResults.filter(
    (result) =>
      result.compensationMode === 'with-compensation'
  ),
  'detectionRate'
);

expect(anomalyWithCompensation).toBeGreaterThanOrEqual(0.9);

expect(anomalyWithCompensation).toBeGreaterThanOrEqual(
  anomalyWithoutCompensation - 0.1
);

});

test('compares normalization scales on identical EXP-07 synthetic cases', () => {
  const run = (
    normalizationStrategy:
      | 'raw-calibration-std'
      | 'compensated-calibration-std'
  ) =>
    runEnvironmentalCompensationExperiment(
      [2],
      [8],
      [8],
      [7],
      10,
      12,
      normalizationStrategy
    );

  const rawScale = run('raw-calibration-std');
  const residualScale = run('compensated-calibration-std');

  expect(rawScale.normalizationStrategy).toBe('raw-calibration-std');
  expect(residualScale.normalizationStrategy).toBe(
    'compensated-calibration-std'
  );
  expect(rawScale.results).toHaveLength(residualScale.results.length);

  const caseKey = (result: (typeof rawScale.results)[number]) =>
    [
      result.sensorId,
      result.condition,
      result.compensationMode,
      result.seed,
      result.threshold,
      result.trueTemperatureCoefficient,
      result.assumedTemperatureCoefficient,
      result.calibrationPoints,
      result.evaluationPoints
    ].join('|');

  expect(rawScale.results.map(caseKey)).toEqual(
    residualScale.results.map(caseKey)
  );

  expect(
    rawScale.results.some((result, index) =>
      Math.abs(
        result.latestAdjustedZScore -
        residualScale.results[index].latestAdjustedZScore
      ) > 1e-9
    )
  ).toBe(true);
});

test('reports reproducible EXP-07 normalization sensitivity aggregates', () => {
  const configuration = {
    thresholds: [1.5, 2, 3],
    trueCoefficients: [4, 8, 12],
    assumedCoefficients: [0, 4, 8, 12, 16],
    seeds: [7, 17, 27],
    calibrationPoints: 30,
    evaluationPoints: 40
  };

  const strategies = [
    'raw-calibration-std',
    'compensated-calibration-std'
  ] as const;

  for (const strategy of strategies) {
    const experiment = runEnvironmentalCompensationExperiment(
      configuration.thresholds,
      configuration.trueCoefficients,
      configuration.assumedCoefficients,
      configuration.seeds,
      configuration.calibrationPoints,
      configuration.evaluationPoints,
      strategy
    );

    const groups = [
      { condition: 'normal', matched: true, mode: 'without-compensation' },
      { condition: 'normal', matched: true, mode: 'with-compensation' },
      { condition: 'normal', matched: false, mode: 'without-compensation' },
      { condition: 'normal', matched: false, mode: 'with-compensation' },
      { condition: 'structural-anomaly', matched: true, mode: 'without-compensation' },
      { condition: 'structural-anomaly', matched: true, mode: 'with-compensation' },
      { condition: 'structural-anomaly', matched: false, mode: 'without-compensation' },
      { condition: 'structural-anomaly', matched: false, mode: 'with-compensation' }
    ] as const;

    const summary = groups.map((group) => {
      const selected = experiment.results.filter((result) =>
        result.condition === group.condition &&
        result.compensationMode === group.mode &&
        (result.trueTemperatureCoefficient === result.assumedTemperatureCoefficient) === group.matched
      );

      const totalFalseAlarms = selected.reduce(
        (sum, result) => sum + result.falseAlarms,
        0
      );
      const denominatorPerCase =
        group.condition === 'normal'
          ? configuration.evaluationPoints
          : configuration.evaluationPoints / 2;
      const detectedCases = selected.filter(
        (result) => result.anomalyDetected
      ).length;
      const pointwisePostOnsetDetections = selected.reduce(
        (sum, result) => sum + result.detectionRate,
        0
      );

      return {
        condition: group.condition,
        coefficientMatch: group.matched ? 'matched' : 'mismatched',
        compensation: group.mode,
        cases: selected.length,
        meanFalseAlarmsPerCase: totalFalseAlarms / selected.length,
        falseAlarmRate: totalFalseAlarms / (selected.length * denominatorPerCase),
        pointwisePostOnsetDetectionRate:
          group.condition === 'structural-anomaly'
            ? pointwisePostOnsetDetections / selected.length
            : null,
        caseLevelAnomalyDetectionRate:
          group.condition === 'structural-anomaly'
            ? detectedCases / selected.length
            : null
      };
    });

    const expected = strategy === 'raw-calibration-std'
      ? {
          falseAlarms: [6.2407407, 1.5555556, 6.2407407, 5.3796296, 2.5740741, 0.9074074, 2.5740741, 2.4212963],
          falseAlarmRates: [0.1560185, 0.0388889, 0.1560185, 0.1344907, 0.1287037, 0.0453704, 0.1287037, 0.1210648],
          detectionRates: [null, null, null, null, 0.9888889, 0.925, 0.9888889, 0.8594907]
        }
      : {
          falseAlarms: [6.4259259, 1.7777778, 5.9907407, 4.8981481, 2.6851852, 1.0555556, 2.4490741, 2.1898148],
          falseAlarmRates: [0.1606481, 0.0444444, 0.1497685, 0.1224537, 0.1342593, 0.0527778, 0.1224537, 0.1094907],
          detectionRates: [null, null, null, null, 0.9907407, 0.9361111, 0.9842593, 0.8412037]
        };

    expect(summary.map((row) => row.cases)).toEqual([
      54, 54, 216, 216, 54, 54, 216, 216
    ]);

    summary.forEach((row, index) => {
      expect(row.meanFalseAlarmsPerCase).toBeCloseTo(
        expected.falseAlarms[index],
        4
      );
      expect(row.falseAlarmRate).toBeCloseTo(
        expected.falseAlarmRates[index],
        4
      );

      const expectedDetectionRate = expected.detectionRates[index];
      if (expectedDetectionRate === null) {
        expect(row.pointwisePostOnsetDetectionRate).toBeNull();
        expect(row.caseLevelAnomalyDetectionRate).toBeNull();
      } else {
        expect(row.pointwisePostOnsetDetectionRate).toBeCloseTo(
          expectedDetectionRate,
          4
        );
        expect(row.caseLevelAnomalyDetectionRate).toBe(1);
      }
    });

    console.log(
      `EXP-07 normalization sensitivity: ${strategy}`,
      JSON.stringify(summary)
    );
  }

  expect(strategies).toHaveLength(2);
});

test('matches documented EXP-07 report aggregates', () => {
const experiment = runEnvironmentalCompensationExperiment(
[1.5, 2, 3],
[4, 8, 12],
[0, 4, 8, 12, 16],
[7, 17, 27],
30,
40
);

const expectedCases = [
  {
    condition: 'normal',
    matched: true,
    mode: 'without-compensation',
    count: 54,
    falseAlarms: 6.24,
    detectionRate: null
  },
  {
    condition: 'normal',
    matched: true,
    mode: 'with-compensation',
    count: 54,
    falseAlarms: 1.78,
    detectionRate: null
  },
  {
    condition: 'normal',
    matched: false,
    mode: 'without-compensation',
    count: 216,
    falseAlarms: 6.24,
    detectionRate: null
  },
  {
    condition: 'normal',
    matched: false,
    mode: 'with-compensation',
    count: 216,
    falseAlarms: 4.90,
    detectionRate: null
  },
  {
    condition: 'structural-anomaly',
    matched: true,
    mode: 'without-compensation',
    count: 54,
    falseAlarms: 2.57,
    detectionRate: 0.9889
  },
  {
    condition: 'structural-anomaly',
    matched: true,
    mode: 'with-compensation',
    count: 54,
    falseAlarms: 1.06,
    detectionRate: 0.9361
  },
  {
    condition: 'structural-anomaly',
    matched: false,
    mode: 'without-compensation',
    count: 216,
    falseAlarms: 2.57,
    detectionRate: 0.9889
  },
  {
    condition: 'structural-anomaly',
    matched: false,
    mode: 'with-compensation',
    count: 216,
    falseAlarms: 2.19,
    detectionRate: 0.8412
  }
] as const;

for (const expected of expectedCases) {
  const selected = experiment.results.filter(
    (result) =>
      result.condition === expected.condition &&
      result.compensationMode === expected.mode &&
      (
        result.trueTemperatureCoefficient ===
        result.assumedTemperatureCoefficient
      ) === expected.matched
  );

  expect(selected).toHaveLength(expected.count);

  const averageFalseAlarms =
    selected.reduce(
      (sum, result) => sum + result.falseAlarms,
      0
    ) / selected.length;

  expect(averageFalseAlarms).toBeCloseTo(
    expected.falseAlarms,
    2
  );

  if (expected.detectionRate !== null) {
    const averageDetectionRate =
      selected.reduce(
        (sum, result) => sum + result.detectionRate,
        0
      ) / selected.length;

    expect(averageDetectionRate).toBeCloseTo(
      expected.detectionRate,
      4
    );
  }
}

});
});


describe('Temperature compensation calibration isolation', () => {
  const makeMeasurements = (latestValue: number) => [
    { timestamp: 0, sensorId: sensors[0]!.id, value: 10 },
    { timestamp: 1, sensorId: sensors[0]!.id, value: 12 },
    { timestamp: 2, sensorId: sensors[0]!.id, value: latestValue }
  ];

  const temperatures = [
    { timestamp: 0, sensorId: 'TMP-TEST', value: 20 },
    { timestamp: 1, sensorId: 'TMP-TEST', value: 22 },
    { timestamp: 2, sensorId: 'TMP-TEST', value: 24 }
  ];

  test('uses the explicit assumed coefficient and calibration-only reference values', () => {
    const result = compensateForTemperature(
      sensors[0]!,
      makeMeasurements(20),
      temperatures,
      { calibrationPoints: 2, assumedTemperatureCoefficient: 3 }
    );

    // Calibration means are (10 + 12) / 2 = 11 and (20 + 22) / 2 = 21.
    expect(result.baselineTemperature).toBe(21);
    expect(result.temperatureCoefficient).toBe(3);
    expect(result.expectedValue).toBe(20);
    expect(result.residual).toBe(0);
  });

  test('changing an evaluation reading cannot change the calibration baseline or reference temperature', () => {
    const first = compensateForTemperature(
      sensors[0]!,
      makeMeasurements(20),
      temperatures,
      { calibrationPoints: 2, assumedTemperatureCoefficient: 3 }
    );
    const changedEvaluation = compensateForTemperature(
      sensors[0]!,
      makeMeasurements(100),
      temperatures,
      { calibrationPoints: 2, assumedTemperatureCoefficient: 3 }
    );

    expect(changedEvaluation.baselineTemperature).toBe(
      first.baselineTemperature
    );
    expect(changedEvaluation.expectedValue).toBe(first.expectedValue);
    expect(changedEvaluation.residual).toBe(80);
  });

  test('rejects a missing temperature reading for the latest measurement timestamp', () => {
    expect(() =>
      compensateForTemperature(
        sensors[0]!,
        makeMeasurements(20),
        temperatures.slice(0, 2),
        { calibrationPoints: 2, assumedTemperatureCoefficient: 3 }
      )
    ).toThrow('No synchronized temperature measurement found for timestamp 2.');
  });
});


describe('EXP-07 anomaly severity sensitivity', () => {
  test('preserves the original anomaly magnitude by default', () => {
    const defaults = runEnvironmentalCompensationExperiment(
      [2], [8], [8], [7], 10, 12
    );
    const explicitDefault = runEnvironmentalCompensationExperiment(
      [2], [8], [8], [7], 10, 12, 'pipeline-default', 2.5
    );

    expect(defaults.anomalySeverityMultiplier).toBe(2.5);
    expect(defaults.results).toEqual(explicitDefault.results);
  });

  test('runs a deterministic sweep and reports onset-relative detection delay', () => {
    const run = () => runEnvironmentalAnomalySeveritySweep(
      [2], [8], [8], [7, 17], 10, 12, [0, 0.5, 1, 2.5]
    );
    const first = run();
    const second = run();

    expect(first).toEqual(second);
    expect(first.experimentId).toBe('EXP-07-SEVERITY-SWEEP');
    expect(first.results.map((entry) => entry.anomalySeverityMultiplier)).toEqual(
      [0, 0.5, 1, 2.5]
    );

    for (const entry of first.results) {
      expect(entry.results.length).toBeGreaterThan(0);
      for (const result of entry.results) {
        expect(result.condition).toBe('structural-anomaly');
        expect(result.anomalySeverityMultiplier).toBe(
          entry.anomalySeverityMultiplier
        );
        expect(result.anomalyDetected).toBe(result.detectionDelay !== null);
        expect(result.anomalyInjected).toBe(
          entry.anomalySeverityMultiplier > 0
        );
        expect(result.zeroSeverityFalsePositive).toBe(
          entry.anomalySeverityMultiplier === 0 && result.anomalyDetected
        );
        expect(result.persistenceMetrics.map((metric) => metric.persistenceWindow))
          .toEqual([1, 2, 3, 5]);
        expect(result.persistenceMetrics[0]!.detectionDelay)
          .toBe(result.detectionDelay);
        for (const metric of result.persistenceMetrics) {
          expect(metric.falseAlarmEpisodes).toBeGreaterThanOrEqual(0);
          expect(metric.anomalyDetected).toBe(
            metric.detectionDelay !== null
          );
          if (metric.detectionDelay !== null) {
            expect(metric.detectionDelay).toBeGreaterThanOrEqual(
              metric.persistenceWindow - 1
            );
          }
        }
        if (result.detectionDelay !== null) {
          expect(result.detectionDelay).toBeGreaterThanOrEqual(0);
          expect(result.detectionDelay).toBeLessThan(6);
        }
      }
    }
  });

  test('counts the full evaluation period as false alarms in the zero-severity control', () => {
    const experiment = runEnvironmentalCompensationExperiment(
      [2], [8], [8], [7], 10, 12,
      'pipeline-default', 0, [1, 2, 3, 5]
    );
    const normalResults = experiment.results.filter(
      (result) => result.condition === 'normal'
    );
    const zeroSeverityResults = experiment.results.filter(
      (result) =>
        result.condition === 'structural-anomaly' &&
        result.anomalySeverityMultiplier === 0
    );

    expect(zeroSeverityResults).toHaveLength(normalResults.length);
    for (const zeroResult of zeroSeverityResults) {
      const normalResult = normalResults.find(
        (result) =>
          result.sensorId === zeroResult.sensorId &&
          result.seed === zeroResult.seed &&
          result.threshold === zeroResult.threshold &&
          result.trueTemperatureCoefficient ===
            zeroResult.trueTemperatureCoefficient &&
          result.assumedTemperatureCoefficient ===
            zeroResult.assumedTemperatureCoefficient &&
          result.compensationMode === zeroResult.compensationMode
      );

      expect(normalResult).toBeDefined();
      expect(zeroResult.falseAlarms).toBe(normalResult!.falseAlarms);
      expect(zeroResult.persistenceMetrics).toEqual(
        normalResult!.persistenceMetrics
      );
    }
  });

  test('reproduces the documented severity and persistence aggregates', () => {
    const configuration = {
      thresholds: [1.5, 2, 3],
      trueCoefficients: [4, 8, 12],
      assumedCoefficients: [0, 4, 8, 12, 16],
      seeds: [7, 17, 27],
      calibrationPoints: 30,
      evaluationPoints: 40
    };
    const severityMultipliers = [0, 0.5, 1, 1.5, 2.5];
    const windows = [1, 2, 3, 5];
    const sweep = runEnvironmentalAnomalySeveritySweep(
      configuration.thresholds,
      configuration.trueCoefficients,
      configuration.assumedCoefficients,
      configuration.seeds,
      configuration.calibrationPoints,
      configuration.evaluationPoints,
      severityMultipliers,
      'pipeline-default',
      windows
    );
    const baseline = runEnvironmentalCompensationExperiment(
      configuration.thresholds,
      configuration.trueCoefficients,
      configuration.assumedCoefficients,
      configuration.seeds,
      configuration.calibrationPoints,
      configuration.evaluationPoints,
      'pipeline-default',
      2.5,
      windows
    );

    const round2 = (value: number) => Math.round(value * 100) / 100;
    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    const modeName = (mode: string) =>
      mode === 'without-compensation' ? 'off' : 'on';

    const expectedSeverity = [
      { severity: 0, mode: 'off', pointRate: 18.33, caseRate: 77.78, misses: 60, delay: 3.10 },
      { severity: 0, mode: 'on', pointRate: 11.56, caseRate: 60.74, misses: 106, delay: 4.25 },
      { severity: 0.5, mode: 'off', pointRate: 37.31, caseRate: 96.30, misses: 10, delay: 1.88 },
      { severity: 0.5, mode: 'on', pointRate: 17.31, caseRate: 66.30, misses: 91, delay: 3.62 },
      { severity: 1, mode: 'off', pointRate: 61.11, caseRate: 100, misses: 0, delay: 0.76 },
      { severity: 1, mode: 'on', pointRate: 32.91, caseRate: 82.22, misses: 48, delay: 3.20 },
      { severity: 1.5, mode: 'off', pointRate: 81.20, caseRate: 100, misses: 0, delay: 0.19 },
      { severity: 1.5, mode: 'on', pointRate: 52.17, caseRate: 94.07, misses: 16, delay: 2.44 },
      { severity: 2.5, mode: 'off', pointRate: 98.89, caseRate: 100, misses: 0, delay: 0 },
      { severity: 2.5, mode: 'on', pointRate: 86.02, caseRate: 100, misses: 0, delay: 0.76 }
    ];

    for (const expected of expectedSeverity) {
      const entry = sweep.results.find(
        (item) => item.anomalySeverityMultiplier === expected.severity
      )!;
      const selected = entry.results.filter(
        (result) => modeName(result.compensationMode) === expected.mode
      );
      const detected = selected.filter((result) => result.detectionDelay !== null);
      expect(selected).toHaveLength(270);
      expect(round2(average(selected.map((result) => result.detectionRate)) * 100))
        .toBe(expected.pointRate);
      expect(round2(detected.length / selected.length * 100))
        .toBe(expected.caseRate);
      expect(selected.length - detected.length).toBe(expected.misses);
      expect(round2(average(detected.map((result) => result.detectionDelay!))))
        .toBe(expected.delay);
    }

    const expectedPersistence = [
      { window: 1, mode: 'off', rate: 99.07, misses: 10, delay: 0.70, falseEpisodes: 2.28 },
      { window: 2, mode: 'off', rate: 95.37, misses: 50, delay: 2.21, falseEpisodes: 1.35 },
      { window: 3, mode: 'off', rate: 93.06, misses: 75, delay: 3.21, falseEpisodes: 0.80 },
      { window: 5, mode: 'off', rate: 86.11, misses: 150, delay: 5.49, falseEpisodes: 0.43 },
      { window: 1, mode: 'on', rate: 85.65, misses: 155, delay: 2.36, falseEpisodes: 2.09 },
      { window: 2, mode: 'on', rate: 75.09, misses: 269, delay: 4.04, falseEpisodes: 0.87 },
      { window: 3, mode: 'on', rate: 69.72, misses: 327, delay: 4.79, falseEpisodes: 0.51 },
      { window: 5, mode: 'on', rate: 59.17, misses: 441, delay: 6.60, falseEpisodes: 0.19 }
    ];

    for (const expected of expectedPersistence) {
      const allNonzero = sweep.results
        .filter((entry) => entry.anomalySeverityMultiplier > 0)
        .flatMap((entry) => entry.results)
        .filter((result) => modeName(result.compensationMode) === expected.mode);
      const selected = allNonzero.map((result) => ({
        result,
        metric: result.persistenceMetrics.find(
          (item) => item.persistenceWindow === expected.window
        )!
      }));
      const detected = selected.filter(({ metric }) => metric.anomalyDetected);
      const normalResults = baseline.results.filter(
        (result) =>
          result.condition === 'normal' &&
          modeName(result.compensationMode) === expected.mode
      );
      expect(selected).toHaveLength(1080);
      expect(round2(detected.length / selected.length * 100)).toBe(expected.rate);
      expect(selected.length - detected.length).toBe(expected.misses);
      expect(round2(average(detected.map(({ metric }) => metric.detectionDelay!))))
        .toBe(expected.delay);
      expect(round2(average(normalResults.map((result) =>
        result.persistenceMetrics.find(
          (metric) => metric.persistenceWindow === expected.window
        )!.falseAlarmEpisodes
      )))).toBe(expected.falseEpisodes);
    }

    const expectedZeroSeverityFalsePositiveRates = [
      { window: 1, off: 77.78, on: 60.74 },
      { window: 2, off: 51.85, on: 32.59 },
      { window: 3, off: 44.44, on: 25.19 },
      { window: 5, off: 24.07, on: 11.48 }
    ];
    const zeroControl = sweep.results.find(
      (entry) => entry.anomalySeverityMultiplier === 0
    )!;
    for (const expected of expectedZeroSeverityFalsePositiveRates) {
      for (const mode of ['off', 'on'] as const) {
        const selected = zeroControl.results.filter(
          (result) => modeName(result.compensationMode) === mode
        );
        const detections = selected.filter((result) =>
          result.persistenceMetrics.find(
            (metric) => metric.persistenceWindow === expected.window
          )!.anomalyDetected
        ).length;
        expect(round2(detections / selected.length * 100)).toBe(expected[mode]);
      }
    }
  });

  test('persistence windows reduce alerts from short threshold excursions', () => {
    const experiment = runEnvironmentalCompensationExperiment(
      [1.5], [8], [8], [7], 10, 12, 'pipeline-default', 1
    );
    const normalResults = experiment.results.filter(
      (result) => result.condition === 'normal'
    );

    expect(normalResults.length).toBeGreaterThan(0);
    for (const result of normalResults) {
      const metrics = result.persistenceMetrics;
      expect(metrics.map((metric) => metric.persistenceWindow)).toEqual([
        1, 2, 3, 5
      ]);
      expect(metrics[0]!.falseAlarmEpisodes).toBeGreaterThanOrEqual(
        metrics[1]!.falseAlarmEpisodes
      );
      expect(metrics[1]!.falseAlarmEpisodes).toBeGreaterThanOrEqual(
        metrics[2]!.falseAlarmEpisodes
      );
      expect(metrics[2]!.falseAlarmEpisodes).toBeGreaterThanOrEqual(
        metrics[3]!.falseAlarmEpisodes
      );
    }
  });

  test('windows longer than evaluation data cannot trigger persistence alerts', () => {
    const experiment = runEnvironmentalCompensationExperiment(
      [1.5], [8], [8], [7], 10, 3,
      'pipeline-default', 1, [3, 4]
    );

    expect(experiment.persistenceWindows).toEqual([3, 4]);

    for (const result of experiment.results) {
      for (const metric of result.persistenceMetrics) {
        expect(metric.falseAlarmEpisodes).toBeLessThanOrEqual(1);
        if (metric.persistenceWindow > result.evaluationPoints) {
          expect(metric.falseAlarmEpisodes).toBe(0);
          expect(metric.anomalyDetected).toBe(false);
          expect(metric.detectionDelay).toBeNull();
        }
      }
    }
  });

  test('accepts validated custom persistence windows', () => {
    const experiment = runEnvironmentalCompensationExperiment(
      [1.5], [8], [8], [7], 10, 12,
      'pipeline-default', 1, [2, 4]
    );

    expect(experiment.persistenceWindows).toEqual([2, 4]);
    for (const result of experiment.results) {
      expect(
        result.persistenceMetrics.map((metric) => metric.persistenceWindow)
      ).toEqual([2, 4]);
    }

    const sweep = runEnvironmentalAnomalySeveritySweep(
      [1.5], [8], [8], [7], 10, 12, [0, 1],
      'pipeline-default', [2, 4]
    );
    expect(sweep.persistenceWindows).toEqual([2, 4]);
    for (const entry of sweep.results) {
      for (const result of entry.results) {
        expect(
          result.persistenceMetrics.map((metric) => metric.persistenceWindow)
        ).toEqual([2, 4]);
      }
    }
  });

  test.each([
    { windows: [] },
    { windows: [0] },
    { windows: [-1] },
    { windows: [1.5] },
    { windows: [2, 2] }
  ])('rejects invalid persistence windows: $windows', ({ windows }) => {
    expect(() => runEnvironmentalCompensationExperiment(
      [2], [8], [8], [7], 10, 12,
      'pipeline-default', 1, windows
    )).toThrow(
      'EXP-07 persistence windows must be a non-empty list of unique positive integers.'
    );
  });

  test('rejects empty, negative, and non-finite severity sweeps', () => {
    expect(() => runEnvironmentalAnomalySeveritySweep(
      [2], [8], [8], [7], 10, 12, []
    )).toThrow('EXP-07 severity sweep requires finite severity multipliers');
    expect(() => runEnvironmentalAnomalySeveritySweep(
      [2], [8], [8], [7], 10, 12, [-0.5]
    )).toThrow('EXP-07 severity sweep requires finite severity multipliers');
    expect(() => runEnvironmentalAnomalySeveritySweep(
      [2], [8], [8], [7], 10, 12, [Number.NaN]
    )).toThrow('EXP-07 severity sweep requires finite severity multipliers');
  });
});
