/**
 * Unit Tests: Status Mapper Service
 *
 * Tests the status mapping between SpecWeave increment statuses and external tool statuses.
 * Covers both standalone functions and the StatusMapper class methods.
 *
 * @module tests/unit/sync/status-mapper
 */

import { describe, it, expect } from 'vitest';
import type { SpecWeaveConfig, SyncConfiguration } from '../../../src/core/config/types.js';
import {
  isProviderEnabled,
  getProviderStatus,
  getEnabledProviders,
  StatusMapper,
} from '../../../src/sync/status-mapper.js';
import type {
  StatusSyncMappings,
  SyncConfigurationExtended,
  SyncProvider,
  ProviderStatus,
} from '../../../src/sync/status-mapper.js';

// ---------------------------------------------------------------------------
// Helpers to build minimal config objects
// ---------------------------------------------------------------------------

function makeConfig(syncOverrides?: Partial<SyncConfiguration>): SpecWeaveConfig {
  if (!syncOverrides) {
    return { version: '2.0' } as SpecWeaveConfig;
  }
  return {
    version: '2.0',
    sync: {
      enabled: false,
      direction: 'bidirectional',
      autoSync: false,
      includeStatus: false,
      autoApplyLabels: false,
      ...syncOverrides,
    },
  } as SpecWeaveConfig;
}

function makeConfigWithStatusSync(
  statusSyncMappings?: StatusSyncMappings,
  settingsOverrides?: Partial<SyncConfiguration['settings']>,
): SpecWeaveConfig {
  const sync: SyncConfigurationExtended = {
    enabled: true,
    direction: 'bidirectional',
    autoSync: false,
    includeStatus: true,
    autoApplyLabels: true,
  };
  if (statusSyncMappings) {
    sync.statusSync = { mappings: statusSyncMappings };
  }
  if (settingsOverrides) {
    sync.settings = {
      canUpsertInternalItems: false,
      canUpdateExternalItems: false,
      canUpdateStatus: false,
      ...settingsOverrides,
    };
  }
  return { version: '2.0', sync } as SpecWeaveConfig;
}

// ===========================================================================
// isProviderEnabled (standalone function)
// ===========================================================================

describe('isProviderEnabled()', () => {
  describe('when sync config is absent', () => {
    it('should return false for github', () => {
      const config = makeConfig();
      expect(isProviderEnabled(config, 'github')).toBe(false);
    });

    it('should return false for jira', () => {
      const config = makeConfig();
      expect(isProviderEnabled(config, 'jira')).toBe(false);
    });

    it('should return false for ado', () => {
      const config = makeConfig();
      expect(isProviderEnabled(config, 'ado')).toBe(false);
    });
  });

  describe('legacy format (sync.<provider>.enabled)', () => {
    it('should detect github enabled via legacy format', () => {
      const config = makeConfig({ github: { enabled: true, owner: 'org', repo: 'repo' } });
      expect(isProviderEnabled(config, 'github')).toBe(true);
    });

    it('should detect jira enabled via legacy format', () => {
      const config = makeConfig({ jira: { enabled: true, domain: 'test.atlassian.net' } });
      expect(isProviderEnabled(config, 'jira')).toBe(true);
    });

    it('should detect ado enabled via legacy format', () => {
      const config = makeConfig({ ado: { enabled: true, organization: 'myorg' } });
      expect(isProviderEnabled(config, 'ado')).toBe(true);
    });

    it('should return false when legacy provider exists but enabled is false', () => {
      const config = makeConfig({ github: { enabled: false } });
      expect(isProviderEnabled(config, 'github')).toBe(false);
    });

    it('should return false when legacy provider exists but enabled is undefined', () => {
      const config = makeConfig({ github: { owner: 'org', repo: 'repo' } });
      expect(isProviderEnabled(config, 'github')).toBe(false);
    });
  });

  describe('profiles format (sync.profiles)', () => {
    it('should detect github enabled via profiles', () => {
      const config = makeConfig({
        profiles: {
          main: {
            provider: 'github',
            displayName: 'GitHub Main',
            config: { owner: 'org', repo: 'repo' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      expect(isProviderEnabled(config, 'github')).toBe(true);
    });

    it('should detect jira enabled via profiles', () => {
      const config = makeConfig({
        profiles: {
          jira_main: {
            provider: 'jira',
            displayName: 'JIRA Cloud',
            config: { domain: 'test.atlassian.net', projectKey: 'PROJ' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      expect(isProviderEnabled(config, 'jira')).toBe(true);
    });

    it('should detect ado enabled via profiles', () => {
      const config = makeConfig({
        profiles: {
          ado_main: {
            provider: 'ado',
            displayName: 'Azure DevOps',
            config: { organization: 'myorg', project: 'myproject' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      expect(isProviderEnabled(config, 'ado')).toBe(true);
    });

    it('should return false when profiles exist but none match the provider', () => {
      const config = makeConfig({
        profiles: {
          main: {
            provider: 'github',
            displayName: 'GitHub Main',
            config: { owner: 'org', repo: 'repo' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      expect(isProviderEnabled(config, 'jira')).toBe(false);
    });

    it('should return false when profiles object is empty', () => {
      const config = makeConfig({ profiles: {} });
      expect(isProviderEnabled(config, 'github')).toBe(false);
    });
  });

  describe('combined legacy + profiles', () => {
    it('should return true when both formats enable the same provider', () => {
      const config = makeConfig({
        github: { enabled: true },
        profiles: {
          gh: {
            provider: 'github',
            displayName: 'GH',
            config: { owner: 'o', repo: 'r' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      expect(isProviderEnabled(config, 'github')).toBe(true);
    });

    it('should return true when legacy is disabled but profile enables it', () => {
      const config = makeConfig({
        github: { enabled: false },
        profiles: {
          gh: {
            provider: 'github',
            displayName: 'GH',
            config: { owner: 'o', repo: 'r' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      expect(isProviderEnabled(config, 'github')).toBe(true);
    });
  });

  describe('multiple profiles', () => {
    it('should find provider when it appears in the second profile', () => {
      const config = makeConfig({
        profiles: {
          gh: {
            provider: 'github',
            displayName: 'GH',
            config: { owner: 'o', repo: 'r' },
            timeRange: { default: '30d', max: '90d' },
          },
          jr: {
            provider: 'jira',
            displayName: 'JIRA',
            config: { domain: 'x.atlassian.net', projectKey: 'P' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      expect(isProviderEnabled(config, 'jira')).toBe(true);
    });
  });
});

// ===========================================================================
// getProviderStatus (standalone function)
// ===========================================================================

describe('getProviderStatus()', () => {
  describe('when sync config is absent', () => {
    it('should return disabled/none for any provider', () => {
      const config = makeConfig();
      const status = getProviderStatus(config, 'github');
      expect(status).toEqual({ enabled: false, source: 'none' });
    });
  });

  describe('legacy format', () => {
    it('should return enabled/legacy for github', () => {
      const config = makeConfig({ github: { enabled: true } });
      const status = getProviderStatus(config, 'github');
      expect(status).toEqual({ enabled: true, source: 'legacy' });
    });

    it('should return enabled/legacy for jira', () => {
      const config = makeConfig({ jira: { enabled: true } });
      const status = getProviderStatus(config, 'jira');
      expect(status).toEqual({ enabled: true, source: 'legacy' });
    });

    it('should return enabled/legacy for ado', () => {
      const config = makeConfig({ ado: { enabled: true } });
      const status = getProviderStatus(config, 'ado');
      expect(status).toEqual({ enabled: true, source: 'legacy' });
    });

    it('should return disabled/none when legacy provider.enabled is false', () => {
      const config = makeConfig({ github: { enabled: false } });
      const status = getProviderStatus(config, 'github');
      expect(status).toEqual({ enabled: false, source: 'none' });
    });
  });

  describe('profiles format', () => {
    it('should return enabled/profile with profileId for github', () => {
      const config = makeConfig({
        profiles: {
          'my-gh': {
            provider: 'github',
            displayName: 'GH',
            config: { owner: 'o', repo: 'r' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      const status = getProviderStatus(config, 'github');
      expect(status).toEqual({ enabled: true, source: 'profile', profileId: 'my-gh' });
    });

    it('should return enabled/profile with profileId for jira', () => {
      const config = makeConfig({
        profiles: {
          'jira-cloud': {
            provider: 'jira',
            displayName: 'JIRA Cloud',
            config: { domain: 'd.atlassian.net', projectKey: 'K' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      const status = getProviderStatus(config, 'jira');
      expect(status).toEqual({ enabled: true, source: 'profile', profileId: 'jira-cloud' });
    });

    it('should return the first matching profileId when multiple profiles match', () => {
      const config = makeConfig({
        profiles: {
          'gh-1': {
            provider: 'github',
            displayName: 'GH1',
            config: { owner: 'a', repo: 'b' },
            timeRange: { default: '30d', max: '90d' },
          },
          'gh-2': {
            provider: 'github',
            displayName: 'GH2',
            config: { owner: 'c', repo: 'd' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      const status = getProviderStatus(config, 'github');
      expect(status.enabled).toBe(true);
      expect(status.source).toBe('profile');
      // Should match first profile
      expect(status.profileId).toBe('gh-1');
    });

    it('should return disabled/none when profiles exist but none match', () => {
      const config = makeConfig({
        profiles: {
          gh: {
            provider: 'github',
            displayName: 'GH',
            config: { owner: 'o', repo: 'r' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      const status = getProviderStatus(config, 'ado');
      expect(status).toEqual({ enabled: false, source: 'none' });
    });
  });

  describe('priority: legacy over profiles', () => {
    it('should return legacy source when both legacy and profile enable the provider', () => {
      const config = makeConfig({
        github: { enabled: true },
        profiles: {
          gh: {
            provider: 'github',
            displayName: 'GH',
            config: { owner: 'o', repo: 'r' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      const status = getProviderStatus(config, 'github');
      // Legacy is checked first
      expect(status).toEqual({ enabled: true, source: 'legacy' });
    });
  });
});

// ===========================================================================
// getEnabledProviders (standalone function)
// ===========================================================================

describe('getEnabledProviders()', () => {
  it('should return empty array when no sync config', () => {
    const config = makeConfig();
    expect(getEnabledProviders(config)).toEqual([]);
  });

  it('should return empty array when no providers are enabled', () => {
    const config = makeConfig({
      github: { enabled: false },
      jira: { enabled: false },
      ado: { enabled: false },
    });
    expect(getEnabledProviders(config)).toEqual([]);
  });

  it('should return only github when only github is enabled', () => {
    const config = makeConfig({ github: { enabled: true } });
    expect(getEnabledProviders(config)).toEqual(['github']);
  });

  it('should return only jira when only jira is enabled', () => {
    const config = makeConfig({ jira: { enabled: true } });
    expect(getEnabledProviders(config)).toEqual(['jira']);
  });

  it('should return only ado when only ado is enabled', () => {
    const config = makeConfig({ ado: { enabled: true } });
    expect(getEnabledProviders(config)).toEqual(['ado']);
  });

  it('should return all three when all are enabled', () => {
    const config = makeConfig({
      github: { enabled: true },
      jira: { enabled: true },
      ado: { enabled: true },
    });
    expect(getEnabledProviders(config)).toEqual(['github', 'jira', 'ado']);
  });

  it('should return providers in fixed order: github, jira, ado', () => {
    // Even if ado is enabled before github in config, order is deterministic
    const config = makeConfig({
      ado: { enabled: true },
      github: { enabled: true },
    });
    const result = getEnabledProviders(config);
    expect(result).toEqual(['github', 'ado']);
  });

  it('should detect providers from profiles format', () => {
    const config = makeConfig({
      profiles: {
        jr: {
          provider: 'jira',
          displayName: 'JIRA',
          config: { domain: 'x.atlassian.net', projectKey: 'P' },
          timeRange: { default: '30d', max: '90d' },
        },
        az: {
          provider: 'ado',
          displayName: 'ADO',
          config: { organization: 'org', project: 'proj' },
          timeRange: { default: '30d', max: '90d' },
        },
      },
    });
    expect(getEnabledProviders(config)).toEqual(['jira', 'ado']);
  });

  it('should handle mixed legacy and profile formats', () => {
    const config = makeConfig({
      github: { enabled: true },
      profiles: {
        jr: {
          provider: 'jira',
          displayName: 'JIRA',
          config: { domain: 'x.atlassian.net', projectKey: 'P' },
          timeRange: { default: '30d', max: '90d' },
        },
      },
    });
    expect(getEnabledProviders(config)).toEqual(['github', 'jira']);
  });
});

// ===========================================================================
// StatusMapper class
// ===========================================================================

describe('StatusMapper', () => {
  describe('constructor', () => {
    it('should create an instance with the provided config', () => {
      const config = makeConfig();
      const mapper = new StatusMapper(config);
      expect(mapper).toBeInstanceOf(StatusMapper);
    });
  });

  // -----------------------------------------------------------------------
  // isProviderEnabled (instance method - delegates to standalone)
  // -----------------------------------------------------------------------

  describe('isProviderEnabled()', () => {
    it('should delegate to the standalone isProviderEnabled function', () => {
      const config = makeConfig({ github: { enabled: true } });
      const mapper = new StatusMapper(config);

      expect(mapper.isProviderEnabled('github')).toBe(true);
      expect(mapper.isProviderEnabled('jira')).toBe(false);
      expect(mapper.isProviderEnabled('ado')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getProviderStatus (instance method)
  // -----------------------------------------------------------------------

  describe('getProviderStatus()', () => {
    it('should delegate to the standalone getProviderStatus function', () => {
      const config = makeConfig({
        profiles: {
          gh: {
            provider: 'github',
            displayName: 'GH',
            config: { owner: 'o', repo: 'r' },
            timeRange: { default: '30d', max: '90d' },
          },
        },
      });
      const mapper = new StatusMapper(config);
      const status = mapper.getProviderStatus('github');
      expect(status).toEqual({ enabled: true, source: 'profile', profileId: 'gh' });
    });
  });

  // -----------------------------------------------------------------------
  // getEnabledProviders (instance method)
  // -----------------------------------------------------------------------

  describe('getEnabledProviders()', () => {
    it('should delegate to the standalone getEnabledProviders function', () => {
      const config = makeConfig({
        github: { enabled: true },
        jira: { enabled: true },
      });
      const mapper = new StatusMapper(config);
      expect(mapper.getEnabledProviders()).toEqual(['github', 'jira']);
    });
  });

  // -----------------------------------------------------------------------
  // getJiraCompletedStatus()
  // -----------------------------------------------------------------------

  describe('getJiraCompletedStatus()', () => {
    it('should return "Done" by default when no statusSync mapping is configured', () => {
      const config = makeConfig({ jira: { enabled: true } });
      const mapper = new StatusMapper(config);
      expect(mapper.getJiraCompletedStatus()).toBe('Done');
    });

    it('should return "Done" when statusSync exists but has no jira mapping', () => {
      const config = makeConfigWithStatusSync({});
      const mapper = new StatusMapper(config);
      expect(mapper.getJiraCompletedStatus()).toBe('Done');
    });

    it('should return "Done" when jira mapping exists but completed is undefined', () => {
      const config = makeConfigWithStatusSync({ jira: {} });
      const mapper = new StatusMapper(config);
      expect(mapper.getJiraCompletedStatus()).toBe('Done');
    });

    it('should return custom status when jira.completed is configured', () => {
      const config = makeConfigWithStatusSync({ jira: { completed: 'Resolved' } });
      const mapper = new StatusMapper(config);
      expect(mapper.getJiraCompletedStatus()).toBe('Resolved');
    });

    it('should return custom status for non-standard JIRA workflow', () => {
      const config = makeConfigWithStatusSync({ jira: { completed: 'Shipped' } });
      const mapper = new StatusMapper(config);
      expect(mapper.getJiraCompletedStatus()).toBe('Shipped');
    });

    it('should return "Done" when sync config is entirely absent', () => {
      const config = makeConfig();
      const mapper = new StatusMapper(config);
      expect(mapper.getJiraCompletedStatus()).toBe('Done');
    });
  });

  // -----------------------------------------------------------------------
  // getAdoCompletedState()
  // -----------------------------------------------------------------------

  describe('getAdoCompletedState()', () => {
    it('should return "Closed" by default when no statusSync mapping is configured', () => {
      const config = makeConfig({ ado: { enabled: true } });
      const mapper = new StatusMapper(config);
      expect(mapper.getAdoCompletedState()).toBe('Closed');
    });

    it('should return "Closed" when statusSync exists but has no ado mapping', () => {
      const config = makeConfigWithStatusSync({});
      const mapper = new StatusMapper(config);
      expect(mapper.getAdoCompletedState()).toBe('Closed');
    });

    it('should return "Closed" when ado mapping exists but completed is undefined', () => {
      const config = makeConfigWithStatusSync({ ado: {} });
      const mapper = new StatusMapper(config);
      expect(mapper.getAdoCompletedState()).toBe('Closed');
    });

    it('should handle string-based ado completed status', () => {
      const config = makeConfigWithStatusSync({ ado: { completed: 'Done' } });
      const mapper = new StatusMapper(config);
      expect(mapper.getAdoCompletedState()).toBe('Done');
    });

    it('should handle object-based ado completed status with state property', () => {
      const config = makeConfigWithStatusSync({ ado: { completed: { state: 'Resolved' } } });
      const mapper = new StatusMapper(config);
      expect(mapper.getAdoCompletedState()).toBe('Resolved');
    });

    it('should return "Closed" when sync config is entirely absent', () => {
      const config = makeConfig();
      const mapper = new StatusMapper(config);
      expect(mapper.getAdoCompletedState()).toBe('Closed');
    });

    it('should handle object with custom state name', () => {
      const config = makeConfigWithStatusSync({ ado: { completed: { state: 'Completed' } } });
      const mapper = new StatusMapper(config);
      expect(mapper.getAdoCompletedState()).toBe('Completed');
    });
  });

  // -----------------------------------------------------------------------
  // canUpdateExternal()
  // -----------------------------------------------------------------------

  describe('canUpdateExternal()', () => {
    it('should return false by default when sync config is absent', () => {
      const config = makeConfig();
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateExternal()).toBe(false);
    });

    it('should return false when sync exists but settings is absent', () => {
      const config = makeConfig({});
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateExternal()).toBe(false);
    });

    it('should return false when canUpdateExternalItems is false', () => {
      const config = makeConfigWithStatusSync(undefined, {
        canUpdateExternalItems: false,
      });
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateExternal()).toBe(false);
    });

    it('should return true when canUpdateExternalItems is true', () => {
      const config = makeConfigWithStatusSync(undefined, {
        canUpdateExternalItems: true,
      });
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateExternal()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // canUpdateStatus()
  // -----------------------------------------------------------------------

  describe('canUpdateStatus()', () => {
    it('should return false by default when sync config is absent', () => {
      const config = makeConfig();
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateStatus()).toBe(false);
    });

    it('should return false when sync exists but settings is absent', () => {
      const config = makeConfig({});
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateStatus()).toBe(false);
    });

    it('should return false when canUpdateStatus is false', () => {
      const config = makeConfigWithStatusSync(undefined, {
        canUpdateStatus: false,
      });
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateStatus()).toBe(false);
    });

    it('should return true when canUpdateStatus is true', () => {
      const config = makeConfigWithStatusSync(undefined, {
        canUpdateStatus: true,
      });
      const mapper = new StatusMapper(config);
      expect(mapper.canUpdateStatus()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // isAutoSyncEnabled()
  // -----------------------------------------------------------------------

  describe('isAutoSyncEnabled()', () => {
    it('should return true by default when sync config is absent', () => {
      const config = makeConfig();
      const mapper = new StatusMapper(config);
      // The nullish coalescing defaults to true
      expect(mapper.isAutoSyncEnabled()).toBe(true);
    });

    it('should return true when sync exists but settings is absent', () => {
      const config = makeConfig({});
      const mapper = new StatusMapper(config);
      expect(mapper.isAutoSyncEnabled()).toBe(true);
    });

    it('should return true when autoSyncOnCompletion is not set', () => {
      const config = makeConfigWithStatusSync(undefined, {
        canUpdateExternalItems: false,
      });
      const mapper = new StatusMapper(config);
      // autoSyncOnCompletion is not in settings, defaults to true
      expect(mapper.isAutoSyncEnabled()).toBe(true);
    });

    it('should return true when autoSyncOnCompletion is explicitly true', () => {
      const config = makeConfigWithStatusSync(undefined, {
        autoSyncOnCompletion: true,
      } as any);
      const mapper = new StatusMapper(config);
      expect(mapper.isAutoSyncEnabled()).toBe(true);
    });

    it('should return false when autoSyncOnCompletion is explicitly false', () => {
      const config = makeConfigWithStatusSync(undefined, {
        autoSyncOnCompletion: false,
      } as any);
      const mapper = new StatusMapper(config);
      expect(mapper.isAutoSyncEnabled()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // canUpsertInternal()
  // -----------------------------------------------------------------------

  describe('canUpsertInternal()', () => {
    it('should return true by default when sync config is absent', () => {
      const config = makeConfig();
      const mapper = new StatusMapper(config);
      // The nullish coalescing defaults to true
      expect(mapper.canUpsertInternal()).toBe(true);
    });

    it('should return true when sync exists but settings is absent', () => {
      const config = makeConfig({});
      const mapper = new StatusMapper(config);
      expect(mapper.canUpsertInternal()).toBe(true);
    });

    it('should return false when canUpsertInternalItems is false', () => {
      const config = makeConfigWithStatusSync(undefined, {
        canUpsertInternalItems: false,
      });
      const mapper = new StatusMapper(config);
      expect(mapper.canUpsertInternal()).toBe(false);
    });

    it('should return true when canUpsertInternalItems is true', () => {
      const config = makeConfigWithStatusSync(undefined, {
        canUpsertInternalItems: true,
      });
      const mapper = new StatusMapper(config);
      expect(mapper.canUpsertInternal()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Integration-style: full workflow
  // -----------------------------------------------------------------------

  describe('full configuration scenario', () => {
    it('should handle a fully configured multi-provider setup', () => {
      const config: SpecWeaveConfig = {
        version: '2.0',
        sync: {
          enabled: true,
          direction: 'bidirectional',
          autoSync: true,
          includeStatus: true,
          autoApplyLabels: true,
          github: { enabled: true, owner: 'org', repo: 'repo' },
          jira: { enabled: true, domain: 'test.atlassian.net', projectKey: 'PROJ' },
          ado: { enabled: true, organization: 'myorg', project: 'myproj' },
          settings: {
            canUpsertInternalItems: true,
            canUpdateExternalItems: true,
            canUpdateStatus: true,
            autoSyncOnCompletion: true,
          },
          statusSync: {
            mappings: {
              jira: { completed: 'Released' },
              ado: { completed: { state: 'Done' } },
            },
          },
        } as SyncConfigurationExtended,
      };

      const mapper = new StatusMapper(config);

      // All providers enabled
      expect(mapper.getEnabledProviders()).toEqual(['github', 'jira', 'ado']);

      // Status mappings
      expect(mapper.getJiraCompletedStatus()).toBe('Released');
      expect(mapper.getAdoCompletedState()).toBe('Done');

      // Permission checks
      expect(mapper.canUpdateExternal()).toBe(true);
      expect(mapper.canUpdateStatus()).toBe(true);
      expect(mapper.isAutoSyncEnabled()).toBe(true);
      expect(mapper.canUpsertInternal()).toBe(true);
    });

    it('should handle a minimal read-only config', () => {
      const config: SpecWeaveConfig = {
        version: '2.0',
        sync: {
          enabled: true,
          direction: 'import',
          autoSync: false,
          includeStatus: true,
          autoApplyLabels: false,
          settings: {
            canUpsertInternalItems: false,
            canUpdateExternalItems: false,
            canUpdateStatus: false,
            autoSyncOnCompletion: false,
          },
        },
      };

      const mapper = new StatusMapper(config);

      // No providers enabled
      expect(mapper.getEnabledProviders()).toEqual([]);

      // Default status mappings
      expect(mapper.getJiraCompletedStatus()).toBe('Done');
      expect(mapper.getAdoCompletedState()).toBe('Closed');

      // All permissions off
      expect(mapper.canUpdateExternal()).toBe(false);
      expect(mapper.canUpdateStatus()).toBe(false);
      expect(mapper.isAutoSyncEnabled()).toBe(false);
      expect(mapper.canUpsertInternal()).toBe(false);
    });
  });
});

// ===========================================================================
// Type exports (compile-time verification)
// ===========================================================================

describe('Type exports', () => {
  it('should export StatusSyncMappings type', () => {
    const mappings: StatusSyncMappings = {
      jira: { completed: 'Done' },
      ado: { completed: 'Closed' },
    };
    expect(mappings).toBeDefined();
  });

  it('should export SyncProvider type', () => {
    const provider: SyncProvider = 'github';
    expect(provider).toBe('github');
  });

  it('should export ProviderStatus type', () => {
    const status: ProviderStatus = { enabled: true, source: 'legacy' };
    expect(status).toBeDefined();
  });

  it('StatusSyncMappings should allow partial configuration', () => {
    const jiraOnly: StatusSyncMappings = { jira: { completed: 'Released' } };
    const adoOnly: StatusSyncMappings = { ado: { completed: { state: 'Done' } } };
    const empty: StatusSyncMappings = {};

    expect(jiraOnly).toBeDefined();
    expect(adoOnly).toBeDefined();
    expect(empty).toBeDefined();
  });

  it('ado completed can be string or object with state', () => {
    const asString: StatusSyncMappings = { ado: { completed: 'Done' } };
    const asObject: StatusSyncMappings = { ado: { completed: { state: 'Closed' } } };

    expect(asString.ado?.completed).toBe('Done');
    expect(asObject.ado?.completed).toEqual({ state: 'Closed' });
  });
});
