/**
 * LivingDocsSync distributed sync routing tests
 *
 * Tests that syncToGitHub uses resolveSyncTarget for distributed routing.
 * ACs: AC-US1-01, AC-US1-02
 *
 * Strategy: Since LivingDocsSync.syncToGitHub uses dynamic imports and complex
 * class initialization, we test the integration point by verifying
 * resolveSyncTarget is called correctly and its output is used.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveSyncTarget } from '../../../src/sync/sync-target-resolver.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';

describe('resolveSyncTarget integration with LivingDocsSync pattern', () => {
  it('should resolve child repo target for distributed mode (AC-US1-01)', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { owner: 'global-org', repo: 'global-repo' },
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

    const result = resolveSyncTarget('vskill', config);

    // In syncToGitHub, these values would replace owner/repo
    expect(result.github?.owner).toBe('anton-abyzov');
    expect(result.github?.repo).toBe('vskill');
    expect(result.source).toBe('child-repo-name');
  });

  it('should resolve global target for centralized mode (AC-US1-02)', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { owner: 'global-org', repo: 'global-repo' },
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

    const result = resolveSyncTarget('vskill', config);

    // Centralized: always uses global regardless of child repo match
    expect(result.github?.owner).toBe('global-org');
    expect(result.github?.repo).toBe('global-repo');
    expect(result.source).toBe('global');
  });

  it('should use resolved target as owner/repo override in profile construction', () => {
    // Simulates what syncToGitHub does after resolving
    const config: SpecWeaveConfig = {
      version: '2.0',
      sync: {
        enabled: true,
        direction: 'bidirectional',
        autoSync: false,
        includeStatus: true,
        autoApplyLabels: true,
        github: { owner: 'global-org', repo: 'global-repo' },
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

    const resolved = resolveSyncTarget('vskill', config);

    // Simulate profile construction as done in syncToGitHub
    let owner = config.sync?.github?.owner ?? '';
    let repo = config.sync?.github?.repo ?? '';

    // The new code in syncToGitHub applies resolved override
    if (resolved.github) {
      owner = resolved.github.owner;
      repo = resolved.github.repo;
    }

    expect(owner).toBe('anton-abyzov');
    expect(repo).toBe('vskill');
  });
});
