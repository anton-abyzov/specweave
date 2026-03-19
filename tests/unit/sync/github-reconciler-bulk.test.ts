/**
 * Tests for GitHub reconciler bulk fetch + recency window optimization.
 *
 * Covers:
 * - bulkFetchIssueStates() single-call optimization
 * - reconcileIssue() map lookup vs getIssue() fallback
 * - Default vs full mode limits
 * - Milestone fetch capping (per_page=20 vs --paginate)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockExistsSync,
  mockReadFile,
  mockReaddir,
  mockWriteFile,
  mockGetIssue,
  mockCloseIssue,
  mockReopenIssue,
  mockSearchIssuesByFeature,
  mockDetectRepo,
  mockFromRepo,
  mockResolvePermissions,
  mockDeriveFeatureId,
  mockAddComment,
  mockCheckRateLimit,
  mockIsProviderEnabled,
  mockBulkFetchIssueStates,
  mockExecFileNoThrow,
} = vi.hoisted(() => {
  const _mockGetIssue = vi.fn();
  const _mockCloseIssue = vi.fn();
  const _mockReopenIssue = vi.fn();
  const _mockSearchIssuesByFeature = vi.fn();
  const _mockAddComment = vi.fn();
  const _mockCheckRateLimit = vi.fn();
  const _mockBulkFetchIssueStates = vi.fn();

  const _mockFromRepo = vi.fn(() => ({
    getIssue: _mockGetIssue,
    closeIssue: _mockCloseIssue,
    reopenIssue: _mockReopenIssue,
    searchIssuesByFeature: _mockSearchIssuesByFeature,
    addComment: _mockAddComment,
    checkRateLimit: _mockCheckRateLimit,
    bulkFetchIssueStates: _mockBulkFetchIssueStates,
  }));

  return {
    mockExistsSync: vi.fn(),
    mockReadFile: vi.fn(),
    mockReaddir: vi.fn(),
    mockWriteFile: vi.fn(),
    mockGetIssue: _mockGetIssue,
    mockCloseIssue: _mockCloseIssue,
    mockReopenIssue: _mockReopenIssue,
    mockSearchIssuesByFeature: _mockSearchIssuesByFeature,
    mockDetectRepo: vi.fn(),
    mockFromRepo: _mockFromRepo,
    mockResolvePermissions: vi.fn(),
    mockDeriveFeatureId: vi.fn(),
    mockAddComment: _mockAddComment,
    mockCheckRateLimit: _mockCheckRateLimit,
    mockIsProviderEnabled: vi.fn(),
    mockBulkFetchIssueStates: _mockBulkFetchIssueStates,
    mockExecFileNoThrow: vi.fn(),
  };
});

// Mock fs
vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  promises: {
    readFile: mockReadFile,
    readdir: mockReaddir,
    writeFile: mockWriteFile,
  },
}));

vi.mock('yaml', () => ({
  default: { parse: vi.fn(), stringify: vi.fn() },
}));

// Mock GitHubClientV2
vi.mock('../../../plugins/specweave/lib/integrations/github/github-client-v2.js', () => ({
  GitHubClientV2: {
    detectRepo: mockDetectRepo,
    fromRepo: mockFromRepo,
  },
}));

// Mock config
vi.mock('../../../src/sync/config.js', () => ({
  resolvePermissions: mockResolvePermissions,
}));

// Mock feature-id-derivation
vi.mock('../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: mockDeriveFeatureId,
}));

// Mock status-mapper
vi.mock('../../../src/sync/status-mapper.js', () => ({
  isProviderEnabled: mockIsProviderEnabled,
}));

// Mock reconciler lock
vi.mock('../../../src/sync/reconciler-lock.js', () => ({
  acquireLock: vi.fn().mockResolvedValue(true),
  releaseLock: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock execFileNoThrow for reconcileMilestones (dynamic import)
vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

// Import AFTER mocks
import { GitHubReconciler } from '../../../src/sync/github-reconciler.js';
import type { Logger } from '../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function silentLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

function enabledConfig() {
  return JSON.stringify({
    sync: {
      github: { enabled: true, owner: 'test-owner', repo: 'test-repo' },
      settings: { canUpdateExternalItems: true },
    },
  });
}

function buildMetadata(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    status: 'completed',
    feature_id: 'FS-001',
    github: { issue: 42, url: 'https://github.com/test/repo/issues/42' },
    ...overrides,
  });
}

function dirent(name: string, isDir: boolean) {
  return { name, isDirectory: () => isDir };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubReconciler — bulk fetch & recency window', () => {
  const PROJECT_ROOT = '/fake/project';
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    (GitHubReconciler as any).lastReconcileTime = 0;
    logger = silentLogger();

    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p !== 'string') return false;
      if (p.endsWith('config.json')) return true;
      if (p.endsWith('metadata.json')) return true;
      if (p.endsWith('/increments') || p.endsWith('/increments/')) return true;
      return false;
    });

    mockResolvePermissions.mockReturnValue({
      canRead: true,
      canUpdateStatus: true,
      canUpsert: true,
      canDelete: false,
    });

    mockIsProviderEnabled.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue({ remaining: 5000, limit: 5000 });
    mockDetectRepo.mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });

    mockDeriveFeatureId.mockImplementation((id: string) => {
      const match = id.match(/^(\d+)/);
      if (!match) return null;
      return `FS-${String(parseInt(match[1], 10)).padStart(3, '0')}`;
    });

    mockSearchIssuesByFeature.mockResolvedValue([]);
    mockBulkFetchIssueStates.mockResolvedValue(new Map());
    mockCloseIssue.mockResolvedValue(undefined);
    mockReopenIssue.mockResolvedValue(undefined);
  });

  // =========================================================================
  // TC-001: bulkFetchIssueStates called once per reconcile
  // =========================================================================

  it('TC-001: calls bulkFetchIssueStates exactly once per reconcile (single bulk search)', async () => {
    mockBulkFetchIssueStates.mockResolvedValue(new Map([[42, 'closed']]));

    mockReadFile
      .mockResolvedValueOnce(enabledConfig())
      .mockResolvedValueOnce(buildMetadata({ status: 'completed' }));
    mockReaddir.mockResolvedValue([dirent('0001-test', true)]);

    const reconciler = new GitHubReconciler({ projectRoot: PROJECT_ROOT, logger });
    await reconciler.reconcile();

    expect(mockBulkFetchIssueStates).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // TC-002: Issue in bulk map — skip getIssue
  // =========================================================================

  it('TC-002: does NOT call getIssue when issue state is in the bulk map', async () => {
    mockBulkFetchIssueStates.mockResolvedValue(new Map([[42, 'closed']]));

    mockReadFile
      .mockResolvedValueOnce(enabledConfig())
      .mockResolvedValueOnce(buildMetadata({ status: 'completed' }));
    mockReaddir.mockResolvedValue([dirent('0001-test', true)]);

    const reconciler = new GitHubReconciler({ projectRoot: PROJECT_ROOT, logger });
    await reconciler.reconcile();

    expect(mockGetIssue).not.toHaveBeenCalled();
  });

  // =========================================================================
  // TC-003: Issue NOT in bulk map — fallback to getIssue
  // =========================================================================

  it('TC-003: falls back to getIssue when issue is NOT in the bulk map', async () => {
    mockBulkFetchIssueStates.mockResolvedValue(new Map()); // empty map
    mockGetIssue.mockResolvedValue({ state: 'closed' });

    mockReadFile
      .mockResolvedValueOnce(enabledConfig())
      .mockResolvedValueOnce(buildMetadata({ status: 'completed' }));
    mockReaddir.mockResolvedValue([dirent('0001-test', true)]);

    const reconciler = new GitHubReconciler({ projectRoot: PROJECT_ROOT, logger });
    await reconciler.reconcile();

    expect(mockGetIssue).toHaveBeenCalledWith(42);
  });

  // =========================================================================
  // TC-004: Default mode → limit=100
  // =========================================================================

  it('TC-004: default mode passes limit=100 to bulkFetchIssueStates', async () => {
    mockBulkFetchIssueStates.mockResolvedValue(new Map());
    mockGetIssue.mockResolvedValue({ state: 'closed' });

    mockReadFile
      .mockResolvedValueOnce(enabledConfig())
      .mockResolvedValueOnce(buildMetadata({ status: 'completed' }));
    mockReaddir.mockResolvedValue([dirent('0001-test', true)]);

    const reconciler = new GitHubReconciler({ projectRoot: PROJECT_ROOT, logger });
    await reconciler.reconcile();

    expect(mockBulkFetchIssueStates).toHaveBeenCalledWith(100);
  });

  // =========================================================================
  // TC-005: Full mode → limit=1000
  // =========================================================================

  it('TC-005: full mode passes limit=1000 to bulkFetchIssueStates', async () => {
    mockBulkFetchIssueStates.mockResolvedValue(new Map());
    mockGetIssue.mockResolvedValue({ state: 'closed' });

    mockReadFile
      .mockResolvedValueOnce(enabledConfig())
      .mockResolvedValueOnce(buildMetadata({ status: 'completed' }));
    mockReaddir.mockResolvedValue([dirent('0001-test', true)]);

    const reconciler = new GitHubReconciler({ projectRoot: PROJECT_ROOT, full: true, logger });
    await reconciler.reconcile();

    expect(mockBulkFetchIssueStates).toHaveBeenCalledWith(1000);
  });

  // =========================================================================
  // TC-006: Default milestone fetch — per_page=20, no --paginate
  // =========================================================================

  it('TC-006: default milestone fetch uses per_page=20 without --paginate', async () => {
    mockReadFile.mockResolvedValueOnce(enabledConfig());
    mockExecFileNoThrow.mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
    });

    await GitHubReconciler.reconcileMilestones(PROJECT_ROOT, false, logger);

    expect(mockExecFileNoThrow).toHaveBeenCalled();
    const call = mockExecFileNoThrow.mock.calls[0];
    const args = call[1] as string[];
    expect(args.some((a: string) => a.includes('per_page=20'))).toBe(true);
    expect(args).not.toContain('--paginate');
  });

  // =========================================================================
  // TC-007: Full milestone fetch — uses --paginate
  // =========================================================================

  it('TC-007: full mode milestone fetch uses --paginate', async () => {
    mockReadFile.mockResolvedValueOnce(enabledConfig());
    mockExecFileNoThrow.mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
    });

    await GitHubReconciler.reconcileMilestones(PROJECT_ROOT, false, logger, true);

    expect(mockExecFileNoThrow).toHaveBeenCalled();
    const call = mockExecFileNoThrow.mock.calls[0];
    const args = call[1] as string[];
    expect(args).toContain('--paginate');
  });

  // =========================================================================
  // TC-008: full=true propagated to both bulk fetch and milestones
  // =========================================================================

  it('TC-008: full=true propagates to bulk fetch (1000) and milestones (--paginate)', async () => {
    // Part 1: Verify bulk fetch gets 1000
    mockBulkFetchIssueStates.mockResolvedValue(new Map());
    mockGetIssue.mockResolvedValue({ state: 'closed' });

    mockReadFile
      .mockResolvedValueOnce(enabledConfig())
      .mockResolvedValueOnce(buildMetadata({ status: 'completed' }));
    mockReaddir.mockResolvedValue([dirent('0001-test', true)]);

    const reconciler = new GitHubReconciler({ projectRoot: PROJECT_ROOT, full: true, logger });
    await reconciler.reconcile();

    expect(mockBulkFetchIssueStates).toHaveBeenCalledWith(1000);

    // Part 2: Verify milestones get --paginate
    vi.clearAllMocks();
    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p !== 'string') return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });
    mockReadFile.mockResolvedValueOnce(enabledConfig());
    mockExecFileNoThrow.mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
    });

    await GitHubReconciler.reconcileMilestones(PROJECT_ROOT, false, logger, true);

    const call = mockExecFileNoThrow.mock.calls[0];
    const args = call[1] as string[];
    expect(args).toContain('--paginate');
  });
});
