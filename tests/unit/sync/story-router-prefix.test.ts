/**
 * Integration test: story-router prefix extraction + Phase 3 fallback (T-010)
 *
 * AC-US3-04: US-SPE-001 → matches childRepos[].prefix === "SPE"
 * AC-US3-05: US-001 (old format) → Phase 3 global fallback
 */

import { describe, it, expect } from 'vitest';
import { extractPrefix, routeByPrefix } from '../../../src/sync/story-router.js';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

describe('story-router prefix extraction (T-010)', () => {
  const childRepos = [
    { id: 'specweave', name: 'specweave', path: 'repos/specweave', prefix: 'SPE' },
    { id: 'vskill', name: 'vskill', path: 'repos/vskill', prefix: 'VSK' },
  ];

  // AC-US3-04: US-SPE-001 → prefix "SPE" → specweave repo
  it('should extract SPE prefix from US-SPE-001', () => {
    expect(extractPrefix('US-SPE-001')).toBe('SPE');
  });

  it('should route US-SPE-001 to specweave repo', () => {
    const result = routeByPrefix('US-SPE-001', childRepos as any);
    expect(result.matched).toBe(true);
    expect(result.repoId).toBe('specweave');
  });

  it('should route US-VSK-002 to vskill repo', () => {
    const result = routeByPrefix('US-VSK-002', childRepos as any);
    expect(result.matched).toBe(true);
    expect(result.repoId).toBe('vskill');
  });

  // AC-US3-05: US-001 → no prefix → fallback
  it('should return null prefix for non-prefixed US-001', () => {
    expect(extractPrefix('US-001')).toBeNull();
  });

  it('should route US-001 to fallback (first repo)', () => {
    const result = routeByPrefix('US-001', childRepos as any);
    expect(result.matched).toBe(false);
    expect(result.repoId).toBe('specweave'); // First repo as fallback
  });

  // Phase 2 resolver integration
  it('should resolve US-SPE-001 to specweave via Phase 2 prefix routing', () => {
    const config = {
      umbrella: {
        enabled: true,
        projectName: 'ws',
        childRepos: [
          {
            id: 'specweave', name: 'specweave', path: 'repos/specweave', prefix: 'SPE',
            sync: { github: { owner: 'a', repo: 'specweave' }, jira: { projectKey: 'SPE' } },
          },
          {
            id: 'vskill', name: 'vskill', path: 'repos/vskill', prefix: 'VSK',
            sync: { github: { owner: 'a', repo: 'vskill' }, jira: { projectKey: 'VSK' } },
          },
        ],
      },
      sync: {
        github: { enabled: true, owner: 'a', repo: 'ws' },
        jira: { enabled: true, projectKey: 'WS' },
      },
    } as unknown as SpecWeaveConfig;

    // US-SPE-001 is not a repo name/id, so Phase 1 won't match.
    // Phase 2 (prefix routing) should match SPE → specweave.
    const result = resolveSyncTarget('US-SPE-001', config);
    expect(result.source).toBe('child-repo-prefix');
    expect(result.github).toEqual({ owner: 'a', repo: 'specweave' });
  });

  // Phase 3 fallback for old format
  it('should fall back to global for US-001 (no prefix match)', () => {
    const config = {
      umbrella: {
        enabled: true,
        projectName: 'ws',
        childRepos: [
          {
            id: 'specweave', name: 'specweave', path: 'repos/specweave', prefix: 'SPE',
            sync: { github: { owner: 'a', repo: 'specweave' } },
          },
        ],
      },
      sync: {
        github: { enabled: true, owner: 'a', repo: 'ws' },
      },
    } as unknown as SpecWeaveConfig;

    const result = resolveSyncTarget('US-001', config);
    expect(result.source).toBe('global');
  });
});
