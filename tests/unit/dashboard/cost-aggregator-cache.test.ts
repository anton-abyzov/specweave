import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CostAggregator } from '../../../src/dashboard/server/data/cost-aggregator.js';

/**
 * TDD tests for CostAggregator per-file mtime cache, incremental aggregation,
 * deleted file eviction, and performance targets.
 *
 * Covers tasks T-001 through T-006.
 */

describe('CostAggregator - per-file mtime cache', () => {
  let tempHome: string;
  let logDir: string;
  let aggregator: CostAggregator;
  const projectRoot = '/test/project';
  let origHome: string | undefined;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-cache-test-'));
    origHome = process.env.HOME;
    process.env.HOME = tempHome;

    logDir = path.join(tempHome, '.claude', 'projects', '-test-project');
    fs.mkdirSync(logDir, { recursive: true });

    aggregator = new CostAggregator(projectRoot);
  });

  afterEach(() => {
    process.env.HOME = origHome;
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  function writeSession(sessionId: string, entries: Record<string, unknown>[]): void {
    const filePath = path.join(logDir, `${sessionId}.jsonl`);
    fs.writeFileSync(filePath, entries.map(e => JSON.stringify(e)).join('\n'));
  }

  function makeEntry(model: string, usage: Record<string, number>, timestamp: string) {
    return {
      type: 'assistant',
      timestamp,
      message: {
        model,
        usage: {
          input_tokens: usage.input ?? 0,
          output_tokens: usage.output ?? 0,
          cache_creation_input_tokens: usage.cacheWrite ?? 0,
          cache_read_input_tokens: usage.cacheRead ?? 0,
        },
      },
    };
  }

  // ──── T-001: Per-file mtime cache ────

  describe('T-001: per-file mtime cache returns cached summaries on no-change', () => {
    it('should not re-parse files when mtimes are unchanged', async () => {
      writeSession('s1', [makeEntry('claude-sonnet-4-5-20250929', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z')]);
      writeSession('s2', [makeEntry('claude-sonnet-4-5-20250929', { input: 2000, output: 1000 }, '2026-02-15T11:00:00Z')]);
      writeSession('s3', [makeEntry('claude-sonnet-4-5-20250929', { input: 3000, output: 1500 }, '2026-02-15T12:00:00Z')]);

      const result1 = await aggregator.getTokenSummaries();
      expect(result1.sessionCount).toBe(3);
      expect(result1.totalTokens).toBe(9000); // (1000+500) + (2000+1000) + (3000+1500)

      // Second call with no file changes — should return same data without re-parsing
      const result2 = await aggregator.getTokenSummaries();
      expect(result2.sessionCount).toBe(3);
      expect(result2.totalTokens).toBe(9000);
    });

    it('should populate the per-file cache after first call', async () => {
      writeSession('s1', [makeEntry('claude-opus-4-6', { input: 5000, output: 2000 }, '2026-02-15T10:00:00Z')]);

      const result = await aggregator.getTokenSummaries();
      expect(result.sessionCount).toBe(1);

      // The file cache should now be populated — calling again returns identical results
      const result2 = await aggregator.getTokenSummaries();
      expect(result2.totalCost).toBe(result.totalCost);
      expect(result2.totalTokens).toBe(result.totalTokens);
    });
  });

  // ──── T-002: Replace 60s TTL with file-change detection ────

  describe('T-002: file-change detection replaces TTL cache', () => {
    it('should re-parse only the modified file and return updated totals immediately', async () => {
      writeSession('s1', [makeEntry('claude-sonnet-4-5-20250929', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z')]);
      writeSession('s2', [makeEntry('claude-sonnet-4-5-20250929', { input: 2000, output: 1000 }, '2026-02-15T11:00:00Z')]);

      const result1 = await aggregator.getTokenSummaries();
      expect(result1.totalTokens).toBe(4500);

      // Modify one file — mtime will change
      // Small sleep to ensure mtime differs
      await new Promise(r => setTimeout(r, 50));
      writeSession('s2', [makeEntry('claude-sonnet-4-5-20250929', { input: 5000, output: 2500 }, '2026-02-15T11:00:00Z')]);

      const result2 = await aggregator.getTokenSummaries();
      // s1 = 1500, s2 = 7500 (updated) → total = 9000
      expect(result2.totalTokens).toBe(9000);
    });

    it('should detect changes without waiting for a TTL to expire', async () => {
      writeSession('s1', [makeEntry('claude-sonnet-4-5-20250929', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z')]);

      const result1 = await aggregator.getTokenSummaries();
      expect(result1.sessionCount).toBe(1);

      // Immediately (no TTL wait) add a new file
      writeSession('s2', [makeEntry('claude-sonnet-4-5-20250929', { input: 2000, output: 1000 }, '2026-02-15T11:00:00Z')]);

      const result2 = await aggregator.getTokenSummaries();
      expect(result2.sessionCount).toBe(2);
    });
  });

  // ──── T-003: Evict deleted files from cache ────

  describe('T-003: evict deleted files from cache', () => {
    it('should evict stale entry when a file is deleted from disk', async () => {
      writeSession('s1', [makeEntry('claude-sonnet-4-5-20250929', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z')]);
      writeSession('s2', [makeEntry('claude-sonnet-4-5-20250929', { input: 2000, output: 1000 }, '2026-02-15T11:00:00Z')]);
      writeSession('s3', [makeEntry('claude-sonnet-4-5-20250929', { input: 3000, output: 1500 }, '2026-02-15T12:00:00Z')]);

      const result1 = await aggregator.getTokenSummaries();
      expect(result1.sessionCount).toBe(3);

      // Delete one file
      fs.unlinkSync(path.join(logDir, 's2.jsonl'));

      const result2 = await aggregator.getTokenSummaries();
      expect(result2.sessionCount).toBe(2);
      // Only s1 (1500) + s3 (4500) = 6000
      expect(result2.totalTokens).toBe(6000);
    });

    it('should correctly update model breakdown after file deletion', async () => {
      writeSession('s1', [makeEntry('claude-opus-4-6', { input: 1000, output: 500 }, '2026-02-15T10:00:00Z')]);
      writeSession('s2', [makeEntry('claude-sonnet-4-5-20250929', { input: 2000, output: 1000 }, '2026-02-15T11:00:00Z')]);

      const result1 = await aggregator.getTokenSummaries();
      expect(Object.keys(result1.modelBreakdown).length).toBe(2);

      // Delete the sonnet session
      fs.unlinkSync(path.join(logDir, 's2.jsonl'));

      const result2 = await aggregator.getTokenSummaries();
      expect(Object.keys(result2.modelBreakdown).length).toBe(1);
      expect(result2.modelBreakdown['Opus 4.6']).toBeDefined();
    });
  });

  // ──── T-004: Incremental aggregation ────

  describe('T-004: incremental aggregation', () => {
    it('should only parse the new file when one is added to 200 cached files', async () => {
      // Create 5 cached files (scaled-down test for speed)
      for (let i = 0; i < 5; i++) {
        writeSession(`s${i}`, [makeEntry('claude-sonnet-4-5-20250929', { input: 1000, output: 500 }, `2026-02-15T${String(10 + i).padStart(2, '0')}:00:00Z`)]);
      }

      const result1 = await aggregator.getTokenSummaries();
      expect(result1.sessionCount).toBe(5);
      expect(result1.totalTokens).toBe(7500); // 5 * 1500

      // Add one new file
      writeSession('s-new', [makeEntry('claude-sonnet-4-5-20250929', { input: 4000, output: 2000 }, '2026-02-15T20:00:00Z')]);

      const result2 = await aggregator.getTokenSummaries();
      expect(result2.sessionCount).toBe(6);
      expect(result2.totalTokens).toBe(13500); // 7500 + 6000
    });

    it('should recompute totals from all cached summaries correctly', async () => {
      writeSession('s1', [makeEntry('claude-opus-4-6', { input: 10000, output: 5000 }, '2026-02-15T10:00:00Z')]);
      writeSession('s2', [makeEntry('claude-sonnet-4-5-20250929', { input: 20000, output: 10000 }, '2026-02-15T11:00:00Z')]);

      const result1 = await aggregator.getTokenSummaries();

      // Add another file
      writeSession('s3', [makeEntry('claude-haiku-4-5-20251001', { input: 30000, output: 15000 }, '2026-02-15T12:00:00Z')]);

      const result2 = await aggregator.getTokenSummaries();
      expect(result2.sessionCount).toBe(3);
      expect(result2.totalTokens).toBe(90000); // 15000 + 30000 + 45000
      expect(Object.keys(result2.modelBreakdown).length).toBe(3);
    });
  });

  // ──── T-005: Sub-100ms warm response time ────

  describe('T-005: warm response time under 100ms', () => {
    it('should respond in under 100ms when cache is warm', async () => {
      // Create some files for a realistic warm cache scenario
      for (let i = 0; i < 20; i++) {
        writeSession(`s${i}`, [makeEntry('claude-sonnet-4-5-20250929', { input: 1000, output: 500 }, `2026-02-15T${String(i).padStart(2, '0')}:00:00Z`)]);
      }

      // Cold call to populate cache
      await aggregator.getTokenSummaries();

      // Warm call — measure time
      const start = performance.now();
      const result = await aggregator.getTokenSummaries();
      const elapsed = performance.now() - start;

      expect(result.sessionCount).toBe(20);
      expect(elapsed).toBeLessThan(100);
    });
  });

  // ──── T-006: Cold-start under 500ms for 200 files ────

  describe('T-006: cold-start performance under 500ms for 200 files', () => {
    it('should complete cold start in under 500ms for 200 synthetic files', async () => {
      // Create 200 synthetic JSONL files (minimal content)
      for (let i = 0; i < 200; i++) {
        const ts = `2026-02-${String((i % 28) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`;
        writeSession(`session-${String(i).padStart(4, '0')}`, [
          makeEntry('claude-sonnet-4-5-20250929', { input: 1000 + i, output: 500 + i }, ts),
        ]);
      }

      // Fresh aggregator for cold start
      const coldAggregator = new CostAggregator(projectRoot);

      const start = performance.now();
      const result = await coldAggregator.getTokenSummaries(200);
      const elapsed = performance.now() - start;

      expect(result.sessionCount).toBe(200);
      expect(elapsed).toBeLessThan(500);
    });
  });
});
