/**
 * Tests for spec-detector umbrella root resolution
 *
 * Verifies that detectSpecsByFeatureId() uses resolveEffectiveRoot()
 * instead of process.cwd() for the specs folder path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveEffectiveRoot = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  resolveEffectiveRoot: mockResolveEffectiveRoot,
}));

// Mock fs-native to control filesystem calls
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockReaddirSync = vi.hoisted(() => vi.fn());
const mockStatSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  readFileSync: mockReadFileSync,
}));

import { detectSpecsInIncrement } from '../../../../src/core/specs/spec-detector.js';

describe('spec-detector umbrella root resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC-US1-01: uses umbrella root for specs folder when in umbrella mode', async () => {
    const umbrellaRoot = '/umbrella-root';
    mockResolveEffectiveRoot.mockReturnValue(umbrellaRoot);

    // metadata.json exists with feature_id
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('metadata.json')) return true;
      // specs folder check — should use umbrella root
      if (p === `${umbrellaRoot}/.specweave/docs/internal/specs`) return false;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: 'FS-001' }));

    await detectSpecsInIncrement('/some/increment/path');

    // resolveEffectiveRoot must have been called
    expect(mockResolveEffectiveRoot).toHaveBeenCalled();
    // specs folder check should use umbrella root, not CWD
    expect(mockExistsSync).toHaveBeenCalledWith(
      `${umbrellaRoot}/.specweave/docs/internal/specs`
    );
  });

  it('AC-US1-02: falls back to project root in single-repo mode', async () => {
    const projectRoot = '/my-project';
    mockResolveEffectiveRoot.mockReturnValue(projectRoot);

    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('metadata.json')) return true;
      if (p === `${projectRoot}/.specweave/docs/internal/specs`) return false;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: 'FS-002' }));

    await detectSpecsInIncrement('/some/increment/path');

    expect(mockExistsSync).toHaveBeenCalledWith(
      `${projectRoot}/.specweave/docs/internal/specs`
    );
  });
});
