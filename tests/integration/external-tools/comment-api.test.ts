/**
 * External Tool Client Comment API Tests (T-034C)
 *
 * Tests addComment() method across GitHub, JIRA, and ADO clients
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubClientV2 } from '../../../plugins/specweave-github/lib/github-client-v2.js';
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';
import { AdoClient } from '../../../src/integrations/ado/ado-client.js';

// Mock external dependencies
vi.mock('../../../src/core/credentials-manager.js', () => ({
  credentialsManager: {
    getJiraCredentials: () => ({
      baseUrl: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token',
      projectKey: 'TEST'
    }),
    getAdoCredentials: () => ({
      organization: 'test-org',
      project: 'test-project',
      pat: 'test-pat'
    })
  }
}));

vi.mock('../../../src/utils/exec-no-throw.js', () => ({
  execFileNoThrow: vi.fn()
}));

describe('External Tool Client Comment API (T-034C)', () => {
  describe('TC-034C-01: GitHub client posts comment successfully', () => {
    it('should post comment using gh CLI', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/exec-no-throw.js');
      const mockExecFileNoThrow = vi.mocked(execFileNoThrow);

      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 0,
        stdout: 'Comment posted successfully',
        stderr: ''
      });

      const client = GitHubClientV2.fromRepo('owner', 'repo');
      await client.addComment(123, 'Test comment with **markdown**');

      expect(mockExecFileNoThrow).toHaveBeenCalledWith('gh', [
        'issue',
        'comment',
        '123',
        '--repo',
        'owner/repo',
        '--body',
        'Test comment with **markdown**'
      ]);
    });

    it('should throw error when gh CLI fails', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/exec-no-throw.js');
      const mockExecFileNoThrow = vi.mocked(execFileNoThrow);

      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'API rate limit exceeded'
      });

      const client = GitHubClientV2.fromRepo('owner', 'repo');

      await expect(
        client.addComment(123, 'Test comment')
      ).rejects.toThrow(/Failed to add comment to issue #123/);
    });
  });

  describe('TC-034C-02: JIRA client posts comment successfully', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should post comment using JIRA API with ADF format', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: '12345' })
      } as Response);

      const client = new JiraClient();
      await client.addComment('TEST-123', 'Test comment with **markdown**');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue/TEST-123/comment',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"type":"doc"')
        })
      );

      // Verify ADF structure in body
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]!.body as string);
      expect(body.body.type).toBe('doc');
      expect(body.body.content[0].type).toBe('paragraph');
      expect(body.body.content[0].content[0].text).toBe('Test comment with **markdown**');
    });

    it('should throw error when JIRA API fails', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Permission denied'
      } as Response);

      const client = new JiraClient();

      await expect(
        client.addComment('TEST-123', 'Test comment')
      ).rejects.toThrow(/Failed to add comment to JIRA issue TEST-123/);
    });
  });

  describe('TC-034C-03: ADO client posts comment successfully', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should post comment using ADO API', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, text: 'Test comment' })
      } as Response);

      const client = new AdoClient();
      await client.addComment(12345, 'Test comment with **markdown**');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.azure.com/test-org/test-project/_apis/wit/workitems/12345/comments?api-version=7.0',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      // Verify comment text in body
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]!.body as string);
      expect(body.text).toBe('Test comment with **markdown**');
    });

    it('should throw error when ADO API fails', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as Response);

      const client = new AdoClient();

      await expect(
        client.addComment(12345, 'Test comment')
      ).rejects.toThrow(/Failed to add comment to ADO work item 12345/);
    });
  });

  describe('TC-034C-04: Comment includes markdown formatting', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should preserve markdown in GitHub comment', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/exec-no-throw.js');
      const mockExecFileNoThrow = vi.mocked(execFileNoThrow);

      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      const client = GitHubClientV2.fromRepo('owner', 'repo');
      const markdownComment = `## Progress Update

- ✅ **AC-US1-01**: User can login
- ✅ **AC-US1-02**: Password validation

[View Living Docs](https://example.com/docs)`;

      await client.addComment(123, markdownComment);

      const callArgs = mockExecFileNoThrow.mock.calls[0];
      expect(callArgs[1]).toContain(markdownComment);
    });

    it('should convert markdown to ADF in JIRA comment', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: '12345' })
      } as Response);

      const client = new JiraClient();
      const markdownComment = `Progress: 8/11 tasks completed (73%)`;

      await client.addComment('TEST-123', markdownComment);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]!.body as string);

      // JIRA uses ADF (Atlassian Document Format)
      expect(body.body.type).toBe('doc');
      expect(body.body.content[0].content[0].text).toContain('8/11 tasks');
    });

    it('should support plain text markdown in ADO comment', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1 })
      } as Response);

      const client = new AdoClient();
      const markdownComment = `**Status**: Completed\n\n✅ All acceptance criteria satisfied`;

      await client.addComment(12345, markdownComment);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]!.body as string);
      expect(body.text).toContain('**Status**');
      expect(body.text).toContain('✅');
    });
  });

  describe('TC-034C-05: Handle rate limiting gracefully', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should throw descriptive error for GitHub rate limit', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/exec-no-throw.js');
      const mockExecFileNoThrow = vi.mocked(execFileNoThrow);

      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'API rate limit exceeded'
      });

      const client = GitHubClientV2.fromRepo('owner', 'repo');

      await expect(
        client.addComment(123, 'Test')
      ).rejects.toThrow(/API rate limit exceeded/);
    });

    it('should throw descriptive error for JIRA rate limit', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      } as Response);

      const client = new JiraClient();

      await expect(
        client.addComment('TEST-123', 'Test')
      ).rejects.toThrow(/Failed to add comment.*429/);
    });

    it('should throw descriptive error for ADO rate limit', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'TF400733: The request has been canceled'
      } as Response);

      const client = new AdoClient();

      await expect(
        client.addComment(12345, 'Test')
      ).rejects.toThrow(/Failed to add comment.*429/);
    });
  });
});
