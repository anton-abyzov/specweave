/**
 * ExternalIssueAutoCreator workspace routing tests
 *
 * Tests that Jira/ADO issue creation uses resolveSyncTarget for workspace routing.
 * ACs: AC-US1-04, AC-US1-05
 * (0865 T-005: migrated from legacy `umbrella` config to `workspace`; assertions
 * preserved verbatim to prove routing equivalence.)
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

function makeWorkspaceConfig(): SpecWeaveConfig {
  return {
    version: '3.0',
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
    workspace: {
      name: 'workspace',
      repos: [
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
    },
  } as SpecWeaveConfig;
}

describe('ExternalIssueAutoCreator workspace Jira routing (AC-US1-04)', () => {
  it('should resolve repo Jira projectKey when workspace configured', () => {
    const config = makeWorkspaceConfig();
    const resolved = resolveSyncTarget('vskill', config);

    expect(resolved.jira?.projectKey).toBe('VSK');
    expect(resolved.source).toBe('child-repo-name');
  });

  it('should use global Jira projectKey when no workspace', () => {
    const config = makeWorkspaceConfig();
    delete config.workspace;

    const resolved = resolveSyncTarget('vskill', config);

    expect(resolved.jira?.projectKey).toBe('GLOB');
    expect(resolved.source).toBe('global');
  });

  it('should simulate projectKey override in createJiraIssues', () => {
    const config = makeWorkspaceConfig();
    const resolved = resolveSyncTarget('vskill', config);

    // Simulates the override pattern used in createJiraIssues
    const jiraConfig = config.issueTracker || (config.sync?.jira as any) || {};
    const globalProjectKey = jiraConfig.projects?.[0]?.key || jiraConfig.projectKey || 'GLOB';

    // Apply per-repo override
    const effectiveProjectKey = resolved.jira?.projectKey ?? globalProjectKey;

    expect(effectiveProjectKey).toBe('VSK');
  });
});

describe('ExternalIssueAutoCreator workspace ADO routing (AC-US1-05)', () => {
  it('should resolve repo ADO project when workspace configured', () => {
    const config = makeWorkspaceConfig();
    const resolved = resolveSyncTarget('vskill', config);

    expect(resolved.ado?.project).toBe('VSkillProject');
    expect(resolved.source).toBe('child-repo-name');
  });

  it('should use global ADO project when no workspace', () => {
    const config = makeWorkspaceConfig();
    delete config.workspace;

    const resolved = resolveSyncTarget('vskill', config);

    expect(resolved.ado?.project).toBe('GlobalProject');
    expect(resolved.source).toBe('global');
  });

  it('should simulate project override in createAdoIssues', () => {
    const config = makeWorkspaceConfig();
    const resolved = resolveSyncTarget('vskill', config);

    const adoConfig = config.issueTracker || (config.sync?.ado as any) || {};
    const globalProject = adoConfig.project || 'GlobalProject';

    const effectiveProject = resolved.ado?.project ?? globalProject;

    expect(effectiveProject).toBe('VSkillProject');
  });

  it('should fall back to global when no repo sync config for ADO', () => {
    const config = makeWorkspaceConfig();
    delete config.workspace!.repos[0].sync!.ado;

    const resolved = resolveSyncTarget('vskill', config);

    // Still matches by id, but ado is undefined
    expect(resolved.ado).toBeUndefined();
    expect(resolved.source).toBe('child-repo-name');

    // Caller should fall back to global
    const adoConfig = config.issueTracker || (config.sync?.ado as any) || {};
    const effectiveProject = resolved.ado?.project ?? adoConfig.project ?? 'GlobalProject';

    expect(effectiveProject).toBe('GlobalProject');
  });
});
