import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runEnvironmentalCompensationExperiment } from '../src/engineering/experiments';

const SEEDS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const THRESHOLDS = [1.5, 2, 3];
const TRUE_COEFFICIENTS = [4, 8, 12];
const ASSUMED_COEFFICIENTS = [0, 4, 8, 12, 16];
const CALIBRATION_POINTS = 30;
const EVALUATION_POINTS = 40;
const SEVERITY = 2.5;
const WINDOWS = [1, 2, 3, 5] as const;

type Mode = 'off' | 'on';
type Scenario = 'normal' | 'injected-step' | 'negative-control';
type Match = 'matched' | 'mismatched';
type Statistic = 'seed' | 'mean' | 'sample_sd' | 'min' | 'max';

interface Row {
  statistic: Statistic;
  seed: number;
  scenario: Scenario;
  match: Match;
  mode: Mode;
  persistenceWindow: number;
  cases: number;
  meanFalseAlarmEpisodes: number | null;
  casesDetected: number | null;
  detectionRatePct: number | null;
  meanDelayDetectedCasesOnly: number | null;
  missedCases: number | null;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function sampleSd(values: number[]): number | null {
  if (!values.length) return null;
  if (values.length === 1) return 0;
  const m = mean(values)!;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1));
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Row[]): string {
  const headers: (keyof Row)[] = [
    'statistic', 'seed', 'scenario', 'match', 'mode', 'persistenceWindow',
    'cases', 'meanFalseAlarmEpisodes', 'casesDetected', 'detectionRatePct',
    'meanDelayDetectedCasesOnly', 'missedCases'
  ];
  return [headers.join(','), ...rows.map(row => headers.map(key => {
    const value = row[key];
    return typeof value === 'number' && (
      key === 'meanFalseAlarmEpisodes' ||
      key === 'detectionRatePct' ||
      key === 'meanDelayDetectedCasesOnly'
    ) ? value.toFixed(3) : csvCell(value);
  }).join(','))].join('\r\n') + '\r\n';
}

function summariseSeed(
  seed: number,
  scenario: Scenario,
  results: ReturnType<typeof runEnvironmentalCompensationExperiment>['results']
): Row[] {
  const rows: Row[] = [];
  for (const match of ['matched', 'mismatched'] as const) {
    for (const mode of ['off', 'on'] as const) {
      for (const persistenceWindow of WINDOWS) {
        const group = results.filter(result =>
          result.compensationMode === (mode === 'on' ? 'with-compensation' : 'without-compensation') &&
          (result.trueTemperatureCoefficient === result.assumedTemperatureCoefficient) === (match === 'matched') &&
          (scenario === 'normal' ? result.condition === 'normal' : result.condition === 'structural-anomaly')
        );
        const metrics = group.map(result =>
          result.persistenceMetrics.find(metric => metric.persistenceWindow === persistenceWindow)!
        );
        const detected = metrics.filter(metric => metric.anomalyDetected).length;
        const delays = metrics.map(metric => metric.detectionDelay).filter((value): value is number => value !== null);
        rows.push({
          statistic: 'seed',
          seed,
          scenario,
          match,
          mode,
          persistenceWindow,
          cases: group.length,
          meanFalseAlarmEpisodes: mean(metrics.map(metric => metric.falseAlarmEpisodes)),
          casesDetected: scenario === 'normal' ? null : detected,
          detectionRatePct: scenario === 'normal' ? null : detected / group.length * 100,
          meanDelayDetectedCasesOnly: scenario === 'normal' || !delays.length ? null : mean(delays),
          missedCases: scenario === 'normal' ? null : group.length - detected
        });
      }
    }
  }
  return rows;
}

function summariseAcrossSeeds(seedRows: Row[]): Row[] {
  const summaries: Row[] = [];
  const stats: Array<[Exclude<Statistic, 'seed'>, (values: number[]) => number | null]> = [
    ['mean', mean],
    ['sample_sd', sampleSd],
    ['min', values => values.length ? Math.min(...values) : null],
    ['max', values => values.length ? Math.max(...values) : null]
  ];
  const numericKeys: Array<keyof Row> = [
    'cases', 'meanFalseAlarmEpisodes', 'casesDetected', 'detectionRatePct',
    'meanDelayDetectedCasesOnly', 'missedCases'
  ];
  const groups = new Map<string, Row[]>();
  for (const row of seedRows) {
    const key = [row.scenario, row.match, row.mode, row.persistenceWindow].join('|');
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const group of groups.values()) {
    for (const [statistic, summariser] of stats) {
      const base = group[0]!;
      const summary: Row = { ...base, statistic, seed: SEEDS.length };
      for (const key of numericKeys) {
        const values = group.map(row => row[key]).filter((value): value is number => typeof value === 'number');
        (summary as unknown as Record<string, unknown>)[key] = summariser(values);
      }
      summaries.push(summary);
    }
  }
  return summaries;
}

describe('EXP-07 persistence-window robustness study', () => {
  test('compares false-alarm episodes against detection delay and misses across ten seeds', async () => {
    const perSeedRows: Row[] = [];
    for (const seed of SEEDS) {
      const injected = runEnvironmentalCompensationExperiment(
        THRESHOLDS, TRUE_COEFFICIENTS, ASSUMED_COEFFICIENTS, [seed],
        CALIBRATION_POINTS, EVALUATION_POINTS, 'pipeline-default', SEVERITY, [...WINDOWS]
      );
      const negativeControl = runEnvironmentalCompensationExperiment(
        THRESHOLDS, TRUE_COEFFICIENTS, ASSUMED_COEFFICIENTS, [seed],
        CALIBRATION_POINTS, EVALUATION_POINTS, 'pipeline-default', 0, [...WINDOWS]
      );
      perSeedRows.push(...summariseSeed(seed, 'normal', injected.results));
      perSeedRows.push(...summariseSeed(seed, 'injected-step', injected.results));
      perSeedRows.push(...summariseSeed(seed, 'negative-control', negativeControl.results));
    }

    const summaryRows = summariseAcrossSeeds(perSeedRows);
    const allRows = [...perSeedRows, ...summaryRows];
    expect(perSeedRows).toHaveLength(480);
    expect(summaryRows).toHaveLength(192);
    expect(allRows).toHaveLength(672);
    expect(perSeedRows.some(row => row.scenario === 'injected-step' && row.persistenceWindow === 5)).toBe(true);

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, 'persistence-robustness.csv'), toCsv(allRows), 'utf8');

    console.log('EXP07_PERSISTENCE_SUMMARY_JSON_BEGIN');
    console.log(JSON.stringify({ perSeedRows, summaryRows }));
    console.log('EXP07_PERSISTENCE_SUMMARY_JSON_END');
  });
});
