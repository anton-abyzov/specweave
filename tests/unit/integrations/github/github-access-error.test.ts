import { describe, it, expect } from 'vitest';
import {
  isLikelyAccessError,
  explainGitHubAccessError,
  resolveGitHubAccessFacts,
  type ExecResult,
} from '../../../../plugins/specweave/lib/integrations/github/github-access-error.js';

/**
 * Regression test for increment 0866 follow-up:
 * GitHub masks "wrong-account token, no write access" as a 404 at issue/milestone
 * create. These helpers turn that confusing `gh: Not Found (HTTP 404)` into a
 * clear, actionable error naming the token's account and the target repo.
 */
describe('isLikelyAccessError', () => {
  it('matches the masked 404 from gh', () => {
    expect(isLikelyAccessError('gh: Not Found (HTTP 404)')).toBe(true);
    expect(isLikelyAccessError('HTTP 403: Resource not accessible by personal access token')).toBe(true);
    expect(isLikelyAccessError('HTTP 401 Bad credentials')).toBe(true);
  });

  it('does not match unrelated failures', () => {
    expect(isLikelyAccessError('API rate limit exceeded')).toBe(false);
    expect(isLikelyAccessError('validation failed: title is required')).toBe(false);
    expect(isLikelyAccessError('')).toBe(false);
    expect(isLikelyAccessError(undefined)).toBe(false);
  });
});

describe('explainGitHubAccessError', () => {
  const raw = 'gh: Not Found (HTTP 404)';

  it('names the token account and the repo when the account cannot push', () => {
    const msg = explainGitHubAccessError(raw, {
      login: 'antonoly',
      canPush: false,
      owner: 'anton-abyzov',
      repo: 'specweave',
    });
    expect(msg).toContain("account 'antonoly'");
    expect(msg).toContain('no write access to anton-abyzov/specweave');
    expect(msg).toContain('GITHUB_TOKEN');
    expect(msg).toContain(raw);
  });

  it('handles an unresolved (invalid) token', () => {
    const msg = explainGitHubAccessError(raw, {
      login: null,
      canPush: null,
      owner: 'anton-abyzov',
      repo: 'specweave',
    });
    expect(msg).toContain('invalid or expired');
  });

  it('returns null when the account demonstrably CAN push (real missing resource)', () => {
    const msg = explainGitHubAccessError(raw, {
      login: 'anton-abyzov',
      canPush: true,
      owner: 'anton-abyzov',
      repo: 'specweave',
    });
    expect(msg).toBeNull();
  });

  it('returns null for non-access errors so callers fall back to the raw error', () => {
    const msg = explainGitHubAccessError('API rate limit exceeded', {
      login: 'antonoly',
      canPush: false,
      owner: 'anton-abyzov',
      repo: 'specweave',
    });
    expect(msg).toBeNull();
  });
});

describe('resolveGitHubAccessFacts', () => {
  const ok = (stdout: string): ExecResult => ({ stdout, stderr: '', exitCode: 0 });
  const fail = (): ExecResult => ({ stdout: '', stderr: 'gh: Not Found (HTTP 404)', exitCode: 1 });

  it('resolves login and push=true from gh probes', async () => {
    const exec = async (_cmd: string, args: string[]) =>
      args.includes('user') ? ok('antonoly\n') : ok('true\n');
    const facts = await resolveGitHubAccessFacts(exec, {}, 'anton-abyzov', 'specweave');
    expect(facts).toEqual({ login: 'antonoly', canPush: true });
  });

  it('reports canPush=false when the repo probe 404s (no access)', async () => {
    const exec = async (_cmd: string, args: string[]) =>
      args.includes('user') ? ok('antonoly\n') : fail();
    const facts = await resolveGitHubAccessFacts(exec, {}, 'anton-abyzov', 'specweave');
    expect(facts).toEqual({ login: 'antonoly', canPush: false });
  });

  it('leaves login null when the user probe fails', async () => {
    const exec = async () => fail();
    const facts = await resolveGitHubAccessFacts(exec, {}, 'anton-abyzov', 'specweave');
    expect(facts.login).toBeNull();
  });
});
