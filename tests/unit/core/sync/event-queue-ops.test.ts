import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  queueEvent,
  readPendingEvents,
  flushEventQueue,
} from '../../../../src/core/sync/event-queue-ops.js';

describe('core/sync/event-queue-ops', () => {
  let tmpDir: string;
  let stateDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-queue-'));
    stateDir = path.join(tmpDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('queueEvent', () => {
    it('should append an event to pending.jsonl', () => {
      const result = queueEvent(stateDir, 'task.updated', '0001-test', '2026-01-01T00:00:00Z');
      expect(result.queued).toBe(1);

      const pendingPath = path.join(stateDir, 'event-queue', 'pending.jsonl');
      const content = fs.readFileSync(pendingPath, 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.event).toBe('task.updated');
      expect(parsed.incrementId).toBe('0001-test');
    });

    it('should create the event-queue directory if missing', () => {
      queueEvent(stateDir, 'spec.updated', '0002-x', '2026-01-01T00:00:00Z');
      expect(fs.existsSync(path.join(stateDir, 'event-queue'))).toBe(true);
    });

    it('should include data when provided', () => {
      queueEvent(stateDir, 'status_changed', '0003-y', '2026-01-01T00:00:00Z', { field: 'status', value: 'active' });
      const content = fs.readFileSync(path.join(stateDir, 'event-queue', 'pending.jsonl'), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.data.field).toBe('status');
    });
  });

  describe('readPendingEvents', () => {
    it('should read all events from pending.jsonl', () => {
      const queueDir = path.join(stateDir, 'event-queue');
      fs.mkdirSync(queueDir, { recursive: true });
      const lines = [
        JSON.stringify({ event: 'a', incrementId: '0001' }),
        JSON.stringify({ event: 'b', incrementId: '0002' }),
      ];
      fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), lines.join('\n') + '\n');

      const events = readPendingEvents(stateDir);
      expect(events).toHaveLength(2);
      expect(events[0].incrementId).toBe('0001');
    });

    it('should return empty array when file does not exist', () => {
      const events = readPendingEvents(stateDir);
      expect(events).toHaveLength(0);
    });
  });

  // TC-009
  describe('flushEventQueue', () => {
    it('should deduplicate by increment ID and clear the file', () => {
      const queueDir = path.join(stateDir, 'event-queue');
      fs.mkdirSync(queueDir, { recursive: true });
      const lines = [
        JSON.stringify({ event: 'task.updated', incrementId: '0001' }),
        JSON.stringify({ event: 'spec.updated', incrementId: '0001' }),
        JSON.stringify({ event: 'task.updated', incrementId: '0002' }),
      ];
      fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), lines.join('\n') + '\n');

      const result = flushEventQueue(stateDir);
      expect(result.flushed).toBe(2);
      expect(result.incrementIds).toContain('0001');
      expect(result.incrementIds).toContain('0002');

      // File should be cleared
      const remaining = fs.readFileSync(path.join(queueDir, 'pending.jsonl'), 'utf8');
      expect(remaining).toBe('');
    });

    // TC-010
    it('should return flushed:0 when file is empty', () => {
      const queueDir = path.join(stateDir, 'event-queue');
      fs.mkdirSync(queueDir, { recursive: true });
      fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), '');

      const result = flushEventQueue(stateDir);
      expect(result.flushed).toBe(0);
      expect(result.incrementIds).toHaveLength(0);
    });

    it('should return flushed:0 when file does not exist', () => {
      const result = flushEventQueue(stateDir);
      expect(result.flushed).toBe(0);
    });
  });
});
