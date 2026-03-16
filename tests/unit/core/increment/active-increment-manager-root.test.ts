/**
 * Tests for ActiveIncrementManager umbrella root resolution
 *
 * Verifies that the default constructor uses resolveEffectiveRoot()
 * instead of process.cwd().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveEffectiveRoot = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  resolveEffectiveRoot: mockResolveEffectiveRoot,
}));

import { ActiveIncrementManager } from '../../../../src/core/increment/active-increment-manager.js';

describe('ActiveIncrementManager umbrella root resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC-US2-01: defaults to umbrella root when no rootDir provided', () => {
    const umbrellaRoot = '/umbrella-root';
    mockResolveEffectiveRoot.mockReturnValue(umbrellaRoot);

    const manager = new ActiveIncrementManager();
    const stateFile = manager.getStateFilePath();

    expect(stateFile).toBe(`${umbrellaRoot}/.specweave/state/active-increment.json`);
  });

  it('AC-US2-02: uses explicit rootDir when provided', () => {
    const explicitRoot = '/explicit-root';
    mockResolveEffectiveRoot.mockReturnValue('/should-not-use-this');

    const manager = new ActiveIncrementManager(explicitRoot);
    const stateFile = manager.getStateFilePath();

    expect(stateFile).toBe(`${explicitRoot}/.specweave/state/active-increment.json`);
  });

  it('AC-US2-03: uses project root in single-repo mode', () => {
    const projectRoot = '/single-repo';
    mockResolveEffectiveRoot.mockReturnValue(projectRoot);

    const manager = new ActiveIncrementManager();
    const stateFile = manager.getStateFilePath();

    expect(stateFile).toBe(`${projectRoot}/.specweave/state/active-increment.json`);
  });
});
