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

## 10. Methodological audit and interpretation boundaries

This section records a source-level audit of the EXP-07 metric implementation and the limits of the resulting evidence. It does not change detector behavior or claim validation on operating bridges.

### 10.1 Metric and denominator audit

- **Normal-condition false alarms:** `falseAlarms` counts threshold exceedances over the full evaluation interval. The report denominator is the number of normal evaluation samples across the group.
- **Injected-step false alarms:** for non-zero severity, `falseAlarms` counts threshold exceedances strictly before the injected step begins. The denominator is the corresponding pre-onset sample count.
- **Zero-severity negative control:** no step is injected, so the entire evaluation interval is negative-control data. Threshold crossings across that full interval are false positives. The raw result's `anomalyDetected` field can still be true when a post-onset crossing occurs; that field means a crossing was observed, not that a real anomaly exists. The severity CSV therefore labels the zero-severity case as `negative-control` and reports its case-level crossing percentage as a false-positive rate.
- **Pointwise rate versus case-level rate:** `detectionRate` is the fraction of post-onset samples crossing the absolute z-score threshold. The case-level rate is the fraction of configurations with at least one post-onset crossing. These metrics answer different questions and should not be substituted for one another.
- **Detection delay:** delay is measured from the first post-onset sample, with index 0 representing the onset sample. Mean delay is calculated only among configurations with a crossing. At severity 0, it is the timing of a false alert, not a damage-detection delay.
- **Persistence metrics:** persistence alerts require the configured number of consecutive threshold-exceeding samples. The episode counter counts each contiguous qualifying run once, rather than treating every overlapping window inside that run as a separate episode. Normal cases and zero-severity controls count episodes across the full evaluation interval; non-zero injected-step cases count false-alarm episodes only before onset. The reported persistence detection aggregate uses non-zero severity cases, while its normal false-alarm episode mean is calculated separately from normal-condition baseline results.
- **Rounding and aggregation:** exported rates and means are displayed to two decimal places. Severity pointwise exceedance counts are reconstructed from each stored rate and the post-onset sample count before aggregation; the documented default uses 20 post-onset samples per configuration, so this recovers integer exceedance counts for the current grid. Aggregates weight each configuration equally; they are not estimates weighted by real-world operating frequency.

For the documented 40-sample evaluation period, the step begins after 20 evaluation samples. Thus normal and zero-severity false-alarm denominators use 40 samples per configuration, non-zero anomaly false-alarm denominators use 20 pre-onset samples, and pointwise anomaly rates use 20 post-onset samples. These statements are specific to this configuration; callers using other lengths should use the corresponding generated denominators rather than copying these numbers.

### 10.2 Design risks and evidence limits

1. **Dependence between cases:** threshold and coefficient combinations reuse deterministic scenarios. The same seed/configuration pattern is also reinitialized for each sensor, so sensor streams share the underlying random draws. The number of scored configurations must not be presented as the number of independent trials.
2. **Synthetic anomaly model:** the injected change is a constant additive step scaled by the configured sensor baseline standard deviation, applied to each strain-sensor series in the experiment. It is not a calibrated physical damage magnitude, localized bridge event, or evolving failure model.
3. **Limited seed coverage:** three seeds provide a reproducible diagnostic grid, but are insufficient to characterize broad uncertainty or rare false alarms. Deterministic repetition verifies reproducibility, not generalization.
4. **Parameter and threshold dependence:** results are conditional on the chosen threshold/coefficient grid and generator. These results do not show that thresholds are optimal, that the supplied compensation coefficient can be estimated accurately in operation, or that the method transfers to real bridges.
5. **Normalization confounding:** the default comparison changes both residual processing and normalization scale. The explicit shared-scale sensitivity runs help separate these effects in this synthetic setup, but do not determine a universally preferable normalization strategy.
6. **No external validation:** no real-bridge sensor dataset, independent test site, field ground truth, or external replication is evaluated here. No safety, maintenance, or operational-performance claim should be inferred from these results.

### 10.3 Audit conclusion and next evidence needed

The source-level review found the documented default denominators, case-level crossing definitions, detected-case delay averages, and persistence episode accounting consistent with the implementation for the documented fixed-length experiment. The zero-severity control is interpretable as a negative control only when every crossing is treated as a false positive; it must not be described as successful anomaly detection.

No detector behavior change is made as part of this audit. The next scientifically meaningful step is independent evaluation of the synthetic assumptions and then, if suitable data can be obtained, a separately specified test on real sensor data with documented train/calibration and evaluation separation, justified thresholds, ground truth where available, and uncertainty reporting. Until then, EXP-07 is a reproducible synthetic sensitivity study—not field validation.

## 11. Multi-seed robustness and descriptive variability

The supplementary robustness command repeats the full default coefficient/threshold grid with ten additional deterministic seeds (101 through 110) for both the default non-zero step severity (2.5) and a zero-severity negative control. The baseline configuration remains unchanged; this is an additional sensitivity run, not a replacement for the published/default three-seed aggregate tables.

Run from the repository root:

```powershell
npm ci
npm run robustness:exp07
```

The command writes `reports/exp07/seed-robustness.csv`. It includes per-seed rows for normal operation, the injected-step scenario, and the negative control, each separated by matched/mismatched coefficients and compensation mode. It then appends across-seed summary rows reporting the mean, sample standard deviation, minimum, and maximum of each available metric. False-alarm denominators are full evaluation samples for normal and negative-control scenarios and pre-onset samples for non-zero injected steps. Case crossing and pointwise post-onset rates remain distinct. The negative-control crossing metric is the rate of configurations with a threshold crossing after the nominal midpoint, despite no injected step.

The ten seed values are a prespecified deterministic extension for checking sensitivity to the random stream; they are not an independently sampled set of bridges. Summary statistics are descriptive across seed-level aggregates. **The sample standard deviation and range are not confidence intervals**, and the many coefficient/threshold/sensor configurations within a seed are not independent replicates. Results remain conditional on the synthetic generator and should be used to describe sensitivity, not field false-alarm probabilities or real-bridge detection performance.

### 11.1 Observed results across seeds 101–110

The explicit robustness run completed in CI. The following values are the actual across-seed means; sample standard deviations (SD) are in percentage points for rates. Each seed contributes one aggregate per scenario × coefficient-match group × compensation mode. The matched group contains 18 scored configurations per seed and the mismatched group contains 72; these remain correlated synthetic configurations.

| Scenario and metric | Coefficients | Compensation off: mean (SD) | Compensation on: mean (SD) | Paired seed direction |
|---|---|---:|---:|---|
| Normal false-alarm rate | Matched | 14.76% (2.97) | 3.46% (2.12) | Lower with compensation in 10/10 seeds |
| Normal false-alarm rate | Mismatched | 14.76% (2.97) | 12.09% (2.26) | Lower in 9/10; higher in 1/10 |
| Injected-step post-onset pointwise threshold-exceedance rate | Matched | 98.69% (1.06) | 91.83% (2.72) | Lower with compensation in 10/10 seeds |
| Injected-step post-onset pointwise threshold-exceedance rate | Mismatched | 98.69% (1.06) | 83.21% (2.78) | Lower with compensation in 10/10 seeds |
| Zero-severity negative-control case crossing rate | Matched | 67.22% (10.62) | 30.00% (13.15) | Lower with compensation in 10/10 seeds |
| Zero-severity negative-control case crossing rate | Mismatched | 67.22% (10.62) | 63.06% (7.12) | Lower in 7/10; unchanged in 1/10; higher in 2/10 |

For matched normal cases, the mean false-alarm rate falls by about 76.6% relative to the uncompensated rate. Under coefficient mismatch, the mean falls by about 18.1%, but the paired seed comparison is not universal: seed 103 has a higher normal false-alarm rate with compensation. Thus the false-alarm benefit is robust across these ten seeds for matched coefficients, while the mismatched-coefficient benefit is smaller and not consistent for every seed.

For injected steps, compensation lowers the post-onset pointwise threshold-exceedance rate in all ten seeds for both coefficient-match groups. This is a consistent sensitivity trade-off in the tested synthetic setup, not evidence that case-level detection always fails: all configurations in this particular severity-2.5 grid still have at least one post-onset crossing. Pointwise exceedance, case-level crossing, and detection delay must remain separate metrics.

The zero-severity negative control shows that a crossing can occur without any injected step. With matched coefficients, compensation reduces the negative-control case crossing rate in all ten seeds, but its mean remains 30.00%—too high to treat the present threshold rule as field-ready. Under mismatch, the average reduction is small and two seeds show an increase. The negative-control result is an important limit on any claim of reliable anomaly identification.

These findings support a qualified conclusion: **the observed matched-coefficient false-alarm reduction and the post-onset exceedance trade-off are stable across the ten tested seeds; performance under coefficient mismatch is less dependable, and the negative control still produces frequent false positives.** This is descriptive robustness to selected random seeds, not statistical confidence, independent replication, or real-bridge validation. The default detector behavior was not changed by this study.


## 12. Persistence-window trade-off across ten seeds

The persistence robustness runner evaluates windows 1, 2, 3, and 5 on the same ten additional seeds (101–110), default threshold/coefficient grid, severity-2.5 injected step, and zero-severity negative control. It writes `reports/exp07/persistence-robustness.csv`, including per-seed results and descriptive across-seed mean, sample SD, minimum, and maximum. Run it with:

```powershell
npm ci
npm run persistence:exp07
```

Each reported false-alarm-episode value is the mean number of qualifying episodes per scored configuration, not a field false-alarm probability. Injected-step false-alarm episodes are counted before onset; normal and negative-control episodes use the full evaluation segment. Detection rate is the percentage of configurations with a qualifying persistence detection. Negative-control detection is a false alert because severity is zero. Detection delay is measured when the final required consecutive sample arrives; mean delay is calculated only among detected configurations. Values below aggregate each seed's coefficient/threshold configurations, then average across the ten seeds.

### 12.1 Injected severity-2.5 step: false alarms versus detection

| Coefficient group | Persistence window | False episodes/config: off → on | Detected cases: off → on | Mean detection-rate change | Added misses per seed's group | Paired mean delay change |
|---|---:|---:|---:|---:|---:|---:|
| Matched | 1 | 0.994 → 0.483 | 100.00% → 100.00% | 0.00 pp | 0.0 | 0.00 samples |
| Matched | 2 | 0.589 → 0.150 | 100.00% → 100.00% | 0.00 pp | 0.0 | +0.33 samples |
| Matched | 3 | 0.317 → 0.033 | 100.00% → 100.00% | 0.00 pp | 0.0 | +0.75 samples |
| Matched | 5 | 0.222 → 0.000 | 100.00% → 100.00% | 0.00 pp | 0.0 | +0.99 samples |
| Mismatched | 1 | 0.994 → 0.897 | 100.00% → 100.00% | 0.00 pp | 0.0 | +1.06 samples |
| Mismatched | 2 | 0.589 → 0.472 | 100.00% → 99.17% | −0.83 pp | +0.6 | +1.58 samples |
| Mismatched | 3 | 0.317 → 0.254 | 100.00% → 98.61% | −1.39 pp | +1.0 | +1.91 samples |
| Mismatched | 5 | 0.222 → 0.136 | 100.00% → 96.94% | −3.06 pp | +2.2 | +2.22 samples |

Here “off → on” compares uncompensated and compensated processing with the same persistence window. “Added misses” is the across-seed mean increase in missed configurations per seed's coefficient-match group (18 matched or 72 mismatched configurations). Paired mean delay change averages seed-level delay differences where both modes detected at least one case; it is not calculated for a seed/mode with no detected cases.

For this severity-2.5 step, longer persistence windows reduced pre-onset false-alarm episodes in both processing modes. Compensation further reduced them in every seed for matched coefficients at all four windows. With mismatched coefficients, the reductions were smaller and one seed had more false episodes under compensation at window 3. The sensitivity cost grew with window length: matched cases retained 100% case-level detection in this experiment, but detection arrived later on average; mismatched cases began to incur misses at windows 2–5, with mean detection rate falling to 96.94% at window 5. These results apply to the tested, relatively strong synthetic step, not to all anomaly magnitudes.

### 12.2 Zero-severity negative control: false alerts

The next table reports the percentage of configurations with a qualifying persistence crossing even though **no step was injected**.

| Coefficient group | Window 1 off → on | Window 2 off → on | Window 3 off → on | Window 5 off → on |
|---|---:|---:|---:|---:|
| Matched | 67.22% → 30.00% | 53.89% → 15.00% | 41.11% → 1.67% | 26.11% → 0.00% |
| Mismatched | 67.22% → 63.06% | 53.89% → 47.22% | 41.11% → 33.89% | 26.11% → 19.72% |

In the matched group, compensation lowered negative-control false alerts at every window in all ten seeds. In the mismatched group, the reductions were weaker: at window 1, false-alert frequency fell in seven seeds, was unchanged in one, and increased in two. Window 5 had the lowest negative-control crossing rates, but it also had the largest detection delay and the most missed injected cases under mismatch. A low false-alert rate alone is therefore not enough to select a persistence window.

### 12.3 Interpretation

The evidence does not identify a universally best window. Window 1 is the most responsive but permits more false episodes; windows 3 and 5 suppress more episodes, at the cost of later alerts and, with coefficient mismatch, additional misses. The compensation benefit is clearest when coefficients match. The zero-severity negative control remains particularly problematic under mismatch even with persistence and compensation.

The test deliberately does not change default alert settings or detector behavior. Choosing a production window requires a pre-specified acceptable false-alert burden, tolerable delay, and acceptable missed-event rate, then evaluation on representative independent sensor data with appropriate ground truth. These synthetic results are a trade-off analysis, not evidence of operational safety or real-bridge performance.

## 13. Low-severity anomaly stress study

The supplementary low-severity study tests injected step multipliers of 0.25, 0.5, 0.75, and 1.0 across deterministic seeds 101–110. It reuses the documented threshold, coefficient, calibration/evaluation-length, and `pipeline-default` settings, comparing compensation off/on, matched/mismatched coefficients, and persistence windows 1, 2, 3, and 5. The original experiment and detector defaults are unchanged.

Run locally with:

```powershell
npm run low-severity:exp07
```

The command writes `reports/exp07/low-severity-stress.csv` and emits a machine-readable JSON summary between explicit markers in the test logs. Each seed-level row reports the number of scored synthetic configurations, mean pre-onset false-alarm episodes per configuration, case-level detection rate, detected-case-only mean delay, and missed cases. The CSV appends across-seed mean, sample standard deviation, minimum, and maximum summaries for each severity × coefficient-match group × compensation mode × persistence window.

The severity multiplier scales the synthetic additive step relative to the configured sensor baseline standard deviation; it is not a calibrated physical damage level. Cases share deterministic generator structure and should not be treated as independent bridge trials. The across-seed summaries are descriptive, not confidence intervals. The study is designed to expose where weak anomalies become difficult to detect and where persistence filtering trades false-alarm suppression for delay or misses. It does not select new defaults or validate performance on real bridges. Numerical findings will be recorded only after the corresponding CI run completes successfully.

### 13.1 Observed low-severity results across seeds 101–110

The low-severity study completed successfully in CI. Each percentage below is the mean of ten seed-level case-detection rates. Mean delay is averaged over detected cases only; misses are mean missed configurations per seed. False-alarm episodes are counted in the pre-onset interval and averaged per configuration.

| Severity | Coefficients | Compensation | Window | Case detection | Mean delay (samples) | Mean misses/seed | False episodes/config |
|---:|---|---|---:|---:|---:|---:|---:|
| 0.25 | Matched | Off | 1 | 79.44% | 2.44 | 3.7 | 0.994 |
| 0.25 | Matched | On | 1 | 40.00% | 6.05 | 10.8 | 0.483 |
| 0.25 | Matched | Off | 5 | 42.22% | 7.75 | 10.4 | 0.222 |
| 0.25 | Matched | On | 5 | 3.33% | 15.00 | 17.4 | 0.000 |
| 0.25 | Mismatched | Off | 1 | 79.44% | 2.44 | 14.8 | 0.994 |
| 0.25 | Mismatched | On | 1 | 62.08% | 3.71 | 27.3 | 0.897 |
| 0.25 | Mismatched | Off | 5 | 42.22% | 7.75 | 41.6 | 0.222 |
| 0.25 | Mismatched | On | 5 | 22.22% | 7.45 | 56.0 | 0.136 |
| 1.00 | Matched | Off | 1 | 99.44% | 0.94 | 0.1 | 0.994 |
| 1.00 | Matched | On | 1 | 83.33% | 4.11 | 3.0 | 0.483 |
| 1.00 | Matched | Off | 5 | 86.11% | 6.58 | 2.5 | 0.222 |
| 1.00 | Matched | On | 5 | 55.00% | 10.13 | 8.1 | 0.000 |
| 1.00 | Mismatched | Off | 1 | 99.44% | 0.94 | 0.4 | 0.994 |
| 1.00 | Mismatched | On | 1 | 77.78% | 3.76 | 16.0 | 0.897 |
| 1.00 | Mismatched | Off | 5 | 86.11% | 6.58 | 10.0 | 0.222 |
| 1.00 | Mismatched | On | 5 | 48.06% | 7.96 | 37.4 | 0.136 |

**Interpretation:** the weak 0.25 step is difficult even without compensation, and compensation plus longer persistence can nearly eliminate qualifying detections in matched cases while reducing pre-onset false-alarm episodes. At severity 1.0, the same trade-off remains substantial: with matched coefficients and a five-sample window, case detection averages 86.11% off versus 55.00% on. Under mismatch, compensation is less effective at suppressing pre-onset episodes and has more misses. A mean delay can look deceptively modest when many cases are missed, so detection rate and misses must be read alongside delay.

These outcomes support a sensitivity finding, not a universal recommendation against compensation or for a particular persistence window. No defaults were changed. The CSV and CI JSON contain all four tested severities (including 0.5 and 0.75), all windows, both coefficient-match groups, both modes, and descriptive across-seed variability. The study remains limited to correlated synthetic configurations; it does not establish real-bridge performance.

## 14. Temperature-coefficient calibration-error sensitivity

This study evaluates whether the direction and size of temperature-coefficient error affect anomaly detection. The signed error is assumed coefficient minus synthetic true coefficient. True coefficients are 4, 8, and 12; assumed coefficients are 0, 4, 8, 12, and 16. Compensation-on results are stratified by the true coefficient and signed error, so different true-coefficient settings are not pooled together. The uncompensated baseline is separately stratified by true coefficient and uses assumed coefficient 0 only, avoiding duplicate weighting because the assumed coefficient does not affect the uncompensated calculation.

The experiment uses seeds 101–110, thresholds 1.5/2/3, calibration length 30, evaluation length 40, `pipeline-default` normalization, severity multipliers 0, 0.5, and 1.0 (zero is the negative control), and persistence windows 1/2/3/5. Results include pre-onset false-alarm episodes per configuration, case-detection rate, missed cases, and mean delay among detected cases. At severity zero, the qualifying post-onset alert rate is a negative-control false-alert rate, not successful anomaly detection. Error groups have different numbers of available assumed-coefficient settings; interpret them within each true coefficient and alongside the recorded case counts.

Run locally:

```powershell
npm run coefficient-error:exp07
```

The command writes `reports/exp07/coefficient-error-sensitivity.csv` and emits seed-level and across-seed JSON summaries between explicit markers in CI logs. Across-seed standard deviations and ranges are descriptive, not confidence intervals. Coefficient values and severity multipliers are synthetic settings, not calibrated physical parameters. The experiment does not change detector defaults and does not establish real-bridge performance.

### 14.1 Observed results

The stratified experiment passed CI, including the automated test suite, coefficient-error study, and production build. The table below isolates true coefficient 8, so signed-error comparisons do not mix different true-coefficient settings. Each row summarizes the available threshold/sensor configurations over ten seeds; delay is conditional on detection.

| Severity | Signed error | Mode | Window | Detection / negative-control alert rate | False-alarm episodes/config | Mean delay (detected cases only) |
|---:|---:|---|---:|---:|---:|---:|
| 0 | Baseline | Off | 1 | 68.33% alert rate | 2.133 | 3.58 |
| 0 | -4 | On | 1 | 46.67% alert rate | 1.517 | 5.72 |
| 0 | 0 | On | 1 | 30.00% alert rate | 1.000 | 6.63 |
| 0 | +4 | On | 1 | 56.67% alert rate | 1.650 | 5.33 |
| 0.5 | Baseline | Off | 1 | 91.67% | 0.967 | 1.66 |
| 0.5 | -4 | On | 1 | 75.00% | 0.767 | 3.94 |
| 0.5 | 0 | On | 1 | 60.00% | 0.483 | 7.08 |
| 0.5 | +4 | On | 1 | 36.67% | 0.750 | 9.69 |
| 0.5 | Baseline | Off | 5 | 65.00% | 0.200 | 7.61 |
| 0.5 | -4 | On | 5 | 36.67% | 0.017 | 8.57 |
| 0.5 | 0 | On | 5 | 8.33% | 0.000 | 11.17 |
| 0.5 | +4 | On | 5 | 1.67% | 0.017 | 18.00 |
| 1.0 | Baseline | Off | 1 | 100.00% | 0.967 | 0.75 |
| 1.0 | -4 | On | 1 | 98.33% | 0.767 | 2.03 |
| 1.0 | 0 | On | 1 | 83.33% | 0.483 | 4.11 |
| 1.0 | +4 | On | 1 | 66.67% | 0.750 | 7.08 |
| 1.0 | Baseline | Off | 5 | 90.00% | 0.200 | 6.80 |
| 1.0 | -4 | On | 5 | 70.00% | 0.017 | 7.62 |
| 1.0 | 0 | On | 5 | 55.00% | 0.000 | 10.13 |
| 1.0 | +4 | On | 5 | 26.67% | 0.017 | 14.58 |

**Interpretation:** in this particular synthetic setting, the direction of coefficient error matters: at severity 1.0 and a one-sample window, the +4 group detected 66.67% of cases versus 98.33% for -4. With a five-sample window, detection fell further in all compared groups as pre-onset false-alarm episodes declined. For severity zero, the reported percentage is a false-alert rate, not anomaly detection. The baseline and compensation-on groups are stratified by true coefficient, but they are still synthetic configuration aggregates, not independent physical trials.

Do not conclude that underestimation is generally safer or choose defaults from this one slice. The result is sensitive to the synthetic generator, threshold/sensor mix, and persistence window. The full CSV includes all true coefficients, available signed errors, severities, windows, and descriptive across-seed variability.

### 14.2 Paired seed-direction check for signed coefficient error

To check whether the signed-error contrast in Section 14.1 is an artifact of the ten-seed average, the coefficient-error output was also inspected as paired seed-level comparisons. For each seed, severity, true-coefficient stratum, and persistence window, the detection rate for signed error −4 was compared with the corresponding +4 result. The table reports the mean case-detection rate for each direction and the number of seeds in which −4 was higher, tied, or lower. Only non-zero severities are interpreted as anomaly detection; severity zero remains a negative control.

| Severity | Window | Mean detection, error −4 | Mean detection, error +4 | Seeds −4 higher / tied / lower |
|---:|---:|---:|---:|---:|
| 0.5 | 1 | 75.00% | 36.67% | 10 / 0 / 0 |
| 0.5 | 3 | 60.00% | 3.33% | 10 / 0 / 0 |
| 0.5 | 5 | 36.67% | 1.67% | 10 / 0 / 0 |
| 1.0 | 1 | 98.33% | 66.67% | 10 / 0 / 0 |
| 1.0 | 3 | 78.33% | 41.67% | 10 / 0 / 0 |
| 1.0 | 5 | 70.00% | 26.67% | 10 / 0 / 0 |

The same direction was observed within each of the three configured true-coefficient strata in this deterministic grid. This consistency makes the signed-error contrast less likely to be caused by one unusual seed in these tested configurations. It does **not** show that underestimating the coefficient is generally safer: the result is conditional on the synthetic generator, normalization, thresholds, sensor/configuration mix, and selected error magnitudes. The seed runs are deterministic sensitivity checks, not independent bridges, and the table does not establish a general law or justify changing compensation defaults. A next validation step would require independently sourced sensor records, a pre-specified evaluation protocol, and ground-truth events.
