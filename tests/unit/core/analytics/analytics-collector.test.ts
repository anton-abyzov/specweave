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
      collector.trackCommand('/sw:do', { plugin: 'specweave' });

      expect(fs.existsSync(eventsFile)).toBe(true);

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.type).toBe('command');
      expect(event.name).toBe('/sw:do');
      expect(event.plugin).toBe('specweave');
      expect(event.success).toBe(true);
      expect(event.timestamp).toBeDefined();
    });

    it('should track command with error', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:done', {
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
      collector.trackCommand('/sw:validate', { duration: 1234 });

      const content = fs.readFileSync(eventsFile, 'utf-8').trim();
      const event = JSON.parse(content);

      expect(event.duration).toBe(1234);
    });

    it('should track command with increment context', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do', { increment: '0001-test' });

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

    it('should read multiple events', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');
      collector.trackCommand('/sw:progress');
      collector.trackSkill('spec-generator');

      const events = collector.readEvents();
      expect(events).toHaveLength(3);
      expect(events[0].name).toBe('/sw:do');
      expect(events[1].name).toBe('/sw:progress');
      expect(events[2].name).toBe('spec-generator');
    });
  });

  describe('readEventsFiltered()', () => {
    it('should filter by type', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do');
      collector.trackSkill('planner');
      collector.trackAgent('architect');

      const commands = collector.readEventsFiltered({ type: 'command' });
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('command');
    });

    it('should filter by plugin', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.trackCommand('/sw:do', { plugin: 'specweave' });
      collector.trackCommand('/sw-github:sync', { plugin: 'specweave-github' });

      const githubEvents = collector.readEventsFiltered({ plugin: 'specweave-github' });
      expect(githubEvents).toHaveLength(1);
      expect(githubEvents[0].name).toBe('/sw-github:sync');
    });
  });

  describe('enable/disable', () => {
    it('should not track events when disabled', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.disable();
      collector.trackCommand('/sw:do');

      expect(fs.existsSync(eventsFile)).toBe(false);
    });

    it('should resume tracking when re-enabled', () => {
      const collector = AnalyticsCollector.getInstance(testDir);
      collector.disable();
      collector.enable();
      collector.trackCommand('/sw:do');

      expect(fs.existsSync(eventsFile)).toBe(true);
    });
  });

  describe('convenience functions', () => {
    it('trackCommand should work', () => {
      // Need to set project root first
      AnalyticsCollector.getInstance(testDir);
      trackCommand('/sw:test');

      const events = AnalyticsCollector.getInstance().readEvents();
      expect(events).toHaveLength(1);
    });

    it('trackSkill should work', () => {
      AnalyticsCollector.getInstance(testDir);
      trackSkill('test-skill');

      const events = AnalyticsCollector.getInstance().readEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('skill');
    });

    it('trackAgent should work', () => {
      AnalyticsCollector.getInstance(testDir);
      trackAgent('test-agent');

      const events = AnalyticsCollector.getInstance().readEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('agent');
    });
  });
});
