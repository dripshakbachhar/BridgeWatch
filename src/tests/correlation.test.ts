import { describe, expect, it } from 'vitest';
import { analyzeCrossSensorEvidence } from '../engineering/correlation';
import type { SensorAnalysis } from '../engineering/types';

function analysis(
  sensorId: string,
  zScore: number,
  severity: SensorAnalysis['severity']
): SensorAnalysis {
  return {
    sensorId,
    componentId: 'PIER-02',
    latestValue: 0,
    zScore,
    severity,
    reason: 'Test analysis'
  };
}

describe('analyzeCrossSensorEvidence', () => {
  it('detects corroboration when multiple sensors are abnormal', () => {
    const analyses = [
      analysis('ACC-02', 3.2, 'high'),
      analysis('TLT-01', 2.7, 'elevated')
    ];

    const result = analyzeCrossSensorEvidence(
      analyses,
      'PIER-02'
    );

    expect(result.sensorCount).toBe(2);
    expect(result.abnormalSensorCount).toBe(2);
    expect(result.corroborated).toBe(true);
    expect(result.strongestSeverity).toBe('high');
    expect(result.averageAbsoluteZScore).toBeCloseTo(2.95);
  });

  it('does not call one abnormal sensor corroborated evidence', () => {
    const analyses = [
      analysis('ACC-02', 3.2, 'high'),
      analysis('TLT-01', 0.4, 'normal')
    ];

    const result = analyzeCrossSensorEvidence(
      analyses,
      'PIER-02'
    );

    expect(result.sensorCount).toBe(2);
    expect(result.abnormalSensorCount).toBe(1);
    expect(result.corroborated).toBe(false);
  });

  it('handles components with a single sensor', () => {
    const analyses = [
      {
        ...analysis('DSP-01', 2.4, 'elevated'),
        componentId: 'DECK-01'
      }
    ];

    const result = analyzeCrossSensorEvidence(
      analyses,
      'DECK-01'
    );

    expect(result.sensorCount).toBe(1);
    expect(result.abnormalSensorCount).toBe(1);
    expect(result.corroborated).toBe(false);
  });

  it('rejects an unknown component', () => {
    expect(() =>
      analyzeCrossSensorEvidence([], 'PIER-99')
    ).toThrow(
      'No sensor analyses found for PIER-99.'
    );
  });
});