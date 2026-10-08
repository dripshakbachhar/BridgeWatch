export interface SummaryStatistics {
  mean: number;
  standardDeviation: number;
  minimum: number;
  maximum: number;
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) throw new Error('Cannot calculate mean of an empty array.');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) throw new Error('At least two values are required.');
  const mean = calculateMean(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function summarize(values: number[]): SummaryStatistics {
  if (values.length === 0) throw new Error('Cannot summarize an empty array.');
  return {
    mean: calculateMean(values),
    standardDeviation: calculateStandardDeviation(values),
    minimum: Math.min(...values),
    maximum: Math.max(...values)
  };
}
