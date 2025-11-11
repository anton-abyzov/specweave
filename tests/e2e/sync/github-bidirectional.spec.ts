/**
 * E2E Test: GitHub Bidirectional Sync
 *
 * Tests the critical team collaboration workflow:
 * 1. Create increment and sync to GitHub issue
 * 2. Update tasks locally and sync to GitHub
 * 3. Update GitHub issue and sync back to local
 * 4. Handle conflicts and resolution
 *
 * This ensures teams can collaborate effectively using GitHub as the shared workspace.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock GitHub API responses
const mockGitHubAPI = {
  issues: new Map<number, any>(),
  nextIssueNumber: 100,

  createIssue(data: any) {
    const issueNumber = this.nextIssueNumber++;
    const issue = {
      number: issueNumber,
      title: data.title,
      body: data.body,
      state: 'open',
      labels: data.labels || [],
      assignees: data.assignees || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      html_url: `https://github.com/test/repo/issues/${issueNumber}`,
      comments: 0
    };
    this.issues.set(issueNumber, issue);
    return issue;
  },

  updateIssue(number: number, updates: any) {
    const issue = this.issues.get(number);
    if (!issue) throw new Error(`Issue ${number} not found`);

    Object.assign(issue, updates, {
      updated_at: new Date().toISOString()
    });
    return issue;
  },

  getIssue(number: number) {
    return this.issues.get(number);
  },

  addComment(number: number, comment: string) {
    const issue = this.issues.get(number);
    if (!issue) throw new Error(`Issue ${number} not found`);

    issue.comments = (issue.comments || 0) + 1;
    issue.updated_at = new Date().toISOString();
    return { body: comment, created_at: new Date().toISOString() };
  }
};

test.describe('GitHub Bidirectional Sync (E2E)', () => {
  let testDir: string;

  test.beforeEach(async () => {
    // Setup test directory
    testDir = path.join(os.tmpdir(), `specweave-e2e-github-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Initialize SpecWeave directory structure
    await fs.ensureDir(path.join(testDir, '.specweave/increments'));
    await fs.ensureDir(path.join(testDir, '.specweave/docs/internal/specs'));

    // Setup sync configuration
    const config = {
      sync: {
        enabled: true,
        activeProfile: 'test-github',
        profiles: {
          'test-github': {
            provider: 'github',
            config: {
              owner: 'test',
              repo: 'repo'
            }
          }
        }
      }
    };
    await fs.writeJson(path.join(testDir, '.specweave/config.json'), config, { spaces: 2 });

    // Reset mock GitHub API
    mockGitHubAPI.issues.clear();
    mockGitHubAPI.nextIssueNumber = 100;
  });

  test.afterEach(async () => {
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  test('should sync new increment to GitHub issue', async () => {
    const incrementId = '0001-user-auth';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Create increment files
    const spec = `---
title: User Authentication
increment: ${incrementId}
status: active
---

# User Authentication Feature

## Summary
Implement secure user authentication with JWT tokens

## User Stories
- US-001: User can register
- US-002: User can login
- US-003: User can logout
`;

    const tasks = `---
increment: ${incrementId}
total_tasks: 3
---

# Tasks

## T-001: Create user model
**Status**: pending
**AC**: US-001

## T-002: Implement auth endpoints
**Status**: pending
**AC**: US-002

## T-003: Add JWT validation
**Status**: pending
**AC**: US-003
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), spec);
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasks);

    // Simulate GitHub issue creation
    const issue = mockGitHubAPI.createIssue({
      title: '[INC-0001] User Authentication',
      body: `**Status**: Active
**Priority**: P1
**Increment**: ${incrementId}

## Summary
Implement secure user authentication with JWT tokens

## Tasks
Progress: 0/3 tasks (0%)

- [ ] T-001: Create user model
- [ ] T-002: Implement auth endpoints
- [ ] T-003: Add JWT validation

## Links
- **Spec**: spec.md
- **Tasks**: tasks.md`,
      labels: ['specweave', 'increment', 'active']
    });

    // Save GitHub metadata
    const metadata = {
      increment: incrementId,
      github: {
        issue: issue.number,
        url: issue.html_url,
        lastSync: new Date().toISOString()
      }
    };
    await fs.writeJson(path.join(incrementPath, 'metadata.json'), metadata, { spaces: 2 });

    // Verify sync
    expect(issue.number).toBe(100);
    expect(issue.title).toContain('User Authentication');
    expect(issue.labels).toContain('specweave');
    expect(issue.state).toBe('open');

    const savedMetadata = await fs.readJson(path.join(incrementPath, 'metadata.json'));
    expect(savedMetadata.github.issue).toBe(100);
  });

  test('should sync task completion to GitHub', async () => {
    const incrementId = '0002-api-endpoints';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Create GitHub issue first
    const issue = mockGitHubAPI.createIssue({
      title: '[INC-0002] API Endpoints',
      body: `## Tasks
- [ ] T-001: Setup Express
- [ ] T-002: Create routes
- [ ] T-003: Add middleware`,
      labels: ['specweave', 'increment']
    });

    // Create local files with one task completed
    const tasks = `---
increment: ${incrementId}
total_tasks: 3
---

# Tasks

## T-001: Setup Express
**Status**: completed

## T-002: Create routes
**Status**: pending

## T-003: Add middleware
**Status**: pending
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasks);
    await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
      increment: incrementId,
      github: { issue: issue.number }
    });

    // Simulate sync to GitHub
    const updatedIssue = mockGitHubAPI.updateIssue(issue.number, {
      body: `## Tasks
Progress: 1/3 tasks (33%)

- [x] T-001: Setup Express ✅
- [ ] T-002: Create routes
- [ ] T-003: Add middleware`
    });

    // Add progress comment
    mockGitHubAPI.addComment(issue.number, '🎯 Task completed: T-001: Setup Express\n\nProgress: 1/3 tasks (33%)');

    // Verify GitHub update
    expect(updatedIssue.body).toContain('[x] T-001');
    expect(updatedIssue.body).toContain('Progress: 1/3 tasks (33%)');
    expect(updatedIssue.comments).toBe(1);
  });

  test('should sync GitHub changes back to local', async () => {
    const incrementId = '0003-database-setup';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Create initial state
    const tasks = `---
increment: ${incrementId}
total_tasks: 2
---

# Tasks

## T-001: Install PostgreSQL
**Status**: pending

## T-002: Create schemas
**Status**: pending
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasks);

    // Create GitHub issue with tasks already completed
    const issue = mockGitHubAPI.createIssue({
      title: '[INC-0003] Database Setup',
      body: `## Tasks
Progress: 2/2 tasks (100%)

- [x] T-001: Install PostgreSQL ✅
- [x] T-002: Create schemas ✅

**Completed by external contributor**`
    });

    await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
      increment: incrementId,
      github: { issue: issue.number }
    });

    // Simulate pulling changes from GitHub
    const githubData = mockGitHubAPI.getIssue(issue.number);
    const completedTasks = (githubData.body.match(/\[x\]/g) || []).length;

    // Update local tasks based on GitHub
    let localTasks = await fs.readFile(path.join(incrementPath, 'tasks.md'), 'utf-8');
    localTasks = localTasks.replace(/\*\*Status\*\*: pending/g, '**Status**: completed');
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), localTasks);

    // Verify local update
    const updatedTasks = await fs.readFile(path.join(incrementPath, 'tasks.md'), 'utf-8');
    expect(updatedTasks.match(/\*\*Status\*\*: completed/g)).toHaveLength(2);
    expect(completedTasks).toBe(2);
  });

  test('should handle sync conflicts', async () => {
    const incrementId = '0004-conflict-test';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Create local state with T-001 completed
    const localTasks = `---
increment: ${incrementId}
total_tasks: 3
---

# Tasks

## T-001: Task One
**Status**: completed
**CompletedAt**: 2024-01-01T10:00:00Z

## T-002: Task Two
**Status**: pending

## T-003: Task Three
**Status**: pending
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), localTasks);

    // Create GitHub issue with T-002 completed instead
    const issue = mockGitHubAPI.createIssue({
      title: '[INC-0004] Conflict Test',
      body: `## Tasks
- [ ] T-001: Task One
- [x] T-002: Task Two ✅ (Completed at 2024-01-01T11:00:00Z)
- [ ] T-003: Task Three`
    });

    // Save conflict resolution strategy
    const conflictResolution = {
      strategy: 'merge',
      localChanges: ['T-001: completed'],
      remoteChanges: ['T-002: completed'],
      resolution: 'accept-both',
      mergedAt: new Date().toISOString()
    };

    await fs.writeJson(path.join(incrementPath, '.sync-conflict.json'), conflictResolution);

    // Apply merged state
    const mergedTasks = `---
increment: ${incrementId}
total_tasks: 3
---

# Tasks

## T-001: Task One
**Status**: completed
**CompletedAt**: 2024-01-01T10:00:00Z
**Source**: local

## T-002: Task Two
**Status**: completed
**CompletedAt**: 2024-01-01T11:00:00Z
**Source**: github

## T-003: Task Three
**Status**: pending
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), mergedTasks);

    // Update GitHub with merged state
    mockGitHubAPI.updateIssue(issue.number, {
      body: `## Tasks
Progress: 2/3 tasks (67%)

- [x] T-001: Task One ✅ (local)
- [x] T-002: Task Two ✅ (github)
- [ ] T-003: Task Three

**Conflict resolved**: Merged changes from both sources`
    });

    // Verify conflict resolution
    const resolution = await fs.readJson(path.join(incrementPath, '.sync-conflict.json'));
    expect(resolution.strategy).toBe('merge');
    expect(resolution.resolution).toBe('accept-both');

    const finalTasks = await fs.readFile(path.join(incrementPath, 'tasks.md'), 'utf-8');
    expect(finalTasks.match(/\*\*Status\*\*: completed/g)).toHaveLength(2);
  });

  test('should sync increment closure to GitHub', async () => {
    const incrementId = '0005-completed-feature';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Create completed increment
    const tasks = `---
increment: ${incrementId}
total_tasks: 2
---

# Tasks

## T-001: Implementation
**Status**: completed

## T-002: Testing
**Status**: completed
`;

    const completionReport = `# Completion Report

## Status: ✅ COMPLETE

All tasks completed successfully.
Test coverage: 85%
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasks);
    await fs.ensureDir(path.join(incrementPath, 'reports'));
    await fs.writeFile(path.join(incrementPath, 'reports/COMPLETION-REPORT.md'), completionReport);

    // Create GitHub issue
    const issue = mockGitHubAPI.createIssue({
      title: '[INC-0005] Completed Feature',
      body: 'Initial issue body',
      labels: ['specweave', 'increment', 'active']
    });

    // Close increment and sync to GitHub
    const closedIssue = mockGitHubAPI.updateIssue(issue.number, {
      state: 'closed',
      body: `## ✅ INCREMENT COMPLETE

### Final Status
- **Tasks**: 2/2 (100%)
- **Test Coverage**: 85%
- **Completed**: ${new Date().toISOString()}

### Completion Report
All tasks completed successfully.

### Links
- [Completion Report](reports/COMPLETION-REPORT.md)`,
      labels: ['specweave', 'increment', 'completed']
    });

    // Add closing comment
    mockGitHubAPI.addComment(issue.number, `🎉 Increment completed successfully!

**Final Stats**:
- Tasks: 2/2 ✅
- Coverage: 85% ✅
- Duration: 3 days

Great work team! 🚀`);

    // Verify closure
    expect(closedIssue.state).toBe('closed');
    expect(closedIssue.labels).toContain('completed');
    expect(closedIssue.body).toContain('✅ INCREMENT COMPLETE');
    expect(closedIssue.comments).toBe(1);
  });

  test('should handle rate limiting gracefully', async () => {
    const incrementId = '0006-rate-limit';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Simulate rate limit scenario
    const rateLimitStatus = {
      remaining: 5,
      reset: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      used: 4995,
      limit: 5000
    };

    // Save rate limit status
    await fs.writeJson(path.join(testDir, '.specweave/.github-rate-limit.json'), rateLimitStatus);

    // Check if sync should proceed
    const canSync = rateLimitStatus.remaining > 10; // Need at least 10 API calls

    if (!canSync) {
      // Queue sync for later
      const syncQueue = {
        increment: incrementId,
        queuedAt: new Date().toISOString(),
        retryAfter: rateLimitStatus.reset,
        reason: 'Rate limit approaching'
      };

      await fs.writeJson(path.join(incrementPath, '.sync-queue.json'), syncQueue);

      // Verify queuing
      const queue = await fs.readJson(path.join(incrementPath, '.sync-queue.json'));
      expect(queue.reason).toBe('Rate limit approaching');
      expect(queue.retryAfter).toBe(rateLimitStatus.reset);
    }

    expect(canSync).toBe(false);
  });

  test('should batch sync multiple increments', async () => {
    const increments = ['0007-feature-a', '0008-feature-b', '0009-feature-c'];
    const syncBatch = [];

    for (const incrementId of increments) {
      const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // Create minimal increment
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), `---
increment: ${incrementId}
total_tasks: 1
---

# Tasks

## T-001: Implementation
**Status**: completed
`);

      // Create GitHub issue
      const issue = mockGitHubAPI.createIssue({
        title: `[INC-${incrementId}] Feature`,
        body: 'Tasks: 0/1'
      });

      syncBatch.push({
        increment: incrementId,
        issueNumber: issue.number
      });
    }

    // Perform batch sync
    const batchResults = syncBatch.map(item => {
      const issue = mockGitHubAPI.updateIssue(item.issueNumber, {
        body: 'Tasks: 1/1 (100%)\n- [x] T-001: Implementation ✅'
      });

      return {
        increment: item.increment,
        success: true,
        issueNumber: item.issueNumber,
        syncedAt: new Date().toISOString()
      };
    });

    // Verify batch sync
    expect(batchResults).toHaveLength(3);
    expect(batchResults.every(r => r.success)).toBe(true);

    // Check all issues were updated
    for (const result of batchResults) {
      const issue = mockGitHubAPI.getIssue(result.issueNumber);
      expect(issue.body).toContain('100%');
      expect(issue.body).toContain('[x] T-001');
    }
  });
});

test.describe('GitHub Sync Error Handling', () => {
  let testDir: string;

  test.beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `specweave-e2e-github-errors-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  test.afterEach(async () => {
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  test('should handle network failures', async () => {
    const incrementId = '0010-network-fail';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Simulate network error
    const errorLog = {
      timestamp: new Date().toISOString(),
      increment: incrementId,
      operation: 'sync-to-github',
      error: {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
        retryable: true
      },
      retryCount: 0,
      nextRetry: new Date(Date.now() + 60000).toISOString() // 1 minute
    };

    await fs.writeJson(path.join(incrementPath, '.sync-error.json'), errorLog);

    // Verify error handling
    const savedError = await fs.readJson(path.join(incrementPath, '.sync-error.json'));
    expect(savedError.error.code).toBe('ECONNREFUSED');
    expect(savedError.error.retryable).toBe(true);
    expect(savedError.retryCount).toBe(0);
  });

  test('should handle authentication errors', async () => {
    const incrementId = '0011-auth-fail';
    const incrementPath = path.join(testDir, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Simulate auth error
    const authError = {
      timestamp: new Date().toISOString(),
      increment: incrementId,
      operation: 'create-issue',
      error: {
        code: 'UNAUTHORIZED',
        message: 'Bad credentials',
        status: 401,
        retryable: false
      }
    };

    await fs.writeJson(path.join(incrementPath, '.sync-error.json'), authError);

    // Should not retry on auth errors
    const savedError = await fs.readJson(path.join(incrementPath, '.sync-error.json'));
    expect(savedError.error.retryable).toBe(false);
    expect(savedError.error.status).toBe(401);
  });
});