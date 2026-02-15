import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DashboardDataAggregator } from '../../../src/dashboard/server/data/dashboard-data-aggregator.js';

describe('DashboardDataAggregator - Skill & Agent tracking', () => {
  let testDir: string;
  let eventsDir: string;
  let eventsPath: string;
  let aggregator: DashboardDataAggregator;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-agg-test-'));
    eventsDir = path.join(testDir, '.specweave', 'state', 'analytics');
    fs.mkdirSync(eventsDir, { recursive: true });
    eventsPath = path.join(eventsDir, 'events.jsonl');
    aggregator = new DashboardDataAggregator(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function writeEvents(events: Record<string, unknown>[]): void {
    fs.writeFileSync(eventsPath, events.map(e => JSON.stringify(e)).join('\n'));
  }

  describe('skill event aggregation', () => {
    it('should aggregate events with type "skill" into topSkills', async () => {
      writeEvents([
        { name: 'sw:pm', type: 'skill', success: true, timestamp: '2026-02-15T10:00:00Z', plugin: 'specweave' },
        { name: 'sw:pm', type: 'skill', success: false, timestamp: '2026-02-15T11:00:00Z', plugin: 'specweave' },
        { name: 'sw-frontend:frontend-architect', type: 'skill', success: true, timestamp: '2026-02-15T12:00:00Z', plugin: 'sw-frontend' },
      ]);

      const result = await aggregator.getAnalyticsSummary();

      expect(result.topSkills).toHaveLength(2);
      const pm = result.topSkills.find(s => s.name === 'sw:pm');
      expect(pm).toBeDefined();
      expect(pm!.count).toBe(2);
      expect(pm!.successCount).toBe(1);
      expect(pm!.failureCount).toBe(1);
      expect(pm!.plugin).toBe('specweave');

      const frontend = result.topSkills.find(s => s.name === 'sw-frontend:frontend-architect');
      expect(frontend).toBeDefined();
      expect(frontend!.count).toBe(1);
      expect(frontend!.plugin).toBe('sw-frontend');
    });
  });

  describe('agent event aggregation', () => {
    it('should aggregate events with type "agent" into topAgents', async () => {
      writeEvents([
        { name: 'Explore', type: 'agent', success: true, timestamp: '2026-02-15T10:00:00Z', plugin: 'specweave' },
        { name: 'Explore', type: 'agent', success: true, timestamp: '2026-02-15T11:00:00Z', plugin: 'specweave' },
        { name: 'Plan', type: 'agent', success: true, timestamp: '2026-02-15T12:00:00Z', plugin: 'specweave' },
      ]);

      const result = await aggregator.getAnalyticsSummary();

      expect(result.topAgents).toHaveLength(2);
      expect(result.topAgents[0].name).toBe('Explore');
      expect(result.topAgents[0].count).toBe(2);
      expect(result.topAgents[1].name).toBe('Plan');
      expect(result.topAgents[1].count).toBe(1);
    });
  });

  describe('event type separation', () => {
    it('should NOT count skill or agent events in topCommands', async () => {
      writeEvents([
        { name: '/sw:do', type: 'command', success: true, timestamp: '2026-02-15T10:00:00Z' },
        { name: 'sw:pm', type: 'skill', success: true, timestamp: '2026-02-15T11:00:00Z', plugin: 'specweave' },
        { name: 'Explore', type: 'agent', success: true, timestamp: '2026-02-15T12:00:00Z', plugin: 'specweave' },
      ]);

      const result = await aggregator.getAnalyticsSummary();

      expect(result.topCommands).toHaveLength(1);
      expect(result.topCommands[0].name).toBe('/sw:do');
    });

    it('should correctly separate mixed command, skill, and agent events', async () => {
      writeEvents([
        { name: '/sw:do', type: 'command', success: true, timestamp: '2026-02-15T10:00:00Z' },
        { name: '/sw:pm', type: 'command', success: true, timestamp: '2026-02-15T10:01:00Z' },
        { name: 'sw:pm', type: 'skill', success: true, timestamp: '2026-02-15T10:02:00Z', plugin: 'specweave' },
        { name: 'sw:do', type: 'skill', success: true, timestamp: '2026-02-15T10:03:00Z', plugin: 'specweave' },
        { name: 'Explore', type: 'agent', success: true, timestamp: '2026-02-15T10:04:00Z', plugin: 'specweave' },
      ]);

      const result = await aggregator.getAnalyticsSummary();

      expect(result.totalEvents).toBe(5);
      expect(result.topCommands).toHaveLength(2);
      expect(result.topSkills).toHaveLength(2);
      expect(result.topAgents).toHaveLength(1);
    });
  });

  describe('backward compatibility', () => {
    it('should process existing command-only events without false positives', async () => {
      writeEvents([
        { name: '/sw:do', type: 'command', success: true, timestamp: '2026-02-15T10:00:00Z', plugin: 'specweave' },
        { name: '/sw:auto', type: 'command', success: true, timestamp: '2026-02-15T11:00:00Z', plugin: 'specweave' },
      ]);

      const result = await aggregator.getAnalyticsSummary();

      expect(result.totalEvents).toBe(2);
      expect(result.topCommands).toHaveLength(2);
      // Commands with /sw: prefix should NOT appear as skills when type is "command"
      expect(result.topSkills).toHaveLength(0);
      expect(result.topAgents).toHaveLength(0);
    });
  });

  describe('getSkillUsage()', () => {
    it('should return SkillUsage array from skill events', async () => {
      writeEvents([
        { name: 'sw:pm', type: 'skill', success: true, timestamp: '2026-02-15T10:00:00Z', plugin: 'specweave' },
        { name: 'sw:pm', type: 'skill', success: false, timestamp: '2026-02-15T11:00:00Z', plugin: 'specweave' },
      ]);

      const skills = await aggregator.getSkillUsage();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('sw:pm');
      expect(skills[0].plugin).toBe('specweave');
      expect(skills[0].count).toBe(2);
      expect(skills[0].successCount).toBe(1);
      expect(skills[0].failureCount).toBe(1);
    });
  });

  describe('contract: event types match track-analytics.sh', () => {
    it('should use the same type strings as track-analytics.sh produces', () => {
      const scriptPath = path.resolve(
        path.join(__dirname, '../../../plugins/specweave/scripts/track-analytics.sh')
      );
      const script = fs.readFileSync(scriptPath, 'utf-8');

      // track-analytics.sh documents valid types in its Usage comment
      expect(script).toContain('bash track-analytics.sh command');
      expect(script).toContain('bash track-analytics.sh skill');
      expect(script).toContain('bash track-analytics.sh agent');
    });
  });
});
