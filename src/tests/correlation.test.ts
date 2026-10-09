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

    const result = analyzeCrossSensorEvidence(analyses, 'PIER-02');

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

    const result = analyzeCrossSensorEvidence(analyses, 'PIER-02');

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

    const result = analyzeCrossSensorEvidence(analyses, 'DECK-01');

    expect(result.sensorCount).toBe(1);
    expect(result.abnormalSensorCount).toBe(1);
    expect(result.corroborated).toBe(false);
  });

  it('returns empty evidence when no sensor analyses exist', () => {
    const result = analyzeCrossSensorEvidence([], 'PIER-99');

    expect(result.componentId).toBe('PIER-99');
    expect(result.available).toBe(false);
    expect(result.sensorCount).toBe(0);
    expect(result.abnormalSensorCount).toBe(0);
    expect(result.corroborated).toBe(false);
    expect(result.strongestSeverity).toBe('normal');
    expect(result.averageAbsoluteZScore).toBe(0);
  });
});
