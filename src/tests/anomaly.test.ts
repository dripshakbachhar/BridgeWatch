import { describe, expect, it } from 'vitest';
import { calculateZScore, classifyZScore } from '../engineering/anomaly';

describe('anomaly analysis', () => {
  it('calculates a standard z-score', () => {
    expect(calculateZScore(2.14, 1.42, 0.17)).toBeCloseTo(4.2353, 3);
  });

  it('classifies deviations by magnitude', () => {
    expect(classifyZScore(0.8)).toBe('normal');
    expect(classifyZScore(1.7)).toBe('watch');
    expect(classifyZScore(2.2)).toBe('elevated');
    expect(classifyZScore(-3.4)).toBe('high');
  });
});
