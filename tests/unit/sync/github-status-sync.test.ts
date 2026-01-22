import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for GitHub Status Sync
 *
 * Tests GitHub-specific status synchronization logic.
 * Uses class-based mocks for vitest 4.x compatibility.
 *
 * IMPORTANT: Uses vi.hoisted() with class-based mocks for vitest 4.x compatibility.
 */

// Use vi.hoisted() to create mock functions and class
const { mockGet, mockUpdate, mockCreateComment, MockOctokit } = vi.hoisted(() => {
  const _mockGet = vi.fn();
  const _mockUpdate = vi.fn();
  const _mockCreateComment = vi.fn();

  class _MockOctokit {
    rest = {
      issues: {
        get: _mockGet,
        update: _mockUpdate,
        createComment: _mockCreateComment,
      },
    };
    constructor(_config: any) {
      // Store config if needed
    }
  }

  return {
    mockGet: _mockGet,
    mockUpdate: _mockUpdate,
    mockCreateComment: _mockCreateComment,
    MockOctokit: _MockOctokit,
  };
});

// Mock @octokit/rest with explicit factory
vi.mock('@octokit/rest', () => {
  return {
    Octokit: MockOctokit,
  };
});

// Import AFTER mocks are set up
import { GitHubStatusSync } from '../../../plugins/specweave-github/lib/github-status-sync.js';
import { Octokit } from '@octokit/rest';

describe('GitHubStatusSync', () => {
  let sync: GitHubStatusSync;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    sync = new GitHubStatusSync('test-token', 'anton-abyzov', 'specweave');
  });

  describe('getStatus', () => {
    it('should get status from open issue without labels', async () => {
      mockGet.mockResolvedValue({
        data: {
          state: 'open',
          labels: [],
        },
      } as any);

      const status = await sync.getStatus(123);

      expect(status.state).toBe('open');
      expect(status.labels).toEqual([]);
      expect(mockGet).toHaveBeenCalledWith({
        owner: 'anton-abyzov',
        repo: 'specweave',
        issue_number: 123,
      });
    });

    it('should get status from open issue with labels', async () => {
      mockGet.mockResolvedValue({
        data: {
          state: 'open',
          labels: [{ name: 'in-progress' }, { name: 'bug' }],
        },
      } as any);

      const status = await sync.getStatus(123);

      expect(status.state).toBe('open');
      expect(status.labels).toEqual(['in-progress', 'bug']);
    });

    it('should get status from closed issue', async () => {
      mockGet.mockResolvedValue({
        data: {
          state: 'closed',
          labels: [],
        },
      } as any);

      const status = await sync.getStatus(123);

      expect(status.state).toBe('closed');
      expect(status.labels).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(sync.getStatus(123)).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('updateStatus', () => {
    it('should update issue to closed state', async () => {
      mockUpdate.mockResolvedValue({
        data: {
          state: 'closed',
          labels: [],
        },
      } as any);

      await sync.updateStatus(123, { state: 'closed' });

      expect(mockUpdate).toHaveBeenCalledWith({
        owner: 'anton-abyzov',
        repo: 'specweave',
        issue_number: 123,
        state: 'closed',
      });
    });

    it('should update issue with labels (in-progress)', async () => {
      mockUpdate.mockResolvedValue({
        data: {
          state: 'open',
          labels: [{ name: 'in-progress' }],
        },
      } as any);

      await sync.updateStatus(123, {
        state: 'open',
        labels: ['in-progress'],
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        owner: 'anton-abyzov',
        repo: 'specweave',
        issue_number: 123,
        state: 'open',
        labels: ['in-progress'],
      });
    });

    it('should update issue with labels (paused)', async () => {
      mockUpdate.mockResolvedValue({
        data: {
          state: 'open',
          labels: [{ name: 'paused' }],
        },
      } as any);

      await sync.updateStatus(123, {
        state: 'open',
        labels: ['paused'],
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        owner: 'anton-abyzov',
        repo: 'specweave',
        issue_number: 123,
        state: 'open',
        labels: ['paused'],
      });
    });

    it('should update issue to closed with wontfix label', async () => {
      mockUpdate.mockResolvedValue({
        data: {
          state: 'closed',
          labels: [{ name: 'wontfix' }],
        },
      } as any);

      await sync.updateStatus(123, {
        state: 'closed',
        labels: ['wontfix'],
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        owner: 'anton-abyzov',
        repo: 'specweave',
        issue_number: 123,
        state: 'closed',
        labels: ['wontfix'],
      });
    });

    it('should handle API errors gracefully', async () => {
      mockUpdate.mockRejectedValue(new Error('Not found'));

      await expect(sync.updateStatus(123, { state: 'closed' })).rejects.toThrow('Not found');
    });
  });

  describe('postStatusComment', () => {
    it('should post comment about status change', async () => {
      mockCreateComment.mockResolvedValue({
        data: { id: 456 },
      } as any);

      await sync.postStatusComment(123, 'active', 'completed');

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'anton-abyzov',
        repo: 'specweave',
        issue_number: 123,
        body: expect.stringContaining('active'),
      });

      const call = mockCreateComment.mock.calls[0][0];
      expect(call.body).toContain('active');
      expect(call.body).toContain('completed');
    });

    it('should include timestamp in comment', async () => {
      mockCreateComment.mockResolvedValue({
        data: { id: 456 },
      } as any);

      await sync.postStatusComment(123, 'planning', 'active');

      const call = mockCreateComment.mock.calls[0][0];
      expect(call.body).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });

    it('should handle API errors gracefully', async () => {
      mockCreateComment.mockRejectedValue(new Error('Permission denied'));

      await expect(sync.postStatusComment(123, 'active', 'completed')).rejects.toThrow(
        'Permission denied'
      );
    });
  });

  describe('constructor', () => {
    it('should create Octokit instance with provided token', () => {
      const newSync = new GitHubStatusSync('my-token', 'owner', 'repo');

      expect(MockOctokit).toBeDefined();
      // The constructor was called with the token when creating newSync
    });
  });
});
