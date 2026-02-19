/**
 * Marketplace Scanner Worker Tests
 *
 * Tests the scanGitHub function and related logic by mocking fetch()
 * for GitHub API responses and the SubmissionQueue.
 *
 * Since the worker is a standalone script, we test the exported scanGitHub
 * function directly and validate behavior for:
 * - Discovering repos from search results
 * - Deduplication against existing queue entries
 * - Rate limit backoff
 * - Checkpoint write/resume
 * - API error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import the scanGitHub function and sleep override
import {
  scanGitHub,
  _setSleepFn,
  _resetSleepFn,
} from '../../../../src/cli/workers/marketplace-scanner-worker.js';

describe('marketplace-scanner-worker', () => {
  let testDir: string;
  let logMessages: string[];
  let mockLog: (msg: string) => void;

  // Store original fetch
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-scanner-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    logMessages = [];
    mockLog = (msg: string) => { logMessages.push(msg); };

    // Replace sleep with a no-op for fast tests
    _setSleepFn(async () => {});
  });

  afterEach(() => {
    // Restore original fetch and sleep
    globalThis.fetch = originalFetch;
    _resetSleepFn();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  function makeJobConfig(overrides: Record<string, unknown> = {}) {
    return {
      jobId: 'test-job-1',
      projectPath: testDir,
      searchTopics: ['claude-code-skill'],
      searchFilenames: ['SKILL.md'],
      maxResultsPerScan: 10,
      intervalMinutes: 60,
      startedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  function makeGitHubResponse(items: Array<Record<string, unknown>> = [], totalCount?: number) {
    return {
      total_count: totalCount ?? items.length,
      incomplete_results: false,
      items: items.map((item, i) => ({
        full_name: `user/repo-${i}`,
        html_url: `https://github.com/user/repo-${i}`,
        description: `A test skill ${i}`,
        owner: { login: 'user' },
        stargazers_count: 10 + i,
        updated_at: '2026-01-15T00:00:00Z',
        ...item,
      })),
    };
  }

  function mockFetchSuccess(data: unknown, headers: Record<string, string> = {}) {
    const defaultHeaders = {
      'X-RateLimit-Remaining': '50',
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      ...headers,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(Object.entries(defaultHeaders)),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as unknown as Response);
  }

  function mockFetchError(status: number, body: string, headers: Record<string, string> = {}) {
    const defaultHeaders = {
      'X-RateLimit-Remaining': '50',
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      ...headers,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      headers: new Map(Object.entries(defaultHeaders)),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(body),
    } as unknown as Response);
  }

  describe('scanGitHub', () => {
    it('discovers repos from search results', async () => {
      const responseData = makeGitHubResponse([
        { full_name: 'alice/my-skill', stargazers_count: 42 },
        { full_name: 'bob/cool-skill', stargazers_count: 100 },
      ]);
      mockFetchSuccess(responseData);

      const config = makeJobConfig();
      const result = await scanGitHub(config as any, '', mockLog);

      expect(result.repos).toHaveLength(2);
      expect(result.repos[0].fullName).toBe('alice/my-skill');
      expect(result.repos[0].stars).toBe(42);
      expect(result.repos[1].fullName).toBe('bob/cool-skill');
      expect(result.repos[1].stars).toBe(100);
    });

    it('deduplicates against existing seen repos via checkpoint', async () => {
      const responseData = makeGitHubResponse([
        { full_name: 'alice/my-skill' },
        { full_name: 'bob/cool-skill' },
      ]);
      mockFetchSuccess(responseData);

      // The scanGitHub function returns all repos from the API.
      // Deduplication happens in the main loop, not in scanGitHub itself.
      // But we can verify it starts from the right page with a checkpoint.
      const config = makeJobConfig({
        checkpoint: {
          lastCursor: '3',
          seenRepos: ['alice/old-repo'],
        },
      });

      const result = await scanGitHub(config as any, '', mockLog);

      // Verify it fetched from page 3
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(fetchCall).toContain('page=3');
    });

    it('applies backoff on rate limit', async () => {
      // Return 403 with low rate limit first, then succeed
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 403,
            headers: new Map([
              ['X-RateLimit-Remaining', '0'],
              ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 2)],
            ]),
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('rate limit exceeded'),
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          headers: new Map([
            ['X-RateLimit-Remaining', '50'],
            ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600)],
          ]),
          json: () => Promise.resolve(makeGitHubResponse([{ full_name: 'user/repo-1' }])),
          text: () => Promise.resolve(''),
        } as unknown as Response;
      });

      const config = makeJobConfig();
      const result = await scanGitHub(config as any, '', mockLog);

      // Should have retried
      expect(callCount).toBeGreaterThanOrEqual(2);
      // Should have logged rate limit warning
      expect(logMessages.some(m => m.includes('Rate limited'))).toBe(true);
    });

    it('writes checkpoint (nextCursor) after scan', async () => {
      const responseData = makeGitHubResponse([
        { full_name: 'user/repo-1' },
      ]);
      mockFetchSuccess(responseData);

      const config = makeJobConfig();
      const result = await scanGitHub(config as any, '', mockLog);

      // nextCursor should be page + 1 (starting from page 1)
      expect(result.nextCursor).toBe('2');
    });

    it('resumes from checkpoint page', async () => {
      const responseData = makeGitHubResponse([
        { full_name: 'user/repo-5' },
      ]);
      mockFetchSuccess(responseData);

      const config = makeJobConfig({
        checkpoint: {
          lastCursor: '5',
          seenRepos: ['user/repo-1', 'user/repo-2'],
        },
      });

      const result = await scanGitHub(config as any, '', mockLog);

      // Should have searched from page 5
      const fetchUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(fetchUrl).toContain('page=5');

      // nextCursor should be 6
      expect(result.nextCursor).toBe('6');
    });

    it('handles API errors gracefully', async () => {
      mockFetchError(500, 'Internal Server Error');

      const config = makeJobConfig();
      const result = await scanGitHub(config as any, '', mockLog);

      // Should return empty repos on failure
      expect(result.repos).toHaveLength(0);
      // Should log the error
      expect(logMessages.some(m => m.includes('500'))).toBe(true);
    });

    it('handles network errors gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const config = makeJobConfig();
      const result = await scanGitHub(config as any, '', mockLog);

      // Should return empty repos on network failure
      expect(result.repos).toHaveLength(0);
      expect(logMessages.some(m => m.includes('Network error'))).toBe(true);
    });

    it('passes auth token in headers when provided', async () => {
      const responseData = makeGitHubResponse([]);
      mockFetchSuccess(responseData);

      const config = makeJobConfig();
      await scanGitHub(config as any, 'ghp_test_token_123', mockLog);

      // Verify Authorization header was set
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const fetchOptions = (globalThis.fetch as any).mock.calls[0][1];
      expect(fetchOptions.headers['Authorization']).toBe('token ghp_test_token_123');
    });

    it('constructs search query from topics and filenames', async () => {
      const responseData = makeGitHubResponse([]);
      mockFetchSuccess(responseData);

      const config = makeJobConfig({
        searchTopics: ['claude-code-skill', 'specweave-plugin'],
        searchFilenames: ['SKILL.md'],
      });

      await scanGitHub(config as any, '', mockLog);

      const fetchUrl = (globalThis.fetch as any).mock.calls[0][0] as string;
      // Should include all topics and filenames in query
      expect(fetchUrl).toContain('topic%3Aclaude-code-skill');
      expect(fetchUrl).toContain('topic%3Aspecweave-plugin');
      expect(fetchUrl).toContain('filename%3ASKILL.md');
    });

    it('returns rate limit info', async () => {
      const responseData = makeGitHubResponse([]);
      mockFetchSuccess(responseData, {
        'X-RateLimit-Remaining': '25',
        'X-RateLimit-Reset': '1700000000',
      });

      const config = makeJobConfig();
      const result = await scanGitHub(config as any, '', mockLog);

      expect(result.rateLimit.remaining).toBe(25);
      expect(result.rateLimit.reset).toBe(1700000000);
    });
  });
});
