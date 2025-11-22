/**
 * Stress Test: Zero Timeout Errors (100 Consecutive Runs)
 *
 * Validates reliability by running init 100 times consecutively
 * and ensuring zero timeout errors occur.
 *
 * @group stress
 * @module tests/integration/stress/timeout-errors
 */

import { describe, it, expect } from 'vitest';
import { AsyncProjectLoader } from '../../../src/cli/helpers/async-project-loader.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('TC-055: Zero Timeout Errors (100 Consecutive Runs)', () => {
  it('should complete 100 consecutive inits with zero timeout errors', async () => {
    const RUNS = 100;
    const PROJECT_COUNT = 100;

    let successfulRuns = 0;
    let timeoutErrors = 0;
    let otherErrors = 0;

    const mockCredentials = {
      domain: 'test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token',
      instanceType: 'cloud' as const
    };

    console.log(`\n🔄 Running ${RUNS} consecutive inits (${PROJECT_COUNT} projects each)...\n`);

    for (let i = 0; i < RUNS; i++) {
      try {
        const loader = new AsyncProjectLoader(mockCredentials, 'jira', {
          batchSize: 50,
          updateFrequency: 10, // Less frequent updates for speed
          showEta: false,
          logger: silentLogger
        });

        await loader.fetchAllProjects(PROJECT_COUNT);
        successfulRuns++;

        // Progress indicator every 10 runs
        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Completed ${i + 1}/${RUNS} runs`);
        }

      } catch (error: any) {
        if (error.message && error.message.toLowerCase().includes('timeout')) {
          timeoutErrors++;
          console.log(`   ❌ Timeout error on run ${i + 1}: ${error.message}`);
        } else {
          otherErrors++;
          console.log(`   ⚠️  Other error on run ${i + 1}: ${error.message}`);
        }
      }
    }

    // Results
    console.log(`\n📊 Stress Test Results:`);
    console.log(`   Total Runs:       ${RUNS}`);
    console.log(`   Successful:       ${successfulRuns} (${(successfulRuns / RUNS * 100).toFixed(1)}%)`);
    console.log(`   Timeout Errors:   ${timeoutErrors}`);
    console.log(`   Other Errors:     ${otherErrors}`);
    console.log(`   Status:           ${timeoutErrors === 0 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Assertions
    expect(timeoutErrors).toBe(0);
    expect(successfulRuns).toBeGreaterThanOrEqual(95); // Allow up to 5% other errors

  }, 900000); // 15 minute timeout for stress test
});

describe('Memory Leak Detection', () => {
  it('should not leak memory during consecutive runs', async () => {
    const RUNS = 50;
    const memorySnapshots: number[] = [];

    const mockCredentials = {
      domain: 'test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token',
      instanceType: 'cloud' as const
    };

    console.log(`\n🔍 Memory leak detection (${RUNS} runs)...\n`);

    for (let i = 0; i < RUNS; i++) {
      const loader = new AsyncProjectLoader(mockCredentials, 'jira', {
        batchSize: 50,
        logger: silentLogger
      });

      await loader.fetchAllProjects(50);

      // Take memory snapshot
      const memUsage = process.memoryUsage();
      memorySnapshots.push(memUsage.heapUsed);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      if ((i + 1) % 10 === 0) {
        const currentMem = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        console.log(`   Run ${i + 1}: ${currentMem} MB`);
      }
    }

    // Analyze memory trend
    const firstQuarter = memorySnapshots.slice(0, 13).reduce((a, b) => a + b, 0) / 13;
    const lastQuarter = memorySnapshots.slice(-13).reduce((a, b) => a + b, 0) / 13;
    const memoryIncrease = ((lastQuarter - firstQuarter) / firstQuarter) * 100;

    console.log(`\n📊 Memory Analysis:`);
    console.log(`   First quarter avg:  ${(firstQuarter / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Last quarter avg:   ${(lastQuarter / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Increase:           ${memoryIncrease.toFixed(2)}%`);
    console.log(`   Threshold:          < 50%`);
    console.log(`   Status:             ${memoryIncrease < 50 ? '✅ PASS' : '⚠️  WARNING'}\n`);

    // Memory increase should be < 50% (reasonable threshold)
    expect(memoryIncrease).toBeLessThan(50);

  }, 600000); // 10 minute timeout
});

describe('Concurrency Stress Test', () => {
  it('should handle concurrent init operations', async () => {
    const CONCURRENT_RUNS = 5;
    const PROJECT_COUNT = 20;

    const mockCredentials = {
      domain: 'test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token',
      instanceType: 'cloud' as const
    };

    console.log(`\n⚡ Concurrency test (${CONCURRENT_RUNS} parallel inits)...\n`);

    const promises = Array.from({ length: CONCURRENT_RUNS }, async (_, i) => {
      const loader = new AsyncProjectLoader(mockCredentials, 'jira', {
        batchSize: 50,
        logger: silentLogger
      });

      try {
        await loader.fetchAllProjects(PROJECT_COUNT);
        return { success: true, index: i };
      } catch (error) {
        return { success: false, index: i, error };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;

    console.log(`📊 Concurrency Results:`);
    console.log(`   Total:       ${CONCURRENT_RUNS}`);
    console.log(`   Successful:  ${successful}`);
    console.log(`   Failed:      ${CONCURRENT_RUNS - successful}`);
    console.log(`   Status:      ${successful === CONCURRENT_RUNS ? '✅ PASS' : '⚠️  PARTIAL'}\n`);

    // All concurrent runs should succeed
    expect(successful).toBe(CONCURRENT_RUNS);

  }, 120000);
});
