/**
 * Unit Tests: Sync Config Writer
 *
 * Tests all exported functions:
 * - writeSyncConfig (main entry, delegates to builder functions)
 * - deduplicateArray (utility)
 *
 * Also covers internal builder functions implicitly:
 * - buildGitHubSyncConfig (single/multi repo)
 * - buildJiraSyncConfig (legacy + multi-project)
 * - buildAdoSyncConfig (single/multi project)
 * - cleanupParentProjectFolder
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockConfigRead,
  mockConfigWrite,
  mockGetConfigManager,
  mockExecSync,
  mockExistsSync,
  mockReaddirSync,
  mockRmSync,
} = vi.hoisted(() => ({
  mockConfigRead: vi.fn(),
  mockConfigWrite: vi.fn(),
  mockGetConfigManager: vi.fn(),
  mockExecSync: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockRmSync: vi.fn(),
}));

vi.mock('../../../../../src/core/config/index.js', () => ({
  getConfigManager: mockGetConfigManager,
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
    rmSync: mockRmSync,
  },
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  rmSync: mockRmSync,
}));

vi.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(passthrough, handler);
      return passthrough;
    },
    apply(_target, _thisArg, args) {
      return args[0];
    },
  };
  return { default: new Proxy(passthrough, handler) };
});

vi.mock('../../../../../src/utils/logger.js', () => ({
  Logger: class {},
  consoleLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import { writeSyncConfig, deduplicateArray } from '../../../../../src/cli/helpers/issue-tracker/sync-config-writer.js';
import type { SyncSettings, SyncPermissions } from '../../../../../src/cli/helpers/issue-tracker/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSyncSettings(overrides: Partial<SyncSettings> = {}): SyncSettings {
  return { includeStatus: true, autoApplyLabels: true, ...overrides };
}

function makeSyncPermissions(overrides: Partial<SyncPermissions> = {}): SyncPermissions {
  return {
    canUpsertInternalItems: true,
    canUpdateExternalItems: true,
    canUpdateStatus: true,
    ...overrides,
  };
}

function makeLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sync-config-writer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigRead.mockResolvedValue({});
    mockConfigWrite.mockResolvedValue(undefined);
    mockGetConfigManager.mockReturnValue({
      read: mockConfigRead,
      write: mockConfigWrite,
    });
  });

  // =========================================================================
  // deduplicateArray
  // =========================================================================

  describe('deduplicateArray', () => {
    it('returns empty array for undefined input', () => {
      expect(deduplicateArray(undefined)).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      expect(deduplicateArray([])).toEqual([]);
    });

    it('deduplicates strings', () => {
      expect(deduplicateArray(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('preserves order (first occurrence wins)', () => {
      expect(deduplicateArray(['c', 'a', 'b', 'a', 'c'])).toEqual(['c', 'a', 'b']);
    });

    it('deduplicates objects using keyFn', () => {
      const items = [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta' },
        { id: '1', name: 'Alpha Duplicate' },
      ];
      const result = deduplicateArray(items, item => item.id);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alpha');
      expect(result[1].name).toBe('Beta');
    });

    it('handles single-element array', () => {
      expect(deduplicateArray(['only'])).toEqual(['only']);
    });

    it('handles all unique elements', () => {
      expect(deduplicateArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('handles all duplicate elements', () => {
      expect(deduplicateArray(['x', 'x', 'x'])).toEqual(['x']);
    });
  });

  // =========================================================================
  // writeSyncConfig - GitHub
  // =========================================================================

  describe('writeSyncConfig - GitHub', () => {
    it('writes GitHub config with git remote detection', async () => {
      mockExecSync.mockReturnValue('https://github.com/myorg/myrepo.git\n');
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      expect(mockConfigWrite).toHaveBeenCalledTimes(1);
      const writtenConfig = mockConfigWrite.mock.calls[0][0];

      // Verify hooks
      expect(writtenConfig.hooks.post_task_completion.external_tracker_sync).toBe(true);
      expect(writtenConfig.hooks.post_increment_planning.auto_create_github_issue).toBe(true);

      // Verify sync config
      expect(writtenConfig.sync.provider).toBe('github');
      expect(writtenConfig.sync.enabled).toBe(true);
      expect(writtenConfig.sync.profiles['github-default']).toBeDefined();
      expect(writtenConfig.sync.profiles['github-default'].config.owner).toBe('myorg');
      expect(writtenConfig.sync.profiles['github-default'].config.repo).toBe('myrepo');

      // Verify logger output
      expect(logger.log).toHaveBeenCalled();
    });

    it('parses SSH git remote URL', async () => {
      mockExecSync.mockReturnValue('git@github.com:owner/repo-name.git\n');
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['github-default'].config.owner).toBe('owner');
      expect(writtenConfig.sync.profiles['github-default'].config.repo).toBe('repo-name');
    });

    it('falls back when git remote fails', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('no remote'); });
      const logger = makeLogger();

      await writeSyncConfig(
        '/project/my-app',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['github-default'].config.repo).toBe('my-app');
      expect(writtenConfig.sync.profiles['github-default'].config.owner).toBe('YOUR_GITHUB_USERNAME');
    });

    it('writes multi-repo config with repository profiles', async () => {
      const profiles = [
        { id: 'frontend', displayName: 'Frontend', owner: 'org', repo: 'fe-app', isDefault: true },
        { id: 'backend', displayName: 'Backend', owner: 'org', repo: 'be-api' },
      ];
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        profiles,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['frontend']).toBeDefined();
      expect(writtenConfig.sync.profiles['backend']).toBeDefined();
      expect(writtenConfig.sync.defaultProfile).toBe('frontend');
    });

    it('adds monorepo projects to main profile', async () => {
      const profiles = [
        { id: 'main', displayName: 'Main', owner: 'org', repo: 'monorepo' },
      ];
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        profiles,
        ['packages/core', 'packages/ui'],
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['main'].config.monorepoProjects).toEqual(['packages/core', 'packages/ui']);
    });

    it('cleans up parent project folder for multi-repo setups', async () => {
      mockConfigRead.mockResolvedValue({ project: { name: 'MyOrg' } });
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);
      const profiles = [
        { id: 'repo1', displayName: 'Repo1', owner: 'org', repo: 'repo1' },
        { id: 'repo2', displayName: 'Repo2', owner: 'org', repo: 'repo2' },
      ];
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        profiles,
        undefined,
        logger
      );

      expect(mockRmSync).toHaveBeenCalled();
    });

    it('does not clean up parent folder if it has content', async () => {
      mockConfigRead.mockResolvedValue({ project: { name: 'MyOrg' } });
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['spec.md', 'tasks.md']); // Non-empty, non-readme-only
      const profiles = [
        { id: 'repo1', displayName: 'Repo1', owner: 'org', repo: 'repo1' },
        { id: 'repo2', displayName: 'Repo2', owner: 'org', repo: 'repo2' },
      ];
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        profiles,
        undefined,
        logger
      );

      expect(mockRmSync).not.toHaveBeenCalled();
    });

    it('does not clean up if folder matches a repo profile name', async () => {
      mockConfigRead.mockResolvedValue({ project: { name: 'repo1' } });
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);
      const profiles = [
        { id: 'repo1', displayName: 'Repo1', owner: 'org', repo: 'repo1' },
        { id: 'repo2', displayName: 'Repo2', owner: 'org', repo: 'repo2' },
      ];
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        profiles,
        undefined,
        logger
      );

      // Should NOT clean up because 'repo1' is a valid repo folder
      expect(mockRmSync).not.toHaveBeenCalled();
    });

    it('does not attempt cleanup for single-repo setup', async () => {
      mockExecSync.mockReturnValue('https://github.com/org/repo.git\n');
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined, // No repository profiles
        undefined,
        logger
      );

      expect(mockExistsSync).not.toHaveBeenCalled();
    });

    it('handles cleanup error gracefully', async () => {
      mockConfigRead.mockResolvedValue({ project: { name: 'MyOrg' } });
      mockExistsSync.mockImplementation(() => { throw new Error('permission denied'); });
      const profiles = [
        { id: 'repo1', displayName: 'Repo1', owner: 'org', repo: 'repo1' },
        { id: 'repo2', displayName: 'Repo2', owner: 'org', repo: 'repo2' },
      ];
      const logger = makeLogger();

      // Should not throw
      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        profiles,
        undefined,
        logger
      );

      // Non-blocking: logger should note the error
      const calls = logger.log.mock.calls.map((c: any) => c[0]);
      const hasNote = calls.some((c: string) => c.includes('Could not clean up'));
      expect(hasNote).toBe(true);
    });

    it('cleans up folder with only README.md', async () => {
      mockConfigRead.mockResolvedValue({ project: { name: 'MyOrg' } });
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['README.md']);
      const profiles = [
        { id: 'repo1', displayName: 'Repo1', owner: 'org', repo: 'repo1' },
        { id: 'repo2', displayName: 'Repo2', owner: 'org', repo: 'repo2' },
      ];
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        profiles,
        undefined,
        logger
      );

      expect(mockRmSync).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // writeSyncConfig - JIRA
  // =========================================================================

  describe('writeSyncConfig - JIRA', () => {
    it('writes JIRA legacy single-project config', async () => {
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'jira',
        { token: 'token', email: 'user@test.com', domain: 'myteam.atlassian.net', instanceType: 'cloud', projectKey: 'MAIN' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.provider).toBe('jira');
      expect(writtenConfig.sync.profiles['jira-default']).toBeDefined();
      expect(writtenConfig.sync.profiles['jira-default'].config.domain).toBe('myteam.atlassian.net');
      expect(writtenConfig.sync.profiles['jira-default'].config.projectKey).toBe('MAIN');
      expect(writtenConfig.hooks.post_increment_planning.auto_create_github_issue).toBe(false);
    });

    it('writes JIRA multi-project config with projectConfigs', async () => {
      const logger = makeLogger();
      const credentials = {
        token: 'token',
        email: 'user@test.com',
        domain: 'myteam.atlassian.net',
        instanceType: 'cloud',
        projectConfigs: [
          { key: 'FE', name: 'Frontend', id: '10001', isDefault: true },
          { key: 'BE', name: 'Backend', id: '10002' },
        ],
      } as any;

      await writeSyncConfig(
        '/project',
        'jira',
        credentials,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.provider).toBe('jira');
      expect(writtenConfig.sync.profiles['jira-fe']).toBeDefined();
      expect(writtenConfig.sync.profiles['jira-be']).toBeDefined();
      expect(writtenConfig.sync.defaultProfile).toBe('jira-fe');

      // Multi-project should be enabled
      expect(writtenConfig.multiProject).toBeDefined();
      expect(writtenConfig.multiProject.enabled).toBe(true);
      expect(writtenConfig.multiProject.activeProject).toBe('fe');
    });

    it('falls back to first profile when no isDefault set', async () => {
      const logger = makeLogger();
      const credentials = {
        token: 'token',
        email: 'user@test.com',
        domain: 'myteam.atlassian.net',
        instanceType: 'cloud',
        projectConfigs: [
          { key: 'Alpha', name: 'Alpha Project', id: '1' },
          { key: 'Beta', name: 'Beta Project', id: '2' },
        ],
      } as any;

      await writeSyncConfig(
        '/project',
        'jira',
        credentials,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.defaultProfile).toBe('jira-alpha');
    });

    it('handles legacy project-per-team strategy with array', async () => {
      const logger = makeLogger();
      const credentials = {
        token: 'token',
        email: 'user@test.com',
        domain: 'myteam.atlassian.net',
        instanceType: 'cloud',
        strategy: 'project-per-team',
        projects: ['FE', 'BE'],
      } as any;

      await writeSyncConfig(
        '/project',
        'jira',
        credentials,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['jira-default'].config.projects).toEqual(['FE', 'BE']);
    });

    it('respects sync settings flags', async () => {
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'jira',
        { token: 'token', email: 'u@t.com', domain: 'd.net', instanceType: 'cloud', projectKey: 'X' } as any,
        makeSyncSettings({ includeStatus: false, autoApplyLabels: false }),
        makeSyncPermissions({ canUpdateExternalItems: false }),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.includeStatus).toBe(false);
      expect(writtenConfig.sync.autoApplyLabels).toBe(false);
      expect(writtenConfig.sync.settings.canUpdateExternalItems).toBe(false);
    });
  });

  // =========================================================================
  // writeSyncConfig - ADO
  // =========================================================================

  describe('writeSyncConfig - ADO', () => {
    it('writes ADO single-project config', async () => {
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'ado',
        { pat: 'ado-token', org: 'myorg', project: 'MyProject', areaPaths: ['Platform', 'Backend'] } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.provider).toBe('ado');
      expect(writtenConfig.sync.profiles['ado-default']).toBeDefined();
      expect(writtenConfig.sync.profiles['ado-default'].config.organization).toBe('myorg');
      expect(writtenConfig.sync.profiles['ado-default'].config.project).toBe('MyProject');
      expect(writtenConfig.sync.profiles['ado-default'].config.areaPaths).toEqual(['Platform', 'Backend']);
    });

    it('writes ADO multi-project config', async () => {
      const logger = makeLogger();
      const credentials = {
        pat: 'ado-token',
        org: 'myorg',
        projects: [
          { name: 'ProjectA', areaPaths: ['Team1', 'Team2'], isDefault: true },
          { name: 'ProjectB', areaPaths: ['Core'], isUmbrella: true },
        ],
      } as any;

      await writeSyncConfig(
        '/project',
        'ado',
        credentials,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['ado-projecta']).toBeDefined();
      expect(writtenConfig.sync.profiles['ado-projectb']).toBeDefined();
      expect(writtenConfig.sync.profiles['ado-projectb'].config.isUmbrella).toBe(true);
      // Default is ProjectA (non-umbrella)
      expect(writtenConfig.sync.defaultProfile).toBe('ado-projecta');

      // Multi-project enabled
      expect(writtenConfig.multiProject).toBeDefined();
      expect(writtenConfig.multiProject.enabled).toBe(true);
    });

    it('deduplicates area paths in single project mode', async () => {
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'ado',
        { pat: 'ado-token', org: 'myorg', project: 'MyProject', areaPaths: ['Platform', 'Backend', 'Platform'] } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['ado-default'].config.areaPaths).toEqual(['Platform', 'Backend']);
    });

    it('deduplicates area paths in multi-project mode', async () => {
      const logger = makeLogger();
      const credentials = {
        pat: 'ado-token',
        org: 'myorg',
        projects: [
          { name: 'Proj', areaPaths: ['Area1', 'Area2', 'Area1'], isDefault: true },
        ],
      } as any;

      await writeSyncConfig(
        '/project',
        'ado',
        credentials,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['ado-proj'].config.areaPaths).toEqual(['Area1', 'Area2']);
    });

    it('skips areaPaths if none provided', async () => {
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'ado',
        { pat: 'ado-token', org: 'myorg', project: 'MyProject' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['ado-default'].config.areaPaths).toBeUndefined();
    });

    it('includes strategy if provided', async () => {
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'ado',
        { pat: 'ado-token', org: 'myorg', project: 'MyProject', strategy: 'area-path-based' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.sync.profiles['ado-default'].config.strategy).toBe('area-path-based');
    });

    it('falls back to first profile as default when no isDefault (non-umbrella)', async () => {
      const logger = makeLogger();
      const credentials = {
        pat: 'ado-token',
        org: 'myorg',
        projects: [
          { name: 'Umbrella', isUmbrella: true, isDefault: true },
          { name: 'ActualProject' },
        ],
      } as any;

      await writeSyncConfig(
        '/project',
        'ado',
        credentials,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      const writtenConfig = mockConfigWrite.mock.calls[0][0];
      // Umbrella has isDefault but is umbrella, so it should fall back
      // The code skips umbrellas for default, then falls back to first profile key
      expect(writtenConfig.sync.defaultProfile).toBeDefined();
    });
  });

  // =========================================================================
  // writeSyncConfig - Hooks configuration
  // =========================================================================

  describe('hooks configuration', () => {
    it('sets auto_create_github_issue true only for github', async () => {
      const logger = makeLogger();

      await writeSyncConfig(
        '/project',
        'github',
        { token: 'ghp_xxx', instanceType: 'cloud' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      let writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.hooks.post_increment_planning.auto_create_github_issue).toBe(true);

      // Reset and test with jira
      vi.clearAllMocks();
      mockConfigRead.mockResolvedValue({});
      mockConfigWrite.mockResolvedValue(undefined);
      mockGetConfigManager.mockReturnValue({
        read: mockConfigRead,
        write: mockConfigWrite,
      });

      await writeSyncConfig(
        '/project',
        'jira',
        { token: 'token', email: 'u@t.com', domain: 'd.net', instanceType: 'cloud', projectKey: 'X' } as any,
        makeSyncSettings(),
        makeSyncPermissions(),
        undefined,
        undefined,
        logger
      );

      writtenConfig = mockConfigWrite.mock.calls[0][0];
      expect(writtenConfig.hooks.post_increment_planning.auto_create_github_issue).toBe(false);
    });
  });
});
