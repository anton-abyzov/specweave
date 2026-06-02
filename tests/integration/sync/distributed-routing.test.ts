/**
 * Integration Test: Workspace Sync Routing
 *
 * Tests the full routing pipeline: resolveSyncTarget + all callers.
 * When a workspace is configured, the **Project** field in specs controls
 * which repo receives GitHub issues, JIRA tickets, and ADO work items.
 * When no workspace is configured, all routes go to global config.
 *
 * Satisfies: AC-US1-01, AC-US1-03, AC-US1-04, AC-US1-05
 * (0865 T-005: migrated from legacy `umbrella` config to `workspace`;
 * assertions preserved verbatim to prove routing equivalence.)
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

function makeWorkspaceConfig(): SpecWeaveConfig {
  return {
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
            ado: { project: 'vskill-ado' },
          },
        },
        {
          id: 'vskill-platform',
          name: 'vskill-platform',
          path: 'repositories/anton-abyzov/vskill-platform',
          prefix: 'VPL',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'vskill-platform' },
            jira: { projectKey: 'VPL' },
            ado: { project: 'vskill-platform-ado' },
          },
        },
      ],
    },
    sync: {
      github: { owner: 'anton-abyzov', repo: 'specweave' },
      jira: { projectKey: 'SW' },
      ado: { project: 'specweave-ado' },
    },
  } as unknown as SpecWeaveConfig;
}

function makeNonWorkspaceConfig(): SpecWeaveConfig {
  return {
    sync: {
      github: { owner: 'anton-abyzov', repo: 'specweave' },
      jira: { projectKey: 'SW' },
      ado: { project: 'specweave-ado' },
    },
  } as unknown as SpecWeaveConfig;
}

describe('Workspace Sync Routing Pipeline', () => {
  describe('AC-US1-01: workspace routes to repo based on Project field', () => {
    it('routes GitHub sync to vskill child repo by project name', () => {
      const config = makeWorkspaceConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
    });

    it('routes Jira sync to vskill child repo by project name', () => {
      const config = makeWorkspaceConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.jira).toEqual({ projectKey: 'VSK' });
    });

    it('routes ADO sync to vskill child repo by project name', () => {
      const config = makeWorkspaceConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.ado?.project).toBe('vskill-ado');
    });

    it('routes to vskill-platform by project name', () => {
      const config = makeWorkspaceConfig();
      const result = resolveSyncTarget('vskill-platform', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill-platform' });
      expect(result.jira).toEqual({ projectKey: 'VPL' });
      expect(result.ado?.project).toBe('vskill-platform-ado');
    });
  });

  describe('non-workspace mode always uses global config', () => {
    it('returns global config when workspace is not configured', () => {
      const config = makeNonWorkspaceConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
      expect(result.jira).toEqual({ projectKey: 'SW' });
    });

    it('returns global config when workspace has no repos', () => {
      const config = makeWorkspaceConfig();
      delete config.workspace;
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
    });
  });

  describe('fallback behavior', () => {
    it('falls back to global when project name has no child repo match', () => {
      const config = makeWorkspaceConfig();
      const result = resolveSyncTarget('unknown-project', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
    });

    it('falls back to global when projectName is undefined', () => {
      const config = makeWorkspaceConfig();
      const result = resolveSyncTarget(undefined, config);

      expect(result.source).toBe('global');
    });
  });

  describe('all three sync pathways use same resolver', () => {
    it('GitHub, Jira, and ADO targets are resolved from one call', () => {
      const config = makeWorkspaceConfig();
      const result = resolveSyncTarget('vskill', config);

      // All three targets available from single resolution
      expect(result.github).toBeDefined();
      expect(result.jira).toBeDefined();
      expect(result.ado).toBeDefined();
      expect(result.source).toBe('child-repo-name');
    });

    it('partial sync config returns only available targets', () => {
      const config = makeWorkspaceConfig();
      // Remove jira and ado from vskill
      const vskillRepo = config.workspace!.repos[0];
      (vskillRepo as any).sync = { github: { owner: 'anton-abyzov', repo: 'vskill' } };

      const result = resolveSyncTarget('vskill', config);
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });
  });
});
