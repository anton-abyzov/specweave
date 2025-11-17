/**
 * Integration Tests: CI/CD State Persistence
 *
 * Tests state persistence across application restarts and
 * handling of large state files.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { StateManager } from '../../src/core/cicd/state-manager';
import { CICDMonitorState, FailureRecord } from '../../src/core/cicd/types';

describe('State Persistence (Integration)', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for testing
    testDir = path.join(__dirname, '../../tmp', `test-integration-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  /**
   * Test: State persists across application restarts
   */
  test('testStatePersistsAcrossRestarts: State survives process restart', async () => {
    // Simulate first application instance
    const stateManager1 = new StateManager(testDir);

    // Add failures
    await stateManager1.addFailure({
      runId: 1001,
      workflowName: 'Build',
      commitSha: 'def456',
      branch: 'develop',
      detectedAt: '2025-11-12T13:00:00Z',
      processed: false,
      analyzed: false,
      fixed: false,
      url: 'https://github.com/test/repo/actions/runs/1001'
    });

    await stateManager1.addFailure({
      runId: 1002,
      workflowName: 'Test',
      commitSha: 'ghi789',
      branch: 'feature/auth',
      detectedAt: '2025-11-12T13:05:00Z',
      processed: false,
      analyzed: false,
      fixed: false,
      url: 'https://github.com/test/repo/actions/runs/1002'
    });

    // Update last poll
    await stateManager1.updateLastPoll();

    // Get state before "restart"
    const stateBefore = await stateManager1.loadState();
    expect(stateBefore.totalFailures).toBe(2);

    // Simulate application restart - create NEW state manager instance
    const stateManager2 = new StateManager(testDir);

    // Load state from disk (should persist)
    const stateAfter = await stateManager2.loadState();

    // Verify state persisted
    expect(stateAfter.totalFailures).toBe(2);
    expect(stateAfter.lastPoll).toBe(stateBefore.lastPoll);
    expect(stateAfter.failures[1001]).toBeDefined();
    expect(stateAfter.failures[1002]).toBeDefined();
    expect(stateAfter.failures[1001].workflowName).toBe('Build');
    expect(stateAfter.failures[1002].workflowName).toBe('Test');
  });

  /**
   * Test: Handle large state files (1000+ workflow runs)
   */
  test('testHandlesLargeState: 1000+ workflow runs stored', async () => {
    const stateManager = new StateManager(testDir);

    // Add 1000 failures
    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      await stateManager.addFailure({
        runId: 5000 + i,
        workflowName: `Workflow ${i % 10}`, // 10 different workflow names
        commitSha: `sha${i.toString().padStart(6, '0')}`,
        branch: i % 5 === 0 ? 'main' : `feature/branch-${i}`,
        detectedAt: new Date(Date.now() - i * 60000).toISOString(), // Spread over time
        processed: i % 3 === 0, // 1/3 processed
        analyzed: i % 4 === 0, // 1/4 analyzed
        fixed: i % 10 === 0, // 1/10 fixed
        url: `https://github.com/test/repo/actions/runs/${5000 + i}`
      });
    }

    const addTime = Date.now() - startTime;
    console.log(`Added 1000 failures in ${addTime}ms`);

    // Load state
    const loadStartTime = Date.now();
    const state = await stateManager.loadState();
    const loadTime = Date.now() - loadStartTime;

    console.log(`Loaded state with 1000 failures in ${loadTime}ms`);

    // Verify all failures stored
    expect(state.totalFailures).toBe(1000);
    expect(Object.keys(state.failures).length).toBe(1000);

    // Verify first and last
    expect(state.failures[5000]).toBeDefined();
    expect(state.failures[5999]).toBeDefined();

    // Verify processed counts
    const processedCount = Object.values(state.failures).filter(
      (f) => f.processed
    ).length;
    expect(processedCount).toBeGreaterThan(300); // ~333 expected

    // Performance check: Load should be fast (<100ms for 1000 records)
    expect(loadTime).toBeLessThan(100);

    // Get unprocessed failures
    const unprocessed = await stateManager.getUnprocessedFailures();
    expect(unprocessed.length).toBeGreaterThan(600); // ~666 expected
  });
});
