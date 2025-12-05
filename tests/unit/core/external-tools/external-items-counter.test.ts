/**
 * External Items Counter Unit Tests
 *
 * Tests the three-tier architecture for scale:
 * - TIER 1: getCounts() - Fast counts only (30min cache)
 * - TIER 2: getSummary() - Project breakdown (15min cache)
 * - TIER 3: getItems() - Paginated details (no cache)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Mock the provider adapters before importing the counter
vi.mock('../../../../src/core/external-tools/providers/github-items-adapter.js', () => ({
  GitHubItemsAdapter: {
    fromGitRemote: vi.fn().mockResolvedValue({
      isConfigured: vi.fn().mockResolvedValue(true),
      getOpenCount: vi.fn().mockResolvedValue(42),
      getOpenItems: vi.fn().mockResolvedValue({
        items: [
          {
            id: '#1',
            title: 'Test Issue',
            url: 'https://github.com/test/repo/issues/1',
            createdAt: new Date().toISOString(),
            age: 2,
            labels: ['bug'],
            provider: 'github',
            project: 'test/repo',
            state: 'open',
            isStale: false,
          },
        ],
        total: 42,
        page: 1,
        pageSize: 20,
        totalPages: 3,
        hasMore: true,
      }),
    }),
  },
}));

vi.mock('../../../../src/core/external-tools/providers/jira-items-adapter.js', () => ({
  JiraItemsAdapter: {
    fromEnv: vi.fn().mockReturnValue(null),
  },
}));

vi.mock('../../../../src/core/external-tools/providers/ado-items-adapter.js', () => ({
  AdoItemsAdapter: {
    fromEnv: vi.fn().mockReturnValue(null),
  },
}));

vi.mock('../../../../src/core/cache/cache-manager.js', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { ExternalItemsCounter } from '../../../../src/core/external-tools/external-items-counter.js';

describe('ExternalItemsCounter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-ext-test-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getCounts (TIER 1)', () => {
    it('should return counts from all providers', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const counts = await counter.getCounts();

      expect(counts).toMatchObject({
        github: { configured: true, total: 42 },
        jira: { configured: false, total: 0 },
        ado: { configured: false, total: 0 },
        grandTotal: 42,
      });
    });

    it('should include lastUpdated ISO timestamp', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const before = Date.now();
      const counts = await counter.getCounts();
      const after = Date.now();

      const timestamp = new Date(counts.lastUpdated).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should calculate grandTotal correctly', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const counts = await counter.getCounts();

      expect(counts.grandTotal).toBe(42);
      expect(counts.grandTotal).toBe(
        counts.github.total + counts.jira.total + counts.ado.total
      );
    });
  });

  describe('getSummary (TIER 2)', () => {
    it('should return summary with project breakdown', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const summary = await counter.getSummary();

      expect(summary).toMatchObject({
        github: { configured: true, total: 42 },
        jira: { configured: false, total: 0 },
        ado: { configured: false, total: 0 },
        grandTotal: 42,
      });
      expect(summary.byProject).toBeDefined();
    });
  });

  describe('getItems (TIER 3)', () => {
    it('should return paginated items for github', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const result = await counter.getItems({ provider: 'github' });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(42);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should return empty result for unconfigured provider', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const result = await counter.getItems({ provider: 'jira' });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should default to github provider when no filter', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const result = await counter.getItems();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].provider).toBe('github');
    });
  });

  describe('refresh', () => {
    it('should clear cache and refetch counts', async () => {
      const counter = new ExternalItemsCounter({ projectRoot: tempDir });
      const counts = await counter.refresh();

      expect(counts.github.total).toBe(42);
      expect(counts.grandTotal).toBe(42);
    });
  });
});
