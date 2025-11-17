import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: Workflow Monitor
 *
 * Tests polling logic, failure detection, rate limiting, and deduplication.
 */

import { WorkflowMonitor } from '../../../src/core/cicd/workflow-monitor.js';
import { StateManager } from '../../../src/core/cicd/state-manager.js';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock Octokit
vi.mock('@octokit/rest');

describe('WorkflowMonitor', () => {
  let testDir: string;
  let stateManager: StateManager;
  let monitor: WorkflowMonitor;

  beforeEach(async () => {
    // Create temp directory
    testDir = path.join(__dirname, '../../tmp', `test-monitor-${Date.now()}`);
    await fs.ensureDir(testDir);

    stateManager = new StateManager(testDir);

    monitor = new WorkflowMonitor(
      {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo',
        pollInterval: 100, // Fast polling for tests
        debug: false
      },
      stateManager
    );
  });

  afterEach(async () => {
    // Stop monitor
    monitor.stop();

    // Clean up
    await fs.remove(testDir);
  });

  /**
   * Test: Polls every 60 seconds (using setInterval)
   */
  test('testPollsEvery60Seconds: Uses setInterval(60000)', () => {
    // Mock setInterval
    jest.useFakeTimers();

    // Start monitor
    monitor.start();

    // Verify monitor is running
    expect(monitor.isRunning()).toBe(true);

    // Verify setInterval called with 100ms (test config)
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 100);

    // Stop monitor
    monitor.stop();

    jest.useRealTimers();
  });

  /**
   * Test: Detects failed runs (filters status=completed, conclusion=failure)
   */
  test('testDetectsFailedRuns: Filters status=completed, conclusion=failure', async () => {
    // Mock Octokit response with mixed runs
    const mockRuns = [
      {
        id: 1001,
        name: 'CI',
        run_number: 42,
        head_sha: 'abc123',
        head_branch: 'main',
        status: 'completed',
        conclusion: 'failure', // Failed!
        html_url: 'https://github.com/test/repo/actions/runs/1001',
        created_at: '2025-11-12T10:00:00Z',
        updated_at: '2025-11-12T10:05:00Z'
      },
      {
        id: 1002,
        name: 'Test',
        run_number: 43,
        head_sha: 'def456',
        head_branch: 'develop',
        status: 'completed',
        conclusion: 'success', // Success (ignored)
        html_url: 'https://github.com/test/repo/actions/runs/1002',
        created_at: '2025-11-12T10:10:00Z',
        updated_at: '2025-11-12T10:15:00Z'
      },
      {
        id: 1003,
        name: 'Deploy',
        run_number: 44,
        head_sha: 'ghi789',
        head_branch: 'main',
        status: 'in_progress',
        conclusion: null, // Still running (ignored)
        html_url: 'https://github.com/test/repo/actions/runs/1003',
        created_at: '2025-11-12T10:20:00Z',
        updated_at: '2025-11-12T10:25:00Z'
      }
    ];

    // Mock Octokit
    const mockListWorkflowRuns = vi.fn().mockResolvedValue({
      data: { workflow_runs: mockRuns },
      status: 200,
      headers: {
        'x-ratelimit-remaining': '5000',
        'last-modified': new Date().toUTCString()
      }
    });

    (monitor as any).octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRuns
        }
      }
    };

    // Poll
    const result = await monitor.poll();

    // Verify only failure detected
    expect(result.newFailures).toBe(1);
    expect(result.totalRuns).toBe(3);

    // Verify failure stored
    const state = await stateManager.loadState();
    expect(state.failures[1001]).toBeDefined();
    expect(state.failures[1001].workflowName).toBe('CI');
    expect(state.failures[1002]).toBeUndefined(); // Success (not stored)
    expect(state.failures[1003]).toBeUndefined(); // In progress (not stored)
  });

  /**
   * Test: Uses conditional requests (If-Modified-Since header)
   */
  test('testUsesConditionalRequests: Sends If-Modified-Since header', async () => {
    // First poll (no If-Modified-Since)
    const mockListWorkflowRuns = vi.fn().mockResolvedValue({
      data: { workflow_runs: [] },
      status: 200,
      headers: {
        'x-ratelimit-remaining': '5000',
        'last-modified': 'Mon, 12 Nov 2025 10:00:00 GMT'
      }
    });

    (monitor as any).octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRuns
        }
      }
    };

    await monitor.poll();

    // Verify first call had no If-Modified-Since
    expect(mockListWorkflowRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'If-Modified-Since': expect.any(String)
        })
      })
    );

    // Second poll (should have If-Modified-Since)
    mockListWorkflowRuns.mockClear();

    await monitor.poll();

    // Verify second call has If-Modified-Since
    expect(mockListWorkflowRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'If-Modified-Since': 'Mon, 12 Nov 2025 10:00:00 GMT'
        })
      })
    );
  });

  /**
   * Test: Handles rate limiting (429 response with exponential backoff)
   */
  test('testHandlesRateLimiting: Exponential backoff on 429 response', async () => {
    // Mock 429 response, then success
    const mockListWorkflowRuns = jest
      .fn()
      .mockRejectedValueOnce({
        status: 429,
        message: 'Rate limit exceeded',
        response: {
          headers: {
            'retry-after': '2' // 2 seconds
          }
        }
      })
      .mockResolvedValueOnce({
        data: { workflow_runs: [] },
        status: 200,
        headers: {
          'x-ratelimit-remaining': '1',
          'last-modified': new Date().toUTCString()
        }
      });

    (monitor as any).octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRuns
        }
      }
    };

    // Poll (should retry after 429)
    const startTime = Date.now();
    const result = await monitor.poll();
    const elapsed = Date.now() - startTime;

    // Verify retried after ~2 seconds
    expect(elapsed).toBeGreaterThanOrEqual(1900); // Allow 100ms tolerance
    expect(result.statusCode).toBe(200);
    expect(mockListWorkflowRuns).toHaveBeenCalledTimes(2);
  });

  /**
   * Test: Deduplicates failures (doesn't reprocess same run)
   */
  test('testDeduplicatesFailures: Does not reprocess same run', async () => {
    const mockRun = {
      id: 2001,
      name: 'Build',
      run_number: 100,
      head_sha: 'xyz789',
      head_branch: 'main',
      status: 'completed',
      conclusion: 'failure',
      html_url: 'https://github.com/test/repo/actions/runs/2001',
      created_at: '2025-11-12T11:00:00Z',
      updated_at: '2025-11-12T11:05:00Z'
    };

    const mockListWorkflowRuns = vi.fn().mockResolvedValue({
      data: { workflow_runs: [mockRun] },
      status: 200,
      headers: {
        'x-ratelimit-remaining': '5000',
        'last-modified': new Date().toUTCString()
      }
    });

    (monitor as any).octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRuns
        }
      }
    };

    // First poll (new failure)
    const result1 = await monitor.poll();
    expect(result1.newFailures).toBe(1);
    expect(result1.duplicates).toBe(0);

    // Second poll (duplicate)
    const result2 = await monitor.poll();
    expect(result2.newFailures).toBe(0);
    expect(result2.duplicates).toBe(1);
  });

  /**
   * Test: Extracts workflow metadata (ID, name, commit, timestamp)
   */
  test('testExtractsWorkflowMetadata: Parses run ID, name, commit, timestamp', async () => {
    const mockRun = {
      id: 3001,
      name: 'E2E Tests',
      run_number: 200,
      head_sha: 'commit-sha-123',
      head_branch: 'feature/new-feature',
      status: 'completed',
      conclusion: 'failure',
      html_url: 'https://github.com/test/repo/actions/runs/3001',
      created_at: '2025-11-12T12:00:00Z',
      updated_at: '2025-11-12T12:10:00Z'
    };

    const mockListWorkflowRuns = vi.fn().mockResolvedValue({
      data: { workflow_runs: [mockRun] },
      status: 200,
      headers: {
        'x-ratelimit-remaining': '5000',
        'last-modified': new Date().toUTCString()
      }
    });

    (monitor as any).octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRuns
        }
      }
    };

    // Poll
    await monitor.poll();

    // Verify metadata extracted
    const state = await stateManager.loadState();
    const failure = state.failures[3001];

    expect(failure).toBeDefined();
    expect(failure.runId).toBe(3001);
    expect(failure.workflowName).toBe('E2E Tests');
    expect(failure.commitSha).toBe('commit-sha-123');
    expect(failure.branch).toBe('feature/new-feature');
    expect(failure.url).toBe('https://github.com/test/repo/actions/runs/3001');
    expect(failure.processed).toBe(false);
    expect(failure.analyzed).toBe(false);
    expect(failure.fixed).toBe(false);
  });
});
