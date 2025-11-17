import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Workflow Detector
 *
 * Tests workflow detection from GitHub, JIRA, and Azure DevOps.
 * Uses mocks for API calls.
 *
 * Following TDD: Tests written first, implementation follows.
 */

import { WorkflowDetector, WorkflowInfo } from '../../../src/core/sync/workflow-detector.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as anyed<typeof axios>;

describe('WorkflowDetector', () => {
  let detector: WorkflowDetector;
  let mockGet: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock function
    mockGet = vi.fn();

    // Mock axios.create to return a client with mocked methods
    mockedAxios.create = vi.fn().mockReturnValue({
      get: mockGet
    } as any);

    detector = new WorkflowDetector();
  });

  describe('detectGitHubWorkflow', () => {
    it('should detect simple open/closed workflow for GitHub', async () => {
      // GitHub uses simple open/closed states
      mockGet.mockResolvedValue({
        data: [] // Labels are optional, workflow is fixed
      } as any);

      const workflow = await detector.detectGitHubWorkflow('owner', 'repo', 'token');

      expect(workflow.tool).toBe('github');
      expect(workflow.statuses).toContain('open');
      expect(workflow.statuses).toContain('closed');
      expect(workflow.statuses.length).toBe(2);
      expect(workflow.canTransitionTo).toHaveProperty('open');
      expect(workflow.canTransitionTo).toHaveProperty('closed');
    });

    it('should include custom labels as metadata', async () => {
      mockGet.mockResolvedValue({
        data: [
          { name: 'bug', color: 'd73a4a' },
          { name: 'enhancement', color: 'a2eeef' }
        ]
      } as any);

      const workflow = await detector.detectGitHubWorkflow('owner', 'repo', 'token');

      expect(workflow.metadata?.labels).toEqual(['bug', 'enhancement']);
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('GitHub API rate limit exceeded'));

      await expect(detector.detectGitHubWorkflow('owner', 'repo', 'token'))
        .rejects.toThrow('GitHub API rate limit exceeded');
    });
  });

  describe('detectJiraWorkflow', () => {
    it('should detect all available statuses from JIRA workflow', async () => {
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '11', name: 'To Do', to: { name: 'To Do' } },
            { id: '21', name: 'In Progress', to: { name: 'In Progress' } },
            { id: '31', name: 'Done', to: { name: 'Done' } }
          ]
        }
      } as any);

      const workflow = await detector.detectJiraWorkflow(
        'company.atlassian.net',
        'user@example.com',
        'api-token',
        'PROJ'
      );

      expect(workflow.tool).toBe('jira');
      expect(workflow.statuses).toContain('To Do');
      expect(workflow.statuses).toContain('In Progress');
      expect(workflow.statuses).toContain('Done');
      expect(workflow.statuses.length).toBe(3);
    });

    it('should map transitions to canTransitionTo', async () => {
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '11', name: 'To Do', to: { name: 'To Do' } },
            { id: '21', name: 'In Progress', to: { name: 'In Progress' } },
            { id: '31', name: 'Done', to: { name: 'Done' } }
          ]
        }
      } as any);

      const workflow = await detector.detectJiraWorkflow(
        'company.atlassian.net',
        'user@example.com',
        'api-token',
        'PROJ'
      );

      expect(workflow.canTransitionTo['To Do']).toEqual(['In Progress', 'Done']);
      expect(workflow.canTransitionTo['In Progress']).toEqual(['To Do', 'Done']);
      expect(workflow.canTransitionTo['Done']).toEqual(['To Do', 'In Progress']);
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('JIRA API authentication failed'));

      await expect(detector.detectJiraWorkflow(
        'company.atlassian.net',
        'user@example.com',
        'api-token',
        'PROJ'
      )).rejects.toThrow('JIRA API authentication failed');
    });
  });

  describe('detectAdoWorkflow', () => {
    it('should detect all valid states from ADO work item type', async () => {
      mockGet.mockResolvedValue({
        data: {
          states: [
            { name: 'New' },
            { name: 'Active' },
            { name: 'Resolved' },
            { name: 'Closed' }
          ]
        }
      } as any);

      const workflow = await detector.detectAdoWorkflow(
        'myorg',
        'MyProject',
        'pat-token',
        'Epic'
      );

      expect(workflow.tool).toBe('ado');
      expect(workflow.statuses).toContain('New');
      expect(workflow.statuses).toContain('Active');
      expect(workflow.statuses).toContain('Resolved');
      expect(workflow.statuses).toContain('Closed');
      expect(workflow.statuses.length).toBe(4);
    });

    it('should map all-to-all transitions for ADO', async () => {
      mockGet.mockResolvedValue({
        data: {
          states: [
            { name: 'New' },
            { name: 'Active' },
            { name: 'Closed' }
          ]
        }
      } as any);

      const workflow = await detector.detectAdoWorkflow(
        'myorg',
        'MyProject',
        'pat-token',
        'Epic'
      );

      // ADO allows any-to-any transitions
      expect(workflow.canTransitionTo['New']).toEqual(['Active', 'Closed']);
      expect(workflow.canTransitionTo['Active']).toEqual(['New', 'Closed']);
      expect(workflow.canTransitionTo['Closed']).toEqual(['New', 'Active']);
    });

    it('should default to Epic work item type', async () => {
      mockGet.mockResolvedValue({
        data: {
          states: [
            { name: 'New' },
            { name: 'Active' }
          ]
        }
      } as any);

      const workflow = await detector.detectAdoWorkflow(
        'myorg',
        'MyProject',
        'pat-token'
      );

      expect(mockGet).toHaveBeenCalledWith(
        '/wit/workitemtypes/Epic?api-version=7.0'
      );
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('ADO API not found'));

      await expect(detector.detectAdoWorkflow(
        'myorg',
        'MyProject',
        'pat-token',
        'Epic'
      )).rejects.toThrow('ADO API not found');
    });
  });

  describe('detectWorkflow', () => {
    it('should detect GitHub workflow when tool is github', async () => {
      mockGet.mockResolvedValue({ data: [] });

      const workflow = await detector.detectWorkflow({
        tool: 'github',
        owner: 'owner',
        repo: 'repo',
        token: 'token'
      });

      expect(workflow.tool).toBe('github');
      expect(workflow.statuses).toContain('open');
      expect(workflow.statuses).toContain('closed');
    });

    it('should detect JIRA workflow when tool is jira', async () => {
      mockGet.mockResolvedValue({
        data: {
          transitions: [
            { id: '11', name: 'To Do', to: { name: 'To Do' } }
          ]
        }
      });

      const workflow = await detector.detectWorkflow({
        tool: 'jira',
        domain: 'company.atlassian.net',
        email: 'user@example.com',
        apiToken: 'token',
        projectKey: 'PROJ'
      });

      expect(workflow.tool).toBe('jira');
      expect(workflow.statuses).toContain('To Do');
    });

    it('should detect ADO workflow when tool is ado', async () => {
      mockGet.mockResolvedValue({
        data: {
          states: [
            { name: 'New' },
            { name: 'Active' }
          ]
        }
      });

      const workflow = await detector.detectWorkflow({
        tool: 'ado',
        organization: 'myorg',
        project: 'MyProject',
        pat: 'token'
      });

      expect(workflow.tool).toBe('ado');
      expect(workflow.statuses).toContain('New');
      expect(workflow.statuses).toContain('Active');
    });

    it('should throw error for unsupported tool', async () => {
      await expect(detector.detectWorkflow({
        tool: 'unsupported' as any
      })).rejects.toThrow('Unsupported tool: unsupported');
    });
  });

  describe('constructor', () => {
    it('should create detector instance', () => {
      const newDetector = new WorkflowDetector();
      expect(newDetector).toBeInstanceOf(WorkflowDetector);
    });
  });
});
