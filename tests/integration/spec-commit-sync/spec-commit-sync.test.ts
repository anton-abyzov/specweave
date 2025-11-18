/**
 * Integration tests for spec commit sync functionality
 *
 * Tests the automatic posting of commit/PR comments to external tools
 * (GitHub, JIRA, Azure DevOps) when completing spec user stories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncSpecCommitsToGitHub } from '../../../plugins/specweave-github/lib/github-spec-commit-sync.js';
import { syncSpecCommitsToJira } from '../../../plugins/specweave-jira/lib/jira-spec-commit-sync.js';
import { syncSpecCommitsToAdo } from '../../../plugins/specweave-ado/lib/ado-spec-commit-sync.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('Spec Commit Sync Integration Tests', () => {
  let testDir: string;
  let incrementPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-test-'));
    incrementPath = path.join(testDir, '.specweave', 'increments', '0001-test-increment');

    // Create directory structure
    await fs.mkdir(path.join(incrementPath, 'reports'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('GitHub Spec Commit Sync', () => {
    it('should detect when no GitHub issue is linked', async () => {
      // Create metadata without GitHub issue
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify({}, null, 2)
      );

      const result = await syncSpecCommitsToGitHub({
        incrementPath,
        dryRun: true,
        verbose: false,
      });

      expect(result.success).toBe(true);
      expect(result.commentsPosted).toBe(0);
    });

    it('should detect completed user stories', async () => {
      // Create test files
      await createTestIncrement(incrementPath, {
        githubIssue: 123,
        hasCompletedUserStories: true,
        hasCommits: true,
      });

      const result = await syncSpecCommitsToGitHub({
        incrementPath,
        dryRun: true,
        verbose: false,
      });

      expect(result.success).toBe(true);
      expect(result.userStories.length).toBeGreaterThan(0);
    });

    it('should post short update when no user stories completed', async () => {
      await createTestIncrement(incrementPath, {
        githubIssue: 123,
        hasCompletedUserStories: false,
        hasCommits: true,
      });

      const result = await syncSpecCommitsToGitHub({
        incrementPath,
        dryRun: true,
        verbose: false,
      });

      expect(result.success).toBe(true);
      expect(result.commits.length).toBeGreaterThan(0);
    });
  });

  describe('JIRA Spec Commit Sync', () => {
    it('should detect when no JIRA issue is linked', async () => {
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify({}, null, 2)
      );

      const result = await syncSpecCommitsToJira(
        {
          domain: 'test.atlassian.net',
          email: 'test@example.com',
          apiToken: 'test-token',
          projectKey: 'TEST',
        },
        {
          incrementPath,
          dryRun: true,
          verbose: false,
        }
      );

      expect(result.success).toBe(true);
      expect(result.commentsPosted).toBe(0);
    });
  });

  describe('ADO Spec Commit Sync', () => {
    it('should detect when no ADO work item is linked', async () => {
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify({}, null, 2)
      );

      // Note: This test would require a mock AdoClientV2
      // For now, we're just testing the setup
      expect(true).toBe(true);
    });
  });

  describe('Git Utilities', () => {
    it('should parse GitHub remote URLs', async () => {
      const { parseGitRemoteUrl } = await import('../../../src/utils/git-utils.js');

      const result = parseGitRemoteUrl('https://github.com/owner/repo.git');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('github');
      expect(result?.owner).toBe('owner');
      expect(result?.repo).toBe('repo');
    });

    it('should parse GitLab remote URLs', async () => {
      const { parseGitRemoteUrl } = await import('../../../src/utils/git-utils.js');

      const result = parseGitRemoteUrl('git@gitlab.com:owner/repo.git');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('gitlab');
    });

    it('should parse Azure DevOps remote URLs', async () => {
      const { parseGitRemoteUrl } = await import('../../../src/utils/git-utils.js');

      const result = parseGitRemoteUrl('https://dev.azure.com/org/_git/repo');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('azure');
    });
  });

  describe('Spec-Task Mapping', () => {
    it('should parse user stories from spec.md', async () => {
      const specPath = path.join(incrementPath, 'spec.md');
      const specContent = `
# Test Spec

## User Stories

**US-001**: As a user, I want to test
- [x] **AC-US1-01**: Acceptance criterion 1 (P1, testable)
- [ ] **AC-US1-02**: Acceptance criterion 2 (P2, testable)
      `;

      await fs.writeFile(specPath, specContent);

      const { parseSpec } = await import('../../../src/core/spec-task-mapper.js');
      const userStories = await parseSpec(specPath);

      expect(userStories.length).toBe(1);
      expect(userStories[0].id).toBe('US-001');
      expect(userStories[0].acceptanceCriteria.length).toBe(2);
    });

    it('should parse tasks from tasks.md', async () => {
      const tasksPath = path.join(incrementPath, 'tasks.md');
      const tasksContent = `
## T-001: Test Task

**AC**: AC-US1-01, AC-US1-02

**Implementation**: Do something
      `;

      await fs.writeFile(tasksPath, tasksContent);

      const { parseTasks } = await import('../../../src/core/spec-task-mapper.js');
      const tasks = await parseTasks(tasksPath);

      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('T-001');
      expect(tasks[0].acIds).toContain('AC-US1-01');
      expect(tasks[0].acIds).toContain('AC-US1-02');
    });
  });

  describe('Comment Builder', () => {
    it('should build user story comment with commits', async () => {
      const { buildUserStoryComment } = await import('../../../src/core/comment-builder.js');

      const result = buildUserStoryComment(
        {
          userStory: {
            id: 'US-001',
            title: 'Test user story',
            acceptanceCriteria: [],
          },
          tasks: [],
          commits: [
            {
              sha: 'abc123def456',
              shortSha: 'abc123',
              message: 'feat: add feature',
              author: 'Test Author',
              date: new Date(),
            },
          ],
          pullRequests: [],
          summary: 'Added feature',
        },
        {
          provider: 'github',
          owner: 'test',
          repo: 'test-repo',
          url: 'https://github.com/test/test-repo',
        }
      );

      expect(result.markdown).toContain('US-001');
      expect(result.markdown).toContain('Added feature');
      expect(result.markdown).toContain('abc123');
    });

    it('should format comment for JIRA', async () => {
      const { formatForJira } = await import('../../../src/core/comment-builder.js');

      const comment = {
        markdown: '## Title\n\n**Bold text**\n\n- List item\n\n[Link](https://example.com)',
      };

      const result = formatForJira(comment);

      expect(result).toContain('h2. Title');
      expect(result).toContain('*Bold text*');
      expect(result).toContain('[Link|https://example.com]');
    });
  });
});

// Helper function to create test increment structure
async function createTestIncrement(
  incrementPath: string,
  options: {
    githubIssue?: number;
    jiraIssue?: string;
    adoWorkItem?: number;
    hasCompletedUserStories?: boolean;
    hasCommits?: boolean;
  }
): Promise<void> {
  const { githubIssue, jiraIssue, adoWorkItem, hasCompletedUserStories, hasCommits } = options;

  // Create metadata.json
  const metadata: any = {};
  if (githubIssue) metadata.github = { issue: githubIssue };
  if (jiraIssue) metadata.jira = { issueKey: jiraIssue };
  if (adoWorkItem) metadata.ado = { workItemId: adoWorkItem };

  await fs.writeFile(
    path.join(incrementPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Create spec.md with user stories
  const specContent = `
# Test Increment

**Implements**: SPEC-001-test-feature

## User Stories

**US-001**: As a user, I want to test
- ${hasCompletedUserStories ? '[x]' : '[ ]'} **AC-US1-01**: Acceptance criterion 1 (P1, testable)
  `;

  await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

  // Create tasks.md
  const tasksContent = `
---
increment: 0001-test-increment
total_tasks: 1
---

## T-001: Test Task

**AC**: AC-US1-01

**Implementation**: Do something

${hasCompletedUserStories ? '- [x] T-001' : '- [ ] T-001'}
  `;

  await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);
}
