/**
 * "Hand off" in one checkout, "pick up" in another: the round trip across
 * tools and accounts, on a 1.x increment that has tasks.md and no ledger.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildWorkHandoff } from '../../../../src/core/session/work-handoff.js';
import { applyHandoff } from '../../../../src/core/session/handoff-remote.js';
import { buildPickup } from '../../../../src/core/session/pickup.js';
import { pickupCommand, reportCommand } from '../../../../src/cli/commands/pickup.js';
import { readIncrementEvents } from '../../../../src/core/tasks/ledger.js';

let base: string;
const INC = '.specweave/increments/0766-padel-player-stats';

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function identity(dir: string, who: string) {
  git(dir, 'config', 'user.email', `${who}@example.com`);
  git(dir, 'config', 'user.name', who);
  git(dir, 'config', 'commit.gpgsign', 'false');
}

function write(dir: string, rel: string, content: string) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
}

async function quiet<T>(fn: () => Promise<T>): Promise<{ result: T; out: string }> {
  const chunks: string[] = [];
  const write = process.stdout.write;
  process.stdout.write = ((c: string) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  try { return { result: await fn(), out: chunks.join('') }; } finally { process.stdout.write = write; }
}

beforeEach(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-roundtrip-'));
  git(base, 'init', '-q', '--bare', '-b', 'develop', 'remote.git');
  const a = path.join(base, 'a');
  fs.mkdirSync(a);
  git(a, 'init', '-q', '-b', 'develop');
  identity(a, 'a');
  git(a, 'remote', 'add', 'origin', path.join(base, 'remote.git'));
  write(a, '.gitignore', '.specweave/state/\n.specweave/logs/\n');
  write(a, '.specweave/config.json', '{}\n');
  write(a, `${INC}/metadata.json`, JSON.stringify({ id: '0766-padel-player-stats', status: 'active' }));
  write(a, `${INC}/spec.md`, [
    '---', 'title: "Padel player stats"', '---', '# Padel player stats', '',
    '- [ ] **AC-US1-01**: Profile shows win rate',
    '- [ ] **AC-US1-02**: Stats update after a score is entered', '',
  ].join('\n'));
  write(a, `${INC}/tasks.md`, [
    '# Tasks', '',
    '### T-001: Stats query', '**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed', '',
    '### T-002: Profile widget', '**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending', '',
    '### T-003: Refresh on score entry', '**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] pending', '',
  ].join('\n'));
  git(a, 'add', '-A');
  git(a, 'commit', '-qm', '0766: plan');
  git(a, 'push', '-q', '-u', 'origin', 'develop');
});
afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

describe('hand off and pick up across checkouts', () => {
  it('moves claims, uncommitted edits and the next task to a fresh clone on another branch', async () => {
    const a = path.join(base, 'a');
    fs.appendFileSync(path.join(a, INC, 'ledger.jsonl'),
      JSON.stringify({ t: 'T-002', e: 'claim', by: 'claude@mbp', at: new Date().toISOString() }) + '\n');
    write(a, 'widget.js', 'half done\n');

    const handoff = await buildWorkHandoff(a, { agent: 'claude@mbp', reason: 'out of tokens' });
    expect(handoff.released).toEqual(['T-002']);
    expect(handoff.push?.handoffRef).toBe('specweave-handoff');
    expect(handoff.push?.warnings).toEqual([]);
    expect(handoff.pastePrompt).toBe('Pick up my handed-off work: run `specweave pickup` and continue with the task it names.');
    // The handing-off checkout does not pick its own handoff up again.
    expect(applyHandoff(a).status).toBe('already');

    const b = path.join(base, 'b');
    git(base, 'clone', '-q', '-b', 'develop', path.join(base, 'remote.git'), 'b');
    identity(b, 'b');
    git(b, 'checkout', '-q', '-b', 'claude/thread-xyz');

    const { result, out } = await quiet(() => pickupCommand({ cwd: b, agent: 'codex@cloud' }));
    expect(result).toBe(0);
    expect(out).toContain('Picked up the handoff from claude@mbp');
    expect(out).toContain('(out of tokens)');
    expect(out).toContain('Next: T-002 Profile widget');
    expect(out).toContain('  AC-US1-01: Profile shows win rate');
    expect(fs.readFileSync(path.join(b, 'widget.js'), 'utf8')).toBe('half done\n');
    expect(git(b, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('claude/thread-xyz');

    const events = readIncrementEvents(path.join(b, INC, 'ledger.jsonl'), ['handoff', 'pickup']);
    expect(events.map((e) => `${e.e}:${e.by}`)).toEqual(['handoff:claude@mbp', 'pickup:codex@cloud']);
    expect(fs.existsSync(path.join(b, INC, 'reports', 'handoff-report.html'))).toBe(true);

    // A second pickup in the same checkout is a no-op.
    expect(applyHandoff(b).status).toBe('already');
  });

  it('comes back: fast-forwards the original checkout and sets its stale edits aside', async () => {
    const a = path.join(base, 'a');
    write(a, 'widget.js', 'half done\n');
    await buildWorkHandoff(a, { agent: 'claude@mbp', reason: 'out of tokens' });

    const b = path.join(base, 'b');
    git(base, 'clone', '-q', '-b', 'develop', path.join(base, 'remote.git'), 'b');
    identity(b, 'b');
    await quiet(() => pickupCommand({ cwd: b, agent: 'codex@cloud' }));
    write(b, 'widget.js', 'finished\n');
    git(b, 'add', '-A');
    git(b, 'commit', '-qm', '0766: profile widget');
    await buildWorkHandoff(b, { agent: 'codex@cloud', reason: 'switching back' });

    // A still has its own handed-off edits; they are part of B's history now.
    const { out } = await quiet(() => pickupCommand({ cwd: a, agent: 'claude@mbp' }));
    expect(out).toContain('Picked up the handoff from codex@cloud');
    expect(out).toContain('moved this branch forward 1 commit');
    expect(fs.readFileSync(path.join(a, 'widget.js'), 'utf8')).toBe('finished\n');
    expect(git(a, 'stash', 'list')).toContain('edits already handed off');
  });

  it('never overwrites edits it has not seen', async () => {
    const a = path.join(base, 'a');
    await buildWorkHandoff(a, { agent: 'claude@mbp' });
    const b = path.join(base, 'b');
    git(base, 'clone', '-q', '-b', 'develop', path.join(base, 'remote.git'), 'b');
    write(b, 'mine.js', 'local work\n');
    const res = applyHandoff(b);
    expect(res.status).toBe('dirty');
    expect(res.message).toContain('nothing was applied');
    expect(fs.readFileSync(path.join(b, 'mine.js'), 'utf8')).toBe('local work\n');
  });

  it('keeps a handoff local with push: false and says so', async () => {
    const res = await buildWorkHandoff(path.join(base, 'a'), { agent: 'claude@mbp', push: false });
    expect(res.push).toBeUndefined();
    expect(git(path.join(base, 'remote.git'), 'branch', '--list', 'specweave-handoff')).toBe('');
  });

  it('writes an HTML report of the chain of custody', async () => {
    const a = path.join(base, 'a');
    await buildWorkHandoff(a, { agent: 'claude@mbp', reason: 'out of tokens' });
    const { out } = await quiet(() => reportCommand({ cwd: a, incrementId: '0766' }));
    expect(out).toContain(`${INC}/reports/handoff-report.html`);
    const html = fs.readFileSync(path.join(a, INC, 'reports', 'handoff-report.html'), 'utf8');
    expect(html).toContain('<title>Handoff report: Padel player stats</title>');
    expect(html).toContain('handed off');
    expect(html).toContain('out of tokens');
    expect(html).not.toMatch(/<script/i);
  });

  it('pickup on a legacy increment shows tasks.md state and AC text without a migration', () => {
    const text = buildPickup(path.join(base, 'a'), { agent: 'claude@mbp' }).text;
    expect(text).toContain('Increment 0766-padel-player-stats "Padel player stats" (active) · tasks 1/3 done');
    expect(text).toContain('Next: T-002 Profile widget');
    expect(text).toContain('  AC-US1-01: Profile shows win rate');
  });
});
