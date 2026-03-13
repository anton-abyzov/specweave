/**
 * Unit tests for bulk-get helpers
 * Tests: parseBulkSource, getAuthToken, buildBulkRepoList
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
const mockFetchGitHubRepos = vi.hoisted(() => vi.fn());
const mockMatchByGlob = vi.hoisted(() => vi.fn());

vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

vi.mock('../../../../../src/cli/helpers/init/github-repo-cloning.js', () => ({
  fetchGitHubRepos: mockFetchGitHubRepos,
}));

vi.mock('../../../../../src/cli/helpers/selection-strategy.js', () => ({
  matchByGlob: mockMatchByGlob,
}));

import {
  parseBulkSource,
  getAuthToken,
  buildBulkRepoList,
} from '../../../../../src/cli/helpers/get/bulk-get.js';

// Minimal GitHub repo shape used in tests
const makeRepo = (name: string, opts: { archived?: boolean; fork?: boolean; owner?: string } = {}) => ({
  id: 1,
  name,
  full_name: `${opts.owner ?? 'acme'}/${name}`,
  clone_url: `https://github.com/${opts.owner ?? 'acme'}/${name}.git`,
  html_url: `https://github.com/${opts.owner ?? 'acme'}/${name}`,
  owner: { login: opts.owner ?? 'acme' },
  archived: opts.archived ?? false,
  fork: opts.fork ?? false,
  private: false,
});

// ---------------------------------------------------------------------------
// parseBulkSource
// ---------------------------------------------------------------------------
describe('parseBulkSource', () => {
  it('detects glob * in source', () => {
    const result = parseBulkSource('acme-corp/service-*', {});
    expect(result).toEqual({ org: 'acme-corp', pattern: 'service-*' });
  });

  it('detects org/* as all-repos with null pattern', () => {
    const result = parseBulkSource('acme-corp/*', {});
    expect(result).toEqual({ org: 'acme-corp', pattern: null });
  });

  it('detects ? glob character', () => {
    const result = parseBulkSource('acme/api-?', {});
    expect(result).toEqual({ org: 'acme', pattern: 'api-?' });
  });

  it('returns null for single-repo without glob', () => {
    const result = parseBulkSource('acme-corp/my-repo', {});
    expect(result).toBeNull();
  });

  it('handles --all flag with bare org name', () => {
    const result = parseBulkSource('acme-corp', { all: true });
    expect(result).toEqual({ org: 'acme-corp', pattern: null });
  });

  it('handles --all with --pattern combined', () => {
    const result = parseBulkSource('acme-corp', { all: true, pattern: 'service-*' });
    expect(result).toEqual({ org: 'acme-corp', pattern: 'service-*' });
  });

  it('returns null for bare org name without --all', () => {
    const result = parseBulkSource('acme-corp', {});
    expect(result).toBeNull();
  });

  it('returns null for local path', () => {
    expect(parseBulkSource('./my-repo', {})).toBeNull();
    expect(parseBulkSource('/abs/path', {})).toBeNull();
  });

  it('returns null for full HTTPS URL without glob', () => {
    expect(parseBulkSource('https://github.com/acme/repo', {})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getAuthToken
// ---------------------------------------------------------------------------
describe('getAuthToken', () => {
  beforeEach(() => {
    delete process.env.GH_TOKEN;
    mockExecFileNoThrow.mockReset();
  });

  it('returns GH_TOKEN env var when set', async () => {
    process.env.GH_TOKEN = 'my-env-token';
    const token = await getAuthToken();
    expect(token).toBe('my-env-token');
    expect(mockExecFileNoThrow).not.toHaveBeenCalled();
  });

  it('falls back to gh auth token CLI', async () => {
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: 'cli-token\n', stderr: '' });
    const token = await getAuthToken();
    expect(token).toBe('cli-token');
    expect(mockExecFileNoThrow).toHaveBeenCalledWith('gh', ['auth', 'token'], expect.anything());
  });

  it('throws helpful error when neither GH_TOKEN nor gh CLI available', async () => {
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'not logged in' });
    await expect(getAuthToken()).rejects.toThrow('GitHub auth required');
  });

  it('throws when gh auth token returns empty string', async () => {
    mockExecFileNoThrow.mockResolvedValue({ exitCode: 0, stdout: '   ', stderr: '' });
    await expect(getAuthToken()).rejects.toThrow('GitHub auth required');
  });
});

// ---------------------------------------------------------------------------
// buildBulkRepoList
// ---------------------------------------------------------------------------
describe('buildBulkRepoList', () => {
  const allRepos = [
    makeRepo('service-api'),
    makeRepo('service-worker'),
    makeRepo('frontend'),
    makeRepo('archived-svc', { archived: true }),
    makeRepo('forked-lib', { fork: true }),
  ];

  beforeEach(() => {
    mockFetchGitHubRepos.mockReset();
    mockMatchByGlob.mockReset();
    mockFetchGitHubRepos.mockResolvedValue({ repos: allRepos, partial: false });
  });

  it('returns all repos when pattern is null', async () => {
    const result = await buildBulkRepoList('acme', 'tok', null, {});
    expect(mockMatchByGlob).not.toHaveBeenCalled();
    expect(result).toHaveLength(allRepos.length);
  });

  it('applies glob filter when pattern provided', async () => {
    const filtered = [makeRepo('service-api'), makeRepo('service-worker')];
    mockMatchByGlob.mockReturnValue(filtered);
    const result = await buildBulkRepoList('acme', 'tok', 'service-*', {});
    expect(mockMatchByGlob).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'service-api' })]),
      'service-*',
      'name'
    );
    expect(result).toHaveLength(2);
  });

  it('filters archived repos when noArchived=true', async () => {
    const result = await buildBulkRepoList('acme', 'tok', null, { noArchived: true });
    expect(result.every(r => !r.name.includes('archived'))).toBe(true);
  });

  it('filters forks when noForks=true', async () => {
    const result = await buildBulkRepoList('acme', 'tok', null, { noForks: true });
    expect(result.every(r => !r.name.includes('forked'))).toBe(true);
  });

  it('builds correct CloneLaunchOptions.repositories shape', async () => {
    mockFetchGitHubRepos.mockResolvedValue({ repos: [makeRepo('my-svc')], partial: false });
    const result = await buildBulkRepoList('acme', 'tok', null, {});
    expect(result[0]).toEqual({
      owner: 'acme',
      name: 'my-svc',
      path: 'repositories/acme/my-svc',
      cloneUrl: 'https://github.com/acme/my-svc.git',
    });
  });

  it('passes limit to fetchGitHubRepos', async () => {
    mockFetchGitHubRepos.mockResolvedValue({ repos: [], partial: false });
    await buildBulkRepoList('acme', 'tok', null, { limit: 50 });
    expect(mockFetchGitHubRepos).toHaveBeenCalledWith('acme', 'tok', 50);
  });

  it('throws if fetchGitHubRepos returns error', async () => {
    mockFetchGitHubRepos.mockResolvedValue({ repos: [], partial: false, error: 'rate limited' });
    await expect(buildBulkRepoList('acme', 'tok', null, {})).rejects.toThrow('rate limited');
  });
});
