/**
 * Unit Tests: ProjectCountFetcher
 *
 * Tests lightweight project count queries for JIRA and Azure DevOps
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProjectCount,
  type ProjectCountOptions,
  type ProjectCountResult
} from '../../../../src/cli/helpers/project-count-fetcher.js';
import { silentLogger } from '../../../../src/utils/logger.js';

// Mock global fetch
global.fetch = vi.fn();

describe('ProjectCountFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjectCount', () => {
    it('should get project count from JIRA Cloud', async () => {
      // Mock JIRA Cloud response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 127 }),
        headers: new Headers()
      } as Response);

      const options: ProjectCountOptions = {
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        provider: 'jira',
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(127);
      expect(result.accessible).toBe(127);
      expect(result.error).toBeUndefined();

      // Verify API call
      expect(fetch).toHaveBeenCalledWith(
        'https://example.atlassian.net/rest/api/3/project/search?maxResults=0',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json'
          })
        })
      );
    });

    it('should get project count from JIRA Server with X-Total-Count header', async () => {
      // Mock JIRA Server response
      const headers = new Headers();
      headers.set('X-Total-Count', '87');

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers
      } as Response);

      const options: ProjectCountOptions = {
        credentials: {
          domain: 'jira.company.com',
          email: 'user@company.com',
          token: 'test-token',
          instanceType: 'server'
        },
        provider: 'jira',
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(87);
      expect(result.accessible).toBe(87);
      expect(result.error).toBeUndefined();

      // Verify API call (Server uses v2 API)
      expect(fetch).toHaveBeenCalledWith(
        'https://jira.company.com/rest/api/2/project?maxResults=0',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should get project count from Azure DevOps', async () => {
      // Mock ADO response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 42 }),
        headers: new Headers()
      } as Response);

      const options: ProjectCountOptions = {
        credentials: {
          organization: 'myorg',
          pat: 'test-pat'
        },
        provider: 'ado',
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(42);
      expect(result.accessible).toBe(42);
      expect(result.error).toBeUndefined();

      // Verify API call
      expect(fetch).toHaveBeenCalledWith(
        'https://dev.azure.com/myorg/_apis/projects?$top=0&api-version=7.0',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json'
          })
        })
      );
    });

    it('should retry on timeout and succeed on second attempt', async () => {
      // First attempt: timeout error
      vi.mocked(fetch).mockRejectedValueOnce(
        Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' })
      );

      // Second attempt: success
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 100 }),
        headers: new Headers()
      } as Response);

      const options: ProjectCountOptions = {
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        provider: 'jira',
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(100);
      expect(result.accessible).toBe(100);
      expect(fetch).toHaveBeenCalledTimes(2); // 1 failure + 1 success
    });

    it('should return error on auth failure (401)', async () => {
      // Mock 401 Unauthorized response
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials',
        headers: new Headers()
      } as Response);

      const options: ProjectCountOptions = {
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'invalid-token',
          instanceType: 'cloud'
        },
        provider: 'jira',
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(0);
      expect(result.accessible).toBe(0);
      expect(result.error).toContain('401');
      expect(result.error).toContain('Unauthorized');
    });

    it('should retry on network error and eventually fail', async () => {
      // All attempts fail
      const networkError = Object.assign(new Error('Network error'), {
        code: 'ECONNREFUSED'
      });
      vi.mocked(fetch).mockRejectedValue(networkError);

      const options: ProjectCountOptions = {
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        provider: 'jira',
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(0);
      expect(result.accessible).toBe(0);
      expect(result.error).toBeDefined();
      expect(fetch).toHaveBeenCalledTimes(3); // 3 retry attempts
    });
  });

  describe('Performance', () => {
    it('should complete count check in < 1 second for successful request', async () => {
      // Mock fast response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 50 }),
        headers: new Headers()
      } as Response);

      const options: ProjectCountOptions = {
        credentials: {
          domain: 'example.atlassian.net',
          email: 'user@example.com',
          token: 'test-token',
          instanceType: 'cloud'
        },
        provider: 'jira',
        logger: silentLogger
      };

      const startTime = Date.now();
      const result = await getProjectCount(options);
      const elapsed = Date.now() - startTime;

      expect(result.total).toBe(50);
      expect(elapsed).toBeLessThan(1000); // < 1 second
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported provider gracefully', async () => {
      const options = {
        credentials: {
          domain: 'test.com',
          email: 'user@test.com',
          token: 'token',
          instanceType: 'cloud' as const
        },
        provider: 'github' as any, // Invalid provider
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(0);
      expect(result.accessible).toBe(0);
      expect(result.error).toContain('Unsupported provider');
    });

    it('should handle missing response headers gracefully', async () => {
      // Mock JIRA Server response without X-Total-Count header
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers() // No X-Total-Count header
      } as Response);

      const options: ProjectCountOptions = {
        credentials: {
          domain: 'jira.company.com',
          email: 'user@company.com',
          token: 'test-token',
          instanceType: 'server'
        },
        provider: 'jira',
        logger: silentLogger
      };

      const result = await getProjectCount(options);

      expect(result.total).toBe(0); // Default to 0 if header missing
      expect(result.accessible).toBe(0);
      expect(result.error).toBeUndefined();
    });
  });
});
