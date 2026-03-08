import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HookEventStore } from '../../../../src/dashboard/server/hooks/hook-event-store.js';

describe('HookEventStore hydration and cleanup', () => {
  let tmpDir: string;
  const hooksDir = () => path.join(tmpDir, '.specweave', 'state', 'hooks');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-hydrate-test-'));
    fs.mkdirSync(hooksDir(), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('hydrates events from existing JSONL', async () => {
    const events = [
      { id: '1', eventName: 'PreToolUse', sessionId: 's1', timestamp: '2026-03-07T10:00:00Z', payload: {} },
      { id: '2', eventName: 'PostToolUse', sessionId: 's1', timestamp: '2026-03-07T10:01:00Z', payload: {} },
      { id: '3', eventName: 'Stop', sessionId: 's2', timestamp: '2026-03-07T10:02:00Z', payload: {} },
    ];
    fs.writeFileSync(
      path.join(hooksDir(), 'events.jsonl'),
      events.map(e => JSON.stringify(e)).join('\n') + '\n',
    );

    const store = new HookEventStore(tmpDir);
    await store.hydrate();

    expect(store.getEvents()).toHaveLength(3);
    expect(store.getEvents({ sessionId: 's1' })).toHaveLength(2);
    expect(store.getEvents({ sessionId: 's2' })).toHaveLength(1);
    expect(store.getStats().totalEvents).toBe(3);
  });

  it('skips malformed JSONL lines without throwing', async () => {
    const content = [
      JSON.stringify({ id: '1', eventName: 'PreToolUse', sessionId: 's1', timestamp: '2026-03-07T10:00:00Z', payload: {} }),
      'this is not valid json',
      JSON.stringify({ id: '2', eventName: 'PostToolUse', sessionId: 's1', timestamp: '2026-03-07T10:01:00Z', payload: {} }),
      '',
    ].join('\n');
    fs.writeFileSync(path.join(hooksDir(), 'events.jsonl'), content);

    const store = new HookEventStore(tmpDir);
    await store.hydrate();
    expect(store.getEvents()).toHaveLength(2);
  });

  it('hydrates agents from agents.jsonl', async () => {
    const agents = [
      { agentId: 'a1', agentType: 'explorer', sessionId: 's1', startedAt: '2026-03-07T10:00:00Z' },
      { agentId: 'a2', agentType: 'coder', sessionId: 's1', startedAt: '2026-03-07T10:00:00Z', stoppedAt: '2026-03-07T10:05:00Z', durationMs: 300000 },
    ];
    fs.writeFileSync(
      path.join(hooksDir(), 'agents.jsonl'),
      agents.map(a => JSON.stringify(a)).join('\n') + '\n',
    );

    const store = new HookEventStore(tmpDir);
    await store.hydrate();

    const allAgents = store.getAgents();
    expect(allAgents).toHaveLength(2);
    expect(store.getAgents({ status: 'running' })).toHaveLength(1);
    expect(store.getAgents({ status: 'stopped' })).toHaveLength(1);
  });

  it('deletes JSONL files older than 30 days', () => {
    const oldTs = Date.now() - 31 * 86400 * 1000;
    const oldFile = path.join(hooksDir(), `events-${oldTs}.jsonl`);
    fs.writeFileSync(oldFile, '{}');

    const store = new HookEventStore(tmpDir);
    store.cleanup();

    expect(fs.existsSync(oldFile)).toBe(false);
  });

  it('keeps JSONL files newer than 30 days', () => {
    const recentTs = Date.now() - 5 * 86400 * 1000;
    const recentFile = path.join(hooksDir(), `events-${recentTs}.jsonl`);
    fs.writeFileSync(recentFile, '{}');

    const store = new HookEventStore(tmpDir);
    store.cleanup();

    expect(fs.existsSync(recentFile)).toBe(true);
  });

  it('handles missing JSONL files gracefully', async () => {
    const store = new HookEventStore(tmpDir);
    // No events.jsonl or agents.jsonl exist
    await expect(store.hydrate()).resolves.toBeUndefined();
    expect(store.getEvents()).toHaveLength(0);
  });
});
