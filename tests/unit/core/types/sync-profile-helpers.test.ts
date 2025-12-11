/**
 * Unit tests for sync-profile helper functions
 *
 * Tests backward compatibility for activeProfile → defaultProfile migration
 * and new helper functions for iterating profiles.
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultProfile,
  getProfilesByProvider,
  getAllProfiles,
  hasProviderConfigured,
  type SyncProfiles,
  type SyncProfile,
} from '../../../../src/core/types/sync-profile.js';

describe('sync-profile helpers', () => {
  describe('getDefaultProfile', () => {
    it('should return defaultProfile when only defaultProfile is set', () => {
      const config: Pick<SyncProfiles, 'defaultProfile' | 'activeProfile'> = {
        defaultProfile: 'new-profile',
      };

      expect(getDefaultProfile(config)).toBe('new-profile');
    });

    it('should return undefined when defaultProfile is not set', () => {
      const config: Pick<SyncProfiles, 'defaultProfile'> = {};

      expect(getDefaultProfile(config)).toBeUndefined();
    });

    it('should return undefined for null config', () => {
      expect(getDefaultProfile(undefined)).toBeUndefined();
    });

    it('should handle empty string defaultProfile correctly', () => {
      // Empty string is a valid value (nullish coalescing only falls back on null/undefined)
      const config: Pick<SyncProfiles, 'defaultProfile' | 'activeProfile'> = {
        defaultProfile: '',
        activeProfile: 'legacy-profile',
      };

      // Empty string is falsy but NOT nullish, so it should be returned
      expect(getDefaultProfile(config)).toBe('');
    });
  });

  describe('getProfilesByProvider', () => {
    const createTestProfiles = (): Pick<SyncProfiles, 'profiles'> => ({
      profiles: {
        'github-main': {
          provider: 'github',
          displayName: 'GitHub Main',
          config: { owner: 'test', repo: 'main' },
          timeRange: { default: '1M', max: '6M' },
        } as SyncProfile,
        'github-secondary': {
          provider: 'github',
          displayName: 'GitHub Secondary',
          config: { owner: 'test', repo: 'secondary' },
          timeRange: { default: '1M', max: '6M' },
        } as SyncProfile,
        'ado-project': {
          provider: 'ado',
          displayName: 'ADO Project',
          config: { organization: 'testorg', project: 'TestProject' },
          timeRange: { default: '1M', max: '6M' },
        } as SyncProfile,
        'jira-board': {
          provider: 'jira',
          displayName: 'JIRA Board',
          config: { domain: 'test.atlassian.net', projectKey: 'TEST' },
          timeRange: { default: '1M', max: '6M' },
        } as SyncProfile,
      },
    });

    it('should return only GitHub profiles', () => {
      const config = createTestProfiles();
      const githubProfiles = getProfilesByProvider(config, 'github');

      expect(githubProfiles).toHaveLength(2);
      expect(githubProfiles.map(([name]) => name)).toContain('github-main');
      expect(githubProfiles.map(([name]) => name)).toContain('github-secondary');
    });

    it('should return only ADO profiles', () => {
      const config = createTestProfiles();
      const adoProfiles = getProfilesByProvider(config, 'ado');

      expect(adoProfiles).toHaveLength(1);
      expect(adoProfiles[0][0]).toBe('ado-project');
    });

    it('should return only JIRA profiles', () => {
      const config = createTestProfiles();
      const jiraProfiles = getProfilesByProvider(config, 'jira');

      expect(jiraProfiles).toHaveLength(1);
      expect(jiraProfiles[0][0]).toBe('jira-board');
    });

    it('should return empty array for provider with no profiles', () => {
      const config: Pick<SyncProfiles, 'profiles'> = {
        profiles: {
          'github-only': {
            provider: 'github',
            displayName: 'GitHub Only',
            config: { owner: 'test', repo: 'only' },
            timeRange: { default: '1M', max: '6M' },
          } as SyncProfile,
        },
      };

      expect(getProfilesByProvider(config, 'ado')).toHaveLength(0);
      expect(getProfilesByProvider(config, 'jira')).toHaveLength(0);
    });

    it('should return empty array for undefined config', () => {
      expect(getProfilesByProvider(undefined, 'github')).toHaveLength(0);
    });

    it('should return empty array for config without profiles', () => {
      const config: Pick<SyncProfiles, 'profiles'> = { profiles: {} };
      expect(getProfilesByProvider(config, 'github')).toHaveLength(0);
    });
  });

  describe('getAllProfiles', () => {
    it('should return all profiles regardless of provider', () => {
      const config: Pick<SyncProfiles, 'profiles'> = {
        profiles: {
          'profile-1': {
            provider: 'github',
            displayName: 'Profile 1',
            config: {},
            timeRange: { default: '1M', max: '6M' },
          } as SyncProfile,
          'profile-2': {
            provider: 'ado',
            displayName: 'Profile 2',
            config: {},
            timeRange: { default: '1M', max: '6M' },
          } as SyncProfile,
          'profile-3': {
            provider: 'jira',
            displayName: 'Profile 3',
            config: {},
            timeRange: { default: '1M', max: '6M' },
          } as SyncProfile,
        },
      };

      const allProfiles = getAllProfiles(config);

      expect(allProfiles).toHaveLength(3);
      expect(allProfiles.map(([name]) => name)).toEqual([
        'profile-1',
        'profile-2',
        'profile-3',
      ]);
    });

    it('should return empty array for undefined config', () => {
      expect(getAllProfiles(undefined)).toHaveLength(0);
    });

    it('should return empty array for empty profiles', () => {
      expect(getAllProfiles({ profiles: {} })).toHaveLength(0);
    });
  });

  describe('hasProviderConfigured', () => {
    it('should return true when provider has profiles', () => {
      const config: Pick<SyncProfiles, 'profiles'> = {
        profiles: {
          'github-profile': {
            provider: 'github',
            displayName: 'GitHub',
            config: {},
            timeRange: { default: '1M', max: '6M' },
          } as SyncProfile,
        },
      };

      expect(hasProviderConfigured(config, 'github')).toBe(true);
    });

    it('should return false when provider has no profiles', () => {
      const config: Pick<SyncProfiles, 'profiles'> = {
        profiles: {
          'github-profile': {
            provider: 'github',
            displayName: 'GitHub',
            config: {},
            timeRange: { default: '1M', max: '6M' },
          } as SyncProfile,
        },
      };

      expect(hasProviderConfigured(config, 'ado')).toBe(false);
      expect(hasProviderConfigured(config, 'jira')).toBe(false);
    });

    it('should return false for undefined config', () => {
      expect(hasProviderConfigured(undefined, 'github')).toBe(false);
    });

    it('should return false for empty profiles', () => {
      expect(hasProviderConfigured({ profiles: {} }, 'github')).toBe(false);
    });
  });

  describe('profile configuration', () => {
    it('should work with config using defaultProfile', () => {
      // Simulates a config.json from v0.31.0+
      const newConfig = {
        defaultProfile: 'specweave-dev',
        profiles: {
          'specweave-dev': {
            provider: 'github' as const,
            displayName: 'SpecWeave Development',
            config: {
              owner: 'anton-abyzov',
              repo: 'specweave',
            },
            timeRange: { default: '1M' as const, max: '6M' as const },
          },
        },
      };

      // getDefaultProfile should return the new defaultProfile
      expect(getDefaultProfile(newConfig)).toBe('specweave-dev');

      // All other helpers should work the same
      expect(getProfilesByProvider(newConfig, 'github')).toHaveLength(1);
      expect(hasProviderConfigured(newConfig, 'github')).toBe(true);
    });

    it('should work with multiple profiles', () => {
      const config = {
        defaultProfile: 'github-profile',
        profiles: {
          'github-profile': {
            provider: 'github' as const,
            displayName: 'GitHub Profile',
            config: { owner: 'test', repo: 'repo1' },
            timeRange: { default: '1M' as const, max: '6M' as const },
          },
          'ado-profile': {
            provider: 'ado' as const,
            displayName: 'ADO Profile',
            config: { organization: 'test', project: 'proj1' },
            timeRange: { default: '1M' as const, max: '6M' as const },
          },
        },
      };

      // defaultProfile should be returned
      expect(getDefaultProfile(config)).toBe('github-profile');
      // Both providers should be configured
      expect(hasProviderConfigured(config, 'github')).toBe(true);
      expect(hasProviderConfigured(config, 'ado')).toBe(true);
    });
  });
});
