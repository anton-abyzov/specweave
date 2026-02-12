/**
 * Unit Tests: ProfileManager
 *
 * Tests the profile manager for multi-project sync.
 * Covers CRUD operations, validation, queries, and statistics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SyncProfile, SyncConfiguration } from '../../../../src/core/types/sync-profile.js';

// ============================================================================
// Mocks
// ============================================================================

const { mockReadFile, mockWriteFile, mockEnsureDir } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockEnsureDir: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  ensureDir: mockEnsureDir,
}));

import { ProfileManager } from '../../../../src/core/sync/profile-manager.js';

// ============================================================================
// Helpers
// ============================================================================

function makeProfile(overrides: Partial<SyncProfile> = {}): SyncProfile {
  return {
    provider: 'github',
    displayName: 'My GitHub Project',
    config: { owner: 'acme', repo: 'frontend' },
    timeRange: { default: '1M', max: '3M' },
    ...overrides,
  };
}

function makeConfig(overrides: Partial<SyncConfiguration> = {}): SyncConfiguration {
  return {
    profiles: {},
    settings: {
      canUpsertInternalItems: false,
      canUpdateExternalItems: false,
      canUpdateStatus: false,
      autoDetectProject: true,
      defaultTimeRange: '1M',
      rateLimitProtection: true,
    },
    ...overrides,
  };
}

function setupConfigFile(fullConfig: Record<string, unknown>): void {
  mockReadFile.mockResolvedValue(JSON.stringify(fullConfig));
}

// ============================================================================
// Tests
// ============================================================================

describe('ProfileManager', () => {
  let pm: ProfileManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
    pm = new ProfileManager('/project');
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    it('should set configPath based on projectRoot', () => {
      // The configPath is private, but we can test it indirectly via load()
      const mgr = new ProfileManager('/some/root');
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      // When load() is called, it reads from the expected path
      return mgr.load().then(() => {
        expect(mockReadFile).toHaveBeenCalledWith(
          '/some/root/.specweave/config.json',
          'utf-8'
        );
      });
    });
  });

  // ==========================================================================
  // load()
  // ==========================================================================

  describe('load()', () => {
    it('should parse sync section from config file', async () => {
      const syncConfig = makeConfig({
        profiles: { prod: makeProfile() },
        defaultProfile: 'prod',
      });
      setupConfigFile({ sync: syncConfig });

      const result = await pm.load();

      expect(result.profiles).toHaveProperty('prod');
      expect(result.defaultProfile).toBe('prod');
    });

    it('should return cached config on subsequent calls', async () => {
      setupConfigFile({ sync: makeConfig() });

      await pm.load();
      await pm.load();

      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should return default config when sync section is missing', async () => {
      setupConfigFile({ someOther: true });

      const result = await pm.load();

      expect(result.profiles).toEqual({});
      expect(result.settings?.autoDetectProject).toBe(true);
    });

    it('should return empty config on ENOENT error', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await pm.load();

      expect(result.profiles).toEqual({});
      expect(result.settings?.canUpsertInternalItems).toBe(true);
      expect(result.settings?.canUpdateExternalItems).toBe(true);
      expect(result.settings?.canUpdateStatus).toBe(true);
      expect(result.settings?.autoDetectProject).toBe(true);
      expect(result.settings?.defaultTimeRange).toBe('1M');
      expect(result.settings?.rateLimitProtection).toBe(true);
    });

    it('should re-throw non-ENOENT errors', async () => {
      mockReadFile.mockRejectedValue(new Error('permission denied'));

      await expect(pm.load()).rejects.toThrow('permission denied');
    });
  });

  // ==========================================================================
  // save()
  // ==========================================================================

  describe('save()', () => {
    it('should throw if config is not loaded first', async () => {
      await expect(pm.save()).rejects.toThrow('No configuration loaded. Call load() first.');
    });

    it('should merge sync section into existing config file', async () => {
      // First load triggers a config read
      setupConfigFile({ existingKey: 'value', sync: makeConfig() });
      await pm.load();

      // Reset the mock for the save read
      mockReadFile.mockResolvedValue(JSON.stringify({ existingKey: 'value' }));

      await pm.save();

      expect(mockEnsureDir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(1);

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.existingKey).toBe('value');
      expect(written.sync).toBeDefined();
      expect(written.sync.profiles).toEqual({});
    });

    it('should create new config file when none exists', async () => {
      // Load with ENOENT so config gets created from defaults
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await pm.load();

      // save() also reads, returns ENOENT
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await pm.save();

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync).toBeDefined();
    });

    it('should re-throw non-ENOENT errors during save read', async () => {
      // Load first
      setupConfigFile({ sync: makeConfig() });
      await pm.load();

      // save() read fails with non-ENOENT
      mockReadFile.mockRejectedValue(new Error('disk failure'));

      await expect(pm.save()).rejects.toThrow('disk failure');
    });
  });

  // ==========================================================================
  // getAllProfiles()
  // ==========================================================================

  describe('getAllProfiles()', () => {
    it('should return all profiles from config', async () => {
      const profiles = {
        prod: makeProfile({ displayName: 'Prod' }),
        staging: makeProfile({ displayName: 'Staging' }),
      };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      const result = await pm.getAllProfiles();

      expect(Object.keys(result)).toEqual(['prod', 'staging']);
    });

    it('should return empty object when no profiles exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      const result = await pm.getAllProfiles();

      expect(result).toEqual({});
    });
  });

  // ==========================================================================
  // getProfile()
  // ==========================================================================

  describe('getProfile()', () => {
    it('should return profile by ID', async () => {
      const profile = makeProfile({ displayName: 'Prod' });
      setupConfigFile({ sync: makeConfig({ profiles: { prod: profile } }) });

      const result = await pm.getProfile('prod');

      expect(result?.displayName).toBe('Prod');
    });

    it('should return null for non-existent profile', async () => {
      setupConfigFile({ sync: makeConfig() });

      const result = await pm.getProfile('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getDefaultProfile()
  // ==========================================================================

  describe('getDefaultProfile()', () => {
    it('should return default profile when set', async () => {
      const profile = makeProfile({ displayName: 'Default' });
      setupConfigFile({
        sync: makeConfig({
          profiles: { main: profile },
          defaultProfile: 'main',
        }),
      });

      const result = await pm.getDefaultProfile();

      expect(result).not.toBeNull();
      expect(result!.id).toBe('main');
      expect(result!.profile.displayName).toBe('Default');
    });

    it('should return null when no default is set', async () => {
      setupConfigFile({ sync: makeConfig() });

      const result = await pm.getDefaultProfile();

      expect(result).toBeNull();
    });

    it('should return null when default profile ID does not match any profile', async () => {
      setupConfigFile({
        sync: makeConfig({
          profiles: { other: makeProfile() },
          defaultProfile: 'missing',
        }),
      });

      const result = await pm.getDefaultProfile();

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // setDefaultProfile()
  // ==========================================================================

  describe('setDefaultProfile()', () => {
    it('should set the default profile and save', async () => {
      const profiles = {
        prod: makeProfile({ displayName: 'Prod' }),
        staging: makeProfile({ displayName: 'Staging' }),
      };
      setupConfigFile({ sync: makeConfig({ profiles }) });
      await pm.load();

      // Reset for save
      mockReadFile.mockResolvedValue(JSON.stringify({ sync: makeConfig({ profiles }) }));

      await pm.setDefaultProfile('staging');

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.defaultProfile).toBe('staging');
    });

    it('should throw when profile does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pm.setDefaultProfile('missing')).rejects.toThrow(
        "Profile 'missing' does not exist"
      );
    });
  });

  // ==========================================================================
  // createProfile()
  // ==========================================================================

  describe('createProfile()', () => {
    it('should create a valid profile and save', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pm.load();

      // Reset for save
      mockReadFile.mockResolvedValue(JSON.stringify({}));

      const profile = makeProfile();
      await pm.createProfile('my-project', profile);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.profiles['my-project']).toBeDefined();
    });

    it('should set as default if it is the first profile', async () => {
      setupConfigFile({ sync: makeConfig() });
      await pm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pm.createProfile('first-profile', makeProfile());

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.defaultProfile).toBe('first-profile');
    });

    it('should not override default if profiles already exist', async () => {
      const existingConfig = makeConfig({
        profiles: { existing: makeProfile() },
        defaultProfile: 'existing',
      });
      setupConfigFile({ sync: existingConfig });
      await pm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pm.createProfile('second-profile', makeProfile({ displayName: 'Second' }));

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.defaultProfile).toBe('existing');
    });

    it('should reject invalid profile ID format', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pm.createProfile('Invalid ID!', makeProfile())).rejects.toThrow(
        'Profile ID must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should reject uppercase characters in profile ID', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pm.createProfile('MyProfile', makeProfile())).rejects.toThrow(
        'Profile ID must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should reject duplicate profile IDs', async () => {
      setupConfigFile({
        sync: makeConfig({ profiles: { existing: makeProfile() } }),
      });

      await expect(pm.createProfile('existing', makeProfile())).rejects.toThrow(
        "Profile 'existing' already exists"
      );
    });

    it('should reject invalid profile data (missing provider)', async () => {
      setupConfigFile({ sync: makeConfig() });

      const invalid = makeProfile({ provider: '' as any });
      await expect(pm.createProfile('valid-id', invalid)).rejects.toThrow(
        'Invalid profile'
      );
    });

    it('should initialize profiles object when null', async () => {
      // Config with no profiles property at all
      const config = { settings: {} } as SyncConfiguration;
      setupConfigFile({ sync: config });
      await pm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pm.createProfile('new-one', makeProfile());

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.profiles['new-one']).toBeDefined();
    });
  });

  // ==========================================================================
  // updateProfile()
  // ==========================================================================

  describe('updateProfile()', () => {
    it('should merge updates into existing profile and save', async () => {
      const profiles = { prod: makeProfile({ displayName: 'Old Name' }) };
      setupConfigFile({ sync: makeConfig({ profiles }) });
      await pm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pm.updateProfile('prod', { displayName: 'New Name' });

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.profiles.prod.displayName).toBe('New Name');
      // Existing fields preserved
      expect(written.sync.profiles.prod.provider).toBe('github');
    });

    it('should throw when profile does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pm.updateProfile('missing', { displayName: 'X' })).rejects.toThrow(
        "Profile 'missing' does not exist"
      );
    });

    it('should reject updates that produce an invalid profile', async () => {
      const profiles = { prod: makeProfile() };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      await expect(
        pm.updateProfile('prod', { displayName: '' })
      ).rejects.toThrow('Invalid profile');
    });
  });

  // ==========================================================================
  // deleteProfile()
  // ==========================================================================

  describe('deleteProfile()', () => {
    it('should delete profile and save', async () => {
      const profiles = {
        prod: makeProfile(),
        staging: makeProfile({ displayName: 'Staging' }),
      };
      setupConfigFile({ sync: makeConfig({ profiles, defaultProfile: 'staging' }) });
      await pm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pm.deleteProfile('prod');

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.profiles.prod).toBeUndefined();
      expect(written.sync.profiles.staging).toBeDefined();
    });

    it('should reassign default when deleting the default profile', async () => {
      const profiles = {
        prod: makeProfile(),
        staging: makeProfile({ displayName: 'Staging' }),
      };
      setupConfigFile({ sync: makeConfig({ profiles, defaultProfile: 'prod' }) });
      await pm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pm.deleteProfile('prod');

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.defaultProfile).toBe('staging');
    });

    it('should clear default when deleting the last profile', async () => {
      const profiles = { only: makeProfile() };
      setupConfigFile({ sync: makeConfig({ profiles, defaultProfile: 'only' }) });
      await pm.load();

      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await pm.deleteProfile('only');

      const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(written.sync.defaultProfile).toBeUndefined();
    });

    it('should throw when profile does not exist', async () => {
      setupConfigFile({ sync: makeConfig() });

      await expect(pm.deleteProfile('missing')).rejects.toThrow(
        "Profile 'missing' does not exist"
      );
    });
  });

  // ==========================================================================
  // getProfilesByProvider()
  // ==========================================================================

  describe('getProfilesByProvider()', () => {
    it('should filter profiles by provider type', async () => {
      const profiles = {
        gh1: makeProfile({ provider: 'github' }),
        gh2: makeProfile({ provider: 'github', displayName: 'GH 2' }),
        jira1: makeProfile({ provider: 'jira', displayName: 'JIRA', config: { domain: 'x.atlassian.net', projectKey: 'X' } }),
      };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      const result = await pm.getProfilesByProvider('github');

      expect(Object.keys(result)).toEqual(['gh1', 'gh2']);
    });

    it('should return empty object when no match', async () => {
      const profiles = { gh: makeProfile({ provider: 'github' }) };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      const result = await pm.getProfilesByProvider('ado');

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getProfilesForProject()
  // ==========================================================================

  describe('getProfilesForProject()', () => {
    it('should match by project context name (case-insensitive)', async () => {
      const profiles = {
        sw: makeProfile({
          projectContext: {
            name: 'SpecWeave',
            keywords: ['sync', 'cli'],
          },
        }),
        other: makeProfile({
          projectContext: {
            name: 'OtherProject',
            keywords: ['web'],
          },
        }),
      };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      const result = await pm.getProfilesForProject('specweave');

      expect(Object.keys(result)).toEqual(['sw']);
    });

    it('should match by keywords', async () => {
      const profiles = {
        mobile: makeProfile({
          projectContext: {
            name: 'Mobile App',
            keywords: ['ios', 'android', 'react-native'],
          },
        }),
      };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      const result = await pm.getProfilesForProject('android');

      expect(Object.keys(result)).toEqual(['mobile']);
    });

    it('should match when keyword contains project name', async () => {
      const profiles = {
        full: makeProfile({
          projectContext: {
            name: 'Full Platform',
            keywords: ['react-native-ios-app'],
          },
        }),
      };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      // "ios" is contained in the keyword "react-native-ios-app"
      const result = await pm.getProfilesForProject('ios');

      expect(Object.keys(result)).toEqual(['full']);
    });

    it('should return empty when no project context matches', async () => {
      const profiles = {
        nocontext: makeProfile(), // no projectContext
      };
      setupConfigFile({ sync: makeConfig({ profiles }) });

      const result = await pm.getProfilesForProject('anything');

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  // ==========================================================================
  // validateProfile()
  // ==========================================================================

  describe('validateProfile()', () => {
    it('should validate a correct GitHub profile', () => {
      const result = pm.validateProfile(makeProfile());

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require provider', () => {
      const result = pm.validateProfile(makeProfile({ provider: '' as any }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider is required');
    });

    it('should reject invalid provider', () => {
      const result = pm.validateProfile(makeProfile({ provider: 'bitbucket' as any }));

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid provider'))).toBe(true);
    });

    it('should require display name', () => {
      const result = pm.validateProfile(makeProfile({ displayName: '' }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Display name is required');
    });

    it('should require display name not to be just whitespace', () => {
      const result = pm.validateProfile(makeProfile({ displayName: '   ' }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Display name is required');
    });

    it('should require config', () => {
      const result = pm.validateProfile(makeProfile({ config: undefined as any }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration is required');
    });

    it('should require GitHub owner', () => {
      const result = pm.validateProfile(
        makeProfile({ provider: 'github', config: { repo: 'x' } as any })
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GitHub owner is required');
    });

    it('should require GitHub repo', () => {
      const result = pm.validateProfile(
        makeProfile({ provider: 'github', config: { owner: 'x' } as any })
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GitHub repo is required');
    });

    it('should require JIRA domain and projectKey', () => {
      const result = pm.validateProfile(
        makeProfile({ provider: 'jira', config: {} as any })
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('JIRA domain is required');
      expect(result.errors).toContain('JIRA project key is required');
    });

    it('should require ADO organization and project', () => {
      const result = pm.validateProfile(
        makeProfile({ provider: 'ado', config: {} as any })
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ADO organization is required');
      expect(result.errors).toContain('ADO project is required');
    });

    it('should validate a correct JIRA profile', () => {
      const result = pm.validateProfile(
        makeProfile({
          provider: 'jira',
          config: { domain: 'x.atlassian.net', projectKey: 'SW' },
        })
      );

      expect(result.valid).toBe(true);
    });

    it('should validate a correct ADO profile', () => {
      const result = pm.validateProfile(
        makeProfile({
          provider: 'ado',
          config: { organization: 'myorg', project: 'myproj' },
        })
      );

      expect(result.valid).toBe(true);
    });

    it('should require timeRange', () => {
      const result = pm.validateProfile(
        makeProfile({ timeRange: undefined as any })
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Time range configuration is required');
    });

    it('should require default time range', () => {
      const result = pm.validateProfile(
        makeProfile({ timeRange: { max: '3M' } as any })
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Default time range is required');
    });

    it('should require max time range', () => {
      const result = pm.validateProfile(
        makeProfile({ timeRange: { default: '1M' } as any })
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum time range is required');
    });

    it('should warn when default exceeds max time range', () => {
      const result = pm.validateProfile(
        makeProfile({ timeRange: { default: '1Y', max: '1M' } })
      );

      expect(result.valid).toBe(true);
      expect(result.warnings?.some((w) => w.includes('should not exceed'))).toBe(true);
    });

    it('should warn when projectContext is missing', () => {
      const result = pm.validateProfile(makeProfile());

      expect(result.warnings?.some((w) => w.includes('Project context is recommended'))).toBe(true);
    });

    it('should warn when rateLimits.warnThreshold exceeds maxItemsPerSync', () => {
      const result = pm.validateProfile(
        makeProfile({
          rateLimits: { maxItemsPerSync: 50, warnThreshold: 100 },
        })
      );

      expect(result.warnings?.some((w) => w.includes('Warn threshold'))).toBe(true);
    });

    it('should not warn about rateLimits when correctly configured', () => {
      const result = pm.validateProfile(
        makeProfile({
          rateLimits: { maxItemsPerSync: 100, warnThreshold: 50 },
        })
      );

      expect(result.warnings?.some((w) => w.includes('Warn threshold'))).toBeFalsy();
    });

    it('should collect multiple errors at once', () => {
      const result = pm.validateProfile({
        provider: '' as any,
        displayName: '',
        config: undefined as any,
        timeRange: undefined as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // getStats()
  // ==========================================================================

  describe('getStats()', () => {
    it('should return correct statistics', async () => {
      const profiles = {
        gh1: makeProfile({ provider: 'github' }),
        gh2: makeProfile({ provider: 'github', displayName: 'GH 2' }),
        jira1: makeProfile({
          provider: 'jira',
          displayName: 'JIRA',
          config: { domain: 'x.atlassian.net', projectKey: 'X' },
        }),
      };
      setupConfigFile({
        sync: makeConfig({ profiles, defaultProfile: 'gh1' }),
      });

      const stats = await pm.getStats();

      expect(stats.totalProfiles).toBe(3);
      expect(stats.byProvider.github).toBe(2);
      expect(stats.byProvider.jira).toBe(1);
      expect(stats.byProvider.ado).toBe(0);
      expect(stats.defaultProfile).toBe('gh1');
    });

    it('should return zeros for empty config', async () => {
      setupConfigFile({ sync: makeConfig() });

      const stats = await pm.getStats();

      expect(stats.totalProfiles).toBe(0);
      expect(stats.byProvider.github).toBe(0);
      expect(stats.byProvider.jira).toBe(0);
      expect(stats.byProvider.ado).toBe(0);
      expect(stats.defaultProfile).toBeNull();
    });

    it('should return null for defaultProfile when not set', async () => {
      setupConfigFile({ sync: makeConfig({ profiles: { x: makeProfile() } }) });

      const stats = await pm.getStats();

      expect(stats.defaultProfile).toBeNull();
    });
  });
});
