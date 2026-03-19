/**
 * Unit tests for github-body-utils fingerprint build/extract/normalize
 *
 * Tests the shared utility functions used for GitHub progress comment
 * deduplication via HTML comment fingerprints.
 *
 * Expected module: plugins/specweave/lib/integrations/github/github-body-utils.ts
 *
 * @see T-001: RED phase — module does not exist yet, all tests fail
 * @see T-002: GREEN phase — create the module
 */

import { describe, it, expect } from 'vitest';

import {
  buildFingerprint,
  extractFingerprint,
  normalizeIssueBody,
} from '../../../plugins/specweave/lib/integrations/github/github-body-utils.js';

// ---------------------------------------------------------------------------
// buildFingerprint
// ---------------------------------------------------------------------------

describe('buildFingerprint', () => {
  it('returns an HTML comment with completed/total', () => {
    expect(buildFingerprint(3, 5)).toBe('<!-- sw-progress:3/5 -->');
  });

  it('handles zero completed', () => {
    expect(buildFingerprint(0, 4)).toBe('<!-- sw-progress:0/4 -->');
  });

  it('handles all completed', () => {
    expect(buildFingerprint(5, 5)).toBe('<!-- sw-progress:5/5 -->');
  });
});

// ---------------------------------------------------------------------------
// extractFingerprint
// ---------------------------------------------------------------------------

describe('extractFingerprint', () => {
  it('extracts fingerprint from text containing the marker', () => {
    const text = 'Some comment body\n<!-- sw-progress:3/5 -->\nMore text';
    expect(extractFingerprint(text)).toBe('3/5');
  });

  it('returns null when no fingerprint is present', () => {
    expect(extractFingerprint('no fingerprint here')).toBeNull();
  });

  it('extracts fingerprint at the end of text', () => {
    const text = 'Comment body\n<!-- sw-progress:10/12 -->';
    expect(extractFingerprint(text)).toBe('10/12');
  });

  it('extracts fingerprint at the start of text', () => {
    const text = '<!-- sw-progress:0/3 -->\nComment body';
    expect(extractFingerprint(text)).toBe('0/3');
  });

  it('returns null for empty string', () => {
    expect(extractFingerprint('')).toBeNull();
  });

  it('extracts first fingerprint when multiple exist', () => {
    const text = '<!-- sw-progress:2/5 -->\n<!-- sw-progress:4/5 -->';
    expect(extractFingerprint(text)).toBe('2/5');
  });
});

// ---------------------------------------------------------------------------
// normalizeIssueBody
// ---------------------------------------------------------------------------

describe('normalizeIssueBody', () => {
  it('strips trailing whitespace from each line', () => {
    const input = 'line one   \nline two  \nline three';
    const expected = 'line one\nline two\nline three';
    expect(normalizeIssueBody(input)).toBe(expected);
  });

  it('collapses multiple blank lines into one', () => {
    const input = 'first\n\n\n\nsecond\n\n\nthird';
    const expected = 'first\n\nsecond\n\nthird';
    expect(normalizeIssueBody(input)).toBe(expected);
  });

  it('handles both trailing whitespace and multiple blank lines', () => {
    const input = 'hello   \n\n\n\nworld  ';
    const expected = 'hello\n\nworld';
    expect(normalizeIssueBody(input)).toBe(expected);
  });

  it('trims leading and trailing whitespace from entire body', () => {
    const input = '  \n\nhello\n\n  ';
    const expected = 'hello';
    expect(normalizeIssueBody(input)).toBe(expected);
  });

  it('returns empty string for blank input', () => {
    expect(normalizeIssueBody('   \n\n   ')).toBe('');
  });
});
