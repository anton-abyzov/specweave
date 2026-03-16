/**
 * Tests for activation-tracker umbrella root resolution
 *
 * Verifies that getStatePath() uses resolveEffectiveRoot()
 * instead of process.cwd() as fallback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveEffectiveRoot = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  resolveEffectiveRoot: mockResolveEffectiveRoot,
}));

// Mock fs-native to prevent actual file operations
vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  writeJsonSync: vi.fn(),
  readJsonSync: vi.fn().mockReturnValue(null),
  unlinkSync: vi.fn(),
}));

import { loadActivations } from '../../../../src/core/skills/activation-tracker.js';

describe('activation-tracker umbrella root resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC-US3-01: uses umbrella root when no projectRoot provided', () => {
    const umbrellaRoot = '/umbrella-root';
    mockResolveEffectiveRoot.mockReturnValue(umbrellaRoot);

    // loadActivations with no args should use resolveEffectiveRoot
    loadActivations();

    expect(mockResolveEffectiveRoot).toHaveBeenCalled();
  });

  it('AC-US3-02: uses explicit projectRoot when provided', () => {
    const explicitRoot = '/explicit-root';
    mockResolveEffectiveRoot.mockReturnValue('/should-not-use-this');

    loadActivations(explicitRoot);

    // Should NOT call resolveEffectiveRoot when explicit root is given
    expect(mockResolveEffectiveRoot).not.toHaveBeenCalled();
  });

  it('AC-US3-03: uses project root in single-repo mode', () => {
    const projectRoot = '/single-repo';
    mockResolveEffectiveRoot.mockReturnValue(projectRoot);

    loadActivations();

    expect(mockResolveEffectiveRoot).toHaveBeenCalled();
  });
});
