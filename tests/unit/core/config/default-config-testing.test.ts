/**
 * Tests for DEFAULT_CONFIG.testing values (increment 0189)
 *
 * TDD RED phase: These tests assert the NEW expected defaults.
 * They should FAIL until DEFAULT_CONFIG is updated.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';

describe('DEFAULT_CONFIG.testing defaults (0189)', () => {
  it('should default to TDD test mode', () => {
    expect(DEFAULT_CONFIG.testing?.defaultTestMode).toBe('TDD');
  });

  it('should default to 90% coverage target', () => {
    expect(DEFAULT_CONFIG.testing?.defaultCoverageTarget).toBe(90);
  });

  it('should have correct coverage targets for TDD defaults', () => {
    expect(DEFAULT_CONFIG.testing?.coverageTargets).toEqual({
      unit: 95,
      integration: 90,
      e2e: 100,
    });
  });

  it('should have unit coverage at 95%', () => {
    expect(DEFAULT_CONFIG.testing?.coverageTargets.unit).toBe(95);
  });

  it('should have integration coverage at 90%', () => {
    expect(DEFAULT_CONFIG.testing?.coverageTargets.integration).toBe(90);
  });

  it('should have e2e coverage at 100%', () => {
    expect(DEFAULT_CONFIG.testing?.coverageTargets.e2e).toBe(100);
  });
});
