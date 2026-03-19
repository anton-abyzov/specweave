/**
 * Integration test: Phase 1 resolver activates with auto-set project (T-005)
 *
 * Validates AC-US1-05: Given project field auto-set in metadata,
 * when sync resolver runs Phase 1, it matches the child repo
 * and returns per-repo sync targets (not global fallback).
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../../src/core/config/types.js';

describe('Phase 1 resolver integration (T-005)', () => {
  const config = {
    umbrella: {
      enabled: true,
      projectName: 'specweave-umb',
      sync: {
        github: { owner: 'anton-abyzov', repo: 'specweave-umb' },
        jira: { projectKey: 'UMB' },
        ado: { organization: 'EasyChamp', project: 'Umbrella' },
      },
      childRepos: [
        {
          id: 'specweave',
          name: 'specweave',
          path: 'repositories/anton-abyzov/specweave',
          prefix: 'SPE',
          sync: {
            github: { owner: 'anton-abyzov', repo: 'specweave' },
            jira: { projectKey: 'SWE2E' },
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
            jira: { projectKey: 'VSK' },
            ado: { organization: 'EasyChamp', project: 'VSkill' },
          },
        },
      ],
    },
    sync: {
      github: { enabled: true, owner: 'anton-abyzov', repo: 'specweave-umb' },
      jira: { enabled: true, projectKey: 'SWE2E' },
      ado: { enabled: true, organization: 'EasyChamp', project: 'SpecWeaveSync' },
    },
  } as unknown as SpecWeaveConfig;

  // AC-US1-05: project = "specweave" → Phase 1 match → per-repo targets
  it('should resolve to child repo sync targets via Phase 1 name match', () => {
    const result = resolveSyncTarget('specweave', config);

    expect(result.source).toBe('child-repo-name');
    expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave' });
    expect(result.jira).toEqual({ projectKey: 'SWE2E' });
  });

  it('should resolve vskill repo via Phase 1 name match', () => {
    const result = resolveSyncTarget('vskill', config);

    expect(result.source).toBe('child-repo-name');
    expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'vskill' });
    expect(result.jira).toEqual({ projectKey: 'VSK' });
  });

  it('should resolve umbrella project to umbrella sync targets', () => {
    const result = resolveSyncTarget('specweave-umb', config);

    expect(result.source).toBe('child-repo-name');
    expect(result.github).toEqual({ owner: 'anton-abyzov', repo: 'specweave-umb' });
    expect(result.jira).toEqual({ projectKey: 'UMB' });
  });

  // No project → falls through to global
  it('should fall back to global when project is undefined', () => {
    const result = resolveSyncTarget(undefined, config);

    expect(result.source).toBe('global');
  });

  // Unknown project → global fallback (Phase 3)
  it('should fall back to global for unknown project name', () => {
    const result = resolveSyncTarget('unknown-repo', config);

    expect(result.source).toBe('global');
  });
});
