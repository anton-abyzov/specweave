/**
 * Routed tests for the blocking stop-auto handler (0870, US-002).
 *
 * stop-auto drives the `/sw:auto` loop: it BLOCKS the Stop hook while work
 * remains (so Claude re-prompts and continues) and blocks with an
 * `all_complete_needs_closure` trigger when everything is done — but NEVER traps
 * an ordinary (non-auto) session. Every test routes through
 * `hookRouter('stop-auto', stdin)` so the dispatcher contract is what is locked.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { hookRouter } from './hook-router.js';

function mkRepo(config = '{}'): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-auto-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: root });
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), config);
  return root;
}

const stateFile = (root: string, ...p: string[]) =>
  path.join(root, '.specweave', 'state', ...p);

/** Write an increment with the given task statuses + AC statuses. */
function mkIncrement(
  root: string,
  id: string,
  opts: { tasksDone: number; tasksPending: number; acsTotal: number; acsDone: number },
): void {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'metadata.json'),
    JSON.stringify({ increment: id, status: 'active' }),
  );

  const taskLines: string[] = ['# Tasks', ''];
  let t = 0;
  for (let i = 0; i < opts.tasksDone; i++) {
    t++;
    taskLines.push(`### T-${String(t).padStart(3, '0')}: done ${t}`);
    taskLines.push(`**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed`);
    taskLines.push('');
  }
  for (let i = 0; i < opts.tasksPending; i++) {
    t++;
    taskLines.push(`### T-${String(t).padStart(3, '0')}: pending ${t}`);
    taskLines.push(`**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending`);
    taskLines.push('');
  }
  fs.writeFileSync(path.join(dir, 'tasks.md'), taskLines.join('\n'));

  const specLines: string[] = ['# Spec', '', '**Acceptance Criteria**:'];
  for (let i = 0; i < opts.acsTotal; i++) {
    const done = i < opts.acsDone;
    specLines.push(`- [${done ? 'x' : ' '}] **AC-US1-${String(i + 1).padStart(2, '0')}**: criterion ${i + 1}`);
  }
  fs.writeFileSync(path.join(dir, 'spec.md'), specLines.join('\n'));
}

function writeAutoMode(root: string, body: Record<string, unknown>): void {
  fs.writeFileSync(stateFile(root, 'auto-mode.json'), JSON.stringify(body));
}

describe('stop-auto (0870) — routed through the dispatcher', () => {
  let repo = '';
  const cwd0 = process.cwd();

  afterEach(() => {
    process.chdir(cwd0);
    if (repo && fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  it('AC-US2-03: no auto-mode.json -> approve (ordinary session not trapped)', async () => {
    repo = mkRepo();
    process.chdir(repo);
    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('approve');
  });

  it('AC-US2-03: inactive auto-mode -> approve', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: false, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 0, tasksPending: 3, acsTotal: 2, acsDone: 0 });
    process.chdir(repo);
    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('approve');
  });

  it('AC-US2-03: stale auto-mode -> approve', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 0, tasksPending: 3, acsTotal: 2, acsDone: 0 });
    // maxSessionAge defaults to 7200s; backdate marker mtime to 3h ago.
    const old = Date.now() / 1000 - 3 * 60 * 60;
    fs.utimesSync(stateFile(repo, 'auto-mode.json'), old, old);
    process.chdir(repo);
    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('approve');
  });

  it('AC-US2-01: pending tasks -> block-continue + increments .stop-auto-turns', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'], userGoal: 'finish the widget' });
    mkIncrement(repo, '0001-demo', { tasksDone: 1, tasksPending: 2, acsTotal: 2, acsDone: 1 });
    process.chdir(repo);

    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('0001-demo');
    expect(res.reason).toContain('Run sw:do');
    expect(res.reason).toContain('Goal: finish the widget');
    // Router prefixes intentional blocks with [GUARD].
    expect(res.reason).toContain('[GUARD]');

    const turnsPath = stateFile(repo, '.stop-auto-turns');
    expect(fs.existsSync(turnsPath)).toBe(true);
    expect(fs.readFileSync(turnsPath, 'utf8').trim()).toBe('1');

    // A second invocation increments again.
    await hookRouter('stop-auto', JSON.stringify({}));
    expect(fs.readFileSync(turnsPath, 'utf8').trim()).toBe('2');
  });

  it('AC-US2-02: all tasks + ACs complete -> block all_complete_needs_closure', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 3, tasksPending: 0, acsTotal: 2, acsDone: 2 });
    // Seed a stale counter to prove closure clears it.
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '4');
    process.chdir(repo);

    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('all_complete_needs_closure');
    expect(res.reason).toContain('sw:done --auto');
    // Counter cleared on closure.
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });

  it('AC-US2-02: tasks done but an AC unsatisfied -> still block-continue (not closure)', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 3, tasksPending: 0, acsTotal: 2, acsDone: 1 });
    process.chdir(repo);

    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('block');
    expect(res.reason).not.toContain('all_complete_needs_closure');
    expect(res.reason).toContain('AC(s) remain');
  });

  it('AC-US2-04: turns > maxTurns -> safety stop approve + counter cleared', async () => {
    repo = mkRepo(JSON.stringify({ auto: { maxTurns: 5 } }));
    writeAutoMode(repo, { active: true, incrementIds: ['0001-demo'] });
    mkIncrement(repo, '0001-demo', { tasksDone: 0, tasksPending: 3, acsTotal: 2, acsDone: 0 });
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '6');
    process.chdir(repo);

    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('approve');
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });

  it('AC-US2-04: counter reset when auto-mode is inactive', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: false });
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '3');
    process.chdir(repo);

    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('approve');
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });

  it('AC-US2-05: falls back to active-increment scan when incrementIds is absent', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true }); // no incrementIds
    mkIncrement(repo, '0007-scan', { tasksDone: 0, tasksPending: 1, acsTotal: 1, acsDone: 0 });
    process.chdir(repo);

    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('0007-scan');
  });

  it('active auto-mode but NO increment to work on -> approve (no spurious closure)', async () => {
    repo = mkRepo();
    writeAutoMode(repo, { active: true }); // no incrementIds, and no active increments on disk
    fs.writeFileSync(stateFile(repo, '.stop-auto-turns'), '2');
    process.chdir(repo);

    const res = await hookRouter('stop-auto', JSON.stringify({}));
    expect(res.decision).toBe('approve');
    expect(res.reason ?? '').not.toContain('all_complete_needs_closure');
    expect(fs.existsSync(stateFile(repo, '.stop-auto-turns'))).toBe(false);
  });
});
