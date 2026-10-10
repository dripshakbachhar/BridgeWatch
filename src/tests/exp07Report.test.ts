import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildExp07CsvReport } from '../engineering/exp07Report';
import {
  runEnvironmentalAnomalySeveritySweep,
  runEnvironmentalCompensationExperiment
} from '../engineering/experiments';

describe('EXP-07 CSV report export', () => {
  test('exports deterministic tables with explicit denominators and configuration metadata', async () => {
    const baseline = runEnvironmentalCompensationExperiment(
      [1.5, 2, 3],
      [4, 8, 12],
      [0, 4, 8, 12, 16],
      [7, 17, 27],
      30,
      40
    );
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

    const report = buildExp07CsvReport(baseline, sweep);
    const repeated = buildExp07CsvReport(
      runEnvironmentalCompensationExperiment(
        [1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40
      ),
      runEnvironmentalAnomalySeveritySweep(
        [1.5, 2, 3], [4, 8, 12], [0, 4, 8, 12, 16], [7, 17, 27], 30, 40,
        [0, 0.5, 1, 1.5, 2.5], 'pipeline-default', [1, 2, 3, 5]
      )
    );

    expect(report).toEqual(repeated);
    expect(report['main-summary.csv'].split('\r\n')).toHaveLength(11);
    expect(report['severity-summary.csv'].split('\r\n')).toHaveLength(11);
    expect(report['persistence-summary.csv'].split('\r\n')).toHaveLength(9);
    expect(report['metadata.csv']).toContain('calibration_points_per_case,30');
    expect(report['metadata.csv']).toContain('evaluation_points_per_case,40');
    expect(report['metadata.csv']).toContain('generated_at,');
    expect(report['main-summary.csv']).toContain('false_alarm_denominator');
    expect(report['severity-summary.csv']).toContain('post_onset_sample_denominator');
    expect(report['persistence-summary.csv']).toContain('detection_denominator');

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    await Promise.all(
      Object.entries(report).map(([filename, csv]) =>
        writeFile(resolve(outputDirectory, filename), csv, 'utf8')
      )
    );
  });
});
