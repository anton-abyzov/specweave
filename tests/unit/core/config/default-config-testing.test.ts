/**
 * DEFAULT_CONFIG.testing — 2.0 shape: { mode, commands, coverage }.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';

describe('DEFAULT_CONFIG.testing defaults (2.0)', () => {
  it('sets no test mode by default', () => {
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('mode');
  });

  it('ships an empty verification command list (verify auto-detects)', () => {
    expect(DEFAULT_CONFIG.testing?.commands).toEqual([]);
  });

  it('sets no coverage target by default', () => {
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('coverage');
  });

  it('no longer carries the 1.x key names', () => {
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('defaultTestMode');
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('defaultCoverageTarget');
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('coverageTargets');
  });
});
