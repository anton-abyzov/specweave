/**
 * Unit Tests: CI/CD State Manager
 *
 * Tests state management functionality for workflow monitoring,
 * including state persistence, locking, and deduplication.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { StateManager } from '../../../src/core/cicd/state-manager';
import {
  CICDMonitorState,
  DEFAULT_STATE,
  FailureRecord
} from '../../../src/core/cicd/types';

describe('StateManager', () => {
  let testDir: string;
  let stateManager: StateManager;

  beforeEach(async () => {
    // Create temp directory for testing
    testDir = path.join(__dirname, '../../tmp', `test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Create state manager for test directory
    stateManager = new StateManager(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  /**
   * Test: Save workflow state to JSON file
   */
  test('testSaveWorkflowState: Saves state to JSON file', async () => {
    const state: CICDMonitorState = {
      ...DEFAULT_STATE,
      lastPoll: '2025-11-12T10:00:00Z',
      totalFailures: 3
    };

    await stateManager.saveState(state);

    // Verify file exists
    const statePath = path.join(testDir, '.specweave/state/cicd-monitor.json');
    expect(await fs.pathExists(statePath)).toBe(true);

    // Verify content
    const content = await fs.readFile(statePath, 'utf-8');
    const saved = JSON.parse(content);
    expect(saved.lastPoll).toBe('2025-11-12T10:00:00Z');
    expect(saved.totalFailures).toBe(3);
  });

  /**
   * Test: Load workflow state from JSON file
   */
  test('testLoadWorkflowState: Loads state from JSON file', async () => {
    // Create state file manually
    const statePath = path.join(testDir, '.specweave/state/cicd-monitor.json');
    await fs.ensureDir(path.dirname(statePath));

    const testState: CICDMonitorState = {
      ...DEFAULT_STATE,
      lastPoll: '2025-11-12T11:00:00Z',
      totalProcessed: 5
    };

    await fs.writeFile(statePath, JSON.stringify(testState, null, 2));

    // Load via state manager
    const loaded = await stateManager.loadState();

    expect(loaded.lastPoll).toBe('2025-11-12T11:00:00Z');
    expect(loaded.totalProcessed).toBe(5);
  });

  /**
   * Test: Create state file if missing
   */
  test('testCreateStateFileIfMissing: Creates .specweave/state/ directory', async () => {
    // Ensure directory doesn't exist
    const stateDir = path.join(testDir, '.specweave/state');
    expect(await fs.pathExists(stateDir)).toBe(false);

    // Load state (should create directory and default state)
    const state = await stateManager.loadState();

    // Verify directory created
    expect(await fs.pathExists(stateDir)).toBe(true);

    // Verify default state
    expect(state.lastPoll).toBeNull();
    expect(state.totalFailures).toBe(0);
  });

  /**
   * Test: Handle concurrent writes without corruption
   */
  test('testHandleConcurrentWrites: Uses file locking to prevent corruption', async () => {
    // Simulate concurrent writes
    const writes = Array.from({ length: 10 }, (_, i) =>
      stateManager.addFailure({
        runId: 1000 + i,
        workflowName: `Test Workflow ${i}`,
        commitSha: `abc123${i}`,
        branch: 'main',
        detectedAt: new Date().toISOString(),
        processed: false,
        analyzed: false,
        fixed: false,
        url: `https://github.com/test/repo/actions/runs/${1000 + i}`
      })
    );

    // Execute all writes in parallel
    await Promise.all(writes);

    // Load state and verify all failures recorded
    const state = await stateManager.loadState();
    expect(state.totalFailures).toBe(10);
    expect(Object.keys(state.failures).length).toBe(10);

    // Verify each failure exists
    for (let i = 0; i < 10; i++) {
      expect(state.failures[1000 + i]).toBeDefined();
      expect(state.failures[1000 + i].workflowName).toBe(`Test Workflow ${i}`);
    }
  });

  /**
   * Test: Mark failure as processed (deduplication)
   */
  test('testMarkFailureProcessed: Deduplicates failures', async () => {
    // Add failure
    await stateManager.addFailure({
      runId: 12345,
      workflowName: 'CI',
      commitSha: 'abc123',
      branch: 'main',
      detectedAt: '2025-11-12T12:00:00Z',
      processed: false,
      analyzed: false,
      fixed: false,
      url: 'https://github.com/test/repo/actions/runs/12345'
    });

    // Mark as processed
    await stateManager.markProcessed(12345);

    // Verify processed flag
    const state = await stateManager.loadState();
    expect(state.failures[12345].processed).toBe(true);
    expect(state.totalProcessed).toBe(1);
  });

  /**
   * Test: Get last poll timestamp
   */
  test('testGetLastPoll: Returns last poll timestamp', async () => {
    // Initially null
    let lastPoll = await stateManager.getLastPoll();
    expect(lastPoll).toBeNull();

    // Update last poll
    await stateManager.updateLastPoll();

    // Verify updated
    lastPoll = await stateManager.getLastPoll();
    expect(lastPoll).not.toBeNull();

    // Verify ISO 8601 format
    const date = new Date(lastPoll!);
    expect(date.toISOString()).toBe(lastPoll);
  });
});
