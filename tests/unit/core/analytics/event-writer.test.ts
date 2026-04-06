import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  appendAnalyticsEvent,
  extractPlugin,
  writeSkillEvent,
  writeAgentEvent,
} from '../../../../src/core/analytics/event-writer.js';
import type { AnalyticsEvent } from '../../../../src/core/analytics/types.js';

describe('core/analytics/event-writer', () => {
  let tmpDir: string;
  let analyticsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-analytics-'));
    analyticsDir = path.join(tmpDir, 'analytics');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('extractPlugin', () => {
    it('should extract "specweave" from "sw:" prefix', () => {
      expect(extractPlugin('sw:pm')).toBe('specweave');
    });

    it('should extract plugin name from non-sw prefix', () => {
      expect(extractPlugin('frontend-design:component')).toBe('frontend-design');
    });

    it('should default to "specweave" when no colon', () => {
      expect(extractPlugin('my-skill')).toBe('specweave');
    });
  });

  // TC-011
  describe('appendAnalyticsEvent', () => {
    it('should append event to events.jsonl with valid JSON', () => {
      const event: AnalyticsEvent = {
        timestamp: '2026-01-01T00:00:00Z',
        type: 'skill',
        name: 'sw:pm',
        success: true,
        plugin: 'specweave',
      };

      const result = appendAnalyticsEvent(analyticsDir, event);
      expect(result.written).toBe(1);

      const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.type).toBe('skill');
      expect(parsed.name).toBe('sw:pm');
      expect(parsed.timestamp).toBe('2026-01-01T00:00:00Z');
    });

    // TC-012
    it('should create analytics directory if it does not exist', () => {
      const missingDir = path.join(tmpDir, 'deep', 'nested', 'analytics');
      const event: AnalyticsEvent = {
        timestamp: '2026-01-01T00:00:00Z',
        type: 'agent',
        name: 'explorer',
        success: true,
      };

      const result = appendAnalyticsEvent(missingDir, event);
      expect(result.written).toBe(1);
      expect(fs.existsSync(path.join(missingDir, 'events.jsonl'))).toBe(true);
    });

    it('should append multiple events as separate lines', () => {
      const event1: AnalyticsEvent = { timestamp: 't1', type: 'skill', name: 'a', success: true };
      const event2: AnalyticsEvent = { timestamp: 't2', type: 'agent', name: 'b', success: true };

      appendAnalyticsEvent(analyticsDir, event1);
      appendAnalyticsEvent(analyticsDir, event2);

      const lines = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8').trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).name).toBe('a');
      expect(JSON.parse(lines[1]).name).toBe('b');
    });
  });

  describe('writeSkillEvent', () => {
    it('should write skill event with auto-extracted plugin', () => {
      writeSkillEvent(analyticsDir, 'sw:pm');
      const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.type).toBe('skill');
      expect(parsed.plugin).toBe('specweave');
    });

    it('should use provided plugin over auto-extracted', () => {
      writeSkillEvent(analyticsDir, 'sw:pm', 'custom-plugin');
      const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.plugin).toBe('custom-plugin');
    });
  });

  describe('writeAgentEvent', () => {
    it('should write agent event', () => {
      writeAgentEvent(analyticsDir, 'general');
      const content = fs.readFileSync(path.join(analyticsDir, 'events.jsonl'), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.type).toBe('agent');
      expect(parsed.name).toBe('general');
      expect(parsed.plugin).toBe('specweave');
    });
  });
});
