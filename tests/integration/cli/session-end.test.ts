import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sessionEndCommand } from '../../../src/cli/commands/session.js';

describe('integration: session end', () => {
  let tmpDir: string;
  let projectRoot: string;
  let stateDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-int-session-end-'));
    projectRoot = tmpDir;
    stateDir = path.join(projectRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0', reflect: { enabled: true } }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-001: reflect enabled + pending events → all cleared
  it('should run reflect check and flush pending events', async () => {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    fs.writeFileSync(
      path.join(queueDir, 'pending.jsonl'),
      JSON.stringify({ event: 'task.updated', incrementId: '0001' }) + '\n' +
      JSON.stringify({ event: 'spec.updated', incrementId: '0002' }) + '\n',
    );

    const result = await sessionEndCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);

    // pending.jsonl should be empty
    const remaining = fs.readFileSync(path.join(queueDir, 'pending.jsonl'), 'utf8');
    expect(remaining).toBe('');
  });

  // TC-002: no .specweave dir → exit 1
  it('should fail for non-specweave project', async () => {
    const noProject = path.join(tmpDir, 'nope');
    fs.mkdirSync(noProject, { recursive: true });

    const result = await sessionEndCommand({ projectRoot: noProject, silent: true });
    expect(result.success).toBe(false);
  });

  // TC-003: idempotency — running twice succeeds
  it('should be idempotent', async () => {
    const result1 = await sessionEndCommand({ projectRoot, silent: true });
    const result2 = await sessionEndCommand({ projectRoot, silent: true });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should handle combined state: auto-mode + events + reflect', async () => {
    // Set up auto-mode
    fs.writeFileSync(
      path.join(stateDir, 'auto-mode.json'),
      JSON.stringify({ active: true }),
    );

    // Set up increments with tasks
    const incDir = path.join(projectRoot, '.specweave', 'increments', '0001-feat');
    fs.mkdirSync(incDir, { recursive: true });
    fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ status: 'active' }));
    fs.writeFileSync(path.join(incDir, 'tasks.md'), '- [ ] Pending\n- [x] Done\n');

    // Set up event queue
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    fs.writeFileSync(
      path.join(queueDir, 'pending.jsonl'),
      JSON.stringify({ event: 'task.updated', incrementId: '0001-feat' }) + '\n',
    );

    const result = await sessionEndCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);

    const reflect = result.details.reflect as { enabled: boolean };
    expect(reflect.enabled).toBe(true);

    const auto = result.details.auto as { active: boolean; pendingTasks: { pending: number } };
    expect(auto.active).toBe(true);
    expect(auto.pendingTasks.pending).toBe(1);

    const sync = result.details.sync as { flushed: number };
    expect(sync.flushed).toBe(1);
  });
});
