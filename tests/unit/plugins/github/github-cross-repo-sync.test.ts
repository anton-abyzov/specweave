/**
 * Unit tests for cross-repo sync (TDD)
 *
 * Tests cross-repo issue creation and linking for distributed strategies.
 *
 * @see T-015: Cross-repo issue creation
 * @see T-016: Cross-repo issue linking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

const mockGenerateIssueBody = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-github/lib/github-issue-body-generator.js', () => ({
  generateIssueBody: mockGenerateIssueBody,
}));

import {
  crossRepoSync,
  type CrossRepoSyncOptions,
  type CrossRepoSyncResult,
  type CrossRepoUserStory,
} from '../../../../plugins/specweave-github/lib/github-cross-repo-sync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

function makeStory(overrides: Partial<CrossRepoUserStory> = {}): CrossRepoUserStory {
  return {
    id: 'US-001',
    title: 'User authentication',
    description: 'Users should be able to log in.',
    priority: 'P1',
    status: 'planned',
    acceptanceCriteria: [
      { id: 'AC-US1-01', description: 'User can log in', completed: false },
    ],
    targetRepos: ['test-owner/frontend-app'],
    ...overrides,
  };
}

function makeOptions(overrides: Partial<CrossRepoSyncOptions> = {}): CrossRepoSyncOptions {
  return {
    owner: 'test-owner',
    defaultRepo: 'monorepo',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('crossRepoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateIssueBody.mockReturnValue('## Issue Body\ntest');
  });

  // =========================================================================
  // T-015: Cross-repo issue creation
  // =========================================================================
  describe('cross-repo issue creation', () => {
    it('should create issues in the target repos specified on each user story', async () => {
      // Search returns no existing issues
      mockExecFileNoThrow
        .mockResolvedValueOnce(execSuccess('[]')) // search in frontend-app
        .mockResolvedValueOnce(execSuccess(JSON.stringify({ // create in frontend-app
          number: 42,
          url: 'https://github.com/test-owner/frontend-app/issues/42',
          node_id: 'I_kwDOFE42',
        })));

      const stories = [makeStory({ targetRepos: ['test-owner/frontend-app'] })];
      const result = await crossRepoSync(stories, makeOptions());

      expect(result.created).toHaveLength(1);
      expect(result.created[0].repo).toBe('test-owner/frontend-app');
      expect(result.created[0].issueNumber).toBe(42);
      expect(result.created[0].userStoryId).toBe('US-001');
    });

    it('should create issues in multiple repos for cross-team stories', async () => {
      // Frontend search + create
      mockExecFileNoThrow
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 10, url: 'https://github.com/test-owner/frontend-app/issues/10', node_id: 'I_kwDOFE10',
        })))
        // Backend search + create
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 20, url: 'https://github.com/test-owner/backend-api/issues/20', node_id: 'I_kwDOBE20',
        })));

      const stories = [makeStory({
        id: 'US-001',
        targetRepos: ['test-owner/frontend-app', 'test-owner/backend-api'],
      })];

      const result = await crossRepoSync(stories, makeOptions());

      expect(result.created).toHaveLength(2);
      expect(result.created.map(c => c.repo)).toEqual([
        'test-owner/frontend-app',
        'test-owner/backend-api',
      ]);
    });

    it('should use defaultRepo when user story has no targetRepos', async () => {
      mockExecFileNoThrow
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 1, url: 'https://github.com/test-owner/monorepo/issues/1', node_id: 'I_kwDOMono1',
        })));

      const stories = [makeStory({ targetRepos: [] })];
      const result = await crossRepoSync(stories, makeOptions());

      expect(result.created).toHaveLength(1);
      expect(result.created[0].repo).toBe('test-owner/monorepo');
    });

    it('should update existing issue instead of creating duplicate', async () => {
      // Search finds existing
      mockExecFileNoThrow
        .mockResolvedValueOnce(execSuccess(JSON.stringify([
          { number: 42, title: '[US-001] User authentication', node_id: 'I_kwDOExist' },
        ])))
        // Update
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 42, url: 'https://github.com/test-owner/frontend-app/issues/42',
        })));

      const stories = [makeStory({ targetRepos: ['test-owner/frontend-app'] })];
      const result = await crossRepoSync(stories, makeOptions());

      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].issueNumber).toBe(42);
    });

    it('should handle errors gracefully and continue with other stories', async () => {
      // US-001: fails
      mockExecFileNoThrow
        .mockResolvedValueOnce({ stdout: '', stderr: 'HTTP 403: Forbidden', exitCode: 1, success: false })
        // US-002: succeeds
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 5, url: 'https://github.com/test-owner/backend-api/issues/5', node_id: 'I_kwDO5',
        })));

      const stories = [
        makeStory({ id: 'US-001', targetRepos: ['test-owner/frontend-app'] }),
        makeStory({ id: 'US-002', targetRepos: ['test-owner/backend-api'] }),
      ];

      const result = await crossRepoSync(stories, makeOptions());

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userStoryId).toBe('US-001');
      expect(result.created).toHaveLength(1);
      expect(result.created[0].userStoryId).toBe('US-002');
    });

    it('should pass token to gh commands', async () => {
      mockExecFileNoThrow
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 1, url: 'https://github.com/test-owner/repo/issues/1', node_id: 'I_kwDO1',
        })));

      const stories = [makeStory({ targetRepos: ['test-owner/repo'] })];
      await crossRepoSync(stories, makeOptions({ token: 'ghp_token123' }));

      for (const call of mockExecFileNoThrow.mock.calls) {
        const opts = call[2] as { env?: NodeJS.ProcessEnv };
        expect(opts.env?.GH_TOKEN).toBe('ghp_token123');
      }
    });
  });

  // =========================================================================
  // T-016: Cross-repo issue linking
  // =========================================================================
  describe('cross-repo issue linking', () => {
    it('should add cross-reference section when issue exists in multiple repos', async () => {
      // Create in frontend
      mockExecFileNoThrow
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 10, url: 'https://github.com/test-owner/frontend-app/issues/10', node_id: 'I_kwDOFE10',
        })))
        // Create in backend
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 20, url: 'https://github.com/test-owner/backend-api/issues/20', node_id: 'I_kwDOBE20',
        })))
        // Update frontend with cross-ref
        .mockResolvedValueOnce(execSuccess(JSON.stringify({ number: 10, url: '' })))
        // Update backend with cross-ref
        .mockResolvedValueOnce(execSuccess(JSON.stringify({ number: 20, url: '' })));

      const stories = [makeStory({
        targetRepos: ['test-owner/frontend-app', 'test-owner/backend-api'],
      })];

      const result = await crossRepoSync(stories, makeOptions());

      expect(result.crossReferences).toHaveLength(2);
      expect(result.crossReferences).toContainEqual(
        expect.objectContaining({
          repo: 'test-owner/frontend-app',
          issueNumber: 10,
          linkedTo: expect.arrayContaining([
            expect.objectContaining({ repo: 'test-owner/backend-api', issueNumber: 20 }),
          ]),
        }),
      );
    });

    it('should not add cross-references for single-repo stories', async () => {
      mockExecFileNoThrow
        .mockResolvedValueOnce(execSuccess('[]'))
        .mockResolvedValueOnce(execSuccess(JSON.stringify({
          number: 1, url: 'https://github.com/test-owner/repo/issues/1', node_id: 'I_kwDO1',
        })));

      const stories = [makeStory({ targetRepos: ['test-owner/repo'] })];
      const result = await crossRepoSync(stories, makeOptions());

      expect(result.crossReferences).toHaveLength(0);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('should return empty result for empty stories array', async () => {
      const result = await crossRepoSync([], makeOptions());

      expect(result.created).toEqual([]);
      expect(result.updated).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.crossReferences).toEqual([]);
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
    });
  });
});
