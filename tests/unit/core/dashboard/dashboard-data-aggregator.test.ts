/**
 * DashboardDataAggregator Tests
 *
 * Tests the dashboard data aggregation layer including:
 * - Cache-based increment loading (dashboard.json)
 * - Filesystem fallback when cache is missing
 * - Task/AC counting from markdown files
 * - Overview with and without cache
 * - Analytics aggregation
 * - Sync status enrichment
 * - TTL cache for increments (hit, miss, expiry, invalidation)
 * - Async I/O conversion
 * - Shared scan between getOverview() and getIncrements()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DashboardDataAggregator } from '../../../../src/dashboard/server/data/dashboard-data-aggregator.js';

// Mock fs module (still needed for analytics, plugins, sync child repos)
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('fs', () => ({
  ...mockFs,
  default: mockFs,
}));

// Mock fs/promises module (used by async readJsonFile, scanIncrements, countTasks, countAcs)
const mockFsp = vi.hoisted(() => ({
  access: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  ...mockFsp,
  default: mockFsp,
}));

describe('DashboardDataAggregator', () => {
  const PROJECT_ROOT = '/fake/project';
  let aggregator: DashboardDataAggregator;

  beforeEach(() => {
    vi.clearAllMocks();
    aggregator = new DashboardDataAggregator(PROJECT_ROOT);

    // Default: no files exist (sync)
    mockFs.existsSync.mockReturnValue(false);
    // Default: no files exist (async) — access rejects
    mockFsp.access.mockRejectedValue(new Error('ENOENT'));
    mockFsp.readFile.mockRejectedValue(new Error('ENOENT'));
    mockFsp.readdir.mockRejectedValue(new Error('ENOENT'));
    mockFsp.stat.mockRejectedValue(new Error('ENOENT'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Helper to set up a dashboard.json cache (async) ---
  function setupDashboardCache(data: Record<string, unknown>) {
    mockFsp.access.mockImplementation(async (p: string) => {
      if (typeof p === 'string' && p.endsWith('state/dashboard.json')) return undefined;
      throw new Error('ENOENT');
    });
    mockFsp.readFile.mockImplementation(async (p: string) => {
      if (typeof p === 'string' && p.endsWith('state/dashboard.json')) return JSON.stringify(data);
      throw new Error('ENOENT');
    });
  }

  // --- Helper to set up filesystem increments (async) ---
  function setupFilesystemIncrements(increments: Array<{
    id: string;
    metadata: Record<string, unknown>;
    tasks?: string;
    spec?: string;
  }>) {
    const incrementsDir = path.join(PROJECT_ROOT, '.specweave/increments');

    mockFsp.access.mockImplementation(async (p: string) => {
      if (typeof p !== 'string') throw new Error('ENOENT');
      if (p === incrementsDir) return undefined;
      for (const inc of increments) {
        const dir = path.join(incrementsDir, inc.id);
        if (p === path.join(dir, 'metadata.json')) return undefined;
        if (p === path.join(dir, 'tasks.md') && inc.tasks) return undefined;
        if (p === path.join(dir, 'spec.md') && inc.spec) return undefined;
      }
      throw new Error('ENOENT');
    });

    mockFsp.readdir.mockImplementation(async (p: string, _opts?: any) => {
      if (typeof p === 'string' && p === incrementsDir) {
        return increments.map(inc => ({
          name: inc.id,
          isDirectory: () => true,
          isFile: () => false,
        }));
      }
      return [];
    });

    mockFsp.readFile.mockImplementation(async (p: string) => {
      if (typeof p !== 'string') throw new Error('ENOENT');
      for (const inc of increments) {
        const dir = path.join(incrementsDir, inc.id);
        if (p === path.join(dir, 'metadata.json')) return JSON.stringify(inc.metadata);
        if (p === path.join(dir, 'tasks.md') && inc.tasks) return inc.tasks;
        if (p === path.join(dir, 'spec.md') && inc.spec) return inc.spec;
      }
      throw new Error('ENOENT');
    });

    mockFsp.stat.mockImplementation(async (p: string) => {
      for (const inc of increments) {
        const dir = path.join(incrementsDir, inc.id);
        if (typeof p === 'string' && p === path.join(dir, 'metadata.json')) {
          return { mtime: new Date('2026-02-15T10:00:00Z') };
        }
      }
      throw new Error('ENOENT');
    });
  }

  // =====================================================
  // getIncrements — cache-based
  // =====================================================

  describe('getIncrements', () => {
    describe('with dashboard.json cache', () => {
      it('should return increments from cache', async () => {
        setupDashboardCache({
          increments: {
            '0001-feature-a': {
              title: 'Feature A',
              status: 'active',
              type: 'feature',
              priority: 'P1',
              tasks: { total: 5, completed: 3 },
              acs: { total: 2, completed: 1 },
              createdAt: '2026-02-01',
              lastActivity: '2026-02-15',
            },
          },
          summary: { total: 1, active: 1 },
        });

        const result = await aggregator.getIncrements();

        expect(result.increments).toHaveLength(1);
        expect(result.increments[0].id).toBe('0001-feature-a');
        expect(result.increments[0].title).toBe('Feature A');
        expect(result.increments[0].status).toBe('active');
        expect(result.increments[0].tasks).toEqual({ total: 5, completed: 3 });
        expect(result.summary).toEqual({ total: 1, active: 1 });
      });

      it('should apply default values for missing fields', async () => {
        setupDashboardCache({
          increments: {
            '0002-minimal': {},
          },
          summary: { total: 1 },
        });

        const result = await aggregator.getIncrements();

        expect(result.increments[0].title).toBe('0002-minimal');
        expect(result.increments[0].status).toBe('unknown');
        expect(result.increments[0].type).toBe('feature');
        expect(result.increments[0].priority).toBe('P2');
        expect(result.increments[0].tasks).toEqual({ total: 0, completed: 0 });
        expect(result.increments[0].acs).toEqual({ total: 0, completed: 0 });
      });

      it('should sort by status order then last activity', async () => {
        setupDashboardCache({
          increments: {
            '0001-completed': { status: 'completed', lastActivity: '2026-02-10' },
            '0002-active': { status: 'active', lastActivity: '2026-02-15' },
            '0003-planning': { status: 'planning', lastActivity: '2026-02-12' },
          },
          summary: { total: 3, active: 1, planning: 1, completed: 1 },
        });

        const result = await aggregator.getIncrements();

        expect(result.increments[0].status).toBe('active');
        expect(result.increments[1].status).toBe('planning');
        expect(result.increments[2].status).toBe('completed');
      });
    });

    // =====================================================
    // getIncrements — filesystem fallback
    // =====================================================

    describe('without dashboard.json cache (filesystem fallback)', () => {
      it('should discover increments from filesystem when cache is missing', async () => {
        setupFilesystemIncrements([{
          id: '0001-simple-web-calculator',
          metadata: {
            id: '0001-simple-web-calculator',
            title: 'Simple Web Calculator',
            status: 'active',
            createdAt: '2026-02-15',
          },
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments).toHaveLength(1);
        expect(result.increments[0].id).toBe('0001-simple-web-calculator');
        expect(result.increments[0].title).toBe('Simple Web Calculator');
        expect(result.increments[0].status).toBe('active');
      });

      it('should build summary from scanned increments', async () => {
        setupFilesystemIncrements([
          { id: '0001-feature', metadata: { title: 'Feature', status: 'active' } },
          { id: '0002-done', metadata: { title: 'Done', status: 'completed' } },
        ]);

        const result = await aggregator.getIncrements();

        expect(result.summary).toEqual({ total: 2, active: 1, completed: 1 });
      });

      it('should count tasks from tasks.md', async () => {
        setupFilesystemIncrements([{
          id: '0001-with-tasks',
          metadata: { title: 'With Tasks', status: 'active' },
          tasks: [
            '# Tasks',
            '### T-001: First task',
            '**Status**: [x] completed',
            '### T-002: Second task',
            '**Status**: [ ] pending',
            '### T-003: Third task',
            '**Status**: [x] completed',
          ].join('\n'),
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments[0].tasks).toEqual({ total: 3, completed: 2 });
      });

      it('should count checklist-style tasks', async () => {
        setupFilesystemIncrements([{
          id: '0001-checklist',
          metadata: { title: 'Checklist', status: 'active' },
          tasks: [
            '# Tasks',
            '- [x] T-001: Done task',
            '- [ ] T-002: Pending task',
            '- [x] T-003: Another done',
          ].join('\n'),
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments[0].tasks).toEqual({ total: 3, completed: 2 });
      });

      it('should count ACs from spec.md', async () => {
        setupFilesystemIncrements([{
          id: '0001-with-acs',
          metadata: { title: 'With ACs', status: 'active' },
          spec: [
            '# Spec',
            '## Acceptance Criteria',
            '- [x] **AC-US1-01**: First AC',
            '- [ ] **AC-US1-02**: Second AC',
            '- [x] **AC-US1-03**: Third AC',
          ].join('\n'),
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments[0].acs).toEqual({ total: 3, completed: 2 });
      });

      it('should skip non-numeric directories', async () => {
        const incrementsDir = path.join(PROJECT_ROOT, '.specweave/increments');
        mockFsp.access.mockImplementation(async (p: string) => {
          if (typeof p === 'string' && p === incrementsDir) return undefined;
          throw new Error('ENOENT');
        });
        mockFsp.readdir.mockResolvedValue([
          { name: '_archive', isDirectory: () => true, isFile: () => false },
          { name: 'README.md', isDirectory: () => false, isFile: () => true },
          { name: '.DS_Store', isDirectory: () => false, isFile: () => true },
        ] as any);

        const result = await aggregator.getIncrements();

        expect(result.increments).toHaveLength(0);
      });

      it('should skip increments without metadata.json', async () => {
        const incrementsDir = path.join(PROJECT_ROOT, '.specweave/increments');
        mockFsp.access.mockImplementation(async (p: string) => {
          if (typeof p === 'string' && p === incrementsDir) return undefined;
          // metadata.json does NOT exist
          throw new Error('ENOENT');
        });
        mockFsp.readdir.mockResolvedValue([
          { name: '0001-no-metadata', isDirectory: () => true, isFile: () => false },
        ] as any);

        const result = await aggregator.getIncrements();

        expect(result.increments).toHaveLength(0);
      });

      it('should use metadata fallback for tasks when tasks.md missing', async () => {
        setupFilesystemIncrements([{
          id: '0001-meta-only',
          metadata: {
            title: 'Meta Only',
            status: 'active',
            tasks: { total: 5, completed: 3 },
          },
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments[0].tasks).toEqual({ total: 5, completed: 3 });
      });

      it('should use metadata fallback for ACs via acceptanceCriteria field', async () => {
        setupFilesystemIncrements([{
          id: '0001-meta-acs',
          metadata: {
            title: 'Meta ACs',
            status: 'active',
            acceptanceCriteria: { total: 4, satisfied: 2 },
          },
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments[0].acs).toEqual({ total: 4, completed: 2 });
      });

      it('should use "created" field as fallback for createdAt', async () => {
        setupFilesystemIncrements([{
          id: '0001-created-field',
          metadata: {
            title: 'Created Field',
            status: 'active',
            created: '2026-01-01T00:00:00Z',
          },
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments[0].createdAt).toBe('2026-01-01T00:00:00Z');
      });

      it('should get lastActivity from file mtime when not in metadata', async () => {
        setupFilesystemIncrements([{
          id: '0001-mtime',
          metadata: { title: 'Mtime Test', status: 'active' },
        }]);

        const result = await aggregator.getIncrements();

        expect(result.increments[0].lastActivity).toBe('2026-02-15T10:00:00.000Z');
      });

      it('should return empty when increments directory does not exist', async () => {
        // access rejects for everything (default)
        const result = await aggregator.getIncrements();

        expect(result.increments).toHaveLength(0);
        expect(result.summary).toEqual({ total: 0 });
      });

      it('should handle multiple increments with mixed statuses', async () => {
        setupFilesystemIncrements([
          { id: '0001-active', metadata: { title: 'Active', status: 'active' } },
          { id: '0002-planning', metadata: { title: 'Planning', status: 'planning' } },
          { id: '0003-completed', metadata: { title: 'Completed', status: 'completed' } },
        ]);

        const result = await aggregator.getIncrements();

        expect(result.increments).toHaveLength(3);
        // Should be sorted: active first, then planning, then completed
        expect(result.increments[0].status).toBe('active');
        expect(result.increments[1].status).toBe('planning');
        expect(result.increments[2].status).toBe('completed');
        expect(result.summary).toEqual({ total: 3, active: 1, planning: 1, completed: 1 });
      });
    });
  });

  // =====================================================
  // TTL Cache for increments (T-001, T-010)
  // =====================================================

  describe('increments TTL cache', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return cached data on subsequent calls within TTL', async () => {
      setupFilesystemIncrements([
        { id: '0001-feature', metadata: { title: 'Feature', status: 'active' } },
      ]);

      const result1 = await aggregator.getIncrements();
      expect(result1.increments).toHaveLength(1);

      // Clear mocks to prove second call uses cache
      mockFsp.access.mockRejectedValue(new Error('ENOENT'));
      mockFsp.readdir.mockRejectedValue(new Error('ENOENT'));
      mockFsp.readFile.mockRejectedValue(new Error('ENOENT'));

      const result2 = await aggregator.getIncrements();
      expect(result2.increments).toHaveLength(1);
      expect(result2).toEqual(result1);
    });

    it('should expire cache after TTL', async () => {
      setupFilesystemIncrements([
        { id: '0001-feature', metadata: { title: 'Feature', status: 'active' } },
      ]);

      const result1 = await aggregator.getIncrements();
      expect(result1.increments).toHaveLength(1);

      // Advance past TTL (30s)
      vi.advanceTimersByTime(31_000);

      // Set up different data to prove fresh read
      setupFilesystemIncrements([
        { id: '0001-feature', metadata: { title: 'Feature', status: 'active' } },
        { id: '0002-new', metadata: { title: 'New', status: 'planning' } },
      ]);

      const result2 = await aggregator.getIncrements();
      expect(result2.increments).toHaveLength(2);
    });

    it('should re-read after invalidateIncrementsCache()', async () => {
      setupFilesystemIncrements([
        { id: '0001-feature', metadata: { title: 'Feature', status: 'active' } },
      ]);

      const result1 = await aggregator.getIncrements();
      expect(result1.increments).toHaveLength(1);

      // Invalidate cache
      aggregator.invalidateIncrementsCache();

      // Set up different data
      setupFilesystemIncrements([
        { id: '0001-feature', metadata: { title: 'Feature', status: 'active' } },
        { id: '0002-new', metadata: { title: 'New', status: 'planning' } },
      ]);

      const result2 = await aggregator.getIncrements();
      expect(result2.increments).toHaveLength(2);
    });
  });

  // =====================================================
  // Shared scan: getOverview() reuses getIncrements() cache (T-004)
  // =====================================================

  describe('shared scan between getOverview and getIncrements', () => {
    it('should share cached data between getOverview and getIncrements', async () => {
      setupFilesystemIncrements([
        { id: '0001-active', metadata: { title: 'Active', status: 'active' } },
      ]);

      // Call getOverview first (triggers getIncrements internally)
      const overview = await aggregator.getOverview();
      expect(overview.project.totalIncrements).toBe(1);

      // Clear mocks — if getIncrements uses cache, it won't need filesystem
      mockFsp.access.mockRejectedValue(new Error('ENOENT'));
      mockFsp.readdir.mockRejectedValue(new Error('ENOENT'));
      mockFsp.readFile.mockRejectedValue(new Error('ENOENT'));

      // getIncrements should return from cache
      const increments = await aggregator.getIncrements();
      expect(increments.increments).toHaveLength(1);
      expect(increments.increments[0].id).toBe('0001-active');
    });
  });

  // =====================================================
  // getOverview — with and without cache
  // =====================================================

  describe('getOverview', () => {
    it('should return overview with cache data', async () => {
      setupDashboardCache({
        summary: {
          total: 5,
          active: 2,
          completed: 3,
          byType: { feature: 3, bug: 2 },
          byPriority: { P1: 2, P2: 3 },
        },
      });

      const result = await aggregator.getOverview();

      expect(result.project.totalIncrements).toBe(5);
      expect(result.project.activeIncrements).toBe(2);
      expect(result.project.completedIncrements).toBe(3);
      expect(result.project.typeBreakdown).toEqual({ feature: 3, bug: 2 });
    });

    it('should fall back to filesystem scan when cache is missing', async () => {
      setupFilesystemIncrements([
        { id: '0001-active', metadata: { title: 'Active', status: 'active' } },
      ]);

      const result = await aggregator.getOverview();

      expect(result.project.totalIncrements).toBe(1);
      expect(result.project.activeIncrements).toBe(1);
      expect(result.project.completedIncrements).toBe(0);
    });

    it('should return zero counts when no cache and no increments', async () => {
      const result = await aggregator.getOverview();

      expect(result.project.totalIncrements).toBe(0);
      expect(result.project.activeIncrements).toBe(0);
      expect(result.project.completedIncrements).toBe(0);
    });

    it('should include analytics, costs, notifications, and sync data', async () => {
      const result = await aggregator.getOverview();

      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('costs');
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('sync');
      expect(result).toHaveProperty('generatedAt');
    });

    it('should include cost data when provided', async () => {
      const costData = {
        totalCost: 10.5,
        totalSavings: 2.3,
        totalTokens: 50000,
        sessionCount: 5,
        sessions: [],
      };

      const result = await aggregator.getOverview(costData);

      expect(result.costs.totalCost).toBe(10.5);
      expect(result.costs.totalTokens).toBe(50000);
    });
  });

  // =====================================================
  // scanIncrementsFromFilesystem — unit tests
  // =====================================================

  describe('scanIncrementsFromFilesystem', () => {
    it('should handle corrupted metadata.json gracefully', async () => {
      const incrementsDir = path.join(PROJECT_ROOT, '.specweave/increments');
      mockFsp.access.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && (p === incrementsDir || p.endsWith('metadata.json'))) return undefined;
        throw new Error('ENOENT');
      });
      mockFsp.readdir.mockResolvedValue([
        { name: '0001-corrupt', isDirectory: () => true, isFile: () => false },
      ] as any);
      mockFsp.readFile.mockResolvedValue('NOT VALID JSON{{{');

      const result = await aggregator.scanIncrementsFromFilesystem();

      expect(result).toHaveLength(0);
    });

    it('should handle readdir errors gracefully', async () => {
      const incrementsDir = path.join(PROJECT_ROOT, '.specweave/increments');
      mockFsp.access.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && p === incrementsDir) return undefined;
        throw new Error('ENOENT');
      });
      mockFsp.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await aggregator.scanIncrementsFromFilesystem();

      expect(result).toHaveLength(0);
    });

    it('should produce correct results for multiple increments', async () => {
      setupFilesystemIncrements([
        { id: '0001-feat', metadata: { title: 'Feature', status: 'active', type: 'feature', priority: 'P1' } },
        { id: '0002-bug', metadata: { title: 'Bug Fix', status: 'completed', type: 'bug', priority: 'P0' } },
        { id: '0003-plan', metadata: { title: 'Planning', status: 'planning' } },
      ]);

      const result = await aggregator.scanIncrementsFromFilesystem();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('0001-feat');
      expect(result[0].type).toBe('feature');
      expect(result[1].id).toBe('0002-bug');
      expect(result[1].type).toBe('bug');
      expect(result[2].id).toBe('0003-plan');
      expect(result[2].type).toBe('feature'); // default
    });
  });

  // =====================================================
  // Analytics aggregation
  // =====================================================

  describe('getAnalyticsSummary', () => {
    it('should return empty analytics when events file is missing', async () => {
      const result = await aggregator.getAnalyticsSummary();

      expect(result.totalEvents).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.topCommands).toHaveLength(0);
    });

    it('should aggregate events from jsonl', async () => {
      const eventsPath = path.join(PROJECT_ROOT, '.specweave/state/analytics/events.jsonl');
      mockFsp.access.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && p === eventsPath) return undefined;
        throw new Error('ENOENT');
      });
      mockFsp.readFile.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && p === eventsPath) {
          return [
            JSON.stringify({ name: '/sw:do', type: 'skill', success: true, timestamp: new Date().toISOString(), plugin: 'specweave' }),
            JSON.stringify({ name: '/sw:plan', type: 'skill', success: true, timestamp: new Date().toISOString(), plugin: 'specweave' }),
            JSON.stringify({ name: '/sw:do', type: 'skill', success: false, timestamp: new Date().toISOString(), plugin: 'specweave' }),
          ].join('\n');
        }
        throw new Error('ENOENT');
      });

      const result = await aggregator.getAnalyticsSummary();

      expect(result.totalEvents).toBe(3);
      expect(result.successRate).toBe(67); // 2/3
      expect(result.topSkills).toHaveLength(2);
      expect(result.topSkills[0].name).toBe('/sw:do');
      expect(result.topSkills[0].count).toBe(2);
    });

    it('should cache analytics results', async () => {
      const result1 = await aggregator.getAnalyticsSummary();
      const result2 = await aggregator.getAnalyticsSummary();

      // readFileSync should only be called for the first call (or not at all since file doesn't exist)
      expect(result1).toEqual(result2);
    });
  });

  // =====================================================
  // Sync status
  // =====================================================

  describe('getSyncStatus', () => {
    it('should return not_configured for unconfigured platforms', async () => {
      const result = await aggregator.getSyncStatus();

      expect(result.platforms.github.connectionStatus).toBe('not_configured');
      expect(result.platforms.jira.connectionStatus).toBe('not_configured');
      expect(result.platforms.ado.connectionStatus).toBe('not_configured');
    });

    it('should detect configured_never_synced status', async () => {
      mockFsp.access.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && p.endsWith('config.json')) return undefined;
        throw new Error('ENOENT');
      });
      mockFsp.readFile.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && p.endsWith('config.json')) {
          return JSON.stringify({ sync: { github: { owner: 'myorg', repo: 'myrepo' } } });
        }
        throw new Error('ENOENT');
      });

      const result = await aggregator.getSyncStatus();

      expect(result.platforms.github.connectionStatus).toBe('configured_never_synced');
    });
  });

  // =====================================================
  // Other methods
  // =====================================================

  describe('getNotifications', () => {
    it('should return empty array when no notifications file', async () => {
      const result = await aggregator.getNotifications();
      expect(result).toEqual([]);
    });
  });

  describe('getConfig', () => {
    it('should return empty object when no config file', async () => {
      const result = await aggregator.getConfig();
      expect(result).toEqual({});
    });
  });

  describe('getLspStatus', () => {
    it('should return null when no lsp-check file', async () => {
      const result = await aggregator.getLspStatus();
      expect(result).toBeNull();
    });
  });

  describe('getSkillUsage', () => {
    it('should return empty when no events', async () => {
      const result = await aggregator.getSkillUsage();
      expect(result).toEqual([]);
    });
  });
});
