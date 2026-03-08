import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HookEventStore } from '../../../../src/dashboard/server/hooks/hook-event-store.js';
import type { HookEvent } from '../../../../src/dashboard/types.js';

function makeEvent(overrides: Partial<HookEvent> = {}): HookEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    eventName: 'PostToolUse',
    sessionId: 'sess-1',
    timestamp: new Date().toISOString(),
    payload: {},
    ...overrides,
  };
}

describe('HookEventStore', () => {
  let tmpDir: string;
  let store: HookEventStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-store-test-'));
    store = new HookEventStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stores events in-memory keyed by sessionId', () => {
    const event = makeEvent({ sessionId: 'sess-A' });
    store.addEvent(event);
    const events = store.getEvents({ sessionId: 'sess-A' });
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(event.id);
  });

  it('appends events to JSONL file', () => {
    store.addEvent(makeEvent());
    store.addEvent(makeEvent());
    const jsonlPath = path.join(tmpDir, '.specweave', 'state', 'hooks', 'events.jsonl');
    expect(fs.existsSync(jsonlPath)).toBe(true);
    const lines = fs.readFileSync(jsonlPath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(() => JSON.parse(lines[0])).not.toThrow();
    expect(() => JSON.parse(lines[1])).not.toThrow();
  });

  it('filters events by eventType', () => {
    store.addEvent(makeEvent({ eventName: 'PreToolUse' }));
    store.addEvent(makeEvent({ eventName: 'PostToolUse' }));
    store.addEvent(makeEvent({ eventName: 'PreToolUse' }));
    const pre = store.getEvents({ eventType: 'PreToolUse' });
    expect(pre).toHaveLength(2);
    const post = store.getEvents({ eventType: 'PostToolUse' });
    expect(post).toHaveLength(1);
  });

  it('limits results with limit option', () => {
    for (let i = 0; i < 10; i++) {
      store.addEvent(makeEvent());
    }
    const limited = store.getEvents({ limit: 3 });
    expect(limited).toHaveLength(3);
  });

  it('returns correct stats', () => {
    store.addEvent(makeEvent({ sessionId: 'a' }));
    store.addEvent(makeEvent({ sessionId: 'b' }));
    store.addEvent(makeEvent({ sessionId: 'a' }));
    const stats = store.getStats();
    expect(stats.totalEvents).toBe(3);
    expect(stats.activeSessions).toBe(2);
  });

  it('updates agent records', () => {
    store.updateAgent({
      agentId: 'agent-1',
      agentType: 'explorer',
      sessionId: 'sess-1',
      startedAt: '2026-03-07T10:00:00Z',
    });
    const agents = store.getAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0].agentId).toBe('agent-1');
    expect(agents[0].stoppedAt).toBeUndefined();
  });

  it('updates agent stoppedAt and computes duration', () => {
    store.updateAgent({
      agentId: 'agent-2',
      agentType: 'coder',
      sessionId: 'sess-1',
      startedAt: '2026-03-07T10:00:00Z',
    });
    store.updateAgent({
      agentId: 'agent-2',
      agentType: 'coder',
      sessionId: 'sess-1',
      stoppedAt: '2026-03-07T10:05:00Z',
    });
    const agents = store.getAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0].stoppedAt).toBe('2026-03-07T10:05:00Z');
    expect(agents[0].durationMs).toBe(300000);
  });

  it('filters agents by status', () => {
    store.updateAgent({ agentId: 'a1', agentType: 'x', sessionId: 's1', startedAt: '2026-03-07T10:00:00Z' });
    store.updateAgent({ agentId: 'a2', agentType: 'y', sessionId: 's1', startedAt: '2026-03-07T10:00:00Z', stoppedAt: '2026-03-07T10:01:00Z' });
    const running = store.getAgents({ status: 'running' });
    expect(running).toHaveLength(1);
    expect(running[0].agentId).toBe('a1');
    const stopped = store.getAgents({ status: 'stopped' });
    expect(stopped).toHaveLength(1);
    expect(stopped[0].agentId).toBe('a2');
  });

  it('rotates JSONL when exceeding 10MB', () => {
    const jsonlPath = path.join(tmpDir, '.specweave', 'state', 'hooks', 'events.jsonl');
    const dir = path.dirname(jsonlPath);
    fs.mkdirSync(dir, { recursive: true });
    // Write a 10MB+ file to trigger rotation
    const bigData = 'x'.repeat(10_485_761);
    fs.writeFileSync(jsonlPath, bigData);

    store.addEvent(makeEvent());
    // Old file should be rotated
    const files = fs.readdirSync(dir).filter(f => f.startsWith('events'));
    expect(files.length).toBeGreaterThanOrEqual(2);
    // New events.jsonl should be small
    const newContent = fs.readFileSync(jsonlPath, 'utf-8');
    expect(newContent.length).toBeLessThan(1000);
  });

  it('flush is callable without error', () => {
    store.addEvent(makeEvent());
    expect(() => store.flush()).not.toThrow();
  });
});
