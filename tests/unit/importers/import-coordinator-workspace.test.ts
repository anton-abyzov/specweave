/**
 * Unit tests for import-coordinator workspace repo mapping (T-030)
 *
 * Tests the resolveProjectFromWorkspace utility that maps import source repos
 * to workspace.repos[].sync targets.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveProjectFromWorkspace,
} from '../../../src/importers/import-coordinator.js';
import type { WorkspaceConfig } from '../../../src/core/config/types.js';

describe('resolveProjectFromWorkspace (T-030)', () => {
  const workspace: WorkspaceConfig = {
    name: 'my-workspace',
    repos: [
      {
        id: 'frontend',
        path: 'repositories/acme/frontend',
        prefix: 'FE',
        sync: { github: { owner: 'acme', repo: 'fe' } },
      },
      {
        id: 'backend',
        path: 'repositories/acme/backend',
        prefix: 'BE',
        sync: { jira: { projectKey: 'BE' } },
      },
      {
        id: 'infra',
        path: 'repositories/acme/infra',
        prefix: 'INF',
        sync: { ado: { project: 'Infrastructure' } },
      },
    ],
  };

  it('should match GitHub import source to workspace repo by owner/repo', () => {
    const result = resolveProjectFromWorkspace(workspace, 'github', 'acme/fe');
    expect(result).toBe('frontend');
  });

  it('should match Jira import source to workspace repo by project key', () => {
    const result = resolveProjectFromWorkspace(workspace, 'jira', 'BE');
    expect(result).toBe('backend');
  });

  it('should match ADO import source to workspace repo by project name', () => {
    const result = resolveProjectFromWorkspace(workspace, 'ado', 'Infrastructure');
    expect(result).toBe('infra');
  });

  it('should return workspace.name when no match found', () => {
    const result = resolveProjectFromWorkspace(workspace, 'github', 'unknown/repo');
    expect(result).toBe('my-workspace');
  });

  it('should return workspace.name when workspace has no repos', () => {
    const empty: WorkspaceConfig = { name: 'empty-ws', repos: [] };
    const result = resolveProjectFromWorkspace(empty, 'github', 'acme/fe');
    expect(result).toBe('empty-ws');
  });

  it('should return workspace.name when workspace is undefined', () => {
    const result = resolveProjectFromWorkspace(undefined as any, 'github', 'acme/fe');
    expect(result).toBe('unknown');
  });
});
