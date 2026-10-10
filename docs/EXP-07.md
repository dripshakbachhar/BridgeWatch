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

### 4.1 Normalization and sensitivity comparison

The default `pipeline-default` strategy preserves the original pipeline behavior: the uncompensated mode uses the standard deviation of raw calibration measurements (with a floor of 10% of the configured sensor baseline standard deviation), while the compensated mode uses the standard deviation of calibration residuals calculated with the assumed temperature coefficient (with a numerical floor of `1e-9`). Both scales are estimated from calibration data only.

EXP-07 now also accepts an optional final `normalizationStrategy` argument:

- `pipeline-default`: preserve the original mode-specific scales and existing report values.
- `raw-calibration-std`: apply the raw calibration standard deviation to both processing modes.
- `compensated-calibration-std`: apply the compensated calibration residual standard deviation to both processing modes.

For sensitivity comparisons, run the same configuration and seed list with each explicit scale strategy. The synthetic series are deterministic, so these runs use the same underlying cases while changing the normalization scale. This is a controlled sensitivity check, not proof that either scale is universally preferable. Evaluation samples and injected anomaly samples must not be used to estimate either calibration scale.

The calibration reference is centered consistently in both calculations: the baseline value is the mean of calibration measurements, and the reference temperature is the mean of calibration temperatures. The compensated calibration residual is each calibration reading minus the baseline mean adjusted by the assumed coefficient times the temperature difference from that reference. Evaluation uses the same baseline and reference-temperature convention. The synthetic series uses 20 as its generating reference temperature; using the calibration mean as the compensation reference recenters the intercept rather than changing the temperature slope. The assumed coefficient is supplied explicitly; the helper's optional coefficient-estimation path is not used for EXP-07 scoring.

**Score-field distinction:** EXP-07's `latestAdjustedZScore` is the final residual divided by the selected EXP-07 normalization scale. It is not the `adjustedZScore` field returned by `compensateForTemperature`, which divides by `sensor.baselineStd`. The helper's field is not used to calculate EXP-07's threshold decisions. This distinction matters when comparing normalization strategies.

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

### 5.1 Normalization sensitivity results

The following results were computed by the reproducible sensitivity test using the same deterministic synthetic cases for both explicit normalization strategies. Each group contains 54 matched-coefficient cases or 216 mismatched-coefficient cases.

For normal scenarios, the false-alarm rate is total threshold exceedances divided by all evaluation points (`cases × 40`). For structural-anomaly scenarios, the reported false alarms occur before anomaly onset, so the false-alarm rate is divided by pre-onset points (`cases × 20`). Pointwise post-onset detection rate is the mean fraction of post-onset points exceeding the threshold. Case-level detection rate is the fraction of anomaly cases with at least one post-onset threshold exceedance.

| Normalization scale | Condition | Coefficients | Compensation | Cases | Mean false alarms/case | False-alarm rate | Post-onset point detection | Case-level anomaly detection |
|---|---|---|---|---:|---:|---:|---:|---:|
| Raw calibration SD | Normal | Matched | Off | 54 | 6.24 | 15.60% | — | — |
| Raw calibration SD | Normal | Matched | On | 54 | 1.56 | 3.89% | — | — |
| Raw calibration SD | Normal | Mismatched | Off | 216 | 6.24 | 15.60% | — | — |
| Raw calibration SD | Normal | Mismatched | On | 216 | 5.38 | 13.45% | — | — |
| Raw calibration SD | Structural anomaly | Matched | Off | 54 | 2.57 | 12.87% | 98.89% | 100% |
| Raw calibration SD | Structural anomaly | Matched | On | 54 | 0.91 | 4.54% | 92.50% | 100% |
| Raw calibration SD | Structural anomaly | Mismatched | Off | 216 | 2.57 | 12.87% | 98.89% | 100% |
| Raw calibration SD | Structural anomaly | Mismatched | On | 216 | 2.42 | 12.11% | 85.95% | 100% |
| Compensated residual SD | Normal | Matched | Off | 54 | 6.43 | 16.06% | — | — |
| Compensated residual SD | Normal | Matched | On | 54 | 1.78 | 4.44% | — | — |
| Compensated residual SD | Normal | Mismatched | Off | 216 | 5.99 | 14.98% | — | — |
| Compensated residual SD | Normal | Mismatched | On | 216 | 4.90 | 12.25% | — | — |
| Compensated residual SD | Structural anomaly | Matched | Off | 54 | 2.69 | 13.43% | 99.07% | 100% |
| Compensated residual SD | Structural anomaly | Matched | On | 54 | 1.06 | 5.28% | 93.61% | 100% |
| Compensated residual SD | Structural anomaly | Mismatched | Off | 216 | 2.45 | 12.25% | 98.43% | 100% |
| Compensated residual SD | Structural anomaly | Mismatched | On | 216 | 2.19 | 10.95% | 84.12% | 100% |

**Observed interpretation:** both shared scales reduce normal-condition false alarms when compensation is enabled in matched cases. Under mismatched coefficients, the reduction is smaller. Across both scale strategies, compensation lowers pointwise post-onset detection rates, especially with mismatched coefficients; however, all tested anomaly cases still contain at least one detected post-onset point. This case-level metric is coarse and does not imply reliable detection delay, robustness, or field performance.

These results are conditional on this synthetic generator, sensor configuration, thresholds, and seeds. The comparison isolates normalization scale within the implementation, but it does not establish which scale is preferable for real bridges.

The anomaly-scenario false-alarm counts are reported as produced by the experiment; they should not be interpreted as equivalent to the normal-scenario false-alarm rate.


### 5.2 Anomaly-severity sensitivity sweep

EXP-07 supports a controlled sweep over injected structural-step magnitudes using `runEnvironmentalAnomalySeveritySweep`. Each multiplier scales the generator's anomaly offset relative to the configured sensor's `baselineStd`; it is a synthetic scenario parameter, not a calibrated measure of real damage.

The default sweep uses multipliers `[0, 0.5, 1, 1.5, 2.5]`. A multiplier of `0` is a negative control: the scenario is labelled as an anomaly case but has no injected structural offset. Because ordinary synthetic noise can still cross a threshold, any reported post-onset detection at zero severity must be interpreted as a false positive under the no-injected-anomaly control, not as evidence of damage detection. The original experiment behavior is preserved because the existing `runEnvironmentalCompensationExperiment` default remains `2.5`.

Example:

```ts
const sweep = runEnvironmentalAnomalySeveritySweep(
  [1.5, 2, 3],
  [4, 8, 12],
  [0, 4, 8, 12, 16],
  [7, 17, 27],
  30,
  40,
  [0, 0.5, 1, 1.5, 2.5]
);
```

Each sweep entry contains structural-anomaly results for one multiplier, using the same thresholds, coefficients, seeds, and calibration/evaluation lengths. `anomalyInjected` is true only when the multiplier is greater than zero. `detectionDelay` is the number of evaluation samples from the anomaly-onset sample to the first threshold exceedance; `0` means a crossing at the first post-onset sample, and `null` means no post-onset threshold crossing. `anomalyDetected` records threshold crossing, not proof of a true anomaly. For the zero-severity negative control, `zeroSeverityFalsePositive` is true when noise crosses the threshold despite no structural step being injected. False alarms in nonzero anomaly scenarios are counted only before onset.

#### 5.2.1 Default severity-sweep results

The following aggregates were calculated by executing the default sweep in CI and summarizing the emitted deterministic results. Each severity and processing mode contains **270 scored configurations** across thresholds `[1.5, 2, 3]`, true coefficients `[4, 8, 12]`, assumed coefficients `[0, 4, 8, 12, 16]`, seeds `[7, 17, 27]`, and the configured sensors. These are repeated threshold-specific scores on shared deterministic scenarios, **not 270 independent physical trials**. Detection delay is averaged only over configurations that crossed the threshold.

| Injected severity multiplier | Compensation | Post-onset point detection | Configurations with a post-onset crossing | Missed configurations | Mean delay among detected (samples) |
|---:|---|---:|---:|---:|---:|
| 0 (negative control) | Off | 18.33% | 77.78% false-positive rate | 60/270 | 3.10 |
| 0 (negative control) | On | 11.56% | 60.74% false-positive rate | 106/270 | 4.25 |
| 0.5 | Off | 37.31% | 96.30% | 10/270 | 1.88 |
| 0.5 | On | 17.31% | 66.30% | 91/270 | 3.62 |
| 1.0 | Off | 61.11% | 100.00% | 0/270 | 0.76 |
| 1.0 | On | 32.91% | 82.22% | 48/270 | 3.20 |
| 1.5 | Off | 81.20% | 100.00% | 0/270 | 0.19 |
| 1.5 | On | 52.17% | 94.07% | 16/270 | 2.44 |
| 2.5 | Off | 98.89% | 100.00% | 0/270 | 0.00 |
| 2.5 | On | 86.02% | 100.00% | 0/270 | 0.76 |

Across these same scored configurations, mean pre-onset false alarms in the structural-anomaly scenarios were 2.57 per configuration without compensation and 1.96 with compensation. The zero-severity control is especially important: it shows that the current threshold rule can raise an alert when no structural step was injected. Its 77.78% and 60.74% crossing rates are **negative-control false-positive rates**, not anomaly detection success.

**Interpretation:** under this generator, compensation lowers pre-onset false alarms but also reduces post-onset detection and increases average detection delay at each non-zero severity. The gap is most consequential for subtle injected steps. These are synthetic diagnostic results, not estimates of real-bridge sensitivity or field false-alarm rates; the zero-control result also shows that the present threshold-only rule needs further calibration before any safety-related interpretation.

The sweep tests whether detection behavior changes as the injected step becomes smaller. It does not by itself establish realistic damage severity, detection reliability on operating bridges, or field-calibrated alert thresholds. The severity sweep is deterministic for a fixed configuration and seed list.

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

The seed list must contain at least one value. Each seed must be an unsigned 32-bit integer from `0` through `4294967295`, inclusive. Fractional, negative, out-of-range, and non-finite values such as `NaN` or `Infinity` are rejected. This matches the generator's 32-bit seed handling. Reusing the same seed and configuration produces reproducible synthetic results.

## 9. Conclusion

In this synthetic experiment, temperature compensation reduced false alarms, with a larger reduction when the assumed temperature coefficient matched the generating coefficient. The simulation also showed lower anomaly detection rates after compensation, particularly in mismatched cases.

The defensible conclusion is that compensation and coefficient calibration deserve further evaluation—not that the method is validated for real-world bridge monitoring.
