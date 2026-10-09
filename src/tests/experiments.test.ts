import { sensors } from '../engineering/sensorConfig';
import {
inspectSignalComponents,
runAnomalyRobustnessExperiment,
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
