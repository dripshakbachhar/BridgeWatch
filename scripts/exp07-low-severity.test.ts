import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runEnvironmentalCompensationExperiment } from '../src/engineering/experiments';

const SEEDS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const THRESHOLDS = [1.5, 2, 3];
const TRUE_COEFFICIENTS = [4, 8, 12];
const ASSUMED_COEFFICIENTS = [0, 4, 8, 12, 16];
const CALIBRATION_POINTS = 30;
const EVALUATION_POINTS = 40;
const SEVERITIES = [0.25, 0.5, 0.75, 1];
const WINDOWS = [1, 2, 3, 5] as const;

type Mode = 'off' | 'on';
type Match = 'matched' | 'mismatched';
type Statistic = 'seed' | 'mean' | 'sample_sd' | 'min' | 'max';

interface Row {
  statistic: Statistic;
  seed: number;
  severity: number;
  match: Match;
  mode: Mode;
  persistenceWindow: number;
  cases: number;
  falseAlarmEpisodesPerCase: number;
  detectedCases: number;
  detectionRatePct: number;
  meanDelayDetectedCasesOnly: number | null;
  missedCases: number;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
function sampleSd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1));
}
function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function toCsv(rows: Row[]): string {
  const headers: (keyof Row)[] = [
    'statistic', 'seed', 'severity', 'match', 'mode', 'persistenceWindow',
    'cases', 'falseAlarmEpisodesPerCase', 'detectedCases', 'detectionRatePct',
    'meanDelayDetectedCasesOnly', 'missedCases'
  ];
  return [headers.join(','), ...rows.map(row => headers.map(key => {
    const value = row[key];
    return typeof value === 'number' && [
      'severity', 'falseAlarmEpisodesPerCase', 'detectionRatePct', 'meanDelayDetectedCasesOnly'
    ].includes(key) ? value.toFixed(3) : csvCell(value);
  }).join(','))].join('\r\n') + '\r\n';
}

describe('EXP-07 low-severity anomaly stress study', () => {
  test('measures weak-step detection, misses, delay, and pre-onset false alarms across ten seeds', async () => {
    const perSeedRows: Row[] = [];
    for (const seed of SEEDS) {
      for (const severity of SEVERITIES) {
        const run = runEnvironmentalCompensationExperiment(
          THRESHOLDS, TRUE_COEFFICIENTS, ASSUMED_COEFFICIENTS, [seed],
          CALIBRATION_POINTS, EVALUATION_POINTS, 'pipeline-default', severity, [...WINDOWS]
        );
        for (const match of ['matched', 'mismatched'] as const) {
          for (const mode of ['off', 'on'] as const) {
            for (const persistenceWindow of WINDOWS) {
              const group = run.results.filter(result =>
                result.compensationMode === (mode === 'on' ? 'with-compensation' : 'without-compensation') &&
                (result.trueTemperatureCoefficient === result.assumedTemperatureCoefficient) === (match === 'matched') &&
                result.condition === 'structural-anomaly'
              );
              const metrics = group.map(result =>
                result.persistenceMetrics.find(metric => metric.persistenceWindow === persistenceWindow)!
              );
              const detected = metrics.filter(metric => metric.anomalyDetected).length;
              const delays = metrics.map(metric => metric.detectionDelay).filter((v): v is number => v !== null);
              perSeedRows.push({
                statistic: 'seed', seed, severity, match, mode, persistenceWindow,
                cases: group.length,
                falseAlarmEpisodesPerCase: mean(metrics.map(metric => metric.falseAlarmEpisodes)),
                detectedCases: detected,
                detectionRatePct: detected / group.length * 100,
                meanDelayDetectedCasesOnly: delays.length ? mean(delays) : null,
                missedCases: group.length - detected
              });
            }
          }
        }
      }
    }

    const summaryRows: Row[] = [];
    const stats: Array<[Exclude<Statistic, 'seed'>, (values: number[]) => number]> = [
      ['mean', mean], ['sample_sd', sampleSd],
      ['min', values => Math.min(...values)], ['max', values => Math.max(...values)]
    ];
    const numericKeys: Array<keyof Row> = [
      'cases', 'falseAlarmEpisodesPerCase', 'detectedCases', 'detectionRatePct',
      'meanDelayDetectedCasesOnly', 'missedCases'
    ];
    const groups = new Map<string, Row[]>();
    for (const row of perSeedRows) {
      const key = [row.severity, row.match, row.mode, row.persistenceWindow].join('|');
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    for (const group of groups.values()) {
      for (const [statistic, summariser] of stats) {
        const base = group[0]!;
        const summary: Row = { ...base, statistic, seed: SEEDS.length };
        for (const key of numericKeys) {
          const values = group.map(row => row[key]).filter((v): v is number => typeof v === 'number');
          const available = key === 'meanDelayDetectedCasesOnly'
            ? group.map(row => row[key]).filter((v): v is number => typeof v === 'number')
            : values;
          (summary as unknown as Record<string, unknown>)[key] =
            available.length ? summariser(available) : null;
        }
        summaryRows.push(summary);
      }
    }

    const allRows = [...perSeedRows, ...summaryRows];
    expect(perSeedRows).toHaveLength(640);
    expect(summaryRows).toHaveLength(256);
    expect(allRows).toHaveLength(896);
    expect(perSeedRows.every(row => row.cases > 0 && row.detectionRatePct >= 0 && row.detectionRatePct <= 100)).toBe(true);

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, 'low-severity-stress.csv'), toCsv(allRows), 'utf8');
    console.log('EXP07_LOW_SEVERITY_SUMMARY_JSON_BEGIN');
    console.log(JSON.stringify({ perSeedRows, summaryRows }));
    console.log('EXP07_LOW_SEVERITY_SUMMARY_JSON_END');
  });
});
