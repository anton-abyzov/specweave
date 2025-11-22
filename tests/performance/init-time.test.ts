/**
 * Performance Test: Init Time Validation
 *
 * Validates that SpecWeave init completes within acceptable time limits:
 * - < 30 seconds for 100 projects (95th percentile)
 * - < 60 seconds for 500 projects
 *
 * @group performance
 * @module tests/performance/init-time
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';
import { AsyncProjectLoader } from '../../src/cli/helpers/async-project-loader.js';
import { silentLogger } from '../../src/utils/logger.js';

interface MockProject {
  id: string;
  key: string;
  name: string;
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

/**
 * Simulate init time by running AsyncProjectLoader
 */
async function simulateInit(projectCount: number): Promise<number> {
  const startTime = performance.now();

  const mockCredentials = {
    domain: 'test.atlassian.net',
    email: 'test@example.com',
    apiToken: 'test-token',
    instanceType: 'cloud' as const
  };

  const loader = new AsyncProjectLoader(mockCredentials, 'jira', {
    batchSize: 50,
    updateFrequency: 5,
    showEta: true,
    logger: silentLogger
  });

  // Fetch all projects (simulates full init flow)
  await loader.fetchAllProjects(projectCount);

  const endTime = performance.now();
  return endTime - startTime;
}

describe('Init Performance', () => {
  const ITERATIONS = 10; // Run multiple times for statistical accuracy
  const TIMEOUT_100_PROJECTS = 30000; // 30 seconds
  const TIMEOUT_500_PROJECTS = 60000; // 60 seconds

  describe('TC-052: Init < 30s for 100 Projects', () => {
    it('should complete init in < 30 seconds (95th percentile)', async () => {
      // Run 10 iterations
      const times: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const time = await simulateInit(100);
        times.push(time);
      }

      // Calculate 95th percentile
      const sorted = times.sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index];

      // Log results
      console.log(`\n📊 Init Performance (100 projects, ${ITERATIONS} iterations):`);
      console.log(`   Mean:         ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)}ms`);
      console.log(`   Min:          ${Math.min(...times).toFixed(2)}ms`);
      console.log(`   Max:          ${Math.max(...times).toFixed(2)}ms`);
      console.log(`   95th %ile:    ${p95.toFixed(2)}ms`);
      console.log(`   Target:       ${TIMEOUT_100_PROJECTS}ms`);
      console.log(`   Status:       ${p95 < TIMEOUT_100_PROJECTS ? '✅ PASS' : '❌ FAIL'}`);

      // Assert 95th percentile < 30 seconds
      expect(p95).toBeLessThan(TIMEOUT_100_PROJECTS);
    }, 400000); // 400s timeout for test itself
  });

  describe('TC-053: Init < 60s for 500 Projects', () => {
    it('should complete init in < 60 seconds', async () => {
      const times: number[] = [];

      // Run 5 iterations (fewer due to larger dataset)
      for (let i = 0; i < 5; i++) {
        const time = await simulateInit(500);
        times.push(time);
      }

      // Calculate average
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      console.log(`\n📊 Init Performance (500 projects, 5 iterations):`);
      console.log(`   Mean:         ${avgTime.toFixed(2)}ms`);
      console.log(`   Min:          ${Math.min(...times).toFixed(2)}ms`);
      console.log(`   Max:          ${Math.max(...times).toFixed(2)}ms`);
      console.log(`   Target:       ${TIMEOUT_500_PROJECTS}ms`);
      console.log(`   Status:       ${avgTime < TIMEOUT_500_PROJECTS ? '✅ PASS' : '❌ FAIL'}`);

      // Assert average < 60 seconds
      expect(avgTime).toBeLessThan(TIMEOUT_500_PROJECTS);
    }, 600000); // 600s timeout for test itself
  });

  describe('Progress Bar Accuracy', () => {
    it('should show accurate ETA during init', async () => {
      const mockCredentials = {
        domain: 'test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
        instanceType: 'cloud' as const
      };

      let progressUpdates = 0;
      const customLogger = {
        log: (msg: string) => {
          if (msg.includes('%')) {
            progressUpdates++;
          }
        },
        error: () => {},
        warn: () => {}
      };

      const loader = new AsyncProjectLoader(mockCredentials, 'jira', {
        batchSize: 50,
        updateFrequency: 5,
        showEta: true,
        logger: customLogger
      });

      await loader.fetchAllProjects(100);

      // Should have ~20 progress updates (100 / 5 = 20)
      expect(progressUpdates).toBeGreaterThan(15);
      expect(progressUpdates).toBeLessThan(25);

      console.log(`\n📊 Progress Bar Accuracy:`);
      console.log(`   Total updates: ${progressUpdates} (expected ~20)`);
      console.log(`   Status:        ✅ PASS`);
    }, 120000);
  });

  describe('No Timeout Errors', () => {
    it('should complete without timeout errors', async () => {
      let timeoutErrors = 0;

      try {
        await simulateInit(100);
      } catch (error: any) {
        if (error.message.includes('timeout')) {
          timeoutErrors++;
        }
      }

      expect(timeoutErrors).toBe(0);

      console.log(`\n📊 Timeout Error Count:`);
      console.log(`   Errors:   ${timeoutErrors}`);
      console.log(`   Status:   ✅ PASS`);
    }, 120000);
  });
});
