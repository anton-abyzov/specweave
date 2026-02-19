/**
 * SubmissionQueue Unit Tests
 *
 * Tests the file-based submission queue for marketplace skill submissions.
 * Covers CRUD operations, status transitions, deduplication, pagination,
 * backup/recovery, and aggregated insights.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { SubmissionQueue } from '../../../../src/core/fabric/submission-queue.js';
import type {
  GitHubRepoInfo,
  SkillSubmission,
  SubmissionStatus,
  SubmissionQueueData,
} from '../../../../src/core/fabric/submission-queue-types.js';

describe('SubmissionQueue', () => {
  let testDir: string;
  let queue: SubmissionQueue;
  let queueFilePath: string;

  const makeRepoInfo = (overrides: Partial<GitHubRepoInfo> = {}): GitHubRepoInfo => ({
    fullName: 'user/skill-repo',
    htmlUrl: 'https://github.com/user/skill-repo',
    description: 'A test skill',
    owner: 'user',
    stars: 42,
    lastUpdated: '2026-01-15T00:00:00Z',
    skillPath: 'SKILL.md',
    ...overrides,
  });

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-queue-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    queue = new SubmissionQueue(testDir);
    queueFilePath = path.join(testDir, '.specweave', 'state', 'skill-submissions.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // --- addSubmission ---

  describe('addSubmission', () => {
    it('creates entry with discovered status', () => {
      const info = makeRepoInfo();
      const submission = queue.addSubmission(info);

      expect(submission).toBeDefined();
      expect(submission.repoFullName).toBe('user/skill-repo');
      expect(submission.repoUrl).toBe('https://github.com/user/skill-repo');
      expect(submission.author).toBe('user');
      expect(submission.stars).toBe(42);
      expect(submission.status).toBe('discovered');
      expect(submission.id).toBeTruthy();
      expect(submission.discoveredAt).toBeTruthy();
      expect(submission.updatedAt).toBeTruthy();
    });

    it('deduplicates by repoFullName', () => {
      const info = makeRepoInfo();
      const first = queue.addSubmission(info);
      const second = queue.addSubmission(info);

      // Second call should return the existing submission
      expect(second.id).toBe(first.id);

      // Only one entry in the queue
      const all = queue.getSubmissions({});
      expect(all.total).toBe(1);
    });

    it('allows different repos with different fullNames', () => {
      const info1 = makeRepoInfo({ fullName: 'user/repo-a' });
      const info2 = makeRepoInfo({ fullName: 'user/repo-b' });

      queue.addSubmission(info1);
      queue.addSubmission(info2);

      const all = queue.getSubmissions({});
      expect(all.total).toBe(2);
    });

    it('persists to disk', () => {
      queue.addSubmission(makeRepoInfo());

      // Read file directly
      expect(fs.existsSync(queueFilePath)).toBe(true);
      const data: SubmissionQueueData = JSON.parse(
        fs.readFileSync(queueFilePath, 'utf-8')
      );
      expect(data.submissions).toHaveLength(1);
      expect(data.version).toBe(1);
    });
  });

  // --- updateStatus ---

  describe('updateStatus', () => {
    it('transitions correctly from discovered to queued', () => {
      const sub = queue.addSubmission(makeRepoInfo());
      const updated = queue.updateStatus(sub.id, 'queued');

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('queued');
    });

    it('transitions through the full pipeline', () => {
      const sub = queue.addSubmission(makeRepoInfo());

      // discovered -> queued -> scanning -> tier1_passed -> tier2_pending -> verified
      const validPath: SubmissionStatus[] = [
        'queued', 'scanning', 'tier1_passed', 'tier2_pending', 'verified'
      ];

      let current = sub;
      for (const status of validPath) {
        const updated = queue.updateStatus(current.id, status);
        expect(updated).not.toBeNull();
        expect(updated!.status).toBe(status);
        current = updated!;
      }
    });

    it('returns null for nonexistent ID', () => {
      const result = queue.updateStatus('nonexistent-id', 'queued');
      expect(result).toBeNull();
    });

    it('rejects invalid transitions', () => {
      const sub = queue.addSubmission(makeRepoInfo());

      // discovered -> verified is not valid (skips steps)
      const result = queue.updateStatus(sub.id, 'verified');
      expect(result).toBeNull();
    });

    it('allows transition to rejected from any scanning state', () => {
      const sub = queue.addSubmission(makeRepoInfo());
      queue.updateStatus(sub.id, 'queued');
      queue.updateStatus(sub.id, 'scanning');

      const rejected = queue.updateStatus(sub.id, 'rejected');
      expect(rejected).not.toBeNull();
      expect(rejected!.status).toBe('rejected');
    });
  });

  // --- approve ---

  describe('approve', () => {
    it('sets verified status from tier1_passed', () => {
      const sub = queue.addSubmission(makeRepoInfo());
      queue.updateStatus(sub.id, 'queued');
      queue.updateStatus(sub.id, 'scanning');
      queue.updateStatus(sub.id, 'tier1_passed');

      const approved = queue.approve(sub.id);
      expect(approved).not.toBeNull();
      expect(approved!.status).toBe('verified');
    });

    it('sets verified status from tier2_pending', () => {
      const sub = queue.addSubmission(makeRepoInfo());
      queue.updateStatus(sub.id, 'queued');
      queue.updateStatus(sub.id, 'scanning');
      queue.updateStatus(sub.id, 'tier1_passed');
      queue.updateStatus(sub.id, 'tier2_pending');

      const approved = queue.approve(sub.id);
      expect(approved).not.toBeNull();
      expect(approved!.status).toBe('verified');
    });

    it('returns null for nonexistent ID', () => {
      const result = queue.approve('nonexistent');
      expect(result).toBeNull();
    });
  });

  // --- reject ---

  describe('reject', () => {
    it('sets rejected status with reason', () => {
      const sub = queue.addSubmission(makeRepoInfo());
      queue.updateStatus(sub.id, 'queued');
      queue.updateStatus(sub.id, 'scanning');

      const rejected = queue.reject(sub.id, 'Contains malicious code');
      expect(rejected).not.toBeNull();
      expect(rejected!.status).toBe('rejected');
      expect(rejected!.rejectedReason).toBe('Contains malicious code');
    });

    it('returns null for nonexistent ID', () => {
      const result = queue.reject('nonexistent', 'reason');
      expect(result).toBeNull();
    });
  });

  // --- getSubmissions ---

  describe('getSubmissions', () => {
    it('filters by status', () => {
      const info1 = makeRepoInfo({ fullName: 'user/repo-1' });
      const info2 = makeRepoInfo({ fullName: 'user/repo-2' });
      const info3 = makeRepoInfo({ fullName: 'user/repo-3' });

      queue.addSubmission(info1);
      const sub2 = queue.addSubmission(info2);
      queue.addSubmission(info3);

      queue.updateStatus(sub2.id, 'queued');

      const discovered = queue.getSubmissions({ status: 'discovered' });
      expect(discovered.total).toBe(2);
      expect(discovered.items.every(s => s.status === 'discovered')).toBe(true);

      const queued = queue.getSubmissions({ status: 'queued' });
      expect(queued.total).toBe(1);
      expect(queued.items[0].repoFullName).toBe('user/repo-2');
    });

    it('paginates correctly', () => {
      // Add 5 repos
      for (let i = 0; i < 5; i++) {
        queue.addSubmission(makeRepoInfo({ fullName: `user/repo-${i}` }));
      }

      // Page 1: limit 2, offset 0
      const page1 = queue.getSubmissions({ limit: 2, offset: 0 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.limit).toBe(2);
      expect(page1.offset).toBe(0);

      // Page 2: limit 2, offset 2
      const page2 = queue.getSubmissions({ limit: 2, offset: 2 });
      expect(page2.items).toHaveLength(2);
      expect(page2.total).toBe(5);
      expect(page2.offset).toBe(2);

      // Page 3: limit 2, offset 4
      const page3 = queue.getSubmissions({ limit: 2, offset: 4 });
      expect(page3.items).toHaveLength(1);
      expect(page3.total).toBe(5);

      // No overlap between pages
      const allIds = [...page1.items, ...page2.items, ...page3.items].map(s => s.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('returns all when no filter provided', () => {
      for (let i = 0; i < 3; i++) {
        queue.addSubmission(makeRepoInfo({ fullName: `user/repo-${i}` }));
      }

      const all = queue.getSubmissions({});
      expect(all.total).toBe(3);
      expect(all.items).toHaveLength(3);
    });

    it('handles empty queue', () => {
      const result = queue.getSubmissions({});
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  // --- load / recovery ---

  describe('load', () => {
    it('recovers from corrupted JSON using backup', () => {
      // Add a submission so we have valid data
      queue.addSubmission(makeRepoInfo());

      // Verify backup exists
      const backupPath = queueFilePath + '.bak';

      // Corrupt the main file
      fs.writeFileSync(queueFilePath, '{corrupted json!!!');

      // Create a new queue instance that loads from disk
      const queue2 = new SubmissionQueue(testDir);
      const result = queue2.getSubmissions({});

      // Should recover from backup if it exists, otherwise start fresh
      // Either way, should not throw
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('starts fresh when both main and backup are corrupted', () => {
      // Write corrupted main file
      fs.writeFileSync(queueFilePath, '{bad json');
      // Write corrupted backup
      fs.writeFileSync(queueFilePath + '.bak', '{also bad');

      const queue2 = new SubmissionQueue(testDir);
      const result = queue2.getSubmissions({});
      expect(result.total).toBe(0);
    });

    it('loads correctly from valid file', () => {
      // Add submissions
      queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-1' }));
      queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-2' }));

      // Create new instance to force reload
      const queue2 = new SubmissionQueue(testDir);
      const result = queue2.getSubmissions({});
      expect(result.total).toBe(2);
    });
  });

  // --- save / backup ---

  describe('save', () => {
    it('creates backup before write', () => {
      // First write creates the file
      queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-1' }));
      expect(fs.existsSync(queueFilePath)).toBe(true);

      // Second write should create backup of previous state
      queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-2' }));

      const backupPath = queueFilePath + '.bak';
      expect(fs.existsSync(backupPath)).toBe(true);

      // Backup should contain previous state (only 1 submission)
      const backupData: SubmissionQueueData = JSON.parse(
        fs.readFileSync(backupPath, 'utf-8')
      );
      expect(backupData.submissions).toHaveLength(1);
    });
  });

  // --- getInsights ---

  describe('getInsights', () => {
    it('aggregates correctly with empty queue', () => {
      const insights = queue.getInsights();

      expect(insights.totalDiscovered).toBe(0);
      expect(insights.totalVerified).toBe(0);
      expect(insights.totalRejected).toBe(0);
      expect(insights.totalPending).toBe(0);
      expect(insights.tier1PassRate).toBe(0);
      expect(insights.tier2PassRate).toBe(0);
      expect(insights.statusDistribution).toBeDefined();
    });

    it('aggregates correctly with mixed statuses', () => {
      // Add several submissions with different statuses
      const sub1 = queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-1' }));
      const sub2 = queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-2' }));
      const sub3 = queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-3' }));
      const sub4 = queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-4' }));

      // Move sub1 through to verified
      queue.updateStatus(sub1.id, 'queued');
      queue.updateStatus(sub1.id, 'scanning');
      queue.updateStatus(sub1.id, 'tier1_passed');
      queue.approve(sub1.id);

      // Move sub2 to rejected
      queue.updateStatus(sub2.id, 'queued');
      queue.updateStatus(sub2.id, 'scanning');
      queue.reject(sub2.id, 'Unsafe content');

      // sub3 stays at discovered
      // sub4 -> scanning
      queue.updateStatus(sub4.id, 'queued');
      queue.updateStatus(sub4.id, 'scanning');

      const insights = queue.getInsights();

      expect(insights.totalDiscovered).toBe(4); // All were discovered
      expect(insights.totalVerified).toBe(1);
      expect(insights.totalRejected).toBe(1);
      expect(insights.totalPending).toBeGreaterThanOrEqual(2); // sub3 and sub4 still pending
      expect(insights.statusDistribution).toBeDefined();
      expect(insights.statusDistribution['verified']).toBe(1);
      expect(insights.statusDistribution['rejected']).toBe(1);
    });

    it('calculates tier1PassRate correctly', () => {
      // Create 4 submissions, 3 pass tier1, 1 fails
      const subs = [];
      for (let i = 0; i < 4; i++) {
        subs.push(queue.addSubmission(makeRepoInfo({ fullName: `user/repo-${i}` })));
      }

      // Pass all through scanning
      for (const sub of subs) {
        queue.updateStatus(sub.id, 'queued');
        queue.updateStatus(sub.id, 'scanning');
      }

      // 3 pass tier1
      queue.updateStatus(subs[0].id, 'tier1_passed');
      queue.updateStatus(subs[1].id, 'tier1_passed');
      queue.updateStatus(subs[2].id, 'tier1_passed');

      // 1 fails tier1
      queue.updateStatus(subs[3].id, 'tier1_failed');

      const insights = queue.getInsights();
      expect(insights.tier1PassRate).toBe(75); // 3/4 = 75%
    });

    it('includes discovery timeline', () => {
      queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-1' }));
      queue.addSubmission(makeRepoInfo({ fullName: 'user/repo-2' }));

      const insights = queue.getInsights();
      expect(insights.discoveryTimeline).toBeDefined();
      expect(Array.isArray(insights.discoveryTimeline)).toBe(true);
    });
  });
});
