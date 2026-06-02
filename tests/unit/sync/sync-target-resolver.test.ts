/**
 * SyncTargetResolver Unit Tests
 *
 * Tests the three-phase resolution logic for workspace sync routing.
 * Routing is controlled by `config.workspace.repos[]` + the **Project** field
 * in specs. (0865 T-005: migrated from the legacy `umbrella` shape to
 * `workspace`; assertions are preserved verbatim to prove equivalence.)
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

function makeConfig(overrides: Partial<SpecWeaveConfig> = {}): SpecWeaveConfig {
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
          path: 'repositories/anton-abyzov/vskill',
          name: 'vskill',
          prefix: 'VSK',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'vskill' },
            jira: { projectKey: 'VSK' },
            ado: { project: 'VSkillProject' },
          },
        },
        {
          id: 'specweave',
          path: 'repositories/anton-abyzov/specweave',
          name: 'specweave',
          prefix: 'SW',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'specweave' },
          },
        },
        {
          id: 'no-sync-repo',
          path: 'repositories/org/no-sync',
          prefix: 'NS',
        },
      ],
    },
    ...overrides,
  } as SpecWeaveConfig;
}

describe('resolveSyncTarget', () => {
  describe('Phase 1: Name match', () => {
    it('should resolve by id when project matches workspace.repos[].id', () => {
      const config = makeConfig();
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
      expect(result.jira).toEqual({ projectKey: 'VSK' });
      expect(result.ado).toEqual({ project: 'VSkillProject' });
    });

    it('should resolve by id when project matches another workspace repo', () => {
      const config = makeConfig();
      const result = resolveSyncTarget('specweave', config);

      expect(result.source).toBe('child-repo-name');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
    });

    it('should return partial sync config when repo only has github', () => {
      const config = makeConfig();
      const result = resolveSyncTarget('specweave', config);

      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });
  });

  describe('Phase 2: Prefix fallback', () => {
    it('should resolve by prefix when story ID has matching prefix', () => {
      const config = makeConfig();
      // "US-VSK-001" prefix is "VSK" which matches vskill repo
      const result = resolveSyncTarget('US-VSK-001', config);

      expect(result.source).toBe('child-repo-prefix');
      expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
    });
  });

  describe('Phase 3: Global fallback', () => {
    it('should fall back to global config when no repo matches', () => {
      const config = makeConfig();
      const result = resolveSyncTarget('unknown-project', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'global-org', repo: 'global-repo' });
      expect(result.jira).toEqual({ projectKey: 'GLOB' });
      expect(result.ado).toEqual({ project: 'GlobalProject' });
    });

    it('should match by id but return undefined fields when repo has no sync config', () => {
      const config = makeConfig();
      const result = resolveSyncTarget('no-sync-repo', config);

      // Matches by id but has no sync config — should still return matched
      // with undefined fields, which callers handle via their own fallback
      expect(result.source).toBe('child-repo-name');
      expect(result.github).toBeUndefined();
    });
  });

  describe('Workspace absent (single-repo mode)', () => {
    it('should always return global config when no workspace is configured', () => {
      const config = makeConfig({ workspace: undefined });
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'global-org', repo: 'global-repo' });
    });

    it('should always return global config when workspace has no repos', () => {
      const config = makeConfig({
        workspace: { name: 'workspace', repos: [] },
      });
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'global-org', repo: 'global-repo' });
    });
  });

  describe('Edge cases', () => {
    it('should fall back to global when projectName is undefined', () => {
      const config = makeConfig();
      const result = resolveSyncTarget(undefined, config);

      expect(result.source).toBe('global');
      expect(result.github).toEqual({ owner: 'global-org', repo: 'global-repo' });
    });

    it('should fall back to global when repos is empty', () => {
      const config = makeConfig({
        workspace: { name: 'workspace', repos: [] },
      });
      const result = resolveSyncTarget('vskill', config);

      expect(result.source).toBe('global');
    });
  });
});
