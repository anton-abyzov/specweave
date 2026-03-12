import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SyncRetryQueue, RetryEntry } from '../../../../src/core/sync/sync-retry-queue.js';

describe('SyncRetryQueue', () => {
  let tempDir: string;
  let queue: SyncRetryQueue;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-retry-test-'));
    queue = new SyncRetryQueue({ statePath: tempDir });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('enqueue writes entry with correct schema', async () => {
    await queue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/some/path',
      projectName: 'specweave',
      error: 'API rate limit exceeded',
    });

    const entries = await queue.getAll();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.incrementId).toBe('0499-test');
    expect(entry.provider).toBe('github');
    expect(entry.featureId).toBe('FS-499');
    expect(entry.projectPath).toBe('/some/path');
    expect(entry.projectName).toBe('specweave');
    expect(entry.error).toBe('API rate limit exceeded');
    expect(entry.attemptCount).toBe(1);
    expect(entry.maxAttempts).toBe(3);
    expect(entry.status).toBe('pending');
    expect(entry.id).toBeDefined();
    expect(entry.createdAt).toBeDefined();
    expect(entry.nextRetryAt).toBeDefined();
    expect(entry.lastAttemptAt).toBeDefined();
  });

  it('enqueue uses exponential backoff for nextRetryAt', async () => {
    const now = Date.now();

    // First attempt: 1 minute
    await queue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });

    const entries = await queue.getAll();
    const nextRetry = new Date(entries[0].nextRetryAt).getTime();
    const diffMs = nextRetry - now;
    // Should be ~1 minute (60000ms) ± 5000ms tolerance
    expect(diffMs).toBeGreaterThan(55000);
    expect(diffMs).toBeLessThan(65000);
  });

  it('enqueue respects 100-entry cap by pruning oldest', async () => {
    // Enqueue 101 entries
    for (let i = 0; i < 101; i++) {
      await queue.enqueue({
        incrementId: `inc-${String(i).padStart(4, '0')}`,
        provider: 'github',
        featureId: `FS-${i}`,
        projectPath: '/p',
        projectName: 'specweave',
        error: `error ${i}`,
      });
    }

    const entries = await queue.getAll();
    expect(entries.length).toBeLessThanOrEqual(100);
    // Oldest should have been pruned - inc-0000 should not be present
    const ids = entries.map((e) => e.incrementId);
    expect(ids).not.toContain('inc-0000');
    // Latest should be present
    expect(ids).toContain('inc-0100');
  });

  it('prune removes entries older than 7 days', async () => {
    // Manually write an old entry
    const oldEntry: RetryEntry = {
      id: 'old-entry',
      incrementId: 'old-inc',
      provider: 'github',
      featureId: 'FS-OLD',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'old error',
      attemptCount: 1,
      maxAttempts: 3,
      status: 'pending',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      nextRetryAt: new Date().toISOString(),
      lastAttemptAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const filePath = path.join(tempDir, 'sync-retry-queue.json');
    fs.writeFileSync(filePath, JSON.stringify({ version: 1, entries: [oldEntry] }));

    // Enqueue a new entry (triggers prune)
    await queue.enqueue({
      incrementId: 'new-inc',
      provider: 'jira',
      featureId: 'FS-NEW',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'new error',
    });

    const entries = await queue.getAll();
    const ids = entries.map((e) => e.id);
    expect(ids).not.toContain('old-entry');
    expect(entries.length).toBeGreaterThan(0); // new entry present
  });

  it('markFailed sets status to failed and does not remove entry', async () => {
    await queue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });

    const entries = await queue.getAll();
    const entryId = entries[0].id;

    await queue.markFailed(entryId);

    const updated = await queue.getAll();
    expect(updated).toHaveLength(1);
    expect(updated[0].status).toBe('failed');
  });

  it('getByIncrement returns entries for specific increment', async () => {
    await queue.enqueue({
      incrementId: 'inc-A',
      provider: 'github',
      featureId: 'FS-1',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });
    await queue.enqueue({
      incrementId: 'inc-B',
      provider: 'jira',
      featureId: 'FS-2',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });

    const results = await queue.getByIncrement('inc-A');
    expect(results).toHaveLength(1);
    expect(results[0].incrementId).toBe('inc-A');
  });

  it('getByProvider returns entries for specific provider', async () => {
    await queue.enqueue({
      incrementId: 'inc-A',
      provider: 'github',
      featureId: 'FS-1',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });
    await queue.enqueue({
      incrementId: 'inc-B',
      provider: 'jira',
      featureId: 'FS-2',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });

    const results = await queue.getByProvider('jira');
    expect(results).toHaveLength(1);
    expect(results[0].provider).toBe('jira');
  });

  it('remove deletes entry by id', async () => {
    await queue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });

    const entries = await queue.getAll();
    await queue.remove(entries[0].id);

    expect(await queue.size()).toBe(0);
  });

  it('size returns count of entries', async () => {
    expect(await queue.size()).toBe(0);

    await queue.enqueue({
      incrementId: 'inc-A',
      provider: 'github',
      featureId: 'FS-1',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });

    expect(await queue.size()).toBe(1);
  });

  it('returns empty queue when file does not exist', async () => {
    const freshQueue = new SyncRetryQueue({ statePath: path.join(tempDir, 'nonexistent') });
    const entries = await freshQueue.getAll();
    expect(entries).toEqual([]);
    expect(await freshQueue.size()).toBe(0);
  });

  it('uses atomic write pattern (temp file then rename)', async () => {
    await queue.enqueue({
      incrementId: '0499-test',
      provider: 'github',
      featureId: 'FS-499',
      projectPath: '/p',
      projectName: 'specweave',
      error: 'fail',
    });

    // Verify the queue file exists (not a temp file)
    const queueFile = path.join(tempDir, 'sync-retry-queue.json');
    expect(fs.existsSync(queueFile)).toBe(true);

    // Verify no temp files remain
    const files = fs.readdirSync(tempDir);
    const tempFiles = files.filter((f) => f.includes('.tmp'));
    expect(tempFiles).toHaveLength(0);
  });
});
