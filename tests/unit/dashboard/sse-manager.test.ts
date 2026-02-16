/**
 * Unit Test: SSEManager
 *
 * Tests broadcast destroyed-connection cleanup, heartbeat lifecycle,
 * and connection management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSEManager } from '../../../src/dashboard/server/sse-manager.js';
import { EventEmitter } from 'events';

/** Minimal mock ServerResponse for SSE testing */
function createMockResponse(opts: { destroyed?: boolean } = {}): any {
  const emitter = new EventEmitter();
  const chunks: string[] = [];
  return {
    destroyed: opts.destroyed ?? false,
    writeHead: vi.fn(),
    write: vi.fn((chunk: string) => { chunks.push(chunk); return true; }),
    end: vi.fn(),
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
    _chunks: chunks,
  };
}

describe('SSEManager', () => {
  let manager: SSEManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new SSEManager(30_000);
  });

  afterEach(() => {
    manager.closeAll();
    vi.useRealTimers();
  });

  it('should add a connection and send heartbeat on connect', () => {
    const res = createMockResponse();
    manager.addConnection(res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }));
    expect(manager.connectionCount).toBe(1);
    // Initial heartbeat sent
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: heartbeat'));
  });

  it('should broadcast to all connected clients', () => {
    const res1 = createMockResponse();
    const res2 = createMockResponse();
    manager.addConnection(res1);
    manager.addConnection(res2);

    manager.broadcast('increment-update', { id: '0001' });

    expect(res1.write).toHaveBeenCalledWith(expect.stringContaining('event: increment-update'));
    expect(res2.write).toHaveBeenCalledWith(expect.stringContaining('event: increment-update'));
  });

  it('should clean up destroyed connections during broadcast', () => {
    const alive = createMockResponse();
    const dead = createMockResponse({ destroyed: true });
    manager.addConnection(alive);
    manager.addConnection(dead);

    expect(manager.connectionCount).toBe(2);

    manager.broadcast('notification', { title: 'test' });

    // Dead connection should have been removed
    expect(manager.connectionCount).toBe(1);
    // Dead connection should NOT have received the message
    // (write was not called after addConnection's initial heartbeat)
    expect(dead.write).toHaveBeenCalledTimes(0); // initial send checks destroyed too
  });

  it('should remove connection on close event', () => {
    const res = createMockResponse();
    manager.addConnection(res);
    expect(manager.connectionCount).toBe(1);

    res.emit('close');
    expect(manager.connectionCount).toBe(0);
  });

  it('should start heartbeat on first connection and stop when empty', () => {
    const res = createMockResponse();
    manager.addConnection(res);

    // Advance past one heartbeat interval
    vi.advanceTimersByTime(30_000);

    // Heartbeat should have been sent (initial + 1 interval)
    const heartbeatCalls = res.write.mock.calls.filter(
      (call: string[]) => call[0].includes('event: heartbeat')
    );
    expect(heartbeatCalls.length).toBe(2); // initial + interval

    // Remove connection
    res.emit('close');

    // Advance again — heartbeat should stop since no connections
    vi.advanceTimersByTime(30_000);
    const afterCalls = res.write.mock.calls.filter(
      (call: string[]) => call[0].includes('event: heartbeat')
    );
    expect(afterCalls.length).toBe(2); // no new heartbeats
  });

  it('should close all connections with closeAll', () => {
    const res1 = createMockResponse();
    const res2 = createMockResponse();
    manager.addConnection(res1);
    manager.addConnection(res2);

    manager.closeAll();

    expect(res1.end).toHaveBeenCalled();
    expect(res2.end).toHaveBeenCalled();
    expect(manager.connectionCount).toBe(0);
  });

  it('should format SSE messages correctly', () => {
    const res = createMockResponse();
    manager.addConnection(res);

    manager.broadcast('sync-update', { platform: 'github' });

    const lastCall = res.write.mock.calls[res.write.mock.calls.length - 1][0];
    expect(lastCall).toBe('event: sync-update\ndata: {"platform":"github"}\n\n');
  });
});
