/**
 * Unit Test: MarketplaceAggregator
 *
 * Tests the dashboard aggregator layer that wraps SubmissionQueue
 * and BackgroundJobManager for marketplace scanner data.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock job-manager before importing the aggregator
const mockGetActiveJobs = vi.fn().mockReturnValue([]);
const mockGetJobs = vi.fn().mockReturnValue([]);

vi.mock('../../../src/core/background/job-manager.js', () => ({
  getJobManager: () => ({
    getActiveJobs: mockGetActiveJobs,
    getJobs: mockGetJobs,
  }),
}));

import { MarketplaceAggregator } from '../../../src/dashboard/server/data/marketplace-aggregator.js';

describe('MarketplaceAggregator', () => {
  let tempDir: string;
  let stateDir: string;
  let queuePath: string;
  let aggregator: MarketplaceAggregator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-agg-test-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    queuePath = path.join(stateDir, 'skill-submissions.json');
    aggregator = new MarketplaceAggregator(tempDir);
    mockGetActiveJobs.mockReturnValue([]);
    mockGetJobs.mockReturnValue([]);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  function writeQueueData(submissions: any[]): void {
    fs.writeFileSync(queuePath, JSON.stringify({
      submissions,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }, null, 2));
    // Re-instantiate so it reloads the data
    aggregator = new MarketplaceAggregator(tempDir);
  }

  function makeSubmission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'sub-001',
      repoFullName: 'user/repo',
      repoUrl: 'https://github.com/user/repo',
      skillPath: 'SKILL.md',
      author: 'user',
      stars: 10,
      lastUpdated: '2026-02-15T10:00:00Z',
      status: 'discovered',
      discoveredAt: '2026-02-15T10:00:00Z',
      updatedAt: '2026-02-15T10:00:00Z',
      ...overrides,
    };
  }

  describe('getScannerStatus', () => {
    it('should report not running when no active scanner jobs', async () => {
      const status = await aggregator.getScannerStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastScanTime).toBeNull();
      expect(status.reposScanned).toBe(0);
    });

    it('should report running when a marketplace-scan job is active', async () => {
      mockGetActiveJobs.mockReturnValue([
        { type: 'marketplace-scan', status: 'running', id: 'job-1', progress: { current: 5, total: 10 } },
      ]);

      const status = await aggregator.getScannerStatus();

      expect(status.isRunning).toBe(true);
    });

    it('should report last scan time from completed jobs', async () => {
      const completedAt = '2026-02-15T12:00:00Z';
      mockGetJobs.mockReturnValue([
        {
          type: 'marketplace-scan',
          status: 'completed',
          id: 'job-done',
          completedAt: new Date(completedAt),
          updatedAt: new Date(completedAt),
          progress: { current: 50, total: 50 },
        },
      ]);

      const status = await aggregator.getScannerStatus();

      expect(status.lastScanTime).not.toBeNull();
      expect(status.reposScanned).toBe(50);
    });

    it('should report discovered count from queue data', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3' }),
      ]);

      const status = await aggregator.getScannerStatus();

      expect(status.reposDiscovered).toBe(3);
    });
  });

  describe('getQueue', () => {
    it('should return empty queue when no submissions exist', async () => {
      const result = await aggregator.getQueue();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return all submissions when no filter applied', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2' }),
      ]);

      const result = await aggregator.getQueue();

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2', status: 'verified' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3', status: 'verified' }),
      ]);

      const result = await aggregator.getQueue({ status: 'verified' });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(i => i.status === 'verified')).toBe(true);
    });

    it('should respect pagination params', async () => {
      writeQueueData(
        Array.from({ length: 5 }, (_, i) => makeSubmission({
          id: `sub-${i}`,
          repoFullName: `user/repo${i}`,
        })),
      );

      const result = await aggregator.getQueue({ limit: 2, offset: 1 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(2);
    });
  });

  describe('getVerifiedSkills', () => {
    it('should return only verified submissions', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2', status: 'verified' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3', status: 'rejected' }),
      ]);

      const verified = await aggregator.getVerifiedSkills();

      expect(verified).toHaveLength(1);
      expect(verified[0].id).toBe('sub-002');
      expect(verified[0].status).toBe('verified');
    });

    it('should return empty array when no verified skills', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
      ]);

      const verified = await aggregator.getVerifiedSkills();

      expect(verified).toHaveLength(0);
    });
  });

  describe('getInsights', () => {
    it('should return zero counts for empty queue', async () => {
      const insights = await aggregator.getInsights();

      expect(insights.totalDiscovered).toBe(0);
      expect(insights.totalVerified).toBe(0);
      expect(insights.totalRejected).toBe(0);
      expect(insights.totalPending).toBe(0);
    });

    it('should aggregate status distribution correctly', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2', status: 'verified' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3', status: 'verified' }),
        makeSubmission({ id: 'sub-004', repoFullName: 'user/repo4', status: 'rejected' }),
        makeSubmission({ id: 'sub-005', repoFullName: 'user/repo5', status: 'tier1_passed' }),
      ]);

      const insights = await aggregator.getInsights();

      expect(insights.totalDiscovered).toBe(5);
      expect(insights.totalVerified).toBe(2);
      expect(insights.totalRejected).toBe(1);
      expect(insights.totalPending).toBe(2); // discovered + tier1_passed
      expect(insights.statusDistribution.discovered).toBe(1);
      expect(insights.statusDistribution.verified).toBe(2);
    });

    it('should include discovery timeline', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', discoveredAt: '2026-02-15T10:00:00Z' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2', discoveredAt: '2026-02-15T11:00:00Z' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3', discoveredAt: '2026-02-16T09:00:00Z' }),
      ]);

      const insights = await aggregator.getInsights();

      expect(insights.discoveryTimeline.length).toBeGreaterThan(0);
      const feb15 = insights.discoveryTimeline.find(d => d.date === '2026-02-15');
      expect(feb15).toBeDefined();
      expect(feb15!.count).toBe(2);
    });
  });

  describe('getSubmission', () => {
    it('should return a submission by ID', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2' }),
      ]);

      const sub = await aggregator.getSubmission('sub-001');

      expect(sub).not.toBeNull();
      expect(sub!.id).toBe('sub-001');
    });

    it('should return null for non-existent ID', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001' }),
      ]);

      const sub = await aggregator.getSubmission('non-existent');

      expect(sub).toBeNull();
    });
  });

  describe('approveSubmission', () => {
    it('should change submission status to verified', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'tier1_passed' }),
      ]);

      await aggregator.approveSubmission('sub-001');

      // Re-instantiate to verify persistence
      const fresh = new MarketplaceAggregator(tempDir);
      const sub = await fresh.getSubmission('sub-001');
      expect(sub!.status).toBe('verified');
    });
  });

  describe('rejectSubmission', () => {
    it('should change submission status to rejected with reason', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
      ]);

      await aggregator.rejectSubmission('sub-001', 'Security concern');

      const fresh = new MarketplaceAggregator(tempDir);
      const sub = await fresh.getSubmission('sub-001');
      expect(sub!.status).toBe('rejected');
      expect(sub!.rejectedReason).toBe('Security concern');
    });
  });
});
