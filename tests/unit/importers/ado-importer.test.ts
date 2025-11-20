/**
 * Unit tests for ADOImporter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ADOImporter } from '../../../src/importers/ado-importer.js';
import type { ImportConfig } from '../../../src/importers/external-importer.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('ADOImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variable
    process.env.ADO_PAT = 'test-pat-token';
  });

  afterEach(() => {
    delete process.env.ADO_PAT;
  });

  describe('constructor', () => {
    it('should throw error if PAT not provided', () => {
      delete process.env.ADO_PAT;

      expect(() => {
        new ADOImporter('https://dev.azure.com/org', 'project');
      }).toThrow('Azure DevOps authentication required');
    });

    it('should use provided PAT over environment variable', () => {
      const importer = new ADOImporter(
        'https://dev.azure.com/org',
        'project',
        'custom-pat'
      );

      expect(importer).toBeDefined();
      expect(importer.platform).toBe('ado');
    });

    it('should remove trailing slashes from orgUrl', () => {
      const importer = new ADOImporter('https://dev.azure.com/org///', 'project');
      expect(importer).toBeDefined();
    });
  });

  describe('TC-066: Import ADO work items with WIQL', () => {
    it('should import work items filtered by WIQL', async () => {
      // Mock WIQL query response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workItems: [
            { id: 123, url: 'https://dev.azure.com/org/project/_apis/wit/workItems/123' },
          ],
        }),
      });

      // Mock work items batch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            {
              id: 123,
              rev: 1,
              fields: {
                'System.Id': 123,
                'System.Title': 'Test User Story',
                'System.Description': 'Test description',
                'System.WorkItemType': 'User Story',
                'System.State': 'Active',
                'System.CreatedDate': '2024-01-01T00:00:00Z',
                'System.ChangedDate': '2024-01-15T00:00:00Z',
                'System.Tags': 'backend; api',
                'Microsoft.VSTS.Common.Priority': 2,
                'Microsoft.VSTS.Common.AcceptanceCriteria': 'User can login\nUser sees dashboard',
              },
              _links: {
                html: { href: 'https://dev.azure.com/org/project/_workitems/edit/123' },
              },
            },
          ],
        }),
      });

      const importer = new ADOImporter('https://dev.azure.com/org', 'project');
      const config: ImportConfig = {
        timeRangeMonths: 6,
        labels: ['backend'],
      };

      const items = await importer.import(config);

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'ADO-123',
        type: 'user-story',
        title: 'Test User Story',
        status: 'in-progress',
        priority: 'P1',
        platform: 'ado',
      });
      expect(items[0].labels).toEqual(['backend', 'api']);
      expect(items[0].acceptanceCriteria).toEqual([
        'User can login',
        'User sees dashboard',
      ]);
    });
  });

  describe('TC-067: Pagination with continuationToken', () => {
    it('should paginate through multiple pages', async () => {
      // Mock WIQL query with many work items
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workItems: Array(250).fill(null).map((_, i) => ({
            id: 100 + i,
            url: `https://dev.azure.com/org/project/_apis/wit/workItems/${100 + i}`,
          })),
        }),
      });

      // Mock first batch (200 items)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: Array(200).fill(null).map((_, i) => ({
            id: 100 + i,
            rev: 1,
            fields: {
              'System.Id': 100 + i,
              'System.Title': `Item ${i}`,
              'System.WorkItemType': 'Task',
              'System.State': 'New',
              'System.CreatedDate': '2024-01-01T00:00:00Z',
              'System.ChangedDate': '2024-01-01T00:00:00Z',
            },
            _links: {
              html: { href: `https://dev.azure.com/org/project/_workitems/edit/${100 + i}` },
            },
          })),
        }),
      });

      // Mock second batch (50 items)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: Array(50).fill(null).map((_, i) => ({
            id: 300 + i,
            rev: 1,
            fields: {
              'System.Id': 300 + i,
              'System.Title': `Item ${200 + i}`,
              'System.WorkItemType': 'Task',
              'System.State': 'New',
              'System.CreatedDate': '2024-01-01T00:00:00Z',
              'System.ChangedDate': '2024-01-01T00:00:00Z',
            },
            _links: {
              html: { href: `https://dev.azure.com/org/project/_workitems/edit/${300 + i}` },
            },
          })),
        }),
      });

      const importer = new ADOImporter('https://dev.azure.com/org', 'project');
      const items = await importer.import();

      expect(items).toHaveLength(250);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 WIQL + 2 batches
    });

    it('should respect maxItems limit', async () => {
      // Mock WIQL query
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workItems: Array(100).fill(null).map((_, i) => ({
            id: 100 + i,
            url: `https://dev.azure.com/org/project/_apis/wit/workItems/${100 + i}`,
          })),
        }),
      });

      // Mock batch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: Array(100).fill(null).map((_, i) => ({
            id: 100 + i,
            rev: 1,
            fields: {
              'System.Id': 100 + i,
              'System.Title': `Item ${i}`,
              'System.WorkItemType': 'Task',
              'System.State': 'New',
              'System.CreatedDate': '2024-01-01T00:00:00Z',
              'System.ChangedDate': '2024-01-01T00:00:00Z',
            },
            _links: {
              html: { href: `https://dev.azure.com/org/project/_workitems/edit/${100 + i}` },
            },
          })),
        }),
      });

      const importer = new ADOImporter('https://dev.azure.com/org', 'project');
      const items = await importer.import({ maxItems: 25 });

      expect(items).toHaveLength(25);
    });
  });

  describe('TC-068: Handle ADO API authentication errors', () => {
    it('should throw authentication error on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid PAT',
      });

      const importer = new ADOImporter('https://dev.azure.com/org', 'project');

      await expect(importer.import()).rejects.toThrow('Azure DevOps authentication failed');
    });

    it('should throw access error on 403', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Access denied',
      });

      const importer = new ADOImporter('https://dev.azure.com/org', 'project');

      await expect(importer.import()).rejects.toThrow('Azure DevOps access forbidden');
    });

    it('should throw generic error on other failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const importer = new ADOImporter('https://dev.azure.com/org', 'project');

      await expect(importer.import()).rejects.toThrow('ADO API error');
    });
  });

  describe('Type conversion', () => {
    it('should map ADO work item types correctly', async () => {
      const testCases = [
        { adoType: 'User Story', expectedType: 'user-story' },
        { adoType: 'Product Backlog Item', expectedType: 'user-story' },
        { adoType: 'Epic', expectedType: 'epic' },
        { adoType: 'Bug', expectedType: 'bug' },
        { adoType: 'Feature', expectedType: 'feature' },
        { adoType: 'Task', expectedType: 'task' },
      ];

      for (const testCase of testCases) {
        // Mock WIQL
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            workItems: [{ id: 123, url: 'test' }],
          }),
        });

        // Mock batch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            value: [{
              id: 123,
              rev: 1,
              fields: {
                'System.Id': 123,
                'System.Title': 'Test',
                'System.WorkItemType': testCase.adoType,
                'System.State': 'New',
                'System.CreatedDate': '2024-01-01T00:00:00Z',
                'System.ChangedDate': '2024-01-01T00:00:00Z',
              },
              _links: { html: { href: 'test' } },
            }],
          }),
        });

        const importer = new ADOImporter('https://dev.azure.com/org', 'project');
        const items = await importer.import();

        expect(items[0].type).toBe(testCase.expectedType);
      }
    });

    it('should map ADO priorities correctly', async () => {
      const testCases = [
        { adoP: 1, expectedP: 'P0' },
        { adoP: 2, expectedP: 'P1' },
        { adoP: 3, expectedP: 'P2' },
        { adoP: 4, expectedP: 'P3' },
        { adoP: 5, expectedP: 'P4' },
      ];

      for (const testCase of testCases) {
        // Mock WIQL
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            workItems: [{ id: 123, url: 'test' }],
          }),
        });

        // Mock batch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            value: [{
              id: 123,
              rev: 1,
              fields: {
                'System.Id': 123,
                'System.Title': 'Test',
                'System.WorkItemType': 'Task',
                'System.State': 'New',
                'System.CreatedDate': '2024-01-01T00:00:00Z',
                'System.ChangedDate': '2024-01-01T00:00:00Z',
                'Microsoft.VSTS.Common.Priority': testCase.adoP,
              },
              _links: { html: { href: 'test' } },
            }],
          }),
        });

        const importer = new ADOImporter('https://dev.azure.com/org', 'project');
        const items = await importer.import();

        expect(items[0].priority).toBe(testCase.expectedP);
      }
    });

    it('should map ADO states correctly', async () => {
      const testCases = [
        { state: 'New', expectedStatus: 'open' },
        { state: 'Active', expectedStatus: 'in-progress' },
        { state: 'In Progress', expectedStatus: 'in-progress' },
        { state: 'Committed', expectedStatus: 'in-progress' },
        { state: 'Done', expectedStatus: 'completed' },
        { state: 'Closed', expectedStatus: 'completed' },
        { state: 'Resolved', expectedStatus: 'completed' },
      ];

      for (const testCase of testCases) {
        // Mock WIQL
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            workItems: [{ id: 123, url: 'test' }],
          }),
        });

        // Mock batch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            value: [{
              id: 123,
              rev: 1,
              fields: {
                'System.Id': 123,
                'System.Title': 'Test',
                'System.WorkItemType': 'Task',
                'System.State': testCase.state,
                'System.CreatedDate': '2024-01-01T00:00:00Z',
                'System.ChangedDate': '2024-01-01T00:00:00Z',
              },
              _links: { html: { href: 'test' } },
            }],
          }),
        });

        const importer = new ADOImporter('https://dev.azure.com/org', 'project');
        const items = await importer.import();

        expect(items[0].status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('Tags parsing', () => {
    it('should parse semicolon-separated tags', async () => {
      // Mock WIQL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workItems: [{ id: 123, url: 'test' }],
        }),
      });

      // Mock batch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{
            id: 123,
            rev: 1,
            fields: {
              'System.Id': 123,
              'System.Title': 'Test',
              'System.WorkItemType': 'Task',
              'System.State': 'New',
              'System.CreatedDate': '2024-01-01T00:00:00Z',
              'System.ChangedDate': '2024-01-01T00:00:00Z',
              'System.Tags': 'backend; api; critical',
            },
            _links: { html: { href: 'test' } },
          }],
        }),
      });

      const importer = new ADOImporter('https://dev.azure.com/org', 'project');
      const items = await importer.import();

      expect(items[0].labels).toEqual(['backend', 'api', 'critical']);
    });
  });
});
