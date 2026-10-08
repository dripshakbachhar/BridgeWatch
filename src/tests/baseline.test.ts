import { describe, expect, it } from 'vitest';
import { calculateMean, calculateStandardDeviation, summarize } from '../engineering/baseline';

describe('baseline statistics', () => {
  it('calculates the arithmetic mean', () => {
    expect(calculateMean([1, 2, 3, 4])).toBe(2.5);
  });

  it('calculates sample standard deviation', () => {
    expect(calculateStandardDeviation([1, 2, 3, 4])).toBeCloseTo(1.29099, 4);
  });

  it('returns a useful summary', () => {
    expect(summarize([2, 5, 3])).toMatchObject({ mean: 10 / 3, minimum: 2, maximum: 5 });
  });
});
