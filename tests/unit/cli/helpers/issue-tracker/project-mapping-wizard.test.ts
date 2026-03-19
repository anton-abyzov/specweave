/**
 * Unit tests for project-mapping-wizard (T-026, T-027, T-028)
 *
 * Tests applyMappingsToWorkspace (pure function, no prompts needed).
 * The interactive wizard itself (runProjectMappingWizard) requires TTY mocking
 * and is tested indirectly via integration tests.
 */

import { describe, it, expect } from 'vitest';
import {
  applyMappingsToWorkspace,
  type MappingWizardResult,
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
