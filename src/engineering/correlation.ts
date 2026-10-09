
import type {
  SensorAnalysis,
  Severity
} from './types';

export interface CrossSensorEvidence {
  componentId: string;
  available: boolean;
  sensorCount: number;
  abnormalSensorCount: number;
  corroborated: boolean;
  strongestSeverity: Severity;
  averageAbsoluteZScore: number;
}

const severityRank: Record<Severity, number> = {
  normal: 0,
  watch: 1,
  elevated: 2,
  high: 3
};

export function analyzeCrossSensorEvidence(
  analyses: SensorAnalysis[],
  componentId: string
): CrossSensorEvidence {
  const componentAnalyses = analyses.filter(
    (analysis) => analysis.componentId === componentId
  );

  if (componentAnalyses.length === 0) {
    return {
      componentId,
      available: false,
      sensorCount: 0,
      abnormalSensorCount: 0,
      corroborated: false,
      strongestSeverity: 'normal',
      averageAbsoluteZScore: 0
    };
  }

  const abnormalAnalyses = componentAnalyses.filter(
    (analysis) => analysis.severity !== 'normal'
  );

  const strongestSeverity = componentAnalyses.reduce<Severity>(
    (strongest, analysis) =>
      severityRank[analysis.severity] >
      severityRank[strongest]
        ? analysis.severity
        : strongest,
    'normal'
  );

  const averageAbsoluteZScore =
    componentAnalyses.reduce(
      (sum, analysis) => sum + Math.abs(analysis.zScore),
      0
    ) / componentAnalyses.length;

  return {
    componentId,
    available: true,
    sensorCount: componentAnalyses.length,
    abnormalSensorCount: abnormalAnalyses.length,
    corroborated:
      componentAnalyses.length >= 2 &&
      abnormalAnalyses.length >= 2,
    strongestSeverity,
    averageAbsoluteZScore
  };
}