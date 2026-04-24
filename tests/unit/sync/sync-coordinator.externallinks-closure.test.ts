/**
 * Hotfix 0696: multi-provider closure via externalLinks fallback
 *
 * These tests prove that SyncCoordinator:
 * 1. Reads metadata.externalLinks.jira.epicKey as a fallback JIRA key source
 * 2. Reads metadata.externalLinks.ado.workItemId (and featureId) as a fallback
 *    ADO work item source
 * 3. Propagates per-US provider errors into the returned result.errors
 * 4. Emits a loud warning when a provider is enabled but no key is resolvable
 *
 * Each test starts RED on HEAD (pre-fix) and turns GREEN after the fix is
 * applied to src/sync/sync-coordinator.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import os from 'os';
import path from 'path';

// ================================================================
// Hoisted mocks
// ================================================================

const {
  mockExistsSync,
  mockReadFile,
  mockReadFileSync,
  mockReaddir,
  mockWriteFile,
  mockMkdir,
  mockAutoDetectProjectIdSync,
  mockDeriveFeatureId,
  mockIsProviderEnabled,
  mockResolvePermissions,
  mockGetAdoPat,
  mockLockAcquire,
  mockLockRelease,
  MockLockManager,
  mockCreateClosureMetrics,
  MockClosureMetrics,
  mockMetricsRecordClosure,
  mockMetricsStartOperation,
  mockMetricsIsFailureRateHigh,
  MockProviderRouter,
  mockJiraGetIssue,
  mockJiraUpdateIssue,
  MockJiraClient,
  mockAdoListWorkItems,
  mockAdoUpdateWorkItem,
  MockAdoClient,
  mockYamlParse,
} = vi.hoisted(() => {
  const _mockExistsSync = vi.fn().mockReturnValue(false);
  const _mockReadFile = vi.fn().mockResolvedValue('');
  const _mockReadFileSync = vi.fn().mockReturnValue('');
  const _mockReaddir = vi.fn().mockResolvedValue([]);
  const _mockWriteFile = vi.fn().mockResolvedValue(undefined);
  const _mockMkdir = vi.fn().mockResolvedValue(undefined);

  const _mockAutoDetectProjectIdSync = vi.fn().mockReturnValue('test-project');
  const _mockDeriveFeatureId = vi.fn().mockReturnValue('FS-001');
  const _mockIsProviderEnabled = vi.fn().mockReturnValue(false);
  const _mockResolvePermissions = vi.fn().mockReturnValue({
    canRead: true,
    canUpdateStatus: true,
    canUpsert: true,
    canDelete: false,
  });
  const _mockGetAdoPat = vi.fn().mockReturnValue('fake-pat');

  const _mockLockAcquire = vi.fn().mockResolvedValue(true);
  const _mockLockRelease = vi.fn().mockResolvedValue(undefined);
  class _MockLockManager {
    acquire = _mockLockAcquire;
    release = _mockLockRelease;
    constructor(_dir: string, _stale?: number, _opts?: any) {}
  }

  const _mockMetricsStartOperation = vi.fn();
  const _mockMetricsRecordClosure = vi.fn();
  const _mockMetricsIsFailureRateHigh = vi.fn().mockReturnValue(false);
  class _MockClosureMetrics {
    getSummary = vi.fn().mockReturnValue({});
    formatSummary = vi.fn().mockReturnValue('');
    startOperation = _mockMetricsStartOperation;
    recordClosure = _mockMetricsRecordClosure;
    isFailureRateHigh = _mockMetricsIsFailureRateHigh;
    constructor(_opts: any) {}
  }
  const _mockCreateClosureMetrics = vi.fn().mockReturnValue(new _MockClosureMetrics({}));

  class _MockProviderRouter {
    detectGitHubRepo = vi.fn().mockResolvedValue(null);
    constructor(_opts: any) {}
  }

  const _mockJiraGetIssue = vi.fn();
  const _mockJiraUpdateIssue = vi.fn();
  class _MockJiraClient {
    getIssue = _mockJiraGetIssue;
    updateIssue = _mockJiraUpdateIssue;
    getLastComment = vi.fn();
    addComment = vi.fn();
    constructor() {}
  }

  const _mockAdoListWorkItems = vi.fn().mockResolvedValue([]);
  const _mockAdoUpdateWorkItem = vi.fn();
  class _MockAdoClient {
    listWorkItems = _mockAdoListWorkItems;
    updateWorkItem = _mockAdoUpdateWorkItem;
    addComment = vi.fn();
    getLastComment = vi.fn();
    detectProcessTemplate = vi.fn().mockResolvedValue({ template: 'Basic' });
    constructor(_config?: any) {}
  }

  const _mockYamlParse = vi.fn((str: string) => {
    const result: Record<string, any> = {};
    for (const line of str.split('\n')) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (m) {
        const v = m[2].trim();
        result[m[1]] = v === 'true' ? true : v === 'false' ? false : v;
      }
    }
    return result;
  });

  return {
    mockExistsSync: _mockExistsSync,
    mockReadFile: _mockReadFile,
    mockReadFileSync: _mockReadFileSync,
    mockReaddir: _mockReaddir,
    mockWriteFile: _mockWriteFile,
    mockMkdir: _mockMkdir,
    mockAutoDetectProjectIdSync: _mockAutoDetectProjectIdSync,
    mockDeriveFeatureId: _mockDeriveFeatureId,
    mockIsProviderEnabled: _mockIsProviderEnabled,
    mockResolvePermissions: _mockResolvePermissions,
    mockGetAdoPat: _mockGetAdoPat,
    mockLockAcquire: _mockLockAcquire,
    mockLockRelease: _mockLockRelease,
    MockLockManager: _MockLockManager,
    mockCreateClosureMetrics: _mockCreateClosureMetrics,
    MockClosureMetrics: _MockClosureMetrics,
    mockMetricsRecordClosure: _mockMetricsRecordClosure,
    mockMetricsStartOperation: _mockMetricsStartOperation,
    mockMetricsIsFailureRateHigh: _mockMetricsIsFailureRateHigh,
    MockProviderRouter: _MockProviderRouter,
    mockJiraGetIssue: _mockJiraGetIssue,
    mockJiraUpdateIssue: _mockJiraUpdateIssue,
    MockJiraClient: _MockJiraClient,
    mockAdoListWorkItems: _mockAdoListWorkItems,
    mockAdoUpdateWorkItem: _mockAdoUpdateWorkItem,
    MockAdoClient: _MockAdoClient,
    mockYamlParse: _mockYamlParse,
  };
});

// ================================================================
// Module mocks
// ================================================================

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    readdir: mockReaddir,
    mkdir: mockMkdir,
  },
}));

vi.mock('yaml', () => ({
  default: { parse: mockYamlParse },
}));

vi.mock('../../../src/utils/project-detection.js', () => ({
  autoDetectProjectIdSync: mockAutoDetectProjectIdSync,
}));

vi.mock('../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: mockDeriveFeatureId,
}));

vi.mock('../../../src/sync/status-mapper.js', () => ({
  isProviderEnabled: mockIsProviderEnabled,
  StatusMapper: class {},
}));

vi.mock('../../../src/sync/config.js', () => ({
  resolvePermissions: mockResolvePermissions,
  PRESET_DEFAULTS: {},
}));

vi.mock('../../../src/integrations/ado/ado-pat-provider.js', () => ({
  getAdoPat: mockGetAdoPat,
}));

vi.mock('../../../src/utils/lock-manager.js', () => ({
  LockManager: MockLockManager,
}));

vi.mock('../../../src/sync/closure-metrics.js', () => ({
  ClosureMetrics: MockClosureMetrics,
  createClosureMetrics: mockCreateClosureMetrics,
}));

vi.mock('../../../src/sync/provider-router.js', () => ({
  ProviderRouter: MockProviderRouter,
}));

vi.mock('../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: MockJiraClient,
}));

vi.mock('../../../src/integrations/ado/ado-client.js', () => ({
  AdoClient: MockAdoClient,
}));

vi.mock('../../../src/sync/frontmatter-updater.js', () => ({
  FrontmatterUpdater: class {
    getGitHubIssueFromFrontmatter = vi.fn().mockResolvedValue(null);
    updateUserStoryFrontmatter = vi.fn().mockResolvedValue(undefined);
    constructor(_opts?: any) {}
  },
}));

vi.mock('../../../plugins/specweave/lib/integrations/github/github-client-v2.js', () => ({
  GitHubClientV2: { fromRepo: vi.fn() },
}));

vi.mock('../../../src/sync/format-preservation-sync.js', () => ({
  FormatPreservationSyncService: class {
    constructor(_config: any, _opts?: any) {}
  },
}));

// Import AFTER mocks
import { SyncCoordinator } from '../../../src/sync/sync-coordinator.js';
import type { Logger } from '../../../src/utils/logger.js';

// ================================================================
// Helpers
// ================================================================

const PROJECT_ROOT = path.join(os.tmpdir(), 'sw-test-0696-externallinks');
const INCREMENT_ID = '0696-hotfix-fixture';

function silentLogger(): Logger {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

/**
 * Set up fs mocks for an increment that has a spec.md with feature_id but
 * NO living-docs folder (so loadUserStoriesForIncrement falls back to
 * parsing from spec.md — which, since there are zero US in spec.md, yields
 * an empty list for the "epic-only" scenarios).
 *
 * For the epic-only closure fallback we actually want >= 1 US to be loaded
 * so the closure loop iterates. So we also seed a US file via readdir.
 */
function seedFs(opts: {
  metadata: Record<string, unknown>;
  userStories?: Array<{ fileName: string; content: string; parsed: Record<string, unknown> }>;
  config?: Record<string, unknown>;
}) {
  const defaultConfig = {
    sync: {
      jira: { domain: 'test.atlassian.net' },
      ado: { organization: 'test-org', project: 'test-proj' },
      settings: {
        canUpdateExternalItems: true,
        autoSyncOnCompletion: true,
      },
    },
  };
  const cfg = opts.config ?? defaultConfig;
  mockExistsSync.mockImplementation((p: string) => {
    if (p.includes('spec.md')) return true;
    if (p.includes('metadata.json')) return true;
    if (p.includes('config.json')) return true;
    if (p.includes('.specweave/docs/internal/specs')) return true;
    return false;
  });
  mockReadFile.mockImplementation((p: string) => {
    if (p.includes('spec.md')) {
      return Promise.resolve(`---\nfeature_id: FS-001\ntitle: T\n---\n# T`);
    }
    if (p.includes('metadata.json')) {
      return Promise.resolve(JSON.stringify(opts.metadata));
    }
    if (p.includes('config.json')) {
      return Promise.resolve(JSON.stringify(cfg));
    }
    const us = opts.userStories?.find(u => p.includes(u.fileName));
    if (us) return Promise.resolve(us.content);
    return Promise.reject(new Error(`ENOENT: ${p}`));
  });
  mockReadFileSync.mockImplementation((p: string) => {
    if (p.includes('metadata.json')) {
      return JSON.stringify(opts.metadata);
    }
    return '';
  });
  mockReaddir.mockResolvedValue(
    (opts.userStories ?? []).map(u => u.fileName)
  );
  const parsedByFile = new Map<string, Record<string, unknown>>();
  for (const u of opts.userStories ?? []) {
    parsedByFile.set(u.fileName, u.parsed);
  }
  mockYamlParse.mockImplementation((str: string) => {
    if (str.includes('feature_id: FS-001')) {
      return { feature_id: 'FS-001', title: 'T' };
    }
    for (const [fileName, parsed] of parsedByFile.entries()) {
      // Match by a unique substring from content
      if (str.includes(parsed.id as string)) return parsed;
    }
    // Fallback: try to parse simple KV
    const result: Record<string, unknown> = {};
    for (const line of str.split('\n')) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (m) result[m[1]] = m[2].trim();
    }
    return result;
  });
}

// ================================================================
// Tests
// ================================================================

describe('SyncCoordinator — externalLinks fallback (0696 hotfix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFile.mockResolvedValue('');
    mockReaddir.mockResolvedValue([]);
    mockLockAcquire.mockResolvedValue(true);
    mockIsProviderEnabled.mockReturnValue(false);
    mockResolvePermissions.mockReturnValue({
      canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false,
    });
  });

  // ------------------------------------------------------------------
  // T-002: JIRA epicKey fallback
  // ------------------------------------------------------------------
  describe('T-002 — closeJiraIssuesForUserStories falls back to externalLinks.jira.epicKey', () => {
    it('closes epic exactly once when no per-US or metadata.jira.issue present', async () => {
      seedFs({
        metadata: {
          id: INCREMENT_ID,
          externalLinks: { jira: { epicKey: 'SWE2E-FAKE-1' } },
        },
        userStories: [
          {
            fileName: 'us-001.md',
            content: '---\nid: US-001\ntitle: Test\n---\n# Test',
            parsed: { id: 'US-001', title: 'Test' }, // NO external_tools, NO external_id
          },
        ],
      });

      mockJiraGetIssue.mockResolvedValue({
        fields: { status: { name: 'In Progress' } },
      });
      mockJiraUpdateIssue.mockResolvedValue(undefined);

      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
        logger: silentLogger(),
      });

      const closed = await coord.closeJiraIssuesForUserStories({
        sync: { jira: { domain: 'test.atlassian.net' } },
      } as any);

      expect(closed).toBe(1);
      expect(mockJiraUpdateIssue).toHaveBeenCalledTimes(1);
      expect(mockJiraUpdateIssue).toHaveBeenCalledWith({
        key: 'SWE2E-FAKE-1',
        status: 'Done',
      });
    });
  });

  // ------------------------------------------------------------------
  // T-003: ADO workItemId fallback (via externalLinks)
  // ------------------------------------------------------------------
  describe('T-003 — closeAdoWorkItemsForUserStories falls back to externalLinks.ado', () => {
    it('closes ADO work item exactly once when only externalLinks.ado.workItemId is set', async () => {
      seedFs({
        metadata: {
          id: INCREMENT_ID,
          externalLinks: { ado: { workItemId: 9999 } },
        },
        userStories: [
          {
            fileName: 'us-001.md',
            content: '---\nid: US-001\n---\n# Test',
            parsed: { id: 'US-001', title: 'Test' },
          },
        ],
      });

      mockAdoListWorkItems.mockResolvedValue([
        { id: 9999, fields: { 'System.State': 'Active' } },
      ]);
      mockAdoUpdateWorkItem.mockResolvedValue(undefined);

      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
        logger: silentLogger(),
      });

      const closed = await coord.closeAdoWorkItemsForUserStories({
        sync: { ado: { organization: 'test-org', project: 'test-proj' } },
      } as any);

      expect(closed).toBe(1);
      expect(mockAdoUpdateWorkItem).toHaveBeenCalledTimes(1);
      expect(mockAdoUpdateWorkItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 9999 }),
      );
    });

    it('also accepts externalLinks.ado.featureId as the work item id', async () => {
      seedFs({
        metadata: {
          id: INCREMENT_ID,
          externalLinks: { ado: { featureId: '1743' } },
        },
        userStories: [
          {
            fileName: 'us-001.md',
            content: '---\nid: US-001\n---\n# Test',
            parsed: { id: 'US-001', title: 'Test' },
          },
        ],
      });

      mockAdoListWorkItems.mockResolvedValue([
        { id: 1743, fields: { 'System.State': 'Active' } },
      ]);
      mockAdoUpdateWorkItem.mockResolvedValue(undefined);

      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
        logger: silentLogger(),
      });

      const closed = await coord.closeAdoWorkItemsForUserStories({
        sync: { ado: { organization: 'test-org', project: 'test-proj' } },
      } as any);

      expect(closed).toBe(1);
      expect(mockAdoUpdateWorkItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1743 }),
      );
    });
  });

  // ------------------------------------------------------------------
  // T-004: per-US JIRA error propagates into syncIncrementClosure result.errors
  // ------------------------------------------------------------------
  describe('T-004 — per-US JIRA errors surface in syncIncrementClosure.result.errors', () => {
    it('pushes the error message into result.errors and does not throw', async () => {
      seedFs({
        metadata: {
          id: INCREMENT_ID,
          externalLinks: { jira: { epicKey: 'SWE2E-FAIL-1' } },
        },
        userStories: [
          {
            fileName: 'us-001.md',
            content: '---\nid: US-001\n---\n# Test',
            parsed: { id: 'US-001', title: 'Test' },
          },
        ],
      });

      mockIsProviderEnabled.mockImplementation((_c: any, provider: string) => provider === 'jira');
      mockJiraGetIssue.mockResolvedValue({
        fields: { status: { name: 'In Progress' } },
      });
      mockJiraUpdateIssue.mockRejectedValue(new Error('403 Forbidden'));

      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
        logger: silentLogger(),
      });

      const result = await coord.syncIncrementClosure();

      const joined = (result.errors ?? []).join(' | ');
      expect(joined).toMatch(/JIRA.*SWE2E-FAIL-1.*403 Forbidden/i);
      expect(result.success).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // T-007 / T-015: error isolation — JIRA fails, ADO still closes
  // ------------------------------------------------------------------
  describe('T-007/T-015 — provider error isolation', () => {
    it('ADO still closes when JIRA throws', async () => {
      seedFs({
        metadata: {
          id: INCREMENT_ID,
          externalLinks: {
            jira: { epicKey: 'SWE2E-FAIL-1' },
            ado: { workItemId: 9999 },
          },
        },
        userStories: [
          {
            fileName: 'us-001.md',
            content: '---\nid: US-001\n---\n# Test',
            parsed: { id: 'US-001', title: 'Test' },
          },
        ],
      });

      mockIsProviderEnabled.mockImplementation(
        (_c: any, provider: string) => provider === 'jira' || provider === 'ado',
      );
      mockJiraGetIssue.mockResolvedValue({ fields: { status: { name: 'In Progress' } } });
      mockJiraUpdateIssue.mockRejectedValue(new Error('boom'));
      mockAdoListWorkItems.mockResolvedValue([
        { id: 9999, fields: { 'System.State': 'Active' } },
      ]);
      mockAdoUpdateWorkItem.mockResolvedValue(undefined);

      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
        logger: silentLogger(),
      });

      const result = await coord.syncIncrementClosure();

      expect(mockAdoUpdateWorkItem).toHaveBeenCalledTimes(1);
      expect((result.errors ?? []).some(e => /JIRA/i.test(e))).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // T-018: AC-US4-01/02/04 end-to-end — externalLinks only fixture
  // ------------------------------------------------------------------
  describe('T-018 — end-to-end closure with externalLinks-only fixture (SWE2E-861 repro)', () => {
    it('closes both JIRA epic and ADO work item from externalLinks', async () => {
      seedFs({
        metadata: {
          id: INCREMENT_ID,
          externalLinks: {
            jira: { epicKey: 'SWE2E-FAKE-1' },
            ado: { workItemId: 9999 },
          },
        },
        userStories: [
          {
            fileName: 'us-001.md',
            content: '---\nid: US-001\n---\n# Test',
            parsed: { id: 'US-001', title: 'Test' },
          },
        ],
      });

      mockIsProviderEnabled.mockImplementation(
        (_c: any, provider: string) => provider === 'jira' || provider === 'ado',
      );
      mockJiraGetIssue.mockResolvedValue({ fields: { status: { name: 'In Progress' } } });
      mockJiraUpdateIssue.mockResolvedValue(undefined);
      mockAdoListWorkItems.mockResolvedValue([
        { id: 9999, fields: { 'System.State': 'Active' } },
      ]);
      mockAdoUpdateWorkItem.mockResolvedValue(undefined);

      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
        logger: silentLogger(),
      });

      const result = await coord.syncIncrementClosure();

      expect(mockJiraUpdateIssue).toHaveBeenCalledTimes(1);
      expect(mockJiraUpdateIssue).toHaveBeenCalledWith({
        key: 'SWE2E-FAKE-1',
        status: 'Done',
      });
      expect(mockAdoUpdateWorkItem).toHaveBeenCalledTimes(1);
      expect(mockAdoUpdateWorkItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 9999 }),
      );
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // T-017: warn when provider enabled but no key resolvable
  // ------------------------------------------------------------------
  describe('T-017 — warn when provider enabled but no key resolvable', () => {
    it('pushes a "no issue key" warning into result.errors when JIRA enabled with no link', async () => {
      seedFs({
        metadata: { id: INCREMENT_ID }, // NO externalLinks, NO metadata.jira.issue
        userStories: [
          {
            fileName: 'us-001.md',
            content: '---\nid: US-001\n---\n# Test',
            parsed: { id: 'US-001', title: 'Test' }, // no JIRA ref at all
          },
        ],
      });

      mockIsProviderEnabled.mockImplementation((_c: any, provider: string) => provider === 'jira');

      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
        logger: silentLogger(),
      });

      const result = await coord.syncIncrementClosure();

      const joined = (result.errors ?? []).join(' | ');
      expect(joined).toMatch(/JIRA enabled but no issue key/i);
    });
  });
});
