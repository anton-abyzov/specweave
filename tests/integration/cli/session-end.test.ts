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
      JSON.stringify({ version: '2.0', project: { name: 'session-end' } }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-001: 2.0 removed both the queued-sync event queue and the reflect
  // subsystem, so `session end` reports neither.
  it('should report neither sync flush nor reflect', async () => {
    const result = await sessionEndCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);

    expect(result.details.sync).toBeUndefined();
    expect(result.details.reflect).toBeUndefined();
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

  it('should handle combined state: auto-mode + pending tasks', async () => {
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

    const result = await sessionEndCommand({ projectRoot, silent: true });
    expect(result.success).toBe(true);

    const auto = result.details.auto as { active: boolean; pendingTasks: { pending: number } };
    expect(auto.active).toBe(true);
    expect(auto.pendingTasks.pending).toBe(1);
  });
});
