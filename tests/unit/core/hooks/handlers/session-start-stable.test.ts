/**
 * SessionStart byte stability (AC-06) and the compaction restatement.
 *
 * - Unchanged state gives identical bytes, also days later: times are absolute.
 * - `source: "compact"` restates only the active increments with their next
 *   task, the memory pointer and the pickup hint (claims, notes, branch state).
 * - Startup names the newest pending handoff and counts the rest.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { handle } from '../../../../../src/core/hooks/handlers/session-start.js';
import { createContext } from '../../../../../src/core/hooks/handlers/utils.js';
import { validateHookOutput } from '../../../../../src/core/hooks/handlers/types.js';

let root = '';
const DAY = 24 * 3600 * 1000;

function writeIncrement(id: string, opts: { title: string; status?: string; ledger?: object[]; tasks?: boolean }): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status: opts.status ?? 'active', title: opts.title }));
  fs.writeFileSync(path.join(dir, 'spec.md'), `# ${opts.title}\n\n- [ ] AC-01 one\n- [ ] AC-02 two\n`);
  if (opts.tasks !== false) {
    fs.writeFileSync(path.join(dir, 'tasks.md'),
      '### T-01 Wire the form\n- AC: AC-01 | Files: a.ts | Test: npm test\n\n### T-02 Show the error\n- AC: AC-02 | Files: b.ts | Test: npm test\n');
  }
  if (opts.ledger) fs.writeFileSync(path.join(dir, 'ledger.jsonl'), opts.ledger.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return dir;
}

/** One active increment with notes and a handoff, three other increments handed off, a memory index, an intent board. */
function richProject(): void {
  writeIncrement('0100-login', {
    title: 'Login form',
    ledger: [
      { t: 'T-01', e: 'claim', by: 'codex@mbp', at: '2026-10-09T10:00:00Z' },
      { t: 'T-01', e: 'done', by: 'codex@mbp', at: '2026-10-09T11:00:00Z', evidence: 'npm test → exit 0' },
      { t: '*', e: 'note', by: 'codex@mbp', at: '2026-10-09T11:05:00Z', note: 'Use the config base URL' },
      { t: '*', e: 'handoff', by: 'claude@mbp', at: '2026-10-09T12:30:00Z', note: 'out of tokens' },
    ],
  });
  fs.writeFileSync(path.join(root, '.specweave', 'state', 'active-increment.json'), JSON.stringify({ ids: ['0100-login'] }));
  writeIncrement('0201-updates', { title: 'One-click updates', status: 'planned', tasks: false, ledger: [{ t: '*', e: 'handoff', by: 'a@m4', at: '2026-10-01T10:00:00Z' }] });
  writeIncrement('0202-mode', { title: 'Handoff mode', status: 'planned', tasks: false, ledger: [{ t: '*', e: 'handoff', by: 'a@m4', at: '2026-10-02T10:00:00Z' }] });
  writeIncrement('0203-clis', { title: 'Update CLIs across machines', status: 'planned', tasks: false, ledger: [{ t: '*', e: 'handoff', by: 'a@m4', at: '2026-10-03T10:00:00Z' }] });
  fs.mkdirSync(path.join(root, '.specweave', 'memory'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'memory', 'MEMORY.md'), '- Keep hooks offline\n- Ledger is the only state\n');
  fs.mkdirSync(path.join(root, '.specweave', 'intents'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'intents', 'board.jsonl'), '');
}

async function run(source?: string): Promise<string> {
  const res = await handle(source ? { source } : {}, createContext(root));
  expect(validateHookOutput('session-start', res)).toBeNull();
  return res.hookSpecificOutput?.additionalContext ?? '';
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ss-stable-'));
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
});
afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('session-start byte stability (AC-06)', () => {
  it.each(['startup', 'resume', 'clear', 'compact'])('gives identical bytes for unchanged state on %s, also three days later', async (source) => {
    richProject();
    const doc = path.join(root, '.specweave', 'state', 'handoff-latest.md');
    fs.writeFileSync(doc, '# h');
    fs.utimesSync(doc, new Date('2026-10-10T14:33:00Z'), new Date('2026-10-10T14:33:00Z'));
    const first = await run(source);
    const again = await run(source);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 3 * DAY);
    const later = await run(source);
    expect(first.length).toBeGreaterThan(0);
    expect(Buffer.from(again).equals(Buffer.from(first))).toBe(true);
    expect(Buffer.from(later).equals(Buffer.from(first))).toBe(true);
    expect(first).not.toMatch(/\d+[mhd] ago/);
  });

  it('prints the handoff and notes with their absolute UTC minute at startup', async () => {
    richProject();
    const t = await run('startup');
    expect(t).toContain('Last handoff: claude@mbp 2026-10-09 12:30Z: out of tokens');
    expect(t).toContain('- codex@mbp 2026-10-09 11:05Z: Use the config base URL');
  });
});

describe('session-start after compaction', () => {
  it('keeps the active increment, next task, claims hint, pickup command and memory pointer', async () => {
    richProject();
    const t = await run('compact');
    expect(t).toContain('Active increment: 0100-login — Login form (1/2 tasks pending; next: T-02 Show the error)');
    expect(t).toContain('Spec: .specweave/increments/0100-login/spec.md');
    expect(t).toContain('Run `specweave pickup` for the next task\'s acceptance criteria, claims, notes and branch state.');
    expect(t).toContain('verify and close it in the same session (sw-done)');
    expect(t).toContain('Memory: .specweave/memory/MEMORY.md (2 lines; read it before deciding anything already decided)');
  });

  it('drops the pending handoffs, the last handoff, notes and the intent board', async () => {
    richProject();
    const startup = await run('startup');
    const compact = await run('compact');
    for (const gone of ['Pending handoffs', 'Last handoff', 'Notes:', 'Use the config base URL', 'Intent board']) {
      expect(startup).toContain(gone);
      expect(compact).not.toContain(gone);
    }
    expect(Buffer.byteLength(compact)).toBeLessThan(Buffer.byteLength(startup));
  });

  it('lists every active increment (up to three) with its next task', async () => {
    writeIncrement('0301-a', { title: 'Alpha' });
    writeIncrement('0302-b', { title: 'Beta' });
    fs.writeFileSync(path.join(root, '.specweave', 'state', 'active-increment.json'), JSON.stringify({ ids: ['0301-a', '0302-b'] }));
    const t = await run('compact');
    expect(t).toContain('Active increment: 0301-a — Alpha (2/2 tasks pending; next: T-01 Wire the form)');
    expect(t).toContain('Active increment: 0302-b — Beta (2/2 tasks pending; next: T-01 Wire the form)');
    expect(t).toContain('specweave pickup');
  });

  it('still says to close when every task is done', async () => {
    writeIncrement('0401-done', {
      title: 'Done one',
      ledger: [
        { t: 'T-01', e: 'done', by: 'a', at: '2026-10-01T10:00:00Z', evidence: 'x' },
        { t: 'T-02', e: 'done', by: 'a', at: '2026-10-01T10:01:00Z', evidence: 'x' },
      ],
    });
    expect(await run('compact')).toContain('all 2 tasks done — run /sw:done 0401-done now, without asking');
  });
});

describe('session-start pending handoffs', () => {
  it('names the newest pending handoff and counts the rest', async () => {
    richProject();
    const t = await run('startup');
    const line = t.split('\n').find((l) => l.startsWith('Pending handoffs')) ?? '';
    expect(line).toContain('newest 0100 (Login form)');
    expect(line).toContain('+3 more (`specweave pickup --list`)');
    expect(line).toContain('"pick up" takes the newest; "pick up <id>" a specific one (`specweave pickup <id>`)');
    expect(line).not.toContain('One-click updates');
  });

  it('names a single pending handoff without a count', async () => {
    writeIncrement('0501-solo', { title: 'Solo', status: 'planned', tasks: false, ledger: [{ t: '*', e: 'handoff', by: 'a@m4', at: '2026-10-01T10:00:00Z' }] });
    const t = await run('startup');
    expect(t).toContain('Pending handoffs: newest 0501 (Solo). "pick up" takes the newest');
    expect(t).not.toContain('more (`specweave pickup --list`)');
  });
});
