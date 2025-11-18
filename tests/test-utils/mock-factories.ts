/**
 * Mock Factories for Test Data
 * 
 * Provides type-safe object creation for tests with sensible defaults.
 * Supports partial overrides for customization.
 */

export interface Increment {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'abandoned';
  type: 'feature' | 'bug' | 'hotfix' | 'refactor';
  priority: 'P1' | 'P2' | 'P3';
  created: string;
  updated: string;
  testMode?: 'TDD' | 'BDD' | 'standard';
  coverageTarget?: number;
  [key: string]: any;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  body: string;
  labels?: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at?: string;
  html_url: string;
  [key: string]: any;
}

export interface ADOWorkItem {
  id: number;
  fields: {
    'System.WorkItemType': string;
    'System.Title': string;
    'System.State': string;
    'System.Description'?: string;
    'System.CreatedDate': string;
    [key: string]: any;
  };
  url: string;
  [key: string]: any;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: { name: string };
    status: { name: string };
    priority?: { name: string };
    created: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Factory for creating test Increment objects
 */
export class IncrementFactory {
  static create(overrides?: Partial<Increment>): Increment {
    return {
      id: '0001-test-increment',
      name: 'Test Increment',
      status: 'active',
      type: 'feature',
      priority: 'P1',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
      testMode: 'TDD',
      coverageTarget: 90,
      ...overrides,
    };
  }

  static createCompleted(overrides?: Partial<Increment>): Increment {
    return IncrementFactory.create({
      status: 'completed',
      completed: '2025-01-15T00:00:00Z',
      ...overrides,
    });
  }

  static createPlanning(overrides?: Partial<Increment>): Increment {
    return IncrementFactory.create({
      status: 'planning',
      ...overrides,
    });
  }

  static createWithTasks(overrides?: Partial<Increment>): Increment {
    return IncrementFactory.create({
      tasks: [
        { id: 'T-001', title: 'Task 1', status: 'completed' },
        { id: 'T-002', title: 'Task 2', status: 'in-progress' },
        { id: 'T-003', title: 'Task 3', status: 'pending' },
      ],
      ...overrides,
    });
  }
}

/**
 * Factory for creating test GitHub objects
 */
export class GitHubFactory {
  static createIssue(overrides?: Partial<GitHubIssue>): GitHubIssue {
    return {
      number: 123,
      title: 'Test GitHub Issue',
      state: 'open',
      body: 'This is a test issue for SpecWeave testing.',
      labels: [{ name: 'enhancement', color: '84b6eb' }],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      html_url: 'https://github.com/test/repo/issues/123',
      ...overrides,
    };
  }

  static createPullRequest(overrides?: any): any {
    return {
      number: 456,
      title: 'feat: Add new feature',
      state: 'open',
      body: '## Summary\n- Implemented new feature',
      head: { ref: 'feature/new-feature', sha: 'abc123def456' },
      base: { ref: 'main', sha: 'main123456' },
      draft: false,
      merged: false,
      created_at: '2025-01-05T00:00:00Z',
      html_url: 'https://github.com/test/repo/pull/456',
      ...overrides,
    };
  }

  static createComment(overrides?: any): any {
    return {
      id: 789,
      body: 'This is a test comment.',
      user: { login: 'testuser', id: 12345 },
      created_at: '2025-01-02T00:00:00Z',
      html_url: 'https://github.com/test/repo/issues/123#issuecomment-789',
      ...overrides,
    };
  }

  static createMilestone(overrides?: any): any {
    return {
      number: 1,
      title: 'v1.0.0 Release',
      state: 'open',
      open_issues: 5,
      closed_issues: 10,
      created_at: '2025-01-01T00:00:00Z',
      html_url: 'https://github.com/test/repo/milestone/1',
      ...overrides,
    };
  }
}

/**
 * Factory for creating test Azure DevOps objects
 */
export class ADOFactory {
  static createWorkItem(overrides?: Partial<ADOWorkItem>): ADOWorkItem {
    const defaults: ADOWorkItem = {
      id: 1001,
      fields: {
        'System.WorkItemType': 'User Story',
        'System.Title': 'Test ADO Work Item',
        'System.State': 'Active',
        'System.Description': 'Test work item description',
        'Microsoft.VSTS.Scheduling.StoryPoints': 5,
        'System.CreatedDate': '2025-01-01T00:00:00Z',
      },
      url: 'https://dev.azure.com/test/TestProject/_workitems/edit/1001',
    };

    return {
      ...defaults,
      ...overrides,
      fields: {
        ...defaults.fields,
        ...(overrides?.fields || {}),
      },
    };
  }

  static createSprint(overrides?: any): any {
    return {
      id: 'sprint-guid-123',
      name: 'Sprint 1',
      path: 'TestProject\\Sprint 1',
      attributes: {
        startDate: '2025-01-01T00:00:00Z',
        finishDate: '2025-01-14T23:59:59Z',
        timeFrame: 'current',
      },
      ...overrides,
    };
  }

  static createBoard(overrides?: any): any {
    return {
      id: 'board-123',
      name: 'Test Board',
      columns: [
        { name: 'To Do', itemLimit: 0 },
        { name: 'In Progress', itemLimit: 5 },
        { name: 'Done', itemLimit: 0 },
      ],
      ...overrides,
    };
  }
}

/**
 * Factory for creating test Jira objects
 */
export class JiraFactory {
  static createIssue(overrides?: Partial<JiraIssue>): JiraIssue {
    const defaults: JiraIssue = {
      id: '10001',
      key: 'TEST-123',
      fields: {
        summary: 'Test Jira Issue',
        description: 'This is a test issue for SpecWeave testing.',
        issuetype: { name: 'Story' },
        status: { name: 'In Progress' },
        priority: { name: 'High' },
        created: '2025-01-01T00:00:00.000+0000',
      },
    };

    return {
      ...defaults,
      ...overrides,
      fields: {
        ...defaults.fields,
        ...(overrides?.fields || {}),
      },
    };
  }

  static createEpic(overrides?: Partial<JiraIssue>): JiraIssue {
    return JiraFactory.createIssue({
      id: '10002',
      key: 'TEST-100',
      fields: {
        summary: 'Test Epic',
        description: 'This is a test epic containing multiple stories.',
        issuetype: { name: 'Epic' },
        status: { name: 'In Progress' },
        created: '2025-01-01T00:00:00.000+0000',
      },
      ...overrides,
    });
  }

  static createSubtask(overrides?: Partial<JiraIssue>): JiraIssue {
    return JiraFactory.createIssue({
      id: '10003',
      key: 'TEST-124',
      fields: {
        summary: 'Test Subtask',
        issuetype: { name: 'Sub-task' },
        status: { name: 'To Do' },
        created: '2025-01-01T00:00:00.000+0000',
        parent: { key: 'TEST-123' },
      },
      ...overrides,
    });
  }
}
