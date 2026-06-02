/**
 * sync-progress workspace routing tests
 *
 * Tests that AC checkbox sync uses resolveSyncTarget for workspace routing.
 * AC: AC-US1-03
 * (0865 T-005: migrated from legacy `umbrella` config to `workspace`.)
 */

import { describe, it, expect } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

describe('sync-progress workspace routing (AC-US1-03)', () => {
  it('should resolve per-project GitHub target when workspace configured', () => {
    const config: SpecWeaveConfig = {
      version: '3.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { enabled: true, owner: 'global-org', repo: 'global-repo' },
      },
      workspace: {
        name: 'workspace',
        repos: [
          {
            id: 'vskill',
            name: 'vskill',
            path: 'repositories/anton-abyzov/vskill',
            prefix: 'VSK',
            sync: { github: { owner: 'anton-abyzov', repo: 'vskill' } },
          },
        ],
      },
    } as SpecWeaveConfig;

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

    expect(effectiveConfig.sync?.github?.owner).toBe('anton-abyzov');
    expect(effectiveConfig.sync?.github?.repo).toBe('vskill');
  });

  it('should keep global GitHub target when no workspace configured', () => {
    const config: SpecWeaveConfig = {
      version: '3.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { enabled: true, owner: 'global-org', repo: 'global-repo' },
      },
      // No workspace → single-repo mode → global target only.
    } as SpecWeaveConfig;

    const resolved = resolveSyncTarget('vskill', config);

    const effectiveConfig = { ...config };
    if (resolved.github && resolved.source !== 'global') {
      effectiveConfig.sync = {
        ...effectiveConfig.sync!,
        github: {
          ...effectiveConfig.sync!.github,
          owner: resolved.github.owner,
          repo: resolved.github.repo,
        },
      };
    }

    // Global target preserved when no workspace
    expect(effectiveConfig.sync?.github?.owner).toBe('global-org');
    expect(effectiveConfig.sync?.github?.repo).toBe('global-repo');
  });
});
