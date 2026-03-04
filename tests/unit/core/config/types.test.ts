/**
 * Config Types Unit Tests
 *
 * Validates ChildRepoSyncConfig, updated ChildRepoConfig, and UmbrellaConfig types.
 * ACs: AC-US3-01, AC-US3-02
 */

import { describe, it, expect } from 'vitest';
import type {
  ChildRepoGitHubSync,
  ChildRepoJiraSync,
  ChildRepoAdoSync,
  ChildRepoSyncConfig,
  ChildRepoConfig,
  UmbrellaConfig,
} from '../../../../src/core/config/types.js';

describe('ChildRepoSyncConfig types', () => {
  it('should allow ChildRepoGitHubSync with owner and repo', () => {
    const gh: ChildRepoGitHubSync = { owner: 'myorg', repo: 'myrepo' };
    expect(gh.owner).toBe('myorg');
    expect(gh.repo).toBe('myrepo');
  });

  it('should allow ChildRepoJiraSync with projectKey', () => {
    const jira: ChildRepoJiraSync = { projectKey: 'PROJ' };
    expect(jira.projectKey).toBe('PROJ');
  });

  it('should allow ChildRepoAdoSync with project', () => {
    const ado: ChildRepoAdoSync = { project: 'MyProject' };
    expect(ado.project).toBe('MyProject');
  });

  it('should allow ChildRepoSyncConfig with all optional sub-fields', () => {
    const sync: ChildRepoSyncConfig = {
      github: { owner: 'org', repo: 'repo' },
      jira: { projectKey: 'KEY' },
      ado: { project: 'proj' },
    };
    expect(sync.github?.owner).toBe('org');
    expect(sync.jira?.projectKey).toBe('KEY');
    expect(sync.ado?.project).toBe('proj');
  });

  it('should allow ChildRepoSyncConfig with no sub-fields (all optional)', () => {
    const sync: ChildRepoSyncConfig = {};
    expect(sync.github).toBeUndefined();
    expect(sync.jira).toBeUndefined();
    expect(sync.ado).toBeUndefined();
  });
});

describe('ChildRepoConfig.sync field (AC-US3-01)', () => {
  it('should accept a sync field of type ChildRepoSyncConfig', () => {
    const childRepo: ChildRepoConfig = {
      id: 'vskill',
      path: 'repositories/anton-abyzov/vskill',
      prefix: 'VSK',
      sync: {
        github: { owner: 'anton-abyzov', repo: 'vskill' },
        jira: { projectKey: 'VSK' },
      },
    };
    expect(childRepo.sync?.github?.owner).toBe('anton-abyzov');
    expect(childRepo.sync?.jira?.projectKey).toBe('VSK');
  });

  it('should allow sync to be undefined (backward compatible)', () => {
    const childRepo: ChildRepoConfig = {
      id: 'legacy-repo',
      path: 'repositories/org/legacy',
      prefix: 'LEG',
    };
    expect(childRepo.sync).toBeUndefined();
  });
});

describe('UmbrellaConfig umbrella.enabled controls routing', () => {
  it('should accept umbrella with enabled=true and childRepos with sync', () => {
    const config: UmbrellaConfig = {
      enabled: true,
      childRepos: [
        {
          id: 'app',
          path: 'repositories/org/app',
          prefix: 'APP',
          sync: { github: { owner: 'org', repo: 'app' } },
        },
      ],
    };
    expect(config.enabled).toBe(true);
    expect(config.childRepos[0].sync?.github?.repo).toBe('app');
  });

  it('should accept umbrella with enabled=false', () => {
    const config: UmbrellaConfig = {
      enabled: false,
      childRepos: [],
    };
    expect(config.enabled).toBe(false);
  });
});
