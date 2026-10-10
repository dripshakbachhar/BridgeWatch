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
    const report = buildExp07CsvReport(baseline, sweep);
    expect(report).toEqual(buildExp07CsvReport(
      runEnvironmentalCompensationExperiment([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40),
      runEnvironmentalAnomalySeveritySweep([1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40, [0, 0.5, 1, 1.5, 2.5], 'pipeline-default', [1, 2, 3, 5])
    ));
    expect(report['main-summary.csv'].split('\r\n')).toHaveLength(10);
    expect(report['severity-summary.csv'].split('\r\n')).toHaveLength(12);
    expect(report['persistence-summary.csv'].split('\r\n')).toHaveLength(10);
    expect(report['metadata.csv']).toContain('calibration_points_per_case,30');
    expect(report['main-summary.csv']).toContain('false_alarm_denominator');
    expect(report['severity-summary.csv']).toContain('post_onset_sample_denominator');
    expect(report['persistence-summary.csv']).toContain('detection_denominator');
    expect(report['severity-summary.csv']).toContain('2.5,injected-step,off,270,270,270,100.00,0,5400,98.89,0.00');
    expect(report['persistence-summary.csv']).toContain('1,off,1080,1070,1080,99.07,10,0.70,270,2.28');

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    for (const [filename, csv] of Object.entries(report)) {
      await writeFile(resolve(outputDirectory, filename), csv, 'utf8');
    }
  });
});
