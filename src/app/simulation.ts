import { analyzeSensor, assessComponent } from '../engineering/anomaly';
import { generateMeasurements } from '../engineering/generator';
import { components, sensors } from '../engineering/sensorConfig';
import type {
  ComponentAssessment,
  Scenario,
  SensorAnalysis
} from '../engineering/types';

export interface SimulationResult {
  analyses: SensorAnalysis[];
  assessments: ComponentAssessment[];
}

export interface SimulationOptions {
  points?: number;
  seed?: number;
}

export function runSimulation(
  scenario: Scenario,
  options: SimulationOptions = {}
): SimulationResult {
  const points = options.points ?? 100;
  const seed = options.seed ?? 7;

  const analyses = sensors.map((sensor) => {
    const measurements = generateMeasurements(sensor, scenario, {
      points,
      seed
    });

    return analyzeSensor(sensor, measurements);
  });

  const assessments = components
    .filter((component) =>
      sensors.some((sensor) => sensor.componentId === component.id)
    )
    .map((component) => assessComponent(analyses, component.id))
    .sort((a, b) => b.score - a.score);

  return {
    analyses,
    assessments
  };
}