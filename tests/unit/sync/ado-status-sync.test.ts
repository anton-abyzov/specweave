/**
 * Unit tests for Azure DevOps Status Sync
 *
 * Tests ADO-specific status synchronization logic.
 * Uses mocks for ADO API (axios).
 *
 * Following TDD: Tests written first, implementation follows.
 */

import { AdoStatusSync, ExternalStatus } from '../../../plugins/specweave-ado/lib/ado-status-sync';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AdoStatusSync', () => {
  let sync: AdoStatusSync;
  let mockGet: jest.Mock;
  let mockPatch: jest.Mock;
  let mockPost: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock functions
    mockGet = jest.fn();
    mockPatch = jest.fn();
    mockPost = jest.fn();

    // Mock axios.create to return a client with mocked methods
    mockedAxios.create = jest.fn().mockReturnValue({
      get: mockGet,
      patch: mockPatch,
      post: mockPost
    } as any);

    sync = new AdoStatusSync(
      'mycompany',
      'MyProject',
      'pat-token-123'
    );
  });

  describe('getStatus', () => {
    it('should get status from new work item', async () => {
      mockGet.mockResolvedValue({
        data: {
          fields: {
            'System.State': 'New'
          }
        }
      } as any);

      const status = await sync.getStatus(123);

      expect(status.state).toBe('New');
      expect(mockGet).toHaveBeenCalledWith('/wit/workitems/123?api-version=7.0');
    });

    it('should get status from active work item', async () => {
      mockGet.mockResolvedValue({
        data: {
          fields: {
            'System.State': 'Active'
          }
        }
      } as any);

      const status = await sync.getStatus(456);

      expect(status.state).toBe('Active');
    });

    it('should get status from closed work item', async () => {
      mockGet.mockResolvedValue({
        data: {
          fields: {
            'System.State': 'Closed'
          }
        }
      } as any);

      const status = await sync.getStatus(789);

      expect(status.state).toBe('Closed');
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('ADO API rate limit exceeded'));

      await expect(sync.getStatus(123)).rejects.toThrow('ADO API rate limit exceeded');
    });
  });

  describe('updateStatus', () => {
    it('should update work item to Closed', async () => {
      mockPatch.mockResolvedValue({
        data: {
          fields: {
            'System.State': 'Closed'
          }
        }
      } as any);

      await sync.updateStatus(123, { state: 'Closed' });

      expect(mockPatch).toHaveBeenCalledWith(
        '/wit/workitems/123?api-version=7.0',
        [
          {
            op: 'add',
            path: '/fields/System.State',
            value: 'Closed'
          }
        ]
      );
    });

    it('should update work item to Active', async () => {
      mockPatch.mockResolvedValue({
        data: {
          fields: {
            'System.State': 'Active'
          }
        }
      } as any);

      await sync.updateStatus(123, { state: 'Active' });

      expect(mockPatch).toHaveBeenCalledWith(
        '/wit/workitems/123?api-version=7.0',
        [
          {
            op: 'add',
            path: '/fields/System.State',
            value: 'Active'
          }
        ]
      );
    });

    it('should update work item to On Hold', async () => {
      mockPatch.mockResolvedValue({
        data: {
          fields: {
            'System.State': 'On Hold'
          }
        }
      } as any);

      await sync.updateStatus(123, { state: 'On Hold' });

      expect(mockPatch).toHaveBeenCalledWith(
        '/wit/workitems/123?api-version=7.0',
        [
          {
            op: 'add',
            path: '/fields/System.State',
            value: 'On Hold'
          }
        ]
      );
    });

    it('should update work item to Removed', async () => {
      mockPatch.mockResolvedValue({
        data: {
          fields: {
            'System.State': 'Removed'
          }
        }
      } as any);

      await sync.updateStatus(123, { state: 'Removed' });

      expect(mockPatch).toHaveBeenCalledWith(
        '/wit/workitems/123?api-version=7.0',
        [
          {
            op: 'add',
            path: '/fields/System.State',
            value: 'Removed'
          }
        ]
      );
    });

    it('should handle API errors gracefully', async () => {
      mockPatch.mockRejectedValue(new Error('Not found'));

      await expect(sync.updateStatus(123, { state: 'Closed' }))
        .rejects.toThrow('Not found');
    });
  });

  describe('postStatusComment', () => {
    it('should post comment about status change', async () => {
      mockPost.mockResolvedValue({
        data: { id: 10001 }
      } as any);

      await sync.postStatusComment(123, 'Active', 'Closed');

      expect(mockPost).toHaveBeenCalledWith(
        '/wit/workitems/123/comments?api-version=7.0-preview.3',
        {
          text: expect.stringContaining('Active')
        }
      );

      const call = mockPost.mock.calls[0][1];
      expect(call.text).toContain('Active');
      expect(call.text).toContain('Closed');
    });

    it('should include timestamp in comment', async () => {
      mockPost.mockResolvedValue({
        data: { id: 10001 }
      } as any);

      await sync.postStatusComment(456, 'New', 'Active');

      const call = mockPost.mock.calls[0][1];
      expect(call.text).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });

    it('should handle API errors gracefully', async () => {
      mockPost.mockRejectedValue(new Error('Permission denied'));

      await expect(sync.postStatusComment(123, 'Active', 'Closed'))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('constructor', () => {
    it('should create axios instance with proper auth', () => {
      const newSync = new AdoStatusSync(
        'my-company',
        'My-Project',
        'my-pat-token'
      );

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://dev.azure.com/my-company/My-Project/_apis',
        auth: {
          username: '',
          password: 'my-pat-token'
        },
        headers: {
          'Content-Type': 'application/json-patch+json',
          'Accept': 'application/json'
        }
      });
    });
  });
});
