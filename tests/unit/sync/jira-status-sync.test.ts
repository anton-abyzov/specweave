/**
 * Unit tests for JIRA Status Sync
 *
 * Tests JIRA-specific status synchronization logic.
 * Uses mocks for JIRA API (axios).
 *
 * Following TDD: Tests written first, implementation follows.
 */

import { JiraStatusSync, ExternalStatus } from '../../../plugins/specweave-jira/lib/jira-status-sync';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JiraStatusSync', () => {
  let sync: JiraStatusSync;
  let mockGet: jest.Mock;
  let mockPut: jest.Mock;
  let mockPost: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock functions
    mockGet = jest.fn();
    mockPut = jest.fn();
    mockPost = jest.fn();

    // Mock axios.create to return a client with mocked methods
    mockedAxios.create = jest.fn().mockReturnValue({
      get: mockGet,
      put: mockPut,
      post: mockPost
    } as any);

    sync = new JiraStatusSync(
      'company.atlassian.net',
      'user@example.com',
      'api-token-123',
      'PROJ'
    );
  });

  describe('getStatus', () => {
    it('should get status from open issue', async () => {
      mockGet.mockResolvedValue({
        data: {
          fields: {
            status: {
              name: 'To Do'
            }
          }
        }
      } as any);

      const status = await sync.getStatus('PROJ-123');

      expect(status.state).toBe('To Do');
      expect(mockGet).toHaveBeenCalledWith('/issue/PROJ-123');
    });

    it('should get status from in progress issue', async () => {
      mockGet.mockResolvedValue({
        data: {
          fields: {
            status: {
              name: 'In Progress'
            }
          }
        }
      } as any);

      const status = await sync.getStatus('PROJ-456');

      expect(status.state).toBe('In Progress');
    });

    it('should get status from completed issue', async () => {
      mockGet.mockResolvedValue({
        data: {
          fields: {
            status: {
              name: 'Done'
            }
          }
        }
      } as any);

      const status = await sync.getStatus('PROJ-789');

      expect(status.state).toBe('Done');
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('JIRA API rate limit exceeded'));

      await expect(sync.getStatus('PROJ-123')).rejects.toThrow('JIRA API rate limit exceeded');
    });
  });

  describe('updateStatus', () => {
    it('should transition issue to Done', async () => {
      // Mock getting available transitions
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '31', name: 'Done', to: { name: 'Done' } }
          ]
        }
      } as any);

      mockPost.mockResolvedValue({
        data: {}
      } as any);

      await sync.updateStatus('PROJ-123', { state: 'Done' });

      expect(mockGet).toHaveBeenCalledWith('/issue/PROJ-123/transitions');
      expect(mockPost).toHaveBeenCalledWith('/issue/PROJ-123/transitions', {
        transition: { id: '31' }
      });
    });

    it('should transition issue to In Progress', async () => {
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '21', name: 'In Progress', to: { name: 'In Progress' } }
          ]
        }
      } as any);

      mockPost.mockResolvedValue({
        data: {}
      } as any);

      await sync.updateStatus('PROJ-123', { state: 'In Progress' });

      expect(mockPost).toHaveBeenCalledWith('/issue/PROJ-123/transitions', {
        transition: { id: '21' }
      });
    });

    it('should transition issue to On Hold', async () => {
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '41', name: 'On Hold', to: { name: 'On Hold' } }
          ]
        }
      } as any);

      mockPost.mockResolvedValue({
        data: {}
      } as any);

      await sync.updateStatus('PROJ-123', { state: 'On Hold' });

      expect(mockPost).toHaveBeenCalledWith('/issue/PROJ-123/transitions', {
        transition: { id: '41' }
      });
    });

    it('should transition issue to Cancelled', async () => {
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '51', name: 'Cancelled', to: { name: 'Cancelled' } }
          ]
        }
      } as any);

      mockPost.mockResolvedValue({
        data: {}
      } as any);

      await sync.updateStatus('PROJ-123', { state: 'Cancelled' });

      expect(mockPost).toHaveBeenCalledWith('/issue/PROJ-123/transitions', {
        transition: { id: '51' }
      });
    });

    it('should throw error if transition not available', async () => {
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '21', name: 'In Progress', to: { name: 'In Progress' } }
          ]
        }
      } as any);

      await expect(sync.updateStatus('PROJ-123', { state: 'Done' }))
        .rejects.toThrow('Transition to Done not available');
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Not found'));

      await expect(sync.updateStatus('PROJ-123', { state: 'Done' }))
        .rejects.toThrow('Not found');
    });
  });

  describe('postStatusComment', () => {
    it('should post comment about status change', async () => {
      mockPost.mockResolvedValue({
        data: { id: '10001' }
      } as any);

      await sync.postStatusComment('PROJ-123', 'In Progress', 'Done');

      expect(mockPost).toHaveBeenCalledWith('/issue/PROJ-123/comment', {
        body: expect.stringContaining('In Progress')
      });

      const call = mockPost.mock.calls[0][1];
      expect(call.body).toContain('In Progress');
      expect(call.body).toContain('Done');
    });

    it('should include timestamp in comment', async () => {
      mockPost.mockResolvedValue({
        data: { id: '10001' }
      } as any);

      await sync.postStatusComment('PROJ-456', 'To Do', 'In Progress');

      const call = mockPost.mock.calls[0][1];
      expect(call.body).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });

    it('should handle API errors gracefully', async () => {
      mockPost.mockRejectedValue(new Error('Permission denied'));

      await expect(sync.postStatusComment('PROJ-123', 'In Progress', 'Done'))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('constructor', () => {
    it('should create axios instance with proper auth', () => {
      const newSync = new JiraStatusSync(
        'my-company.atlassian.net',
        'my-email@example.com',
        'my-token',
        'MY-PROJ'
      );

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://my-company.atlassian.net/rest/api/3',
        auth: {
          username: 'my-email@example.com',
          password: 'my-token'
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    });
  });
});
