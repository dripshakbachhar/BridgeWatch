import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runEnvironmentalCompensationExperiment } from '../src/engineering/experiments';

const SEEDS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const THRESHOLDS = [1.5, 2, 3];
const TRUE_COEFFICIENTS = [4, 8, 12];
const ASSUMED_COEFFICIENTS = [0, 4, 8, 12, 16];
const CALIBRATION_POINTS = 30;
const EVALUATION_POINTS = 40;
// Zero is a negative control; the other levels test weak and moderate steps.
const SEVERITIES = [0, 0.5, 1];
const WINDOWS = [1, 2, 3, 5] as const;
const SIGNED_ERRORS = [-12, -8, -4, 0, 4, 8, 12];

type Mode = 'off' | 'on';
type Statistic = 'seed' | 'mean' | 'sample_sd' | 'min' | 'max';

interface Row {
  statistic: Statistic;
  seed: number;
  severity: number;
  trueTemperatureCoefficient: number;
  signedCoefficientError: number | null;
  absoluteCoefficientError: number | null;
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
    'statistic', 'seed', 'severity', 'trueTemperatureCoefficient', 'signedCoefficientError', 'absoluteCoefficientError',
    'mode', 'persistenceWindow', 'cases', 'falseAlarmEpisodesPerCase', 'detectedCases',
    'detectionRatePct', 'meanDelayDetectedCasesOnly', 'missedCases'
  ];
  return [headers.join(','), ...rows.map(row => headers.map(key => {
    const value = row[key];
    return typeof value === 'number' && [
      'severity', 'falseAlarmEpisodesPerCase', 'detectionRatePct',
      'meanDelayDetectedCasesOnly'
    ].includes(key) ? value.toFixed(3) : csvCell(value);
  }).join(','))].join('\r\n') + '\r\n';
}

describe('EXP-07 temperature-coefficient calibration-error sensitivity', () => {
  test('measures signed coefficient error effects across ten seeds', async () => {
    const perSeedRows: Row[] = [];
    for (const seed of SEEDS) {
      for (const severity of SEVERITIES) {
        const run = runEnvironmentalCompensationExperiment(
          THRESHOLDS, TRUE_COEFFICIENTS, ASSUMED_COEFFICIENTS, [seed],
          CALIBRATION_POINTS, EVALUATION_POINTS, 'pipeline-default', severity, [...WINDOWS]
        );
        for (const trueCoefficient of TRUE_COEFFICIENTS) {
          for (const mode of ['off', 'on'] as const) {
            const errorGroups: Array<number | null> = mode === 'off'
              ? [null]
              : ASSUMED_COEFFICIENTS.map(assumed => assumed - trueCoefficient);
            for (const signedError of errorGroups) {
            for (const persistenceWindow of WINDOWS) {
              const group = run.results.filter(result =>
                result.condition === 'structural-anomaly' &&
                result.trueTemperatureCoefficient === trueCoefficient &&
                result.compensationMode === (mode === 'on' ? 'with-compensation' : 'without-compensation') &&
                (mode === 'off'
                  ? result.assumedTemperatureCoefficient === 0
                  : result.assumedTemperatureCoefficient - result.trueTemperatureCoefficient === signedError)
              );
              // The selected coefficient grid has at least one configuration for each signed error.
              const metrics = group.map(result =>
                result.persistenceMetrics.find(metric => metric.persistenceWindow === persistenceWindow)!
              );
              const detected = metrics.filter(metric => metric.anomalyDetected).length;
              const delays = metrics.map(metric => metric.detectionDelay).filter((v): v is number => v !== null);
              perSeedRows.push({
                statistic: 'seed', seed, severity, trueTemperatureCoefficient: trueCoefficient, signedCoefficientError: signedError,
                absoluteCoefficientError: signedError === null ? null : Math.abs(signedError), mode, persistenceWindow,
                cases: group.length,
                falseAlarmEpisodesPerCase: mean(metrics.map(metric => metric.falseAlarmEpisodes)),
                detectedCases: detected,
                detectionRatePct: group.length ? detected / group.length * 100 : 0,
                meanDelayDetectedCasesOnly: delays.length ? mean(delays) : null,
                missedCases: group.length - detected
              });
            }
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
      const key = [row.severity, row.trueTemperatureCoefficient, row.signedCoefficientError ?? 'baseline', row.mode, row.persistenceWindow].join('|');
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    for (const group of groups.values()) {
      for (const [statistic, summariser] of stats) {
        const base = group[0]!;
        const summary: Row = { ...base, statistic, seed: SEEDS.length };
        for (const key of numericKeys) {
          const available = group.map(row => row[key]).filter((v): v is number => typeof v === 'number');
          (summary as unknown as Record<string, unknown>)[key] =
            available.length ? summariser(available) : null;
        }
        summaryRows.push(summary);
      }
    }

    const allRows = [...perSeedRows, ...summaryRows];
    expect(perSeedRows).toHaveLength(2160);
    expect(summaryRows).toHaveLength(864);
    expect(allRows).toHaveLength(3024);
    expect(perSeedRows.every(row => row.cases > 0)).toBe(true);
    expect(perSeedRows.every(row => row.detectionRatePct >= 0 && row.detectionRatePct <= 100)).toBe(true);

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, 'coefficient-error-sensitivity.csv'), toCsv(allRows), 'utf8');
    console.log('EXP07_COEFFICIENT_ERROR_SUMMARY_JSON_BEGIN');
    console.log(JSON.stringify({ perSeedRows, summaryRows }));
    console.log('EXP07_COEFFICIENT_ERROR_SUMMARY_JSON_END');
  });
