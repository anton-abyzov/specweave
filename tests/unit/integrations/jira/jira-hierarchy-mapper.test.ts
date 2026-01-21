/**
 * Unit tests for JiraHierarchyMapper
 *
 * Tests:
 * - Hierarchy detection and mapping
 * - Epic/Feature/UserStory sync to Jira
 * - Issue type mapping
 *
 * @module tests/unit/integrations/jira/jira-hierarchy-mapper.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock JiraClient
const mockJiraClient = {
  createIssue: vi.fn(),
  searchIssues: vi.fn(),
  updateIssue: vi.fn(),
  getIssue: vi.fn()
};

// Mock credentials manager
vi.mock('../../../../src/core/credentials/credentials-manager.js', () => ({
  credentialsManager: {
    getJiraCredentials: () => ({
      email: 'test@example.com',
      apiToken: 'test-token',
      domain: 'test.atlassian.net'
    })
  }
}));

// Mock chalk to prevent ANSI codes in tests
vi.mock('chalk', () => ({
  default: {
    cyan: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    gray: (s: string) => s,
    bold: (s: string) => s
  }
}));

// Import after mocking
const { JiraHierarchyMapper } = await import('../../../../src/integrations/jira/jira-hierarchy-mapper.js');

describe('JiraHierarchyMapper', () => {
  let mapper: InstanceType<typeof JiraHierarchyMapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mapper = new JiraHierarchyMapper(mockJiraClient as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('detectProjectType', () => {
    it('should return default Agile hierarchy mapping', async () => {
      const mapping = await mapper.detectProjectType('PROJ');

      expect(mapping.epic).toBe('Initiative');
      expect(mapping.feature).toBe('Epic');
      expect(mapping.userStory).toBe('Story');
      expect(mapping.task).toBe('Sub-task');
    });
  });

  describe('mapToJiraIssueType', () => {
    it('should map epic level to Initiative', () => {
      const mapping = {
        epic: 'Initiative',
        feature: 'Epic',
        userStory: 'Story',
        task: 'Sub-task'
      };

      expect(mapper.mapToJiraIssueType('epic', mapping)).toBe('Initiative');
    });

    it('should map feature level to Epic', () => {
      const mapping = {
        epic: 'Initiative',
        feature: 'Epic',
        userStory: 'Story',
        task: 'Sub-task'
      };

      expect(mapper.mapToJiraIssueType('feature', mapping)).toBe('Epic');
    });

    it('should map userStory level to Story', () => {
      const mapping = {
        epic: 'Initiative',
        feature: 'Epic',
        userStory: 'Story',
        task: 'Sub-task'
      };

      expect(mapper.mapToJiraIssueType('userStory', mapping)).toBe('Story');
    });

    it('should map task level to Sub-task', () => {
      const mapping = {
        epic: 'Initiative',
        feature: 'Epic',
        userStory: 'Story',
        task: 'Sub-task'
      };

      expect(mapper.mapToJiraIssueType('task', mapping)).toBe('Sub-task');
    });

    it('should work with custom CMMI mapping', () => {
      const cmmiMapping = {
        epic: 'Epic',
        feature: 'Feature',
        userStory: 'Requirement',
        task: 'Task'
      };

      expect(mapper.mapToJiraIssueType('feature', cmmiMapping)).toBe('Feature');
      expect(mapper.mapToJiraIssueType('userStory', cmmiMapping)).toBe('Requirement');
    });
  });

  describe('syncEpicToJira', () => {
    it('should create an Initiative for SpecWeave Epic', async () => {
      const mockIssue = { key: 'PROJ-100', id: '1' };
      mockJiraClient.createIssue.mockResolvedValueOnce(mockIssue);

      const epic = {
        id: 'EP-001',
        title: 'Test Epic',
        description: 'Epic description',
        status: 'active',
        priority: 'High'
      };

      const result = await mapper.syncEpicToJira(epic, 'PROJ');

      expect(result).toBe('PROJ-100');
      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          issueType: 'Initiative',
          summary: 'Test Epic',
          description: 'Epic description',
          priority: 'High',
          labels: ['specweave-epic-EP-001']
        }),
        'PROJ'
      );
    });
  });

  describe('syncFeatureToJira', () => {
    it('should create an Epic for SpecWeave Feature', async () => {
      const mockIssue = { key: 'PROJ-200', id: '2' };
      mockJiraClient.createIssue.mockResolvedValueOnce(mockIssue);

      const feature = {
        id: 'FS-001',
        title: 'Test Feature',
        description: 'Feature description',
        status: 'active',
        priority: 'Medium'
      };

      const result = await mapper.syncFeatureToJira(feature, 'PROJ');

      expect(result).toBe('PROJ-200');
      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          issueType: 'Epic',
          summary: 'Test Feature',
          labels: ['specweave-feature-FS-001']
        }),
        'PROJ'
      );
    });

    it('should link Feature to parent Epic', async () => {
      const mockIssue = { key: 'PROJ-201', id: '3' };
      mockJiraClient.createIssue.mockResolvedValueOnce(mockIssue);

      const feature = {
        id: 'FS-002',
        title: 'Child Feature',
        description: 'Feature under epic',
        status: 'active',
        priority: 'Low',
        epic: 'EP-001'
      };

      await mapper.syncFeatureToJira(feature, 'PROJ', 'PROJ-100');

      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          epicKey: 'PROJ-100'
        }),
        'PROJ'
      );
    });
  });

  describe('syncUserStoryToJira', () => {
    it('should create a Story for SpecWeave User Story', async () => {
      const mockIssue = { key: 'PROJ-300', id: '4' };
      mockJiraClient.createIssue.mockResolvedValueOnce(mockIssue);

      const userStory = {
        id: 'US-001',
        title: 'Test User Story',
        description: 'User story description',
        acceptanceCriteria: ['AC-1: Given X, Then Y', 'AC-2: Given A, Then B'],
        status: 'active',
        priority: 'High'
      };

      const result = await mapper.syncUserStoryToJira(userStory, 'PROJ');

      expect(result).toBe('PROJ-300');
      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          issueType: 'Story',
          summary: 'Test User Story',
          labels: ['specweave-us-US-001']
        }),
        'PROJ'
      );
    });

    it('should include acceptance criteria in description', async () => {
      const mockIssue = { key: 'PROJ-301', id: '5' };
      mockJiraClient.createIssue.mockResolvedValueOnce(mockIssue);

      const userStory = {
        id: 'US-002',
        title: 'Story with ACs',
        description: 'Base description',
        acceptanceCriteria: ['AC-1: First criterion', 'AC-2: Second criterion'],
        status: 'active',
        priority: 'Medium'
      };

      await mapper.syncUserStoryToJira(userStory, 'PROJ');

      const call = mockJiraClient.createIssue.mock.calls[0][0];
      expect(call.description).toContain('Acceptance Criteria');
      expect(call.description).toContain('AC-1');
    });

    it('should link User Story to parent Feature', async () => {
      const mockIssue = { key: 'PROJ-302', id: '6' };
      mockJiraClient.createIssue.mockResolvedValueOnce(mockIssue);

      const userStory = {
        id: 'US-003',
        title: 'Child Story',
        description: 'Story under feature',
        acceptanceCriteria: [],
        status: 'active',
        priority: 'Low',
        feature: 'FS-001'
      };

      await mapper.syncUserStoryToJira(userStory, 'PROJ', 'PROJ-200');

      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          epicKey: 'PROJ-200'
        }),
        'PROJ'
      );
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from JiraClient', async () => {
      mockJiraClient.createIssue.mockRejectedValueOnce(new Error('API Error'));

      const epic = {
        id: 'EP-ERR',
        title: 'Error Epic',
        description: 'Will fail',
        status: 'active',
        priority: 'High'
      };

      await expect(mapper.syncEpicToJira(epic, 'PROJ')).rejects.toThrow('API Error');
    });
  });
});
