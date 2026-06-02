/**
 * Live-write resilience tests (0865 T-007).
 *
 * The live closure write path (SyncCoordinator → close{Jira,Ado}…) must wrap
 * provider writes so that:
 *   - a TERMINAL failure (exhausted retries / non-retryable) enqueues a job into
 *     SyncRetryQueue that `sync-retry` can drain (the queue was structurally
 *     always-empty before this — no live path enqueued on failure);
 *   - a TRANSIENT 429 is retried with bounded backoff and, on eventual success,
 *     does NOT enqueue.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { resilientWrite } from './resilient-write.js';
import { SyncRetryQueue } from '../core/sync/sync-retry-queue.js';
import { syncRetryCommand } from '../cli/commands/sync-retry.js';

function httpError(status: number, message = `HTTP ${status}`): Error {
  return Object.assign(new Error(message), { status });
}

describe('resilientWrite — live external-write path', () => {
  let projectRoot: string;
  let statePath: string;
  let queue: SyncRetryQueue;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-resilience-'));
    statePath = path.join(projectRoot, '.specweave', 'state');
    await fs.mkdir(statePath, { recursive: true });
    queue = new SyncRetryQueue({ statePath });
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  // TC-016: terminal 5xx during a write → job enqueued into SyncRetryQueue
  it('TC-016: enqueues into SyncRetryQueue on terminal 5xx write failure', async () => {
    const write = vi.fn().mockRejectedValue(httpError(503, 'Service Unavailable'));

    const result = await resilientWrite(write, {
      retryQueue: queue,
      incrementId: '0865-test',
      provider: 'ado',
      featureId: 'FEAT-1',
      projectPath: projectRoot,
      projectName: 'specweave',
      retry: { maxRetries: 2, baseMs: 1, maxMs: 5 },
    });

    expect(result.ok).toBe(false);
    expect(result.enqueued).toBe(true);

    const entries = await queue.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].provider).toBe('ado');
    expect(entries[0].incrementId).toBe('0865-test');
    expect(entries[0].status).toBe('pending');
  });

  // TC-017: populated queue → sync-retry drains/attempts it
  it('TC-017: sync-retry drains a queued job from the live failure', async () => {
    // First: a terminal failure enqueues a job (as TC-016 proves).
    await resilientWrite(vi.fn().mockRejectedValue(httpError(500)), {
      retryQueue: queue,
      incrementId: '0865-test',
      provider: 'github',
      featureId: 'FEAT-2',
      projectPath: projectRoot,
      projectName: 'specweave',
      retry: { maxRetries: 1, baseMs: 1, maxMs: 5 },
    });
    expect(await queue.size()).toBe(1);

    // Then: sync-retry drains it with a succeeding sync fn.
    const drainFn = vi.fn().mockResolvedValue(undefined);
    const result = await syncRetryCommand(
      projectRoot,
      { force: true },
      { retryQueue: queue, syncFn: drainFn },
    );

    expect(drainFn).toHaveBeenCalledTimes(1);
    expect(result.succeeded).toBe(1);
    expect(await queue.size()).toBe(0);
  });

  // TC-018: transient 429 then success → retried with backoff, NO enqueue
  it('TC-018: retries a transient 429 then succeeds without enqueue', async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(httpError(429, 'Too Many Requests'))
      .mockResolvedValueOnce('ok');

    const result = await resilientWrite(write, {
      retryQueue: queue,
      incrementId: '0865-test',
      provider: 'jira',
      featureId: 'FEAT-3',
      projectPath: projectRoot,
      projectName: 'specweave',
      retry: { maxRetries: 3, baseMs: 1, maxMs: 5 },
    });

    expect(write).toHaveBeenCalledTimes(2); // retried once after 429
    expect(result.ok).toBe(true);
    expect(result.enqueued).toBe(false);
    expect(await queue.size()).toBe(0);
  });

  it('does not enqueue on a terminal 4xx (non-retryable) — surfaces error', async () => {
    const write = vi.fn().mockRejectedValue(httpError(404, 'Not Found'));

    const result = await resilientWrite(write, {
      retryQueue: queue,
      incrementId: '0865-test',
      provider: 'jira',
      featureId: 'FEAT-4',
      projectPath: projectRoot,
      projectName: 'specweave',
      retry: { maxRetries: 3, baseMs: 1, maxMs: 5 },
      // 4xx is a terminal client error; it still enqueues so the failure isn't lost,
      // but it is NOT retried (called exactly once).
    });

    expect(write).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.enqueued).toBe(true);
    expect(await queue.size()).toBe(1);
  });

  it('on success first try: returns ok, no enqueue, no retry', async () => {
    const write = vi.fn().mockResolvedValue('done');

    const result = await resilientWrite(write, {
      retryQueue: queue,
      incrementId: '0865-test',
      provider: 'github',
      featureId: 'FEAT-5',
      projectPath: projectRoot,
      projectName: 'specweave',
      retry: { maxRetries: 3, baseMs: 1, maxMs: 5 },
    });

    expect(write).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.enqueued).toBe(false);
    expect(await queue.size()).toBe(0);
  });
});
