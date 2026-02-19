/**
 * Unit Test: Marketplace Dashboard Routes
 *
 * Tests the HTTP API routes for marketplace scanner and submission queue.
 * Uses a real DashboardServer instance with a temp project directory.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';

// Mock job-manager and job-launcher before importing the server
const mockGetActiveJobs = vi.fn().mockReturnValue([]);
const mockGetJobs = vi.fn().mockReturnValue([]);
const mockCreateJob = vi.fn().mockReturnValue({
  id: 'job-123',
  type: 'marketplace-scan',
  status: 'pending',
  progress: { current: 0, total: 100, percentage: 0, itemsCompleted: [], itemsFailed: [] },
  startedAt: new Date(),
  updatedAt: new Date(),
  config: {},
});

vi.mock('../../../src/core/background/job-manager.js', () => ({
  getJobManager: () => ({
    getActiveJobs: mockGetActiveJobs,
    getJobs: mockGetJobs,
    createJob: mockCreateJob,
  }),
  BackgroundJobManager: vi.fn(),
}));

// Mock job-launcher for scanner start/stop
vi.mock('../../../src/core/background/job-launcher.js', () => ({
  launchMarketplaceScanJob: vi.fn().mockResolvedValue({
    job: {
      id: 'job-123',
      type: 'marketplace-scan',
      status: 'pending',
    },
    isBackground: false,
  }),
  killJob: vi.fn().mockReturnValue(true),
}));

// Mock sync-metadata to avoid side effects
vi.mock('../../../src/sync/sync-metadata.js', () => ({
  updateSyncMetadata: vi.fn(),
}));

import { DashboardServer } from '../../../src/dashboard/server/dashboard-server.js';

describe('Marketplace Routes', () => {
  let tempDir: string;
  let stateDir: string;
  let queuePath: string;
  let server: { url: string; port: number; stop: () => Promise<void> };
  let dashServer: DashboardServer;

  function writeQueueData(submissions: any[]): void {
    fs.writeFileSync(queuePath, JSON.stringify({
      submissions,
      lastUpdated: new Date().toISOString(),
      version: 1,
    }, null, 2));
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

  async function fetchJson(path: string, options: { method?: string; body?: any } = {}): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, server.url);
      const req = http.request(url, {
        method: options.method || 'GET',
        headers: options.body ? { 'Content-Type': 'application/json' } : {},
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode!, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode!, body: raw });
          }
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-routes-test-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    // Create config.json so project is recognized
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ project: { name: 'test-project' } }),
    );
    queuePath = path.join(stateDir, 'skill-submissions.json');

    dashServer = new DashboardServer({
      port: 0, // Will pick a random available port
      projectRoots: [tempDir],
      openBrowser: false,
    });

    // Use port 0 and capture actual port. The server may not support port 0 directly,
    // so pick a high random port.
    const randomPort = 30000 + Math.floor(Math.random() * 30000);
    (dashServer as any).options.port = randomPort;
    server = await dashServer.start();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    mockGetActiveJobs.mockReturnValue([]);
    mockGetJobs.mockReturnValue([]);
    // Reset queue file
    if (fs.existsSync(queuePath)) {
      fs.unlinkSync(queuePath);
    }
    // Also remove backup
    const bakPath = queuePath + '.bak';
    if (fs.existsSync(bakPath)) {
      fs.unlinkSync(bakPath);
    }
  });

  describe('GET /api/marketplace/scanner/status', () => {
    it('should return scanner status with isRunning false', async () => {
      const { status, body } = await fetchJson('/api/marketplace/scanner/status');

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.isRunning).toBe(false);
    });

    it('should return isRunning true when scanner job is active', async () => {
      mockGetActiveJobs.mockReturnValue([
        { type: 'marketplace-scan', status: 'running', id: 'j1', progress: { current: 5 } },
      ]);

      const { status, body } = await fetchJson('/api/marketplace/scanner/status');

      expect(status).toBe(200);
      expect(body.data.isRunning).toBe(true);
    });
  });

  describe('GET /api/marketplace/queue', () => {
    it('should return empty queue when no submissions', async () => {
      const { status, body } = await fetchJson('/api/marketplace/queue');

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.items).toHaveLength(0);
      expect(body.data.total).toBe(0);
    });

    it('should return paginated submissions', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3' }),
      ]);

      // Need to re-instantiate aggregator -- the server caches it.
      // Since the server uses a single aggregator instance per project,
      // the SubmissionQueue loads data at construction time. For route tests
      // we need the server to see new data. The aggregator creates a new
      // SubmissionQueue each time a method is called, so data should be fresh
      // if we re-create the aggregator. But since the server caches it,
      // we need to re-add the project.
      // Actually, looking at the SubmissionQueue implementation, it loads
      // data in the constructor. So we need a fresh MarketplaceAggregator.
      // Let's remove and re-add the project to force refresh.
      const projectId = tempDir.replace(/^\//, '').replace(/\//g, '-');
      dashServer.removeProject(projectId);
      dashServer.addProject(tempDir);

      const { status, body } = await fetchJson('/api/marketplace/queue');

      expect(status).toBe(200);
      expect(body.data.items).toHaveLength(3);
      expect(body.data.total).toBe(3);
    });

    it('should filter by status query param', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2', status: 'verified' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3', status: 'verified' }),
      ]);

      const projectId = tempDir.replace(/^\//, '').replace(/\//g, '-');
      dashServer.removeProject(projectId);
      dashServer.addProject(tempDir);

      const { status, body } = await fetchJson('/api/marketplace/queue?status=verified');

      expect(status).toBe(200);
      expect(body.data.items).toHaveLength(2);
      expect(body.data.items.every((i: any) => i.status === 'verified')).toBe(true);
    });
  });

  describe('GET /api/marketplace/queue/:id', () => {
    it('should return a single submission by ID', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001' }),
      ]);

      const projectId = tempDir.replace(/^\//, '').replace(/\//g, '-');
      dashServer.removeProject(projectId);
      dashServer.addProject(tempDir);

      const { status, body } = await fetchJson('/api/marketplace/queue/sub-001');

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.id).toBe('sub-001');
    });

    it('should return 404 for non-existent submission', async () => {
      const { status, body } = await fetchJson('/api/marketplace/queue/non-existent');

      expect(status).toBe(404);
      expect(body.ok).toBe(false);
    });
  });

  describe('POST /api/marketplace/queue/:id/approve', () => {
    it('should approve a submission', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'tier1_passed' }),
      ]);

      const projectId = tempDir.replace(/^\//, '').replace(/\//g, '-');
      dashServer.removeProject(projectId);
      dashServer.addProject(tempDir);

      const { status, body } = await fetchJson('/api/marketplace/queue/sub-001/approve', {
        method: 'POST',
      });

      expect(status).toBe(200);
      expect(body.ok).toBe(true);

      // Verify the data was persisted
      const raw = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const sub = raw.submissions.find((s: any) => s.id === 'sub-001');
      expect(sub.status).toBe('verified');
    });
  });

  describe('POST /api/marketplace/queue/:id/reject', () => {
    it('should reject a submission with reason', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
      ]);

      const projectId = tempDir.replace(/^\//, '').replace(/\//g, '-');
      dashServer.removeProject(projectId);
      dashServer.addProject(tempDir);

      const { status, body } = await fetchJson('/api/marketplace/queue/sub-001/reject', {
        method: 'POST',
        body: { reason: 'Malicious code detected' },
      });

      expect(status).toBe(200);
      expect(body.ok).toBe(true);

      // Verify the data was persisted
      const raw = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const sub = raw.submissions.find((s: any) => s.id === 'sub-001');
      expect(sub.status).toBe('rejected');
      expect(sub.rejectedReason).toBe('Malicious code detected');
    });
  });

  describe('GET /api/marketplace/verified', () => {
    it('should return only verified skills', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2', status: 'verified' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3', status: 'rejected' }),
      ]);

      const projectId = tempDir.replace(/^\//, '').replace(/\//g, '-');
      dashServer.removeProject(projectId);
      dashServer.addProject(tempDir);

      const { status, body } = await fetchJson('/api/marketplace/verified');

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe('sub-002');
    });
  });

  describe('GET /api/marketplace/insights', () => {
    it('should return pipeline insights', async () => {
      writeQueueData([
        makeSubmission({ id: 'sub-001', status: 'discovered' }),
        makeSubmission({ id: 'sub-002', repoFullName: 'user/repo2', status: 'verified' }),
        makeSubmission({ id: 'sub-003', repoFullName: 'user/repo3', status: 'rejected' }),
        makeSubmission({ id: 'sub-004', repoFullName: 'user/repo4', status: 'tier1_passed' }),
      ]);

      const projectId = tempDir.replace(/^\//, '').replace(/\//g, '-');
      dashServer.removeProject(projectId);
      dashServer.addProject(tempDir);

      const { status, body } = await fetchJson('/api/marketplace/insights');

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.totalDiscovered).toBe(4);
      expect(body.data.totalVerified).toBe(1);
      expect(body.data.totalRejected).toBe(1);
      expect(body.data.statusDistribution).toBeDefined();
    });
  });

  describe('POST /api/marketplace/scanner/start', () => {
    it('should call launchMarketplaceScanJob', async () => {
      const { status, body } = await fetchJson('/api/marketplace/scanner/start', {
        method: 'POST',
      });

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.job).toBeDefined();
    });
  });

  describe('POST /api/marketplace/scanner/stop', () => {
    it('should stop a running scanner job', async () => {
      mockGetActiveJobs.mockReturnValue([
        { type: 'marketplace-scan', status: 'running', id: 'job-running' },
      ]);

      const { status, body } = await fetchJson('/api/marketplace/scanner/stop', {
        method: 'POST',
      });

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it('should succeed even if no scanner is running', async () => {
      mockGetActiveJobs.mockReturnValue([]);

      const { status, body } = await fetchJson('/api/marketplace/scanner/stop', {
        method: 'POST',
      });

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
    });
  });
});
