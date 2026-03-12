import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncRetryCommand, drainRetryQueueForIncrement } from '../../../../src/cli/commands/sync-retry.js';
import { SyncRetryQueue } from '../../../../src/core/sync/sync-retry-queue.js';

describe('syncRetryCommand', () => {
  let tempDir: string;
  let statePath: string;
  let retryQueue: SyncRetryQueue;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-retry-cmd-'));
    statePath = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(statePath, { recursive: true });
    retryQueue = new SyncRetryQueue({ statePath });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('exits with empty result when queue is empty', async () => {
    const result = await syncRetryCommand(tempDir, {}, { retryQueue });
    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('skips entries not yet due', async () => {
    await retryQueue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'API error',
    });

    // nextRetryAt is in the future (1 min from now at minimum)
    const result = await syncRetryCommand(tempDir, {}, { retryQueue });
    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(0);
  });

  it('processes due entries with --force', async () => {
    await retryQueue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'API error',
    });

    const mockSync = vi.fn().mockResolvedValue(undefined);
    const result = await syncRetryCommand(
      tempDir,
      { force: true },
      { retryQueue, syncFn: mockSync },
    );
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('marks entry failed at max attempts', async () => {
    // Enqueue with attemptCount = 3 (already at max)
    await retryQueue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'API error',
      attemptCount: 3,
    });

    const result = await syncRetryCommand(
      tempDir,
      { force: true },
      { retryQueue },
    );
    expect(result.failed).toBe(1);

    // Verify marked as failed in queue
    const entries = await retryQueue.getAll();
    expect(entries[0].status).toBe('failed');
  });

  it('--clear empties the queue', async () => {
    await retryQueue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'error',
    });

    const result = await syncRetryCommand(
      tempDir,
      { clear: true },
      { retryQueue },
    );
    expect(result.cleared).toBe(true);
    expect(await retryQueue.size()).toBe(0);
  });

  it('--dry-run does not execute syncs', async () => {
    await retryQueue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'error',
    });

    const mockSync = vi.fn();
    const result = await syncRetryCommand(
      tempDir,
      { force: true, dryRun: true },
      { retryQueue, syncFn: mockSync },
    );
    expect(result.processed).toBe(1);
    expect(mockSync).not.toHaveBeenCalled();
    // Entry should still be in queue
    expect(await retryQueue.size()).toBe(1);
  });
});

describe('drainRetryQueueForIncrement', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drain-retry-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('drains pending entries for a specific increment', async () => {
    const statePath = path.join(tempDir, '.specweave', 'state');
    const queue = new SyncRetryQueue({ statePath });

    await queue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'error',
    });
    await queue.enqueue({
      incrementId: '0500-other',
      provider: 'jira',
      featureId: 'FS-500',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'error',
    });

    const mockSync = vi.fn().mockResolvedValue(undefined);
    const result = await drainRetryQueueForIncrement(tempDir, '0499-test', mockSync);

    expect(result.attempted).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(mockSync).toHaveBeenCalledTimes(1);

    // Other increment's entry should remain
    const remaining = await queue.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].incrementId).toBe('0500-other');
  });

  it('does not block on sync failure during drain', async () => {
    const statePath = path.join(tempDir, '.specweave', 'state');
    const queue = new SyncRetryQueue({ statePath });

    await queue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'error',
    });

    const mockSync = vi.fn().mockRejectedValue(new Error('still failing'));
    const result = await drainRetryQueueForIncrement(tempDir, '0499-test', mockSync);

    expect(result.attempted).toBe(1);
    expect(result.succeeded).toBe(0);
    // Should not throw
  });
});
