export type SensorType =
  | 'accelerometer'
  | 'strain'
  | 'tilt'
  | 'displacement'
  | 'temperature';

export type Severity = 'normal' | 'watch' | 'elevated' | 'high';

export type ComponentType = 'deck' | 'beam' | 'pier' | 'foundation';

export interface Component {
  id: string;
  name: string;
  type: ComponentType;
}

export interface SensorConfig {
  id: string;
  type: SensorType;
  componentId: string;
  unit: string;
  baselineMean: number;
  baselineStd: number;
  variationAmplitude: number;
  frequency: number;
  noiseStd: number;
  temperatureCoefficient?: number;
}

export interface Measurement {
  timestamp: number;
  sensorId: string;
  value: number;
}

export interface SensorAnalysis {
  sensorId: string;
  componentId: string;
  latestValue: number;
  zScore: number;
  severity: Severity;
  reason: string;
}

export interface ComponentAssessment {
  componentId: string;
  score: number;
  severity: Severity;
  sensorAnalyses: SensorAnalysis[];
}

export type Scenario =
  | 'normal'
  | 'heavy-traffic'
  | 'increased-vibration'
  | 'temperature-change'
  | 'structural-anomaly'
  | 'sensor-failure';