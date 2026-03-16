import { describe, it, expect } from 'vitest';
import { formatSuffixedId } from '../../../src/sync/types.js';

describe('formatSuffixedId', () => {
  it('appends G suffix for github', () => {
    expect(formatSuffixedId('FS-001', 'github')).toBe('FS-001G');
  });

  it('appends J suffix for jira', () => {
    expect(formatSuffixedId('FS-001', 'jira')).toBe('FS-001J');
  });

  it('appends A suffix for ado', () => {
    expect(formatSuffixedId('FS-001', 'ado')).toBe('FS-001A');
  });

  it('returns id unchanged when platform is undefined', () => {
    expect(formatSuffixedId('FS-001', undefined)).toBe('FS-001');
  });

  it('works with US and T prefixes', () => {
    expect(formatSuffixedId('US-042', 'github')).toBe('US-042G');
    expect(formatSuffixedId('T-003', 'jira')).toBe('T-003J');
  });
});
