/**
 * Tests for detectProjectFromCwd utility (T-001 / T-002)
 *
 * Validates project auto-detection from working directory
 * using the new workspace config format.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { detectProjectFromCwd } from '../../../../src/core/increment/template-creator.js';

describe('detectProjectFromCwd (T-001 / T-002)', () => {
  const workspaceRoot = '/home/user/workspace';

  const workspaceConfig = {
    workspace: {
      name: 'my-workspace',
      repos: [
        { id: 'frontend', path: 'repositories/org/frontend' },
        { id: 'backend', path: 'repositories/org/backend' },
        { id: 'disabled-repo', path: 'repositories/org/disabled' },
      ],
    },
  };

  // AC-US1-01: cwd inside repo → returns repo id
  it('should return childRepo.id when cwd is inside a child repo', () => {
    const cwd = path.join(workspaceRoot, 'repositories/org/frontend');
    expect(detectProjectFromCwd(workspaceConfig, cwd, workspaceRoot)).toBe('frontend');
  });

  it('should return backend id when cwd is inside backend repo', () => {
    const cwd = path.join(workspaceRoot, 'repositories/org/backend');
    expect(detectProjectFromCwd(workspaceConfig, cwd, workspaceRoot)).toBe('backend');
  });

  // AC-US1-02: cwd at workspace root → returns workspace.name
  it('should return umbrella.projectName when cwd is at umbrella root', () => {
    expect(detectProjectFromCwd(workspaceConfig, workspaceRoot, workspaceRoot)).toBe('my-workspace');
  });

  // AC-US1-03: no workspace section → returns undefined
  it('should return undefined when umbrella.enabled is false', () => {
    // New: no workspace section at all → undefined
    const config = { project: { name: 'legacy' } };
    const cwd = path.join(workspaceRoot, 'repositories/org/frontend');
    expect(detectProjectFromCwd(config, cwd, workspaceRoot)).toBeUndefined();
  });

  it('should return undefined when umbrella config is undefined', () => {
    expect(detectProjectFromCwd(undefined, workspaceRoot, workspaceRoot)).toBeUndefined();
  });

  // AC-US1-04: repo still matched regardless of other flags
  it('should return childRepo.id for disabled repo (disabled only affects sync)', () => {
    const cwd = path.join(workspaceRoot, 'repositories/org/disabled');
    expect(detectProjectFromCwd(workspaceConfig, cwd, workspaceRoot)).toBe('disabled-repo');
  });

  // Edge case: deeply nested cwd
  it('should match deeply nested cwd inside child repo', () => {
    const cwd = path.join(workspaceRoot, 'repositories/org/frontend/src/components/deep');
    expect(detectProjectFromCwd(workspaceConfig, cwd, workspaceRoot)).toBe('frontend');
  });

  // Edge case: longest prefix match for overlapping paths
  it('should pick longest match for overlapping paths', () => {
    const config = {
      workspace: {
        name: 'ws',
        repos: [
          { id: 'outer', path: 'repos/org' },
          { id: 'inner', path: 'repos/org/nested' },
        ],
      },
    };
    const cwd = path.join(workspaceRoot, 'repos/org/nested/src');
    expect(detectProjectFromCwd(config, cwd, workspaceRoot)).toBe('inner');
  });

  // Edge case: empty repos
  it('should return projectName when childRepos is empty', () => {
    const config = { workspace: { name: 'ws', repos: [] } };
    expect(detectProjectFromCwd(config, workspaceRoot, workspaceRoot)).toBe('ws');
  });

  // Edge case: no workspace name configured
  it('should return undefined when at root with no projectName', () => {
    const config = { workspace: { repos: [] } };
    expect(detectProjectFromCwd(config, workspaceRoot, workspaceRoot)).toBeUndefined();
  });
});
