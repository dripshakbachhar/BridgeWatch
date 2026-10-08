import type { Component, SensorConfig } from './types';

export const components: Component[] = [
  { id: 'DECK-01', name: 'Main Deck', type: 'deck' },
  { id: 'BEAM-01', name: 'Beam 01', type: 'beam' },
  { id: 'BEAM-02', name: 'Beam 02', type: 'beam' },
  { id: 'PIER-01', name: 'Pier 01', type: 'pier' },
  { id: 'PIER-02', name: 'Pier 02', type: 'pier' },
  { id: 'PIER-03', name: 'Pier 03', type: 'pier' },
  { id: 'FOUND-01', name: 'Foundation 01', type: 'foundation' }
];

export const sensors: SensorConfig[] = [
  {
    id: 'ACC-01', type: 'accelerometer', componentId: 'BEAM-01',
    unit: 'm/s²', baselineMean: 1.42, baselineStd: 0.17,
    variationAmplitude: 0.16, frequency: 0.15, noiseStd: 0.04
  },
  {
    id: 'ACC-02', type: 'accelerometer', componentId: 'PIER-02',
    unit: 'm/s²', baselineMean: 1.18, baselineStd: 0.14,
    variationAmplitude: 0.12, frequency: 0.12, noiseStd: 0.035
  },
  {
    id: 'ACC-03', type: 'accelerometer', componentId: 'PIER-03',
    unit: 'm/s²', baselineMean: 1.05, baselineStd: 0.13,
    variationAmplitude: 0.11, frequency: 0.10, noiseStd: 0.03
  },
  {
    id: 'STR-01', type: 'strain', componentId: 'BEAM-01',
    unit: 'με', baselineMean: 180, baselineStd: 22,
    variationAmplitude: 18, frequency: 0.08, noiseStd: 5
  },
  {
    id: 'STR-02', type: 'strain', componentId: 'BEAM-02',
    unit: 'με', baselineMean: 165, baselineStd: 20,
    variationAmplitude: 16, frequency: 0.07, noiseStd: 5
  },
  {
    id: 'TLT-01', type: 'tilt', componentId: 'PIER-02',
    unit: '°', baselineMean: 0.12, baselineStd: 0.03,
    variationAmplitude: 0.025, frequency: 0.06, noiseStd: 0.008
  },
  {
    id: 'DSP-01', type: 'displacement', componentId: 'DECK-01',
    unit: 'mm', baselineMean: 4.5, baselineStd: 0.7,
    variationAmplitude: 0.55, frequency: 0.05, noiseStd: 0.12
  },
  {
    id: 'TMP-01', type: 'temperature', componentId: 'DECK-01',
    unit: '°C', baselineMean: 22, baselineStd: 1.8,
    variationAmplitude: 1.6, frequency: 0.02, noiseStd: 0.18
  }
];
