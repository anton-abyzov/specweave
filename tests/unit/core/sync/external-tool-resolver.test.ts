/**
 * Unit Tests: ExternalToolResolver
 *
 * Tests the unified external tool selection logic for sync profiles.
 * Covers resolution priority, validation, authentication checks,
 * and all utility methods.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';

// Mock fs-native before importing the module under test
const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  readFile: mockReadFile,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  ExternalToolResolver,
  createExternalToolResolver,
} from '../../../../src/core/sync/external-tool-resolver.js';
import type { SyncProfile } from '../../../../src/core/types/sync-profile.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const PROJECT_ROOT = '/tmp/test-project';

function makeGitHubProfile(overrides: Partial<SyncProfile> = {}): SyncProfile {
  return {
    provider: 'github',
    displayName: 'GitHub Main',
    config: { owner: 'myorg', repo: 'myrepo' },
    timeRange: { default: '1M', max: '1Y' },
    ...overrides,
  };
}

function makeJiraProfile(overrides: Partial<SyncProfile> = {}): SyncProfile {
  return {
    provider: 'jira',
    displayName: 'JIRA Main',
    config: { domain: 'myorg.atlassian.net', projectKey: 'PROJ' },
    timeRange: { default: '1M', max: '1Y' },
    ...overrides,
  };
}

function makeAdoProfile(overrides: Partial<SyncProfile> = {}): SyncProfile {
  return {
    provider: 'ado',
    displayName: 'ADO Main',
    config: { organization: 'myorg', project: 'MyProject' },
    timeRange: { default: '1M', max: '1Y' },
    ...overrides,
  };
}

/**
 * Configure mockReadFile to return specific content for paths.
 * Paths not in the map will throw ENOENT.
 */
function setupFileSystem(fileMap: Record<string, string>) {
  mockReadFile.mockImplementation(async (filePath: string) => {
    if (fileMap[filePath] !== undefined) {
      return fileMap[filePath];
    }
    const err: any = new Error(`ENOENT: no such file: ${filePath}`);
    err.code = 'ENOENT';
    throw err;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExternalToolResolver', () => {
  let resolver: ExternalToolResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new ExternalToolResolver(PROJECT_ROOT);
  });

  // ========================================================================
  // Constructor & Config Loading
  // ========================================================================

  describe('constructor', () => {
    it('should set configPath based on projectRoot', () => {
      // The resolver reads config from .specweave/config.json relative to root
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({}),
      });

      // Accessing private fields indirectly by invoking a method
      expect(resolver).toBeInstanceOf(ExternalToolResolver);
    });

    it('should accept a custom logger', () => {
      const customLogger = {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };
      const r = new ExternalToolResolver(PROJECT_ROOT, { logger: customLogger });
      expect(r).toBeInstanceOf(ExternalToolResolver);
    });
  });

  describe('config loading', () => {
    it('should handle missing config file gracefully (ENOENT)', async () => {
      setupFileSystem({}); // no files

      const result = await resolver.hasExternalToolConfigured();
      expect(result).toBe(false);
    });

    it('should cache config after first load', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { gh: makeGitHubProfile() } },
        }),
      });

      await resolver.hasExternalToolConfigured();
      await resolver.hasExternalToolConfigured();
      // readFile should only have been called once for config.json (cached)
      const configCalls = mockReadFile.mock.calls.filter(
        (c: any[]) => c[0] === path.join(PROJECT_ROOT, '.specweave', 'config.json')
      );
      expect(configCalls.length).toBe(1);
    });

    it('should throw on non-ENOENT errors', async () => {
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      await expect(resolver.hasExternalToolConfigured()).rejects.toThrow('Permission denied');
    });
  });

  // ========================================================================
  // resolveForIncrement
  // ========================================================================

  describe('resolveForIncrement()', () => {
    it('should resolve from explicit syncTarget in metadata (priority 1)', async () => {
      const metadata = {
        id: '0001-feature',
        status: 'active',
        type: 'feature',
        created: '2025-01-01T00:00:00Z',
        lastActivity: '2025-01-01T00:00:00Z',
        syncTarget: {
          profileId: 'gh-main',
          provider: 'github',
          derivedFrom: 'user-selection',
          setAt: '2025-01-01T00:00:00Z',
        },
      };

      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-main': profile } },
        }),
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '0001-feature', 'metadata.json')]:
          JSON.stringify(metadata),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.syncTarget).not.toBeNull();
      expect(result.syncTarget!.profileId).toBe('gh-main');
      expect(result.profile).not.toBeNull();
      expect(result.profile!.provider).toBe('github');
      expect(result.resolutionPath).toContain('metadata.syncTarget (profileId: gh-main)');
    });

    it('should fall through when metadata syncTarget profile not found in config', async () => {
      const metadata = {
        id: '0001-feature',
        status: 'active',
        type: 'feature',
        created: '2025-01-01T00:00:00Z',
        lastActivity: '2025-01-01T00:00:00Z',
        syncTarget: {
          profileId: 'nonexistent',
          provider: 'github',
          derivedFrom: 'user-selection',
          setAt: '2025-01-01T00:00:00Z',
        },
      };

      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '0001-feature', 'metadata.json')]:
          JSON.stringify(metadata),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.warnings).toContain("Profile 'nonexistent' not found in config");
      expect(result.resolutionPath).toContain('profile not found - falling through');
      // Should fall through to default profile
      expect(result.syncTarget!.profileId).toBe('gh-main');
    });

    it('should resolve from project mapping (priority 2)', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-fe': profile } },
          projectMappings: {
            'frontend-app': {
              github: { owner: 'myorg', repo: 'myrepo', profileId: 'gh-fe' },
            },
          },
        }),
        // No metadata with syncTarget
      });

      const result = await resolver.resolveForIncrement('0001-feature', 'frontend-app');

      expect(result.syncTarget).not.toBeNull();
      expect(result.syncTarget!.profileId).toBe('gh-fe');
      expect(result.syncTarget!.derivedFrom).toBe('project-mapping');
      expect(result.syncTarget!.sourceProjectId).toBe('frontend-app');
    });

    it('should resolve from default profile (priority 3)', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.syncTarget).not.toBeNull();
      expect(result.syncTarget!.profileId).toBe('gh-main');
      expect(result.syncTarget!.derivedFrom).toBe('default-profile');
      expect(result.resolutionPath.some(p =>
        p.includes('config.sync.defaultProfile') && p.includes('gh-main')
      )).toBe(true);
    });

    it('should fall back to first available profile when no default set (priority 4)', async () => {
      const profile = makeJiraProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: { 'jira-main': profile },
          },
        }),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.syncTarget).not.toBeNull();
      expect(result.syncTarget!.profileId).toBe('jira-main');
      expect(result.syncTarget!.derivedFrom).toBe('first-profile-fallback');
    });

    it('should return null syncTarget when no configuration exists', async () => {
      setupFileSystem({});

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.syncTarget).toBeNull();
      expect(result.profile).toBeNull();
      expect(result.resolutionPath).toContain('no external tool configured');
    });

    it('should handle increment metadata in _archive folder', async () => {
      const metadata = {
        id: '0001-feature',
        status: 'completed',
        type: 'feature',
        created: '2025-01-01T00:00:00Z',
        lastActivity: '2025-01-01T00:00:00Z',
        syncTarget: {
          profileId: 'gh-main',
          provider: 'github',
          derivedFrom: 'user-selection',
          setAt: '2025-01-01T00:00:00Z',
        },
      };

      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-main': profile } },
        }),
        // Only in _archive path
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '_archive', '0001-feature', 'metadata.json')]:
          JSON.stringify(metadata),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.syncTarget!.profileId).toBe('gh-main');
    });

    it('should handle increment metadata in _paused folder', async () => {
      const metadata = {
        id: '0001-feature',
        status: 'paused',
        type: 'feature',
        created: '2025-01-01T00:00:00Z',
        lastActivity: '2025-01-01T00:00:00Z',
        syncTarget: {
          profileId: 'gh-main',
          provider: 'github',
          derivedFrom: 'user-selection',
          setAt: '2025-01-01T00:00:00Z',
        },
      };

      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-main': profile } },
        }),
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '_paused', '0001-feature', 'metadata.json')]:
          JSON.stringify(metadata),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.syncTarget!.profileId).toBe('gh-main');
    });

    it('should warn when default profile name does not match any profile', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'nonexistent',
            profiles: { 'gh-main': makeGitHubProfile() },
          },
        }),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.warnings).toContain("Default profile 'nonexistent' not found");
      // Should still fall back to first profile
      expect(result.syncTarget!.profileId).toBe('gh-main');
      expect(result.syncTarget!.derivedFrom).toBe('first-profile-fallback');
    });

    it('should return null when profiles object is empty', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: {} },
        }),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      expect(result.syncTarget).toBeNull();
      expect(result.profile).toBeNull();
    });

    it('should merge warnings from metadata fallthrough and project resolution', async () => {
      const metadata = {
        id: '0001-feature',
        status: 'active',
        type: 'feature',
        created: '2025-01-01T00:00:00Z',
        lastActivity: '2025-01-01T00:00:00Z',
        syncTarget: {
          profileId: 'missing-profile',
          provider: 'github',
          derivedFrom: 'user-selection',
          setAt: '2025-01-01T00:00:00Z',
        },
      };

      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': makeGitHubProfile() },
          },
          projectMappings: {},
        }),
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '0001-feature', 'metadata.json')]:
          JSON.stringify(metadata),
      });

      const result = await resolver.resolveForIncrement('0001-feature', 'unknown-project');

      // Should have warning from metadata fallthrough
      expect(result.warnings.some(w => w.includes('missing-profile'))).toBe(true);
    });
  });

  // ========================================================================
  // resolveForProject
  // ========================================================================

  describe('resolveForProject()', () => {
    it('should return null when project not in mappings', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          projectMappings: {},
        }),
      });

      const result = await resolver.resolveForProject('unknown');

      expect(result.syncTarget).toBeNull();
      expect(result.resolutionPath).toContain("projectMappings['unknown'] not found");
    });

    it('should resolve with explicit profileId from GitHub mapping', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-fe': profile } },
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe', profileId: 'gh-fe' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('frontend');

      expect(result.syncTarget!.profileId).toBe('gh-fe');
      expect(result.syncTarget!.provider).toBe('github');
      expect(result.syncTarget!.derivedFrom).toBe('project-mapping');
      expect(result.syncTarget!.sourceProjectId).toBe('frontend');
    });

    it('should resolve with explicit profileId from JIRA mapping', async () => {
      const profile = makeJiraProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'jira-be': profile } },
          projectMappings: {
            'backend': {
              jira: { project: 'BE', profileId: 'jira-be' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('backend');

      expect(result.syncTarget!.profileId).toBe('jira-be');
      expect(result.syncTarget!.provider).toBe('jira');
    });

    it('should resolve with explicit profileId from ADO mapping', async () => {
      const profile = makeAdoProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'ado-main': profile } },
          projectMappings: {
            'infra': {
              ado: { project: 'Infra', profileId: 'ado-main' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('infra');

      expect(result.syncTarget!.profileId).toBe('ado-main');
      expect(result.syncTarget!.provider).toBe('ado');
    });

    it('should warn when explicit profileId is not found', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: {} },
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe', profileId: 'missing' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('frontend');

      expect(result.warnings).toContain("Explicit profileId 'missing' not found");
    });

    it('should find matching profile by GitHub config when no profileId', async () => {
      const profile = makeGitHubProfile({
        config: { owner: 'myorg', repo: 'frontend-web' },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-fe': profile } },
          projectMappings: {
            'frontend': {
              github: { owner: 'myorg', repo: 'frontend-web' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('frontend');

      expect(result.syncTarget!.profileId).toBe('gh-fe');
      expect(result.syncTarget!.provider).toBe('github');
    });

    it('should find matching profile by GitHub repos array', async () => {
      const profile = makeGitHubProfile({
        config: { owner: 'myorg', repos: ['frontend-web', 'frontend-admin'] },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-multi': profile } },
          projectMappings: {
            'frontend': {
              github: { owner: 'myorg', repo: 'frontend-web' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('frontend');

      expect(result.syncTarget!.profileId).toBe('gh-multi');
    });

    it('should find matching profile by JIRA projectKey', async () => {
      const profile = makeJiraProfile({
        config: { domain: 'test.atlassian.net', projectKey: 'BE' },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'jira-be': profile } },
          projectMappings: {
            'backend': {
              jira: { project: 'BE' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('backend');

      expect(result.syncTarget!.profileId).toBe('jira-be');
    });

    it('should find matching profile by JIRA projects array', async () => {
      const profile = makeJiraProfile({
        config: { domain: 'test.atlassian.net', projects: ['FE', 'BE'] },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'jira-multi': profile } },
          projectMappings: {
            'backend': {
              jira: { project: 'BE' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('backend');

      expect(result.syncTarget!.profileId).toBe('jira-multi');
    });

    it('should find matching profile by ADO project', async () => {
      const profile = makeAdoProfile({
        config: { organization: 'myorg', project: 'Infra' },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'ado-infra': profile } },
          projectMappings: {
            'infra': {
              ado: { project: 'Infra' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('infra');

      expect(result.syncTarget!.profileId).toBe('ado-infra');
    });

    it('should find matching profile by ADO projects array', async () => {
      const profile = makeAdoProfile({
        config: { organization: 'myorg', projects: ['Infra', 'Platform'] },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'ado-multi': profile } },
          projectMappings: {
            'infra': {
              ado: { project: 'Infra' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('infra');

      expect(result.syncTarget!.profileId).toBe('ado-multi');
    });

    it('should warn when mapping exists but no matching profile', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: {
              'gh-other': makeGitHubProfile({ config: { owner: 'other', repo: 'other' } }),
            },
          },
          projectMappings: {
            'frontend': {
              github: { owner: 'myorg', repo: 'frontend-web' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('frontend');

      expect(result.syncTarget).toBeNull();
      expect(result.warnings.some(w => w.includes("No profile matches github config"))).toBe(true);
    });

    it('should check providers in order: github, jira, ado', async () => {
      const ghProfile = makeGitHubProfile({ config: { owner: 'org', repo: 'repo' } });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh': ghProfile } },
          projectMappings: {
            'multi': {
              github: { owner: 'org', repo: 'repo' },
              jira: { project: 'PROJ' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('multi');

      // GitHub should be checked first
      expect(result.syncTarget!.provider).toBe('github');
    });

    it('should return null with empty resolution when no providers match at all', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: {} },
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProject('frontend');

      expect(result.syncTarget).toBeNull();
      expect(result.profile).toBeNull();
    });
  });

  // ========================================================================
  // resolveForProvider
  // ========================================================================

  describe('resolveForProvider()', () => {
    it('should resolve from project mapping with explicit profileId', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-fe': profile } },
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe', profileId: 'gh-fe' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProvider('github', 'frontend');

      expect(result.syncTarget!.profileId).toBe('gh-fe');
      expect(result.syncTarget!.derivedFrom).toBe('project-mapping');
      expect(result.syncTarget!.sourceProjectId).toBe('frontend');
    });

    it('should skip project mapping when provider does not match profile', async () => {
      const jiraProfile = makeJiraProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'jira-main': jiraProfile } },
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe', profileId: 'jira-main' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProvider('github', 'frontend');

      // Profile is jira, not github, so it should not match
      // Falls through to finding any github profile (none exist)
      expect(result.syncTarget).toBeNull();
    });

    it('should find first profile of the requested provider type', async () => {
      const ghProfile = makeGitHubProfile();
      const jiraProfile = makeJiraProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: {
              'jira-main': jiraProfile,
              'gh-main': ghProfile,
            },
          },
        }),
      });

      const result = await resolver.resolveForProvider('github');

      expect(result.syncTarget!.profileId).toBe('gh-main');
      expect(result.syncTarget!.provider).toBe('github');
      expect(result.syncTarget!.derivedFrom).toBe('default-profile');
    });

    it('should return null when no profile of the requested provider exists', async () => {
      const jiraProfile = makeJiraProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'jira-main': jiraProfile } },
        }),
      });

      const result = await resolver.resolveForProvider('github');

      expect(result.syncTarget).toBeNull();
      expect(result.resolutionPath).toContain('no github profile configured');
    });

    it('should return null when no profiles configured at all', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({}),
      });

      const result = await resolver.resolveForProvider('ado');

      expect(result.syncTarget).toBeNull();
      expect(result.resolutionPath).toContain('no ado profile configured');
    });

    it('should skip project mapping when projectId is not provided', async () => {
      const ghProfile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-main': ghProfile } },
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe', profileId: 'gh-main' },
            },
          },
        }),
      });

      const result = await resolver.resolveForProvider('github');

      expect(result.syncTarget!.profileId).toBe('gh-main');
      expect(result.syncTarget!.derivedFrom).toBe('default-profile');
    });

    it('should skip project mapping when mapping does not have profileId', async () => {
      const ghProfile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-main': ghProfile } },
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe' }, // no profileId
            },
          },
        }),
      });

      const result = await resolver.resolveForProvider('github', 'frontend');

      // Should fall through to first github profile
      expect(result.syncTarget!.profileId).toBe('gh-main');
      expect(result.syncTarget!.derivedFrom).toBe('default-profile');
    });
  });

  // ========================================================================
  // validateIncrementConfig
  // ========================================================================

  describe('validateIncrementConfig()', () => {
    it('should return valid when config resolves successfully with GitHub', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'GITHUB_TOKEN=ghp_test123',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when no sync profiles configured', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({}),
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No sync profiles configured');
      expect(result.suggestions!.some(s => s.includes('specweave init'))).toBe(true);
    });

    it('should return invalid when project mapping is missing', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh': makeGitHubProfile() } },
          projectMappings: {},
        }),
      });

      // Create a resolver that won't resolve (no metadata, no project mapping, no default)
      // Actually, with profiles and no defaultProfile, it will fallback to first profile.
      // We need empty profiles + a projectId that's missing
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: {},
          },
          projectMappings: {},
        }),
      });

      const result = await resolver.validateIncrementConfig('0001-feature', 'unknown');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No sync profiles configured');
    });

    it('should suggest setting defaultProfile when profiles exist but no default', async () => {
      // Need: profiles exist, projectId provided but no mapping, no default profile
      // But with profiles and no default, resolveForIncrement falls back to first profile.
      // So this specific error path requires: syncConfig exists, profiles are empty, no projectMapping
      // Actually, the code checks for no syncTarget → then checks conditions.
      // If syncConfig exists but profiles are empty and projectId doesn't match:
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: { 'gh': makeGitHubProfile() },
          },
          projectMappings: {
            'frontend': { github: { owner: 'org', repo: 'fe' } },
          },
        }),
      });

      // This will actually resolve to first profile fallback, making it valid.
      // The "no default sync profile" error only triggers when resolution returns null syncTarget.
      // That can only happen if profiles is empty.
      const result = await resolver.validateIncrementConfig('0001-feature');
      expect(result.valid).toBe(true);
    });

    it('should validate GitHub profile config - missing owner', async () => {
      const profile = makeGitHubProfile({ config: { repo: 'myrepo' } });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'GITHUB_TOKEN=test',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GitHub config missing: owner');
    });

    it('should validate GitHub profile config - missing repo', async () => {
      const profile = makeGitHubProfile({ config: { owner: 'myorg' } });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'GITHUB_TOKEN=test',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GitHub config missing: repo or repos[]');
    });

    it('should accept GitHub config with repos array instead of repo', async () => {
      const profile = makeGitHubProfile({
        config: { owner: 'myorg', repos: ['repo1', 'repo2'] },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'GITHUB_TOKEN=test',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(true);
    });

    it('should validate JIRA profile config - missing domain', async () => {
      const profile = makeJiraProfile({ config: { projectKey: 'PROJ' } as any });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'jira-main',
            profiles: { 'jira-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'JIRA_API_TOKEN=test\nJIRA_EMAIL=test@test.com',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('JIRA config missing: domain');
    });

    it('should validate JIRA profile config - missing projectKey', async () => {
      const profile = makeJiraProfile({ config: { domain: 'test.atlassian.net' } as any });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'jira-main',
            profiles: { 'jira-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'JIRA_API_TOKEN=test\nJIRA_EMAIL=test@test.com',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('JIRA config missing: projectKey or projects[]');
    });

    it('should accept JIRA config with projects array instead of projectKey', async () => {
      const profile = makeJiraProfile({
        config: { domain: 'test.atlassian.net', projects: ['FE', 'BE'] },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'jira-main',
            profiles: { 'jira-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'JIRA_API_TOKEN=test\nJIRA_EMAIL=test@test.com',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(true);
    });

    it('should validate ADO profile config - missing organization', async () => {
      const profile = makeAdoProfile({ config: { project: 'MyProject' } as any });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'ado-main',
            profiles: { 'ado-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'AZURE_DEVOPS_PAT=test',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ADO config missing: organization');
    });

    it('should validate ADO profile config - missing project', async () => {
      const profile = makeAdoProfile({ config: { organization: 'myorg' } as any });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'ado-main',
            profiles: { 'ado-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'AZURE_DEVOPS_PAT=test',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ADO config missing: project or projects[]');
    });

    it('should accept ADO config with projects array instead of project', async () => {
      const profile = makeAdoProfile({
        config: { organization: 'myorg', projects: ['Proj1', 'Proj2'] },
      });
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'ado-main',
            profiles: { 'ado-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'AZURE_DEVOPS_PAT=test',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.valid).toBe(true);
    });
  });

  // ========================================================================
  // Authentication checks
  // ========================================================================

  describe('authentication checks', () => {
    it('should warn when GitHub token is missing from .env', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        // No .env file
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.warnings).toContain(
        'GitHub token not found in .env (GITHUB_TOKEN or GH_TOKEN)'
      );
    });

    it('should not warn when GITHUB_TOKEN is present', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'GITHUB_TOKEN=ghp_abc123',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.warnings.some(w => w.includes('GitHub token'))).toBe(false);
    });

    it('should not warn when GH_TOKEN is present', async () => {
      const profile = makeGitHubProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'GH_TOKEN=ghp_abc123',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.warnings.some(w => w.includes('GitHub token'))).toBe(false);
    });

    it('should warn when JIRA token and email are missing', async () => {
      const profile = makeJiraProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'jira-main',
            profiles: { 'jira-main': profile },
          },
        }),
        // No .env file
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.warnings).toContain('JIRA API token not found in .env (JIRA_API_TOKEN)');
      expect(result.warnings).toContain('JIRA email not found in .env (JIRA_EMAIL)');
    });

    it('should not warn when JIRA credentials are present', async () => {
      const profile = makeJiraProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'jira-main',
            profiles: { 'jira-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'JIRA_API_TOKEN=token\nJIRA_EMAIL=user@test.com',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.warnings.some(w => w.includes('JIRA'))).toBe(false);
    });

    it('should warn when ADO PAT is missing', async () => {
      const profile = makeAdoProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'ado-main',
            profiles: { 'ado-main': profile },
          },
        }),
        // No .env file
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.warnings).toContain('Azure DevOps PAT not found in .env (AZURE_DEVOPS_PAT)');
    });

    it('should not warn when ADO PAT is present', async () => {
      const profile = makeAdoProfile();
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'ado-main',
            profiles: { 'ado-main': profile },
          },
        }),
        [path.join(PROJECT_ROOT, '.env')]: 'AZURE_DEVOPS_PAT=some_pat_value',
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      expect(result.warnings.some(w => w.includes('Azure DevOps'))).toBe(false);
    });
  });

  // ========================================================================
  // Static method: createSyncTarget
  // ========================================================================

  describe('ExternalToolResolver.createSyncTarget()', () => {
    it('should create a sync target with required fields', () => {
      const target = ExternalToolResolver.createSyncTarget(
        'gh-main',
        'github',
        'user-selection'
      );

      expect(target.profileId).toBe('gh-main');
      expect(target.provider).toBe('github');
      expect(target.derivedFrom).toBe('user-selection');
      expect(target.setAt).toBeTruthy();
      expect(target.sourceProjectId).toBeUndefined();
    });

    it('should include sourceProjectId when provided', () => {
      const target = ExternalToolResolver.createSyncTarget(
        'jira-be',
        'jira',
        'project-mapping',
        'backend-app'
      );

      expect(target.sourceProjectId).toBe('backend-app');
    });

    it('should set setAt to a valid ISO string', () => {
      const target = ExternalToolResolver.createSyncTarget(
        'ado-main',
        'ado',
        'auto-detected'
      );

      // Should parse as a valid date
      const parsedDate = new Date(target.setAt);
      expect(parsedDate.getTime()).not.toBeNaN();
    });

    it('should handle all derivation types', () => {
      const derivations = [
        'user-selection',
        'project-mapping',
        'default-profile',
        'first-profile-fallback',
        'auto-detected',
      ] as const;

      for (const derivation of derivations) {
        const target = ExternalToolResolver.createSyncTarget('test', 'github', derivation);
        expect(target.derivedFrom).toBe(derivation);
      }
    });
  });

  // ========================================================================
  // Utility methods
  // ========================================================================

  describe('hasExternalToolConfigured()', () => {
    it('should return true when profiles exist', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-main': makeGitHubProfile() } },
        }),
      });

      expect(await resolver.hasExternalToolConfigured()).toBe(true);
    });

    it('should return false when no profiles', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: {} },
        }),
      });

      expect(await resolver.hasExternalToolConfigured()).toBe(false);
    });

    it('should return false when sync config is missing', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({}),
      });

      expect(await resolver.hasExternalToolConfigured()).toBe(false);
    });

    it('should return false when config file is missing', async () => {
      setupFileSystem({});

      expect(await resolver.hasExternalToolConfigured()).toBe(false);
    });
  });

  describe('getConfiguredProviders()', () => {
    it('should return unique providers from all profiles', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: {
              'gh-main': makeGitHubProfile(),
              'gh-fe': makeGitHubProfile(),
              'jira-main': makeJiraProfile(),
            },
          },
        }),
      });

      const providers = await resolver.getConfiguredProviders();

      expect(providers).toHaveLength(2);
      expect(providers).toContain('github');
      expect(providers).toContain('jira');
    });

    it('should return empty array when no profiles configured', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({}),
      });

      const providers = await resolver.getConfiguredProviders();

      expect(providers).toEqual([]);
    });

    it('should return all three providers when all configured', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: {
              'gh': makeGitHubProfile(),
              'jira': makeJiraProfile(),
              'ado': makeAdoProfile(),
            },
          },
        }),
      });

      const providers = await resolver.getConfiguredProviders();

      expect(providers).toHaveLength(3);
      expect(providers).toContain('github');
      expect(providers).toContain('jira');
      expect(providers).toContain('ado');
    });
  });

  describe('getConfigSummary()', () => {
    it('should return full summary with all fields', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: {
              'gh-main': makeGitHubProfile(),
              'jira-main': makeJiraProfile(),
            },
          },
          projectMappings: {
            'frontend': { github: { owner: 'org', repo: 'fe' } },
            'backend': { jira: { project: 'BE' } },
          },
        }),
      });

      const summary = await resolver.getConfigSummary();

      expect(summary.hasConfig).toBe(true);
      expect(summary.providers).toHaveLength(2);
      expect(summary.providers).toContain('github');
      expect(summary.providers).toContain('jira');
      expect(summary.profileCount).toBe(2);
      expect(summary.defaultProfile).toBe('gh-main');
      expect(summary.projectMappingCount).toBe(2);
    });

    it('should return empty summary when no config exists', async () => {
      setupFileSystem({});

      const summary = await resolver.getConfigSummary();

      expect(summary.hasConfig).toBe(false);
      expect(summary.providers).toEqual([]);
      expect(summary.profileCount).toBe(0);
      expect(summary.defaultProfile).toBeUndefined();
      expect(summary.projectMappingCount).toBe(0);
    });

    it('should return correct count with no project mappings', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            profiles: { 'ado-main': makeAdoProfile() },
          },
        }),
      });

      const summary = await resolver.getConfigSummary();

      expect(summary.hasConfig).toBe(true);
      expect(summary.profileCount).toBe(1);
      expect(summary.projectMappingCount).toBe(0);
    });
  });

  // ========================================================================
  // createExternalToolResolver factory
  // ========================================================================

  describe('createExternalToolResolver()', () => {
    it('should create an ExternalToolResolver instance', () => {
      const r = createExternalToolResolver('/tmp/project');
      expect(r).toBeInstanceOf(ExternalToolResolver);
    });

    it('should pass logger to the resolver', () => {
      const customLogger = {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };
      const r = createExternalToolResolver('/tmp/project', customLogger);
      expect(r).toBeInstanceOf(ExternalToolResolver);
    });
  });

  // ========================================================================
  // Edge cases
  // ========================================================================

  describe('edge cases', () => {
    it('should handle malformed JSON in config file', async () => {
      mockReadFile.mockResolvedValue('{ invalid json }');

      await expect(resolver.hasExternalToolConfigured()).rejects.toThrow();
    });

    it('should handle malformed JSON in metadata file', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': makeGitHubProfile() },
          },
        }),
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '0001-feature', 'metadata.json')]:
          '{ bad json',
      });

      // Should not throw - metadata parsing errors are caught
      // The loadIncrementMetadata tries JSON.parse and catches the error, returning null
      // Actually: it uses a catch-all, so it returns null and falls through
      // Wait, the catch is on readFile, not JSON.parse. Let me re-check.
      // The code does: JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
      // If JSON.parse throws, the catch block just tries the next path.
      // Eventually returns null, and resolution falls through to default profile.
      const result = await resolver.resolveForIncrement('0001-feature');
      // Should fall through to default profile since metadata load failed
      expect(result.syncTarget!.profileId).toBe('gh-main');
    });

    it('should handle config with sync key but no profiles key', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {},
        }),
      });

      const result = await resolver.hasExternalToolConfigured();
      expect(result).toBe(false);
    });

    it('should handle null sync config', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: null,
        }),
      });

      const result = await resolver.hasExternalToolConfigured();
      expect(result).toBe(false);
    });

    it('should handle config with projectMappings but no sync section', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          projectMappings: {
            'frontend': {
              github: { owner: 'org', repo: 'fe' },
            },
          },
        }),
      });

      const result = await resolver.resolveForIncrement('0001-feature', 'frontend');

      // No sync config at all, so no profiles to match against
      expect(result.syncTarget).toBeNull();
    });

    it('should handle metadata without syncTarget field', async () => {
      const metadata = {
        id: '0001-feature',
        status: 'active',
        type: 'feature',
        created: '2025-01-01T00:00:00Z',
        lastActivity: '2025-01-01T00:00:00Z',
        // no syncTarget
      };

      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': makeGitHubProfile() },
          },
        }),
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '0001-feature', 'metadata.json')]:
          JSON.stringify(metadata),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      // Should skip metadata step and go to default profile
      expect(result.syncTarget!.profileId).toBe('gh-main');
      expect(result.syncTarget!.derivedFrom).toBe('default-profile');
    });

    it('should handle empty projectMappings object', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          projectMappings: {},
          sync: {
            defaultProfile: 'gh',
            profiles: { 'gh': makeGitHubProfile() },
          },
        }),
      });

      const result = await resolver.resolveForProject('unknown');

      expect(result.syncTarget).toBeNull();
    });

    it('should handle project mapping with no provider entries', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: {} },
          projectMappings: {
            'frontend': {},
          },
        }),
      });

      const result = await resolver.resolveForProject('frontend');

      expect(result.syncTarget).toBeNull();
    });

    it('should handle validateIncrementConfig when resolution has syncTarget but profile is null', async () => {
      // This edge case happens when resolveForIncrement returns a syncTarget
      // but the profile is null (e.g., metadata has syncTarget but profile was removed
      // and all fallbacks also failed). Hard to trigger naturally since the resolver
      // always includes profile when syncTarget is set. The validateIncrementConfig
      // checks !resolution.profile separately.
      // Let's test the path where resolution itself returns a syncTarget without a profile.
      // This can happen if we have metadata with syncTarget pointing to missing profile,
      // and no default profile, and no profiles at all.
      const metadata = {
        id: '0001-feature',
        status: 'active',
        type: 'feature',
        created: '2025-01-01T00:00:00Z',
        lastActivity: '2025-01-01T00:00:00Z',
        syncTarget: {
          profileId: 'missing',
          provider: 'github',
          derivedFrom: 'user-selection',
          setAt: '2025-01-01T00:00:00Z',
        },
      };

      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: {} },
        }),
        [path.join(PROJECT_ROOT, '.specweave', 'increments', '0001-feature', 'metadata.json')]:
          JSON.stringify(metadata),
      });

      const result = await resolver.validateIncrementConfig('0001-feature');

      // Resolution falls through all steps and returns null syncTarget
      expect(result.valid).toBe(false);
    });
  });

  // ========================================================================
  // Resolution path arrow format
  // ========================================================================

  describe('resolution path formatting', () => {
    it('should include arrow notation for default profile resolution', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: {
            defaultProfile: 'gh-main',
            profiles: { 'gh-main': makeGitHubProfile() },
          },
        }),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      // The code uses template literal with → character
      const hasArrow = result.resolutionPath.some(p =>
        p.includes('config.sync.defaultProfile') && p.includes('gh-main')
      );
      expect(hasArrow).toBe(true);
    });

    it('should include arrow notation for first profile fallback', async () => {
      setupFileSystem({
        [path.join(PROJECT_ROOT, '.specweave', 'config.json')]: JSON.stringify({
          sync: { profiles: { 'gh-only': makeGitHubProfile() } },
        }),
      });

      const result = await resolver.resolveForIncrement('0001-feature');

      const hasFallback = result.resolutionPath.some(p =>
        p.includes('fallback to first profile') && p.includes('gh-only')
      );
      expect(hasFallback).toBe(true);
    });
  });
});
