/**
 * Unit tests for JiraClient comment operations
 *
 * Tests:
 * 1. getLastComment - retrieves last comment for idempotency check
 * 2. addComment - posts comment to JIRA issue
 * 3. ADF format parsing in getLastComment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally BEFORE importing JiraClient
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock credentials manager BEFORE importing JiraClient
const mockCredentials = {
  email: 'test@example.com',
  apiToken: 'test-token',
  domain: 'test.atlassian.net'
};

vi.mock('../../../src/core/credentials/credentials-manager.js', () => ({
  credentialsManager: {
    getJiraCredentials: () => mockCredentials
  }
}));

// Import after mocking
const { JiraClient } = await import('../../../src/integrations/jira/jira-client.js');

describe('JiraClient Comment Operations', () => {
  let client: InstanceType<typeof JiraClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new JiraClient();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getLastComment', () => {
    it('should return null when no comments exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [],
          total: 0
        })
      });

      const result = await client.getLastComment('PROJ-123');

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/3/issue/PROJ-123/comment'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should return last comment body in plain text from ADF format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [
            {
              body: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '✅ SpecWeave Progress Update' }
                    ]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Progress: 50%' }
                    ]
                  }
                ]
              },
              author: {
                displayName: 'Test User',
                emailAddress: 'test@example.com'
              }
            }
          ],
          total: 1
        })
      });

      const result = await client.getLastComment('PROJ-123');

      expect(result).not.toBeNull();
      expect(result?.body).toContain('✅ SpecWeave Progress Update');
      expect(result?.body).toContain('Progress: 50%');
      expect(result?.author).toBe('Test User');
    });

    it('should handle plain text comment body (legacy JIRA)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [
            {
              body: 'Plain text comment',
              author: {
                displayName: 'Legacy User'
              }
            }
          ],
          total: 1
        })
      });

      const result = await client.getLastComment('PROJ-123');

      expect(result).not.toBeNull();
      expect(result?.body).toBe('Plain text comment');
      expect(result?.author).toBe('Legacy User');
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Issue not found'
      });

      const result = await client.getLastComment('PROJ-INVALID');

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getLastComment('PROJ-123');

      expect(result).toBeNull();
    });

    it('should use orderBy=-created&maxResults=1 query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: [], total: 0 })
      });

      await client.getLastComment('PROJ-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('orderBy=-created'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('maxResults=1'),
        expect.any(Object)
      );
    });

    it('should extract author email when displayName is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [
            {
              body: { type: 'doc', version: 1, content: [] },
              author: {
                emailAddress: 'only-email@example.com'
              }
            }
          ],
          total: 1
        })
      });

      const result = await client.getLastComment('PROJ-123');

      expect(result?.author).toBe('only-email@example.com');
    });

    it('should return "unknown" author when no author info available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [
            {
              body: { type: 'doc', version: 1, content: [] },
              author: {}
            }
          ],
          total: 1
        })
      });

      const result = await client.getLastComment('PROJ-123');

      expect(result?.author).toBe('unknown');
    });
  });

  describe('addComment', () => {
    it('should post comment in ADF format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '12345' })
      });

      await client.addComment('PROJ-123', 'Test comment');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/3/issue/PROJ-123/comment'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"type":"doc"')
        })
      );
    });

    it('should wrap comment text in ADF paragraph structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '12345' })
      });

      await client.addComment('PROJ-123', 'Hello World');

      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body).toEqual({
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Hello World'
                }
              ]
            }
          ]
        }
      });
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      });

      await expect(client.addComment('PROJ-123', 'Test'))
        .rejects.toThrow('Failed to add comment to JIRA issue PROJ-123: 403');
    });

    it('should handle special characters in comment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '12345' })
      });

      const comment = '✅ Task completed\n📊 Progress: 100%\n🤖 Auto-synced';
      await client.addComment('PROJ-123', comment);

      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.body.content[0].content[0].text).toBe(comment);
    });
  });

  describe('Idempotency integration', () => {
    it('should detect duplicate comments correctly', async () => {
      const comment = '✅ SpecWeave Progress Update\n\nProgress: 50%';

      // First call: getLastComment returns the same comment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [
            {
              body: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: comment }
                    ]
                  }
                ]
              },
              author: { displayName: 'Bot' }
            }
          ],
          total: 1
        })
      });

      const lastComment = await client.getLastComment('PROJ-123');

      // The extracted body should match the original comment
      expect(lastComment?.body).toBe(comment);
    });

    it('should detect different comments correctly', async () => {
      const oldComment = 'Old progress update';
      const newComment = 'New progress update';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [
            {
              body: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: oldComment }
                    ]
                  }
                ]
              },
              author: { displayName: 'Bot' }
            }
          ],
          total: 1
        })
      });

      const lastComment = await client.getLastComment('PROJ-123');

      expect(lastComment?.body).not.toBe(newComment);
    });
  });
});
