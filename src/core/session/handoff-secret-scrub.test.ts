/**
 * Tests for handoff-secret-scrub (T-002)
 *
 * Verifies regex redaction over free-text + diff content for all 12 patterns,
 * the [REDACTED-<type>] marker shape, and the per-pattern counts map.
 */

import { describe, it, expect } from 'vitest';
import { scrubSecrets, SECRET_PATTERNS } from './handoff-secret-scrub.js';

describe('scrubSecrets', () => {
  it('redacts an OpenAI-style sk- key', () => {
    const { scrubbed, counts } = scrubSecrets('token: sk-abc123DEF456ghi789jkl');
    expect(scrubbed).not.toContain('sk-abc123');
    expect(scrubbed).toContain('[REDACTED-openai-key]');
    expect(counts['openai-key']).toBe(1);
  });

  it('redacts a GitHub personal access token (ghp_)', () => {
    const { scrubbed, counts } = scrubSecrets('GITHUB_TOKEN=ghp_0123456789abcdefABCDEF0123456789abcd');
    expect(scrubbed).toContain('[REDACTED-github-token]');
    expect(scrubbed).not.toContain('ghp_0123456789');
    expect(counts['github-token']).toBe(1);
  });

  it('redacts a Bearer authorization header', () => {
    const { scrubbed, counts } = scrubSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiI9.payload');
    expect(scrubbed).toContain('[REDACTED-bearer]');
    expect(scrubbed).not.toContain('eyJhbGciOiJIUzI1NiI9.payload');
    expect(counts['bearer']).toBe(1);
  });

  it('redacts password= and api_key= assignments', () => {
    const { scrubbed, counts } = scrubSecrets('password=hunter2 api_key=deadbeefcafe');
    expect(scrubbed).toContain('[REDACTED-password]');
    expect(scrubbed).toContain('[REDACTED-api-key]');
    expect(scrubbed).not.toContain('hunter2');
    expect(scrubbed).not.toContain('deadbeefcafe');
    expect(counts['password']).toBe(1);
    expect(counts['api-key']).toBe(1);
  });

  it('redacts an AWS access key id (AKIA)', () => {
    const { scrubbed, counts } = scrubSecrets('AKIAIOSFODNN7EXAMPLE is the key');
    expect(scrubbed).toContain('[REDACTED-aws-key]');
    expect(scrubbed).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(counts['aws-key']).toBe(1);
  });

  it('leaves a clean string unchanged with an empty counts map', () => {
    const input = 'This is a perfectly clean handoff with no secrets.';
    const { scrubbed, counts } = scrubSecrets(input);
    expect(scrubbed).toBe(input);
    expect(Object.keys(counts)).toHaveLength(0);
  });

  it('exercises all 12 declared patterns', () => {
    const samples = [
      'sk-abc123DEF456ghi789jkl',                          // openai-key
      'ghp_0123456789abcdefABCDEF0123456789abcd',          // github-token
      'gho_0123456789abcdefABCDEF0123456789abcd',          // github-oauth
      'ghs_0123456789abcdefABCDEF0123456789abcd',          // github-server
      'AKIAIOSFODNN7EXAMPLE',                              // aws-key
      'ASIAIOSFODNN7EXAMPLE',                              // aws-temp-key
      '-----BEGIN RSA PRIVATE KEY-----',                   // private-key
      'vsk_0123456789abcdef0123456789abcdef',              // vskill-token
      'xoxb-123456789-abcdefghij',                         // slack-token
      'Bearer eyJhbGciOiJ.payload.sig',                    // bearer
      'password=hunter2',                                  // password
      'api_key=deadbeefcafe',                              // api-key
    ];
    const { scrubbed, counts } = scrubSecrets(samples.join('\n'));
    // Every declared pattern type must have fired at least once.
    for (const p of SECRET_PATTERNS) {
      expect(counts[p.type] ?? 0).toBeGreaterThan(0);
    }
    expect(scrubbed).not.toMatch(/sk-abc123/);
    expect(scrubbed).not.toMatch(/AKIAIOSFODNN7EXAMPLE/);
    expect(scrubbed).not.toMatch(/-----BEGIN RSA PRIVATE KEY-----/);
  });

  it('counts multiple occurrences of the same pattern', () => {
    const { counts } = scrubSecrets('sk-aaaaaaaaaaaaaaaaaaaa and sk-bbbbbbbbbbbbbbbbbbbb');
    expect(counts['openai-key']).toBe(2);
  });

  it('declares exactly 12 patterns', () => {
    expect(SECRET_PATTERNS).toHaveLength(12);
  });
});
