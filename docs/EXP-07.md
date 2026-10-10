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

### 3.1 Synthetic signal assumptions and pairing

The generator creates a smooth temperature profile from a linear trend, a sinusoidal term, and small bounded random jitter. Each strain reading combines its configured baseline, a periodic sensor-variation term, a temperature contribution using the configured true coefficient, and bounded symmetric noise formed from a sum of uniform random draws. This noise has the configured scale but is not Gaussian.

For each sensor, seed, and true coefficient, the normal and structural-anomaly cases use the same deterministic temperature and noise sequence. The anomaly case adds a constant step equal to `anomalySeverityMultiplier × sensor.baselineStd` beginning halfway through the evaluation period. This pairing helps isolate the step's effect within this generator; it does not make the generator physically realistic. The step is applied to each strain-sensor series evaluated by EXP-07, rather than being localized to a specific bridge component. **Cross-sensor limitation:** the generator is reinitialized with the same seed for each sensor, so the underlying temperature-jitter and noise draws are shared across sensors (although each sensor applies its own configured signal and noise scales). Sensor results must therefore not be interpreted as independent noise realizations or evidence of realistic cross-sensor dependence.

The compensation calculation uses the assumed coefficient and calibration-only baseline/reference-temperature estimates. It does not use evaluation values to estimate the normalization scale. Because the assumed coefficient is supplied by the experiment configuration, these results evaluate known-coefficient and mismatched-coefficient scenarios; they do not validate an online coefficient-estimation method.

## 4. Metrics

- **False alarms:** reported false-alarm count for a result in a normal or anomalous scenario, as implemented by the experiment.
- **Anomaly detected:** whether the experiment's detection logic marks the injected structural anomaly as detected.
- **Detection rate:** proportion of evaluated post-onset points that exceed the configured detection threshold, according to the experiment's implementation.

Detection rate and anomaly-detected status are different metrics. A run can be marked as detecting an anomaly even when not every post-onset point exceeds the threshold.

### 4.1 Normalization and sensitivity comparison

The default `pipeline-default` strategy preserves the original pipeline behavior: the uncompensated mode uses the standard deviation of raw calibration measurements (with a floor of 10% of the configured sensor baseline standard deviation), while the compensated mode uses the standard deviation of calibration residuals calculated with the assumed temperature coefficient (with a numerical floor of `1e-9`). Both scales are estimated from calibration data only. Because the default comparison changes both the residual calculation and the normalization scale, differences between its compensation modes cannot be attributed to the residual correction alone.

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

**Observed interpretation:** within these synthetic cases, both shared scales reduce normal-condition false alarms when the compensated residual is used in matched-coefficient cases; under mismatched coefficients, the reduction is smaller. Across both scale strategies, the compensated residual has lower pointwise post-onset threshold-exceedance rates in the reported comparisons. The shared-scale runs help separate the residual-processing change from the denominator choice, but they still reflect this generator and threshold rule. All tested anomaly cases contain at least one post-onset crossing, a coarse case-level result that does not imply reliable detection delay, robustness, or field performance.

These results are conditional on this synthetic generator, sensor configuration, thresholds, and seeds. The comparison isolates normalization scale within the implementation, but it does not establish which scale is preferable for real bridges.

For non-zero severity anomaly cases, false alarms are counted only before the injected step begins. In the zero-severity negative control, no step is injected, so the entire evaluation period is negative data: all threshold alerts across the full evaluation period are counted as false alarms, including persistence-based episodes. This makes the negative-control accounting consistent with the normal condition.


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
  [0, 0.5, 1, 1.5, 2.5],
  'pipeline-default',
  [1, 2, 3, 5]
);
```

Each sweep entry contains structural-anomaly results for one multiplier, using the same thresholds, coefficients, seeds, and calibration/evaluation lengths. `anomalyInjected` is true only when the multiplier is greater than zero. `detectionDelay` is the number of evaluation samples from the anomaly-onset sample to the first threshold exceedance; `0` means a crossing at the first post-onset sample, and `null` means no post-onset threshold crossing. `anomalyDetected` records threshold crossing, not proof of a true anomaly. For the zero-severity negative control, `zeroSeverityFalsePositive` is true when noise crosses the threshold despite no structural step being injected. False alarms in nonzero anomaly scenarios are counted only before onset.

#### 5.2.1 Default severity-sweep results

The following aggregates were calculated by executing the default sweep in CI and summarizing the emitted deterministic results. Each severity and processing mode contains **270 scored configurations** across thresholds `[1.5, 2, 3]`, true coefficients `[4, 8, 12]`, assumed coefficients `[0, 4, 8, 12, 16]`, seeds `[7, 17, 27]`, and the configured sensors. These are repeated threshold-specific scores on shared deterministic scenarios, **not 270 independent physical trials**. The pointwise rate is the fraction of post-onset evaluation samples crossing the threshold, averaged across configurations. The crossing percentage is the fraction of configurations with at least one post-onset crossing. Mean delay is averaged only among configurations with a crossing; **for severity 0, this is the timing of false-positive alerts in a negative control, not anomaly-detection delay**.

| Injected severity multiplier | Compensation | Post-onset point threshold-exceedance rate | Configurations with a post-onset crossing | Configurations without a crossing | Mean delay among configurations with a crossing (samples) |
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

At the default severity multiplier of 2.5, the mean number of pre-onset false alarms was 2.57 per configuration without compensation and 1.96 with compensation. These figures describe the pre-onset interval for scenarios with an injected step; they should not be conflated with the zero-severity control, where the entire evaluation period is negative data. The zero-severity control is especially important: it shows that the current threshold rule can raise an alert when no structural step was injected. Its 77.78% and 60.74% crossing rates are **negative-control false-positive rates**, not anomaly detection success.

**Interpretation:** under this generator, compensation lowers pre-onset false alarms but also reduces post-onset detection and increases average detection delay at each non-zero severity. The gap is most consequential for subtle injected steps. These are synthetic diagnostic results, not estimates of real-bridge sensitivity or field false-alarm rates; the zero-control result also shows that the present threshold-only rule needs further calibration before any safety-related interpretation.

The sweep tests whether detection behavior changes as the injected step becomes smaller. It does not by itself establish realistic damage severity, detection reliability on operating bridges, or field-calibrated alert thresholds. The severity sweep is deterministic for a fixed configuration and seed list.

### 5.3 Persistence-based alert sensitivity

The evaluator now also records a persistence-based alert metric for windows of **1, 2, 3, and 5 consecutive evaluation samples by default**. The existing single-sample metrics remain unchanged. Both `runEnvironmentalCompensationExperiment` and `runEnvironmentalAnomalySeveritySweep` accept an optional final `persistenceWindows` argument, so callers can evaluate a custom list without changing detector internals. The list must contain at least one unique positive integer; empty lists, zero/negative values, fractional values, and duplicates are rejected. A window longer than `evaluationPoints` is allowed but cannot trigger an alert because the evaluation series is too short; it therefore reports zero qualifying false-alarm episodes and no detection. For each feasible window, an alert is recorded only after the required consecutive samples meet or exceed the same absolute z-score threshold. Detection delay is measured at the sample where the persistence requirement is fulfilled. False-alarm episodes count contiguous qualifying runs in normal data (or only the pre-onset segment in anomaly scenarios), rather than counting every above-threshold sample as a separate event.

The following aggregate was executed in CI using the same default EXP-07 grid. Detection results pool the four non-zero severity settings (0.5, 1, 1.5, 2.5), giving **1,080 threshold-specific configurations per compensation mode and window**. These are correlated configurations sharing deterministic scenarios, not independent field trials. Mean delay is computed only for detected cases.

| Persistence window | Compensation | Detection rate across non-zero severities | Missed configurations | Mean detection delay (samples) | Mean normal false-alarm episodes |
|---:|---|---:|---:|---:|---:|
| 1 | Off | 99.07% | 10/1,080 | 0.70 | 2.28 |
| 2 | Off | 95.37% | 50/1,080 | 2.21 | 1.35 |
| 3 | Off | 93.06% | 75/1,080 | 3.21 | 0.80 |
| 5 | Off | 86.11% | 150/1,080 | 5.49 | 0.43 |
| 1 | On | 85.65% | 155/1,080 | 2.36 | 2.09 |
| 2 | On | 75.09% | 269/1,080 | 4.04 | 0.87 |
| 3 | On | 69.72% | 327/1,080 | 4.79 | 0.51 |
| 5 | On | 59.17% | 441/1,080 | 6.60 | 0.19 |

The zero-severity negative control confirms the same trade-off. Its fraction of configurations with at least one qualifying post-onset alert fell as persistence increased:

| Persistence window | Compensation off | Compensation on |
|---:|---:|---:|
| 1 | 77.78% | 60.74% |
| 2 | 51.85% | 32.59% |
| 3 | 44.44% | 25.19% |
| 5 | 24.07% | 11.48% |

**Interpretation:** persistence filters out short excursions, substantially reducing normal alert episodes and negative-control crossings. It also delays alerts and misses more injected anomalies, especially when compensation is enabled or the injected step is subtle. These results do not identify a universally best window. A window should be chosen only after the acceptable false-alarm/missed-detection trade-off is specified, and all settings remain synthetic pending external validation.

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
2. The temperature profile is a smooth trend plus sinusoid and bounded jitter; the noise is bounded and symmetric, not Gaussian.
3. The anomaly is an abrupt constant additive step applied to every strain-sensor series in the experiment, not a localized or evolving physical damage model.
4. The simulation omits effects such as sensor drift, outliers, changing noise variance, time-varying temperature coefficients, coupled structural dynamics, and multiple interacting environmental factors.
5. Results depend on the signal generator, anomaly model, noise assumptions, calibration window, thresholds, and coefficient values. The supplied assumed coefficient means the experiment does not validate coefficient estimation.
6. The simulation does not establish that temperature is the only environmental influence on a real bridge.
7. A reduction in false alarms does not, by itself, prove improved safety or maintenance decisions.
8. The documented severity-sweep and persistence aggregate tables are regression-checked against the current implementation by `src/tests/experiments.test.ts`. This guards against accidental drift, but independent reproduction and external review are still needed before publication.
9. Field validation would require suitable real sensor data, documented ground truth where available, and an appropriate evaluation protocol.

## 8. Reproducibility

The experiment is implemented in `src/engineering/experiments.ts`; the deterministic aggregate regression checks are in `src/tests/experiments.test.ts`. Run these commands from the repository root in PowerShell on a clean checkout:

```powershell
npm ci
npm test -- src/tests/experiments.test.ts
npm run build
```

The targeted experiment test command checks the documented severity-sweep, persistence, and zero-severity negative-control aggregates. The report-export test recomputes the default results and both documented normalization-sensitivity runs, checks deterministic CSV output and explicit denominators against documented aggregates, and writes five machine-readable CSV files. The build command checks TypeScript and creates the production build. Passing these checks confirms reproducibility against this repository version; it does not independently validate the synthetic model or field performance.

### 8.1 Configuration used for the documented aggregate tables

| Parameter | Value |
|---|---|
| Detection thresholds | `[1.5, 2, 3]` |
| True temperature coefficients | `[4, 8, 12]` |
| Assumed compensation coefficients | `[0, 4, 8, 12, 16]` |
| Seeds | `[7, 17, 27]` |
| Calibration samples | `30` |
| Evaluation samples | `40` |
| Default normalization strategy | `pipeline-default` |
| Default anomaly severity multiplier | `2.5` |
| Severity sweep | `[0, 0.5, 1, 1.5, 2.5]` |
| Persistence windows | `[1, 2, 3, 5]` |

The severity table contains 270 scored configurations per severity and compensation mode (2 strain sensors × 3 seeds × 3 true coefficients × 5 assumed coefficients × 3 thresholds). The non-zero-severity persistence table pools four severities, giving 1,080 configurations per compensation mode and persistence window. These configurations share deterministic inputs and are not independent physical trials.

### 8.2 Fields and aggregation rules

The raw experiment result includes the sensor/component identifiers, condition, compensation mode, seed, threshold, true and assumed temperature coefficients, calibration/evaluation lengths, normalization strategy, severity multiplier, and the following score fields:

- `falseAlarms`: count of threshold crossings in the full evaluation segment for normal and zero-severity negative-control cases; for non-zero injected anomalies, count crossings before onset only.
- `detectionRate`: fraction of post-onset samples crossing the absolute z-score threshold; zero for normal-condition results.
- `anomalyDetected` and `detectionDelay`: whether any post-onset crossing occurs and the first crossing's sample index relative to onset (`0` is the onset sample; `null` means no crossing).
- `anomalyInjected` and `zeroSeverityFalsePositive`: distinguish an actually injected step from a crossing in the zero-severity negative control.
- `persistenceMetrics`: one record per configured window, with qualifying false-alarm episode count, post-onset detection status, and delay measured when the final required consecutive sample arrives.
- `latestRawZScore`, `latestAdjustedZScore`, and `latestResidual`: final-sample diagnostics; `latestAdjustedZScore` uses the selected EXP-07 normalization scale, not the helper's `adjustedZScore` field.

For the documented severity table, group the structural-anomaly results by severity multiplier and compensation mode. Compute pointwise post-onset rate as the mean of `detectionRate`; case-level crossing rate as the number of non-null `detectionDelay` values divided by the number of results; misses as total results minus detected results; and mean delay over detected results only. For severity zero, call the case-level crossing rate a negative-control false-positive rate and the delay a false-alert delay.

For the persistence table, combine only the four non-zero severities, group by compensation mode and persistence window, and calculate detection rate, misses, and mean delay from `persistenceMetrics`. Mean normal false-alarm episodes are calculated separately from the normal-condition results in the baseline run, not from anomaly pre-onset segments. Round displayed percentages and means to two decimal places. The test assertions in `src/tests/experiments.test.ts` are the reference checks for the displayed aggregate values.

The seed list must contain at least one value. Each seed must be an unsigned 32-bit integer from `0` through `4294967295`, inclusive. Fractional, negative, out-of-range, and non-finite values such as `NaN` or `Infinity` are rejected. Reusing the same seed and configuration produces reproducible synthetic results.

### 8.3 Regenerating the machine-readable report

From the repository root, run:

```powershell
npm ci
npm run export:exp07
```

The command runs the deterministic exporter test and writes the following files under `reports/exp07/`:

- `main-summary.csv` — condition × coefficient-match status × compensation mode; includes case counts, false-alarm totals and denominators, false-alarm rates, and (for anomaly cases) case-level and post-onset pointwise detection metrics.
- `severity-summary.csv` — one row per severity multiplier and compensation mode; explicitly distinguishes the zero-severity negative control, includes the case-level crossing denominator, misses, post-onset sample denominator, and mean delay among crossing cases only.
- `persistence-summary.csv` — non-zero severity results grouped by persistence window and compensation mode; includes the detection denominator, missed configurations, detected-case delay, and a separate normal-case denominator for mean false-alarm episodes.
- `normalization-sensitivity.csv` — the two shared-scale normalization strategies, grouped by condition, coefficient match, and compensation mode, with false-alarm rates and detection metrics.
- `metadata.csv` — configuration arrays, sample lengths, normalization strategies, result-row counts, rounding rules, and a note that configurations are correlated synthetic cases rather than independent physical trials.

CSV headers and row ordering are fixed. Rates are exported as percentages with two decimal places; means and delays use two decimal places; unavailable metrics are blank. The exporter does not add a wall-clock timestamp, so identical result objects produce byte-for-byte identical files. The tables are derived from the returned EXP-07 result objects rather than copied from the Markdown tables. Re-running the command overwrites the four generated files. The CSVs remain synthetic-analysis artifacts and must not be described as field validation.


## 9. Conclusion

In this synthetic experiment, temperature compensation reduced false alarms, with a larger reduction when the assumed temperature coefficient matched the generating coefficient. The simulation also showed lower anomaly detection rates after compensation, particularly in mismatched cases.

The defensible conclusion is that compensation and coefficient calibration deserve further evaluation—not that the method is validated for real-world bridge monitoring.
