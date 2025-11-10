/**
 * Performance benchmarking utilities for SpecWeave tests
 */

export interface BenchmarkResult {
  /** Average execution time in milliseconds */
  avg: number;
  /** Minimum execution time in milliseconds */
  min: number;
  /** Maximum execution time in milliseconds */
  max: number;
  /** Total execution time in milliseconds */
  total: number;
  /** Number of iterations */
  iterations: number;
  /** Standard deviation */
  stdDev: number;
  /** Median execution time */
  median: number;
}

export interface MemoryUsage {
  /** Heap memory used in bytes */
  heapUsed: number;
  /** Total heap memory in bytes */
  heapTotal: number;
  /** External memory in bytes */
  external: number;
  /** Array buffers in bytes */
  arrayBuffers: number;
  /** Resident Set Size in bytes */
  rss: number;
}

/**
 * Measure the execution time of a function
 * @param fn Function to measure
 * @returns Result and execution time in milliseconds
 */
export async function measureExecutionTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; time: number }> {
  const startTime = performance.now();
  const result = await Promise.resolve(fn());
  const endTime = performance.now();
  const time = endTime - startTime;

  return { result, time };
}

/**
 * Get current memory usage
 * @returns Memory usage statistics
 */
export function measureMemoryUsage(): MemoryUsage {
  const usage = process.memoryUsage();

  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
    rss: usage.rss,
  };
}

/**
 * Benchmark a function by running it multiple times
 * @param fn Function to benchmark
 * @param iterations Number of times to run the function
 * @returns Benchmark statistics
 */
export async function benchmark(
  fn: () => void | Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warm-up run (not counted)
  await Promise.resolve(fn());

  // Actual benchmark runs
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    await Promise.resolve(fn());
    const endTime = performance.now();
    times.push(endTime - startTime);
  }

  // Calculate statistics
  const total = times.reduce((sum, time) => sum + time, 0);
  const avg = total / iterations;
  const min = Math.min(...times);
  const max = Math.max(...times);

  // Calculate standard deviation
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / iterations;
  const stdDev = Math.sqrt(variance);

  // Calculate median
  const sorted = [...times].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return {
    avg,
    min,
    max,
    total,
    iterations,
    stdDev,
    median,
  };
}

/**
 * Benchmark memory usage of a function
 * @param fn Function to measure
 * @returns Memory usage before and after, and the difference
 */
export async function benchmarkMemory<T>(
  fn: () => T | Promise<T>
): Promise<{
  before: MemoryUsage;
  after: MemoryUsage;
  diff: MemoryUsage;
  result: T;
}> {
  // Force garbage collection if available (requires --expose-gc flag)
  if (global.gc) {
    global.gc();
  }

  const before = measureMemoryUsage();
  const result = await Promise.resolve(fn());
  const after = measureMemoryUsage();

  const diff = {
    heapUsed: after.heapUsed - before.heapUsed,
    heapTotal: after.heapTotal - before.heapTotal,
    external: after.external - before.external,
    arrayBuffers: after.arrayBuffers - before.arrayBuffers,
    rss: after.rss - before.rss,
  };

  return { before, after, diff, result };
}

/**
 * Format bytes to human-readable string
 * @param bytes Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format time to human-readable string
 * @param ms Time in milliseconds
 * @returns Formatted string (e.g., "1.5s" or "150ms")
 */
export function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Print benchmark results to console
 * @param name Name of the benchmark
 * @param result Benchmark result
 */
export function printBenchmarkResults(name: string, result: BenchmarkResult): void {
  console.log(`\n📊 Benchmark: ${name}`);
  console.log(`  Iterations: ${result.iterations}`);
  console.log(`  Average:    ${formatTime(result.avg)}`);
  console.log(`  Median:     ${formatTime(result.median)}`);
  console.log(`  Min:        ${formatTime(result.min)}`);
  console.log(`  Max:        ${formatTime(result.max)}`);
  console.log(`  Std Dev:    ${formatTime(result.stdDev)}`);
  console.log(`  Total:      ${formatTime(result.total)}`);
}

/**
 * Assert that a benchmark meets performance requirements
 * @param result Benchmark result
 * @param maxAvg Maximum acceptable average time in milliseconds
 * @param maxMax Maximum acceptable worst-case time in milliseconds
 * @throws Error if performance requirements are not met
 */
export function assertPerformance(
  result: BenchmarkResult,
  maxAvg: number,
  maxMax?: number
): void {
  if (result.avg > maxAvg) {
    throw new Error(
      `Performance requirement not met: avg ${formatTime(result.avg)} exceeds ${formatTime(maxAvg)}`
    );
  }

  if (maxMax && result.max > maxMax) {
    throw new Error(
      `Performance requirement not met: max ${formatTime(result.max)} exceeds ${formatTime(maxMax)}`
    );
  }
}
