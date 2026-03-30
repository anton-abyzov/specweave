import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AnalyticsCollector,
  trackCommand,
  trackSkill,
  trackAgent,
} from '../../../../src/core/analytics/analytics-collector.js';

describe('AnalyticsCollector', () => {
  let testDir: string;
  let analyticsDir: string;
  let eventsFile: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analytics-test-'));
    analyticsDir = path.join(testDir, '.specweave', 'state', 'analytics');
    eventsFile = path.join(analyticsDir, 'events.jsonl');

    // Reset the singleton for clean tests
    AnalyticsCollector.reset();
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
    AnalyticsCollector.reset();
  });

  describe('getInstance()', () => {
    it('should return a singleton instance', () => {
      const instance1 = AnalyticsCollector.getInstance(testDir);
      const instance2 = AnalyticsCollector.getInstance(testDir);
      expect(instance1).toBe(instance2);
    });

    it('should create analytics directory on first track', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('test-command');
      expect(fs.existsSync(analyticsDir)).toBe(true);
    });
  });

  describe('trackCommand()', () => {
    it('should write command event to events.jsonl', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('sw:do', { plugin: 'specweave' });

      expect(fs.existsSync(eventsFile)).toBe(true);

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.type).toBe('command');
      expect(event.name).toBe('sw:do');
      expect(event.plugin).toBe('specweave');
      expect(event.success).toBe(true);
      expect(event.timestamp).toBeDefined();
    });

    it('should track command with error', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('sw:done', {
        success: false,
        error: 'Validation failed',
      });

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.success).toBe(false);
      expect(event.error).toBe('Validation failed');
    });

    it('should track command with duration', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('sw:validate', { duration: 1234 });

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.duration).toBe(1234);
    });

    it('should track command with increment context', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('sw:do', { increment: '0001-test' });

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.increment).toBe('0001-test');
    });
  });

  describe('trackSkill()', () => {
    it('should write skill event to events.jsonl', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackSkill('increment-planner', { plugin: 'specweave' });

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.type).toBe('skill');
      expect(event.name).toBe('increment-planner');
      expect(event.plugin).toBe('specweave');
    });
  });

  describe('trackAgent()', () => {
    it('should write agent event to events.jsonl', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackAgent('frontend-architect', {
        plugin: 'specweave-frontend',
        description: 'Design component architecture',
      });

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.type).toBe('agent');
      expect(event.name).toBe('frontend-architect');
      expect(event.plugin).toBe('specweave-frontend');
      expect(event.metadata?.description).toBe('Design component architecture');
    });
  });

  describe('readEvents()', () => {
    it('should return empty array when no events exist', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      const events = collector.readEvents();
      expect(events).toEqual([]);
    });

    it('should skip JSONL lines with missing required fields', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('valid-cmd');

      // Append malformed lines directly to the events file
      const malformedLines = [
        '{"foo": "bar"}',                                           // no required fields
        '{"type": "command", "name": "no-timestamp"}',              // missing timestamp
        '{"timestamp": "2026-01-01T00:00:00Z", "name": "no-type"}', // missing type
        '{"timestamp": "2026-01-01T00:00:00Z", "type": "command"}', // missing name
        '{"timestamp": "2026-01-01T00:00:00Z", "type": "invalid", "name": "bad-type", "success": true}', // invalid type
        'not-json-at-all',                                          // not even JSON
      ];
      fs.appendFileSync(eventsFile, malformedLines.join('\n') + '\n');

      const events = collector.readEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('valid-cmd');
    });

    it('should default success to true for legacy events without success field', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('first-cmd');

      // Append a legacy event without success field
      const legacyEvent = '{"timestamp":"2026-01-01T00:00:00Z","type":"skill","name":"sw:increment","plugin":"specweave"}';
      fs.appendFileSync(eventsFile, legacyEvent + '\n');

      const events = collector.readEvents();
      expect(events).toHaveLength(2);
      expect(events[1].success).toBe(true);
      expect(events[1].name).toBe('sw:increment');
    });

    it('should read multiple events', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('sw:do');
      collector.trackCommand('sw:progress');
      collector.trackSkill('pm');

      const events = collector.readEvents();
      expect(events).toHaveLength(3);
      expect(events[0].name).toBe('sw:do');
      expect(events[1].name).toBe('sw:progress');
      expect(events[2].name).toBe('pm');
    });
  });

  describe('readEventsFiltered()', () => {
    it('should filter by type', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('sw:do');
      collector.trackSkill('planner');
      collector.trackAgent('architect');

      const commands = collector.readEventsFiltered({ type: 'command' });
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('command');
    });

    it('should include events on the until date when date-only string provided', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      // Write events directly to control timestamps
      const events = [
        '{"timestamp":"2026-03-29T10:00:00.000Z","type":"command","name":"day-before","success":true}',
        '{"timestamp":"2026-03-30T08:00:00.000Z","type":"command","name":"morning","success":true}',
        '{"timestamp":"2026-03-30T14:00:00.000Z","type":"command","name":"afternoon","success":true}',
        '{"timestamp":"2026-03-31T10:00:00.000Z","type":"command","name":"day-after","success":true}',
      ];
      fs.mkdirSync(analyticsDir, { recursive: true });
      fs.writeFileSync(eventsFile, events.join('\n') + '\n');

      const filtered = collector.readEventsFiltered({ until: '2026-03-30' });
      expect(filtered).toHaveLength(3);
      expect(filtered.map(e => e.name)).toEqual(['day-before', 'morning', 'afternoon']);
    });

    it('should include events from the since date when date-only string provided', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      const events = [
        '{"timestamp":"2026-03-29T10:00:00.000Z","type":"command","name":"day-before","success":true}',
        '{"timestamp":"2026-03-30T08:00:00.000Z","type":"command","name":"morning","success":true}',
        '{"timestamp":"2026-03-30T14:00:00.000Z","type":"command","name":"afternoon","success":true}',
      ];
      fs.mkdirSync(analyticsDir, { recursive: true });
      fs.writeFileSync(eventsFile, events.join('\n') + '\n');

      const filtered = collector.readEventsFiltered({ since: '2026-03-30' });
      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.name)).toEqual(['morning', 'afternoon']);
    });

    it('should filter by plugin', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('sw:do', { plugin: 'specweave' });
      collector.trackCommand('sw:github-sync', { plugin: 'specweave' });

      const swEvents = collector.readEventsFiltered({ plugin: 'specweave' });
      expect(swEvents).toHaveLength(2);
      expect(swEvents.map(e => e.name)).toContain('sw:github-sync');
    });
  });

  describe('enable/disable', () => {
    it('should not track events when disabled', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.disable();
      collector.trackCommand('sw:do');

      expect(fs.existsSync(eventsFile)).toBe(false);
    });

    it('should recover after transient initialization failure', () => {
      // Create parent without the analytics subdirectory
      const readonlyDir = path.join(testDir, '.specweave', 'state');
      fs.mkdirSync(readonlyDir, { recursive: true });

      // Make it read-only to cause mkdirSync failure
      fs.chmodSync(readonlyDir, 0o444);

      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('should-fail-silently');

      // Event should NOT be written (init failed)
      expect(fs.existsSync(eventsFile)).toBe(false);

      // Restore permissions - now it should recover
      fs.chmodSync(readonlyDir, 0o755);
      collector.trackCommand('should-succeed');

      expect(fs.existsSync(eventsFile)).toBe(true);
      const events = collector.readEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('should-succeed');
    });

    it('should resume tracking when re-enabled', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.disable();
      collector.enable();
      collector.trackCommand('sw:do');

      expect(fs.existsSync(eventsFile)).toBe(true);
    });
  });

  describe('convenience functions', () => {
    it('trackCommand should work', () => {
      // Convenience functions use getInstance() which resolves to cwd.
      // Verify the event is tracked by checking the cwd-based instance.
      trackCommand('sw:test');

      const events = AnalyticsCollector.getInstance().readEvents();
      const lastEvent = events[events.length - 1];
      expect(lastEvent.name).toBe('sw:test');
      expect(lastEvent.type).toBe('command');
    });

    it('trackSkill should work', () => {
      trackSkill('test-skill');

      const events = AnalyticsCollector.getInstance().readEvents();
      const lastEvent = events[events.length - 1];
      expect(lastEvent.name).toBe('test-skill');
      expect(lastEvent.type).toBe('skill');
    });

    it('trackAgent should work', () => {
      trackAgent('test-agent');

      const events = AnalyticsCollector.getInstance().readEvents();
      const lastEvent = events[events.length - 1];
      expect(lastEvent.name).toBe('test-agent');
      expect(lastEvent.type).toBe('agent');
    });
  });

  describe('log rotation', () => {
    it('should rotate events file when it exceeds maxLogSizeBytes', () => {
      AnalyticsCollector.reset();
      fs.mkdirSync(analyticsDir, { recursive: true });

      // Seed with old events (beyond 30-day retention) so rotation archives them
      const oldTimestamp = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000).toISOString();
      const lines: string[] = [];
      for (let i = 0; i < 10; i++) {
        lines.push(`{"timestamp":"${oldTimestamp}","type":"command","name":"cmd-${i}","success":true,"plugin":"specweave"}`);
      }
      fs.writeFileSync(eventsFile, lines.join('\n') + '\n');

      const collector = AnalyticsCollector.getInstance(testDir, { maxLogSizeBytes: 200 });
      // This write triggers size check + rotation
      collector.trackCommand('trigger', { plugin: 'specweave' });

      // After rotation, old events should have been archived
      const archiveDir = path.join(analyticsDir, 'archive');
      expect(fs.existsSync(archiveDir)).toBe(true);

      const archiveFiles = fs.readdirSync(archiveDir);
      expect(archiveFiles.length).toBeGreaterThanOrEqual(1);
    });

    it('should preserve recent events and archive old ones during rotation', () => {
      AnalyticsCollector.reset();

      // Seed old events (61 days ago) and recent events directly
      fs.mkdirSync(analyticsDir, { recursive: true });
      const oldTimestamp = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000).toISOString();
      const recentTimestamp = new Date().toISOString();

      const events = [
        `{"timestamp":"${oldTimestamp}","type":"command","name":"old-cmd","success":true}`,
        `{"timestamp":"${recentTimestamp}","type":"command","name":"recent-cmd","success":true}`,
      ];
      fs.writeFileSync(eventsFile, events.join('\n') + '\n');

      // Create collector with tiny max size to trigger rotation on next write
      const collector = AnalyticsCollector.getInstance(testDir, { maxLogSizeBytes: 50 });
      collector.trackCommand('trigger-rotation');

      // Recent events should remain in main file
      const remaining = collector.readEvents();
      const names = remaining.map(e => e.name);
      expect(names).toContain('recent-cmd');
      expect(names).toContain('trigger-rotation');

      // Old events should be archived
      const archiveDir = path.join(analyticsDir, 'archive');
      if (fs.existsSync(archiveDir)) {
        const archiveFiles = fs.readdirSync(archiveDir);
        if (archiveFiles.length > 0) {
          const archiveContent = fs.readFileSync(path.join(archiveDir, archiveFiles[0]), 'utf-8');
          expect(archiveContent).toContain('old-cmd');
        }
      }
    });

    it('should skip malformed lines during rotation', () => {
      AnalyticsCollector.reset();
      fs.mkdirSync(analyticsDir, { recursive: true });

      const oldTimestamp = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000).toISOString();
      const events = [
        `{"timestamp":"${oldTimestamp}","type":"command","name":"old-valid","success":true}`,
        'this-is-not-json',
        `{"timestamp":"${new Date().toISOString()}","type":"command","name":"recent-valid","success":true}`,
      ];
      fs.writeFileSync(eventsFile, events.join('\n') + '\n');

      const collector = AnalyticsCollector.getInstance(testDir, { maxLogSizeBytes: 50 });
      collector.trackCommand('trigger');

      const remaining = collector.readEvents();
      const names = remaining.map(e => e.name);
      expect(names).toContain('recent-valid');
      expect(names).toContain('trigger');
      // Malformed line should be silently dropped
    });

    it('should use atomic rename during rotation (no leftover temp files)', () => {
      AnalyticsCollector.reset();
      fs.mkdirSync(analyticsDir, { recursive: true });

      // Write enough old data to trigger rotation
      const oldTimestamp = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000).toISOString();
      const lines: string[] = [];
      for (let i = 0; i < 20; i++) {
        lines.push(`{"timestamp":"${oldTimestamp}","type":"command","name":"old-${i}","success":true}`);
      }
      lines.push(`{"timestamp":"${new Date().toISOString()}","type":"command","name":"recent","success":true}`);
      fs.writeFileSync(eventsFile, lines.join('\n') + '\n');

      const collector = AnalyticsCollector.getInstance(testDir, { maxLogSizeBytes: 50 });
      collector.trackCommand('trigger');

      // After atomic rotation, no temp files should remain in the analytics dir
      const filesInDir = fs.readdirSync(analyticsDir);
      const tmpFiles = filesInDir.filter(f => f.includes('.tmp.'));
      expect(tmpFiles).toHaveLength(0);

      // The events file should exist and contain only recent events
      expect(fs.existsSync(eventsFile)).toBe(true);
      const remaining = collector.readEvents();
      const names = remaining.map(e => e.name);
      expect(names).toContain('recent');
      expect(names).toContain('trigger');
      // Old events should NOT be in the main file
      expect(names).not.toContain('old-0');
    });
  });

  describe('per-root isolation', () => {
    let testDir2: string;

    beforeEach(() => {
      testDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'analytics-test2-'));
    });

    afterEach(() => {
      fs.rmSync(testDir2, { recursive: true, force: true });
    });

    it('should return different instances for different project roots', () => {
      AnalyticsCollector.reset();
      const instance1 = AnalyticsCollector.getInstance(testDir);
      const instance2 = AnalyticsCollector.getInstance(testDir2);

      expect(instance1).not.toBe(instance2);
      expect(instance1.getAnalyticsDir()).not.toBe(instance2.getAnalyticsDir());
    });

    it('should isolate events between different roots', () => {
      AnalyticsCollector.reset();
      const collector1 = AnalyticsCollector.getInstance(testDir);
      const collector2 = AnalyticsCollector.getInstance(testDir2);

      collector1.trackCommand('root1-cmd');
      collector2.trackCommand('root2-cmd');

      expect(collector1.readEvents()).toHaveLength(1);
      expect(collector1.readEvents()[0].name).toBe('root1-cmd');
      expect(collector2.readEvents()).toHaveLength(1);
      expect(collector2.readEvents()[0].name).toBe('root2-cmd');
    });
  });
});
