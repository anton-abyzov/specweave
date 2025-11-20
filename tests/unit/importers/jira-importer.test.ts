/**
 * Unit tests for JiraImporter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JiraImporter } from '../../../src/importers/jira-importer.js';
import type { ExternalItem, ImportConfig } from '../../../src/importers/external-importer.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('JiraImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
  });

  describe('constructor', () => {
    it('should throw error if authentication not provided', () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;

      expect(() => {
        new JiraImporter('https://example.atlassian.net');
      }).toThrow('JIRA authentication required');
    });

    it('should use provided credentials over environment variables', () => {
      const importer = new JiraImporter(
        'https://example.atlassian.net',
        'custom@example.com',
        'custom-token'
      );

      expect(importer).toBeDefined();
      expect(importer.platform).toBe('jira');
    });

    it('should remove trailing slashes from host', () => {
      const importer = new JiraImporter('https://example.atlassian.net///');
      expect(importer).toBeDefined();
    });
  });

  describe('TC-063: Import JIRA epics with JQL filter', () => {
    it('should import epics filtered by JQL', async () => {
      const mockJiraResponse = {
        issues: [
          {
            id: '10001',
            key: 'PROJ-123',
            fields: {
              summary: 'Test Epic',
              description: 'Test description\n\nAcceptance Criteria:\n- AC1: First criteria\n- AC2: Second criteria',
              status: {
                name: 'In Progress',
                statusCategory: { key: 'indeterminate' },
              },
              priority: { name: 'High' },
              issuetype: { name: 'Epic' },
              created: '2024-01-01T00:00:00.000Z',
              updated: '2024-01-15T00:00:00.000Z',
              labels: ['backend', 'api'],
            },
          },
        ],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJiraResponse,
      });

      const importer = new JiraImporter('https://example.atlassian.net');
      const config: ImportConfig = {
        timeRangeMonths: 6,
        labels: ['backend'],
      };

      const items = await importer.import(config);

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'JIRA-PROJ-123',
        type: 'epic',
        title: 'Test Epic',
        status: 'in-progress',
        priority: 'P1',
        platform: 'jira',
      });
      // Should extract both numbered (AC1:) and bullet list formats
      expect(items[0].acceptanceCriteria).toEqual([
        'First criteria', // From AC1:
        'Second criteria', // From AC2:
        'AC1: First criteria', // From bullet list
        'AC2: Second criteria', // From bullet list
      ]);
    });
  });

  describe('TC-064: Pagination with startAt/maxResults', () => {
    it('should paginate through multiple pages', async () => {
      // Page 1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: Array(50).fill(null).map((_, i) => ({
            id: `1000${i}`,
            key: `PROJ-${i}`,
            fields: {
              summary: `Issue ${i}`,
              description: 'Test',
              status: { name: 'Open', statusCategory: { key: 'new' } },
              issuetype: { name: 'Task' },
              created: '2024-01-01T00:00:00.000Z',
              updated: '2024-01-01T00:00:00.000Z',
              labels: [],
            },
          })),
          startAt: 0,
          maxResults: 50,
          total: 75,
        }),
      });

      // Page 2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: Array(25).fill(null).map((_, i) => ({
            id: `1005${i}`,
            key: `PROJ-${50 + i}`,
            fields: {
              summary: `Issue ${50 + i}`,
              description: 'Test',
              status: { name: 'Open', statusCategory: { key: 'new' } },
              issuetype: { name: 'Task' },
              created: '2024-01-01T00:00:00.000Z',
              updated: '2024-01-01T00:00:00.000Z',
              labels: [],
            },
          })),
          startAt: 50,
          maxResults: 50,
          total: 75,
        }),
      });

      const importer = new JiraImporter('https://example.atlassian.net');
      const items = await importer.import();

      expect(items).toHaveLength(75);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect maxItems limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: Array(50).fill(null).map((_, i) => ({
            id: `1000${i}`,
            key: `PROJ-${i}`,
            fields: {
              summary: `Issue ${i}`,
              description: 'Test',
              status: { name: 'Open', statusCategory: { key: 'new' } },
              issuetype: { name: 'Task' },
              created: '2024-01-01T00:00:00.000Z',
              updated: '2024-01-01T00:00:00.000Z',
              labels: [],
            },
          })),
          startAt: 0,
          maxResults: 50,
          total: 100,
        }),
      });

      const importer = new JiraImporter('https://example.atlassian.net');
      const items = await importer.import({ maxItems: 25 });

      expect(items).toHaveLength(25);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('TC-065: Handle JIRA API errors', () => {
    it('should throw authentication error on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials',
      });

      const importer = new JiraImporter('https://example.atlassian.net');

      await expect(importer.import()).rejects.toThrow('JIRA authentication failed');
    });

    it('should throw access error on 403', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Access denied',
      });

      const importer = new JiraImporter('https://example.atlassian.net');

      await expect(importer.import()).rejects.toThrow('JIRA access forbidden');
    });

    it('should throw generic error on other failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const importer = new JiraImporter('https://example.atlassian.net');

      await expect(importer.import()).rejects.toThrow('JIRA API error');
    });
  });

  describe('Type conversion', () => {
    it('should map JIRA issue types correctly', async () => {
      const testCases = [
        { jiraType: 'Story', expectedType: 'user-story' },
        { jiraType: 'User Story', expectedType: 'user-story' },
        { jiraType: 'Epic', expectedType: 'epic' },
        { jiraType: 'Bug', expectedType: 'bug' },
        { jiraType: 'Feature', expectedType: 'feature' },
        { jiraType: 'Task', expectedType: 'task' },
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            issues: [{
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                issuetype: { name: testCase.jiraType },
                status: { name: 'Open', statusCategory: { key: 'new' } },
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z',
                labels: [],
              },
            }],
            startAt: 0,
            maxResults: 50,
            total: 1,
          }),
        });

        const importer = new JiraImporter('https://example.atlassian.net');
        const items = await importer.import();

        expect(items[0].type).toBe(testCase.expectedType);
      }
    });

    it('should map JIRA priorities correctly', async () => {
      const testCases = [
        { jiraP: 'Highest', expectedP: 'P0' },
        { jiraP: 'High', expectedP: 'P1' },
        { jiraP: 'Medium', expectedP: 'P2' },
        { jiraP: 'Low', expectedP: 'P3' },
        { jiraP: 'Lowest', expectedP: 'P4' },
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            issues: [{
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                issuetype: { name: 'Task' },
                status: { name: 'Open', statusCategory: { key: 'new' } },
                priority: { name: testCase.jiraP },
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z',
                labels: [],
              },
            }],
            startAt: 0,
            maxResults: 50,
            total: 1,
          }),
        });

        const importer = new JiraImporter('https://example.atlassian.net');
        const items = await importer.import();

        expect(items[0].priority).toBe(testCase.expectedP);
      }
    });

    it('should map JIRA status categories correctly', async () => {
      const testCases = [
        { statusCategory: 'new', expectedStatus: 'open' },
        { statusCategory: 'indeterminate', expectedStatus: 'in-progress' },
        { statusCategory: 'done', expectedStatus: 'completed' },
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            issues: [{
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                issuetype: { name: 'Task' },
                status: {
                  name: 'Status',
                  statusCategory: { key: testCase.statusCategory },
                },
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z',
                labels: [],
              },
            }],
            startAt: 0,
            maxResults: 50,
            total: 1,
          }),
        });

        const importer = new JiraImporter('https://example.atlassian.net');
        const items = await importer.import();

        expect(items[0].status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('Acceptance criteria extraction', () => {
    it('should extract AC from numbered format', async () => {
      const description = 'Description\n\nAC1: First criteria\nAC2: Second criteria\nAC3: Third criteria';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [{
            id: '10001',
            key: 'TEST-1',
            fields: {
              summary: 'Test',
              description,
              issuetype: { name: 'Task' },
              status: { name: 'Open', statusCategory: { key: 'new' } },
              created: '2024-01-01T00:00:00.000Z',
              updated: '2024-01-01T00:00:00.000Z',
              labels: [],
            },
          }],
          startAt: 0,
          maxResults: 50,
          total: 1,
        }),
      });

      const importer = new JiraImporter('https://example.atlassian.net');
      const items = await importer.import();

      expect(items[0].acceptanceCriteria).toEqual([
        'First criteria',
        'Second criteria',
        'Third criteria',
      ]);
    });

    it('should extract AC from bullet list under heading', async () => {
      const description = 'Description\n\nAcceptance Criteria:\n- User can login\n- User sees dashboard\n- User can logout';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [{
            id: '10001',
            key: 'TEST-1',
            fields: {
              summary: 'Test',
              description,
              issuetype: { name: 'Task' },
              status: { name: 'Open', statusCategory: { key: 'new' } },
              created: '2024-01-01T00:00:00.000Z',
              updated: '2024-01-01T00:00:00.000Z',
              labels: [],
            },
          }],
          startAt: 0,
          maxResults: 50,
          total: 1,
        }),
      });

      const importer = new JiraImporter('https://example.atlassian.net');
      const items = await importer.import();

      expect(items[0].acceptanceCriteria).toEqual([
        'User can login',
        'User sees dashboard',
        'User can logout',
      ]);
    });
  });
});
