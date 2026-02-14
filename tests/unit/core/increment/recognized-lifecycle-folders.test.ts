/**
 * Tests for RECOGNIZED_LIFECYCLE_FOLDERS constant
 */
import { describe, it, expect } from 'vitest';
import { RECOGNIZED_LIFECYCLE_FOLDERS } from '../../../../src/core/increment/increment-utils.js';

describe('RECOGNIZED_LIFECYCLE_FOLDERS', () => {
  it('should be a readonly array', () => {
    expect(Array.isArray(RECOGNIZED_LIFECYCLE_FOLDERS)).toBe(true);
  });

  it('should contain exactly the four recognized folders', () => {
    expect(RECOGNIZED_LIFECYCLE_FOLDERS).toEqual(['_archive', '_abandoned', '_paused', '_backlog']);
  });

  it('should NOT contain _analysis', () => {
    expect(RECOGNIZED_LIFECYCLE_FOLDERS).not.toContain('_analysis');
  });

  it('should have 4 entries', () => {
    expect(RECOGNIZED_LIFECYCLE_FOLDERS).toHaveLength(4);
  });
});
