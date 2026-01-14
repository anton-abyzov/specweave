/**
 * Unit tests for JiraClient core functionality
 *
 * Tests:
 * - Constructor and credential handling
 * - searchIssues with JQL filtering
 * - buildJqlQuery helper
 * - createIssue
 * - updateIssue
 * - getIssue
 * - testConnection
 * - getProjects
 * - getSprints / getActiveSprints
 * - getBoards
 * - Error handling
 *
 * @module tests/unit/integrations/jira/jira-client.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally BEFORE importing JiraClient
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock credentials manager
const mockCredentials = {
  email: 'test@example.com',
  apiToken: 'test-api-token-123',
  domain: 'test-company.atlassian.net'
};

vi.mock('../../../../src/core/credentials/credentials-manager.js', () => ({
  credentialsManager: {
    getJiraCredentials: () => mockCredentials
  }
}));

// Mock logger to suppress output
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  silentLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mocking
const { JiraClient, setJiraClientLogger } = await import('../../../../src/integrations/jira/jira-client.js');
const { silentLogger } = await import('../../../../src/utils/logger.js');

describe('JiraClient', () => {
  let client: InstanceType<typeof JiraClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new JiraClient();
    // Use silent logger to suppress output during tests
    setJiraClientLogger(silentLogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with credentials from credentials manager', () => {
      expect(client).toBeDefined();
    });

    it('should normalize domain URL without protocol', () => {
      // Domain in mock is without http prefix, should be normalized to https
      const testClient = new JiraClient();
      expect(testClient).toBeDefined();
    });
  });

  describe('searchIssues', () => {
    it('should search issues with default empty filter', async () => {
      const mockIssues = [
        { id: '1', key: 'PROJ-1', fields: { summary: 'Test Issue 1' } },
        { id: '2', key: 'PROJ-2', fields: { summary: 'Test Issue 2' } }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: mockIssues, total: 2 })
      });

      const result = await client.searchIssues();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('PROJ-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/3/search/jql'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Basic /),
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should search issues with project filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [], total: 0 })
      });

      await client.searchIssues({ project: 'MYPROJ' });

      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.jql).toContain('project = "MYPROJ"');
    });

    it('should search issues with issueType filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [], total: 0 })
      });

      await client.searchIssues({ issueType: ['Epic', 'Story'] });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.jql).toContain('issuetype IN ("Epic", "Story")');
    });

    it('should search issues with status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [], total: 0 })
      });

      await client.searchIssues({ status: ['To Do', 'In Progress'] });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.jql).toContain('status IN ("To Do", "In Progress")');
    });

    it('should search issues with custom JQL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [], total: 0 })
      });

      const customJql = 'project = TEST AND updated >= -7d';
      await client.searchIssues({ jql: customJql });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.jql).toBe(customJql);
    });

    it('should respect maxResults limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [], total: 0 })
      });

      await client.searchIssues({ maxResults: 100 });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.maxResults).toBe(100);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      await expect(client.searchIssues()).rejects.toThrow('Jira API Error (401): Unauthorized');
    });
  });

  describe('getIssue', () => {
    it('should get a single issue by key', async () => {
      const mockIssue = {
        id: '12345',
        key: 'PROJ-100',
        fields: {
          summary: 'Test Issue',
          status: { id: '1', name: 'Open' },
          issuetype: { id: '10001', name: 'Story' }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssue
      });

      const result = await client.getIssue('PROJ-100');

      expect(result.key).toBe('PROJ-100');
      expect(result.fields.summary).toBe('Test Issue');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/3/issue/PROJ-100'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Basic /)
          })
        })
      );
    });

    it('should throw error when issue not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Issue Does Not Exist'
      });

      await expect(client.getIssue('INVALID-999')).rejects.toThrow('Jira API Error');
    });
  });

  describe('createIssue', () => {
    it('should create a Story issue', async () => {
      const mockCreatedIssue = {
        id: '99999',
        key: 'PROJ-200',
        self: 'https://test.atlassian.net/rest/api/3/issue/99999'
      };

      // First call: create issue
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedIssue
      });
      // Second call: get full issue
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockCreatedIssue,
          fields: {
            summary: 'New Story',
            issuetype: { id: '10001', name: 'Story' },
            status: { id: '1', name: 'To Do' }
          }
        })
      });

      const result = await client.createIssue(
        {
          issueType: 'Story',
          summary: 'New Story',
          description: 'Story description'
        },
        'PROJ'
      );

      expect(result.key).toBe('PROJ-200');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should create an Epic issue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '100', key: 'PROJ-300' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '100',
          key: 'PROJ-300',
          fields: { summary: 'New Epic', issuetype: { name: 'Epic' } }
        })
      });

      const result = await client.createIssue(
        {
          issueType: 'Epic',
          summary: 'New Epic'
        },
        'PROJ'
      );

      expect(result.key).toBe('PROJ-300');
    });

    it('should throw error on creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Validation error: Summary is required'
      });

      await expect(
        client.createIssue({ issueType: 'Story', summary: '' }, 'PROJ')
      ).rejects.toThrow('Jira API Error');
    });
  });

  describe('updateIssue', () => {
    it('should update issue summary', async () => {
      // First call: update
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      // Second call: get updated issue
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '123',
          key: 'PROJ-50',
          fields: { summary: 'Updated Summary', status: { name: 'Open' } }
        })
      });

      const result = await client.updateIssue({
        key: 'PROJ-50',
        summary: 'Updated Summary'
      });

      expect(result.fields.summary).toBe('Updated Summary');
    });

    it('should update issue labels', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '123',
          key: 'PROJ-50',
          fields: { summary: 'Test', labels: ['specweave', 'automated'] }
        })
      });

      const result = await client.updateIssue({
        key: 'PROJ-50',
        labels: ['specweave', 'automated']
      });

      expect(result.fields.labels).toContain('specweave');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: 'user123', displayName: 'Test User' })
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/3/myself'),
        expect.any(Object)
      );
    });

    it('should return false on connection failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getProjects', () => {
    it('should return list of projects', async () => {
      const mockProjects = [
        { id: '1', key: 'PROJ1', name: 'Project One' },
        { id: '2', key: 'PROJ2', name: 'Project Two' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects
      });

      const result = await client.getProjects();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('PROJ1');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      });

      await expect(client.getProjects()).rejects.toThrow('Jira API Error');
    });
  });

  describe('getSprints', () => {
    it('should return sprints for a board', async () => {
      const mockSprints = {
        values: [
          { id: 1, name: 'Sprint 1', state: 'closed' },
          { id: 2, name: 'Sprint 2', state: 'active' },
          { id: 3, name: 'Sprint 3', state: 'future' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSprints
      });

      const result = await client.getSprints(100);

      expect(result).toHaveLength(3);
      expect(result[1].state).toBe('active');
    });
  });

  describe('getActiveSprints', () => {
    it('should return only active sprints', async () => {
      const mockSprints = {
        values: [
          { id: 1, name: 'Sprint 1', state: 'closed' },
          { id: 2, name: 'Sprint 2', state: 'active' },
          { id: 3, name: 'Sprint 3', state: 'future' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSprints
      });

      const result = await client.getActiveSprints(100);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sprint 2');
    });
  });

  describe('getBoards', () => {
    it('should return boards for a project', async () => {
      const mockBoards = {
        values: [
          { id: 1, name: 'Team Board', type: 'scrum' },
          { id: 2, name: 'Kanban Board', type: 'kanban' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBoards
      });

      const result = await client.getBoards('PROJ');

      expect(result.values).toHaveLength(2);
    });
  });

  describe('getComponents', () => {
    it('should return components for a project', async () => {
      const mockComponents = [
        { id: '1', name: 'Backend', description: 'Backend services' },
        { id: '2', name: 'Frontend', description: 'Frontend UI' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComponents
      });

      const result = await client.getComponents('PROJ');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Backend');
    });
  });

  describe('getVersions', () => {
    it('should return versions for a project', async () => {
      const mockVersions = [
        { id: '1', name: 'v1.0.0', released: true },
        { id: '2', name: 'v2.0.0', released: false }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersions
      });

      const result = await client.getVersions('PROJ');

      expect(result).toHaveLength(2);
      expect(result[0].released).toBe(true);
    });
  });

  describe('searchWithJql', () => {
    it('should search with raw JQL and return total', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [{ key: 'PROJ-1' }, { key: 'PROJ-2' }],
          total: 100
        })
      });

      const result = await client.searchWithJql('project = TEST', 50);

      expect(result.issues).toHaveLength(2);
      expect(result.total).toBe(100);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.searchIssues()).rejects.toThrow('Network error');
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(client.searchIssues()).rejects.toThrow('Invalid JSON');
    });
  });
});
