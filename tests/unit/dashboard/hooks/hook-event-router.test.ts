import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HookEventRouter } from '../../../../src/dashboard/server/hooks/hook-event-router.js';
import type { HookEventStore } from '../../../../src/dashboard/server/hooks/hook-event-store.js';

function makeStubStore(): HookEventStore {
  return {
    addEvent: vi.fn(),
    updateAgent: vi.fn(),
    getEvents: vi.fn().mockReturnValue([]),
    getAgents: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({ totalEvents: 0, activeSessions: 0, activeAgents: 0 }),
    flush: vi.fn(),
    cleanup: vi.fn(),
    hydrate: vi.fn().mockResolvedValue(undefined),
  } as unknown as HookEventStore;
}

describe('HookEventRouter', () => {
  let tmpDir: string;
  let store: HookEventStore;
  let router: HookEventRouter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-router-test-'));
    store = makeStubStore();
    router = new HookEventRouter(store, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('calls registered handler and returns its result', async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { ok: true } });
    router.register('TestEvent', handler);
    const result = await router.handle('TestEvent', { sessionId: 'sess-1' });
    expect(handler).toHaveBeenCalledOnce();
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });

  it('returns 400 for unknown event name', async () => {
    const result = await router.handle('UnknownEvent', {});
    expect(result.status).toBe(400);
    expect(result.body).toHaveProperty('error');
    expect((result.body as { error: string }).error).toContain('Unknown event type');
  });

  it('isolates handler errors and returns 200', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('handler exploded'));
    router.register('FailEvent', handler);
    const result = await router.handle('FailEvent', { sessionId: 'sess-2' });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({});
  });

  it('logs errors to logPath when handler throws', async () => {
    const logDir = path.join(tmpDir, '.specweave', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    // Router logs to .specweave/logs/hooks.log relative to projectRoot
    const handler = vi.fn().mockRejectedValue(new Error('log this error'));
    router.register('LogEvent', handler);
    await router.handle('LogEvent', { sessionId: 'sess-3' });

    const logPath = path.join(tmpDir, '.specweave', 'logs', 'hooks.log');
    expect(fs.existsSync(logPath)).toBe(true);
    const logContent = fs.readFileSync(logPath, 'utf-8');
    expect(logContent).toContain('log this error');
  });

  it('stores event in store after handler completes', async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: {} });
    router.register('StoreEvent', handler);
    await router.handle('StoreEvent', { sessionId: 'sess-4' });
    expect(store.addEvent).toHaveBeenCalledOnce();
  });
});
