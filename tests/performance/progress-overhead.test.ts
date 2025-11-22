/**
 * Performance Test: Progress Tracking Overhead Validation
 *
 * Validates that progress tracking adds < 5% overhead to batch operations.
 *
 * Methodology:
 * 1. Measure baseline (batch import without progress tracking)
 * 2. Measure with progress tracking enabled
 * 3. Calculate overhead percentage
 * 4. Assert overhead < 5%
 *
 * @group performance
 * @module tests/performance/progress-overhead
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';
import { ProgressTracker } from '../../src/core/progress/progress-tracker.js';
import { silentLogger } from '../../src/utils/logger.js';

/**
 * Mock project structure for batch operations
 */
interface MockProject {
  id: string;
  key: string;
  name: string;
}

/**
 * Simulate batch import operation (CPU-intensive)
 */
async function simulateBatchImport(
  projects: MockProject[],
  withProgress: boolean = false
): Promise<number> {
  const startTime = performance.now();

  // Initialize progress tracker (if enabled)
  const tracker = withProgress
    ? new ProgressTracker({
        total: projects.length,
        label: 'Performance Test',
        showEta: false,
        updateFrequency: 5,
        logger: silentLogger
      })
    : null;

  // Simulate importing projects
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    // Simulate API call + processing (10ms per project)
    await simulateWork(10);

    // Update progress (if enabled)
    if (tracker) {
      tracker.update(project.key, 'success');
    }
  }

  // Finish progress tracking (if enabled)
  if (tracker) {
    tracker.finish(projects.length, 0, 0);
  }

  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Simulate asynchronous work (API call, processing)
 */
async function simulateWork(ms: number): Promise<void> {
  return new Promise((resolve) => {
    // Busy wait to simulate CPU work (more realistic than setTimeout)
    const start = performance.now();
    while (performance.now() - start < ms) {
      // Simulate some computation
      Math.sqrt(Math.random());
    }
    resolve();
  });
}

/**
 * Generate mock projects for testing
 */
function generateMockProjects(count: number): MockProject[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `project-${i}`,
    key: `PROJ-${i}`,
    name: `Project ${i}`
  }));
}

describe('Progress Tracking Performance Overhead', () => {
  const PROJECT_COUNTS = [50, 100, 200]; // Test with different batch sizes
  const OVERHEAD_THRESHOLD = 5.0; // 5% maximum overhead
  const ITERATIONS = 3; // Run multiple iterations for average

  PROJECT_COUNTS.forEach((count) => {
    describe(`with ${count} projects`, () => {
      let mockProjects: MockProject[];

      beforeEach(() => {
        mockProjects = generateMockProjects(count);
      });

      it('should have < 5% overhead compared to baseline', async () => {
        // TC-038: Progress Overhead Validation
        // Given: Importing projects with/without progress tracking
        // When: Measuring execution time
        // Then: Overhead should be < 5%

        // Run multiple iterations and average results (more accurate)
        const baselineTimes: number[] = [];
        const progressTimes: number[] = [];

        for (let i = 0; i < ITERATIONS; i++) {
          // Baseline: No progress tracking
          const baselineTime = await simulateBatchImport(mockProjects, false);
          baselineTimes.push(baselineTime);

          // With progress tracking
          const progressTime = await simulateBatchImport(mockProjects, true);
          progressTimes.push(progressTime);
        }

        // Calculate averages
        const avgBaseline = baselineTimes.reduce((a, b) => a + b, 0) / ITERATIONS;
        const avgProgress = progressTimes.reduce((a, b) => a + b, 0) / ITERATIONS;

        // Calculate overhead percentage
        const overhead = ((avgProgress - avgBaseline) / avgBaseline) * 100;

        // Validate overhead is within threshold
        expect(overhead).toBeLessThan(OVERHEAD_THRESHOLD);

        // Log results for visibility
        console.log(`\n📊 Performance Results (${count} projects, ${ITERATIONS} iterations):`);
        console.log(`   Baseline (avg):       ${avgBaseline.toFixed(2)}ms`);
        console.log(`   With Progress (avg):  ${avgProgress.toFixed(2)}ms`);
        console.log(`   Overhead:             ${overhead.toFixed(2)}%`);
        console.log(`   Threshold:            ${OVERHEAD_THRESHOLD}%`);
        console.log(`   Status:               ${overhead < OVERHEAD_THRESHOLD ? '✅ PASS' : '❌ FAIL'}`);
      });

      it('should maintain consistent performance across runs', async () => {
        // Validate that progress tracking performance is consistent
        // (no performance degradation over multiple runs)

        const times: number[] = [];

        for (let i = 0; i < ITERATIONS; i++) {
          const time = await simulateBatchImport(mockProjects, true);
          times.push(time);
        }

        // Calculate standard deviation
        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = (stdDev / mean) * 100;

        // Coefficient of variation should be < 15% (consistent performance)
        expect(coefficientOfVariation).toBeLessThan(15);

        console.log(`\n📊 Performance Consistency (${count} projects):`);
        console.log(`   Mean:                  ${mean.toFixed(2)}ms`);
        console.log(`   Std Dev:               ${stdDev.toFixed(2)}ms`);
        console.log(`   Coefficient of Var:    ${coefficientOfVariation.toFixed(2)}%`);
        console.log(`   Status:                ${coefficientOfVariation < 15 ? '✅ CONSISTENT' : '⚠️  VARIABLE'}`);
      });
    });
  });

  it('should scale linearly with project count', async () => {
    // Validate that overhead doesn't compound (linear scaling)
    // Overhead for 200 projects should be similar to 50 projects

    const results: Array<{ count: number; overhead: number }> = [];

    for (const count of PROJECT_COUNTS) {
      const projects = generateMockProjects(count);

      const baselineTime = await simulateBatchImport(projects, false);
      const progressTime = await simulateBatchImport(projects, true);

      const overhead = ((progressTime - baselineTime) / baselineTime) * 100;
      results.push({ count, overhead });
    }

    // Calculate overhead variation across sizes
    const overheads = results.map(r => r.overhead);
    const avgOverhead = overheads.reduce((a, b) => a + b, 0) / overheads.length;
    const maxDeviation = Math.max(...overheads.map(o => Math.abs(o - avgOverhead)));

    // Max deviation should be < 3% (linear scaling)
    expect(maxDeviation).toBeLessThan(3);

    console.log('\n📊 Scalability Analysis:');
    results.forEach(r => {
      console.log(`   ${r.count} projects: ${r.overhead.toFixed(2)}% overhead`);
    });
    console.log(`   Average Overhead:      ${avgOverhead.toFixed(2)}%`);
    console.log(`   Max Deviation:         ${maxDeviation.toFixed(2)}%`);
    console.log(`   Status:                ${maxDeviation < 3 ? '✅ LINEAR' : '⚠️  NON-LINEAR'}`);
  });
});
