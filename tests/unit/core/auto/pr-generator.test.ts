/**
 * PR Generator Tests
 *
 * Tests for the PR Generator that creates pull requests.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import {
  PRGenerator,
  type PRCreateOptions,
} from '../../../../src/core/auto/parallel/pr-generator.js';
import type {
  AgentDomain,
  GitProvider,
  ParallelAgent,
  WorktreeInfo,
  PRResult,
} from '../../../../src/core/auto/types.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

// Mock platform-utils
vi.mock('../../../../src/core/auto/parallel/platform-utils.js', () => ({
  timestamp: () => '2025-01-17T10:00:00.000Z',
}));

describe('PRGenerator', () => {
  let generator: PRGenerator;
  const mockSpawnSync = vi.mocked(spawnSync);

  const mockWorktree: WorktreeInfo = {
    path: '/tmp/worktrees/agent-test',
    branch: 'auto/frontend-0170',
    agentId: 'agent-test',
    createdAt: '2025-01-17T10:00:00.000Z',
    locked: false,
  };

  const createMockAgent = (overrides: Partial<ParallelAgent> = {}): ParallelAgent => ({
    id: 'agent-frontend-123',
    domain: 'frontend' as AgentDomain,
    status: 'completed',
    worktree: mockWorktree,
    taskIds: ['T-001', 'T-002', 'T-003'],
    progress: { completed: 3, total: 3 },
    subagentType: 'sw-frontend:frontend-architect',
    completedAt: '2025-01-17T10:30:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    generator = new PRGenerator('/home/user/project');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // PROVIDER DETECTION TESTS
  // ============================================================================

  describe('detectProvider', () => {
    it('should detect GitHub from HTTPS URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('github');
    });

    it('should detect GitHub from SSH URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'git@github.com:org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('github');
    });

    it('should detect GitLab from HTTPS URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'https://gitlab.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('gitlab');
    });

    it('should detect GitLab from SSH URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'git@gitlab.com:org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('gitlab');
    });

    it('should detect Azure DevOps from dev.azure.com URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'https://dev.azure.com/org/project/_git/repo',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('azure-devops');
    });

    it('should detect Azure DevOps from visualstudio.com URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'https://org.visualstudio.com/project/_git/repo',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('azure-devops');
    });

    it('should detect Bitbucket from URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'https://bitbucket.org/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('bitbucket');
    });

    it('should return unknown for unrecognized URL', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'https://gitea.example.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('unknown');
    });

    it('should return unknown when git command fails', () => {
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'fatal: not a git repository',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('unknown');
    });

    it('should handle mixed case URLs', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'https://GitHub.Com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.detectProvider()).toBe('github');
    });
  });

  // ============================================================================
  // PR TITLE BUILDING TESTS
  // ============================================================================

  describe('buildPRTitle', () => {
    it('should build title with increment ID and domain', () => {
      const agent = createMockAgent();
      const title = generator.buildPRTitle(agent, '0170-parallel-auto-mode');

      expect(title).toBe('[0170-parallel-auto-mode] Frontend: Parallel agent changes');
    });

    it('should capitalize domain name', () => {
      const agent = createMockAgent({ domain: 'backend' });
      const title = generator.buildPRTitle(agent, '0001-test');

      expect(title).toContain('Backend');
    });

    it('should work for all domains', () => {
      const domains: AgentDomain[] = ['frontend', 'backend', 'database', 'devops', 'qa', 'general'];

      for (const domain of domains) {
        const agent = createMockAgent({ domain });
        const title = generator.buildPRTitle(agent, '0001-test');
        const expectedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        expect(title).toContain(expectedDomain);
      }
    });
  });

  // ============================================================================
  // PR BODY BUILDING TESTS
  // ============================================================================

  describe('buildPRBody', () => {
    it('should include summary section', () => {
      const agent = createMockAgent();
      const body = generator.buildPRBody(agent, '0170-parallel-auto-mode');

      expect(body).toContain('## Summary');
    });

    it('should include increment ID in summary', () => {
      const agent = createMockAgent();
      const body = generator.buildPRBody(agent, '0170-parallel-auto-mode');

      expect(body).toContain('0170-parallel-auto-mode');
    });

    it('should list completed tasks', () => {
      const agent = createMockAgent({ taskIds: ['T-001', 'T-002', 'T-003'] });
      const body = generator.buildPRBody(agent, '0170-test');

      expect(body).toContain('## Tasks Completed');
      expect(body).toContain('- [x] T-001');
      expect(body).toContain('- [x] T-002');
      expect(body).toContain('- [x] T-003');
    });

    it('should include progress stats', () => {
      const agent = createMockAgent({
        progress: { completed: 5, total: 5 },
      });
      const body = generator.buildPRBody(agent, '0170-test');

      expect(body).toContain('## Progress');
      expect(body).toContain('Completed: 5/5');
    });

    it('should include agent status', () => {
      const agent = createMockAgent({ status: 'completed' });
      const body = generator.buildPRBody(agent, '0170-test');

      expect(body).toContain('Status: completed');
    });

    it('should include branch name', () => {
      const agent = createMockAgent();
      const body = generator.buildPRBody(agent, '0170-test');

      expect(body).toContain('## Branch');
      expect(body).toContain('auto/frontend-0170');
    });

    it('should include SpecWeave attribution', () => {
      const agent = createMockAgent();
      const body = generator.buildPRBody(agent, '0170-test');

      expect(body).toContain('SpecWeave Parallel Auto Mode');
    });
  });

  // ============================================================================
  // CREATE PR TESTS
  // ============================================================================

  describe('createPR', () => {
    it('should create GitHub PR successfully', async () => {
      // First call: detectProvider
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      // Second call: gh pr create
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/42',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      const result = await generator.createPR(agent, '0170-test');

      expect(result.status).toBe('created');
      expect(result.prNumber).toBe(42);
      expect(result.prUrl).toBe('https://github.com/org/repo/pull/42');
      expect(result.provider).toBe('github');
    });

    it('should handle GitHub PR creation failure', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      mockSpawnSync.mockReturnValueOnce({
        status: 1,
        stdout: '',
        stderr: 'gh: API rate limit exceeded',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      const result = await generator.createPR(agent, '0170-test');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('rate limit');
    });

    it('should create draft PR when requested', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/43',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      await generator.createPR(agent, '0170-test', { draft: true });

      // Check that --draft was included in args
      const ghCall = mockSpawnSync.mock.calls[1];
      expect(ghCall[0]).toBe('gh');
      expect(ghCall[1]).toContain('--draft');
    });

    it('should use custom base branch', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/44',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      await generator.createPR(agent, '0170-test', { baseBranch: 'develop' });

      const ghCall = mockSpawnSync.mock.calls[1];
      const baseIndex = (ghCall[1] as string[]).indexOf('--base');
      expect((ghCall[1] as string[])[baseIndex + 1]).toBe('develop');
    });

    it('should skip unsupported providers', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://gitea.example.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      const result = await generator.createPR(agent, '0170-test');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('Unsupported');
    });

    it('should create GitLab MR successfully', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://gitlab.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://gitlab.com/org/repo/-/merge_requests/99',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      const result = await generator.createPR(agent, '0170-test');

      expect(result.status).toBe('created');
      expect(result.prNumber).toBe(99);
      expect(result.provider).toBe('gitlab');
    });

    it('should create Azure DevOps PR successfully', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://dev.azure.com/org/project/_git/repo',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: JSON.stringify({
          pullRequestId: 123,
          url: 'https://dev.azure.com/org/project/_git/repo/pullrequest/123',
        }),
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      const result = await generator.createPR(agent, '0170-test');

      expect(result.status).toBe('created');
      expect(result.prNumber).toBe(123);
      expect(result.provider).toBe('azure-devops');
    });

    it('should handle Azure DevOps JSON parse error gracefully', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://dev.azure.com/org/project/_git/repo',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'Created PR successfully', // Not JSON
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent();
      const result = await generator.createPR(agent, '0170-test');

      expect(result.status).toBe('created');
      expect(result.prNumber).toBeUndefined();
    });

    it('should include agent info in result', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/50',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agent = createMockAgent({ id: 'agent-backend-456', domain: 'backend' });
      const result = await generator.createPR(agent, '0170-test');

      expect(result.agentId).toBe('agent-backend-456');
      expect(result.domain).toBe('backend');
      expect(result.createdAt).toBe('2025-01-17T10:00:00.000Z');
    });
  });

  // ============================================================================
  // CREATE MULTIPLE PRS TESTS
  // ============================================================================

  describe('createMultiplePRs', () => {
    it('should create PRs for all completed agents', async () => {
      // Provider detection calls
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/1',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/2',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agents = [
        createMockAgent({ id: 'agent-1', status: 'completed' }),
        createMockAgent({ id: 'agent-2', status: 'completed' }),
      ];

      const results = await generator.createMultiplePRs(agents, '0170-test');

      expect(results).toHaveLength(2);
    });

    it('should skip non-completed agents', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/1',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agents = [
        createMockAgent({ id: 'agent-1', status: 'completed' }),
        createMockAgent({ id: 'agent-2', status: 'running' }),
        createMockAgent({ id: 'agent-3', status: 'failed' }),
      ];

      const results = await generator.createMultiplePRs(agents, '0170-test');

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('agent-1');
    });

    it('should return empty array for no agents', async () => {
      const results = await generator.createMultiplePRs([], '0170-test');

      expect(results).toEqual([]);
    });

    it('should pass options to each PR creation', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/1',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const agents = [createMockAgent({ status: 'completed' })];
      await generator.createMultiplePRs(agents, '0170-test', { draft: true });

      const ghCall = mockSpawnSync.mock.calls[1];
      expect(ghCall[1]).toContain('--draft');
    });
  });

  // ============================================================================
  // GET CURRENT BRANCH TESTS
  // ============================================================================

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'main\n',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.getCurrentBranch()).toBe('main');
    });

    it('should return undefined on failure', () => {
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'not a git repository',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.getCurrentBranch()).toBeUndefined();
    });

    it('should trim whitespace from branch name', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: '  feature/test  \n',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      expect(generator.getCurrentBranch()).toBe('feature/test');
    });
  });

  // ============================================================================
  // EXTRACT PR/MR NUMBER TESTS
  // ============================================================================

  describe('PR/MR Number Extraction', () => {
    it('should extract GitHub PR number from URL', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo/pull/42',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const result = await generator.createPR(createMockAgent(), '0170-test');
      expect(result.prNumber).toBe(42);
    });

    it('should extract GitLab MR number from URL', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://gitlab.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://gitlab.com/org/repo/-/merge_requests/123',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const result = await generator.createPR(createMockAgent(), '0170-test');
      expect(result.prNumber).toBe(123);
    });

    it('should handle missing PR number gracefully', async () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'https://github.com/org/repo.git',
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: 'PR created successfully', // No URL
        stderr: '',
        pid: 0,
        output: [],
        signal: null,
      });

      const result = await generator.createPR(createMockAgent(), '0170-test');
      expect(result.prNumber).toBeUndefined();
      expect(result.status).toBe('created');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty task list in PR body', () => {
      const agent = createMockAgent({ taskIds: [] });
      const body = generator.buildPRBody(agent, '0170-test');

      expect(body).toContain('## Tasks Completed');
    });

    it('should handle very long increment IDs', () => {
      const longId = '0170-this-is-a-very-long-increment-id-that-might-break-things';
      const agent = createMockAgent();
      const title = generator.buildPRTitle(agent, longId);

      expect(title).toContain(longId);
    });

    it('should handle special characters in branch names', () => {
      const specialWorktree: WorktreeInfo = {
        ...mockWorktree,
        branch: 'feature/test-branch_v2.0',
      };
      const agent = createMockAgent({ worktree: specialWorktree });
      const body = generator.buildPRBody(agent, '0170-test');

      expect(body).toContain('feature/test-branch_v2.0');
    });
  });
});
