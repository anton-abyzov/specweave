/**
 * sync-progress distributed routing tests
 *
 * Tests that AC checkbox sync uses resolveSyncTarget for distributed routing.
 * ACs: AC-US1-03
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

describe('sync-progress distributed routing (AC-US1-03)', () => {
  it('should resolve per-project GitHub target for AC checkbox sync when distributed', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { enabled: true, owner: 'global-org', repo: 'global-repo' },
      },
      umbrella: {
        enabled: true,
        childRepos: [
          {
            id: 'vskill',
            name: 'vskill',
            path: 'repositories/anton-abyzov/vskill',
            prefix: 'VSK',
            sync: { github: { owner: 'anton-abyzov', repo: 'vskill' } },
          },
        ],
        syncStrategy: 'distributed',
      },
    };

    // Resolve target for the project
    const resolved = resolveSyncTarget('vskill', config);

    // Simulate what sync-progress does: override config.sync.github with resolved target
    const effectiveConfig = { ...config };
    if (resolved.github) {
      effectiveConfig.sync = {
        ...effectiveConfig.sync!,
        github: {
          ...effectiveConfig.sync!.github,
          owner: resolved.github.owner,
          repo: resolved.github.repo,
        },
      };
    }

    // The effective config should now have the child repo's GitHub target
    expect(effectiveConfig.sync?.github?.owner).toBe('anton-abyzov');
    expect(effectiveConfig.sync?.github?.repo).toBe('vskill');
  });

  it('should keep global GitHub target when centralized (AC-US1-02)', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { enabled: true, owner: 'global-org', repo: 'global-repo' },
      },
      umbrella: {
        enabled: true,
        childRepos: [
          {
            id: 'vskill',
            name: 'vskill',
            path: 'repositories/anton-abyzov/vskill',
            prefix: 'VSK',
            sync: { github: { owner: 'anton-abyzov', repo: 'vskill' } },
          },
        ],
        syncStrategy: 'centralized',
      },
    };

    const resolved = resolveSyncTarget('vskill', config);

    const effectiveConfig = { ...config };
    if (resolved.github) {
      effectiveConfig.sync = {
        ...effectiveConfig.sync!,
        github: {
          ...effectiveConfig.sync!.github,
          owner: resolved.github.owner,
          repo: resolved.github.repo,
        },
      };
    }

    // Global target should be preserved
    expect(effectiveConfig.sync?.github?.owner).toBe('global-org');
    expect(effectiveConfig.sync?.github?.repo).toBe('global-repo');
  });
});
