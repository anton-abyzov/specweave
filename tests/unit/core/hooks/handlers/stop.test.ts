/**
 * Stop handler — the `/sw:auto` loop driver, routed through the dispatcher.
 * Pass = `{}`; block = `{decision:"block", reason}`; never traps an ordinary session.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { hookRouter } from '../../../../../src/core/hooks/handlers/hook-router.js';
import { MAX_NO_PROGRESS_TURNS } from '../../../../../src/core/hooks/handlers/stop.js';
import { validateHookOutput } from '../../../../../src/core/hooks/handlers/types.js';

function mkRepo(config = '{}'): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-stop-'));
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), config);
  return root;
}
const stateFile = (root: string, ...p: string[]) => path.join(root, '.specweave', 'state', ...p);
const turns = (root: string) => JSON.parse(fs.readFileSync(stateFile(root, '.stop-auto-turns'), 'utf8')) as { turns: number; noProgress?: number };

function mkIncrement(root: string, id: string, o: { tasksDone: number; tasksPending: number; acsTotal: number; acsDone: number }): void {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ increment: id, status: 'active' }));
  const lines: string[] = ['# Tasks', ''];
  let t = 0;
  for (let i = 0; i < o.tasksDone; i++) lines.push(`### T-${String(++t).padStart(3, '0')}: done`, '**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed', '');
  for (let i = 0; i < o.tasksPending; i++) lines.push(`### T-${String(++t).padStart(3, '0')}: pending`, '**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending', '');
  fs.writeFileSync(path.join(dir, 'tasks.md'), lines.join('\n'));
  const spec = ['# Spec', '', '**Acceptance Criteria**:'];
  for (let i = 0; i < o.acsTotal; i++) spec.push(`- [${i < o.acsDone ? 'x' : ' '}] **AC-US1-${String(i + 1).padStart(2, '0')}**: c`);
  fs.writeFileSync(path.join(dir, 'spec.md'), spec.join('\n'));
}
const writeAutoMode = (root: string, body: Record<string, unknown>) =>
  fs.writeFileSync(stateFile(root, 'auto-mode.json'), JSON.stringify(body));
const stop = (extra: Record<string, unknown> = {}) => hookRouter('stop', JSON.stringify({ hook_event_name: 'Stop', ...extra }));

describe('stop (auto loop driver)', () => {
  let repo = '';
  const cwd0 = process.cwd();
  afterEach(() => {
    process.chdir(cwd0);
    if (repo) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  it('no auto-mode.json -> {} (ordinary session never trapped) and counter reset', async () => {
    repo = mkRepo();
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '3');
    process.chdir(repo);
    expect(await stop()).toEqual({});
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });

  it('inactive or stale auto-mode -> {}', async () => {
    repo = mkRepo();
    mkIncrement(repo, '0001-demo', { tasksDone: 0, tasksPending: 3, acsTotal: 2, acsDone: 0 });
    process.chdir(repo);
    writeAutoMode(repo, { active: false, incrementIds: ['0001-demo'] });
    expect(await stop()).toEqual({});
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    const old = Date.now() / 1000 - 3 * 3600;
    fs.utimesSync(stateFile(repo, 'auto-mode.json'), old, old);
    expect(await stop()).toEqual({});
  });

  it('pending work -> block with a schema-valid reason and an incrementing counter', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'], userGoal: 'finish the widget' });
    mkIncrement(repo, '0001-demo', { tasksDone: 1, tasksPending: 2, acsTotal: 2, acsDone: 1 });
    process.chdir(repo);
    const res = await stop();
    expect(validateHookOutput('stop', res)).toBeNull();
    expect(res).toEqual({ decision: 'block', reason: expect.stringContaining('0001-demo: 2 task(s) / 1 AC(s) remain') });
    expect(res.reason).toContain('Run sw:do');
    expect(res.reason).toContain('Goal: finish the widget');
    expect(turns(repo).turns).toBe(1);
    await stop();
    expect(turns(repo).turns).toBe(2);
  });

  it('all tasks + ACs complete -> block all_complete_needs_closure and clear the counter', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 3, tasksPending: 0, acsTotal: 2, acsDone: 2 });
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '4');
    process.chdir(repo);
    const res = await stop();
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('all_complete_needs_closure');
    expect(res.reason).toContain('sw:done --auto 0001-demo');
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });

  it('tasks done but an AC unsatisfied -> block-continue, not closure', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 3, tasksPending: 0, acsTotal: 2, acsDone: 1 });
    process.chdir(repo);
    const res = await stop();
    expect(res.reason).not.toContain('all_complete_needs_closure');
    expect(res.reason).toContain('AC(s) remain');
  });

  it('turns > auto.maxTurns -> {} safety stop (accepts the 1.x plain counter)', async () => {
    repo = mkRepo(JSON.stringify({ auto: { maxTurns: 5 } }));
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 0, tasksPending: 3, acsTotal: 2, acsDone: 0 });
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '6');
    process.chdir(repo);
    expect(await stop()).toEqual({});
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });

  it('honors stop_hook_active: releases the loop after 3 no-progress turns', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 0, tasksPending: 2, acsTotal: 1, acsDone: 0 });
    process.chdir(repo);
    expect((await stop()).decision).toBe('block'); // first block, no streak yet
    for (let i = 1; i < MAX_NO_PROGRESS_TURNS; i++) {
      expect((await stop({ stop_hook_active: true })).decision).toBe('block');
      expect(turns(repo).noProgress).toBe(i);
    }
    expect(await stop({ stop_hook_active: true })).toEqual({});
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });

  it('progress resets the no-progress streak', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 0, tasksPending: 2, acsTotal: 0, acsDone: 0 });
    process.chdir(repo);
    await stop();
    await stop({ stop_hook_active: true });
    expect(turns(repo).noProgress).toBe(1);
    mkIncrement(repo, '0001-demo', { tasksDone: 1, tasksPending: 1, acsTotal: 0, acsDone: 0 });
    expect((await stop({ stop_hook_active: true })).decision).toBe('block');
    expect(turns(repo).noProgress).toBe(0);
  });

  it('falls back to the active-increment scan when incrementIds is absent', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true });
    mkIncrement(repo, '0007-scan', { tasksDone: 0, tasksPending: 1, acsTotal: 1, acsDone: 0 });
    process.chdir(repo);
    expect((await stop()).reason).toContain('0007-scan');
  });

  it('active auto-mode but no increment -> {} (no spurious closure)', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true });
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '2');
    process.chdir(repo);
    expect(await stop()).toEqual({});
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });
});
