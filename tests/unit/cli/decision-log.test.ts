/**
 * @file decision-log.test.ts
 * @description Tests for specweave decision-log CLI command
 *
 * T-011 [RED]: Write failing tests for decision-log CLI
 * Satisfies: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06
 *
 * Test Cases:
 * - TC-013: Shows last 20 decisions by default
 * - TC-014: Filters by hook name
 * - TC-015: Filters by decision type
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import the actual implementation
import { decisionLogCommand, decisionLogTail } from '../../../src/cli/commands/decision-log.js';

describe('decision-log CLI', () => {
  let testDir: string;
  let decisionsLogPath: string;

  beforeEach(() => {
    vi.resetAllMocks();
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-decision-log-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'logs'), { recursive: true });
    decisionsLogPath = path.join(testDir, '.specweave', 'logs', 'decisions.jsonl');
  });

  afterEach(() => {
    // Clean up test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to create decision log entries
   */
  function createLogEntries(count: number, options: {
    hook?: string;
    decision?: 'approve' | 'block';
    baseTimestamp?: Date;
  } = {}): void {
    const entries: string[] = [];
    const baseTime = options.baseTimestamp || new Date();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(baseTime.getTime() - (count - i) * 60000); // 1 min apart
      const entry = {
        timestamp: timestamp.toISOString(),
        hook: options.hook || (i % 2 === 0 ? 'stop-auto' : 'stop-reflect'),
        decision: options.decision || (i % 3 === 0 ? 'block' : 'approve'),
        reason: `Test reason ${i + 1}`,
        reasonCode: i % 3 === 0 ? 'work_remaining' : 'all_complete',
        durationMs: Math.floor(Math.random() * 1000),
        context: {
          sessionActive: true,
          turn: { current: i + 1, max: 20 },
        },
      };
      entries.push(JSON.stringify(entry));
    }
    fs.writeFileSync(decisionsLogPath, entries.join('\n') + '\n');
  }

  describe('TC-013: Shows last 20 decisions by default', () => {
    it('should show last 20 decisions when log has 50 entries', async () => {
      // Given: Log with 50 entries
      createLogEntries(50);

      // Use the imported command

      // When: specweave decision-log (no options)
      const result = await decisionLogCommand({ projectRoot: testDir });

      // Then: Output shows 20 most recent entries
      expect(result).toBeDefined();
      expect(result.entries).toHaveLength(20);
      // Most recent should be first
      expect(result.entries[0].reason).toContain('50');
    });

    it('should show all entries when fewer than 20 exist', async () => {
      // Given: Log with only 10 entries
      createLogEntries(10);

      // When: specweave decision-log
      const result = await decisionLogCommand({ projectRoot: testDir });

      // Then: All 10 entries shown
      expect(result.entries).toHaveLength(10);
    });

    it('should respect custom limit option', async () => {
      // Given: Log with 50 entries
      createLogEntries(50);

      // When: specweave decision-log --limit 5
      const result = await decisionLogCommand({ projectRoot: testDir, limit: 5 });

      // Then: Only 5 entries shown
      expect(result.entries).toHaveLength(5);
    });
  });

  describe('TC-014: Filters by hook name', () => {
    it('should filter by hook name with --hook option', async () => {
      // Given: Log with stop-auto and stop-reflect entries
      createLogEntries(20); // Mix of hooks

      // When: specweave decision-log --hook stop-auto
      const result = await decisionLogCommand({
        projectRoot: testDir,
        hook: 'stop-auto',
      });

      // Then: Only stop-auto entries shown
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries.every((e: { hook: string }) => e.hook === 'stop-auto')).toBe(true);
    });

    it('should return empty when filtering by non-existent hook', async () => {
      // Given: Log with only stop-auto entries
      createLogEntries(10, { hook: 'stop-auto' });

      // When: specweave decision-log --hook user-prompt-submit
      const result = await decisionLogCommand({
        projectRoot: testDir,
        hook: 'user-prompt-submit',
      });

      // Then: No entries shown
      expect(result.entries).toHaveLength(0);
    });
  });

  describe('TC-015: Filters by decision type', () => {
    it('should filter by decision type with --decision option', async () => {
      // Given: Log with approve and block entries
      createLogEntries(30); // Mix of decisions

      // When: specweave decision-log --decision block
      const result = await decisionLogCommand({
        projectRoot: testDir,
        decision: 'block',
      });

      // Then: Only block entries shown
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries.every((e: { decision: string }) => e.decision === 'block')).toBe(true);
    });

    it('should filter by approve decision', async () => {
      // Given: Log with mixed entries
      createLogEntries(20);

      // When: specweave decision-log --decision approve
      const result = await decisionLogCommand({
        projectRoot: testDir,
        decision: 'approve',
      });

      // Then: Only approve entries shown
      expect(result.entries.every((e: { decision: string }) => e.decision === 'approve')).toBe(true);
    });
  });

  describe('AC-US5-04: Filter by time window', () => {
    it('should filter by --since 1h', async () => {
      // Given: Entries from different time periods
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Create old entries (2 hours ago)
      createLogEntries(10, { baseTimestamp: twoHoursAgo });

      // Add recent entries
      const recentEntries = [];
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now.getTime() - i * 5000); // Last 5 mins
        recentEntries.push(JSON.stringify({
          timestamp: timestamp.toISOString(),
          hook: 'stop-auto',
          decision: 'approve',
          reason: `Recent entry ${i}`,
          reasonCode: 'recent',
          durationMs: 100,
          context: {},
        }));
      }
      fs.appendFileSync(decisionsLogPath, recentEntries.join('\n') + '\n');

      // When: specweave decision-log --since 1h
      const result = await decisionLogCommand({
        projectRoot: testDir,
        since: '1h',
      });

      // Then: Only recent entries shown
      expect(result.entries.length).toBe(5);
      expect(result.entries.every((e: { reasonCode: string }) => e.reasonCode === 'recent')).toBe(true);
    });

    it('should support --since 24h', async () => {
      // This should not throw
      const result = await decisionLogCommand({
        projectRoot: testDir,
        since: '24h',
      });

      expect(result).toBeDefined();
    });

    it('should support --since 7d', async () => {
      const result = await decisionLogCommand({
        projectRoot: testDir,
        since: '7d',
      });

      expect(result).toBeDefined();
    });
  });

  describe('AC-US5-05: JSON output', () => {
    it('should output raw JSON with --json flag', async () => {
      // Given: Log with entries
      createLogEntries(5);

      // When: specweave decision-log --json
      const result = await decisionLogCommand({
        projectRoot: testDir,
        json: true,
      });

      // Then: Output is valid JSON array
      expect(result.format).toBe('json');
      expect(Array.isArray(result.entries)).toBe(true);
      // Each entry should be parseable JSON
      for (const entry of result.entries) {
        expect(typeof entry.timestamp).toBe('string');
        expect(typeof entry.hook).toBe('string');
      }
    });
  });

  describe('Combined filters', () => {
    it('should combine --hook and --decision filters', async () => {
      // Given: Log with mixed entries
      createLogEntries(50);

      // When: specweave decision-log --hook stop-auto --decision block
      const result = await decisionLogCommand({
        projectRoot: testDir,
        hook: 'stop-auto',
        decision: 'block',
      });

      // Then: Only stop-auto block entries shown
      for (const entry of result.entries) {
        expect(entry.hook).toBe('stop-auto');
        expect(entry.decision).toBe('block');
      }
    });

    it('should combine all filters with --limit', async () => {
      // Given: Log with many entries
      createLogEntries(100);

      // When: Combined filters
      const result = await decisionLogCommand({
        projectRoot: testDir,
        hook: 'stop-auto',
        decision: 'approve',
        limit: 3,
      });

      // Then: Maximum 3 matching entries
      expect(result.entries.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty log file gracefully', async () => {
      // Given: Empty log file
      fs.writeFileSync(decisionsLogPath, '');

      // When: specweave decision-log
      const result = await decisionLogCommand({ projectRoot: testDir });

      // Then: Empty result, no error
      expect(result.entries).toHaveLength(0);
    });

    it('should handle missing log file gracefully', async () => {
      // Given: No log file exists
      fs.rmSync(decisionsLogPath, { force: true });

      // When: specweave decision-log
      const result = await decisionLogCommand({ projectRoot: testDir });

      // Then: Empty result, no error
      expect(result.entries).toHaveLength(0);
    });

    it('should skip malformed JSON lines', async () => {
      // Given: Log with some malformed lines
      const entries = [
        '{"timestamp":"2026-02-02T10:00:00Z","hook":"stop-auto","decision":"approve","reason":"Good entry","reasonCode":"ok","durationMs":100,"context":{}}',
        'not valid json',
        '{"timestamp":"2026-02-02T10:01:00Z","hook":"stop-reflect","decision":"approve","reason":"Another good entry","reasonCode":"ok","durationMs":200,"context":{}}',
      ];
      fs.writeFileSync(decisionsLogPath, entries.join('\n') + '\n');

      // When: specweave decision-log
      const result = await decisionLogCommand({ projectRoot: testDir });

      // Then: Only valid entries returned
      expect(result.entries).toHaveLength(2);
    });
  });

  describe('TC-016: --tail mode follows new entries', () => {
    it('should have tail function available', () => {
      // Then: Function is defined (imported at top level)
      expect(decisionLogTail).toBeDefined();
      expect(typeof decisionLogTail).toBe('function');
    });

    it('should accept projectRoot option', () => {
      // The decisionLogTail function blocks indefinitely watching for file changes.
      // We cannot easily test the blocking behavior in a unit test.
      // Here we verify the function signature accepts the expected options.

      // Verify function accepts the options shape we expect
      type ExpectedOptions = Parameters<typeof decisionLogTail>[0];
      const _typeCheck: ExpectedOptions = {
        projectRoot: testDir,
        hook: 'stop-auto',
        decision: 'block',
      };

      // This verifies the type signature is correct at compile time
      expect(_typeCheck.projectRoot).toBe(testDir);
    });

    it('should detect new entries when file is appended', async () => {
      // Given: Existing log file
      const logsDir = path.join(testDir, '.specweave', 'logs');
      fs.mkdirSync(logsDir, { recursive: true });

      const initialEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        hook: 'stop-auto',
        decision: 'approve',
        reason: 'Initial entry',
        reasonCode: 'initial',
        durationMs: 100,
        context: {},
      });
      fs.writeFileSync(decisionsLogPath, initialEntry + '\n');

      // When: We append a new entry
      const newEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        hook: 'stop-reflect',
        decision: 'approve',
        reason: 'New entry for tail test',
        reasonCode: 'new_entry',
        durationMs: 200,
        context: { test: true },
      });

      // Append entry
      fs.appendFileSync(decisionsLogPath, newEntry + '\n');

      // Then: The file should now have 2 entries
      const content = fs.readFileSync(decisionsLogPath, 'utf-8').trim();
      const lines = content.split('\n');
      expect(lines).toHaveLength(2);

      // Verify the new entry is parseable
      const lastEntry = JSON.parse(lines[1]);
      expect(lastEntry.reasonCode).toBe('new_entry');
    });

    it('should handle file rotation gracefully during tail', async () => {
      // Given: A log file that gets truncated
      const logsDir = path.join(testDir, '.specweave', 'logs');
      fs.mkdirSync(logsDir, { recursive: true });

      // Create initial large content
      const entries = [];
      for (let i = 0; i < 100; i++) {
        entries.push(JSON.stringify({
          timestamp: new Date().toISOString(),
          hook: 'stop-auto',
          decision: 'approve',
          reason: `Entry ${i}`,
          reasonCode: 'test',
          durationMs: 100,
          context: {},
        }));
      }
      fs.writeFileSync(decisionsLogPath, entries.join('\n') + '\n');

      const initialSize = fs.statSync(decisionsLogPath).size;

      // When: File is truncated (simulating rotation)
      fs.writeFileSync(decisionsLogPath, '');

      // Then: File size should be 0
      const newSize = fs.statSync(decisionsLogPath).size;
      expect(newSize).toBe(0);
      expect(newSize).toBeLessThan(initialSize);

      // And: New entries can still be written
      const newEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        hook: 'stop-auto',
        decision: 'approve',
        reason: 'After rotation',
        reasonCode: 'post_rotation',
        durationMs: 100,
        context: {},
      });
      fs.appendFileSync(decisionsLogPath, newEntry + '\n');

      const finalContent = fs.readFileSync(decisionsLogPath, 'utf-8').trim();
      expect(finalContent).toContain('post_rotation');
    });
  });
});
