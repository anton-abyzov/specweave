import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncFlushCommand } from '../../../src/cli/commands/sync-flush.js';

describe('integration: sync flush', () => {
  let tmpDir: string;
  let projectRoot: string;
  let stateDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-int-sync-flush-'));
    projectRoot = tmpDir;
    stateDir = path.join(projectRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0' }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-001: flush multiple events for multiple increments
  it('should flush all events and clear pending.jsonl', async () => {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    const lines = [
      JSON.stringify({ event: 'task.updated', incrementId: '0001' }),
      JSON.stringify({ event: 'spec.updated', incrementId: '0002' }),
      JSON.stringify({ event: 'task.updated', incrementId: '0003' }),
      JSON.stringify({ event: 'status_changed', incrementId: '0001' }),
    ];
    fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), lines.join('\n') + '\n');

    const result = await syncFlushCommand({ projectRoot, silent: true });
    expect(result.eventsFlushed).toBe(3);

    const remaining = fs.readFileSync(path.join(queueDir, 'pending.jsonl'), 'utf8');
    expect(remaining).toBe('');
  });

  // TC-002: queue then flush end-to-end
  it('should queue events then flush them all', async () => {
    // Queue 3 events
    await syncFlushCommand({
      projectRoot,
      queue: JSON.stringify({ event: 'task.updated', incrementId: '0001' }),
      silent: true,
    });
    await syncFlushCommand({
      projectRoot,
      queue: JSON.stringify({ event: 'spec.updated', incrementId: '0002' }),
      silent: true,
    });
    await syncFlushCommand({
      projectRoot,
      queue: JSON.stringify({ event: 'task.updated', incrementId: '0003' }),
      silent: true,
    });

    // Flush
    const result = await syncFlushCommand({ projectRoot, silent: true });
    expect(result.eventsFlushed).toBe(3);

    const remaining = fs.readFileSync(
      path.join(stateDir, 'event-queue', 'pending.jsonl'),
      'utf8',
    );
    expect(remaining).toBe('');
  });

  // TC-003: dry-run does not corrupt queue
  it('should not modify queue during dry-run', async () => {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    const lines = [
      JSON.stringify({ event: 'task.updated', incrementId: '0001' }),
      JSON.stringify({ event: 'task.updated', incrementId: '0002' }),
    ];
    fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), lines.join('\n') + '\n');

    // Dry-run
    const dryResult = await syncFlushCommand({ projectRoot, dryRun: true, silent: true });
    expect(dryResult.eventsFlushed).toBe(2);

    // Real flush should still get the events
    const flushResult = await syncFlushCommand({ projectRoot, silent: true });
    expect(flushResult.eventsFlushed).toBe(2);
  });
});
