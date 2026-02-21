/**
 * Unit tests for ExternalIssueAutoCreator
 *
 * Tests the auto-creation of external issues (GitHub/JIRA/ADO) for increments
 * when they don't have linked issues. Covers:
 * - Provider detection (GitHub, JIRA, ADO) from various config shapes
 * - Auto-create enablement logic (new + legacy config paths)
 * - 3-layer idempotency (frontmatter, metadata, API)
 * - Issue creation for each provider
 * - Metadata updates after creation
 * - Template/body generation
 * - Error handling and edge cases
 * - Convenience function
 *
 * @module tests/unit/sync/external-issue-auto-creator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockConfigManagerRead,
  mockDeriveFeatureId,
  mockExistsSyncMap,
  mockReadFileMap,
  mockWriteFile,
  mockGitHubClientV2,
  mockJiraClient,
  mockAdoClient,
  mockGetAdoPat,
  mockIsTemplateFile,
} = vi.hoisted(() => {
  const mockConfigManagerRead = vi.fn();
  const mockDeriveFeatureId = vi.fn();
  // Maps for existsSync / readFile keyed by path suffix
  const mockExistsSyncMap = new Map<string, boolean>();
  const mockReadFileMap = new Map<string, string>();
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);

  // GitHub client mock
  const mockGitHubClientV2 = {
    searchIssueByTitle: vi.fn(),
    createUserStoryIssue: vi.fn(),
    createEpicIssue: vi.fn(),
  };

  // JIRA client mock
  const mockJiraClient = {
    createIssue: vi.fn(),
  };

  // ADO client mock
  const mockAdoClient = {
    createWorkItem: vi.fn(),
  };

  const mockGetAdoPat = vi.fn();

  const mockIsTemplateFile = vi.fn().mockReturnValue(false);

  return {
    mockConfigManagerRead,
    mockDeriveFeatureId,
    mockExistsSyncMap,
    mockReadFileMap,
    mockWriteFile,
    mockGitHubClientV2,
    mockJiraClient,
    mockAdoClient,
    mockGetAdoPat,
    mockIsTemplateFile,
  };
});

// ---------------------------------------------------------------------------
// vi.mock calls
// ---------------------------------------------------------------------------

vi.mock('../../../src/core/config/config-manager.js', () => ({
  ConfigManager: class MockConfigManager {
    constructor() {}
    read = mockConfigManagerRead;
  },
}));

vi.mock('../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: mockDeriveFeatureId,
}));

vi.mock('../../../src/utils/project-detection.js', () => ({
  autoDetectProjectIdSync: vi.fn().mockReturnValue('test-project'),
}));

vi.mock('../../../src/core/increment/template-creator.js', () => ({
  isTemplateFile: mockIsTemplateFile,
}));

vi.mock('../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fs module
vi.mock('fs', () => {
  return {
    promises: {
      readFile: vi.fn((filePath: string) => {
        for (const [suffix, content] of mockReadFileMap.entries()) {
          if (filePath.endsWith(suffix)) {
            return Promise.resolve(content);
          }
        }
        return Promise.reject(new Error(`ENOENT: ${filePath}`));
      }),
      writeFile: mockWriteFile,
    },
    existsSync: (filePath: string) => {
      for (const [suffix, exists] of mockExistsSyncMap.entries()) {
        if (filePath.endsWith(suffix)) {
          return exists;
        }
      }
      return false;
    },
  };
});

// Mock GitHub client (dynamic import from source resolves to plugins/ at project root)
vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
  GitHubClientV2: {
    fromRepo: () => mockGitHubClientV2,
  },
}));

// Mock JIRA client (dynamic import)
vi.mock('../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: class {
    createIssue = mockJiraClient.createIssue;
  },
}));

// Mock ADO client (dynamic import)
vi.mock('../../../src/integrations/ado/ado-client.js', () => ({
  AdoClient: class {
    constructor() {}
    createWorkItem = mockAdoClient.createWorkItem;
  },
}));

vi.mock('../../../src/integrations/ado/ado-pat-provider.js', () => ({
  getAdoPat: mockGetAdoPat,
}));

// Mock child_process for git remote detection
vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue('https://github.com/test-org/test-repo.git\n'),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  ExternalIssueAutoCreator,
  autoCreateExternalIssue,
  type AutoCreateResult,
  type ExternalIssueAutoCreatorOptions,
} from '../../../src/sync/external-issue-auto-creator.js';
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

function createCreator(overrides?: Partial<ExternalIssueAutoCreatorOptions>): ExternalIssueAutoCreator {
  return new ExternalIssueAutoCreator({
    projectRoot: '/test/project',
    logger: createMockLogger(),
    ...overrides,
  });
}

const SPEC_CONTENT_WITH_STORIES = `---
title: "Test Feature"
feature_id: "FS-001"
---

# Feature: Test Feature

## User Stories

### US-001: First User Story

**Project**: my-app

**Acceptance Criteria**:
- [ ] **AC-US1-01**: First criterion

### US-002: Second User Story

**Acceptance Criteria**:
- [ ] **AC-US2-01**: First criterion
`;

const SPEC_CONTENT_NO_FRONTMATTER = `# Feature: Bare Feature

## User Stories

### US-001: A Story Without Frontmatter
`;

const SPEC_CONTENT_EMPTY_STORIES = `---
title: "Empty Feature"
---

# Feature: Empty Feature

No user stories here.
`;

function setupIncrementFiles(opts: {
  specContent?: string;
  metadataContent?: string;
  specExists?: boolean;
  metadataExists?: boolean;
  incrementId?: string;
}): void {
  const id = opts.incrementId || '0001-test-feature';
  const specExists = opts.specExists ?? true;
  const metadataExists = opts.metadataExists ?? false;

  mockExistsSyncMap.set(`${id}/spec.md`, specExists);
  mockExistsSyncMap.set(`${id}/metadata.json`, metadataExists);

  if (specExists && opts.specContent) {
    mockReadFileMap.set(`${id}/spec.md`, opts.specContent);
  }
  if (metadataExists && opts.metadataContent) {
    mockReadFileMap.set(`${id}/metadata.json`, opts.metadataContent);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExternalIssueAutoCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSyncMap.clear();
    mockReadFileMap.clear();
  });

  // =========================================================================
  // isAutoCreateEnabled
  // =========================================================================

  describe('auto-create enablement (isAutoCreateEnabled)', () => {
    it('should skip when sync.autoCreateOnIncrement is false', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { autoCreateOnIncrement: false },
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Auto-create disabled');
      expect(result.provider).toBe('none');
    });

    it('should enable when sync.autoCreateOnIncrement is true', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
      });
      // No existing issue
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      // Should proceed to create (not skip)
      expect(result.skipped).toBeFalsy();
      expect(result.provider).toBe('github');
    });

    it('should enable via legacy sync.autoSync = true', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoSync: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.skipped).toBeFalsy();
      expect(result.provider).toBe('github');
    });

    it('should enable via legacy sync.settings.canUpsertInternalItems = true', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          settings: { canUpsertInternalItems: true },
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.skipped).toBeFalsy();
    });

    it('should default to disabled when no sync config is present', async () => {
      mockConfigManagerRead.mockResolvedValue({});

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Auto-create disabled');
    });

    it('should prioritize explicit autoCreateOnIncrement=true over missing legacy', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('github');
      expect(result.skipped).toBeFalsy();
    });
  });

  // =========================================================================
  // detectProvider
  // =========================================================================

  describe('provider detection (detectProvider)', () => {
    beforeEach(() => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
    });

    it('should detect github from sync.github.enabled', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('github');
    });

    it('should detect jira from sync.jira.enabled', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'PROJ' }],
        },
      });
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'PROJ-1',
        self: 'https://test.atlassian.net/rest/api/2/issue/PROJ-1',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('jira');
    });

    it('should detect ado from sync.ado.enabled', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'test-org',
          project: 'test-project',
        },
      });
      mockGetAdoPat.mockReturnValue('fake-pat');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 100,
        url: 'https://dev.azure.com/test-org/test-project/_workitems/edit/100',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('ado');
    });

    it('should detect github from issueTracker.provider', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { autoCreateOnIncrement: true },
        issueTracker: {
          provider: 'github',
          owner: 'o',
          repo: 'r',
        },
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 5,
        html_url: 'https://github.com/o/r/issues/5',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('github');
    });

    it('should detect jira from issueTracker.provider', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { autoCreateOnIncrement: true },
        issueTracker: {
          provider: 'jira',
          domain: 'test.atlassian.net',
          projects: [{ key: 'DEV' }],
        },
      });
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'DEV-1',
        self: 'https://test.atlassian.net/rest/api/2/issue/DEV-1',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('jira');
    });

    it('should detect ado from issueTracker.provider', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { autoCreateOnIncrement: true },
        issueTracker: {
          provider: 'ado',
          organization_ado: 'org',
          project: 'proj',
        },
      });
      mockGetAdoPat.mockReturnValue('fake-pat');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 200,
        url: 'https://dev.azure.com/org/proj/_workitems/edit/200',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('ado');
    });

    it('should detect provider from sync.profiles', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          profiles: {
            main: {
              provider: 'github',
              config: { owner: 'profile-org', repo: 'profile-repo' },
            },
          },
        },
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 10,
        html_url: 'https://github.com/profile-org/profile-repo/issues/10',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('github');
    });

    it('should detect azure-devops alias in sync.profiles', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          profiles: {
            main: { provider: 'azure-devops' },
          },
        },
        issueTracker: {
          organization_ado: 'org',
          project: 'proj',
        },
      });
      mockGetAdoPat.mockReturnValue('fake-pat');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 300,
        url: 'https://dev.azure.com/org/proj/_workitems/edit/300',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('ado');
    });

    it('should return none when no provider is configured', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { autoCreateOnIncrement: true },
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.provider).toBe('none');
      expect(result.skipReason).toContain('No external provider configured');
    });

    it('should prioritize sync.github.enabled over issueTracker.provider jira', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
        issueTracker: { provider: 'jira', domain: 'x.atlassian.net' },
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.provider).toBe('github');
    });
  });

  // =========================================================================
  // loadIncrementInfo
  // =========================================================================

  describe('increment loading (loadIncrementInfo)', () => {
    it('should return error when spec.md does not exist', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({ specExists: false });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or missing spec.md');
    });

    it('should parse feature_id from frontmatter', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 10,
        html_url: 'https://github.com/o/r/issues/10',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      // The search should use the frontmatter feature_id
      expect(mockGitHubClientV2.searchIssueByTitle).toHaveBeenCalledWith('[FS-001]');
    });

    it('should derive feature_id when not in frontmatter', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_NO_FRONTMATTER,
        specExists: true,
        incrementId: '0042-bare-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-042');
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 20,
        html_url: 'https://github.com/o/r/issues/20',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0042-bare-feature');

      expect(mockDeriveFeatureId).toHaveBeenCalledWith('0042-bare-feature');
      expect(mockGitHubClientV2.searchIssueByTitle).toHaveBeenCalledWith('[FS-042]');
    });

    it('should fallback to manual feature_id parsing when deriveFeatureId throws', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_NO_FRONTMATTER,
        specExists: true,
        incrementId: '0142-broken-derive',
      });
      mockDeriveFeatureId.mockImplementation(() => {
        throw new Error('Failed to derive');
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 30,
        html_url: 'https://github.com/o/r/issues/30',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0142-broken-derive');

      // Should fallback: parseInt("0142") = 142, padStart(3) = "142" => FS-142
      expect(mockGitHubClientV2.searchIssueByTitle).toHaveBeenCalledWith('[FS-142]');
    });

    it('should parse user stories from spec.md body', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 10,
        html_url: 'https://github.com/o/r/issues/10',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      // Should have created issues for US-001 and US-002
      expect(mockGitHubClientV2.createUserStoryIssue).toHaveBeenCalledTimes(2);
      const firstCall = mockGitHubClientV2.createUserStoryIssue.mock.calls[0][0];
      expect(firstCall.userStoryId).toBe('US-001');
      expect(firstCall.title).toBe('First User Story');
      const secondCall = mockGitHubClientV2.createUserStoryIssue.mock.calls[1][0];
      expect(secondCall.userStoryId).toBe('US-002');
      expect(secondCall.title).toBe('Second User Story');
    });

    it('should parse project field from user stories', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 10,
        html_url: 'https://github.com/o/r/issues/10',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      // US-001 has **Project**: my-app, so the body should mention it
      const body = mockGitHubClientV2.createUserStoryIssue.mock.calls[0][0].body;
      expect(body).toContain('my-app');
    });

    it('should read status from metadata.json', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({ status: 'completed' }),
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      // Feature-level issue body should mention "completed" status
      const body = mockGitHubClientV2.createEpicIssue.mock.calls[0][1];
      expect(body).toContain('completed');
    });

    it('should use frontmatter title when available', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 10,
        html_url: 'https://github.com/o/r/issues/10',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      // Labels contain 'specweave' and 'auto-created'
      const callArgs = mockGitHubClientV2.createUserStoryIssue.mock.calls[0][0];
      expect(callArgs.labels).toEqual(['specweave', 'auto-created']);
      expect(callArgs.featureId).toBe('FS-001');
    });
  });

  // =========================================================================
  // checkExistingIssue (deduplication)
  // =========================================================================

  describe('deduplication (checkExistingIssue)', () => {
    it('should skip when metadata has github.issue', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({ github: { issue: 42 } }),
        incrementId: '0001-test-feature',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('#42');
    });

    it('should skip when metadata has github.issues array', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({
          github: { issues: [{ number: 55 }] },
        }),
        incrementId: '0001-test-feature',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('#55');
    });

    it('should skip when metadata has jira.issue', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'PROJ' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({ jira: { issue: 'PROJ-123' } }),
        incrementId: '0001-test-feature',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('PROJ-123');
    });

    it('should skip when metadata has jira.issues array', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'PROJ' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({
          jira: { issues: [{ key: 'PROJ-456' }] },
        }),
        incrementId: '0001-test-feature',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('PROJ-456');
    });

    it('should skip when metadata has ado.workItem', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'org',
          project: 'proj',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({ ado: { workItem: 789 } }),
        incrementId: '0001-test-feature',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('#789');
    });

    it('should skip when metadata has ado.workItems array', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'org',
          project: 'proj',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({
          ado: { workItems: [{ id: 101 }] },
        }),
        incrementId: '0001-test-feature',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('#101');
    });

    it('should not skip when metadata exists but has no provider keys', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({ status: 'active' }),
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.skipped).toBeFalsy();
      expect(result.provider).toBe('github');
    });

    it('should handle corrupt metadata.json gracefully', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: 'NOT VALID JSON',
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });

      const creator = createCreator();
      // Corrupt metadata should not crash; checkExistingIssue catches and returns null
      const result = await creator.createForIncrement('0001-test-feature');

      // Should proceed past dedup check (corrupt JSON triggers catch => null)
      expect(result.provider).toBe('github');
    });
  });

  // =========================================================================
  // GitHub issue creation
  // =========================================================================

  describe('GitHub issue creation', () => {
    beforeEach(() => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'test-owner', repo: 'test-repo' },
        },
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
    });

    it('should create user story issues when stories exist', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue
        .mockResolvedValueOnce({ number: 10, html_url: 'https://github.com/test-owner/test-repo/issues/10' })
        .mockResolvedValueOnce({ number: 11, html_url: 'https://github.com/test-owner/test-repo/issues/11' });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('github');
      expect(result.issueNumber).toBe(10);
      expect(result.issueUrl).toContain('/issues/10');
      expect(mockGitHubClientV2.createUserStoryIssue).toHaveBeenCalledTimes(2);
    });

    it('should create feature-level issue when no stories exist', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-empty',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 50,
        html_url: 'https://github.com/test-owner/test-repo/issues/50',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-empty');

      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe(50);
      expect(mockGitHubClientV2.createEpicIssue).toHaveBeenCalledTimes(1);
      // Title should contain feature ID
      const title = mockGitHubClientV2.createEpicIssue.mock.calls[0][0];
      expect(title).toContain('[FS-001]');
    });

    it('should fallback to feature-level issue when all story creations fail', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockRejectedValue(
        new Error('API rate limited')
      );
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 99,
        html_url: 'https://github.com/test-owner/test-repo/issues/99',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe(99);
      expect(mockGitHubClientV2.createEpicIssue).toHaveBeenCalledTimes(1);
    });

    it('should skip creation when API layer 3 finds existing issue', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue({
        number: 77,
        html_url: 'https://github.com/test-owner/test-repo/issues/77',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.issueNumber).toBe(77);
      expect(result.skipReason).toContain('#77');
      expect(mockGitHubClientV2.createUserStoryIssue).not.toHaveBeenCalled();
      expect(mockGitHubClientV2.createEpicIssue).not.toHaveBeenCalled();
    });

    it('should update metadata after creating issue', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 50,
        html_url: 'https://github.com/test-owner/test-repo/issues/50',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      expect(mockWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.github.issue).toBe(50);
      expect(writtenContent.github.url).toContain('/issues/50');
      expect(writtenContent.github.synced).toBeDefined();
    });

    it('should return error when GitHub repo is not configured', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true },
          // No owner/repo, no profiles, no issueTracker, no git remote
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });

      // Make git remote detection also fail
      const { execSync } = await import('child_process');
      (execSync as any).mockImplementation(() => {
        throw new Error('Not a git repo');
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('github');
      expect(result.error).toContain('GitHub repository not configured');
    });

    it('should include labels in created issues', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 10,
        html_url: 'https://github.com/test-owner/test-repo/issues/10',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      const callArgs = mockGitHubClientV2.createUserStoryIssue.mock.calls[0][0];
      expect(callArgs.labels).toEqual(['specweave', 'auto-created']);
    });

    it('should handle GitHub API errors gracefully', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockRejectedValue(
        new Error('Network error')
      );

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('github');
      expect(result.error).toContain('Network error');
    });
  });

  // =========================================================================
  // GitHub repo detection
  // =========================================================================

  describe('GitHub repo detection', () => {
    beforeEach(() => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/x/y/issues/1',
      });
    });

    it('should detect repo from sync.github config', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'direct-owner', repo: 'direct-repo' },
        },
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      // The issue URL in result should contain the detected owner/repo
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should detect repo from sync.profiles', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true },
          profiles: {
            main: {
              provider: 'github',
              config: { owner: 'profile-owner', repo: 'profile-repo' },
            },
          },
        },
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
    });

    it('should detect repo from issueTracker config', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true },
        },
        issueTracker: {
          owner: 'tracker-owner',
          repo: 'tracker-repo',
        },
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
    });

    it('should fallback to git remote detection', async () => {
      const { execSync } = await import('child_process');
      (execSync as any).mockReturnValue(
        'git@github.com:remote-owner/remote-repo.git\n'
      );

      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true },
        },
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // JIRA issue creation
  // =========================================================================

  describe('JIRA issue creation', () => {
    it('should create JIRA epic for increment', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'PROJ' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'PROJ-42',
        self: 'https://test.atlassian.net/rest/api/2/issue/PROJ-42',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('jira');
      expect(result.issueNumber).toBe('PROJ-42');
      expect(result.issueUrl).toContain('test.atlassian.net/browse/PROJ-42');
    });

    it('should create epic with correct fields', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'DEV' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'DEV-1',
        self: 'https://test.atlassian.net/rest/api/2/issue/DEV-1',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          issueType: 'Epic',
          summary: expect.stringContaining('[FS-001]'),
          labels: ['specweave', 'auto-created'],
        }),
        'DEV'
      );
    });

    it('should use jiraConfig.projectKey fallback', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projectKey: 'LEGACY',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'LEGACY-1',
        self: 'https://test.atlassian.net/rest/api/2/issue/LEGACY-1',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        expect.anything(),
        'LEGACY'
      );
    });

    it('should return error when JIRA domain is missing', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          projects: [{ key: 'PROJ' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('jira');
      expect(result.error).toContain('JIRA not configured');
    });

    it('should return error when JIRA projectKey is missing', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('jira');
      expect(result.error).toContain('JIRA not configured');
    });

    it('should update metadata with JIRA issue', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'PROJ' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'PROJ-99',
        self: 'https://test.atlassian.net/rest/api/2/issue/PROJ-99',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      expect(mockWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.jira.issue).toBe('PROJ-99');
      expect(writtenContent.jira.synced).toBeDefined();
    });

    it('should handle JIRA API errors gracefully', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'PROJ' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockJiraClient.createIssue.mockRejectedValue(new Error('JIRA 403 Forbidden'));

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('jira');
      expect(result.error).toContain('JIRA 403 Forbidden');
    });

    it('should read jira config from sync.jira path', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: {
            enabled: true,
            domain: 'sync-jira.atlassian.net',
            projectKey: 'SYNC',
          },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'SYNC-1',
        self: 'https://sync-jira.atlassian.net/rest/api/2/issue/SYNC-1',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.issueUrl).toContain('sync-jira.atlassian.net');
    });
  });

  // =========================================================================
  // ADO issue creation
  // =========================================================================

  describe('ADO work item creation', () => {
    it('should create ADO Feature work item', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'my-org',
          project: 'my-project',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGetAdoPat.mockReturnValue('pat-token');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 500,
        url: 'https://dev.azure.com/my-org/my-project/_workitems/edit/500',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ado');
      expect(result.issueNumber).toBe(500);
      expect(result.issueUrl).toContain('_workitems/edit/500');
    });

    it('should create work item with correct parameters', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'my-org',
          project: 'my-project',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGetAdoPat.mockReturnValue('pat-token');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 500,
        url: 'https://dev.azure.com/my-org/my-project/_workitems/edit/500',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      expect(mockAdoClient.createWorkItem).toHaveBeenCalledWith(
        expect.objectContaining({
          workItemType: 'Feature',
          title: expect.stringContaining('[FS-001]'),
          tags: ['specweave', 'auto-created'],
        })
      );
    });

    it('should use organization fallback from adoConfig.organization', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: {
            enabled: true,
            organization: 'fallback-org',
            project: 'fallback-proj',
          },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGetAdoPat.mockReturnValue('pat-token');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 600,
        url: 'https://dev.azure.com/fallback-org/fallback-proj/_workitems/edit/600',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
    });

    it('should return error when ADO organization is missing', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          project: 'my-project',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('ado');
      expect(result.error).toContain('Azure DevOps not configured');
    });

    it('should return error when ADO project is missing', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'my-org',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('ado');
      expect(result.error).toContain('Azure DevOps not configured');
    });

    it('should return error when ADO PAT is missing', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'my-org',
          project: 'my-project',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGetAdoPat.mockReturnValue(null);

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('ado');
      expect(result.error).toContain('AZURE_DEVOPS_PAT not set');
    });

    it('should update metadata with ADO work item', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'my-org',
          project: 'my-project',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGetAdoPat.mockReturnValue('pat-token');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 700,
        url: 'https://dev.azure.com/my-org/my-project/_workitems/edit/700',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      expect(mockWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.ado.workItem).toBe(700);
      expect(writtenContent.ado.synced).toBeDefined();
    });

    it('should handle ADO API errors gracefully', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'my-org',
          project: 'my-project',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGetAdoPat.mockReturnValue('pat-token');
      mockAdoClient.createWorkItem.mockRejectedValue(new Error('ADO 401 Unauthorized'));

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(false);
      expect(result.provider).toBe('ado');
      expect(result.error).toContain('ADO 401 Unauthorized');
    });
  });

  // =========================================================================
  // Template / body generation
  // =========================================================================

  describe('issue body templates', () => {
    it('should include feature ID and increment ID in GitHub user story body', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 10,
        html_url: 'https://github.com/o/r/issues/10',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      const body = mockGitHubClientV2.createUserStoryIssue.mock.calls[0][0].body;
      expect(body).toContain('FS-001');
      expect(body).toContain('0001-test-feature');
      expect(body).toContain('US-001');
      expect(body).toContain('spec.md');
      expect(body).toContain('Auto-created by SpecWeave');
    });

    it('should include user stories list in GitHub feature-level body', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      // Make story creation fail to trigger fallback
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockRejectedValue(new Error('fail'));
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      const body = mockGitHubClientV2.createEpicIssue.mock.calls[0][1];
      expect(body).toContain('US-001: First User Story');
      expect(body).toContain('US-002: Second User Story');
      expect(body).toContain('tasks.md');
    });

    it('should show "No user stories defined" when empty', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        incrementId: '0001-empty',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-empty');

      const body = mockGitHubClientV2.createEpicIssue.mock.calls[0][1];
      expect(body).toContain('No user stories defined');
    });

    it('should use JIRA wiki markup in epic description', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          jira: { enabled: true },
        },
        issueTracker: {
          domain: 'test.atlassian.net',
          projects: [{ key: 'PROJ' }],
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockJiraClient.createIssue.mockResolvedValue({
        key: 'PROJ-1',
        self: 'https://test.atlassian.net/rest/api/2/issue/PROJ-1',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      const description = mockJiraClient.createIssue.mock.calls[0][0].description;
      // JIRA wiki markup uses h2. h3. *bold* and * bullets
      expect(description).toContain('h2.');
      expect(description).toContain('h3.');
      expect(description).toContain('*Feature*');
      expect(description).toContain('* US-001');
    });

    it('should use HTML in ADO description', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          ado: { enabled: true },
        },
        issueTracker: {
          organization_ado: 'org',
          project: 'proj',
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGetAdoPat.mockReturnValue('pat-token');
      mockAdoClient.createWorkItem.mockResolvedValue({
        id: 1,
        url: 'https://dev.azure.com/org/proj/_workitems/edit/1',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      const description = mockAdoClient.createWorkItem.mock.calls[0][0].description;
      // ADO uses HTML
      expect(description).toContain('<h2>');
      expect(description).toContain('<h3>');
      expect(description).toContain('<strong>Feature</strong>');
      expect(description).toContain('<li>US-001');
    });
  });

  // =========================================================================
  // Metadata update (merging with existing)
  // =========================================================================

  describe('metadata updates', () => {
    it('should merge github data into existing metadata', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        metadataExists: true,
        metadataContent: JSON.stringify({ status: 'active', version: '1.0' }),
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 50,
        html_url: 'https://github.com/o/r/issues/50',
      });

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      // Existing fields should be preserved
      expect(writtenContent.status).toBe('active');
      expect(writtenContent.version).toBe('1.0');
      // New github field should be added
      expect(writtenContent.github.issue).toBe(50);
    });

    it('should create metadata.json if it does not exist (for metadata update)', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_EMPTY_STORIES,
        specExists: true,
        metadataExists: false,
        incrementId: '0001-test-feature',
      });
      mockDeriveFeatureId.mockReturnValue('FS-001');
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 50,
        html_url: 'https://github.com/o/r/issues/50',
      });

      // For the metadata write, existsSync returns false
      // but the readFile mock for metadata will fail (which is expected)
      // The code creates a new {} if metadata doesn't exist

      const creator = createCreator();
      await creator.createForIncrement('0001-test-feature');

      expect(mockWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.github.issue).toBe(50);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('should handle config read failure', async () => {
      mockConfigManagerRead.mockRejectedValue(new Error('Config file not found'));

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Config file not found');
    });

    it('should handle non-Error throws', async () => {
      mockConfigManagerRead.mockRejectedValue('string error');

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-feature');

      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });

    it('should return error for spec.md parse failures', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      // spec.md exists but readFile will fail
      mockExistsSyncMap.set('0001-broken/spec.md', true);
      // Don't add to readFileMap so readFile throws ENOENT

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-broken');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or missing spec.md');
    });
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    it('should accept custom logger', async () => {
      const logger = createMockLogger();
      mockConfigManagerRead.mockResolvedValue({});

      const creator = new ExternalIssueAutoCreator({
        projectRoot: '/test',
        logger,
      });
      await creator.createForIncrement('0001-feature');

      // The logger should not have been called for errors in the skip path
      // but it should be accessible
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should use default logger when none provided', async () => {
      mockConfigManagerRead.mockResolvedValue({});

      // This should not throw
      const creator = new ExternalIssueAutoCreator({
        projectRoot: '/test',
      });
      const result = await creator.createForIncrement('0001-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  // =========================================================================
  // Convenience function
  // =========================================================================

  describe('autoCreateExternalIssue convenience function', () => {
    it('should delegate to ExternalIssueAutoCreator.createForIncrement', async () => {
      mockConfigManagerRead.mockResolvedValue({});

      const logger = createMockLogger();
      const result = await autoCreateExternalIssue('/test', '0001-feature', logger);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.provider).toBe('none');
    });

    it('should work without logger argument', async () => {
      mockConfigManagerRead.mockResolvedValue({});

      const result = await autoCreateExternalIssue('/test', '0001-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  // =========================================================================
  // Feature ID derivation edge cases
  // =========================================================================

  describe('feature ID derivation edge cases', () => {
    beforeEach(() => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createEpicIssue.mockResolvedValue({
        number: 1,
        html_url: 'https://github.com/o/r/issues/1',
      });
    });

    it('should use epic from frontmatter as feature ID', async () => {
      const specWithEpic = `---
epic: "EPIC-007"
title: "Feature With Epic"
---

# Feature
`;
      setupIncrementFiles({
        specContent: specWithEpic,
        specExists: true,
        incrementId: '0007-epic-feature',
      });

      const creator = createCreator();
      await creator.createForIncrement('0007-epic-feature');

      expect(mockGitHubClientV2.searchIssueByTitle).toHaveBeenCalledWith('[EPIC-007]');
    });

    it('should use feature from frontmatter as feature ID', async () => {
      const specWithFeature = `---
feature: "FEAT-X"
title: "Feature With Feature"
---

# Feature
`;
      setupIncrementFiles({
        specContent: specWithFeature,
        specExists: true,
        incrementId: '0008-feat',
      });

      const creator = createCreator();
      await creator.createForIncrement('0008-feat');

      expect(mockGitHubClientV2.searchIssueByTitle).toHaveBeenCalledWith('[FEAT-X]');
    });

    it('should pad feature ID correctly for small numbers', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_NO_FRONTMATTER,
        specExists: true,
        incrementId: '0005-small',
      });
      mockDeriveFeatureId.mockImplementation(() => {
        throw new Error('fail');
      });

      const creator = createCreator();
      await creator.createForIncrement('0005-small');

      // parseInt("0005") = 5, padStart(3) = "005" => FS-005
      expect(mockGitHubClientV2.searchIssueByTitle).toHaveBeenCalledWith('[FS-005]');
    });

    it('should handle non-numeric increment IDs in fallback', async () => {
      setupIncrementFiles({
        specContent: SPEC_CONTENT_NO_FRONTMATTER,
        specExists: true,
        incrementId: 'abc-no-number',
      });
      mockDeriveFeatureId.mockImplementation(() => {
        throw new Error('fail');
      });

      const creator = createCreator();
      await creator.createForIncrement('abc-no-number');

      // No numeric match => last resort: substring(0, 3) = "abc" => FS-abc
      expect(mockGitHubClientV2.searchIssueByTitle).toHaveBeenCalledWith('[FS-abc]');
    });
  });

  // =========================================================================
  // API Layer 3 dedup for GitHub (searchIssueByTitle)
  // =========================================================================

  describe('GitHub API Layer 3 deduplication', () => {
    it('should update metadata when finding existing issue via API', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: {
          autoCreateOnIncrement: true,
          github: { enabled: true, owner: 'o', repo: 'r' },
        },
      });
      setupIncrementFiles({
        specContent: SPEC_CONTENT_WITH_STORIES,
        specExists: true,
        incrementId: '0001-test-feature',
      });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue({
        number: 88,
        html_url: 'https://github.com/o/r/issues/88',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.issueNumber).toBe(88);

      // Should still update metadata with found issue
      expect(mockWriteFile).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.github.issue).toBe(88);
    });
  });

  // =========================================================================
  // Template Guard (0304)
  // =========================================================================

  describe('template guard', () => {
    it('skips when spec.md is still a template (no API calls)', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { autoCreateOnIncrement: true, github: { enabled: true, owner: 'o', repo: 'r' } },
      });
      mockIsTemplateFile.mockReturnValue(true);
      setupIncrementFiles({ specContent: SPEC_CONTENT_WITH_STORIES });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('template');
      expect(result.provider).toBe('none');

      // No external API calls should have been made
      expect(mockGitHubClientV2.searchIssueByTitle).not.toHaveBeenCalled();
      expect(mockGitHubClientV2.createUserStoryIssue).not.toHaveBeenCalled();
      expect(mockGitHubClientV2.createEpicIssue).not.toHaveBeenCalled();
      expect(mockJiraClient.createIssue).not.toHaveBeenCalled();
      expect(mockAdoClient.createWorkItem).not.toHaveBeenCalled();
    });

    it('proceeds normally when spec.md is NOT a template', async () => {
      mockConfigManagerRead.mockResolvedValue({
        sync: { autoCreateOnIncrement: true, github: { enabled: true, owner: 'o', repo: 'r' } },
      });
      mockIsTemplateFile.mockReturnValue(false);
      mockDeriveFeatureId.mockReturnValue('FS-001');
      setupIncrementFiles({ specContent: SPEC_CONTENT_WITH_STORIES });
      mockGitHubClientV2.searchIssueByTitle.mockResolvedValue(null);
      mockGitHubClientV2.createUserStoryIssue.mockResolvedValue({
        number: 99,
        html_url: 'https://github.com/o/r/issues/99',
      });

      const creator = createCreator();
      const result = await creator.createForIncrement('0001-test-feature');

      expect(result.success).toBe(true);
      expect(result.skipped).toBeFalsy();
      expect(mockGitHubClientV2.createUserStoryIssue).toHaveBeenCalled();
    });
  });
});
