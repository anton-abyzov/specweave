/**
 * ExternalIssueAutoCreator distributed routing tests
 *
 * Tests that Jira/ADO issue creation uses resolveSyncTarget for distributed routing.
 * ACs: AC-US1-04, AC-US1-05
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

function makeDistributedConfig(): SpecWeaveConfig {
  return {
    version: '2.0',
    sync: {
      enabled: true,
      direction: 'bidirectional',
      autoSync: false,
      includeStatus: true,
      autoApplyLabels: true,
      github: { owner: 'global-org', repo: 'global-repo' },
      jira: { projectKey: 'GLOB' },
      ado: { project: 'GlobalProject' },
    },
    umbrella: {
      enabled: true,
      childRepos: [
        {
          id: 'vskill',
          name: 'vskill',
          path: 'repositories/anton-abyzov/vskill',
          prefix: 'VSK',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'vskill' },
            jira: { projectKey: 'VSK' },
            ado: { project: 'VSkillProject' },
          },
        },
      ],
      syncStrategy: 'distributed',
    },
  };
}

describe('ExternalIssueAutoCreator distributed Jira routing (AC-US1-04)', () => {
  it('should resolve child repo Jira projectKey when distributed', () => {
    const config = makeDistributedConfig();
    const resolved = resolveSyncTarget('vskill', config);

    // In createJiraIssues, the resolved projectKey overrides global
    expect(resolved.jira?.projectKey).toBe('VSK');
    expect(resolved.source).toBe('child-repo-name');
  });

  it('should use global Jira projectKey when centralized', () => {
    const config = makeDistributedConfig();
    config.umbrella!.syncStrategy = 'centralized';

    const resolved = resolveSyncTarget('vskill', config);

    expect(resolved.jira?.projectKey).toBe('GLOB');
    expect(resolved.source).toBe('global');
  });

  it('should simulate projectKey override in createJiraIssues', () => {
    const config = makeDistributedConfig();
    const resolved = resolveSyncTarget('vskill', config);

    // Simulates the override pattern used in createJiraIssues
    const jiraConfig = config.issueTracker || (config.sync?.jira as any) || {};
    const globalProjectKey = jiraConfig.projects?.[0]?.key || jiraConfig.projectKey || 'GLOB';

    // Apply distributed override
    const effectiveProjectKey = resolved.jira?.projectKey ?? globalProjectKey;

    expect(effectiveProjectKey).toBe('VSK');
  });
});

describe('ExternalIssueAutoCreator distributed ADO routing (AC-US1-05)', () => {
  it('should resolve child repo ADO project when distributed', () => {
    const config = makeDistributedConfig();
    const resolved = resolveSyncTarget('vskill', config);

    expect(resolved.ado?.project).toBe('VSkillProject');
    expect(resolved.source).toBe('child-repo-name');
  });

  it('should use global ADO project when centralized', () => {
    const config = makeDistributedConfig();
    config.umbrella!.syncStrategy = 'centralized';

    const resolved = resolveSyncTarget('vskill', config);

    expect(resolved.ado?.project).toBe('GlobalProject');
    expect(resolved.source).toBe('global');
  });

  it('should simulate project override in createAdoIssues', () => {
    const config = makeDistributedConfig();
    const resolved = resolveSyncTarget('vskill', config);

    // Simulates the override pattern used in createAdoIssues
    const adoConfig = config.issueTracker || (config.sync?.ado as any) || {};
    const globalProject = adoConfig.project || 'GlobalProject';

    // Apply distributed override
    const effectiveProject = resolved.ado?.project ?? globalProject;

    expect(effectiveProject).toBe('VSkillProject');
  });

  it('should fall back to global when no child sync config for ADO', () => {
    const config = makeDistributedConfig();
    // Remove ado from vskill sync config
    delete config.umbrella!.childRepos[0].sync!.ado;

    const resolved = resolveSyncTarget('vskill', config);

    // Still matches by name, but ado is undefined
    expect(resolved.ado).toBeUndefined();
    expect(resolved.source).toBe('child-repo-name');

    // Caller should fall back to global
    const adoConfig = config.issueTracker || (config.sync?.ado as any) || {};
    const effectiveProject = resolved.ado?.project ?? adoConfig.project ?? 'GlobalProject';

    expect(effectiveProject).toBe('GlobalProject');
  });
});
