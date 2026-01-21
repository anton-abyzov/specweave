/**
 * Unit tests for AdoClient core functionality
 *
 * Tests:
 * - Constructor and credential handling
 * - listWorkItems with filtering
 * - createWorkItem
 * - updateWorkItem
 * - getCurrentIteration
 * - getIterations
 * - getProjects
 * - getAreaPaths
 * - testConnection
 * - Error handling
 *
 * @module tests/unit/integrations/ado/ado-client.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally BEFORE importing AdoClient
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/**
 * Create a mock Response object with proper headers
 */
function mockResponse(data: any, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    headers: {
      get: (name: string) => name === 'content-type' ? 'application/json' : null
    },
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

// Mock credentials manager
const mockCredentials = {
  organization: 'test-org',
  project: 'test-project',
  pat: 'test-pat-token-123'
};

vi.mock('../../../../src/core/credentials/credentials-manager.js', () => ({
  credentialsManager: {
    getAdoCredentials: () => mockCredentials
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
const { AdoClient, setAdoClientLogger } = await import('../../../../src/integrations/ado/ado-client.js');
const { silentLogger } = await import('../../../../src/utils/logger.js');

describe('AdoClient', () => {
  let client: InstanceType<typeof AdoClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AdoClient();
    setAdoClientLogger(silentLogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with credentials from credentials manager', () => {
      expect(client).toBeDefined();
    });
  });

  describe('listWorkItems', () => {
    it('should list work items with default empty filter', async () => {
      // WIQL query response
      mockFetch.mockResolvedValueOnce(mockResponse({ workItems: [{ id: 1 }, { id: 2 }] }));
      // Get work item details
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: [
          { id: 1, fields: { 'System.Title': 'Work Item 1', 'System.WorkItemType': 'User Story', 'System.State': 'Active' } },
          { id: 2, fields: { 'System.Title': 'Work Item 2', 'System.WorkItemType': 'Task', 'System.State': 'New' } }
        ]
      }));

      const result = await client.listWorkItems();

      expect(result).toHaveLength(2);
      expect(result[0].fields['System.Title']).toBe('Work Item 1');
    });

    it('should list work items with workItemType filter', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ workItems: [{ id: 10 }] }));
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: [{ id: 10, fields: { 'System.Title': 'Epic 1', 'System.WorkItemType': 'Epic', 'System.State': 'Active' } }]
      }));

      const result = await client.listWorkItems({ workItemType: ['Epic'] });

      expect(result).toHaveLength(1);
      expect(result[0].fields['System.WorkItemType']).toBe('Epic');
    });

    it('should return empty array when no work items found', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ workItems: [] }));

      const result = await client.listWorkItems();

      expect(result).toHaveLength(0);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Unauthorized' }, { ok: false, status: 401 }));

      await expect(client.listWorkItems()).rejects.toThrow();
    });
  });

  describe('createWorkItem', () => {
    it('should create a User Story work item', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 100,
        fields: { 'System.Title': 'New User Story', 'System.WorkItemType': 'User Story', 'System.State': 'New' },
        url: 'https://dev.azure.com/test-org/_apis/wit/workItems/100'
      }));

      const result = await client.createWorkItem({
        workItemType: 'User Story',
        title: 'New User Story',
        description: 'Story description'
      });

      expect(result.id).toBe(100);
      expect(result.fields['System.Title']).toBe('New User Story');
    });

    it('should create an Epic work item', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 200,
        fields: { 'System.Title': 'New Epic', 'System.WorkItemType': 'Epic' },
        url: 'https://dev.azure.com/test-org/_apis/wit/workItems/200'
      }));

      const result = await client.createWorkItem({
        workItemType: 'Epic',
        title: 'New Epic'
      });

      expect(result.id).toBe(200);
    });

    it('should throw error on creation failure', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Title is required' }, { ok: false, status: 400 }));

      await expect(client.createWorkItem({ workItemType: 'Task', title: '' })).rejects.toThrow();
    });
  });

  describe('updateWorkItem', () => {
    it('should update work item title', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 50,
        fields: { 'System.Title': 'Updated Title', 'System.State': 'Active' }
      }));

      const result = await client.updateWorkItem({ id: 50, title: 'Updated Title' });

      expect(result.fields['System.Title']).toBe('Updated Title');
    });

    it('should update work item state', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 51,
        fields: { 'System.Title': 'Test Item', 'System.State': 'Resolved' }
      }));

      const result = await client.updateWorkItem({ id: 51, state: 'Resolved' });

      expect(result.fields['System.State']).toBe('Resolved');
    });
  });

  describe('getCurrentIteration', () => {
    it('should return current iteration', async () => {
      // API with $timeframe=current returns only current iteration(s)
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: [
          { id: '2', name: 'Sprint 2', path: 'Project\\Sprint 2', attributes: { timeFrame: 'current' } }
        ]
      }));

      const result = await client.getCurrentIteration();

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Sprint 2');
      expect(result!.attributes.timeFrame).toBe('current');
    });

    it('should return null when no current iteration', async () => {
      // API with $timeframe=current returns empty when no current iteration
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: []
      }));

      const result = await client.getCurrentIteration();

      expect(result).toBeNull();
    });
  });

  describe('getIterations', () => {
    it('should return all iterations', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: [
          { id: '1', name: 'Sprint 1', path: 'Project\\Sprint 1', attributes: { timeFrame: 'past' } },
          { id: '2', name: 'Sprint 2', path: 'Project\\Sprint 2', attributes: { timeFrame: 'current' } }
        ]
      }));

      const result = await client.getIterations();

      expect(result).toHaveLength(2);
    });
  });

  describe('getProjects', () => {
    it('should return list of projects', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: [
          { id: 'proj1', name: 'Project One' },
          { id: 'proj2', name: 'Project Two' }
        ]
      }));

      const result = await client.getProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project One');
    });
  });

  describe('getAreaPaths', () => {
    it('should return area paths for project', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: [
          { id: 1, name: 'Backend', path: '\\Project\\Backend' },
          { id: 2, name: 'Frontend', path: '\\Project\\Frontend' }
        ]
      }));

      const result = await client.getAreaPaths('test-project');

      expect(result.value).toHaveLength(2);
    });
  });

  describe('getTeams', () => {
    it('should return teams for project', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        value: [
          { id: 'team1', name: 'Team Alpha' },
          { id: 'team2', name: 'Team Beta' }
        ]
      }));

      const result = await client.getTeams('test-project');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Team Alpha');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ value: [{ name: 'test-project' }] }));

      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, { ok: false, status: 401 }));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('addComment', () => {
    it('should add comment to work item', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ id: 1, text: 'Test comment' }));

      await client.addComment(100, 'Test comment');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/wit/workitems/100/comments'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // Note: detectProcessTemplate is complex with multiple API calls
  // Full testing would require extensive mock setup

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listWorkItems()).rejects.toThrow('Network error');
    });
  });
});
