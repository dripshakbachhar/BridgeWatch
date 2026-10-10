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


    const documentedMainRows = [
      'normal,matched,off,54,337,2160,6.24,15.60,,,,,,',
      'normal,matched,on,54,96,2160,1.78,4.44,,,,,,',
      'normal,mismatched,off,216,1348,8640,6.24,15.60,,,,,,',
      'normal,mismatched,on,216,1058,8640,4.90,12.25,,,,,,',
      'structural-anomaly,matched,off,54,139,1080,2.57,12.87,54,54,100.00,1080,98.89,',
      'structural-anomaly,matched,on,54,57,1080,1.06,5.28,54,54,100.00,1080,93.61,',
      'structural-anomaly,mismatched,off,216,556,4320,2.57,12.87,216,216,100.00,4320,98.89,',
      'structural-anomaly,mismatched,on,216,473,4320,2.19,10.95,216,216,100.00,4320,84.12,'
    ];
    for (const row of documentedMainRows) expect(report['main-summary.csv']).toContain(row);

    const documentedSeverityRows = [
      '0,negative-control,off,270,210,270,77.78,60,5400,18.33,3.10',
      '0,negative-control,on,270,164,270,60.74,106,5400,11.56,4.25',
      '0.5,injected-step,off,270,260,270,96.30,10,5400,37.31,1.88',
      '0.5,injected-step,on,270,179,270,66.30,91,5400,17.31,3.62',
      '1,injected-step,off,270,270,270,100.00,0,5400,61.11,0.76',
      '1,injected-step,on,270,222,270,82.22,48,5400,32.91,3.20',
      '1.5,injected-step,off,270,270,270,100.00,0,5400,81.20,0.19',
      '1.5,injected-step,on,270,254,270,94.07,16,5400,52.17,2.44',
      '2.5,injected-step,off,270,270,270,100.00,0,5400,98.89,0.00',
      '2.5,injected-step,on,270,270,270,100.00,0,5400,86.02,0.76'
    ];
    for (const row of documentedSeverityRows) expect(report['severity-summary.csv']).toContain(row);

    const documentedPersistenceRows = [
      '1,off,1080,1070,1080,99.07,10,0.70,270,2.28',
      '2,off,1080,1030,1080,95.37,50,2.21,270,1.35',
      '3,off,1080,1005,1080,93.06,75,3.21,270,0.80',
      '5,off,1080,930,1080,86.11,150,5.49,270,0.43',
      '1,on,1080,925,1080,85.65,155,2.36,270,2.09',
      '2,on,1080,811,1080,75.09,269,4.04,270,0.87',
      '3,on,1080,753,1080,69.72,327,4.79,270,0.51',
      '5,on,1080,639,1080,59.17,441,6.60,270,0.19'
    ];
    for (const row of documentedPersistenceRows) expect(report['persistence-summary.csv']).toContain(row);

    const documentedNormalizationRows = [
      'raw-calibration-std,normal,matched,off,54,6.24,15.60,,,,',
      'raw-calibration-std,normal,matched,on,54,1.56,3.89,,,,',
      'raw-calibration-std,normal,mismatched,off,216,6.24,15.60,,,,',
      'raw-calibration-std,normal,mismatched,on,216,5.38,13.45,,,,',
      'raw-calibration-std,structural-anomaly,matched,off,54,2.57,12.87,98.89,54,54,100.00',
      'raw-calibration-std,structural-anomaly,matched,on,54,0.91,4.54,92.50,54,54,100.00',
      'raw-calibration-std,structural-anomaly,mismatched,off,216,2.57,12.87,98.89,216,216,100.00',
      'raw-calibration-std,structural-anomaly,mismatched,on,216,2.42,12.11,85.95,216,216,100.00',
      'compensated-calibration-std,normal,matched,off,54,6.43,16.06,,,,',
      'compensated-calibration-std,normal,matched,on,54,1.78,4.44,,,,',
      'compensated-calibration-std,normal,mismatched,off,216,5.99,14.98,,,,',
      'compensated-calibration-std,normal,mismatched,on,216,4.90,12.25,,,,',
      'compensated-calibration-std,structural-anomaly,matched,off,54,2.69,13.43,99.07,54,54,100.00',
      'compensated-calibration-std,structural-anomaly,matched,on,54,1.06,5.28,93.61,54,54,100.00',
      'compensated-calibration-std,structural-anomaly,mismatched,off,216,2.45,12.25,98.43,216,216,100.00',
      'compensated-calibration-std,structural-anomaly,mismatched,on,216,2.19,10.95,84.12,216,216,100.00'
    ];
    for (const row of documentedNormalizationRows) {
      expect(report['normalization-sensitivity.csv']).toContain(row);
    }

    const outputDirectory = resolve(process.cwd(), 'reports', 'exp07');
    await mkdir(outputDirectory, { recursive: true });
    for (const [filename, csv] of Object.entries(report)) {
      await writeFile(resolve(outputDirectory, filename), csv, 'utf8');
    }
  });
});
