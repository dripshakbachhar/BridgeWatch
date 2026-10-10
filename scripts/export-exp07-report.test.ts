import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildExp07CsvReport } from '../src/engineering/exp07Report';
import {
  runEnvironmentalAnomalySeveritySweep,
  runEnvironmentalCompensationExperiment
} from '../src/engineering/experiments';

describe('EXP-07 CSV report export', () => {
  test('creates deterministic CSV tables with explicit denominators', async () => {
    const baseline = runEnvironmentalCompensationExperiment(
      [1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40
    );
    const sweep = runEnvironmentalAnomalySeveritySweep(
      [1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40,
      [0, 0.5, 1, 1.5, 2.5], 'pipeline-default', [1, 2, 3, 5]
    );
    const normalizationRuns = [
      runEnvironmentalCompensationExperiment([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40, 'raw-calibration-std'),
      runEnvironmentalCompensationExperiment([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40, 'compensated-calibration-std')
    ];
    const report = buildExp07CsvReport(baseline, sweep, normalizationRuns);
    expect(report).toEqual(buildExp07CsvReport(
      runEnvironmentalCompensationExperiment([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40),
      runEnvironmentalAnomalySeveritySweep([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40, [0, 0.5, 1, 1.5, 2.5], 'pipeline-default', [1, 2, 3, 5]),
      [
        runEnvironmentalCompensationExperiment([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40, 'raw-calibration-std'),
        runEnvironmentalCompensationExperiment([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40, 'compensated-calibration-std')
      ]
    ));
    expect(report['main-summary.csv'].split('\r\n')).toHaveLength(10);
    expect(report['severity-summary.csv'].split('\r\n')).toHaveLength(12);
    expect(report['persistence-summary.csv'].split('\r\n')).toHaveLength(10);
    expect(report['normalization-sensitivity.csv'].split('\r\n')).toHaveLength(18);
    expect(report['metadata.csv']).toContain('calibration_points_per_case,30');
    expect(report['main-summary.csv']).toContain('false_alarm_denominator');
    expect(report['severity-summary.csv']).toContain('post_onset_sample_denominator');
    expect(report['persistence-summary.csv']).toContain('detection_denominator');
    expect(report['severity-summary.csv']).toContain('2.5,injected-step,off,270,270,270,100.00,0,5400,98.89,0.00');
    expect(report['persistence-summary.csv']).toContain('1,off,1080,1070,1080,99.07,10,0.70,270,2.28');
    expect(report['severity-summary.csv']).toContain('0,negative-control,on,270,164,270,60.74,106,5400,11.56,4.25');
    expect(report['severity-summary.csv']).toContain('0.5,injected-step,off,270,260,270,96.30,10,5400,37.31,1.88');
    expect(report['severity-summary.csv']).toContain('1,injected-step,on,270,222,270,82.22,48,5400,32.91,3.20');
    expect(report['severity-summary.csv']).toContain('1.5,injected-step,off,270,270,270,100.00,0,5400,81.20,0.19');
    expect(report['severity-summary.csv']).toContain('2.5,injected-step,on,270,270,270,100.00,0,5400,86.02,0.76');
    expect(report['persistence-summary.csv']).toContain('2,off,1080,1030,1080,95.37,50,2.21,270,1.35');
    expect(report['persistence-summary.csv']).toContain('3,on,1080,753,1080,69.72,327,4.79,270,0.51');
    expect(report['persistence-summary.csv']).toContain('5,on,1080,639,1080,59.17,441,6.60,270,0.19');
    expect(report['normalization-sensitivity.csv']).toContain('raw-calibration-std,normal,matched,on,54,1.56,3.89,,,,');
    expect(report['normalization-sensitivity.csv']).toContain('compensated-calibration-std,structural-anomaly,mismatched,on,216,2.19,10.95,84.12,216,216,100.00');

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    for (const [filename, csv] of Object.entries(report)) {
      await writeFile(resolve(outputDirectory, filename), csv, 'utf8');
    }
  });
});
