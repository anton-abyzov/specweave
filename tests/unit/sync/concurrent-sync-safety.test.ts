/**
 * Concurrent Sync Safety Tests
 *
 * Tests for race condition protection in multi-agent scenarios:
 * - GitHub issue creation locking
 * - GitHub comment posting locking
 * - JIRA/ADO comment posting locking
 * - Frontmatter update locking
 *
 * These tests verify that concurrent operations don't cause:
 * - Duplicate issue creation
 * - Duplicate comment posting
 * - Corrupted frontmatter
 *
 * @see src/sync/sync-coordinator.ts
 * @see src/sync/format-preservation-sync.ts
 * @see src/sync/frontmatter-updater.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LockManager } from '../../../src/utils/lock-manager.js';

describe('Concurrent Sync Safety', () => {
  let testDir: string;
  let locksDir: string;
  let originalForceLocks: string | undefined;

  beforeEach(() => {
    // Force locks to work in CI/VSCode environments
    originalForceLocks = process.env.SPECWEAVE_FORCE_LOCKS;
    process.env.SPECWEAVE_FORCE_LOCKS = '1';

    // Create temp test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-sync-test-'));
    locksDir = path.join(testDir, '.specweave/state/.locks');
    fs.mkdirSync(locksDir, { recursive: true });
  });

  afterEach(() => {
    // Restore original environment
    if (originalForceLocks === undefined) {
      delete process.env.SPECWEAVE_FORCE_LOCKS;
    } else {
      process.env.SPECWEAVE_FORCE_LOCKS = originalForceLocks;
    }

    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('LockManager - Concurrent Lock Acquisition', () => {
    it('should allow only one agent to acquire lock at a time', async () => {
      const lockDir = path.join(locksDir, 'test-lock');
      const lock1 = new LockManager(lockDir, 60);
      const lock2 = new LockManager(lockDir, 60);

      // First lock should succeed
      const acquired1 = await lock1.acquire();
      expect(acquired1).toBe(true);

      // Second lock should fail (wait timeout)
      const startTime = Date.now();
      const acquired2 = await lock2.acquire();
      const elapsed = Date.now() - startTime;

      expect(acquired2).toBe(false);
      // Should have tried for ~10 seconds (LOCK_TIMEOUT_MS)
      expect(elapsed).toBeGreaterThan(9000);

      // Cleanup
      await lock1.release();
    }, 15000); // 15s timeout for this test

    it('should release lock correctly and allow next agent', async () => {
      const lockDir = path.join(locksDir, 'test-release-lock');
      const lock1 = new LockManager(lockDir, 60);
      const lock2 = new LockManager(lockDir, 60);

      // First lock acquires
      const acquired1 = await lock1.acquire();
      expect(acquired1).toBe(true);

      // Release first lock
      await lock1.release();

      // Second lock should now succeed quickly
      const startTime = Date.now();
      const acquired2 = await lock2.acquire();
      const elapsed = Date.now() - startTime;

      expect(acquired2).toBe(true);
      expect(elapsed).toBeLessThan(1000); // Should be nearly instant

      // Cleanup
      await lock2.release();
    });

    it('should detect and remove stale locks', async () => {
      const lockDir = path.join(locksDir, 'stale-lock');

      // Create a stale lock manually (simulate crashed process)
      fs.mkdirSync(lockDir, { recursive: true });
      fs.writeFileSync(path.join(lockDir, 'pid'), '999999'); // Non-existent PID
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'test-session');

      // Modify mtime to make it stale (older than threshold)
      const oldTime = new Date(Date.now() - 120000); // 2 minutes ago
      fs.utimesSync(lockDir, oldTime, oldTime);

      // New lock should detect stale and acquire
      const lock = new LockManager(lockDir, 60); // 60s stale threshold
      const acquired = await lock.acquire();

      expect(acquired).toBe(true);

      // Cleanup
      await lock.release();
    });

    it('should allow parallel locks on different resources', async () => {
      const lock1Dir = path.join(locksDir, 'resource-1');
      const lock2Dir = path.join(locksDir, 'resource-2');

      const lock1 = new LockManager(lock1Dir, 60);
      const lock2 = new LockManager(lock2Dir, 60);

      // Both should acquire simultaneously
      const [acquired1, acquired2] = await Promise.all([
        lock1.acquire(),
        lock2.acquire()
      ]);

      expect(acquired1).toBe(true);
      expect(acquired2).toBe(true);

      // Cleanup
      await Promise.all([lock1.release(), lock2.release()]);
    });
  });

  describe('Simulated Concurrent Issue Creation', () => {
    it('should serialize issue creation for same user story', async () => {
      const featureId = 'FS-001';
      const userStoryId = 'US-001';
      const lockDir = path.join(
        locksDir,
        `github-issue-${featureId}-${userStoryId}`.toLowerCase()
      );

      // Simulate two agents trying to create issue for same US
      const creationOrder: number[] = [];
      let createdCount = 0;

      const simulateIssueCreation = async (agentId: number): Promise<boolean> => {
        const lock = new LockManager(lockDir, 60);

        const acquired = await lock.acquire();
        if (!acquired) {
          return false; // Another agent is creating
        }

        try {
          // Simulate idempotency check
          if (createdCount > 0) {
            return false; // Issue already exists
          }

          // Simulate issue creation
          await new Promise(resolve => setTimeout(resolve, 100));
          createdCount++;
          creationOrder.push(agentId);
          return true;
        } finally {
          await lock.release();
        }
      };

      // Run 3 agents concurrently
      const results = await Promise.all([
        simulateIssueCreation(1),
        simulateIssueCreation(2),
        simulateIssueCreation(3)
      ]);

      // Only one should succeed (created issue)
      const successCount = results.filter(r => r).length;
      expect(successCount).toBe(1);

      // Exactly one issue created
      expect(createdCount).toBe(1);

      // Creation order should have exactly one entry
      expect(creationOrder.length).toBe(1);
    });

    it('should allow parallel creation for different user stories', async () => {
      const featureId = 'FS-001';
      const creationResults: string[] = [];

      const simulateIssueCreation = async (userStoryId: string): Promise<string> => {
        const lockDir = path.join(
          locksDir,
          `github-issue-${featureId}-${userStoryId}`.toLowerCase()
        );
        const lock = new LockManager(lockDir, 60);

        const acquired = await lock.acquire();
        if (!acquired) {
          return `${userStoryId}-skipped`;
        }

        try {
          await new Promise(resolve => setTimeout(resolve, 50));
          creationResults.push(userStoryId);
          return `${userStoryId}-created`;
        } finally {
          await lock.release();
        }
      };

      // Run parallel creation for 3 different user stories
      const startTime = Date.now();
      const results = await Promise.all([
        simulateIssueCreation('US-001'),
        simulateIssueCreation('US-002'),
        simulateIssueCreation('US-003')
      ]);
      const elapsed = Date.now() - startTime;

      // All should succeed (different resources)
      expect(results).toEqual([
        'US-001-created',
        'US-002-created',
        'US-003-created'
      ]);

      // Should complete in parallel time (~50ms), not serial (~150ms)
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Simulated Concurrent Comment Posting', () => {
    it('should serialize comment posting for same issue', async () => {
      const issueNumber = 123;
      const lockDir = path.join(locksDir, `github-comment-${issueNumber}`);
      const postedComments: string[] = [];
      let lastComment = '';

      const simulateCommentPost = async (agentId: number, comment: string): Promise<boolean> => {
        const lock = new LockManager(lockDir, 30);

        const acquired = await lock.acquire();
        if (!acquired) {
          return false;
        }

        try {
          // Simulate idempotency check
          if (lastComment === comment) {
            return false; // Duplicate
          }

          // Simulate posting
          await new Promise(resolve => setTimeout(resolve, 50));
          lastComment = comment;
          postedComments.push(`Agent${agentId}: ${comment}`);
          return true;
        } finally {
          await lock.release();
        }
      };

      // 3 agents try to post same comment
      const sameComment = 'Task T-001 completed';
      const results = await Promise.all([
        simulateCommentPost(1, sameComment),
        simulateCommentPost(2, sameComment),
        simulateCommentPost(3, sameComment)
      ]);

      // Only one should succeed (first to acquire lock)
      const successCount = results.filter(r => r).length;
      expect(successCount).toBe(1);

      // Only one comment posted
      expect(postedComments.length).toBe(1);
    });

    it('should allow different comments sequentially', async () => {
      const issueNumber = 456;
      const lockDir = path.join(locksDir, `github-comment-${issueNumber}`);
      const postedComments: string[] = [];
      let lastComment = '';

      const simulateCommentPost = async (agentId: number, comment: string): Promise<boolean> => {
        const lock = new LockManager(lockDir, 30);

        const acquired = await lock.acquire();
        if (!acquired) {
          return false;
        }

        try {
          // Idempotency check
          if (lastComment === comment) {
            return false;
          }

          // Post
          await new Promise(resolve => setTimeout(resolve, 20));
          lastComment = comment;
          postedComments.push(comment);
          return true;
        } finally {
          await lock.release();
        }
      };

      // Post different comments sequentially
      const result1 = await simulateCommentPost(1, 'Task T-001 completed');
      const result2 = await simulateCommentPost(2, 'Task T-002 completed');
      const result3 = await simulateCommentPost(3, 'Task T-003 completed');

      // All should succeed (different content)
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);

      // All comments posted
      expect(postedComments).toEqual([
        'Task T-001 completed',
        'Task T-002 completed',
        'Task T-003 completed'
      ]);
    });
  });

  describe('Simulated Concurrent Frontmatter Updates', () => {
    it('should serialize frontmatter updates for same user story', async () => {
      const featureId = 'FS-001';
      const userStoryId = 'US-001';
      const lockDir = path.join(
        locksDir,
        `frontmatter-${featureId}-${userStoryId}`.toLowerCase()
      );

      // Create test user story file
      const usDir = path.join(testDir, '.specweave/docs/internal/specs/default', featureId);
      fs.mkdirSync(usDir, { recursive: true });
      const usFile = path.join(usDir, 'us-001-test-story.md');
      fs.writeFileSync(usFile, `---
id: US-001
title: Test Story
---

# User Story Content
`);

      const updateResults: number[] = [];

      const simulateFrontmatterUpdate = async (agentId: number, issueNumber: number): Promise<boolean> => {
        const lock = new LockManager(lockDir, 30);

        const acquired = await lock.acquire();
        if (!acquired) {
          return false;
        }

        try {
          // Read current content
          const content = fs.readFileSync(usFile, 'utf-8');

          // Check if already has GitHub info
          if (content.includes('external_tools:')) {
            return false; // Already updated
          }

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 50));

          // Update frontmatter
          const newContent = content.replace(
            '---\nid: US-001',
            `---\nid: US-001\nexternal_tools:\n  github:\n    number: ${issueNumber}`
          );
          fs.writeFileSync(usFile, newContent, 'utf-8');

          updateResults.push(agentId);
          return true;
        } finally {
          await lock.release();
        }
      };

      // 3 agents try to update same frontmatter
      const results = await Promise.all([
        simulateFrontmatterUpdate(1, 100),
        simulateFrontmatterUpdate(2, 101),
        simulateFrontmatterUpdate(3, 102)
      ]);

      // Only one should succeed
      const successCount = results.filter(r => r).length;
      expect(successCount).toBe(1);

      // File should have exactly one GitHub section
      const finalContent = fs.readFileSync(usFile, 'utf-8');
      const githubMatches = finalContent.match(/github:/g);
      expect(githubMatches?.length).toBe(1);
    });
  });

  describe('Lock Cleanup', () => {
    it('should cleanup stale locks on acquisition attempt', async () => {
      const lockDir = path.join(locksDir, 'cleanup-test-lock');

      // Create stale lock
      fs.mkdirSync(lockDir, { recursive: true });
      fs.writeFileSync(path.join(lockDir, 'pid'), '1'); // PID 1 won't match test process
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'old-session');

      // Set modification time to make it stale
      const staleTime = new Date(Date.now() - 120000); // 2 minutes ago
      fs.utimesSync(lockDir, staleTime, staleTime);

      // New lock should cleanup and acquire
      const lock = new LockManager(lockDir, 60);
      const acquired = await lock.acquire();

      expect(acquired).toBe(true);

      // Lock dir should now have current PID
      const pidContent = fs.readFileSync(path.join(lockDir, 'pid'), 'utf-8');
      expect(parseInt(pidContent, 10)).toBe(process.pid);

      await lock.release();
    });

    it('should preserve fresh locks held by other processes', async () => {
      const lockDir = path.join(locksDir, 'fresh-lock');

      // Create fresh lock (not stale)
      fs.mkdirSync(lockDir, { recursive: true });
      fs.writeFileSync(path.join(lockDir, 'pid'), '12345');
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'other-session');
      // Don't modify mtime - it's current

      // New lock should NOT be able to acquire (lock is fresh)
      const lock = new LockManager(lockDir, 60);
      const startTime = Date.now();
      const acquired = await lock.acquire();
      const elapsed = Date.now() - startTime;

      expect(acquired).toBe(false);
      expect(elapsed).toBeGreaterThan(9000); // Should have timed out

      // Original lock should still exist
      expect(fs.existsSync(path.join(lockDir, 'pid'))).toBe(true);
      const pidContent = fs.readFileSync(path.join(lockDir, 'pid'), 'utf-8');
      expect(pidContent).toBe('12345'); // Still original PID
    }, 15000);
  });
});
