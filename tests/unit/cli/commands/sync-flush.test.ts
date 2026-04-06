import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncFlushCommand } from '../../../../src/cli/commands/sync-flush.js';

describe('cli/commands/sync-flush', () => {
  let tmpDir: string;
  let projectRoot: string;
  let stateDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-sync-flush-'));
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

  // TC-001: flush deduplicates and clears
  it('should deduplicate by increment ID and clear pending.jsonl', async () => {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    const lines = [
      JSON.stringify({ event: 'task.updated', incrementId: '0001' }),
      JSON.stringify({ event: 'spec.updated', incrementId: '0001' }),
      JSON.stringify({ event: 'task.updated', incrementId: '0002' }),
    ];
    fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), lines.join('\n') + '\n');

    const result = await syncFlushCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);
    expect(result.mode).toBe('flush');
    expect(result.eventsFlushed).toBe(2);
    expect(result.incrementIds).toContain('0001');
    expect(result.incrementIds).toContain('0002');

    const remaining = fs.readFileSync(path.join(queueDir, 'pending.jsonl'), 'utf8');
    expect(remaining).toBe('');
  });

  // TC-002: empty queue
  it('should return eventsFlushed:0 for empty queue', async () => {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), '');

    const result = await syncFlushCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);
    expect(result.eventsFlushed).toBe(0);
    expect(result.incrementIds).toHaveLength(0);
  });

  // TC-003: queue mode
  it('should append event in queue mode', async () => {
    const eventJson = JSON.stringify({ event: 'task.updated', incrementId: '0661' });
    const result = await syncFlushCommand({ projectRoot, queue: eventJson, silent: true });
    expect(result.success).toBe(true);
    expect(result.mode).toBe('queue');
    expect(result.eventsQueued).toBe(1);

    const content = fs.readFileSync(
      path.join(stateDir, 'event-queue', 'pending.jsonl'),
      'utf8',
    );
    const parsed = JSON.parse(content.trim());
    expect(parsed.incrementId).toBe('0661');
  });

  // TC-004: dry-run mode
  it('should report events without clearing in dry-run mode', async () => {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    const lines = [
      JSON.stringify({ event: 'task.updated', incrementId: '0001' }),
      JSON.stringify({ event: 'task.updated', incrementId: '0002' }),
      JSON.stringify({ event: 'task.updated', incrementId: '0003' }),
      JSON.stringify({ event: 'spec.updated', incrementId: '0001' }),
      JSON.stringify({ event: 'spec.updated', incrementId: '0002' }),
    ];
    fs.writeFileSync(path.join(queueDir, 'pending.jsonl'), lines.join('\n') + '\n');

    const result = await syncFlushCommand({ projectRoot, dryRun: true, silent: true });
    expect(result.success).toBe(true);
    expect(result.eventsFlushed).toBe(3);

    // File should NOT be cleared
    const remaining = fs.readFileSync(path.join(queueDir, 'pending.jsonl'), 'utf8').trim();
    expect(remaining.split('\n')).toHaveLength(5);
  });

  // TC-005: missing event-queue directory
  it('should return eventsFlushed:0 when event-queue dir is missing', async () => {
    const result = await syncFlushCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);
    expect(result.eventsFlushed).toBe(0);
  });

  it('should fail for non-specweave project', async () => {
    const result = await syncFlushCommand({
      projectRoot: path.join(tmpDir, 'nope'),
      silent: true,
    });
    expect(result.success).toBe(false);
  });
});
