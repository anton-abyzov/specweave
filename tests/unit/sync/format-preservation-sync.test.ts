/**
 * Unit tests for FormatPreservationSyncService
 *
 * Tests origin-based routing, comment building, idempotency,
 * locking, and status update logic across GitHub, JIRA, and ADO.
 *
 * @see src/sync/format-preservation-sync.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — classes that pass instanceof checks
// ---------------------------------------------------------------------------

const {
  mockGhGetLastComment,
  mockGhAddComment,
  mockGhCloseIssue,
  MockGitHubClientV2,
  mockJiraAddComment,
  mockJiraUpdateIssue,
  MockJiraClient,
  mockAdoAddComment,
  mockAdoUpdateWorkItem,
  MockAdoClient,
  mockLockAcquire,
  mockLockRelease,
  MockLockManager,
} = vi.hoisted(() => {
  // GitHub mocks
  const _mockGhGetLastComment = vi.fn();
  const _mockGhAddComment = vi.fn();
  const _mockGhCloseIssue = vi.fn();

  class _MockGitHubClientV2 {
    getLastComment = _mockGhGetLastComment;
    addComment = _mockGhAddComment;
    closeIssue = _mockGhCloseIssue;
    constructor(_profile?: any) {}
  }

  // JIRA mocks
  const _mockJiraAddComment = vi.fn();
  const _mockJiraUpdateIssue = vi.fn();

  class _MockJiraClient {
    addComment = _mockJiraAddComment;
    updateIssue = _mockJiraUpdateIssue;
    constructor() {}
  }

  // ADO mocks
  const _mockAdoAddComment = vi.fn();
  const _mockAdoUpdateWorkItem = vi.fn();

  class _MockAdoClient {
    addComment = _mockAdoAddComment;
    updateWorkItem = _mockAdoUpdateWorkItem;
    constructor(_config?: any) {}
  }

  // LockManager mocks
  const _mockLockAcquire = vi.fn().mockResolvedValue(true);
  const _mockLockRelease = vi.fn().mockResolvedValue(undefined);

  class _MockLockManager {
    acquire = _mockLockAcquire;
    release = _mockLockRelease;
    constructor(_dir: string, _stale?: number, _opts?: any) {}
  }

  return {
    mockGhGetLastComment: _mockGhGetLastComment,
    mockGhAddComment: _mockGhAddComment,
    mockGhCloseIssue: _mockGhCloseIssue,
    MockGitHubClientV2: _MockGitHubClientV2,
    mockJiraAddComment: _mockJiraAddComment,
    mockJiraUpdateIssue: _mockJiraUpdateIssue,
    MockJiraClient: _MockJiraClient,
    mockAdoAddComment: _mockAdoAddComment,
    mockAdoUpdateWorkItem: _mockAdoUpdateWorkItem,
    MockAdoClient: _MockAdoClient,
    mockLockAcquire: _mockLockAcquire,
    mockLockRelease: _mockLockRelease,
    MockLockManager: _MockLockManager,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
  GitHubClientV2: MockGitHubClientV2,
}));

vi.mock('../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: MockJiraClient,
}));

vi.mock('../../../src/integrations/ado/ado-client.js', () => ({
  AdoClient: MockAdoClient,
}));

vi.mock('../../../src/utils/lock-manager.js', () => ({
  LockManager: MockLockManager,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  FormatPreservationSyncService,
  type SyncConfig,
  type CompletionCommentData,
  type TaskCompletionInfo,
  type ACCompletionInfo,
} from '../../../src/sync/format-preservation-sync.js';
import { GitHubClientV2 } from '../../../plugins/specweave-github/lib/github-client-v2.js';
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';
import { AdoClient } from '../../../src/integrations/ado/ado-client.js';
import type { LivingDocsUSFile } from '../../../src/types/living-docs-us-file.js';
import type { Logger } from '../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

function makeGitHubClient(): GitHubClientV2 {
  return new (GitHubClientV2 as any)();
}

function makeJiraClient(): JiraClient {
  return new (JiraClient as any)();
}

function makeAdoClient(): AdoClient {
  return new (AdoClient as any)();
}

function makeUSFile(overrides: Partial<LivingDocsUSFile> = {}): LivingDocsUSFile {
  return {
    id: 'US-001',
    title: 'Test User Story',
    status: 'in-progress',
    ...overrides,
  };
}

function makeCompletionData(overrides: Partial<CompletionCommentData> = {}): CompletionCommentData {
  return {
    tasks: [
      { taskId: 'T-001', title: 'Setup project', completed: true },
      { taskId: 'T-002', title: 'Implement feature', completed: true },
      { taskId: 'T-003', title: 'Write tests', completed: false },
    ],
    acceptanceCriteria: [
      { acId: 'AC-US1-01', description: 'Project compiles', satisfied: true },
      { acId: 'AC-US1-02', description: 'Tests pass', satisfied: false },
    ],
    progressPercentage: 67,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FormatPreservationSyncService', () => {
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    mockLockAcquire.mockResolvedValue(true);
    mockLockRelease.mockResolvedValue(undefined);
    mockGhGetLastComment.mockResolvedValue(null);
    mockGhAddComment.mockResolvedValue(undefined);
    mockGhCloseIssue.mockResolvedValue(undefined);
    mockJiraAddComment.mockResolvedValue(undefined);
    mockJiraUpdateIssue.mockResolvedValue({});
    mockAdoAddComment.mockResolvedValue(undefined);
    mockAdoUpdateWorkItem.mockResolvedValue({});
  });

  // =========================================================================
  // Constructor / Config defaults
  // =========================================================================

  describe('constructor', () => {
    it('should default all config flags to false', () => {
      const svc = new FormatPreservationSyncService();
      // No direct getter, but we can observe behaviour:
      // internal US with canUpdateExternalItems=false should skip external updates
      const client = makeGitHubClient();
      const usFile = makeUSFile({ origin: 'internal' });
      const data = makeCompletionData();

      // Should log "External updates skipped" because canUpdateExternalItems defaults false
      return svc.syncUserStory(usFile, data, client).then(() => {
        // If canUpdateExternalItems were true, addComment would be called
        expect(mockGhAddComment).not.toHaveBeenCalled();
      });
    });

    it('should accept custom config values', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true, canUpdateStatus: true },
        { logger, projectRoot: '/tmp/test' }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 42 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      // With canUpdateExternalItems=true, comment should be posted
      expect(mockGhAddComment).toHaveBeenCalled();
      // With canUpdateStatus=true and 100%, should close
      expect(mockGhCloseIssue).toHaveBeenCalled();
    });

    it('should use provided logger', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({ origin: 'internal' });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(logger.log).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Origin-based routing
  // =========================================================================

  describe('syncUserStory — origin routing', () => {
    it('should route external US (origin field) to comment-only sync', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 10 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      // External sync: comment posted regardless of canUpdateExternalItems
      expect(mockGhAddComment).toHaveBeenCalled();
      // But origin=external -> external US path logged
      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('External US'))).toBe(true);
    });

    it('should route external US (inferred from E-suffix ID) to comment-only sync', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        id: 'US-005E', // E suffix = external
        external_tools: { github: { number: 20 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('External US'))).toBe(true);
    });

    it('should route internal US (origin field) to full sync', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({ origin: 'internal' });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('Internal US'))).toBe(true);
    });

    it('should route internal US (no E-suffix) to full sync', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({ id: 'US-010' }); // no E suffix, no origin
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('Internal US'))).toBe(true);
    });
  });

  // =========================================================================
  // External US sync (comment-only)
  // =========================================================================

  describe('syncExternalUS (comment-only mode)', () => {
    it('should post comment and skip status when canUpdateStatus is false', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: false },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 5 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).toHaveBeenCalled();
      expect(mockGhCloseIssue).not.toHaveBeenCalled();
    });

    it('should post comment and update status at 100% when canUpdateStatus is true', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 7 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).toHaveBeenCalled();
      expect(mockGhCloseIssue).toHaveBeenCalledWith(
        7,
        expect.stringContaining('100% complete')
      );
    });

    it('should skip status update when canUpdateStatus is true but progress < 100', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 8 } },
      });
      const data = makeCompletionData({ progressPercentage: 50 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhCloseIssue).not.toHaveBeenCalled();
      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('50%') && m.includes('< 100%'))).toBe(true);
    });
  });

  // =========================================================================
  // Internal US sync (full sync)
  // =========================================================================

  describe('syncInternalUS (full sync mode)', () => {
    it('should skip external updates when canUpdateExternalItems is false', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: false },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 99 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).not.toHaveBeenCalled();
      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('canUpdateExternalItems=false'))).toBe(true);
    });

    it('should post comment when canUpdateExternalItems is true', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 15 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).toHaveBeenCalled();
    });

    it('should update status at 100% when both flags are true', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true, canUpdateStatus: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 16 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhCloseIssue).toHaveBeenCalledWith(16, expect.any(String));
    });

    it('should skip status update when canUpdateStatus is true but progress < 100', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true, canUpdateStatus: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 17 } },
      });
      const data = makeCompletionData({ progressPercentage: 80 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhCloseIssue).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // buildCompletionComment
  // =========================================================================

  describe('buildCompletionComment', () => {
    it('should build a comment with completed tasks, satisfied ACs, and progress', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData();

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('## Progress Update');
      expect(comment).toContain('### Completed Tasks');
      expect(comment).toContain('[T-001] Setup project');
      expect(comment).toContain('[T-002] Implement feature');
      expect(comment).not.toContain('[T-003]'); // not completed
      expect(comment).toContain('### Acceptance Criteria');
      expect(comment).toContain('**AC-US1-01**: Project compiles');
      expect(comment).not.toContain('AC-US1-02'); // not satisfied
      expect(comment).toContain('2/3 tasks completed (67%)');
    });

    it('should include living docs URL when provided', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        livingDocsUrl: 'https://example.com/docs/US-001',
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('[View Living Docs](https://example.com/docs/US-001)');
    });

    it('should omit living docs link when URL not provided', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({ livingDocsUrl: undefined });

      const comment = svc.buildCompletionComment(data);

      expect(comment).not.toContain('View Living Docs');
    });

    it('should handle empty tasks array', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [],
        acceptanceCriteria: [],
        progressPercentage: 0,
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('## Progress Update');
      expect(comment).not.toContain('### Completed Tasks');
      expect(comment).not.toContain('### Acceptance Criteria');
      expect(comment).toContain('0/0 tasks completed (0%)');
    });

    it('should handle all tasks completed', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [
          { taskId: 'T-001', title: 'A', completed: true },
          { taskId: 'T-002', title: 'B', completed: true },
        ],
        acceptanceCriteria: [
          { acId: 'AC-US1-01', description: 'X', satisfied: true },
        ],
        progressPercentage: 100,
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('2/2 tasks completed (100%)');
      expect(comment).toContain('[T-001] A');
      expect(comment).toContain('[T-002] B');
    });

    it('should handle no tasks completed', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [
          { taskId: 'T-001', title: 'A', completed: false },
          { taskId: 'T-002', title: 'B', completed: false },
        ],
        acceptanceCriteria: [],
        progressPercentage: 0,
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).not.toContain('### Completed Tasks');
      expect(comment).toContain('0/2 tasks completed (0%)');
    });

    it('should handle markdown content in task titles and AC descriptions', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [
          { taskId: 'T-001', title: 'Setup `config.json` file', completed: true },
        ],
        acceptanceCriteria: [
          { acId: 'AC-US1-01', description: 'User **can** login via OAuth', satisfied: true },
        ],
        progressPercentage: 50,
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('Setup `config.json` file');
      expect(comment).toContain('User **can** login via OAuth');
    });

    it('should produce consistent multi-line markdown format', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [{ taskId: 'T-001', title: 'Done', completed: true }],
        acceptanceCriteria: [{ acId: 'AC-US1-01', description: 'Works', satisfied: true }],
        progressPercentage: 100,
        livingDocsUrl: 'https://docs.example.com',
      });

      const comment = svc.buildCompletionComment(data);
      const lines = comment.split('\n');

      // Check structure: header, blank, section, blank, items, blank, section, blank, items, blank, progress, blank, link
      expect(lines[0]).toBe('## Progress Update');
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('### Completed Tasks');
    });
  });

  // =========================================================================
  // GitHub idempotency
  // =========================================================================

  describe('GitHub comment idempotency', () => {
    it('should skip comment when last comment matches (duplicate detection)', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 30 } },
      });
      const data = makeCompletionData();
      const expectedComment = svc.buildCompletionComment(data);

      mockGhGetLastComment.mockResolvedValue({ body: expectedComment, author: 'bot' });

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).not.toHaveBeenCalled();
      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('duplicate'))).toBe(true);
    });

    it('should post comment when last comment differs', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 31 } },
      });
      const data = makeCompletionData();

      mockGhGetLastComment.mockResolvedValue({ body: 'something else', author: 'bot' });

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).toHaveBeenCalledWith(31, expect.any(String));
    });

    it('should post comment when no previous comments exist', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 32 } },
      });
      const data = makeCompletionData();

      mockGhGetLastComment.mockResolvedValue(null);

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).toHaveBeenCalledWith(32, expect.any(String));
    });

    it('should skip if no GitHub issue number', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 0 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).not.toHaveBeenCalled();
      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('No GitHub issue number'))).toBe(true);
    });

    it('should skip if no external_tools.github', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: {},
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Locking behaviour
  // =========================================================================

  describe('lock behaviour', () => {
    it('should acquire and release lock for GitHub comment', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 50 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockLockAcquire).toHaveBeenCalled();
      expect(mockLockRelease).toHaveBeenCalled();
    });

    it('should skip comment when lock cannot be acquired', async () => {
      mockLockAcquire.mockResolvedValue(false);

      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 51 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).not.toHaveBeenCalled();
      expect(mockLockRelease).not.toHaveBeenCalled();
      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('Another comment in progress'))).toBe(true);
    });

    it('should release lock even when addComment throws', async () => {
      mockGhAddComment.mockRejectedValue(new Error('network error'));

      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 52 } },
      });
      const data = makeCompletionData();

      await expect(svc.syncUserStory(usFile, data, client)).rejects.toThrow('network error');

      expect(mockLockRelease).toHaveBeenCalled();
    });

    it('should release lock even when getLastComment throws', async () => {
      mockGhGetLastComment.mockRejectedValue(new Error('api error'));

      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 53 } },
      });
      const data = makeCompletionData();

      await expect(svc.syncUserStory(usFile, data, client)).rejects.toThrow('api error');

      expect(mockLockRelease).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // JIRA sync
  // =========================================================================

  describe('JIRA sync', () => {
    it('should post comment to JIRA issue for external US', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { jira: { key: 'PROJ-123' } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockJiraAddComment).toHaveBeenCalledWith('PROJ-123', expect.any(String));
    });

    it('should use external_id as fallback for JIRA key', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_id: 'SPEC-456',
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockJiraAddComment).toHaveBeenCalledWith('SPEC-456', expect.any(String));
    });

    it('should skip JIRA comment when no issue key', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeJiraClient();
      const usFile = makeUSFile({ origin: 'external' });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockJiraAddComment).not.toHaveBeenCalled();
    });

    it('should transition JIRA status at 100% when canUpdateStatus is true', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { jira: { key: 'PROJ-789' } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockJiraUpdateIssue).toHaveBeenCalledWith({
        key: 'PROJ-789',
        status: 'Done',
      });
    });

    it('should not transition JIRA status when key has no dash', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_id: 'NODASH',
        external_tools: { jira: {} },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      // issueKey = usFile.external_id = 'NODASH', no dash so updateIssue not called
      expect(mockJiraUpdateIssue).not.toHaveBeenCalled();
    });

    it('should post comment to JIRA for internal US with canUpdateExternalItems', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { jira: { key: 'PROJ-100' } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockJiraAddComment).toHaveBeenCalledWith('PROJ-100', expect.any(String));
    });

    it('should handle lock failure for JIRA comment', async () => {
      mockLockAcquire.mockResolvedValue(false);

      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { jira: { key: 'PROJ-200' } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockJiraAddComment).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // ADO sync
  // =========================================================================

  describe('ADO sync', () => {
    it('should post comment to ADO work item for external US', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { ado: { id: 100 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoAddComment).toHaveBeenCalledWith(100, expect.any(String));
    });

    it('should use external_id as fallback for ADO work item ID', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_id: '200',
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoAddComment).toHaveBeenCalledWith(200, expect.any(String));
    });

    it('should skip ADO comment when work item ID is 0', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { ado: { id: 0 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoAddComment).not.toHaveBeenCalled();
    });

    it('should skip ADO comment when no ID at all', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeAdoClient();
      const usFile = makeUSFile({ origin: 'external' });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoAddComment).not.toHaveBeenCalled();
    });

    it('should update ADO status to Closed at 100%', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { ado: { id: 300 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoUpdateWorkItem).toHaveBeenCalledWith({
        id: 300,
        state: 'Closed', // ADO maps 'Done' -> 'Closed'
      });
    });

    it('should not update ADO status when work item ID is 0', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { ado: { id: 0 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoUpdateWorkItem).not.toHaveBeenCalled();
    });

    it('should handle lock failure for ADO comment', async () => {
      mockLockAcquire.mockResolvedValue(false);

      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { ado: { id: 400 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoAddComment).not.toHaveBeenCalled();
    });

    it('should post comment to ADO for internal US with canUpdateExternalItems', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { ado: { id: 500 } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoAddComment).toHaveBeenCalledWith(500, expect.any(String));
    });
  });

  // =========================================================================
  // Status update error handling
  // =========================================================================

  describe('updateExternalStatus — error handling', () => {
    it('should catch and log GitHub closeIssue errors without throwing', async () => {
      mockGhCloseIssue.mockRejectedValue(new Error('GitHub 403'));

      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: { number: 60 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      // Should NOT throw
      await svc.syncUserStory(usFile, data, client);

      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('Status update failed'))).toBe(true);
      expect(logCalls.some((m: string) => m.includes('Manual status update'))).toBe(true);
    });

    it('should catch and log JIRA updateIssue errors without throwing', async () => {
      mockJiraUpdateIssue.mockRejectedValue(new Error('JIRA 500'));

      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { jira: { key: 'PROJ-ERR' } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('Status update failed'))).toBe(true);
    });

    it('should catch and log ADO updateWorkItem errors without throwing', async () => {
      mockAdoUpdateWorkItem.mockRejectedValue(new Error('ADO 503'));

      const svc = new FormatPreservationSyncService(
        { canUpdateStatus: true },
        { logger }
      );
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { ado: { id: 600 } },
      });
      const data = makeCompletionData({ progressPercentage: 100 });

      await svc.syncUserStory(usFile, data, client);

      const logCalls = (logger.log as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(logCalls.some((m: string) => m.includes('Status update failed'))).toBe(true);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('should handle US file with no external_tools at all', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({ origin: 'external' });
      const data = makeCompletionData();

      // Should not throw
      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).not.toHaveBeenCalled();
    });

    it('should handle 0% progress', async () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [{ taskId: 'T-001', title: 'Not started', completed: false }],
        acceptanceCriteria: [],
        progressPercentage: 0,
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('0/1 tasks completed (0%)');
      expect(comment).not.toContain('### Completed Tasks');
    });

    it('should handle special characters in task titles', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [
          { taskId: 'T-001', title: 'Handle <script>alert("xss")</script>', completed: true },
        ],
        acceptanceCriteria: [],
        progressPercentage: 100,
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('<script>alert("xss")</script>');
    });

    it('should handle empty string task titles and AC descriptions', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData({
        tasks: [{ taskId: 'T-001', title: '', completed: true }],
        acceptanceCriteria: [{ acId: 'AC-US1-01', description: '', satisfied: true }],
        progressPercentage: 100,
      });

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('[T-001] ');
      expect(comment).toContain('**AC-US1-01**: ');
    });

    it('should handle many tasks efficiently', () => {
      const svc = new FormatPreservationSyncService();
      const tasks: TaskCompletionInfo[] = Array.from({ length: 50 }, (_, i) => ({
        taskId: `T-${String(i + 1).padStart(3, '0')}`,
        title: `Task ${i + 1}`,
        completed: i < 25,
      }));
      const acs: ACCompletionInfo[] = Array.from({ length: 20 }, (_, i) => ({
        acId: `AC-US1-${String(i + 1).padStart(2, '0')}`,
        description: `AC ${i + 1}`,
        satisfied: i < 10,
      }));

      const data: CompletionCommentData = {
        tasks,
        acceptanceCriteria: acs,
        progressPercentage: 50,
      };

      const comment = svc.buildCompletionComment(data);

      expect(comment).toContain('25/50 tasks completed (50%)');
      // Should have 25 completed task lines
      const taskLines = comment.split('\n').filter(l => l.startsWith('- ') && l.includes('[T-'));
      expect(taskLines).toHaveLength(25);
    });

    it('should handle GitHub US with external_tools but no number', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeGitHubClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_tools: { github: {} }, // no number field
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockGhAddComment).not.toHaveBeenCalled();
    });

    it('should use external_id fallback for JIRA when external_tools.jira.key is empty', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeJiraClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_id: 'FALL-999',
        external_tools: { jira: { key: '' } },
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      // The code uses `usFile.external_id || usFile.external_tools?.jira?.key || ''`
      // Actually: `usFile.external_id || usFile.external_tools?.jira?.key || ''`
      // external_id = 'FALL-999' (truthy), so it should be used
      expect(mockJiraAddComment).toHaveBeenCalledWith('FALL-999', expect.any(String));
    });

    it('should handle ADO external_id string parsed to number', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_id: '42',
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      expect(mockAdoAddComment).toHaveBeenCalledWith(42, expect.any(String));
    });

    it('should handle ADO external_id that is not a valid number', async () => {
      const svc = new FormatPreservationSyncService({}, { logger });
      const client = makeAdoClient();
      const usFile = makeUSFile({
        origin: 'external',
        external_id: 'not-a-number',
      });
      const data = makeCompletionData();

      await svc.syncUserStory(usFile, data, client);

      // parseInt('not-a-number', 10) => NaN, which is falsy => skip
      expect(mockAdoAddComment).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Comment format roundtrip
  // =========================================================================

  describe('comment format roundtrip', () => {
    it('should produce identical output for identical input', () => {
      const svc = new FormatPreservationSyncService();
      const data = makeCompletionData();

      const first = svc.buildCompletionComment(data);
      const second = svc.buildCompletionComment(data);

      expect(first).toBe(second);
    });

    it('should produce different output for different completion data', () => {
      const svc = new FormatPreservationSyncService();
      const data1 = makeCompletionData({ progressPercentage: 50 });
      const data2 = makeCompletionData({ progressPercentage: 75 });

      expect(svc.buildCompletionComment(data1)).not.toBe(svc.buildCompletionComment(data2));
    });

    it('should match idempotency check expectations (comment == lastComment body)', async () => {
      const svc = new FormatPreservationSyncService(
        { canUpdateExternalItems: true },
        { logger }
      );
      const client = makeGitHubClient();
      const data = makeCompletionData();
      const usFile = makeUSFile({
        origin: 'internal',
        external_tools: { github: { number: 70 } },
      });

      // Simulate: first sync posts the comment
      const expectedComment = svc.buildCompletionComment(data);
      mockGhGetLastComment.mockResolvedValue(null);

      await svc.syncUserStory(usFile, data, client);
      expect(mockGhAddComment).toHaveBeenCalledWith(70, expectedComment);

      // Simulate: second sync sees the comment already posted
      vi.clearAllMocks();
      mockLockAcquire.mockResolvedValue(true);
      mockGhGetLastComment.mockResolvedValue({ body: expectedComment, author: 'bot' });

      await svc.syncUserStory(usFile, data, client);
      expect(mockGhAddComment).not.toHaveBeenCalled();
    });
  });
});
