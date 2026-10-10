# EXP-07 — Environmental Compensation and Coefficient Mismatch

## 1. Objective

Evaluate how temperature compensation affects false alarms and structural-anomaly detection in a synthetic structural health monitoring (SHM) scenario. Also examine how performance changes when the temperature coefficient used for compensation differs from the coefficient used to generate the measurements.

## 2. Research questions

1. Does temperature compensation reduce false alarms in normal synthetic measurements?
2. Does coefficient mismatch weaken that reduction?
3. Does compensation affect the detection rate for an injected structural anomaly?

## 3. Experimental design

The experiment generates deterministic synthetic measurement series using multiple random seeds. Normal and structural-anomaly scenarios are evaluated under the configured thresholds, temperature coefficients, and compensation modes.

The broader evaluation used:

- Detection thresholds: 1.5, 2, and 3
- Synthetic true temperature coefficients: 4, 8, and 12
- Assumed compensation coefficients: 0, 4, 8, 12, and 16
- Random seeds: 7, 17, and 27
- Calibration period: 30 samples
- Evaluation period: 40 samples

The experiment compares measurements processed without compensation against measurements processed with temperature compensation. Matched cases use the same true and assumed temperature coefficients; mismatched cases use different coefficients.

These are software-generated scenarios, not measurements collected from an operating bridge.

## 4. Metrics

- **False alarms:** reported false-alarm count for a result in a normal or anomalous scenario, as implemented by the experiment.
- **Anomaly detected:** whether the experiment's detection logic marks the injected structural anomaly as detected.
- **Detection rate:** proportion of evaluated post-onset points that exceed the configured detection threshold, according to the experiment's implementation.

Detection rate and anomaly-detected status are different metrics. A run can be marked as detecting an anomaly even when not every post-onset point exceeds the threshold.

## 5. Results

The following are aggregate results from the synthetic diagnostic run.

| Scenario | Compensation | Average false alarms | Average detection rate |
|---|---|---:|---:|
| Normal, matched coefficients | Off | 6.24 | Not applicable |
| Normal, matched coefficients | On | 1.78 | Not applicable |
| Normal, mismatched coefficients | Off | 6.24 | Not applicable |
| Normal, mismatched coefficients | On | 4.90 | Not applicable |
| Structural anomaly, matched coefficients | Off | 2.57 | 98.89% |
| Structural anomaly, matched coefficients | On | 1.06 | 93.61% |
| Structural anomaly, mismatched coefficients | Off | 2.57 | 98.89% |
| Structural anomaly, mismatched coefficients | On | 2.19 | 84.12% |

The anomaly-scenario false-alarm counts are reported as produced by the experiment; they should not be interpreted as equivalent to the normal-scenario false-alarm rate.

## 6. Interpretation

### 6.1 Matched coefficients

In normal synthetic measurements, the average false-alarm count fell from approximately 6.24 to 1.78 with matched temperature compensation, a reduction of about 71.5%.

For the structural-anomaly scenarios, the average detection rate fell from approximately 98.89% without compensation to 93.61% with matched compensation.

This indicates a trade-off in this simulation: reducing environmentally associated variation can also reduce some threshold exceedances associated with the injected anomaly.

### 6.2 Mismatched coefficients

In normal synthetic measurements, compensation with mismatched coefficients reduced the average false-alarm count from approximately 6.24 to 4.90, a reduction of about 21.5%.

For structural-anomaly scenarios, the average detection rate with mismatched compensation was approximately 84.12%.

The results suggest that coefficient accuracy matters in this simulated setup. Compensation should not be assumed to improve detection equally under all calibration conditions.

## 7. Limitations

1. The measurements are synthetic and do not establish performance on real bridges.
2. Results depend on the signal generator, anomaly model, noise assumptions, calibration window, thresholds, and coefficient values.
3. The simulation does not establish that temperature is the only environmental influence on a real bridge.
4. A reduction in false alarms does not, by itself, prove improved safety or maintenance decisions.
5. The observed results should be independently reproduced and checked against the current implementation before publication.
6. Field validation would require suitable real sensor data, documented ground truth where available, and an appropriate evaluation protocol.

## 8. Reproducibility

The experiment is implemented in `src/engineering/experiments.ts` as EXP-07. Its tests are in `src/tests/experiments.test.ts`.

Run the test suite from the repository root:

```powershell
pnpm.cmd test
```

Run the TypeScript and production build checks:

```powershell
pnpm.cmd build
```

The broader diagnostic configuration used thresholds `[1.5, 2, 3]`, true coefficients `[4, 8, 12]`, assumed coefficients `[0, 4, 8, 12, 16]`, seeds `[7, 17, 27]`, calibration length `30`, and evaluation length `40`.

The seed list must contain at least one value, and each seed must be an integer. Non-integer values and non-finite values such as `NaN` or `Infinity` are rejected so that invalid seed inputs cannot be silently coerced by the seeded random generator. Reusing the same seed and configuration produces reproducible synthetic results.

## 9. Conclusion

In this synthetic experiment, temperature compensation reduced false alarms, with a larger reduction when the assumed temperature coefficient matched the generating coefficient. The simulation also showed lower anomaly detection rates after compensation, particularly in mismatched cases.

The defensible conclusion is that compensation and coefficient calibration deserve further evaluation—not that the method is validated for real-world bridge monitoring.
