/**
 * Event Queue Utility Tests
 *
 * TDD RED: Tests for the sync event queue that replaces direct sync calls.
 * Events are appended to .specweave/state/event-queue/pending.jsonl.
 *
 * Satisfies: AC-US1-01 (T-001)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';

import { queueSyncEvent, readPendingEvents, type SyncEvent } from '../../../src/core/sync/event-queue.js';

describe('Event Queue Utility', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(
      os.tmpdir(),
      `specweave-test-event-queue-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('queueSyncEvent()', () => {
    it('appends a JSON line to pending.jsonl', async () => {
      await queueSyncEvent(testDir, '0001', 'user-story.completed', { usId: 'US-001' });

      const pendingPath = path.join(testDir, '.specweave', 'state', 'event-queue', 'pending.jsonl');
      expect(existsSync(pendingPath)).toBe(true);

      const content = readFileSync(pendingPath, 'utf-8').trim();
      const event: SyncEvent = JSON.parse(content);

      expect(event.incrementId).toBe('0001');
      expect(event.eventType).toBe('user-story.completed');
      expect(event.metadata).toEqual({ usId: 'US-001' });
      expect(event.timestamp).toBeDefined();
    });

    it('creates directory if pending.jsonl does not exist', async () => {
      const pendingPath = path.join(testDir, '.specweave', 'state', 'event-queue', 'pending.jsonl');
      expect(existsSync(pendingPath)).toBe(false);

      await queueSyncEvent(testDir, '0002', 'increment.done');

      expect(existsSync(pendingPath)).toBe(true);
    });

    it('appends multiple events (one per line)', async () => {
      await queueSyncEvent(testDir, '0003', 'task.completed', { taskId: 'T-001' });
      await queueSyncEvent(testDir, '0003', 'task.completed', { taskId: 'T-002' });
      await queueSyncEvent(testDir, '0003', 'status.changed', { newStatus: 'completed' });

      const pendingPath = path.join(testDir, '.specweave', 'state', 'event-queue', 'pending.jsonl');
      const lines = readFileSync(pendingPath, 'utf-8').trim().split('\n');

      expect(lines).toHaveLength(3);

      const event1: SyncEvent = JSON.parse(lines[0]);
      const event2: SyncEvent = JSON.parse(lines[1]);
      const event3: SyncEvent = JSON.parse(lines[2]);

      expect(event1.metadata).toEqual({ taskId: 'T-001' });
      expect(event2.metadata).toEqual({ taskId: 'T-002' });
      expect(event3.eventType).toBe('status.changed');
    });

    it('works without metadata', async () => {
      await queueSyncEvent(testDir, '0004', 'increment.done');

      const pendingPath = path.join(testDir, '.specweave', 'state', 'event-queue', 'pending.jsonl');
      const content = readFileSync(pendingPath, 'utf-8').trim();
      const event: SyncEvent = JSON.parse(content);

      expect(event.incrementId).toBe('0004');
      expect(event.eventType).toBe('increment.done');
      expect(event.metadata).toBeUndefined();
    });

    it('generates valid ISO timestamp', async () => {
      await queueSyncEvent(testDir, '0005', 'status.changed');

      const pendingPath = path.join(testDir, '.specweave', 'state', 'event-queue', 'pending.jsonl');
      const content = readFileSync(pendingPath, 'utf-8').trim();
      const event: SyncEvent = JSON.parse(content);

      // ISO 8601 format check
      const parsed = new Date(event.timestamp);
      expect(parsed.toISOString()).toBe(event.timestamp);
    });
  });

  describe('readPendingEvents()', () => {
    it('returns empty array when no pending file exists', async () => {
      const events = await readPendingEvents(testDir);
      expect(events).toEqual([]);
    });

    it('reads all events from pending.jsonl', async () => {
      await queueSyncEvent(testDir, '0001', 'task.completed', { taskId: 'T-001' });
      await queueSyncEvent(testDir, '0001', 'increment.done');

      const events = await readPendingEvents(testDir);
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('task.completed');
      expect(events[1].eventType).toBe('increment.done');
    });
  });
});
