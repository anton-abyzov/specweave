/**
 * E2E Test: Umbrella Sync Routing with All Three Platforms
 *
 * Verifies that when umbrella.enabled=true, the resolveSyncTarget function
 * correctly routes GitHub, JIRA, and ADO sync targets to child repos based
 * on the **Project** field. Tests the complete config → resolver → target flow.
 *
 * Scenarios:
 * 1. Internal routing: umbrella=true, each child repo gets correct targets
 * 2. External routing: all three platforms (GitHub, JIRA, ADO) resolve per-repo
 * 3. Umbrella project match: work targeting the umbrella itself
 * 4. Fallback: unknown project falls back to global
 * 5. Partial config: child repo with only some platforms configured
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

/**
 * Config that mirrors the real specweave-umb umbrella config.
 * Three child repos, all with GitHub + JIRA + ADO sync targets.
 */
function makeFullUmbrellaConfig(): SpecWeaveConfig {
  return {
    version: '2.0',
    sync: {
      enabled: true,
      direction: 'bidirectional',
      autoSync: true,
      includeStatus: true,
      autoApplyLabels: true,
      github: { enabled: true, owner: 'anton-abyzov', repo: 'specweave-umb' },
      jira: { enabled: true, projectKey: 'SWE2E' },
      ado: { enabled: true, organization: 'EasyChamp', project: 'SpecWeaveSync' },
    },
    umbrella: {
      enabled: true,
      projectName: 'specweave-umb',
      sync: {
        github: { owner: 'anton-abyzov', repo: 'specweave-umb' },
        jira: { projectKey: 'SWE2E' },
        ado: { organization: 'EasyChamp', project: 'SpecWeaveSync' },
      },
      childRepos: [
        {
          id: 'specweave',
          name: 'specweave',
          path: 'repositories/anton-abyzov/specweave',
          prefix: 'SPE',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'specweave' },
            jira: { projectKey: 'WTTC' },
            ado: { organization: 'EasyChamp', project: 'SpecWeaveSync' },
          },
        },
        {
          id: 'vskill',
          name: 'vskill',
          path: 'repositories/anton-abyzov/vskill',
          prefix: 'VSK',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'vskill' },
            jira: { projectKey: 'SWE2E' },
            ado: { organization: 'EasyChamp', project: 'VSkillSync' },
          },
        },
        {
          id: 'vskill-platform',
          name: 'vskill-platform',
          path: 'repositories/anton-abyzov/vskill-platform',
          prefix: 'VPL',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'vskill-platform' },
            jira: { projectKey: 'SWE2E' },
            ado: { organization: 'EasyChamp', project: 'VSkillPlatformSync' },
          },
        },
      ],
    },
  };
}

describe('E2E: Umbrella Routing — All Three Platforms (GitHub/JIRA/ADO)', () => {
  describe('Scenario 1: Internal routing — each child repo gets correct targets', () => {
    it('specweave repo: GitHub → specweave, JIRA → WTTC, ADO → SpecWeaveSync', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('specweave', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
      expect(result.jira).toEqual({ projectKey: 'WTTC' });
      expect(result.ado).toEqual({ organization: 'EasyChamp', project: 'SpecWeaveSync' });
    });

    it('vskill repo: GitHub → vskill, JIRA → SWE2E, ADO → VSkillSync', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
      expect(result.jira).toEqual({ projectKey: 'SWE2E' });
      expect(result.ado).toEqual({ organization: 'EasyChamp', project: 'VSkillSync' });
    });

    it('vskill-platform repo: GitHub → vskill-platform, JIRA → SWE2E, ADO → VSkillPlatformSync', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('vskill-platform', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill-platform' });
      expect(result.jira).toEqual({ projectKey: 'SWE2E' });
      expect(result.ado).toEqual({ organization: 'EasyChamp', project: 'VSkillPlatformSync' });
    });
  });

  describe('Scenario 2: External routing — all three platforms resolve from single call', () => {
    it('single resolveSyncTarget call returns GitHub + JIRA + ADO for child repo', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      // All three platforms resolved
      expect(result.github).toBeDefined();
      expect(result.jira).toBeDefined();
      expect(result.ado).toBeDefined();

      // Correct child repo targets (not global umbrella targets)
      expect(result.github!.repo).toBe('vskill');
      expect(result.jira!.projectKey).toBe('SWE2E');
      expect(result.ado!.project).toBe('VSkillSync');
      expect(result.source).toBe('child-repo-name');
    });

    it('ADO organization is preserved in resolution', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.ado!.organization).toBe('EasyChamp');
    });
  });

  describe('Scenario 3: Umbrella project match — work targeting the umbrella itself', () => {
    it('project=specweave-umb routes to umbrella sync targets', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('specweave-umb', config);

      expect(result.source).toBe('child-repo-name'); // umbrella treated as named project
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave-umb' });
      expect(result.jira).toEqual({ projectKey: 'SWE2E' });
      expect(result.ado).toEqual({ organization: 'EasyChamp', project: 'SpecWeaveSync' });
    });

    it('umbrella match is case-insensitive', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('Specweave-Umb', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave-umb' });
    });
  });

  describe('Scenario 4: Fallback — unknown project falls back to global', () => {
    it('unknown project name returns global targets', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget('unknown-project', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave-umb' });
      expect(result.jira).toEqual({ projectKey: 'SWE2E' });
      expect(result.ado).toEqual({ organization: 'EasyChamp', project: 'SpecWeaveSync' });
    });

    it('undefined project name returns global targets', () => {
      const config = makeFullUmbrellaConfig();
      const result = resolveSyncTarget(undefined, config);

      expect(result.source).toBe('global');
    });

    it('umbrella.enabled=false always returns global regardless of project name', () => {
      const config = makeFullUmbrellaConfig();
      config.umbrella!.enabled = false;
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave-umb' });
      expect(result.jira).toEqual({ projectKey: 'SWE2E' });
      expect(result.ado).toEqual({ organization: 'EasyChamp', project: 'SpecWeaveSync' });
    });
  });

  describe('Scenario 5: Partial config — child repo with only some platforms', () => {
    it('child repo with only GitHub returns undefined for JIRA and ADO', () => {
      const config = makeFullUmbrellaConfig();
      // Strip JIRA and ADO from vskill
      config.umbrella!.childRepos[1].sync = {
        github: { owner: 'anton-abyzov', repo: 'vskill' },
      };

      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });

    it('caller falls back to global for missing platform', () => {
      const config = makeFullUmbrellaConfig();
      config.umbrella!.childRepos[1].sync = {
        github: { owner: 'anton-abyzov', repo: 'vskill' },
      };

      const resolved = resolveSyncTarget('vskill', config);

      // Simulate caller fallback pattern (as used in sync-progress, ExternalIssueAutoCreator)
      const effectiveGithub = resolved.github ?? { owner: config.sync!.github!.owner!, repo: config.sync!.github!.repo! };
      const effectiveJiraKey = resolved.jira?.projectKey ?? config.sync!.jira!.projectKey;
      const effectiveAdoProject = resolved.ado?.project ?? config.sync!.ado!.project;

      expect(effectiveGithub).toEqual({ owner: 'anton-abyzov', repo: 'vskill' }); // child
      expect(effectiveJiraKey).toBe('SWE2E'); // global fallback
      expect(effectiveAdoProject).toBe('SpecWeaveSync'); // global fallback
    });

    it('child repo with no sync config at all returns all undefined', () => {
      const config = makeFullUmbrellaConfig();
      delete config.umbrella!.childRepos[1].sync;

      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toBeUndefined();
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });
  });

  describe('Scenario 6: Cross-cutting increment — multiple projects in one increment', () => {
    it('different user stories resolve to different child repos', () => {
      const config = makeFullUmbrellaConfig();

      // Simulates a cross-cutting increment where:
      // US-FE-001 targets vskill-platform (frontend)
      // US-BE-001 targets vskill (backend)
      // US-INFRA-001 targets specweave-umb (umbrella)
      const frontendResult = resolveSyncTarget('vskill-platform', config);
      const backendResult = resolveSyncTarget('vskill', config);
      const infraResult = resolveSyncTarget('specweave-umb', config);

      // Each resolves to different GitHub repos
      expect(frontendResult.github!.repo).toBe('vskill-platform');
      expect(backendResult.github!.repo).toBe('vskill');
      expect(infraResult.github!.repo).toBe('specweave-umb');

      // Each resolves to different ADO projects
      expect(frontendResult.ado!.project).toBe('VSkillPlatformSync');
      expect(backendResult.ado!.project).toBe('VSkillSync');
      expect(infraResult.ado!.project).toBe('SpecWeaveSync');
    });
  });
});
