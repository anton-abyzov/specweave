import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createIncrementCommand } from '../../../../src/cli/commands/create-increment.js';
import { verifyCommand } from '../../../../src/cli/commands/verify.js';
import { completeCommand } from '../../../../src/cli/commands/complete.js';
import { appendEvent, detectModel, readLedger } from '../../../../src/core/tasks/ledger.js';
import { readWorkSession } from '../../../../src/core/tasks/work-session.js';
import { studioThreadBindingFile } from '../../../../src/core/tasks/studio-thread-binding.js';
import { projectIncrement } from '../../../../src/dashboard/server/data/work-projection.js';

const KEYS = ['HOME', 'SPECWEAVE_STUDIO_THREAD_ID', 'CLAUDE_CODE_SESSION_ID', 'SPECWEAVE_SESSION_ID', 'SPECWEAVE_MODEL', 'ANTHROPIC_MODEL', 'SPECWEAVE_AGENT', 'SPECWEAVE_TOOL'];
let saved: Record<string, string | undefined>;
let root: string;
let home: string;
let cwd: string;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-work-binding-')));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-work-home-'));
  fs.mkdirSync(path.join(root, '.specweave', 'increments'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'demo' } }));
  process.env.HOME = home;
  process.env.SPECWEAVE_STUDIO_THREAD_ID = 'thread:plan-1';
  process.env.SPECWEAVE_SESSION_ID = 'session-1';
  process.env.SPECWEAVE_TOOL = 'claude';
  process.env.SPECWEAVE_AGENT = 'claude@test';
  cwd = process.cwd();
  process.chdir(root);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});
afterEach(() => {
  process.chdir(cwd);
  vi.restoreAllMocks();
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(home, { recursive: true, force: true });
});

function binding(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(studioThreadBindingFile('thread:plan-1', home), 'utf8'));
}

describe('increment work binding (AC-01)', () => {
  it('create-increment, verify and complete bind the thread and the session without a ledger append', async () => {
    await createIncrementCommand({ title: 'Plan board', projectRoot: root });
    const id = fs.readdirSync(path.join(root, '.specweave', 'increments'))[0];
    expect(binding()).toMatchObject({ incrementId: id, root, event: 'create', taskId: null });
    expect(readWorkSession('session-1', home)).toMatchObject({ kind: 'increment', incrementId: id, root, event: 'create' });

    // Point the thread elsewhere, then verify and complete must rebind it.
    fs.rmSync(studioThreadBindingFile('thread:plan-1', home));
    await verifyCommand(id, { cwd: root, reason: 'nothing to run in this fixture' });
    expect(binding()).toMatchObject({ incrementId: id, event: 'verify' });

    await completeCommand(id, [], { reason: 'fixture close', yes: true, silent: true });
    expect(binding()).toMatchObject({ incrementId: id, event: 'complete' });
    expect(readWorkSession('session-1', home)).toMatchObject({ incrementId: id, event: 'complete' });
  });

  it('a ledger append writes the session marker too', () => {
    const dir = path.join(root, '.specweave', 'increments', '0007-ledger');
    appendEvent(path.join(dir, 'ledger.jsonl'), { t: 'T-01', e: 'claim', by: 'claude@test', at: '2026-10-22T10:00:00Z' });
    expect(readWorkSession('session-1', home)).toMatchObject({ incrementId: '0007-ledger', event: 'claim' });
  });
});

describe('model on ledger events (AC-02)', () => {
  it('stamps the model the agent runs on and the Work board shows it', () => {
    process.env.ANTHROPIC_MODEL = 'opus[1m]';
    expect(detectModel()).toBe('opus[1m]');
    const dir = path.join(root, '.specweave', 'increments', '0008-model');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ status: 'active' }));
    fs.writeFileSync(path.join(dir, 'spec.md'), '# Model\n\n## Tasks\n\n### T-01 One\n- AC: AC-01 | Files: a.ts | Test: true\n');
    appendEvent(path.join(dir, 'ledger.jsonl'), { t: 'T-01', e: 'claim', by: 'claude@test', at: '2026-10-22T10:00:00Z' });
    // Another agent's event is not stamped with this process's model.
    appendEvent(path.join(dir, 'ledger.jsonl'), { t: 'T-01', e: 'note', by: 'codex@elsewhere', at: '2026-10-22T10:01:00Z' });
    const events = readLedger(path.join(dir, 'ledger.jsonl')).events;
    expect(events.map((e) => e.model ?? null)).toEqual(['opus[1m]', null]);
    expect(projectIncrement(root, '0008')?.executions.map((s) => s.model)).toEqual(['opus[1m]', null]);
  });

  it('SPECWEAVE_MODEL wins and a non-Claude tool does not borrow ANTHROPIC_MODEL', () => {
    expect(detectModel({ SPECWEAVE_MODEL: 'gpt-5.5', ANTHROPIC_MODEL: 'opus', SPECWEAVE_TOOL: 'claude' })).toBe('gpt-5.5');
    expect(detectModel({ ANTHROPIC_MODEL: 'opus', SPECWEAVE_TOOL: 'codex' })).toBeUndefined();
  });
});
