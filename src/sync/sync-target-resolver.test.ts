/**
 * Tests for sync-target-resolver (workspace.repos[] routing — 0865 T-005)
 *
 * After the v2.0→v3.0 config migration, umbrella/multiProject were consolidated
 * into `config.workspace`. Routing MUST read `config.workspace.repos[]` only —
 * the legacy umbrella key is stale/undefined at runtime and reading it silently
 * collapses routing to the global fallback.
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from './sync-target-resolver.js';
import type { SpecWeaveConfig } from '../core/config/types.js';

describe('resolveSyncTarget — workspace.repos[] routing', () => {
  // TC-011: workspace config (no umbrella) resolves a named project to its repo target
  it('TC-011: routes Project=specweave to the specweave repo target (not global)', () => {
    const config = {
      version: '3.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { owner: 'global-owner', repo: 'global-repo' },
      },
      workspace: {
        name: 'specweave-umb',
        repos: [
          {
            id: 'specweave',
            prefix: 'SW',
            sync: { github: { owner: 'anton-abyzov', repo: 'specweave' } },
          },
          {
            id: 'vskill',
            prefix: 'VSK',
            sync: { github: { owner: 'anton-abyzov', repo: 'vskill' } },
          },
        ],
      },
    } as unknown as SpecWeaveConfig;

    const resolved = resolveSyncTarget('specweave', config);

    expect(resolved.source).not.toBe('global');
    expect(resolved.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
  });

  // Prefix routing still works via story-router against workspace repos
  it('routes US-VSK-001 to the vskill repo target via prefix fallback', () => {
    const config = {
      version: '3.0',
      sync: { github: { owner: 'global-owner', repo: 'global-repo' } },
      workspace: {
        name: 'specweave-umb',
        repos: [
          { id: 'specweave', prefix: 'SW', sync: { github: { owner: 'anton-abyzov', repo: 'specweave' } } },
          { id: 'vskill', prefix: 'VSK', sync: { github: { owner: 'anton-abyzov', repo: 'vskill' } } },
        ],
      },
    } as unknown as SpecWeaveConfig;

    const resolved = resolveSyncTarget('US-VSK-001', config);

    expect(resolved.source).toBe('child-repo-prefix');
    expect(resolved.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
  });

  // Root repo (workspace.name match) resolves to workspace.rootRepo sync
  it('routes the workspace name to workspace.rootRepo target', () => {
    const config = {
      version: '3.0',
      sync: { github: { owner: 'global-owner', repo: 'global-repo' } },
      workspace: {
        name: 'umbrella-root',
        rootRepo: { github: { owner: 'anton-abyzov', repo: 'specweave-umb' } },
        repos: [
          { id: 'specweave', prefix: 'SW', sync: { github: { owner: 'anton-abyzov', repo: 'specweave' } } },
        ],
      },
    } as unknown as SpecWeaveConfig;

    const resolved = resolveSyncTarget('umbrella-root', config);

    expect(resolved.source).not.toBe('global');
    expect(resolved.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave-umb' });
  });

  // Equivalence: behavior mirrors the previous umbrella-based resolution.
  // A migrated config (umbrella.childRepos → workspace.repos, umbrella.sync → rootRepo)
  // must resolve identically to how the old umbrella reads would have.
  it('equivalence: migrated workspace resolves the same targets the old umbrella did', () => {
    // Old umbrella shape (for reference) → migrated workspace shape.
    const migrated = {
      version: '3.0',
      sync: { github: { owner: 'global-owner', repo: 'global-repo' } },
      workspace: {
        name: 'EasyChamp',
        rootRepo: { jira: { projectKey: 'ROOT' } },
        repos: [
          { id: 'fe', prefix: 'FE', sync: { jira: { projectKey: 'WEBAPP' } } },
          { id: 'be', prefix: 'BE', sync: { jira: { projectKey: 'API' } } },
        ],
      },
    } as unknown as SpecWeaveConfig;

    // Name match → fe repo's jira
    expect(resolveSyncTarget('fe', migrated).jira).toEqual({ projectKey: 'WEBAPP' });
    // Prefix match → be repo's jira
    expect(resolveSyncTarget('US-BE-007', migrated).jira).toEqual({ projectKey: 'API' });
    // Workspace name → rootRepo jira
    expect(resolveSyncTarget('EasyChamp', migrated).jira).toEqual({ projectKey: 'ROOT' });
    // Unknown project, no prefix → global fallback
    expect(resolveSyncTarget('unknown-project', migrated).source).toBe('global');
  });

  // No workspace and no umbrella → global fallback (umbrella disabled equivalent)
  it('falls back to global when no workspace is configured', () => {
    const config = {
      version: '3.0',
      sync: { github: { owner: 'global-owner', repo: 'global-repo' } },
    } as unknown as SpecWeaveConfig;

    const resolved = resolveSyncTarget('specweave', config);
    expect(resolved.source).toBe('global');
    expect(resolved.github).toEqual({ owner: 'global-owner', repo: 'global-repo' });
  });

  it('returns global when projectName is undefined', () => {
    const config = {
      version: '3.0',
      sync: { github: { owner: 'global-owner', repo: 'global-repo' } },
      workspace: {
        name: 'ws',
        repos: [{ id: 'specweave', prefix: 'SW', sync: { github: { owner: 'a', repo: 'specweave' } } }],
      },
    } as unknown as SpecWeaveConfig;

    expect(resolveSyncTarget(undefined, config).source).toBe('global');
  });
});
