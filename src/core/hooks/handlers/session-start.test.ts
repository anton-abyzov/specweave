/**
 * SessionStart handler: one additionalContext string (active increment,
 * next task, handoff pointer), `{}` when nothing to say, < 300 ms.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { handle } from './session-start.js';
import { createContext } from './utils.js';
import { validateHookOutput } from './types.js';

let root = '';
const ctx = () => createContext(root);

function mkIncrement(id: string, opts: { title?: string; tasks?: string; ledger?: string; status?: string; handoff?: boolean } = {}) {
  const d = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'metadata.json'), JSON.stringify({ status: opts.status ?? 'active', title: opts.title }));
  fs.writeFileSync(path.join(d, 'spec.md'), `# ${opts.title ?? id}\n\n- [ ] AC-01 something\n`);
  if (opts.tasks) fs.writeFileSync(path.join(d, 'tasks.md'), opts.tasks);
  if (opts.ledger) fs.writeFileSync(path.join(d, 'ledger.jsonl'), opts.ledger);
  if (opts.handoff) fs.writeFileSync(path.join(d, 'handoff.md'), '# Handoff\n');
  return d;
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ss-'));
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const text = (r: Awaited<ReturnType<typeof handle>>) => r.hookSpecificOutput?.additionalContext ?? '';

describe('session-start', () => {
  it('returns {} when no increment is active and no handoff exists', async () => {
    expect(await handle({}, ctx())).toEqual({});
  });

  it('emits active increment + next pending task (1.x tasks.md layout)', async () => {
    mkIncrement('0874-crawl', {
      title: 'Crawl coverage',
      tasks: '# Tasks\n\n### T-001: Done thing\n**Status**: [x] completed\n\n### T-002: Next thing\n**Status**: [ ] pending\n\n### T-003: Later\n**Status**: [ ] pending\n',
    });
    const res = await handle({}, ctx());
    expect(validateHookOutput('session-start', res)).toBeNull();
    expect(res.hookSpecificOutput?.hookEventName).toBe('SessionStart');
    const t = text(res);
    expect(t).toContain('Active increment: 0874-crawl — Crawl coverage');
    expect(t).toContain('2/3 tasks pending; next: T-002 Next thing');
    expect(t).toContain('.specweave/increments/0874-crawl/spec.md');
  });

  it('derives task state from ledger.jsonl when present (2.0 layout)', async () => {
    mkIncrement('0001-two', {
      tasks: '### T-01 First\n- AC: AC-01 | Files: a.ts | Test: npm test\n\n### T-02 Second\n- AC: AC-01 | Files: b.ts | Test: npm test\n',
      ledger: '{"t":"T-01","e":"claim","by":"a"}\n{"t":"T-01","e":"done","by":"a","evidence":"abc"}\n\nnot json\n',
    });
    expect(text(await handle({}, ctx()))).toContain('1/2 tasks pending; next: T-02 Second');
  });

  it('suggests /sw:done when all tasks are done', async () => {
    mkIncrement('0002-done', { tasks: '### T-001: Only\n**Status**: [x] completed\n' });
    expect(text(await handle({}, ctx()))).toContain('all 1 tasks done — run /sw:done 0002-done');
  });

  it('falls back to the spec.md H1 for the title', async () => {
    mkIncrement('0003-h1');
    expect(text(await handle({}, ctx()))).toContain('Active increment: 0003-h1 — 0003-h1');
  });

  it('points at the newest handoff (increment handoff.md or state/handoff-latest.md)', async () => {
    mkIncrement('0004-h', { handoff: true });
    const t = text(await handle({}, ctx()));
    expect(t).toMatch(/Last handoff: \.specweave\/increments\/0004-h\/handoff\.md \(\d+m ago\)/);
  });

  it('emits only the handoff pointer when nothing is active', async () => {
    fs.writeFileSync(path.join(root, '.specweave', 'state', 'handoff-latest.md'), '# h');
    const t = text(await handle({}, ctx()));
    expect(t).toBe('SpecWeave: Last handoff: .specweave/state/handoff-latest.md (0m ago)');
  });

  it('honors active-increment.json ordering and caps the list at 3', async () => {
    for (const id of ['0005-a', '0006-b', '0007-c', '0008-d']) mkIncrement(id);
    fs.writeFileSync(
      path.join(root, '.specweave', 'state', 'active-increment.json'),
      JSON.stringify({ ids: ['0008-d', '0007-c', '0006-b', '0005-a'] }),
    );
    const t = text(await handle({}, ctx()));
    expect(t.indexOf('0008-d')).toBeLessThan(t.indexOf('0007-c'));
    expect(t).toContain('(+1 more active increments)');
    expect(t).not.toContain('0005-a');
  });

  it('clears an auto-mode session older than 24h', async () => {
    const auto = path.join(root, '.specweave', 'state', 'auto-mode.json');
    fs.writeFileSync(auto, '{"active":true}');
    fs.writeFileSync(path.join(root, '.specweave', 'state', '.stop-auto-turns'), '3');
    const old = Date.now() / 1000 - 25 * 3600;
    fs.utimesSync(auto, old, old);
    await handle({}, ctx());
    expect(fs.existsSync(auto)).toBe(false);
    expect(fs.existsSync(path.join(root, '.specweave', 'state', '.stop-auto-turns'))).toBe(false);
  });

  it('keeps a fresh auto-mode session', async () => {
    const auto = path.join(root, '.specweave', 'state', 'auto-mode.json');
    fs.writeFileSync(auto, '{"active":true}');
    await handle({}, ctx());
    expect(fs.existsSync(auto)).toBe(true);
  });

  it('finishes well under 300 ms even with many increments', async () => {
    for (let i = 1; i <= 150; i++) mkIncrement(String(i).padStart(4, '0') + '-x', { status: i === 150 ? 'active' : 'completed' });
    const t0 = Date.now();
    const res = await handle({}, ctx());
    expect(Date.now() - t0).toBeLessThan(300);
    expect(text(res)).toContain('0150-x');
  });
});
