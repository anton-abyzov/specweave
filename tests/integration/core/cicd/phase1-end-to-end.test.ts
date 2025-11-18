/**
 * Phase 1 Integration Tests: End-to-End Workflow
 *
 * Tests complete monitoring workflow from polling to notification,
 * integrating all Phase 1 components.
 */

import { MonitorService } from '../../src/core/cicd/monitor-service.js';
import { loadConfig } from '../../src/core/cicd/config-loader.js';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock Octokit
vi.mock('@octokit/rest');

describe('Phase 1: End-to-End Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../../tmp', `test-e2e-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Create test config file
    const configPath = path.join(testDir, '.specweave/config.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          cicd: {
            github: {
              token: 'test-token-123',
              owner: 'test-owner',
              repo: 'test-repo'
            },
            monitoring: {
              pollInterval: 100, // Fast for testing
              autoNotify: true
            },
            notifications: {
              channels: ['console', 'file'],
              logFile: '.specweave/logs/cicd-notifications.log'
            }
          }
        },
        null,
        2
      ),
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  /**
   * Test: Complete monitoring workflow (poll → detect → notify)
   */
  test('Complete workflow: Poll → Detect → Store → Notify', async () => {
    // Load config
    const config = await loadConfig(testDir);

    // Create service
    const service = new MonitorService(config);

    // Mock GitHub API response with failures
    const mockWorkflowRuns = [
      {
        id: 9001,
        name: 'CI Build',
        run_number: 100,
        head_sha: 'commit-abc123',
        head_branch: 'main',
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/test-owner/test-repo/actions/runs/9001',
        created_at: '2025-11-12T16:00:00Z',
        updated_at: '2025-11-12T16:05:00Z'
      },
      {
        id: 9002,
        name: 'E2E Tests',
        run_number: 101,
        head_sha: 'commit-def456',
        head_branch: 'develop',
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/test-owner/test-repo/actions/runs/9002',
        created_at: '2025-11-12T16:10:00Z',
        updated_at: '2025-11-12T16:15:00Z'
      }
    ];

    const mockListWorkflowRuns = vi.fn().mockResolvedValue({
      data: { workflow_runs: mockWorkflowRuns },
      status: 200,
      headers: {
        'x-ratelimit-remaining': '5000',
        'last-modified': new Date().toUTCString()
      }
    });

    // Inject mock
    (service as any).monitor.octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockListWorkflowRuns
        }
      }
    };

    // Start service
    await service.start();

    // Wait for poll to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Stop service
    await service.stop();

    // Verify failures detected
    const unprocessed = await service.getUnprocessedFailures();
    expect(unprocessed.length).toBe(2);
    expect(unprocessed[0].workflowName).toBe('CI Build');
    expect(unprocessed[1].workflowName).toBe('E2E Tests');

    // Verify notification log created
    const logPath = path.join(testDir, '.specweave/logs/cicd-notifications.log');
    expect(await fs.pathExists(logPath)).toBe(true);

    const logContent = await fs.readFile(logPath, 'utf-8');
    expect(logContent).toContain('CI Build');
    expect(logContent).toContain('E2E Tests');
  });

  /**
   * Test: Service status and metrics
   */
  test('Service status reports accurate metrics', async () => {
    const config = await loadConfig(testDir);
    const service = new MonitorService(config);

    // Mock API response
    const mockWorkflowRuns = [
      {
        id: 9003,
        name: 'Deploy',
        run_number: 200,
        head_sha: 'commit-ghi789',
        head_branch: 'main',
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/test-owner/test-repo/actions/runs/9003',
        created_at: '2025-11-12T17:00:00Z',
        updated_at: '2025-11-12T17:10:00Z'
      }
    ];

    (service as any).monitor.octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
            data: { workflow_runs: mockWorkflowRuns },
            status: 200,
            headers: {
              'x-ratelimit-remaining': '4999',
              'last-modified': new Date().toUTCString()
            }
          })
        }
      }
    };

    // Start service
    await service.start();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Get status
    const status = await service.getStatus();

    expect(status.running).toBe(true);
    expect(status.totalFailures).toBe(1);
    expect(status.unprocessedFailures).toBe(1);
    expect(status.uptime).toBeGreaterThan(0);
    expect(status.lastPoll).not.toBeNull();

    await service.stop();
  });

  /**
   * Test: Deduplication across multiple polls
   */
  test('Deduplication prevents duplicate notifications', async () => {
    const config = await loadConfig(testDir);
    const service = new MonitorService(config);

    // Same failure returned in multiple polls
    const mockWorkflowRuns = [
      {
        id: 9004,
        name: 'Lint',
        run_number: 300,
        head_sha: 'commit-jkl012',
        head_branch: 'main',
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/test-owner/test-repo/actions/runs/9004',
        created_at: '2025-11-12T18:00:00Z',
        updated_at: '2025-11-12T18:05:00Z'
      }
    ];

    (service as any).monitor.octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
            data: { workflow_runs: mockWorkflowRuns },
            status: 200,
            headers: {
              'x-ratelimit-remaining': '4998',
              'last-modified': new Date().toUTCString()
            }
          })
        }
      }
    };

    // Start service
    await service.start();

    // Wait for first poll
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Wait for second poll (should deduplicate)
    await new Promise((resolve) => setTimeout(resolve, 150));

    await service.stop();

    // Verify only ONE failure recorded (deduplicated)
    const status = await service.getStatus();
    expect(status.totalFailures).toBe(1);
  });

  /**
   * Test: Configuration loading with priority
   */
  test('Configuration loading respects priority: env > file > defaults', async () => {
    // Set environment variables
    process.env.GITHUB_TOKEN = 'env-token-override';
    process.env.GITHUB_OWNER = 'env-owner';
    process.env.GITHUB_REPO = 'env-repo';
    process.env.CICD_POLL_INTERVAL = '30000';

    try {
      // Load config (should prioritize env vars)
      const config = await loadConfig(testDir);

      expect(config.monitor.token).toBe('env-token-override');
      expect(config.monitor.owner).toBe('env-owner');
      expect(config.monitor.repo).toBe('env-repo');
      expect(config.monitor.pollInterval).toBe(30000);
    } finally {
      // Clean up env vars
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;
      delete process.env.CICD_POLL_INTERVAL;
    }
  });

  /**
   * Test: Graceful handling of rate limiting
   */
  test('Handles rate limiting with retry', async () => {
    const config = await loadConfig(testDir);
    const service = new MonitorService(config);

    // Mock rate limit response, then success
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce({
        status: 429,
        message: 'Rate limit exceeded',
        response: {
          headers: {
            'retry-after': '1' // 1 second
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          workflow_runs: [
            {
              id: 9005,
              name: 'Test',
              run_number: 400,
              head_sha: 'commit-mno345',
              head_branch: 'main',
              status: 'completed',
              conclusion: 'failure',
              html_url: 'https://github.com/test-owner/test-repo/actions/runs/9005',
              created_at: '2025-11-12T19:00:00Z',
              updated_at: '2025-11-12T19:05:00Z'
            }
          ]
        },
        status: 200,
        headers: {
          'x-ratelimit-remaining': '1',
          'last-modified': new Date().toUTCString()
        }
      });

    (service as any).monitor.octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: mockFn
        }
      }
    };

    // Start service
    await service.start();

    // Wait for retry to complete
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await service.stop();

    // Verify failure detected after retry
    const status = await service.getStatus();
    expect(status.totalFailures).toBe(1);
    expect(mockFn).toHaveBeenCalledTimes(2); // Initial + retry
  });
});
