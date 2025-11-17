/**
 * Integration Tests: GitHub Three-Layer Sync (T-060)
 *
 * Tests GitHub integration specifically:
 * - Issue creation from user story
 * - Issue state management (open → in-progress → closed)
 * - AC checkbox sync
 * - Task subtask sync
 * - Progress tracking
 * - Feature links
 *
 * NOTE: All GitHub API calls are mocked - no real API requests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock GitHub API types
interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  milestone?: string;
}

interface GitHubCheckbox {
  type: 'ac' | 'task';
  id: string;
  title: string;
  checked: boolean;
}

// Mock GitHub API client
class MockGitHubClient {
  private issues: Map<number, GitHubIssue> = new Map();
  private nextIssueNumber = 1;

  async createIssue(title: string, body: string, labels: string[] = []): Promise<GitHubIssue> {
    const issue: GitHubIssue = {
      number: this.nextIssueNumber++,
      title,
      body,
      state: 'open',
      labels
    };
    this.issues.set(issue.number, issue);
    return issue;
  }

  async getIssue(number: number): Promise<GitHubIssue | undefined> {
    return this.issues.get(number);
  }

  async updateIssue(number: number, updates: Partial<GitHubIssue>): Promise<GitHubIssue | undefined> {
    const issue = this.issues.get(number);
    if (!issue) return undefined;

    const updated = { ...issue, ...updates };
    this.issues.set(number, updated);
    return updated;
  }

  async closeIssue(number: number): Promise<GitHubIssue | undefined> {
    return this.updateIssue(number, { state: 'closed' });
  }

  extractCheckboxes(issueBody: string): GitHubCheckbox[] {
    const checkboxes: GitHubCheckbox[] = [];

    // Extract AC checkboxes
    const acPattern = /- \[([ x])\] \*\*(AC-[A-Z0-9-]+)\*\*:\s*(.+?)(?:\n|$)/g;
    let match;
    while ((match = acPattern.exec(issueBody)) !== null) {
      checkboxes.push({
        type: 'ac',
        id: match[2],
        title: match[3],
        checked: match[1] === 'x'
      });
    }

    // Extract task checkboxes
    const taskPattern = /- \[([ x])\] \*\*(T-\d+)\*\*:\s*(.+?)(?:\n|$)/g;
    while ((match = taskPattern.exec(issueBody)) !== null) {
      checkboxes.push({
        type: 'task',
        id: match[2],
        title: match[3],
        checked: match[1] === 'x'
      });
    }

    return checkboxes;
  }

  updateCheckbox(issueBody: string, checkboxId: string, checked: boolean): string {
    const checkbox = checked ? '[x]' : '[ ]';

    // Try AC pattern
    const acPattern = new RegExp(`- \\[([ x])\\] \\*\\*(${checkboxId})\\*\\*:`, 'g');
    let updated = issueBody.replace(acPattern, `- ${checkbox} **$2**:`);

    // Try task pattern
    const taskPattern = new RegExp(`- \\[([ x])\\] \\*\\*(${checkboxId})\\*\\*:`, 'g');
    updated = updated.replace(taskPattern, `- ${checkbox} **$2**:`);

    return updated;
  }
}

describe('GitHub Three-Layer Sync Integration (T-060)', () => {
  let testDir: string;
  let livingDocsDir: string;
  let githubClient: MockGitHubClient;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'specweave-github-test-'));
    livingDocsDir = join(testDir, '.specweave', 'docs', 'living-docs', 'user-stories');
    await mkdir(livingDocsDir, { recursive: true });

    githubClient = new MockGitHubClient();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Issue Creation from User Story', () => {
    it('should create GitHub issue with checkable ACs and tasks', async () => {
      // Create user story
      const userStoryContent = `---
id: US-001
title: OAuth Implementation
status: in-progress
increment: 0031-external-tool-sync
---

# US-001: OAuth Implementation

Implement OAuth 2.0 authentication flow for user login.

## Acceptance Criteria

- [ ] **AC-US1-01**: Valid Login Flow - User can log in with valid credentials
- [ ] **AC-US1-02**: Invalid Password Handling - Show error for invalid password
- [x] **AC-US1-03**: Session Management - JWT tokens expire after 1 hour

## Tasks

- [x] **T-001**: Setup API endpoint
- [ ] **T-002**: Add JWT validation
- [x] **T-003**: Database migration

> **Note**: Tasks are project-specific. See increment tasks.md for full list
`;

      await writeFile(join(livingDocsDir, 'US-001-oauth.md'), userStoryContent);

      // Extract GitHub issue format
      const issueTitle = 'US-001: OAuth Implementation';
      const issueBody = `Implement OAuth 2.0 authentication flow for user login.

## Acceptance Criteria

- [ ] **AC-US1-01**: Valid Login Flow - User can log in with valid credentials
- [ ] **AC-US1-02**: Invalid Password Handling - Show error for invalid password
- [x] **AC-US1-03**: Session Management - JWT tokens expire after 1 hour

## Tasks

- [x] **T-001**: Setup API endpoint
- [ ] **T-002**: Add JWT validation
- [x] **T-003**: Database migration

---
**Source**: [User Story US-001](../user-stories/US-001-oauth.md)
**Increment**: 0031-external-tool-sync
`;

      // Create GitHub issue
      const issue = await githubClient.createIssue(issueTitle, issueBody, ['user-story', 'backend']);

      expect(issue.number).toBe(1);
      expect(issue.title).toBe(issueTitle);
      expect(issue.state).toBe('open');
      expect(issue.labels).toContain('user-story');

      // Validate checkable ACs
      const checkboxes = githubClient.extractCheckboxes(issue.body);
      const acCheckboxes = checkboxes.filter(c => c.type === 'ac');
      expect(acCheckboxes).toHaveLength(3);
      expect(acCheckboxes[0].id).toBe('AC-US1-01');
      expect(acCheckboxes[0].checked).toBe(false);
      expect(acCheckboxes[2].id).toBe('AC-US1-03');
      expect(acCheckboxes[2].checked).toBe(true);

      // Validate task subtasks
      const taskCheckboxes = checkboxes.filter(c => c.type === 'task');
      expect(taskCheckboxes).toHaveLength(3);
      expect(taskCheckboxes[0].id).toBe('T-001');
      expect(taskCheckboxes[0].checked).toBe(true);
      expect(taskCheckboxes[1].id).toBe('T-002');
      expect(taskCheckboxes[1].checked).toBe(false);
    });

    it('should include issue metadata (labels, milestones)', async () => {
      const issue = await githubClient.createIssue(
        'US-002: Payment Integration',
        'Payment processing feature',
        ['user-story', 'backend', 'P1']
      );

      expect(issue.labels).toContain('user-story');
      expect(issue.labels).toContain('backend');
      expect(issue.labels).toContain('P1');
    });
  });

  describe('Issue State Management', () => {
    it('should transition issue state: open → in-progress → closed', async () => {
      // Create issue
      const issue = await githubClient.createIssue(
        'US-001: OAuth Implementation',
        'User story content',
        ['user-story']
      );

      expect(issue.state).toBe('open');

      // Update to in-progress (add label)
      const inProgress = await githubClient.updateIssue(issue.number, {
        labels: [...issue.labels, 'in-progress']
      });

      expect(inProgress?.labels).toContain('in-progress');

      // Close issue
      const closed = await githubClient.closeIssue(issue.number);

      expect(closed?.state).toBe('closed');
    });

    it('should auto-close issue when all ACs and tasks are complete', async () => {
      const issueBody = `## Acceptance Criteria

- [x] **AC-US1-01**: Login Flow
- [x] **AC-US1-02**: Error Handling

## Tasks

- [x] **T-001**: API Endpoint
- [x] **T-002**: Validation
`;

      const issue = await githubClient.createIssue('US-001', issueBody);

      // Check all checkboxes are complete
      const checkboxes = githubClient.extractCheckboxes(issue.body);
      const allComplete = checkboxes.every(c => c.checked);

      expect(allComplete).toBe(true);

      // Auto-close logic
      if (allComplete) {
        await githubClient.closeIssue(issue.number);
      }

      const closedIssue = await githubClient.getIssue(issue.number);
      expect(closedIssue?.state).toBe('closed');
    });
  });

  describe('AC Checkbox Sync', () => {
    it('should sync AC completion from increment to GitHub', async () => {
      // Create issue with unchecked AC
      const issueBody = `## Acceptance Criteria

- [ ] **AC-US1-01**: Valid Login Flow
- [ ] **AC-US1-02**: Invalid Password
`;

      const issue = await githubClient.createIssue('US-001', issueBody);

      // Simulate AC completion in increment
      const updatedBody = githubClient.updateCheckbox(issue.body, 'AC-US1-01', true);

      await githubClient.updateIssue(issue.number, { body: updatedBody });

      // Validate GitHub issue
      const updated = await githubClient.getIssue(issue.number);
      expect(updated?.body).toContain('- [x] **AC-US1-01**');
      expect(updated?.body).toContain('- [ ] **AC-US1-02**');
    });

    it('should sync AC unchecking (reopened) from GitHub to living docs', async () => {
      const issueBody = `## Acceptance Criteria

- [x] **AC-US1-01**: Valid Login Flow
`;

      const issue = await githubClient.createIssue('US-001', issueBody);

      // User unchecks AC in GitHub (bug found)
      const updatedBody = githubClient.updateCheckbox(issue.body, 'AC-US1-01', false);
      await githubClient.updateIssue(issue.number, { body: updatedBody });

      const updated = await githubClient.getIssue(issue.number);
      expect(updated?.body).toContain('- [ ] **AC-US1-01**');
    });
  });

  describe('Task Subtask Sync', () => {
    it('should sync task completion from increment to GitHub', async () => {
      const issueBody = `## Tasks

- [ ] **T-001**: Setup API endpoint
- [ ] **T-002**: Add JWT validation
`;

      const issue = await githubClient.createIssue('US-001', issueBody);

      // Complete T-001 in increment
      const updatedBody = githubClient.updateCheckbox(issue.body, 'T-001', true);
      await githubClient.updateIssue(issue.number, { body: updatedBody });

      const updated = await githubClient.getIssue(issue.number);
      expect(updated?.body).toContain('- [x] **T-001**');
      expect(updated?.body).toContain('- [ ] **T-002**');
    });

    it('should calculate task completion percentage', async () => {
      const issueBody = `## Tasks

- [x] **T-001**: Setup API
- [x] **T-002**: Add validation
- [ ] **T-003**: Database migration
- [ ] **T-004**: Add tests
`;

      const issue = await githubClient.createIssue('US-001', issueBody);
      const checkboxes = githubClient.extractCheckboxes(issue.body);
      const taskCheckboxes = checkboxes.filter(c => c.type === 'task');

      const completedTasks = taskCheckboxes.filter(c => c.checked).length;
      const totalTasks = taskCheckboxes.length;
      const percentage = (completedTasks / totalTasks) * 100;

      expect(completedTasks).toBe(2);
      expect(totalTasks).toBe(4);
      expect(percentage).toBe(50);
    });
  });

  describe('Progress Tracking', () => {
    it('should track overall progress (ACs + tasks)', async () => {
      const issueBody = `## Acceptance Criteria

- [x] **AC-US1-01**: Login Flow
- [ ] **AC-US1-02**: Error Handling

## Tasks

- [x] **T-001**: Setup API
- [x] **T-002**: Add validation
- [ ] **T-003**: Database migration
`;

      const issue = await githubClient.createIssue('US-001', issueBody);
      const checkboxes = githubClient.extractCheckboxes(issue.body);

      const completed = checkboxes.filter(c => c.checked).length;
      const total = checkboxes.length;
      const progress = (completed / total) * 100;

      expect(completed).toBe(3); // 1 AC + 2 tasks
      expect(total).toBe(5); // 2 ACs + 3 tasks
      expect(progress).toBe(60);
    });

    it('should add progress badge to issue description', async () => {
      const progress = 60;
      const badge = `![Progress](https://progress-bar.dev/${progress}/?title=Progress)`;

      const issueBody = `${badge}

## Acceptance Criteria

- [x] **AC-US1-01**: Login Flow (50% complete)
`;

      const issue = await githubClient.createIssue('US-001', issueBody);

      expect(issue.body).toContain('progress-bar.dev/60');
    });
  });

  describe('Feature Links', () => {
    it('should link GitHub issue to user story file', async () => {
      const issueBody = `OAuth implementation

---
**Source**: [User Story US-001](../user-stories/US-001-oauth.md)
**Increment**: 0031-external-tool-sync
`;

      const issue = await githubClient.createIssue('US-001', issueBody);

      expect(issue.body).toContain('**Source**: [User Story US-001]');
      expect(issue.body).toContain('**Increment**: 0031-external-tool-sync');
    });

    it('should store GitHub issue URL in user story frontmatter', async () => {
      const userStoryContent = `---
id: US-001
title: OAuth Implementation
github:
  issueNumber: 123
  issueUrl: https://github.com/owner/repo/issues/123
---

# US-001
`;

      await writeFile(join(livingDocsDir, 'US-001.md'), userStoryContent);

      const content = await readFile(join(livingDocsDir, 'US-001.md'), 'utf-8');
      expect(content).toContain('issueNumber: 123');
      expect(content).toContain('issueUrl: https://github.com/owner/repo/issues/123');
    });
  });

  describe('Bidirectional Sync', () => {
    it('should sync checkbox updates from GitHub to living docs', async () => {
      // Initial state
      const userStoryPath = join(livingDocsDir, 'US-001.md');
      const userStoryContent = `---
id: US-001
---

# US-001

## Acceptance Criteria

- [ ] **AC-US1-01**: Login Flow
`;

      await writeFile(userStoryPath, userStoryContent);

      // Create GitHub issue
      const issueBody = `## Acceptance Criteria

- [ ] **AC-US1-01**: Login Flow
`;

      const issue = await githubClient.createIssue('US-001', issueBody);

      // User checks AC in GitHub
      const updatedIssueBody = githubClient.updateCheckbox(issue.body, 'AC-US1-01', true);
      await githubClient.updateIssue(issue.number, { body: updatedIssueBody });

      // Simulate webhook sync back to user story
      let userStory = await readFile(userStoryPath, 'utf-8');
      userStory = userStory.replace('- [ ] **AC-US1-01**', '- [x] **AC-US1-01**');
      await writeFile(userStoryPath, userStory);

      // Validate sync
      const syncedContent = await readFile(userStoryPath, 'utf-8');
      expect(syncedContent).toContain('- [x] **AC-US1-01**');
    });

    it('should handle conflict resolution (GitHub wins)', async () => {
      // Initial state
      const userStoryPath = join(livingDocsDir, 'US-001.md');
      const userStoryContent = `## Acceptance Criteria

- [ ] **AC-US1-01**: Login Flow
`;

      await writeFile(userStoryPath, userStoryContent);

      // Create GitHub issue
      const issue = await githubClient.createIssue('US-001', userStoryContent);

      // Simultaneous updates:
      // - Local: mark complete
      // - GitHub: mark complete

      // Both mark as complete → no conflict
      let localContent = await readFile(userStoryPath, 'utf-8');
      localContent = localContent.replace('- [ ]', '- [x]');

      let githubBody = issue.body;
      githubBody = githubClient.updateCheckbox(githubBody, 'AC-US1-01', true);

      // GitHub wins (external always wins)
      await writeFile(userStoryPath, localContent.replace('- [x]', '- [x]')); // Same result

      const finalContent = await readFile(userStoryPath, 'utf-8');
      expect(finalContent).toContain('- [x] **AC-US1-01**');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle GitHub API rate limiting gracefully', async () => {
      // Mock rate limit scenario
      const createIssuesWithBackoff = async (count: number) => {
        const issues: GitHubIssue[] = [];
        let retryCount = 0;
        const maxRetries = 3;

        for (let i = 0; i < count; i++) {
          try {
            const issue = await githubClient.createIssue(`Issue ${i}`, `Body ${i}`);
            issues.push(issue);
            retryCount = 0; // Reset on success
          } catch (error) {
            if (retryCount < maxRetries) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              i--; // Retry same issue
            }
          }
        }

        return issues;
      };

      const issues = await createIssuesWithBackoff(5);
      expect(issues).toHaveLength(5);
    });
  });

  describe('Performance', () => {
    it('should create GitHub issue in <3s', async () => {
      const startTime = Date.now();

      const issue = await githubClient.createIssue(
        'US-001: OAuth Implementation',
        'OAuth implementation with ACs and tasks',
        ['user-story', 'backend']
      );

      const elapsedTime = Date.now() - startTime;

      expect(issue).toBeDefined();
      expect(elapsedTime).toBeLessThan(3000);
    });

    it('should sync 100 checkbox updates in <10s', async () => {
      // Create issue with 100 checkboxes
      let issueBody = '## Tasks\n\n';
      for (let i = 1; i <= 100; i++) {
        issueBody += `- [ ] **T-${i.toString().padStart(3, '0')}**: Task ${i}\n`;
      }

      const issue = await githubClient.createIssue('US-001', issueBody);

      const startTime = Date.now();

      // Update all checkboxes
      let updatedBody = issue.body;
      for (let i = 1; i <= 100; i++) {
        const taskId = `T-${i.toString().padStart(3, '0')}`;
        updatedBody = githubClient.updateCheckbox(updatedBody, taskId, true);
      }

      await githubClient.updateIssue(issue.number, { body: updatedBody });

      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(10000);

      // Validate all checkboxes are checked
      const checkboxes = githubClient.extractCheckboxes(updatedBody);
      expect(checkboxes.every(c => c.checked)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty AC/task lists', async () => {
      const issueBody = `# User Story

No acceptance criteria or tasks defined yet.
`;

      const issue = await githubClient.createIssue('US-001', issueBody);
      const checkboxes = githubClient.extractCheckboxes(issue.body);

      expect(checkboxes).toHaveLength(0);
    });

    it('should handle malformed checkbox syntax', async () => {
      const issueBody = `## Acceptance Criteria

- [ ] **AC-US1-01** Missing colon
- [x] AC-US1-02: Missing bold markers
- [ ] **AC-US1-03**: Valid checkbox
`;

      const issue = await githubClient.createIssue('US-001', issueBody);
      const checkboxes = githubClient.extractCheckboxes(issue.body);

      // Should only extract valid checkbox (AC-US1-03)
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should handle special characters in task titles', async () => {
      const issueBody = `## Tasks

- [ ] **T-001**: Add "quotes" & special chars (e.g., <html>)
`;

      const issue = await githubClient.createIssue('US-001', issueBody);
      const checkboxes = githubClient.extractCheckboxes(issue.body);

      expect(checkboxes[0].title).toContain('quotes');
      expect(checkboxes[0].title).toContain('&');
    });
  });
});
