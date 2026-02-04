/**
 * Analytics CLI Command Tests
 *
 * Tests for the `specweave analytics` CLI command.
 * Following TDD RED phase - writing failing tests first.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AnalyticsCollector } from '../../../../src/core/analytics/analytics-collector.js';

// The command we're testing (doesn't exist yet - RED phase)
// This import will fail until we implement it
import { analyticsCommand } from '../../../../src/cli/commands/analytics.js';

describe('analyticsCommand', () => {
  let testDir: string;
  let analyticsDir: string;
  let eventsFile: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analytics-cmd-test-'));
    analyticsDir = path.join(testDir, '.specweave', 'state', 'analytics');
    eventsFile = path.join(analyticsDir, 'events.jsonl');

    // Create the directory structure
    fs.mkdirSync(analyticsDir, { recursive: true });

    // Reset the singleton for clean tests
    AnalyticsCollector.reset();

    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
    AnalyticsCollector.reset();
    vi.restoreAllMocks();
  });

  describe('default display', () => {
    it('should show summary when no events exist', async () => {
      const result = await analyticsCommand({ projectRoot: testDir });

      expect(result).toBeDefined();
      expect(result.totalEvents).toBe(0);
    });

    it('should show summary with events', async () => {
      // Create some test events
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do', { plugin: 'specweave' });
      collector.trackCommand('/sw:progress');
      collector.trackSkill('increment-planner', { plugin: 'specweave' });
      collector.trackAgent('frontend-architect');

      const result = await analyticsCommand({ projectRoot: testDir });

      expect(result.totalEvents).toBe(4);
      expect(result.topCommands.length).toBeGreaterThan(0);
      expect(result.topSkills.length).toBeGreaterThan(0);
      expect(result.topAgents.length).toBeGreaterThan(0);
    });
  });

  describe('--export option', () => {
    it('should export as JSON when format is json', async () => {
      // Create test events
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');
      collector.trackSkill('planner');

      const result = await analyticsCommand({
        projectRoot: testDir,
        export: 'json',
      });

      expect(result.exported).toBe(true);
      expect(result.format).toBe('json');
      expect(result.filename).toMatch(/analytics-export-.*\.json$/);
    });

    it('should export as CSV when format is csv', async () => {
      // Create test events
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');

      const result = await analyticsCommand({
        projectRoot: testDir,
        export: 'csv',
      });

      expect(result.exported).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.filename).toMatch(/analytics-export-.*\.csv$/);
    });
  });

  describe('--since option', () => {
    it('should filter events by date', async () => {
      // Create test events
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');
      collector.trackCommand('/sw:progress');

      // Filter to last 7 days
      const result = await analyticsCommand({
        projectRoot: testDir,
        since: '7d',
      });

      expect(result.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it('should support various time formats', async () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');

      // Should not throw for valid formats
      await expect(analyticsCommand({ projectRoot: testDir, since: '24h' })).resolves.toBeDefined();
      await expect(analyticsCommand({ projectRoot: testDir, since: '7d' })).resolves.toBeDefined();
      await expect(analyticsCommand({ projectRoot: testDir, since: '30d' })).resolves.toBeDefined();
    });
  });

  describe('--type option', () => {
    it('should filter by event type', async () => {
      // Create mixed events
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');
      collector.trackSkill('planner');
      collector.trackAgent('architect');

      // Filter to commands only
      const result = await analyticsCommand({
        projectRoot: testDir,
        type: 'command',
      });

      expect(result.totalEvents).toBe(1);
    });
  });

  describe('--json option', () => {
    it('should output raw JSON for scripting', async () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');

      const result = await analyticsCommand({
        projectRoot: testDir,
        json: true,
      });

      expect(result.jsonOutput).toBe(true);
      expect(typeof result.data).toBe('object');
    });
  });
});
