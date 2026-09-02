/**
 * DEFAULT_CONFIG.testing — 2.0 shape: { mode, commands, coverage }.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';

describe('DEFAULT_CONFIG.testing defaults (2.0)', () => {
  it('defaults to TDD mode', () => {
    expect(DEFAULT_CONFIG.testing?.mode).toBe('TDD');
  });

  it('ships an empty verification command list (verify auto-detects)', () => {
    expect(DEFAULT_CONFIG.testing?.commands).toEqual([]);
  });

  it('keeps the coverage targets under `coverage`', () => {
    expect(DEFAULT_CONFIG.testing?.coverage).toEqual({ unit: 95, integration: 90, e2e: 100 });
  });

  it('no longer carries the 1.x key names', () => {
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('defaultTestMode');
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('defaultCoverageTarget');
    expect(DEFAULT_CONFIG.testing).not.toHaveProperty('coverageTargets');
  });
});
