/**
 * Percentile Calculator
 *
 * Calculates Pth percentile of a dataset using linear interpolation
 * Used for P50 (median) and P90 calculations in DORA metrics
 */

/**
 * Calculate percentile value from array of numbers
 *
 * Uses linear interpolation method:
 * 1. Sort values ascending
 * 2. Calculate index: (P/100) * (n-1)
 * 3. If index is integer, return value at that index
 * 4. If index is fractional, interpolate between adjacent values
 *
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns Percentile value
 *
 * @example
 * calculatePercentile([1, 2, 3, 4, 5], 50) // Returns 3 (median)
 * calculatePercentile([1, 2, 3, 4, 5], 90) // Returns 4.6 (P90)
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  if (percentile < 0 || percentile > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }

  // Sort values ascending
  const sorted = [...values].sort((a, b) => a - b);

  // Calculate index
  const index = (percentile / 100) * (sorted.length - 1);

  // If index is integer, return exact value
  if (Number.isInteger(index)) {
    return sorted[index];
  }

  // Otherwise, interpolate between adjacent values
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const fraction = index - lowerIndex;

  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];

  return lowerValue + (upperValue - lowerValue) * fraction;
}
