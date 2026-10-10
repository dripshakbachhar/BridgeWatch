import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runEnvironmentalCompensationExperiment } from '../engineering/experiments';

const SEEDS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const THRESHOLDS = [1.5, 2, 3];
const TRUE_COEFFICIENTS = [4, 8, 12];
const ASSUMED_COEFFICIENTS = [0, 4, 8, 12, 16];
const CALIBRATION_POINTS = 30;
const EVALUATION_POINTS = 40;
const SEVERITY = 2.5;

type Mode = 'without-compensation' | 'with-compensation';
type Scenario = 'normal' | 'injected-step' | 'negative-control';
type Match = 'matched' | 'mismatched';
type Metric = number | null;

interface Row {
  statistic: string;
  seed: string;
  scenario: Scenario;
  match: Match;
  mode: 'off' | 'on';
  cases: number;
  falseAlarmCount: number;
  falseAlarmDenominator: number;
  falseAlarmRatePct: Metric;
  crossingCount: Metric;
  crossingDenominator: Metric;
  crossingRatePct: Metric;
  pointwiseRatePct: Metric;
  meanDelayDetectedCasesOnly: Metric;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function sampleSd(values: number[]): number | null {
  if (values.length < 2) return values.length === 1 ? 0 : null;
  const mean = average(values)!;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows: Row[]): string {
  const headers: (keyof Row)[] = [
    'statistic', 'seed', 'scenario', 'match', 'mode', 'cases',
    'falseAlarmCount', 'falseAlarmDenominator', 'falseAlarmRatePct',
    'crossingCount', 'crossingDenominator', 'crossingRatePct',
    'pointwiseRatePct', 'meanDelayDetectedCasesOnly'
  ];
  return [headers.join(','), ...rows.map((row) => headers.map((key) => {
    const value = row[key];
    return typeof value === 'number' && key.toLowerCase().includes('pct') ? value.toFixed(2) :
      typeof value === 'number' && key === 'meanDelayDetectedCasesOnly' ? value.toFixed(2) : csvCell(value);
  }).join(','))].join('\r\n') + '\r\n';
}

function summariseSeed(
  seed: number,
  scenario: Scenario,
  results: ReturnType<typeof runEnvironmentalCompensationExperiment>['results']
): Row[] {
  const rows: Row[] = [];
  const modes: Mode[] = ['without-compensation', 'with-compensation'];
  const matches: Match[] = ['matched', 'mismatched'];

  for (const match of matches) {
    for (const mode of modes) {
      const group = results.filter((result) =>
        result.compensationMode === mode &&
        (result.trueTemperatureCoefficient === result.assumedTemperatureCoefficient) === (match === 'matched') &&
        (scenario === 'normal' ? result.condition === 'normal' : result.condition === 'structural-anomaly')
      );
      if (!group.length) continue;

      const falseAlarmCount = group.reduce((sum, result) => sum + result.falseAlarms, 0);
      const falseAlarmDenominator = group.reduce((sum, result) => {
        if (scenario === 'normal' || scenario === 'negative-control') return sum + result.evaluationPoints;
        return sum + Math.floor(result.evaluationPoints * 0.5);
      }, 0);
      const crossingCount = scenario === 'normal' ? null : group.filter((result) => result.detectionDelay !== null).length;
      const crossingDenominator = scenario === 'normal' ? null : group.length;
      const delays = group.map((result) => result.detectionDelay).filter((value): value is number => value !== null);
      rows.push({
        statistic: 'seed', seed: String(seed), scenario, match,
        mode: mode === 'with-compensation' ? 'on' : 'off',
        cases: group.length,
        falseAlarmCount,
        falseAlarmDenominator,
        falseAlarmRatePct: falseAlarmDenominator ? falseAlarmCount / falseAlarmDenominator * 100 : null,
        crossingCount,
        crossingDenominator,
        crossingRatePct: crossingCount === null || !crossingDenominator ? null : crossingCount / crossingDenominator * 100,
        pointwiseRatePct: scenario === 'normal' ? null : average(group.map((result) => result.detectionRate))! * 100,
        meanDelayDetectedCasesOnly: delays.length ? average(delays) : null
      });
    }
  }
  return rows;
}

function summariseAcrossSeeds(seedRows: Row[]): Row[] {
  const output: Row[] = [];
  const stats = [
    ['mean', average],
    ['sample_sd', sampleSd],
    ['min', (values: number[]) => values.length ? Math.min(...values) : null],
    ['max', (values: number[]) => values.length ? Math.max(...values) : null]
  ] as const;
  const numericKeys: (keyof Row)[] = [
    'cases', 'falseAlarmCount', 'falseAlarmDenominator', 'falseAlarmRatePct',
    'crossingCount', 'crossingDenominator', 'crossingRatePct', 'pointwiseRatePct',
    'meanDelayDetectedCasesOnly'
  ];
  const groups = new Map<string, Row[]>();
  for (const row of seedRows) {
    const key = [row.scenario, row.match, row.mode].join('|');
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const rows of groups.values()) {
    for (const [statistic, fn] of stats) {
      const base = rows[0]!;
      const summary: Row = { ...base, statistic, seed: String(SEEDS.length) };
      for (const key of numericKeys) {
        const values = rows.map((row) => row[key]).filter((value): value is number => typeof value === 'number');
        (summary as unknown as Record<string, unknown>)[key] = fn(values);
      }
      output.push(summary);
    }
  }
  return output;
}

describe('EXP-07 multi-seed robustness study', () => {
  test('exports per-seed results and descriptive across-seed variability', async () => {
    const perSeedRows: Row[] = [];
    for (const seed of SEEDS) {
      const injected = runEnvironmentalCompensationExperiment(
        THRESHOLDS, TRUE_COEFFICIENTS, ASSUMED_COEFFICIENTS, [seed],
        CALIBRATION_POINTS, EVALUATION_POINTS, 'pipeline-default', SEVERITY, [1, 2, 3, 5]
      );
      const negativeControl = runEnvironmentalCompensationExperiment(
        THRESHOLDS, TRUE_COEFFICIENTS, ASSUMED_COEFFICIENTS, [seed],
        CALIBRATION_POINTS, EVALUATION_POINTS, 'pipeline-default', 0, [1, 2, 3, 5]
      );
      perSeedRows.push(...summariseSeed(seed, 'normal', injected.results));
      perSeedRows.push(...summariseSeed(seed, 'injected-step', injected.results));
      perSeedRows.push(...summariseSeed(seed, 'negative-control', negativeControl.results));
    }

    const outputRows = [...perSeedRows, ...summariseAcrossSeeds(perSeedRows)];
    const report = csv(outputRows);
    expect(SEEDS).toHaveLength(10);
    expect(perSeedRows).toHaveLength(120);
    expect(outputRows).toHaveLength(168);
    expect(report).toContain('sample_sd,10,normal,matched,off');
    expect(report).toContain('sample_sd,10,negative-control,matched,on');
    expect(report).toContain('seed,101,normal,matched,off');
    expect(report).toContain('seed,110,injected-step,mismatched,on');

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, 'seed-robustness.csv'), report, 'utf8');

    // Emit a compact, machine-readable summary so CI logs preserve the
    // computed evidence even when generated CSV files are not uploaded.
    const summaryRows = outputRows.filter((row) =>
      row.statistic === 'mean' || row.statistic === 'sample_sd' ||
      row.statistic === 'min' || row.statistic === 'max'
    );
    console.log('EXP07_ROBUSTNESS_SUMMARY_JSON_BEGIN');
    console.log(JSON.stringify(summaryRows));
    console.log('EXP07_ROBUSTNESS_SUMMARY_JSON_END');
  });
});
