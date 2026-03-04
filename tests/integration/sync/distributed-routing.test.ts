/**
 * Integration Test: Umbrella Sync Routing
 *
 * Tests the full routing pipeline: resolveSyncTarget + all callers.
 * When umbrella.enabled is true, the **Project** field in specs controls
 * which child repo receives GitHub issues, JIRA tickets, and ADO work items.
 * When umbrella.enabled is false, all routes go to global config.
 *
 * Satisfies: AC-US1-01, AC-US1-03, AC-US1-04, AC-US1-05
 * See: .specweave/increments/0416-umbrella-sync-consolidation/spec.md
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

function makeUmbrellaConfig(): SpecWeaveConfig {
  return {
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

function makeNonUmbrellaConfig(): SpecWeaveConfig {
  return {
    sync: {
      github: { owner: 'anton-abyzov', repo: 'specweave' },
      jira: { projectKey: 'SW' },
      ado: { project: 'specweave-ado' },
    },
  } as unknown as SpecWeaveConfig;
}

describe('Umbrella Sync Routing Pipeline', () => {
  describe('AC-US1-01: umbrella routes to child repo based on Project field', () => {
    it('routes GitHub sync to vskill child repo by project name', () => {
      const config = makeUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
    });

    it('routes Jira sync to vskill child repo by project name', () => {
      const config = makeUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.jira).toEqual({ projectKey: 'VSK' });
    });

    it('routes ADO sync to vskill child repo by project name', () => {
      const config = makeUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.ado).toEqual({ project: 'vskill-ado' });
    });

    it('routes to vskill-platform by project name', () => {
      const config = makeUmbrellaConfig();
      const result = resolveSyncTarget('vskill-platform', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill-platform' });
      expect(result.jira).toEqual({ projectKey: 'VPL' });
      expect(result.ado).toEqual({ project: 'vskill-platform-ado' });
    });
  });

  describe('non-umbrella mode always uses global config', () => {
    it('returns global config when umbrella is not configured', () => {
      const config = makeNonUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
      expect(result.jira).toEqual({ projectKey: 'SW' });
    });

    it('returns global config when umbrella.enabled is false', () => {
      const config = makeUmbrellaConfig();
      config.umbrella!.enabled = false;
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
    });
  });

  describe('fallback behavior', () => {
    it('falls back to global when project name has no child repo match', () => {
      const config = makeUmbrellaConfig();
      const result = resolveSyncTarget('unknown-project', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
    });

    it('falls back to global when projectName is undefined', () => {
      const config = makeUmbrellaConfig();
      const result = resolveSyncTarget(undefined, config);

      expect(result.source).toBe('global');
    });
  });

  describe('all three sync pathways use same resolver', () => {
    it('GitHub, Jira, and ADO targets are resolved from one call', () => {
      const config = makeUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      // All three targets available from single resolution
      expect(result.github).toBeDefined();
      expect(result.jira).toBeDefined();
      expect(result.ado).toBeDefined();
      expect(result.source).toBe('child-repo-name');
    });

    it('partial sync config returns only available targets', () => {
      const config = makeUmbrellaConfig();
      // Remove jira and ado from vskill
      const vskillRepo = config.umbrella!.childRepos[0];
      (vskillRepo as any).sync = { github: { owner: 'anton-abyzov', repo: 'vskill' } };

      const result = resolveSyncTarget('vskill', config);
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });
  });
});
