/**
 * Log Aggregator Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { LogAggregator, LogQuery } from '../../../../src/core/logs/log-aggregator.js';
import { LogExporter } from '../../../../src/core/logs/log-exporter.js';
import { AuditLogEntry } from '../../../../src/core/sync/sync-audit-logger.js';

// Sample log entries
function createSampleEntries(): AuditLogEntry[] {
  const now = Date.now();
  return [
    {
      timestamp: new Date(now - 1000).toISOString(),
      platform: 'github',
      operation: 'upsert-internal',
      itemId: 'FS-001',
      result: 'success',
      durationMs: 150,
    },
    {
      timestamp: new Date(now - 2000).toISOString(),
      platform: 'jira',
      operation: 'update-status',
      itemId: 'US-001',
      result: 'success',
      durationMs: 200,
    },
    {
      timestamp: new Date(now - 3000).toISOString(),
      platform: 'github',
      operation: 'upsert-external',
      itemId: 'EXT-001',
      result: 'denied',
      reason: 'External updates disabled',
    },
    {
      timestamp: new Date(now - 4000).toISOString(),
      platform: 'ado',
      operation: 'read',
      itemId: 'WI-001',
      result: 'error',
      error: 'Network timeout',
    },
    {
      timestamp: new Date(now - 5000).toISOString(),
      platform: 'github',
      operation: 'upsert-internal',
      itemId: 'FS-002',
      result: 'success',
      durationMs: 100,
    },
  ];
}

describe('LogAggregator', () => {
  let tmpDir: string;
  let logDir: string;
  let aggregator: LogAggregator;

  beforeEach(async () => {
    // Create temp directory structure
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-aggregator-test-'));
    logDir = path.join(tmpDir, 'logs', 'sync');
    await fs.mkdir(logDir, { recursive: true });

    // Create sample log file
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `audit-${today}.jsonl`);
    const entries = createSampleEntries();
    const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(logFile, content, 'utf-8');

    aggregator = new LogAggregator({ specweavePath: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('query', () => {
    it('should return all entries with no filters', async () => {
      const result = await aggregator.query();

      expect(result.entries.length).toBe(5);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by platform', async () => {
      const result = await aggregator.query({ platform: 'github' });

      expect(result.entries.length).toBe(3);
      expect(result.entries.every(e => e.platform === 'github')).toBe(true);
    });

    it('should filter by result', async () => {
      const result = await aggregator.query({ result: 'success' });

      expect(result.entries.length).toBe(3);
      expect(result.entries.every(e => e.result === 'success')).toBe(true);
    });

    it('should filter by operation', async () => {
      const result = await aggregator.query({ operation: 'upsert-internal' });

      expect(result.entries.length).toBe(2);
    });

    it('should respect limit', async () => {
      const result = await aggregator.query({ limit: 2 });

      expect(result.entries.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should respect offset', async () => {
      const result = await aggregator.query({ offset: 2, limit: 2 });

      expect(result.entries.length).toBe(2);
      expect(result.total).toBe(5);
    });

    it('should sort by timestamp descending', async () => {
      const result = await aggregator.query();

      for (let i = 1; i < result.entries.length; i++) {
        const prev = new Date(result.entries[i - 1].timestamp).getTime();
        const curr = new Date(result.entries[i].timestamp).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should include execution time', async () => {
      const result = await aggregator.query();

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('count', () => {
    it('should return total count', async () => {
      const count = await aggregator.count();
      expect(count).toBe(5);
    });

    it('should count with filters', async () => {
      const count = await aggregator.count({ platform: 'github' });
      expect(count).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const stats = await aggregator.getStats();

      expect(stats.total).toBe(5);
      expect(stats.byResult.success).toBe(3);
      expect(stats.byResult.denied).toBe(1);
      expect(stats.byResult.error).toBe(1);
      expect(stats.byPlatform.github).toBe(3);
      expect(stats.byPlatform.jira).toBe(1);
      expect(stats.byPlatform.ado).toBe(1);
    });

    it('should calculate average duration', async () => {
      const stats = await aggregator.getStats();

      // (150 + 200 + 100) / 3 = 150
      expect(stats.avgDurationMs).toBe(150);
    });
  });

  describe('date range filtering', () => {
    it('should filter by since date', async () => {
      const since = new Date(Date.now() - 2500);
      const result = await aggregator.query({ since });

      // Should include entries newer than 2.5 seconds ago
      expect(result.entries.length).toBe(2);
    });

    it('should filter by until date', async () => {
      const until = new Date(Date.now() - 3500);
      const result = await aggregator.query({ until });

      // Should include entries older than 3.5 seconds ago
      expect(result.entries.length).toBe(2);
    });
  });

  describe('empty directory', () => {
    it('should return empty results for empty directory', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-'));
      const emptyAggregator = new LogAggregator({ specweavePath: emptyDir });

      const result = await emptyAggregator.query();

      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);

      await fs.rm(emptyDir, { recursive: true, force: true });
    });
  });
});

describe('LogExporter', () => {
  let tmpDir: string;
  let exporter: LogExporter;
  const sampleEntries = createSampleEntries().slice(0, 2);

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-exporter-test-'));
    exporter = new LogExporter();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('export', () => {
    it('should export to JSON file', async () => {
      const result = {
        entries: sampleEntries,
        total: 2,
        hasMore: false,
        query: {},
        executionTimeMs: 10,
      };

      const outputPath = path.join(tmpDir, 'logs.json');
      await exporter.export(result, outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.entries).toHaveLength(2);
      expect(parsed.metadata.total).toBe(2);
    });

    it('should export to JSONL file', async () => {
      const result = {
        entries: sampleEntries,
        total: 2,
        hasMore: false,
        query: {},
        executionTimeMs: 10,
      };

      const outputPath = path.join(tmpDir, 'logs.jsonl');
      await exporter.export(result, outputPath, { format: 'jsonl' });

      const content = await fs.readFile(outputPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).platform).toBe('github');
    });

    it('should export to CSV file', async () => {
      const result = {
        entries: sampleEntries,
        total: 2,
        hasMore: false,
        query: {},
        executionTimeMs: 10,
      };

      const outputPath = path.join(tmpDir, 'logs.csv');
      await exporter.export(result, outputPath, { format: 'csv' });

      const content = await fs.readFile(outputPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines[0]).toContain('timestamp');
      expect(lines[0]).toContain('platform');
      expect(lines[1]).toContain('github');
    });
  });

  describe('exportToString', () => {
    it('should export entries to JSON string', () => {
      const content = exporter.exportToString(sampleEntries, 'json');
      const parsed = JSON.parse(content);

      expect(parsed.entries).toHaveLength(2);
    });

    it('should export entries to JSONL string', () => {
      const content = exporter.exportToString(sampleEntries, 'jsonl');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
    });

    it('should export entries to CSV string', () => {
      const content = exporter.exportToString(sampleEntries, 'csv');

      expect(content).toContain('timestamp');
      expect(content).toContain('github');
    });
  });
});
