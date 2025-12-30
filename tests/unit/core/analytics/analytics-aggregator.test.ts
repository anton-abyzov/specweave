import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AnalyticsAggregator } from '../../../../src/core/analytics/analytics-aggregator.js';
import { AnalyticsCollector } from '../../../../src/core/analytics/analytics-collector.js';

describe('AnalyticsAggregator', () => {
  let testDir: string;
  let collector: AnalyticsCollector;
  let aggregator: AnalyticsAggregator;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analytics-agg-test-'));
    AnalyticsCollector.reset();
    collector = AnalyticsCollector.getInstance(testDir);
    aggregator = new AnalyticsAggregator(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
    AnalyticsCollector.reset();
  });

  describe('getSummary()', () => {
    it('should return empty summary when no events', () => {
      const summary = aggregator.getSummary();

      expect(summary.totalEvents).toBe(0);
      expect(summary.topCommands).toEqual([]);
      expect(summary.topSkills).toEqual([]);
      expect(summary.topAgents).toEqual([]);
      expect(summary.successRate).toBe(100);
    });

    it('should aggregate commands correctly', () => {
      collector.trackCommand('/sw:do');
      collector.trackCommand('/sw:do');
      collector.trackCommand('/sw:do');
      collector.trackCommand('/sw:progress');
      collector.trackCommand('/sw:validate');

      const summary = aggregator.getSummary();

      expect(summary.totalEvents).toBe(5);
      expect(summary.topCommands[0].name).toBe('/sw:do');
      expect(summary.topCommands[0].count).toBe(3);
    });

    it('should aggregate skills correctly', () => {
      collector.trackSkill('planner', { plugin: 'specweave' });
      collector.trackSkill('planner', { plugin: 'specweave' });
      collector.trackSkill('generator', { plugin: 'specweave' });

      const summary = aggregator.getSummary();

      expect(summary.topSkills[0].name).toBe('planner');
      expect(summary.topSkills[0].count).toBe(2);
      expect(summary.topSkills[1].name).toBe('generator');
      expect(summary.topSkills[1].count).toBe(1);
    });

    it('should calculate success rate correctly', () => {
      collector.trackCommand('/sw:do', { success: true });
      collector.trackCommand('/sw:do', { success: true });
      collector.trackCommand('/sw:do', { success: false });
      collector.trackCommand('/sw:validate', { success: false });

      const summary = aggregator.getSummary();

      expect(summary.successRate).toBe(50);
    });

    it('should calculate average duration', () => {
      collector.trackCommand('/sw:do', { duration: 100 });
      collector.trackCommand('/sw:do', { duration: 200 });
      collector.trackCommand('/sw:do', { duration: 300 });

      const summary = aggregator.getSummary();

      expect(summary.topCommands[0].avgDuration).toBe(200);
    });

    it('should respect limit option', () => {
      for (let i = 0; i < 20; i++) {
        collector.trackCommand(`/sw:cmd-${i}`);
      }

      const summary = aggregator.getSummary({ limit: 5 });

      expect(summary.topCommands).toHaveLength(5);
    });

    it('should group by daily summaries', () => {
      collector.trackCommand('/sw:do');
      collector.trackSkill('planner');
      collector.trackAgent('architect');

      const summary = aggregator.getSummary();

      expect(summary.dailySummaries.length).toBeGreaterThanOrEqual(1);
      const today = summary.dailySummaries[summary.dailySummaries.length - 1];
      expect(today.commands).toBe(1);
      expect(today.skills).toBe(1);
      expect(today.agents).toBe(1);
      expect(today.totalEvents).toBe(3);
    });
  });

  describe('export()', () => {
    beforeEach(() => {
      collector.trackCommand('/sw:do');
      collector.trackCommand('/sw:progress');
      collector.trackSkill('planner');
    });

    it('should export to JSON format', () => {
      const { filename, content } = aggregator.export('json');

      expect(filename).toMatch(/analytics-export-.*\.json/);

      const parsed = JSON.parse(content);
      expect(parsed.totalEvents).toBe(3);
      expect(parsed.topCommands).toBeDefined();
    });

    it('should export to CSV format', () => {
      const { filename, content } = aggregator.export('csv');

      expect(filename).toMatch(/analytics-export-.*\.csv/);
      expect(content).toContain('## Top Commands');
      expect(content).toContain('/sw:do');
    });
  });

  describe('caching', () => {
    it('should cache summary', () => {
      collector.trackCommand('/sw:do');

      const summary1 = aggregator.getSummaryWithCache();
      const summary2 = aggregator.getSummaryWithCache();

      // Should return same cached object
      expect(summary1.generatedAt).toBe(summary2.generatedAt);
    });

    it('should not cache when filters are applied', () => {
      collector.trackCommand('/sw:do');

      // First call with no filters - should cache
      const summary1 = aggregator.getSummaryWithCache();

      // Add another event
      collector.trackCommand('/sw:progress');

      // Filtered query should NOT use cache (sees new event)
      const summary2 = aggregator.getSummaryWithCache({ type: 'command' });
      expect(summary2.totalEvents).toBe(2);

      // Unfiltered query SHOULD use cache (still sees 1 event)
      const summary3 = aggregator.getSummaryWithCache();
      expect(summary3.totalEvents).toBe(1);
    });
  });

  describe('generateDailySummary()', () => {
    it('should write daily summary to file', () => {
      collector.trackCommand('/sw:do');
      aggregator.generateDailySummary();

      const summaryFile = path.join(
        testDir,
        '.specweave',
        'state',
        'analytics',
        'daily-summary.json'
      );

      expect(fs.existsSync(summaryFile)).toBe(true);

      const content = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
      expect(content.summaries).toBeDefined();
      expect(content.updatedAt).toBeDefined();
    });
  });
});
