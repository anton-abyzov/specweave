/**
 * Integration Tests: GitHub API Polling
 *
 * Tests real GitHub API interactions (in mock mode) and network failure handling.
 */

import { WorkflowMonitor } from '../../src/core/cicd/workflow-monitor';
import { StateManager } from '../../src/core/cicd/state-manager';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock Octokit for integration tests
jest.mock('@octokit/rest');

describe('GitHub API Polling (Integration)', () => {
  let testDir: string;
  let stateManager: StateManager;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../../tmp', `test-integration-polling-${Date.now()}`);
    await fs.ensureDir(testDir);
    stateManager = new StateManager(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  /**
   * Test: Poll real GitHub API (using mock for testing)
   */
  test('testRealGitHubAPIPolling: Polls real repository (mock mode)', async () => {
    // Create monitor with test repository
    const monitor = new WorkflowMonitor(
      {
        token: process.env.GITHUB_TOKEN || 'test-token',
        owner: 'anton-abyzov', // Real repository
        repo: 'specweave',
        pollInterval: 60000,
        debug: true
      },
      stateManager
    );

    // Mock realistic GitHub API response
    const mockWorkflowRuns = [
      {
        id: 7001,
        name: 'CI Pipeline',
        run_number: 500,
        head_sha: 'real-commit-sha-abc',
        head_branch: 'develop',
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/anton-abyzov/specweave/actions/runs/7001',
        created_at: '2025-11-12T14:00:00Z',
        updated_at: '2025-11-12T14:10:00Z'
      },
      {
        id: 7002,
        name: 'E2E Tests',
        run_number: 501,
        head_sha: 'real-commit-sha-def',
        head_branch: 'main',
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/anton-abyzov/specweave/actions/runs/7002',
        created_at: '2025-11-12T14:15:00Z',
        updated_at: '2025-11-12T14:25:00Z'
      }
    ];

    const mockListWorkflowRuns = jest.fn().mockResolvedValue({
      data: { workflow_runs: mockWorkflowRuns },
      status: 200,
      headers: {
        'x-ratelimit-remaining': '4950',
        'x-ratelimit-limit': '5000',
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

    // Perform poll
    const result = await monitor.poll();

    // Verify poll succeeded
    expect(result.statusCode).toBe(200);
    expect(result.totalRuns).toBe(2);
    expect(result.newFailures).toBe(1); // Only E2E Tests failed
    expect(result.rateLimitRemaining).toBe(4950);

    // Verify failure stored
    const state = await stateManager.loadState();
    expect(state.failures[7002]).toBeDefined();
    expect(state.failures[7002].workflowName).toBe('E2E Tests');
    expect(state.failures[7002].commitSha).toBe('real-commit-sha-def');

    // Verify last poll timestamp updated
    expect(state.lastPoll).not.toBeNull();
    const lastPollDate = new Date(state.lastPoll!);
    expect(lastPollDate.getTime()).toBeGreaterThan(Date.now() - 10000); // Within last 10s
  });

  /**
   * Test: Graceful degradation on API errors
   */
  test('testHandlesNetworkFailures: Graceful degradation on API errors', async () => {
    const monitor = new WorkflowMonitor(
      {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo',
        pollInterval: 60000,
        debug: false
      },
      stateManager
    );

    // Simulate network error
    const mockListWorkflowRuns = jest.fn().mockRejectedValue(new Error('Network timeout'));

    (monitor as any).octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRuns
        }
      }
    };

    // Poll should not throw (graceful degradation)
    const result = await monitor.poll();

    // Verify graceful failure
    expect(result.statusCode).toBe(500);
    expect(result.totalRuns).toBe(0);
    expect(result.newFailures).toBe(0);

    // Verify state unchanged
    const state = await stateManager.loadState();
    expect(state.totalFailures).toBe(0);
    expect(Object.keys(state.failures).length).toBe(0);

    // Simulate recovery after network failure
    mockListWorkflowRuns.mockResolvedValueOnce({
      data: {
        workflow_runs: [
          {
            id: 8001,
            name: 'Recovered Build',
            run_number: 600,
            head_sha: 'recovery-sha',
            head_branch: 'main',
            status: 'completed',
            conclusion: 'failure',
            html_url: 'https://github.com/test/repo/actions/runs/8001',
            created_at: '2025-11-12T15:00:00Z',
            updated_at: '2025-11-12T15:05:00Z'
          }
        ]
      },
      status: 200,
      headers: {
        'x-ratelimit-remaining': '5000',
        'last-modified': new Date().toUTCString()
      }
    });

    // Poll again (should recover)
    const recoveredResult = await monitor.poll();

    expect(recoveredResult.statusCode).toBe(200);
    expect(recoveredResult.newFailures).toBe(1);

    // Verify failure detected after recovery
    const recoveredState = await stateManager.loadState();
    expect(recoveredState.failures[8001]).toBeDefined();
  });
});
