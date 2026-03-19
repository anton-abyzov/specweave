/**
 * Tests for detectProjectFromCwd utility (T-001 / T-002)
 *
 * Validates project auto-detection from working directory
 * for umbrella sync routing activation.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { detectProjectFromCwd } from '../../../../src/core/increment/template-creator.js';

describe('detectProjectFromCwd (T-001 / T-002)', () => {
  const umbrellaRoot = '/home/user/workspace';

  const umbrellaConfig = {
    enabled: true,
    projectName: 'my-workspace',
    childRepos: [
      { id: 'frontend', path: 'repositories/org/frontend' },
      { id: 'backend', path: 'repositories/org/backend' },
      { id: 'disabled-repo', path: 'repositories/org/disabled', disabled: true },
    ],
  };

  // AC-US1-01: cwd inside child repo → returns childRepo.id
  it('should return childRepo.id when cwd is inside a child repo', () => {
    const cwd = path.join(umbrellaRoot, 'repositories/org/frontend');
    expect(detectProjectFromCwd(umbrellaConfig, cwd, umbrellaRoot)).toBe('frontend');
  });

  it('should return backend id when cwd is inside backend repo', () => {
    const cwd = path.join(umbrellaRoot, 'repositories/org/backend');
    expect(detectProjectFromCwd(umbrellaConfig, cwd, umbrellaRoot)).toBe('backend');
  });

  // AC-US1-02: cwd at umbrella root → returns umbrella.projectName
  it('should return umbrella.projectName when cwd is at umbrella root', () => {
    expect(detectProjectFromCwd(umbrellaConfig, umbrellaRoot, umbrellaRoot)).toBe('my-workspace');
  });

  // AC-US1-03: umbrella.enabled false/absent → returns undefined
  it('should return undefined when umbrella.enabled is false', () => {
    const config = { ...umbrellaConfig, enabled: false };
    const cwd = path.join(umbrellaRoot, 'repositories/org/frontend');
    expect(detectProjectFromCwd(config, cwd, umbrellaRoot)).toBeUndefined();
  });

  it('should return undefined when umbrella config is undefined', () => {
    expect(detectProjectFromCwd(undefined, umbrellaRoot, umbrellaRoot)).toBeUndefined();
  });

  // AC-US1-04: disabled child repo → still returns id
  it('should return childRepo.id for disabled repo (disabled only affects sync)', () => {
    const cwd = path.join(umbrellaRoot, 'repositories/org/disabled');
    expect(detectProjectFromCwd(umbrellaConfig, cwd, umbrellaRoot)).toBe('disabled-repo');
  });

  // Edge case: deeply nested cwd
  it('should match deeply nested cwd inside child repo', () => {
    const cwd = path.join(umbrellaRoot, 'repositories/org/frontend/src/components/deep');
    expect(detectProjectFromCwd(umbrellaConfig, cwd, umbrellaRoot)).toBe('frontend');
  });

  // Edge case: longest prefix match for overlapping paths
  it('should pick longest match for overlapping paths', () => {
    const config = {
      enabled: true,
      projectName: 'ws',
      childRepos: [
        { id: 'outer', path: 'repos/org' },
        { id: 'inner', path: 'repos/org/nested' },
      ],
    };
    const cwd = path.join(umbrellaRoot, 'repos/org/nested/src');
    expect(detectProjectFromCwd(config, cwd, umbrellaRoot)).toBe('inner');
  });

  // Edge case: empty childRepos
  it('should return projectName when childRepos is empty', () => {
    const config = { enabled: true, projectName: 'ws', childRepos: [] };
    expect(detectProjectFromCwd(config, umbrellaRoot, umbrellaRoot)).toBe('ws');
  });

  // Edge case: no projectName configured
  it('should return undefined when at root with no projectName', () => {
    const config = { enabled: true, childRepos: [] };
    expect(detectProjectFromCwd(config, umbrellaRoot, umbrellaRoot)).toBeUndefined();
  });
});
