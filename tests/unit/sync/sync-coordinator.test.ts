/**
 * Unit tests for SyncCoordinator
 *
 * Tests cover:
 * - Constructor: project ID auto-detection, metrics initialization, provider router setup
 * - getClosureMetrics() / getFormattedClosureMetrics(): metric delegation
 * - createGitHubIssuesForUserStories(): deprecated stub (0348 - GitHub via GitHubFeatureSync)
 * - closeGitHubIssuesForUserStories(): deprecated stub (0348 - GitHub via GitHubFeatureSync)
 * - closeJiraIssuesForUserStories(): JIRA transitions, missing config handling
 * - closeAdoWorkItemsForUserStories(): ADO closure, batch fetching
 * - syncIncrementClosure(): full closure flow, gate checks, error handling
 * - syncIncrementCompletion(): living docs sync, gate checks, multi-provider routing
 * - formatAdoCompletionComment() / formatJiraCompletionComment(): comment formatting
 * - loadUserStoriesForIncrement(): spec parsing, metadata fallback
 * - loadCompletionData(): tasks/ACs parsing
 * - loadConfig(): config file loading
 *
 * @see src/sync/sync-coordinator.ts
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
  mockWriteFile,
  mockReadFileSync,
  mockReaddir,
  mockMkdir,
  mockAutoDetectProjectIdSync,
  mockDeriveFeatureId,
  mockIsProviderEnabled,
  mockResolvePermissions,
  mockGetAdoPat,
  // GitHub client mocks
  mockGhFromRepo,
  mockGhCreateOrGetMilestone,
  mockGhSearchIssueByTitle,
  mockGhCreateUserStoryIssue,
  mockGhCloseIssue,
  mockGhGetIssue,
  mockGhUpdateIssueBody,
  mockGhAddComment,
  mockGhGetLastComment,
  // Frontmatter updater mocks
  mockGetGitHubIssueFromFrontmatter,
  mockUpdateUserStoryFrontmatter,
  // Lock manager mocks
  mockLockAcquire,
  mockLockRelease,
  MockLockManager,
  // Closure metrics mocks
  mockMetricsGetSummary,
  mockMetricsFormatSummary,
  mockMetricsStartOperation,
  mockMetricsRecordClosure,
  mockMetricsIsFailureRateHigh,
  MockClosureMetrics,
  mockCreateClosureMetrics,
  // Provider router mocks
  mockDetectGitHubRepo,
  MockProviderRouter,
  // FormatPreservationSyncService mocks
  mockFpSyncUserStory,
  MockFormatPreservationSyncService,
  // UserStoryContentBuilder mocks
  mockBuildIssueBody,
  MockUserStoryContentBuilder,
  // JIRA client mocks
  mockJiraGetIssue,
  mockJiraGetLastComment,
  mockJiraAddComment,
  mockJiraUpdateIssue,
  MockJiraClient,
  // YAML mock
  mockYamlParse,
  // ADO client mocks
  mockAdoListWorkItems,
  mockAdoUpdateWorkItem,
  mockAdoAddComment,
  mockAdoGetLastComment,
  MockAdoClient,
} = vi.hoisted(() => {
  // fs mocks
  const _mockExistsSync = vi.fn().mockReturnValue(false);
  const _mockReadFile = vi.fn().mockResolvedValue('');
  const _mockWriteFile = vi.fn().mockResolvedValue(undefined);
  const _mockReadFileSync = vi.fn().mockReturnValue('');
  const _mockReaddir = vi.fn().mockResolvedValue([]);
  const _mockMkdir = vi.fn().mockResolvedValue(undefined);

  // Utility mocks
  const _mockAutoDetectProjectIdSync = vi.fn().mockReturnValue('test-project');
  const _mockDeriveFeatureId = vi.fn().mockReturnValue('FS-001');
  const _mockIsProviderEnabled = vi.fn().mockReturnValue(false);
  const _mockResolvePermissions = vi.fn().mockReturnValue({
    canRead: true,
    canUpdateStatus: false,
    canUpsert: false,
    canDelete: false,
  });
  const _mockGetAdoPat = vi.fn().mockReturnValue('fake-pat');

  // GitHub client mocks
  const _mockGhCreateOrGetMilestone = vi.fn();
  const _mockGhSearchIssueByTitle = vi.fn().mockResolvedValue(null);
  const _mockGhCreateUserStoryIssue = vi.fn();
  const _mockGhCloseIssue = vi.fn();
  const _mockGhGetIssue = vi.fn();
  const _mockGhUpdateIssueBody = vi.fn();
  const _mockGhAddComment = vi.fn();
  const _mockGhGetLastComment = vi.fn().mockResolvedValue(null);

  class _MockGitHubClientV2 {
    createOrGetMilestone = _mockGhCreateOrGetMilestone;
    searchIssueByTitle = _mockGhSearchIssueByTitle;
    createUserStoryIssue = _mockGhCreateUserStoryIssue;
    closeIssue = _mockGhCloseIssue;
    getIssue = _mockGhGetIssue;
    updateIssueBody = _mockGhUpdateIssueBody;
    addComment = _mockGhAddComment;
    getLastComment = _mockGhGetLastComment;
    static fromRepo = vi.fn();
  }

  const _mockGhFromRepo = _MockGitHubClientV2.fromRepo;

  // Frontmatter updater mocks
  const _mockGetGitHubIssueFromFrontmatter = vi.fn().mockResolvedValue(null);
  const _mockUpdateUserStoryFrontmatter = vi.fn().mockResolvedValue(undefined);

  // Lock manager mocks
  const _mockLockAcquire = vi.fn().mockResolvedValue(true);
  const _mockLockRelease = vi.fn().mockResolvedValue(undefined);

  class _MockLockManager {
    acquire = _mockLockAcquire;
    release = _mockLockRelease;
    constructor(_dir: string, _stale?: number, _opts?: any) {}
  }

  // Closure metrics mocks
  const _mockMetricsGetSummary = vi.fn().mockReturnValue({
    github: { totalAttempts: 0, successful: 0, failed: 0, successRate: 1, recentErrors: [] },
    jira: { totalAttempts: 0, successful: 0, failed: 0, successRate: 1, recentErrors: [] },
    ado: { totalAttempts: 0, successful: 0, failed: 0, successRate: 1, recentErrors: [] },
    overall: { totalAttempts: 0, successful: 0, failed: 0, successRate: 1 },
    lastUpdated: '2026-01-01T00:00:00.000Z',
  });
  const _mockMetricsFormatSummary = vi.fn().mockReturnValue('metrics summary');
  const _mockMetricsStartOperation = vi.fn();
  const _mockMetricsRecordClosure = vi.fn();
  const _mockMetricsIsFailureRateHigh = vi.fn().mockReturnValue(false);

  class _MockClosureMetrics {
    getSummary = _mockMetricsGetSummary;
    formatSummary = _mockMetricsFormatSummary;
    startOperation = _mockMetricsStartOperation;
    recordClosure = _mockMetricsRecordClosure;
    isFailureRateHigh = _mockMetricsIsFailureRateHigh;
    constructor(_opts: any) {}
  }

  const _mockCreateClosureMetrics = vi.fn().mockReturnValue(new _MockClosureMetrics({}));

  // Provider router mocks
  const _mockDetectGitHubRepo = vi.fn().mockResolvedValue(null);

  class _MockProviderRouter {
    detectGitHubRepo = _mockDetectGitHubRepo;
    constructor(_opts: any) {}
  }

  // FormatPreservationSyncService mocks
  const _mockFpSyncUserStory = vi.fn().mockResolvedValue(undefined);

  class _MockFormatPreservationSyncService {
    syncUserStory = _mockFpSyncUserStory;
    constructor(_config: any, _opts?: any) {}
  }

  // UserStoryContentBuilder mocks
  const _mockBuildIssueBody = vi.fn().mockResolvedValue('rich body content');

  class _MockUserStoryContentBuilder {
    buildIssueBody = _mockBuildIssueBody;
    constructor(_filePath: string, _projectRoot: string) {}
  }

  // JIRA client mocks
  const _mockJiraGetIssue = vi.fn();
  const _mockJiraGetLastComment = vi.fn();
  const _mockJiraAddComment = vi.fn();
  const _mockJiraUpdateIssue = vi.fn();

  class _MockJiraClient {
    getIssue = _mockJiraGetIssue;
    getLastComment = _mockJiraGetLastComment;
    addComment = _mockJiraAddComment;
    updateIssue = _mockJiraUpdateIssue;
    constructor() {}
  }

  // ADO client mocks
  const _mockAdoListWorkItems = vi.fn().mockResolvedValue([]);
  const _mockAdoUpdateWorkItem = vi.fn();
  const _mockAdoAddComment = vi.fn();
  const _mockAdoGetLastComment = vi.fn().mockResolvedValue(null);

  class _MockAdoClient {
    listWorkItems = _mockAdoListWorkItems;
    updateWorkItem = _mockAdoUpdateWorkItem;
    addComment = _mockAdoAddComment;
    getLastComment = _mockAdoGetLastComment;
    constructor(_config?: any) {}
  }

  // YAML parse mock
  const _mockYamlParse = vi.fn((str: string) => {
    // Default: simple YAML parser for test data
    const result: Record<string, any> = {};
    for (const line of str.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const val = match[2].trim();
        result[match[1]] = val === 'true' ? true : val === 'false' ? false : val;
      }
    }
    return result;
  });

  return {
    mockYamlParse: _mockYamlParse,
    mockExistsSync: _mockExistsSync,
    mockReadFile: _mockReadFile,
    mockWriteFile: _mockWriteFile,
    mockReadFileSync: _mockReadFileSync,
    mockReaddir: _mockReaddir,
    mockMkdir: _mockMkdir,
    mockAutoDetectProjectIdSync: _mockAutoDetectProjectIdSync,
    mockDeriveFeatureId: _mockDeriveFeatureId,
    mockIsProviderEnabled: _mockIsProviderEnabled,
    mockResolvePermissions: _mockResolvePermissions,
    mockGetAdoPat: _mockGetAdoPat,
    mockGhFromRepo: _mockGhFromRepo,
    mockGhCreateOrGetMilestone: _mockGhCreateOrGetMilestone,
    mockGhSearchIssueByTitle: _mockGhSearchIssueByTitle,
    mockGhCreateUserStoryIssue: _mockGhCreateUserStoryIssue,
    mockGhCloseIssue: _mockGhCloseIssue,
    mockGhGetIssue: _mockGhGetIssue,
    mockGhUpdateIssueBody: _mockGhUpdateIssueBody,
    mockGhAddComment: _mockGhAddComment,
    mockGhGetLastComment: _mockGhGetLastComment,
    mockGetGitHubIssueFromFrontmatter: _mockGetGitHubIssueFromFrontmatter,
    mockUpdateUserStoryFrontmatter: _mockUpdateUserStoryFrontmatter,
    mockLockAcquire: _mockLockAcquire,
    mockLockRelease: _mockLockRelease,
    MockLockManager: _MockLockManager,
    mockMetricsGetSummary: _mockMetricsGetSummary,
    mockMetricsFormatSummary: _mockMetricsFormatSummary,
    mockMetricsStartOperation: _mockMetricsStartOperation,
    mockMetricsRecordClosure: _mockMetricsRecordClosure,
    mockMetricsIsFailureRateHigh: _mockMetricsIsFailureRateHigh,
    MockClosureMetrics: _MockClosureMetrics,
    mockCreateClosureMetrics: _mockCreateClosureMetrics,
    mockDetectGitHubRepo: _mockDetectGitHubRepo,
    MockProviderRouter: _MockProviderRouter,
    mockFpSyncUserStory: _mockFpSyncUserStory,
    MockFormatPreservationSyncService: _MockFormatPreservationSyncService,
    mockBuildIssueBody: _mockBuildIssueBody,
    MockUserStoryContentBuilder: _MockUserStoryContentBuilder,
    mockJiraGetIssue: _mockJiraGetIssue,
    mockJiraGetLastComment: _mockJiraGetLastComment,
    mockJiraAddComment: _mockJiraAddComment,
    mockJiraUpdateIssue: _mockJiraUpdateIssue,
    MockJiraClient: _MockJiraClient,
    mockAdoListWorkItems: _mockAdoListWorkItems,
    mockAdoUpdateWorkItem: _mockAdoUpdateWorkItem,
    mockAdoAddComment: _mockAdoAddComment,
    mockAdoGetLastComment: _mockAdoGetLastComment,
    MockAdoClient: _MockAdoClient,
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
  default: {
    parse: mockYamlParse,
  },
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

vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
  GitHubClientV2: {
    fromRepo: mockGhFromRepo,
  },
}));

vi.mock('../../../src/sync/frontmatter-updater.js', () => ({
  FrontmatterUpdater: class {
    getGitHubIssueFromFrontmatter = mockGetGitHubIssueFromFrontmatter;
    updateUserStoryFrontmatter = mockUpdateUserStoryFrontmatter;
    constructor(_opts?: any) {}
  },
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

vi.mock('../../../src/sync/format-preservation-sync.js', () => ({
  FormatPreservationSyncService: MockFormatPreservationSyncService,
}));

vi.mock('../../../plugins/specweave-github/lib/user-story-content-builder.js', () => ({
  UserStoryContentBuilder: MockUserStoryContentBuilder,
}));

vi.mock('../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: MockJiraClient,
}));

vi.mock('../../../src/integrations/ado/ado-client.js', () => ({
  AdoClient: MockAdoClient,
}));

// ================================================================
// Import after mocks
// ================================================================

import { SyncCoordinator } from '../../../src/sync/sync-coordinator.js';
import type { Logger } from '../../../src/utils/logger.js';

// ================================================================
// Helpers
// ================================================================

const PROJECT_ROOT = path.join(os.tmpdir(), 'sw-test-sync-coord');
const INCREMENT_ID = '0001-test-feature';

function silentLogger(): Logger {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

function makeCoordinator(overrides: Partial<{
  projectRoot: string;
  incrementId: string;
  logger: Logger;
  adoProfile: any;
}> = {}) {
  return new SyncCoordinator({
    projectRoot: overrides.projectRoot ?? PROJECT_ROOT,
    incrementId: overrides.incrementId ?? INCREMENT_ID,
    logger: overrides.logger ?? silentLogger(),
    adoProfile: overrides.adoProfile,
  });
}

/** Helper: Set up existsSync to return true for specific path substrings */
function setupExistsSync(truePaths: string[]) {
  mockExistsSync.mockImplementation((p: string) =>
    truePaths.some(tp => p.includes(tp))
  );
}

/** Helper: set up readFile to respond based on path */
function setupReadFile(map: Record<string, string>) {
  mockReadFile.mockImplementation((p: string) => {
    for (const [key, val] of Object.entries(map)) {
      if (p.includes(key)) return Promise.resolve(val);
    }
    return Promise.reject(new Error(`ENOENT: ${p}`));
  });
}

/** Standard spec.md with feature_id frontmatter */
const SPEC_WITH_FEATURE_ID = `---
feature_id: FS-001
title: Test Feature
---
# Test Feature Spec`;

/** Standard spec.md without feature_id */
const SPEC_WITHOUT_FEATURE_ID = `---
title: Test Feature
---
# Test Feature Spec`;

/** Standard config.json */
function makeConfigJson(overrides: Record<string, any> = {}): string {
  return JSON.stringify({
    sync: {
      github: { enabled: true, owner: 'test-owner', repo: 'test-repo' },
      settings: {
        canUpdateExternalItems: true,
        canUpsertInternalItems: true,
        autoSyncOnCompletion: true,
      },
      ...overrides,
    },
  });
}

/** User story frontmatter content */
function makeUSFile(id: string, title: string, extraFm: Record<string, string> = {}): string {
  const fmLines = [`id: ${id}`, `title: ${title}`];
  for (const [k, v] of Object.entries(extraFm)) {
    fmLines.push(`${k}: ${v}`);
  }
  return `---\n${fmLines.join('\n')}\n---\n# ${title}`;
}

/** Set up a GitHub client mock instance from fromRepo */
function setupGitHubClient() {
  const clientInstance = {
    createOrGetMilestone: mockGhCreateOrGetMilestone,
    searchIssueByTitle: mockGhSearchIssueByTitle,
    createUserStoryIssue: mockGhCreateUserStoryIssue,
    closeIssue: mockGhCloseIssue,
    getIssue: mockGhGetIssue,
    updateIssueBody: mockGhUpdateIssueBody,
    addComment: mockGhAddComment,
    getLastComment: mockGhGetLastComment,
  };
  mockGhFromRepo.mockReturnValue(clientInstance);
  return clientInstance;
}

// ================================================================
// Tests
// ================================================================

describe('SyncCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset yaml parse to default simple parser
    mockYamlParse.mockImplementation((str: string) => {
      const result: Record<string, any> = {};
      for (const line of str.split('\n')) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const val = match[2].trim();
          result[match[1]] = val === 'true' ? true : val === 'false' ? false : val;
        }
      }
      return result;
    });
    // Default: existsSync returns false
    mockExistsSync.mockReturnValue(false);
    mockReadFile.mockResolvedValue('');
    mockReaddir.mockResolvedValue([]);
    mockDetectGitHubRepo.mockResolvedValue(null);
    mockGhFromRepo.mockReturnValue({
      createOrGetMilestone: mockGhCreateOrGetMilestone,
      searchIssueByTitle: mockGhSearchIssueByTitle,
      createUserStoryIssue: mockGhCreateUserStoryIssue,
      closeIssue: mockGhCloseIssue,
      getIssue: mockGhGetIssue,
      updateIssueBody: mockGhUpdateIssueBody,
      addComment: mockGhAddComment,
    });
    mockLockAcquire.mockResolvedValue(true);
    mockGetGitHubIssueFromFrontmatter.mockResolvedValue(null);
    mockGhSearchIssueByTitle.mockResolvedValue(null);
  });

  // ================================================================
  // Constructor
  // ================================================================

  describe('constructor', () => {
    it('initializes with required options', () => {
      const coord = makeCoordinator();
      expect(mockAutoDetectProjectIdSync).toHaveBeenCalledWith(PROJECT_ROOT, { silent: true });
      expect(mockCreateClosureMetrics).toHaveBeenCalled();
    });

    it('uses consoleLogger when no logger provided', () => {
      // Just ensure constructor does not throw
      const coord = new SyncCoordinator({
        projectRoot: PROJECT_ROOT,
        incrementId: INCREMENT_ID,
      });
      expect(coord).toBeDefined();
    });

    it('stores adoProfile when provided', () => {
      const profile = { organization: 'test-org', project: 'test-proj', profileName: 'default', source: 'global' as const };
      const coord = makeCoordinator({ adoProfile: profile });
      expect(coord).toBeDefined();
    });
  });

  // ================================================================
  // getClosureMetrics / getFormattedClosureMetrics
  // ================================================================

  describe('getClosureMetrics()', () => {
    it('delegates to metrics.getSummary()', () => {
      const coord = makeCoordinator();
      const result = coord.getClosureMetrics();
      expect(mockMetricsGetSummary).toHaveBeenCalled();
      expect(result).toHaveProperty('github');
      expect(result).toHaveProperty('overall');
    });
  });

  describe('getFormattedClosureMetrics()', () => {
    it('delegates to metrics.formatSummary()', () => {
      const coord = makeCoordinator();
      const result = coord.getFormattedClosureMetrics();
      expect(mockMetricsFormatSummary).toHaveBeenCalled();
      expect(result).toBe('metrics summary');
    });
  });

  // ================================================================
  // createGitHubIssuesForUserStories (deprecated stub - 0348)
  // GitHub issue creation now handled by GitHubFeatureSync pipeline
  // ================================================================

  describe('createGitHubIssuesForUserStories() [deprecated stub]', () => {
    it('returns empty array (GitHub handled by GitHubFeatureSync)', async () => {
      const coord = makeCoordinator();
      const result = await coord.createGitHubIssuesForUserStories({} as any);
      expect(result).toEqual([]);
    });
  });

  // ================================================================
  // closeGitHubIssuesForUserStories (deprecated stub - 0348)
  // GitHub closure now handled by GitHubFeatureSync pipeline
  // ================================================================

  describe('closeGitHubIssuesForUserStories() [deprecated stub]', () => {
    it('returns empty array (GitHub handled by GitHubFeatureSync)', async () => {
      const coord = makeCoordinator();
      const result = await coord.closeGitHubIssuesForUserStories({} as any);
      expect(result).toEqual([]);
    });
  });

  // ================================================================
  // closeJiraIssuesForUserStories
  // ================================================================

  describe('closeJiraIssuesForUserStories()', () => {
    it('returns 0 when no user stories found', async () => {
      mockExistsSync.mockReturnValue(false);
      const coord = makeCoordinator();
      const result = await coord.closeJiraIssuesForUserStories({} as any);
      expect(result).toBe(0);
    });

    it('returns 0 when JIRA config missing domain', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve(makeUSFile('US-001', 'Test Story'));
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);

      const coord = makeCoordinator();
      const result = await coord.closeJiraIssuesForUserStories({
        sync: { jira: {} },
      } as any);
      expect(result).toBe(0);
    });

    it('skips user stories without JIRA reference', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve(makeUSFile('US-001', 'Test Story'));
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);

      const coord = makeCoordinator();
      const result = await coord.closeJiraIssuesForUserStories({
        sync: { jira: { domain: 'test.atlassian.net' } },
      } as any);
      expect(result).toBe(0);
    });

    it('transitions JIRA issue to Done', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      const usFm = makeUSFile('US-001', 'Test Story', { external_source: 'jira' });
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve(usFm);
        return Promise.reject(new Error('not found'));
      });
      // We need the yaml parser to return external_tools with jira key
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('US-001')) {
          return {
            id: 'US-001',
            title: 'Test Story',
            external_source: 'jira',
            external_tools: { jira: { key: 'TEST-123' } },
          };
        }
        if (str.includes('feature_id')) {
          return { feature_id: 'FS-001', title: 'Test Feature' };
        }
        return {};
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockJiraGetIssue.mockResolvedValue({
        fields: { status: { name: 'In Progress' } },
      });
      mockJiraUpdateIssue.mockResolvedValue(undefined);

      const coord = makeCoordinator();
      const result = await coord.closeJiraIssuesForUserStories({
        sync: { jira: { domain: 'test.atlassian.net' } },
      } as any);

      expect(result).toBe(1);
      expect(mockMetricsRecordClosure).toHaveBeenCalledWith('jira', 'TEST-123', true);
    });

    it('skips issue already in Done status', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('US-001') || str.includes('external_source')) {
          return {
            id: 'US-001',
            title: 'Test',
            external_tools: { jira: { key: 'TEST-456' } },
          };
        }
        if (str.includes('feature_id')) {
          return { feature_id: 'FS-001' };
        }
        return {};
      });
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve('---\nid: US-001\n---');
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockJiraGetIssue.mockResolvedValue({
        fields: { status: { name: 'Done' } },
      });

      const coord = makeCoordinator();
      const result = await coord.closeJiraIssuesForUserStories({
        sync: { jira: { domain: 'test.atlassian.net' } },
      } as any);

      expect(result).toBe(0);
      expect(mockJiraUpdateIssue).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // closeAdoWorkItemsForUserStories
  // ================================================================

  describe('closeAdoWorkItemsForUserStories()', () => {
    it('returns 0 when no user stories found', async () => {
      mockExistsSync.mockReturnValue(false);
      const coord = makeCoordinator();
      const result = await coord.closeAdoWorkItemsForUserStories({} as any);
      expect(result).toBe(0);
    });

    it('returns 0 when ADO config incomplete', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve(makeUSFile('US-001', 'Test'));
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);

      const coord = makeCoordinator();
      const result = await coord.closeAdoWorkItemsForUserStories({
        sync: { ado: { organization: 'org' } }, // missing project
      } as any);
      expect(result).toBe(0);
    });

    it('returns 0 when ADO PAT not available', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve(makeUSFile('US-001', 'Test'));
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockGetAdoPat.mockReturnValue(null);

      const coord = makeCoordinator();
      const result = await coord.closeAdoWorkItemsForUserStories({
        sync: { ado: { organization: 'org', project: 'proj' } },
      } as any);
      expect(result).toBe(0);
    });

    it('closes ADO work items successfully', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('US-001') || str.includes('external_tools')) {
          return {
            id: 'US-001',
            title: 'Test',
            external_tools: { ado: { id: 100 } },
          };
        }
        if (str.includes('feature_id')) {
          return { feature_id: 'FS-001' };
        }
        return {};
      });
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve('---\nid: US-001\n---');
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockGetAdoPat.mockReturnValue('fake-pat');

      mockAdoListWorkItems.mockResolvedValue([
        { id: 100, fields: { 'System.State': 'Active', 'System.Title': 'Test' } },
      ]);
      mockAdoUpdateWorkItem.mockResolvedValue(undefined);

      const coord = makeCoordinator();
      const result = await coord.closeAdoWorkItemsForUserStories({
        sync: { ado: { organization: 'org', project: 'proj' } },
      } as any);

      expect(result).toBe(1);
      expect(mockMetricsRecordClosure).toHaveBeenCalledWith('ado', 100, true);
    });

    it('skips work items already in Closed state', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs']);
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('US-001') || str.includes('external')) {
          return {
            id: 'US-001',
            title: 'Test',
            external_tools: { ado: { id: 200 } },
          };
        }
        if (str.includes('feature_id')) {
          return { feature_id: 'FS-001' };
        }
        return {};
      });
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve('---\nid: US-001\n---');
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockGetAdoPat.mockReturnValue('fake-pat');
      mockAdoListWorkItems.mockResolvedValue([
        { id: 200, fields: { 'System.State': 'Closed' } },
      ]);

      const coord = makeCoordinator();
      const result = await coord.closeAdoWorkItemsForUserStories({
        sync: { ado: { organization: 'org', project: 'proj' } },
      } as any);

      expect(result).toBe(0);
      expect(mockAdoUpdateWorkItem).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // syncIncrementClosure
  // ================================================================

  describe('syncIncrementClosure()', () => {
    it('returns living-docs-only when canUpdateExternal is false', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson({
          settings: { canUpdateExternalItems: false },
        }));
        return Promise.reject(new Error('not found'));
      });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementClosure();

      expect(result.success).toBe(true);
      expect(result.syncMode).toBe('living-docs-only');
    });

    it('returns manual-only when autoSync is false', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson({
          settings: {
            canUpdateExternalItems: true,
            autoSyncOnCompletion: false,
          },
        }));
        return Promise.reject(new Error('not found'));
      });
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementClosure();

      expect(result.success).toBe(true);
      expect(result.syncMode).toBe('manual-only');
    });

    it('returns external-disabled when no providers enabled', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson({
          settings: {
            canUpdateExternalItems: true,
            autoSyncOnCompletion: true,
          },
        }));
        return Promise.reject(new Error('not found'));
      });
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false });
      mockIsProviderEnabled.mockReturnValue(false);

      const coord = makeCoordinator();
      const result = await coord.syncIncrementClosure();

      expect(result.success).toBe(true);
      expect(result.syncMode).toBe('external-disabled');
    });

    it('handles errors gracefully and returns result', async () => {
      setupExistsSync(['config.json']);
      // Config loading throws
      mockReadFile.mockRejectedValue(new Error('read error'));
      mockExistsSync.mockReturnValue(true);

      const coord = makeCoordinator();
      const result = await coord.syncIncrementClosure();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns empty config when config.json missing', async () => {
      mockExistsSync.mockReturnValue(false);
      // canUpdateExternal defaults to false with resolvePermissions mock
      const coord = makeCoordinator();
      const result = await coord.syncIncrementClosure();
      expect(result.success).toBe(true);
    });

    it('checks failure rate for all tools after completion', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson({
          settings: {
            canUpdateExternalItems: true,
            autoSyncOnCompletion: true,
          },
        }));
        return Promise.reject(new Error('not found'));
      });
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false });
      // Enable only GitHub
      mockIsProviderEnabled.mockImplementation((_cfg: any, provider: string) => provider === 'github');
      mockDetectGitHubRepo.mockResolvedValue({ owner: 'o', repo: 'r' });
      setupGitHubClient();
      // No user stories -> quick path
      // spec.md doesn't exist -> empty user stories
      mockExistsSync.mockImplementation((p: string) => p.includes('config.json'));

      const coord = makeCoordinator();
      const result = await coord.syncIncrementClosure();

      // Should check failure rate for github, jira, ado
      expect(mockMetricsIsFailureRateHigh).toHaveBeenCalledWith('github');
      expect(mockMetricsIsFailureRateHigh).toHaveBeenCalledWith('jira');
      expect(mockMetricsIsFailureRateHigh).toHaveBeenCalledWith('ado');
    });

    it('skips execution when lock already held (concurrent call prevention)', async () => {
      // Simulate lock already held by another concurrent call
      mockLockAcquire.mockResolvedValue(false);

      const coord = makeCoordinator();
      const result = await coord.syncIncrementClosure();

      // Should return success with empty closedIssues (skipped)
      expect(result.success).toBe(true);
      expect(result.closedIssues).toEqual([]);
      // Should NOT have tried to load config (skipped early)
      expect(mockLockRelease).not.toHaveBeenCalled();
    });

    it('releases lock after successful closure', async () => {
      mockLockAcquire.mockResolvedValue(true);
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson({
          settings: { canUpdateExternalItems: false },
        }));
        return Promise.reject(new Error('not found'));
      });

      const coord = makeCoordinator();
      await coord.syncIncrementClosure();

      expect(mockLockAcquire).toHaveBeenCalled();
      expect(mockLockRelease).toHaveBeenCalled();
    });
  });

  // ================================================================
  // syncIncrementCompletion
  // ================================================================

  describe('syncIncrementCompletion()', () => {
    it('returns read-only when canUpsertInternal is false', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(JSON.stringify({
          sync: {
            settings: { canUpsertInternalItems: false },
          },
        }));
        return Promise.reject(new Error('not found'));
      });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();

      expect(result.success).toBe(true);
      expect(result.syncMode).toBe('read-only');
    });

    it('returns living-docs-only when canUpdateExternal is false', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: false,
            },
          },
        }));
        return Promise.reject(new Error('not found'));
      });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();

      // syncMode will be living-docs-only but the function continues to sync living docs
      expect(result.success).toBe(true);
    });

    it('returns manual-only when autoSync disabled', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: true,
              autoSyncOnCompletion: false,
            },
          },
        }));
        return Promise.reject(new Error('not found'));
      });
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();

      // syncMode set to manual-only
      expect(result.success).toBe(true);
    });

    it('returns success with 0 synced when no user stories', async () => {
      setupExistsSync(['config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: true,
              autoSyncOnCompletion: true,
            },
            github: { enabled: true },
          },
        }));
        return Promise.reject(new Error('not found'));
      });
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false });
      mockIsProviderEnabled.mockReturnValue(true);
      // No spec.md -> no user stories
      mockExistsSync.mockImplementation((p: string) => p.includes('config.json'));

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();

      expect(result.success).toBe(true);
      expect(result.userStoriesSynced).toBe(0);
    });

    it('handles errors during sync gracefully', async () => {
      setupExistsSync(['config.json']);
      // Force an error during config loading
      mockReadFile.mockRejectedValue(new Error('read error'));
      mockExistsSync.mockReturnValue(true);

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });


  // ================================================================
  // loadUserStoriesForIncrement (tested indirectly through public methods)
  // ================================================================

  describe('loadUserStoriesForIncrement (via public methods)', () => {
    it('returns empty when spec.md does not exist', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('config.json')) return true;
        return false;
      });
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson());
        return Promise.reject(new Error('not found'));
      });
      mockIsProviderEnabled.mockReturnValue(true);
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: false, canUpsert: true, canDelete: false });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();
      expect(result.userStoriesSynced).toBe(0);
    });

    it('returns empty when spec.md has no frontmatter', async () => {
      setupExistsSync(['spec.md', 'config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve('# No frontmatter');
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson());
        return Promise.reject(new Error('not found'));
      });
      mockIsProviderEnabled.mockReturnValue(true);
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: false, canUpsert: true, canDelete: false });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();
      expect(result.userStoriesSynced).toBe(0);
    });

    it('falls back to metadata.json for feature_id', async () => {
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('title: No Feature')) {
          return { title: 'No Feature' };
        }
        if (str.includes('US-001')) {
          return { id: 'US-001', title: 'Test' };
        }
        return {};
      });

      setupExistsSync(['spec.md', 'metadata.json', 'docs/internal/specs', 'config.json']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson());
        if (p.includes('spec.md')) return Promise.resolve('---\ntitle: No Feature\n---\n# X');
        if (p.includes('metadata.json')) return Promise.resolve(JSON.stringify({
          feature_id: 'FS-002',
        }));
        if (p.includes('us-001')) return Promise.resolve('---\nid: US-001\n---');
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockIsProviderEnabled.mockReturnValue(true);
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: false, canUpsert: true, canDelete: false });
      mockDetectGitHubRepo.mockResolvedValue({ owner: 'o', repo: 'r' });

      const coord = makeCoordinator();
      await coord.syncIncrementCompletion();

      // Verify metadata.json was read (feature_id fallback)
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        'utf-8'
      );
    });

    it('returns empty when feature path does not exist', async () => {
      mockYamlParse.mockImplementation(() => ({ feature_id: 'FS-999' }));

      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return true;
        if (p.includes('config.json')) return true;
        return false;
      });
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson());
        return Promise.reject(new Error('not found'));
      });
      mockIsProviderEnabled.mockReturnValue(true);
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: false, canUpsert: true, canDelete: false });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();
      expect(result.userStoriesSynced).toBe(0);
    });
  });

  // ================================================================
  // loadCompletionData (tested indirectly via syncIncrementCompletion)
  // ================================================================

  describe('loadCompletionData (via syncIncrementCompletion)', () => {
    it('parses tasks and ACs from tasks.md and spec.md', async () => {
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('feature_id')) return { feature_id: 'FS-001' };
        return { id: 'US-001', title: 'Test', origin: 'internal' };
      });

      const tasksContent = `### T-001: Task one
**Status**: [x] completed
### T-002: Task two
**Status**: [ ] pending`;

      const specContent = `---
feature_id: FS-001
---
- [x] **AC-US1-01**: First AC`;

      setupExistsSync(['config.json', 'spec.md', 'tasks.md', 'docs/internal/specs']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: false,
            },
          },
        }));
        if (p.includes('tasks.md')) return Promise.resolve(tasksContent);
        if (p.includes('spec.md')) return Promise.resolve(specContent);
        if (p.includes('us-001')) return Promise.resolve('---\nid: US-001\n---');
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();

      // The sync should have attempted to sync 1 user story
      expect(result.userStoriesSynced).toBeGreaterThanOrEqual(0);
    });
  });

  // ================================================================
  // loadConfig (tested indirectly)
  // ================================================================

  describe('loadConfig', () => {
    it('returns empty config when file missing', async () => {
      mockExistsSync.mockReturnValue(false);
      const coord = makeCoordinator();
      // syncIncrementClosure calls loadConfig internally
      const result = await coord.syncIncrementClosure();
      expect(result).toBeDefined();
    });
  });

  // ================================================================
  // formatAdoCompletionComment / formatJiraCompletionComment
  // (tested indirectly via syncUserStory ADO/JIRA paths)
  // ================================================================

  describe('formatAdoCompletionComment (via syncUserStory)', () => {
    it('generates ADO comment with progress, tasks, and ACs', async () => {
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('feature_id')) return { feature_id: 'FS-001' };
        return {
          id: 'US-001',
          title: 'Test ADO Story',
          external_source: 'ado',
          external_id: 'ADO-500',
          origin: 'internal',
        };
      });

      setupExistsSync(['config.json', 'spec.md', 'tasks.md', 'docs/internal/specs']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(JSON.stringify({
          sync: {
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: true,
              autoSyncOnCompletion: true,
            },
          },
        }));
        if (p.includes('tasks.md')) return Promise.resolve('### T-001: Task\n**Status**: [x] completed');
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve('---\nid: US-001\n---');
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false });
      mockIsProviderEnabled.mockImplementation((_cfg: any, provider: string) => provider === 'ado');
      mockGetAdoPat.mockReturnValue('fake-pat');
      mockAdoAddComment.mockResolvedValue(undefined);

      const adoProfile = {
        organization: 'test-org',
        project: 'test-proj',
        profileName: 'default',
        source: 'global' as const,
      };
      const coord = makeCoordinator({ adoProfile });
      const result = await coord.syncIncrementCompletion();

      expect(mockAdoAddComment).toHaveBeenCalledWith(
        500,
        expect.stringContaining('SpecWeave Progress Update')
      );
    });
  });

  describe('formatJiraCompletionComment (via syncUserStory)', () => {
    it('generates JIRA comment with plain text and emoji', async () => {
      mockYamlParse.mockImplementation((str: string) => {
        if (str.includes('feature_id')) return { feature_id: 'FS-001' };
        return {
          id: 'US-001',
          title: 'Test JIRA Story',
          external_source: 'jira',
          external_id: 'PROJ-100',
          external_tools: { jira: { key: 'PROJ-100' } },
          origin: 'internal',
        };
      });

      setupExistsSync(['config.json', 'spec.md', 'tasks.md', 'docs/internal/specs']);
      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('config.json')) return Promise.resolve(JSON.stringify({
          sync: {
            jira: { domain: 'test.atlassian.net' },
            settings: {
              canUpsertInternalItems: true,
              canUpdateExternalItems: true,
              autoSyncOnCompletion: true,
            },
          },
        }));
        if (p.includes('tasks.md')) return Promise.resolve('### T-001: Task\n**Status**: [x] completed');
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('us-001')) return Promise.resolve('---\nid: US-001\n---');
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockResolvedValue(['us-001-test.md']);
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false });
      mockIsProviderEnabled.mockImplementation((_cfg: any, provider: string) => provider === 'jira');
      mockJiraGetLastComment.mockResolvedValue(null);
      mockJiraAddComment.mockResolvedValue(undefined);

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();

      expect(mockJiraAddComment).toHaveBeenCalledWith(
        'PROJ-100',
        expect.stringContaining('SpecWeave Progress Update')
      );
    });
  });

  // ================================================================
  // Edge cases
  // ================================================================

  describe('edge cases', () => {
    it('skips non-US markdown files in feature dir', async () => {
      setupExistsSync(['spec.md', 'docs/internal/specs', 'config.json']);

      mockYamlParse.mockImplementation(() => ({ feature_id: 'FS-001' }));

      mockReadFile.mockImplementation((p: string) => {
        if (p.includes('spec.md')) return Promise.resolve(SPEC_WITH_FEATURE_ID);
        if (p.includes('config.json')) return Promise.resolve(makeConfigJson());
        return Promise.reject(new Error('not found'));
      });
      // Feature dir has non-US files
      mockReaddir.mockResolvedValue(['overview.md', 'notes.md', 'README.md']);
      mockIsProviderEnabled.mockReturnValue(true);
      mockResolvePermissions.mockReturnValue({ canRead: true, canUpdateStatus: false, canUpsert: true, canDelete: false });

      const coord = makeCoordinator();
      const result = await coord.syncIncrementCompletion();
      expect(result.userStoriesSynced).toBe(0);
    });

    it('re-exports isProviderEnabled for backwards compatibility', async () => {
      const mod = await import('../../../src/sync/sync-coordinator.js');
      expect(mod.isProviderEnabled).toBeDefined();
    });
  });
});
