/**
 * Unit tests for repo-connect.ts validation additions
 * T-014: validateAndParseRepoInput()
 * T-015: org-only error with actionable suggestion
 * T-016: malformed URL and invalid-chars errors
 * T-017: empty/whitespace-only input
 */

import { describe, it, expect } from 'vitest';

import {
  validateAndParseRepoInput,
  formatRepoInputErrors,
  type RepoInputError,
} from '../../../../../src/cli/helpers/init/repo-connect.js';

// ============================================================================
// T-014: validateAndParseRepoInput() — basic token classification
// ============================================================================

describe('validateAndParseRepoInput', () => {
  it('parses org/repo shorthand into repos array', () => {
    const result = validateAndParseRepoInput('anton-abyzov/specweave');

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]).toMatchObject({
      org: 'anton-abyzov',
      name: 'specweave',
    });
    expect(result.errors).toHaveLength(0);
  });

  it('parses HTTPS GitHub URL', () => {
    const result = validateAndParseRepoInput('https://github.com/org/repo');

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]).toMatchObject({ org: 'org', name: 'repo' });
    expect(result.errors).toHaveLength(0);
  });

  it('parses SSH GitHub URL', () => {
    const result = validateAndParseRepoInput('git@github.com:org/repo.git');

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]).toMatchObject({ org: 'org', name: 'repo' });
    expect(result.errors).toHaveLength(0);
  });

  it('handles mixed valid and invalid tokens (AC-US4-04)', () => {
    const result = validateAndParseRepoInput('anton-abyzov/specweave badtoken');

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]).toMatchObject({
      org: 'anton-abyzov',
      name: 'specweave',
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].token).toBe('badtoken');
  });

  it('parses multiple valid repos', () => {
    const result = validateAndParseRepoInput('org1/repo1 org2/repo2');

    expect(result.repos).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('handles comma-separated input', () => {
    const result = validateAndParseRepoInput('org1/repo1, org2/repo2');

    expect(result.repos).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  // ============================================================================
  // T-015: org-only error (AC-US4-01, AC-US4-02)
  // ============================================================================

  it('detects org-only input without slash as org-only error', () => {
    const result = validateAndParseRepoInput('anton-abyzov');

    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      token: 'anton-abyzov',
      type: 'org-only',
    });
    expect(result.errors[0].suggestion).toContain('anton-abyzov/repo-name');
  });

  it('detects multiple org-only tokens', () => {
    const result = validateAndParseRepoInput('myorg anotherorg');

    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].type).toBe('org-only');
    expect(result.errors[1].type).toBe('org-only');
  });

  it('includes wildcard suggestion for org-only error', () => {
    const result = validateAndParseRepoInput('myorg');

    expect(result.errors[0].suggestion).toContain('myorg/*');
  });

  // ============================================================================
  // T-016: malformed URL and invalid-chars errors (AC-US4-03)
  // ============================================================================

  it('detects malformed URL with too many segments', () => {
    const result = validateAndParseRepoInput('not-a-valid/url/extra');

    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      token: 'not-a-valid/url/extra',
      type: 'malformed-url',
    });
  });

  it('detects token with invalid characters', () => {
    const result = validateAndParseRepoInput('bad<chars>here');

    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('invalid-chars');
  });

  it('detects broken HTTPS URL as malformed', () => {
    const result = validateAndParseRepoInput('https://github.com/org');

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('malformed-url');
  });

  // ============================================================================
  // T-017: empty/whitespace-only input
  // ============================================================================

  it('returns empty error for empty string', () => {
    const result = validateAndParseRepoInput('');

    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      token: '',
      type: 'empty',
      message: 'Input cannot be empty',
    });
  });

  it('returns empty error for whitespace-only string', () => {
    const result = validateAndParseRepoInput('   \t  \n  ');

    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('empty');
  });

  it('returns empty error for null-ish input', () => {
    const result = validateAndParseRepoInput(undefined as unknown as string);

    expect(result.repos).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('empty');
  });
});

// ============================================================================
// formatRepoInputErrors — human-readable output (T-015, T-016)
// ============================================================================

describe('formatRepoInputErrors', () => {
  it('formats org-only error with suggestion (AC-US4-02)', () => {
    const errors: RepoInputError[] = [{
      token: 'myorg',
      type: 'org-only',
      message: "'myorg' looks like an org name.",
      suggestion: "Use 'myorg/repo-name' format, or 'myorg/*' to clone all repos from this org",
    }];

    const output = formatRepoInputErrors(errors);

    expect(output).toContain("'myorg' looks like an org name");
    expect(output).toContain('myorg/repo-name');
    expect(output).toContain('myorg/*');
  });

  it('formats malformed URL error (AC-US4-03)', () => {
    const errors: RepoInputError[] = [{
      token: 'not-a-valid/url/extra',
      type: 'malformed-url',
      message: "Could not parse 'not-a-valid/url/extra' — expected formats: org/repo, https://github.com/org/repo, or git@github.com:org/repo.git",
    }];

    const output = formatRepoInputErrors(errors);

    expect(output).toContain("Could not parse 'not-a-valid/url/extra'");
    expect(output).toContain('org/repo');
  });

  it('formats multiple errors together', () => {
    const errors: RepoInputError[] = [
      {
        token: 'myorg',
        type: 'org-only',
        message: "'myorg' looks like an org name.",
        suggestion: "Use 'myorg/repo-name' format, or 'myorg/*' to clone all repos from this org",
      },
      {
        token: 'bad<>token',
        type: 'invalid-chars',
        message: "'bad<>token' contains invalid characters.",
      },
    ];

    const output = formatRepoInputErrors(errors);

    expect(output).toContain('myorg');
    expect(output).toContain('bad<>token');
  });

  it('returns empty string for no errors', () => {
    const output = formatRepoInputErrors([]);

    expect(output).toBe('');
  });
});
