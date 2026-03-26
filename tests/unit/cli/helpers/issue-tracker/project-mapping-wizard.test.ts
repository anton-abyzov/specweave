/**
 * Unit tests for project-mapping-wizard (T-026, T-027, T-028)
 *
 * Tests applyMappingsToWorkspace (pure function, no prompts needed).
 * The interactive wizard itself (runProjectMappingWizard) requires TTY mocking
 * and is tested indirectly via integration tests.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import {
  applyMappingsToWorkspace,
  getRepoPath,
  type MappingWizardResult,
  type MappingWizardOptions,
  type RepoMapping,
} from '../../../../../src/cli/helpers/issue-tracker/project-mapping-wizard.js';
import type { WorkspaceConfig } from '../../../../../src/core/config/types.js';

describe('applyMappingsToWorkspace (T-027)', () => {
  const baseWorkspace: WorkspaceConfig = {
    name: 'my-workspace',
    repos: [
      { id: 'frontend', path: 'repositories/acme/frontend', prefix: 'FE', sync: {} },
      { id: 'backend', path: 'repositories/acme/backend', prefix: 'BE', sync: {} },
    ],
  };

  it('should write GitHub mapping to workspace.repos[].sync', () => {
    const result: MappingWizardResult = {
      mappings: [
        {
          repoId: 'frontend',
          isRoot: false,
          target: { github: { owner: 'acme', repo: 'fe' } },
        },
      ],
    };

    const updated = applyMappingsToWorkspace(baseWorkspace, result);
    const fe = updated.repos.find(r => r.id === 'frontend')!;
    expect(fe.sync).toEqual({ github: { owner: 'acme', repo: 'fe' } });
    // backend untouched
    const be = updated.repos.find(r => r.id === 'backend')!;
    expect(be.sync).toEqual({});
  });

  it('should write Jira mapping to workspace.repos[].sync', () => {
    const result: MappingWizardResult = {
      mappings: [
        {
          repoId: 'backend',
          isRoot: false,
          target: { jira: { projectKey: 'BE' } },
        },
      ],
    };

    const updated = applyMappingsToWorkspace(baseWorkspace, result);
    const be = updated.repos.find(r => r.id === 'backend')!;
    expect(be.sync).toEqual({ jira: { projectKey: 'BE' } });
  });

  it('should write ADO mapping to workspace.repos[].sync', () => {
    const result: MappingWizardResult = {
      mappings: [
        {
          repoId: 'frontend',
          isRoot: false,
          target: { ado: { project: 'Frontend Team' } },
        },
      ],
    };

    const updated = applyMappingsToWorkspace(baseWorkspace, result);
    const fe = updated.repos.find(r => r.id === 'frontend')!;
    expect(fe.sync).toEqual({ ado: { project: 'Frontend Team' } });
  });

  it('should write root repo mapping to workspace.rootRepo', () => {
    const result: MappingWizardResult = {
      mappings: [
        {
          repoId: '__root__',
          isRoot: true,
          target: { github: { owner: 'acme', repo: 'umbrella' } },
        },
      ],
      rootRepoSync: { github: { owner: 'acme', repo: 'umbrella' } },
    };

    const updated = applyMappingsToWorkspace(baseWorkspace, result);
    expect(updated.rootRepo).toEqual({ github: { owner: 'acme', repo: 'umbrella' } });
  });

  it('should handle "select all" scenario — all repos get same mapping', () => {
    const result: MappingWizardResult = {
      mappings: [
        { repoId: '__root__', isRoot: true, target: { github: { owner: 'acme', repo: 'mono' } } },
        { repoId: 'frontend', isRoot: false, target: { github: { owner: 'acme', repo: 'mono' } } },
        { repoId: 'backend', isRoot: false, target: { github: { owner: 'acme', repo: 'mono' } } },
      ],
      rootRepoSync: { github: { owner: 'acme', repo: 'mono' } },
    };

    const updated = applyMappingsToWorkspace(baseWorkspace, result);
    expect(updated.rootRepo).toEqual({ github: { owner: 'acme', repo: 'mono' } });
    expect(updated.repos[0].sync).toEqual({ github: { owner: 'acme', repo: 'mono' } });
    expect(updated.repos[1].sync).toEqual({ github: { owner: 'acme', repo: 'mono' } });
  });

  it('should not write to umbrella.childRepos (legacy path)', () => {
    const result: MappingWizardResult = {
      mappings: [
        { repoId: 'frontend', isRoot: false, target: { github: { owner: 'acme', repo: 'fe' } } },
      ],
    };

    const updated = applyMappingsToWorkspace(baseWorkspace, result);
    // workspace.repos is the only place mappings are written
    expect(updated).not.toHaveProperty('umbrella');
    expect(updated).not.toHaveProperty('childRepos');
  });

  it('should skip repos that are not in workspace.repos', () => {
    const result: MappingWizardResult = {
      mappings: [
        { repoId: 'nonexistent', isRoot: false, target: { github: { owner: 'x', repo: 'y' } } },
      ],
    };

    const updated = applyMappingsToWorkspace(baseWorkspace, result);
    // No crash, repos unchanged
    expect(updated.repos).toHaveLength(2);
    expect(updated.repos[0].sync).toEqual({});
  });
});

// ============================================================
// 0645: Auto-detect GitHub owner/repo
// ============================================================

describe('detectGitHubMapping (0645)', () => {
  // Import the pure function (no prompts)
  let detectGitHubMapping: typeof import('../../../../../src/cli/helpers/issue-tracker/project-mapping-wizard.js').detectGitHubMapping;

  beforeAll(async () => {
    const mod = await import('../../../../../src/cli/helpers/issue-tracker/project-mapping-wizard.js');
    detectGitHubMapping = mod.detectGitHubMapping;
  });

  it('should detect owner/repo from HTTPS git remote', () => {
    const result = detectGitHubMapping({
      repoName: 'my-app',
      gitRemoteUrl: 'https://github.com/anton-abyzov/my-app.git',
    });
    expect(result).toEqual({ owner: 'anton-abyzov', repo: 'my-app' });
  });

  it('should detect owner/repo from SSH git remote', () => {
    const result = detectGitHubMapping({
      repoName: 'my-app',
      gitRemoteUrl: 'git@github.com:anton-abyzov/my-app.git',
    });
    expect(result).toEqual({ owner: 'anton-abyzov', repo: 'my-app' });
  });

  it('should fall back to authenticatedOwner + repoName when no git remote', () => {
    const result = detectGitHubMapping({
      repoName: 'my-app',
      authenticatedOwner: 'anton-abyzov',
    });
    expect(result).toEqual({ owner: 'anton-abyzov', repo: 'my-app' });
  });

  it('should return null when no git remote and no authenticatedOwner', () => {
    const result = detectGitHubMapping({ repoName: 'my-app' });
    expect(result).toBeNull();
  });

  it('should return null for non-GitHub git remote', () => {
    const result = detectGitHubMapping({
      repoName: 'my-app',
      gitRemoteUrl: 'https://gitlab.com/org/my-app.git',
    });
    expect(result).toBeNull();
  });

  it('should strip .git suffix from repo name', () => {
    const result = detectGitHubMapping({
      repoName: 'my-app',
      gitRemoteUrl: 'https://github.com/org/my-app.git',
    });
    expect(result!.repo).toBe('my-app');
  });
});

describe('getRepoPath (cross-platform)', () => {
  const workspace: WorkspaceConfig = {
    name: 'ws',
    repos: [
      { id: 'fe', path: 'repositories/acme/frontend', prefix: 'FE', sync: {} },
      { id: 'no-path', prefix: 'NP', sync: {} },
    ],
  };

  const mkOpts = (projectPath?: string): MappingWizardOptions => ({
    provider: 'github',
    workspace,
    projectPath,
  });

  it('should resolve repo path relative to projectPath', () => {
    const result = getRepoPath(
      { id: 'fe', isRoot: false, name: 'frontend' },
      mkOpts('/projects/umbrella'),
    );
    expect(result).toBe(path.resolve('/projects/umbrella', 'repositories/acme/frontend'));
  });

  it('should handle forward-slash repo paths on any OS', () => {
    // Config always stores paths with forward slashes; path.resolve normalises per-OS
    const result = getRepoPath(
      { id: 'fe', isRoot: false, name: 'frontend' },
      mkOpts('/root'),
    );
    expect(result).toBe(path.resolve('/root', 'repositories/acme/frontend'));
  });

  it('should return undefined when projectPath is missing', () => {
    const result = getRepoPath(
      { id: 'fe', isRoot: false, name: 'frontend' },
      mkOpts(undefined),
    );
    expect(result).toBeUndefined();
  });

  it('should return undefined when repo has no path field', () => {
    const result = getRepoPath(
      { id: 'no-path', isRoot: false, name: 'no-path' },
      mkOpts('/projects/umbrella'),
    );
    expect(result).toBeUndefined();
  });

  it('should return undefined when repo id is not found', () => {
    const result = getRepoPath(
      { id: 'nonexistent', isRoot: false, name: 'ghost' },
      mkOpts('/projects/umbrella'),
    );
    expect(result).toBeUndefined();
  });

  it('should reject path traversal attempts that escape project root', () => {
    const traversalWorkspace: WorkspaceConfig = {
      name: 'ws',
      repos: [{ id: 'evil', path: '../../etc/passwd', prefix: 'X', sync: {} }],
    };
    const opts: MappingWizardOptions = {
      provider: 'github',
      workspace: traversalWorkspace,
      projectPath: '/projects/umbrella',
    };
    const result = getRepoPath({ id: 'evil', isRoot: false, name: 'evil' }, opts);
    expect(result).toBeUndefined();
  });

  it('should reject absolute paths that escape project root', () => {
    const absWorkspace: WorkspaceConfig = {
      name: 'ws',
      repos: [{ id: 'abs', path: '/tmp/somewhere-else', prefix: 'X', sync: {} }],
    };
    const opts: MappingWizardOptions = {
      provider: 'github',
      workspace: absWorkspace,
      projectPath: '/projects/umbrella',
    };
    const result = getRepoPath({ id: 'abs', isRoot: false, name: 'abs' }, opts);
    expect(result).toBeUndefined();
  });
});

describe('validation (T-028)', () => {
  it('applyMappingsToWorkspace does not mutate original workspace', () => {
    const original: WorkspaceConfig = {
      name: 'test',
      repos: [{ id: 'a', path: 'p', prefix: 'A', sync: {} }],
    };

    const result: MappingWizardResult = {
      mappings: [
        { repoId: 'a', isRoot: false, target: { github: { owner: 'x', repo: 'y' } } },
      ],
    };

    const updated = applyMappingsToWorkspace(original, result);
    // Original untouched
    expect(original.repos[0].sync).toEqual({});
    // Updated has the mapping
    expect(updated.repos[0].sync).toEqual({ github: { owner: 'x', repo: 'y' } });
  });
});
