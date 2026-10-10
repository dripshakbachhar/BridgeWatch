import type {
  EnvironmentalAnomalySeveritySweep,
  EnvironmentalCompensationExperiment,
  EnvironmentalCompensationExperimentResult
} from './experiments';

export interface Exp07CsvReport {
  'main-summary.csv': string;
  'severity-summary.csv': string;
  'persistence-summary.csv': string;
  'normalization-sensitivity.csv': string;
  'metadata.csv': string;
}

type CsvCell = string | number | boolean | null;

function csvCell(value: CsvCell): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n') + '\r\n';
}

function fixed(value: number | null, digits = 2): string | null {
  return value === null ? null : value.toFixed(digits);
}

function mean(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pct(value: number | null): string | null {
  return value === null ? null : (value * 100).toFixed(2);
}

function modeLabel(mode: EnvironmentalCompensationExperimentResult['compensationMode']): string {
  return mode === 'with-compensation' ? 'on' : 'off';
}

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function mainSummary(experiment: EnvironmentalCompensationExperiment): string {
  const rows: CsvCell[][] = [];
  const conditions: EnvironmentalCompensationExperimentResult['condition'][] = [
    'normal',
    'structural-anomaly'
  ];
  const matches = ['matched', 'mismatched'] as const;
  const modes: EnvironmentalCompensationExperimentResult['compensationMode'][] = [
    'without-compensation',
    'with-compensation'
  ];

  for (const condition of conditions) {
    for (const match of matches) {
      for (const mode of modes) {
        const group = experiment.results.filter((result) =>
          result.condition === condition &&
          (result.trueTemperatureCoefficient === result.assumedTemperatureCoefficient) === (match === 'matched') &&
          result.compensationMode === mode
        );
        if (group.length === 0) continue;
        const falseAlarmTotal = group.reduce((sum, result) => sum + result.falseAlarms, 0);
        const falseAlarmDenominator = group.reduce(
          (sum, result) => sum + (
            condition === 'structural-anomaly' && result.anomalySeverityMultiplier > 0
              ? Math.floor(result.evaluationPoints * 0.5)
              : result.evaluationPoints
          ),
          0
        );
        const detected = group.filter((result) => result.detectionDelay !== null).length;
        const postOnsetSamples = group.length * Math.max(
          0,
          group[0]!.evaluationPoints - Math.floor(group[0]!.evaluationPoints * 0.5)
        );
        const pointwiseRate = condition === 'structural-anomaly'
          ? mean(group.map((result) => result.detectionRate))
          : null;
        const delays = group
          .map((result) => result.detectionDelay)
          .filter((value): value is number => value !== null);
        rows.push([
          condition,
          match,
          modeLabel(mode),
          group.length,
          falseAlarmTotal,
          falseAlarmDenominator,
          fixed(falseAlarmTotal / group.length),
          pct(falseAlarmDenominator === 0 ? null : falseAlarmTotal / falseAlarmDenominator),
          condition === 'structural-anomaly' ? detected : null,
          condition === 'structural-anomaly' ? group.length : null,
          condition === 'structural-anomaly' ? pct(group.length ? detected / group.length : null) : null,
          condition === 'structural-anomaly' ? postOnsetSamples : null,
          pct(pointwiseRate),
          fixed(mean(delays))
        ]);
      }
    }
  }

  return toCsv([
    'condition',
    'coefficient_match',
    'compensation',
    'case_count',
    'false_alarm_total',
    'false_alarm_denominator',
    'mean_false_alarms_per_case',
    'false_alarm_rate_pct',
    'cases_detected',
    'case_detection_denominator',
    'case_detection_rate_pct',
    'post_onset_sample_denominator',
    'post_onset_point_exceedance_rate_pct',
    'mean_detection_delay_samples_detected_cases_only'
  ], rows);
}

function severitySummary(sweep: EnvironmentalAnomalySeveritySweep): string {
  const rows: CsvCell[][] = [];
  const severities = sortedUnique(sweep.severityMultipliers);
  const modes: EnvironmentalCompensationExperimentResult['compensationMode'][] = [
    'without-compensation',
    'with-compensation'
  ];

  for (const severity of severities) {
    const entry = sweep.results.find((candidate) => candidate.anomalySeverityMultiplier === severity);
    if (!entry) continue;
    for (const mode of modes) {
      const group = entry.results.filter((result) => result.compensationMode === mode);
      if (group.length === 0) continue;
      const detected = group.filter((result) => result.detectionDelay !== null);
      const delays = detected
        .map((result) => result.detectionDelay)
        .filter((value): value is number => value !== null);
      const postOnsetSampleDenominator = group.reduce(
        (sum, result) => sum + Math.max(0, result.evaluationPoints - Math.floor(result.evaluationPoints * 0.5)),
        0
      );
      const pointExceedances = group.reduce(
        (sum, result) => sum + Math.round(result.detectionRate * Math.max(0, result.evaluationPoints - Math.floor(result.evaluationPoints * 0.5))),
        0
      );
      rows.push([
        severity,
        severity === 0 ? 'negative-control' : 'injected-step',
        modeLabel(mode),
        group.length,
        detected.length,
        group.length,
        pct(group.length ? detected.length / group.length : null),
        group.length - detected.length,
        postOnsetSampleDenominator,
        pct(postOnsetSampleDenominator ? pointExceedances / postOnsetSampleDenominator : null),
        fixed(mean(delays))
      ]);
    }
  }

  return toCsv([
    'severity_multiplier',
    'scenario_type',
    'compensation',
    'configuration_count',
    'configurations_with_post_onset_crossing',
    'case_detection_denominator',
    'case_crossing_rate_pct',
    'configurations_without_crossing',
    'post_onset_sample_denominator',
    'post_onset_point_exceedance_rate_pct',
    'mean_delay_samples_crossing_cases_only'
  ], rows);
}

function persistenceSummary(
  baseline: EnvironmentalCompensationExperiment,
  sweep: EnvironmentalAnomalySeveritySweep,
  normalizationRuns: EnvironmentalCompensationExperiment[]
): string {
  const rows: CsvCell[][] = [];
  const modes: EnvironmentalCompensationExperimentResult['compensationMode'][] = [
    'without-compensation',
    'with-compensation'
  ];
  const nonzeroEntries = sweep.results.filter((entry) => entry.anomalySeverityMultiplier > 0);

  for (const window of sortedUnique(sweep.persistenceWindows)) {
    for (const mode of modes) {
      const group = nonzeroEntries.flatMap((entry) =>
        entry.results.filter((result) => result.compensationMode === mode)
      );
      const metrics = group.flatMap((result) =>
        result.persistenceMetrics.filter((metric) => metric.persistenceWindow === window)
      );
      const detected = metrics.filter((metric) => metric.anomalyDetected);
      const delays = detected
        .map((metric) => metric.detectionDelay)
        .filter((value): value is number => value !== null);
      const normalGroup = baseline.results.filter(
        (result) => result.condition === 'normal' && result.compensationMode === mode
      );
      const normalMetrics = normalGroup.flatMap((result) =>
        result.persistenceMetrics.filter((metric) => metric.persistenceWindow === window)
      );
      rows.push([
        window,
        modeLabel(mode),
        metrics.length,
        detected.length,
        metrics.length,
        pct(metrics.length ? detected.length / metrics.length : null),
        metrics.length - detected.length,
        fixed(mean(delays)),
        normalMetrics.length,
        fixed(mean(normalMetrics.map((metric) => metric.falseAlarmEpisodes)))
      ]);
    }
  }

  return toCsv([
    'persistence_window_samples',
    'compensation',
    'nonzero_severity_configuration_count',
    'detected_configurations',
    'detection_denominator',
    'detection_rate_pct',
    'missed_configurations',
    'mean_detection_delay_samples_detected_cases_only',
    'normal_case_denominator',
    'mean_normal_false_alarm_episodes_per_case'
  ], rows);
}

function normalizationSummary(
  runs: EnvironmentalCompensationExperiment[]
): string {
  const rows: CsvCell[][] = [];
  const matches = ['matched', 'mismatched'] as const;
  const conditions: EnvironmentalCompensationExperimentResult['condition'][] = [
    'normal',
    'structural-anomaly'
  ];
  const modes: EnvironmentalCompensationExperimentResult['compensationMode'][] = [
    'without-compensation',
    'with-compensation'
  ];

  for (const run of runs) {
    const strategy = run.normalizationStrategy;
    for (const condition of conditions) {
      for (const match of matches) {
        for (const mode of modes) {
          const group = run.results.filter((result) =>
            result.condition === condition &&
            (result.trueTemperatureCoefficient === result.assumedTemperatureCoefficient) === (match === 'matched') &&
            result.compensationMode === mode
          );
          if (group.length === 0) continue;
          const falseAlarmTotal = group.reduce((sum, result) => sum + result.falseAlarms, 0);
          const falseAlarmDenominator = group.length * (
            condition === 'structural-anomaly'
              ? Math.floor(group[0]!.evaluationPoints * 0.5)
              : group[0]!.evaluationPoints
          );
          const detected = group.filter((result) => result.detectionDelay !== null).length;
          rows.push([
            strategy,
            condition,
            match,
            modeLabel(mode),
            group.length,
            fixed(falseAlarmTotal / group.length),
            pct(falseAlarmDenominator ? falseAlarmTotal / falseAlarmDenominator : null),
            condition === 'structural-anomaly' ? pct(mean(group.map((result) => result.detectionRate))) : null,
            condition === 'structural-anomaly' ? detected : null,
            condition === 'structural-anomaly' ? group.length : null,
            condition === 'structural-anomaly' ? pct(group.length ? detected / group.length : null) : null
          ]);
        }
      }
    }
  }

  return toCsv([
    'normalization_strategy',
    'condition',
    'coefficient_match',
    'compensation',
    'case_count',
    'mean_false_alarms_per_case',
    'false_alarm_rate_pct',
    'post_onset_point_detection_rate_pct',
    'cases_detected',
    'case_detection_denominator',
    'case_level_detection_rate_pct'
  ], rows);
}

function metadataCsv(
  baseline: EnvironmentalCompensationExperiment,
  sweep: EnvironmentalAnomalySeveritySweep,
  normalizationRuns: EnvironmentalCompensationExperiment[]
): string {
  const rows: CsvCell[][] = [
    ['experiment_id', baseline.experimentId],
    ['sweep_experiment_id', sweep.experimentId],
    ['aggregation_version', '1'],
    ['thresholds', JSON.stringify(baseline.thresholds)],
    ['true_temperature_coefficients', JSON.stringify(baseline.trueTemperatureCoefficients)],
    ['assumed_temperature_coefficients', JSON.stringify(baseline.assumedTemperatureCoefficients)],
    ['seeds', JSON.stringify(baseline.seeds)],
    ['calibration_points_per_case', baseline.calibrationPoints],
    ['evaluation_points_per_case', baseline.evaluationPoints],
    ['normalization_strategy', baseline.normalizationStrategy],
    ['normalization_sensitivity_strategies', JSON.stringify(normalizationRuns.map((run) => run.normalizationStrategy))],
    ['baseline_severity_multiplier', baseline.anomalySeverityMultiplier],
    ['severity_multipliers', JSON.stringify(sweep.severityMultipliers)],
    ['persistence_windows', JSON.stringify(baseline.persistenceWindows)],
    ['main_result_row_count', baseline.results.length],
    ['severity_result_row_count', sweep.results.reduce((sum, entry) => sum + entry.results.length, 0)],
    ['normalization_sensitivity_result_row_count', normalizationRuns.reduce((sum, run) => sum + run.results.length, 0)],
    ['rounding_rule', 'Display rates as percentages with 2 decimal places; means and delays with 2 decimal places; null metrics are blank.'],
    ['dependence_note', 'Configuration rows share deterministic synthetic inputs and are not independent physical trials.']
  ];
  return toCsv(['key', 'value'], rows);
}

/** Create deterministic CSV report tables from the actual EXP-07 result objects. */
export function buildExp07CsvReport(
  baseline: EnvironmentalCompensationExperiment,
  sweep: EnvironmentalAnomalySeveritySweep,
  normalizationRuns: EnvironmentalCompensationExperiment[] = []
): Exp07CsvReport {
  if (baseline.experimentId !== 'EXP-07' || sweep.experimentId !== 'EXP-07-SEVERITY-SWEEP') {
    throw new Error('EXP-07 report export requires EXP-07 baseline and severity-sweep results.');
  }
  if (normalizationRuns.some((run) => run.experimentId !== 'EXP-07')) {
    throw new Error('EXP-07 normalization report requires EXP-07 result objects.');
  }
  return {
    'main-summary.csv': mainSummary(baseline),
    'severity-summary.csv': severitySummary(sweep),
    'persistence-summary.csv': persistenceSummary(baseline, sweep),
    'normalization-sensitivity.csv': normalizationSummary(normalizationRuns),
    'metadata.csv': metadataCsv(baseline, sweep, normalizationRuns)
  };
}
