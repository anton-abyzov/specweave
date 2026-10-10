import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  usageGuard, recordClaudeUsage, codexWindows, codexUsage, writeSettings, readSettings, latestCodexReading, claudeCachedReading, desktopUsageReading, claudeFallbackReading, studioThreadId,
} from '../../../../src/core/session/usage-guard.js';
import { autoHandoffCommand, autoHandoffStatus, codexHookTrusted, statuslineCommand, usageGuardCommand } from '../../../../src/cli/commands/auto-handoff.js';

vi.mock('../../../../src/core/session/session-checkpoint.js', () => ({ queueSessionCheckpoint: vi.fn() }));
import { queueSessionCheckpoint } from '../../../../src/core/session/session-checkpoint.js';

let home: string;
/** A SpecWeave project under the temp home; the guard only asks inside one. */
let proj: string;
const NOW = Date.parse('2026-09-25T20:00:00Z');
const LATER = NOW / 1000 + 3600;
// The shape Studio gives a worker its project coordinator delegated to.
const WORKER_THREAD_ID = 'thread:delegated-task:command%3Amcp%3A6f1c2b9e-3d4a-4e8b-9c1f-2a7d5e8b0c43%3Adelegate-task%3Arecord-footage';

function claudeStatus(session: string, fiveHour: number, weekly = 10) {
  return {
    session_id: session,
    model: { display_name: 'Opus' },
    workspace: { current_dir: '/work/app' },
    rate_limits: {
      five_hour: { used_percentage: fiveHour, resets_at: LATER },
      seven_day: { used_percentage: weekly, resets_at: LATER + 86400 },
    },
  };
}

function rollout(primary: number, secondary: number, credits?: Record<string, unknown>): string {
  const file = path.join(home, '.codex', 'sessions', '2026', '09', '25', 'rollout-2026-09-25T19-00-00-abc.jsonl');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tokenCount = (p: number) => JSON.stringify({
    timestamp: '2026-09-25T19:59:00Z', type: 'event_msg',
    payload: {
      type: 'token_count', info: { total_token_usage: { input_tokens: 1 } },
      rate_limits: {
        limit_id: 'codex', primary: { used_percent: p, window_minutes: 300, resets_at: LATER },
        secondary: { used_percent: secondary, window_minutes: 10080, resets_at: LATER + 86400 },
        ...(credits ? { credits } : {}),
      },
    },
  });
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'session_meta', payload: { id: 'abc' } }),
    tokenCount(12),
    JSON.stringify({ type: 'response_item', payload: { type: 'message', content: 'mentions "rate_limits" in text' } }),
    tokenCount(primary),
    JSON.stringify({ type: 'event_msg', payload: { type: 'agent_message', message: 'done' } }),
  ].join('\n') + '\n');
  return file;
}

/** One `token_count` line as Codex logs it: a limit bucket, its weekly window and the credits beside it. */
function codexEvent(minutesAgo: number, weekly: number, credits?: Record<string, unknown> | null, bucket: { limit_id?: string | null; limit_name?: string } = { limit_id: 'codex' }): string {
  return JSON.stringify({
    timestamp: new Date(NOW - minutesAgo * 60_000).toISOString(), type: 'event_msg',
    payload: {
      type: 'token_count', info: null,
      rate_limits: { ...bucket, primary: { used_percent: weekly, window_minutes: 10080, resets_at: LATER + 86400 }, secondary: null, credits: credits ?? null, plan_type: 'pro' },
    },
  });
}

function rolloutOf(name: string, lines: string[]): string {
  const file = path.join(home, '.codex', 'sessions', '2026', '09', '25', `rollout-2026-09-25T19-00-00-${name}.jsonl`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, [JSON.stringify({ type: 'session_meta', payload: { id: name } }), ...lines].join('\n') + '\n');
  return file;
}

const credits = (balance: number) => ({ has_credits: true, unlimited: false, balance: balance.toFixed(10) });
const RESERVE = { limit_id: 'base_model_inference', limit_name: 'gpt-reserve' };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SPECWEAVE_STUDIO_THREAD_ID;
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-usage-'));
  proj = path.join(home, 'proj');
  fs.mkdirSync(path.join(proj, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.specweave', 'config.json'), '{}');
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

function claudeCache(fiveHour: number, fetchedAtMs: number, extra: Record<string, unknown> = {}) {
  const reset = new Date(LATER * 1000).toISOString();
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({
    numStartups: 3,
    oauthAccount: { accountUuid: 'acc-1', emailAddress: 'a@b.c' },
    cachedUsageUtilization: {
      fetchedAtMs, accountUuid: 'acc-1',
      utilization: { five_hour: { utilization: fiveHour, resets_at: reset }, seven_day: { utilization: 30, resets_at: reset }, seven_day_opus: null },
      ...extra,
    },
  }));
}

describe('usage guard: sessions without a status line (desktop, Remote Control, claude -p)', () => {
  beforeEach(() => { delete process.env.CLAUDE_CONFIG_DIR; });

  it('reads Claude Code\'s usage cache when the status line never ran', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    claudeCache(93, NOW - 10 * 60_000);
    expect(claudeCachedReading({ home, now: NOW })?.windows).toEqual([
      { name: '5-hour', percent: 93, resetsAt: LATER },
      { name: 'weekly', percent: 30, resetsAt: LATER },
    ]);
    const res = usageGuard({ cwd: proj, session_id: 'desk-1', transcript_path: path.join(home, 'x.jsonl') }, { home, now: NOW });
    expect(res.hookSpecificOutput?.additionalContext).toContain('93% of the 5-hour limit');
  });

  it('ignores a cache older than an hour or saved for another account', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    claudeCache(95, NOW - 61 * 60_000);
    expect(usageGuard({ cwd: proj, session_id: 'd1' }, { home, now: NOW })).toEqual({});
    claudeCache(95, NOW - 60_000, { accountUuid: 'acc-2' });
    expect(usageGuard({ cwd: proj, session_id: 'd2' }, { home, now: NOW })).toEqual({});
  });

  it('prefers what this session\'s status line saw', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    claudeCache(95, NOW - 60_000);
    recordClaudeUsage(claudeStatus('term-1', 40), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 'term-1' }, { home, now: NOW })).toEqual({});
  });

  function desktopSamples(samples: object[]) {
    const dir = path.join(home, 'Library', 'Application Support', 'Claude');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'plan-usage-history.json'), JSON.stringify({ version: 2, samples }));
  }
  const mac = { platform: 'darwin' as const };

  it('reads the desktop app\'s newest sample for this session\'s organization', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    desktopSamples([
      { t: NOW - 40 * 60_000, org: 'org-a', u: { fh: 50, sd: 20, xu: 0 } },
      { t: NOW - 5 * 60_000, org: 'org-a', u: { fh: 94, sd: 31, xu: 0 } },
      { t: NOW - 60_000, org: 'org-b', u: { fh: 10, sd: 5 } },
    ]);
    const env = { CLAUDE_CODE_ORGANIZATION_UUID: 'org-a', CLAUDE_CODE_ENTRYPOINT: 'claude-desktop' };
    expect(desktopUsageReading({ home, now: NOW, env, ...mac })).toEqual({
      tool: 'Claude Code', at: NOW - 5 * 60_000, windows: [{ name: '5-hour', percent: 94 }, { name: 'weekly', percent: 31 }],
    });
    const res = usageGuard({ cwd: proj, session_id: 'desk-2' }, { home, now: NOW, env, ...mac });
    expect(res.hookSpecificOutput?.additionalContext).toContain('94% of the 5-hour limit');
    // Another organization's session sees its own, lower sample.
    expect(usageGuard({ cwd: proj, session_id: 'desk-3' }, { home, now: NOW, env: { CLAUDE_CODE_ORGANIZATION_UUID: 'org-b' }, ...mac })).toEqual({});
  });

  it('ignores a desktop sample older than 20 minutes, and several organizations with none named', () => {
    desktopSamples([{ t: NOW - 21 * 60_000, org: 'org-a', u: { fh: 99, sd: 40 } }]);
    expect(desktopUsageReading({ home, now: NOW, env: { CLAUDE_CODE_ORGANIZATION_UUID: 'org-a' }, ...mac })).toBeUndefined();
    // One organization in the file: no variable needed.
    desktopSamples([{ t: NOW - 60_000, org: 'org-a', u: { fh: 91 } }]);
    expect(desktopUsageReading({ home, now: NOW, env: {}, ...mac })?.windows).toEqual([{ name: '5-hour', percent: 91 }]);
    desktopSamples([{ t: NOW - 60_000, org: 'org-a', u: { fh: 91 } }, { t: NOW - 60_000, org: 'org-b', u: { fh: 5 } }]);
    expect(desktopUsageReading({ home, now: NOW, env: {}, ...mac })).toBeUndefined();
  });

  it('uses the fresher of the desktop sample and the usage cache', () => {
    claudeCache(70, NOW - 2 * 60_000);
    desktopSamples([{ t: NOW - 10 * 60_000, org: 'org-a', u: { fh: 60, sd: 20 } }]);
    const env = { CLAUDE_CODE_ORGANIZATION_UUID: 'org-a' };
    expect(claudeFallbackReading({ home, now: NOW, env, ...mac })?.windows[0].percent).toBe(70);
    claudeCache(70, NOW - 30 * 60_000);
    expect(claudeFallbackReading({ home, now: NOW, env, ...mac })?.windows[0].percent).toBe(60);
  });

  it('honours CLAUDE_CONFIG_DIR', () => {
    const dir = path.join(home, 'alt');
    fs.mkdirSync(dir);
    claudeCache(91, NOW);
    fs.renameSync(path.join(home, '.claude.json'), path.join(dir, '.claude.json'));
    expect(claudeCachedReading({ home, now: NOW })).toBeUndefined();
    expect(claudeCachedReading({ home, now: NOW, env: { CLAUDE_CONFIG_DIR: dir } })?.windows[0].percent).toBe(91);
  });
});

describe('usage guard', () => {
  it('does nothing until auto-handoff is on', () => {
    recordClaudeUsage(claudeStatus('s1', 95), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
  });

  it('Claude Code: blocks once when the status line saw the 5-hour window past the threshold', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 50), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});

    recordClaudeUsage(claudeStatus('s1', 92.4), home, NOW);
    const first = usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW });
    // Not a block: Claude Code shows a block to the user as "Stop hook error".
    expect(first.decision).toBeUndefined();
    const context = first.hookSpecificOutput?.additionalContext ?? '';
    expect(first.hookSpecificOutput?.hookEventName).toBe('Stop');
    expect(context).toContain('Usage is at 92% of the 5-hour limit');
    expect(context).toContain('specweave handoff --reason "usage at 92% of the 5-hour limit"');
    expect(context).toContain('"pick up"');
    expect(context).toContain('It resets in 1 h.');
    expect(first.systemMessage).toBe('Auto-handoff: usage is at 92% of the 5-hour limit, which resets in 1 h, so this session is handing off. Say "pick up" in another tool or account to continue.');
    // The handoff turn ends with another Stop; it must not loop.
    expect(usageGuard({ cwd: proj, session_id: 's1', stop_hook_active: true }, { home, now: NOW })).toEqual({});
    // Other sessions are judged on their own.
    expect(usageGuard({ cwd: proj, session_id: 's2' }, { home, now: NOW })).toEqual({});
  });

  it('asks again in a later window once the window that triggered the handoff has reset', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 95), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW }).hookSpecificOutput).toBeDefined();
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW + 60_000 })).toEqual({});
    // The 5-hour window resets; the session keeps going and fills the next one.
    const next = LATER + 5 * 3600;
    recordClaudeUsage({ ...claudeStatus('s1', 93), rate_limits: { five_hour: { used_percentage: 93, resets_at: next } } }, home, NOW);
    const again = usageGuard({ cwd: proj, session_id: 's1' }, { home, now: (LATER + 60) * 1000 });
    expect(again.hookSpecificOutput?.additionalContext).toContain('93% of the 5-hour limit');
  });

  it('a marker from 3.0.3 (no reset time) keeps the session handed off', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 95), home, NOW);
    fs.writeFileSync(path.join(home, '.specweave', 'usage', 's1.handed-off'), '2026-09-25T20:00:00.000Z 5-hour 95\n');
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
  });

  it('ignores a window that has already reset', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 97), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: (LATER + 1) * 1000 })).toEqual({});
  });

  it('Codex: reads the newest token_count in the rollout the hook points at', () => {
    writeSettings({ at: 85, mode: 'enforce' }, home);
    const file = rollout(88, 40);
    expect(codexWindows(file)).toEqual([
      { name: '5-hour', percent: 88, resetsAt: LATER },
      { name: 'weekly', percent: 40, resetsAt: LATER + 86400 },
    ]);
    const res = usageGuard({ cwd: proj, session_id: 'abc', transcript_path: file }, { home, now: NOW });
    expect(res.decision).toBe('block'); // Codex reads a block reason
    expect(res.reason).toContain('88% of the 5-hour limit');
  });

  it('Codex: the weekly window counts too', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const res = usageGuard({ cwd: proj, session_id: 'abc', transcript_path: rollout(30, 91) }, { home, now: NOW });
    expect(res.reason).toContain('91% of the weekly limit');
  });

  it('Codex: a plan with credits keeps working past 100%, so it is never asked to hand off', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    // What Codex Desktop logged on a Pro plan at its weekly limit with credits left.
    const file = rollout(30, 100, { has_credits: true, unlimited: false, balance: '48664.5782495000' });
    expect(codexUsage(file)).toEqual({
      windows: [{ name: '5-hour', percent: 30, resetsAt: LATER }, { name: 'weekly', percent: 100, resetsAt: LATER + 86400 }],
      credits: true,
    });
    expect(usageGuard({ cwd: proj, session_id: 'abc', transcript_path: file }, { home, now: NOW })).toEqual({});
    expect(fs.existsSync(path.join(home, '.specweave', 'usage', 'abc.handed-off'))).toBe(false);
    expect(usageGuard({ cwd: proj, session_id: 'abc', transcript_path: rollout(30, 100, { has_credits: false, unlimited: true }) }, { home, now: NOW })).toEqual({});
  });

  it('Codex: no credits, or an empty balance, still hands off', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    for (const [id, credits] of [['a', { has_credits: false, unlimited: false, balance: '0' }], ['b', { has_credits: true, unlimited: false, balance: '0' }], ['c', null]] as const) {
      const res = usageGuard({ cwd: proj, session_id: id, transcript_path: rollout(30, 100, credits ?? undefined) }, { home, now: NOW });
      expect(res.reason, id).toContain('100% of the weekly limit');
    }
  });

  it('Codex: reads the plan limit, not another bucket that logged later', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const none = { has_credits: false, unlimited: false, balance: '0' };
    // A session at 95% with no credits; Codex then logs its gpt-reserve bucket at 0% and a window-less premium one.
    const hidden = rolloutOf('hidden', [
      codexEvent(6, 95, none),
      codexEvent(5, 0, none, RESERVE),
      JSON.stringify({ timestamp: new Date(NOW).toISOString(), type: 'event_msg', payload: { type: 'token_count', rate_limits: { limit_id: 'premium', primary: null, secondary: null, credits: none } } }),
    ]);
    expect(codexUsage(hidden)).toEqual({ windows: [{ name: 'weekly', percent: 95, resetsAt: LATER + 86400 }], credits: false });
    expect(usageGuard({ cwd: proj, session_id: 'hidden', transcript_path: hidden }, { home, now: NOW }).reason).toContain('95% of the weekly limit');

    // The reserve bucket has no credits of its own; the plan's credits still count.
    const reserve = rolloutOf('reserve', [codexEvent(6, 100, credits(48664)), codexEvent(5, 92, none, RESERVE)]);
    expect(codexUsage(reserve)).toMatchObject({ windows: [{ name: 'weekly', percent: 100 }], credits: true });
    expect(usageGuard({ cwd: proj, session_id: 'reserve', transcript_path: reserve }, { home, now: NOW })).toEqual({});

    // An older Codex without limit_id, and a tail that only holds another bucket.
    expect(codexUsage(rolloutOf('plain', [codexEvent(5, 91, null, {})])).windows[0].percent).toBe(91);
    expect(codexUsage(rolloutOf('only', [codexEvent(5, 40, none, RESERVE)])).windows[0].percent).toBe(40);
  });

  it('Codex: credits that are about to run out do ask, once', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    // 2,400 credits gone in 30 minutes: the 600 left last about 7.5 minutes.
    const low = rolloutOf('low', [codexEvent(70, 100, credits(9000)), codexEvent(30, 100, credits(3000)), codexEvent(12, 100, credits(1500)), codexEvent(0, 100, credits(600))]);
    expect(codexUsage(low).creditMinutesLeft).toBeCloseTo(7.5, 5);
    const res = usageGuard({ cwd: proj, session_id: 'low', transcript_path: low }, { home, now: NOW });
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('Usage is at 100% of the weekly limit and credits are running out (about 8 min left at the current rate).');
    expect(res.reason).toContain('specweave handoff --reason "usage at 100% of the weekly limit, credits running out"');
    expect(usageGuard({ cwd: proj, session_id: 'low', transcript_path: low }, { home, now: NOW })).toEqual({});
    // Outside a project there is still nothing to hand off.
    expect(usageGuard({ cwd: home, session_id: 'low2', transcript_path: low }, { home, now: NOW })).toEqual({});
    // Under the threshold the plan itself still has room; credits are not being spent yet.
    const early = rolloutOf('early', [codexEvent(30, 70, credits(3000)), codexEvent(0, 80, credits(600))]);
    expect(usageGuard({ cwd: proj, session_id: 'early', transcript_path: early }, { home, now: NOW })).toEqual({});
  });

  it('Codex: a small top-up does not hide a balance that is still running out', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    // 50 credits a minute before and after a top-up of 2,000: the 2,300 left last 46 minutes.
    const file = rolloutOf('partial', [codexEvent(55, 100, credits(3000)), codexEvent(10, 100, credits(750)), codexEvent(9, 100, credits(2750)), codexEvent(0, 100, credits(2300))]);
    expect(codexUsage(file).creditMinutesLeft).toBeCloseTo(46, 5);
    expect(usageGuard({ cwd: proj, session_id: 'partial', transcript_path: file }, { home, now: NOW }).reason).toContain('about 46 min left');
  });

  it('Codex: reads back through a long log, past large lines and other buckets', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const none = { has_credits: false, unlimited: false, balance: '0' };
    // Tool output with multi-byte text between records, 400 KB a line: 4 MB between the two balances, four chunks.
    const bulk = (i: number) => JSON.stringify({ type: 'response_item', payload: { type: 'function_call_output', output: `${i} "rate_limits" ` + 'é漢🙂 '.repeat(40_000) } });
    const lines = [codexEvent(30, 100, credits(3000))];
    for (let i = 0; i < 10; i++) lines.push(bulk(i));
    lines.push(codexEvent(0, 100, credits(600)));
    const long = rolloutOf('long', lines);
    expect(fs.statSync(long).size).toBeGreaterThan(3 * 1024 * 1024);
    expect(codexUsage(long)).toEqual({ windows: [{ name: 'weekly', percent: 100, resetsAt: LATER + 86400 }], credits: true, creditMinutesLeft: 7.5 });

    // The plan record is 4 MB back, behind gpt-reserve records at 0%.
    const behind = [codexEvent(30, 96, none)];
    for (let i = 0; i < 10; i++) behind.push(bulk(i), codexEvent(20 - i, 0, none, RESERVE));
    const hidden = rolloutOf('far', behind);
    expect(codexUsage(hidden)).toEqual({ windows: [{ name: 'weekly', percent: 96, resetsAt: LATER + 86400 }], credits: false });
    expect(usageGuard({ cwd: proj, session_id: 'far', transcript_path: hidden }, { home, now: NOW }).reason).toContain('96% of the weekly limit');

    // No trailing newline, CRLF and an empty file do not throw.
    fs.writeFileSync(long, [codexEvent(30, 100, credits(3000)), codexEvent(0, 100, credits(600))].join('\r\n'));
    expect(codexUsage(long).creditMinutesLeft).toBeCloseTo(7.5, 5);
    fs.writeFileSync(long, '');
    expect(codexUsage(long)).toEqual({ windows: [], credits: false });
    expect(codexUsage(path.join(home, 'rollout-missing.jsonl'))).toEqual({ windows: [], credits: false });
  });

  it('Codex: a healthy, refilled, unlimited or unmeasured credit balance stays quiet', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const stays = (name: string, lines: string[], minutes?: number) => {
      const file = rolloutOf(name, lines);
      const usage = codexUsage(file);
      expect(usage.credits, name).toBe(true);
      if (minutes === undefined) expect(usage.creditMinutesLeft, name).toBeUndefined();
      else expect(usage.creditMinutesLeft, name).toBeCloseTo(minutes, 5);
      expect(usageGuard({ cwd: proj, session_id: name, transcript_path: file }, { home, now: NOW }), name).toEqual({});
    };
    // 1,000 credits in 30 minutes with 48,000 left: a day of work.
    stays('healthy', [codexEvent(30, 100, credits(49000)), codexEvent(0, 100, credits(48000))], 1440);
    // Topped up inside the hour: only what was spent since the top-up counts.
    stays('refilled', [codexEvent(40, 100, credits(300)), codexEvent(20, 100, credits(60000)), codexEvent(0, 100, credits(59000))], 1180);
    stays('refilled-lower', [codexEvent(40, 100, credits(20000)), codexEvent(10, 100, credits(100)), codexEvent(5, 100, credits(10000)), codexEvent(0, 100, credits(9900))], 495);
    // The balance ran out and was topped up: the record without credits ends the measurement.
    stays('ran-out', [codexEvent(50, 100, credits(5000)), codexEvent(40, 100, { has_credits: false, unlimited: false, balance: '0' }), codexEvent(30, 100, credits(3000)), codexEvent(0, 100, credits(2500))], 150);
    // A balance Codex did not report is unknown, not zero.
    stays('null-now', [codexEvent(30, 100, credits(3000)), codexEvent(0, 100, { has_credits: true, unlimited: false, balance: null })]);
    stays('null-then', [codexEvent(30, 100, { has_credits: true, unlimited: false, balance: null }), codexEvent(0, 100, credits(48000))]);
    stays('empty', [codexEvent(30, 100, credits(3000)), codexEvent(0, 100, { has_credits: true, unlimited: false, balance: '' })]);
    // Balances seconds apart jitter; they are not a rate.
    stays('jitter', [codexEvent(1, 100, credits(700)), codexEvent(0, 100, credits(600))]);
    // Only balances from the last hour count.
    stays('stale', [codexEvent(90, 100, credits(5000)), codexEvent(0, 100, credits(600))]);
    stays('single', [codexEvent(0, 100, credits(600))]);
    stays('unlimited', [codexEvent(30, 100, { has_credits: true, unlimited: true, balance: '3000' }), codexEvent(0, 100, { has_credits: true, unlimited: true, balance: '600' })]);
  });

  it('asks nothing outside a SpecWeave project: a plain chat has nothing to hand off', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 97), home, NOW);
    const file = rollout(30, 100);
    // Codex Desktop starts a chat with no folder in the home directory, where ~/.specweave has no config.json.
    expect(usageGuard({ cwd: home, session_id: 'abc', transcript_path: file }, { home, now: NOW })).toEqual({});
    expect(usageGuard({ cwd: home, session_id: 's1' }, { home, now: NOW })).toEqual({});
    expect(usageGuard({ session_id: 's1' }, { home, now: NOW })).toEqual({});
    expect(fs.readdirSync(path.join(home, '.specweave', 'usage')).filter((n) => n.endsWith('.handed-off'))).toEqual([]);
    // The same sessions inside a project, or a folder under it, are asked.
    const sub = path.join(proj, 'src');
    fs.mkdirSync(sub);
    expect(usageGuard({ cwd: sub, session_id: 'abc', transcript_path: file }, { home, now: NOW }).decision).toBe('block');
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW }).hookSpecificOutput).toBeDefined();
  });

  it('never reads a Claude transcript as a Codex rollout', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const file = path.join(home, 'transcript.jsonl');
    fs.writeFileSync(file, JSON.stringify({ payload: { rate_limits: { primary: { used_percent: 99 } } } }) + '\n');
    expect(usageGuard({ cwd: proj, session_id: 'x', transcript_path: file }, { home, now: NOW })).toEqual({});
  });

  it('rejects session ids that could escape the usage folder', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage({ ...claudeStatus('../../evil', 99) }, home, NOW);
    expect(fs.existsSync(path.join(home, 'evil.json'))).toBe(false);
    expect(usageGuard({ cwd: proj, session_id: '../../evil' }, { home, now: NOW })).toEqual({});
  });
});

async function quiet<T>(fn: () => Promise<T>): Promise<string> {
  const chunks: string[] = [];
  const write = process.stdout.write;
  process.stdout.write = ((c: string) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  try { await fn(); } finally { process.stdout.write = write; }
  return chunks.join('');
}

describe('specweave auto-handoff on/off', () => {
  it('wraps an existing status line, adds one Stop hook per tool, and restores everything on off', async () => {
    const claudeFile = path.join(home, '.claude', 'settings.json');
    const codexFile = path.join(home, '.codex', 'hooks.json');
    fs.mkdirSync(path.dirname(claudeFile), { recursive: true });
    fs.mkdirSync(path.dirname(codexFile), { recursive: true });
    const original = { model: 'opus', statusLine: { type: 'command', command: "bash ~/.claude/it's-mine.sh", padding: 0 } };
    fs.writeFileSync(claudeFile, JSON.stringify(original));

    const out = await quiet(() => autoHandoffCommand('on', { home }));
    expect(out).toContain('Auto-handoff is on');
    await quiet(() => autoHandoffCommand('on', { home, at: 85 })); // idempotent, new threshold

    const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
    expect(claude.model).toBe('opus');
    expect(claude.statusLine).toEqual({ type: 'command', padding: 0, command: `specweave statusline --wrap 'bash ~/.claude/it'\\''s-mine.sh'` });
    expect(claude.hooks.Stop).toEqual([{ hooks: [{ type: 'command', command: 'specweave usage-guard', timeout: 10 }] }]);
    expect(claude.hooks.StopFailure).toEqual([{ matcher: 'rate_limit', hooks: [{ type: 'command', command: 'specweave usage-guard --limit-hit', timeout: 60 }] }]);
    expect(JSON.parse(fs.readFileSync(codexFile, 'utf8')).hooks.Stop).toHaveLength(1);
    expect(readSettings(home)?.at).toBe(85);

    await quiet(() => autoHandoffCommand('off', { home }));
    expect(JSON.parse(fs.readFileSync(claudeFile, 'utf8'))).toEqual(original);
    expect(JSON.parse(fs.readFileSync(codexFile, 'utf8'))).toEqual({});
    expect(readSettings(home)).toBeUndefined();
  });

  it('leaves Codex alone when it is not installed', async () => {
    await quiet(() => autoHandoffCommand('on', { home }));
    expect(fs.existsSync(path.join(home, '.codex'))).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8')).statusLine.command).toBe('specweave statusline');
  });
});

describe('specweave auto-handoff status', () => {
  it('says it is off until turned on', () => {
    expect(autoHandoffStatus(home)).toEqual(['Auto-handoff is off. Turn it on with `specweave auto-handoff on`.']);
  });

  it('shows each tool\'s hooks and the last usage it reported', async () => {
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    await quiet(() => autoHandoffCommand('on', { home }));
    recordClaudeUsage(claudeStatus('s1', 42, 12), home, NOW - 3 * 60_000);
    const file = rollout(61, 20);
    fs.utimesSync(file, (NOW - 10 * 60_000) / 1000, (NOW - 10 * 60_000) / 1000);
    fs.writeFileSync(path.join(home, '.codex', 'config.toml'),
      `[hooks.state."${path.join(home, '.codex', 'hooks.json')}:stop:0:0"]\ntrusted_hash = "sha256:abc"\n`);

    const lines = autoHandoffStatus(home, NOW);
    expect(lines[0]).toMatch(/^Auto-handoff is on at 95% in suggest mode/);
    expect(lines[0]).toContain('nothing when every full window resets within 30 min');
    expect(lines[1]).toBe('Claude Code: status line, Stop and StopFailure hooks in place; last reading 5-hour 42% · weekly 12% (3 min ago)');
    expect(lines[2]).toContain('Desktop, Remote Control and `claude -p` sessions run no status line');
    expect(lines[3]).toBe('Codex: Stop hook in place; last reading 5-hour 61% · weekly 20% (10 min ago)');
    expect(lines[4]).toContain(path.join(home, '.specweave', 'checkpoints'));
    expect(lines[5]).toContain('a handoff does');
    expect(lines).toHaveLength(6);
  });

  it('says when Codex credits keep its sessions from being asked to hand off', async () => {
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    await quiet(() => autoHandoffCommand('on', { home }));
    rollout(30, 100, { has_credits: true, unlimited: false, balance: '12.5' });
    const lines = autoHandoffStatus(home);
    const at = lines.findIndex((l) => l.startsWith('Codex: '));
    expect(lines[at]).toContain('last reading 5-hour 30% · weekly 100%');
    expect(lines[at + 1]).toContain('This Codex plan has credits');
    expect(latestCodexReading(home)?.credits).toBe(true);
  });

  it('says when Codex credits are about to run out', async () => {
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    await quiet(() => autoHandoffCommand('on', { home }));
    const codexLine = () => { const lines = autoHandoffStatus(home, NOW); return lines[lines.findIndex((l) => l.startsWith('Codex: ')) + 1]; };
    rolloutOf('low', [codexEvent(30, 100, credits(3000)), codexEvent(0, 100, credits(600))]);
    expect(codexLine()).toContain("This Codex plan's credits are running out: about 8 min left");
    // Under the threshold the hook does not ask, so status does not say it will.
    rolloutOf('low', [codexEvent(30, 40, credits(3000)), codexEvent(0, 41, credits(600))]);
    expect(codexLine()).toContain('This Codex plan has credits');
    expect(codexLine()).toContain('at 95% or more is told a handoff is available only when');
    const healthy = rolloutOf('low', [codexEvent(30, 100, credits(49000)), codexEvent(0, 100, credits(48000))]);
    expect(codexLine()).toContain('under 60 minutes of credits left at the rate they are being spent (about 24 h now)');
    // A log from hours ago says nothing about the rate now.
    const old = (NOW - 3 * 3600_000) / 1000;
    fs.utimesSync(healthy, old, old);
    expect(codexLine()).toContain('This Codex plan has credits');
    expect(codexLine()).not.toContain(' now)');
  });

  it('names checkpoint-only mode', async () => {
    await quiet(() => autoHandoffCommand('on', { home, checkpointOnly: true }));
    expect(autoHandoffStatus(home, NOW)[0]).toMatch(/^Auto-handoff is on in checkpoint-only mode/);
  });

  it('tells you to approve the Codex hook until Codex trusts it', async () => {
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    fs.writeFileSync(path.join(home, '.codex', 'config.toml'), 'model = "gpt-5"\n');
    const out = await quiet(() => autoHandoffCommand('on', { home }));
    expect(out).toContain('open `codex` in a terminal once and approve the hook');
    const lines = autoHandoffStatus(home, NOW);
    expect(lines).toContain('Codex: Stop hook in place but not approved yet; no usage reading yet');
    expect(lines.find((l) => l.startsWith('  Codex skips a hook'))).toContain('open `codex` in a terminal and approve the hook when it asks. It asks again whenever the hook changes');
  });

  it('counts only Codex\'s trust entry for this hook, not plugin Stop hooks', async () => {
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    const hooksFile = path.join(home, '.codex', 'hooks.json');
    // Someone else's Stop hook comes first, so ours is group 1.
    fs.writeFileSync(hooksFile, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'other' }] }] } }));
    await quiet(() => autoHandoffCommand('on', { home }));
    const toml = (body: string) => fs.writeFileSync(path.join(home, '.codex', 'config.toml'), body);

    toml([
      '[hooks.state."codex@openai-codex:hooks/hooks.json:stop:0:0"]', 'trusted_hash = "sha256:p1"', '',
      '[hooks.state."sw@specweave:hooks/hooks.json:stop:0:0"]', 'trusted_hash = "sha256:p2"', '',
      `[hooks.state."${hooksFile}:pre_tool_use:0:0"]`, 'trusted_hash = "sha256:u1"', '',
      `[hooks.state."${hooksFile}:stop:0:0"]`, 'trusted_hash = "sha256:other"', '',
    ].join('\n'));
    expect(codexHookTrusted(home)).toBe(false);

    toml(`[hooks.state."${hooksFile}:stop:1:0"]\nenabled = true\n`); // seen, never approved
    expect(codexHookTrusted(home)).toBe(false);

    toml(`model = "gpt-5"\n\n[hooks.state."${hooksFile}:stop:1:0"]\ntrusted_hash = "sha256:ours"\n`);
    expect(codexHookTrusted(home)).toBe(true);
  });

  it('falls back to Claude Code\'s own usage cache when no status line ran', async () => {
    await quiet(() => autoHandoffCommand('on', { home }));
    claudeCache(87, NOW - 5 * 60_000);
    expect(autoHandoffStatus(home, NOW)[1]).toBe(
      'Claude Code: status line, Stop and StopFailure hooks in place; last reading 5-hour 87% · weekly 30% (5 min ago) from Claude Code\'s usage cache');
  });

  it('names what is missing when a hook was removed by hand', async () => {
    await quiet(() => autoHandoffCommand('on', { home }));
    const claudeFile = path.join(home, '.claude', 'settings.json');
    const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
    delete claude.hooks.Stop;
    claude.statusLine = { type: 'command', command: 'my-line' };
    fs.writeFileSync(claudeFile, JSON.stringify(claude));
    const lines = autoHandoffStatus(home, NOW);
    expect(lines[1]).toBe('Claude Code: missing status line, Stop hook; no usage reading yet');
    expect(lines.at(-1)).toContain('auto-handoff on` again');
  });

  it('finds the newest Codex session log across date folders', () => {
    const old = path.join(home, '.codex', 'sessions', '2026', '09', '24', 'rollout-old.jsonl');
    fs.mkdirSync(path.dirname(old), { recursive: true });
    fs.writeFileSync(old, JSON.stringify({ payload: { rate_limits: { primary: { used_percent: 5, window_minutes: 300 } } } }) + '\n');
    rollout(77, 30);
    expect(latestCodexReading(home)?.windows[0]).toMatchObject({ name: '5-hour', percent: 77 });
  });
});

describe('specweave statusline', () => {
  async function statusLine(cwd: string): Promise<string> {
    // The status line compares reset times with the real clock.
    const soon = Math.floor(Date.now() / 1000) + 3600;
    const input = JSON.stringify({
      ...claudeStatus('s8', 95), workspace: { current_dir: cwd },
      rate_limits: { five_hour: { used_percentage: 95, resets_at: soon }, seven_day: { used_percentage: 10, resets_at: soon } },
    });
    const stdin = process.stdin;
    const { Readable } = await import('stream');
    Object.defineProperty(process, 'stdin', { value: Readable.from([Buffer.from(input)]), configurable: true });
    try {
      return await quiet(() => statuslineCommand({ home }));
    } finally {
      Object.defineProperty(process, 'stdin', { value: stdin, configurable: true });
    }
  }

  it('says "hand off" only where the Stop hook would ask: inside a project', async () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    expect(await statusLine(proj)).toBe('proj · Opus · 5-hour 95% · weekly 10% · hand off\n');
    const plain = path.join(home, 'elsewhere');
    fs.mkdirSync(plain);
    expect(await statusLine(plain)).toBe('elsewhere · Opus · 5-hour 95% · weekly 10%\n');
  });

  it('names the mode: "handoff available" in suggest, the reset time while waiting', async () => {
    writeSettings({ at: 90 }, home);
    expect(await statusLine(proj)).toBe('proj · Opus · 5-hour 95% · weekly 10% · handoff available\n');
    writeSettings({ at: 90, waitUnder: 90 }, home);
    expect(await statusLine(proj)).toMatch(/^proj · Opus · 5-hour 95% · weekly 10% · resets in (59 min|1 h)\n$/);
  });

  it('records usage and passes the same input to a wrapped status line', async () => {
    const input = JSON.stringify(claudeStatus('s9', 42));
    const stdin = process.stdin;
    const { Readable } = await import('stream');
    Object.defineProperty(process, 'stdin', { value: Readable.from([Buffer.from(input)]), configurable: true });
    try {
      const out = await quiet(() => statuslineCommand({ home, wrap: 'node -e "process.stdin.pipe(process.stdout)"' }));
      expect(out).toBe(input);
    } finally {
      Object.defineProperty(process, 'stdin', { value: stdin, configurable: true });
    }
    const saved = JSON.parse(fs.readFileSync(path.join(home, '.specweave', 'usage', 's9.json'), 'utf8'));
    expect(saved.windows[0]).toMatchObject({ name: '5-hour', percent: 42 });
  });
});


describe('auto-handoff modes', () => {
  function legacySettings(settings: Record<string, unknown>) {
    fs.mkdirSync(path.join(home, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(home, '.specweave', 'auto-handoff.json'), JSON.stringify(settings));
  }

  it('settings written before 3.0.11 suggest at 95% instead of stopping at 90%', () => {
    legacySettings({ at: 90, since: '2026-10-08T00:00:00Z' }); // 3.0.6: no mode
    expect(readSettings(home)).toMatchObject({ at: 95, mode: 'suggest', waitUnder: 30 });
    legacySettings({ at: 90, mode: 'handoff', since: '2026-10-10T00:00:00Z' }); // 3.0.7 to 3.0.10
    expect(readSettings(home)).toMatchObject({ at: 95, mode: 'suggest' });
    recordClaudeUsage(claudeStatus('s1', 91), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
    // A threshold the user picked and checkpoint-only are kept.
    legacySettings({ at: 80, mode: 'handoff' });
    expect(readSettings(home)).toMatchObject({ at: 80, mode: 'suggest' });
    legacySettings({ at: 90, mode: 'checkpoint' });
    expect(readSettings(home)?.mode).toBe('checkpoint');
    // From 3.0.11 on the file carries a version, and enforce (or its old name) stays enforce.
    writeSettings({ at: 90, mode: 'enforce' }, home);
    expect(readSettings(home)).toMatchObject({ at: 90, mode: 'enforce', version: 2 });
    legacySettings({ at: 90, mode: 'handoff', version: 2 });
    expect(readSettings(home)?.mode).toBe('enforce');
  });

  it('suggest (the default) tells the user once and does not ask for a handoff', () => {
    writeSettings({ at: 95 }, home);
    recordClaudeUsage(claudeStatus('s1', 94), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
    recordClaudeUsage(claudeStatus('s1', 96), home, NOW);
    const res = usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW });
    const context = res.hookSpecificOutput?.additionalContext ?? '';
    expect(context).toContain('Usage is at 96% of the 5-hour limit. It resets in 1 h.');
    expect(context).toContain('do not hand off or stop because of it');
    expect(context).not.toContain('specweave handoff');
    expect(res.systemMessage).toBe('Auto-handoff: usage is at 96% of the 5-hour limit, which resets in 1 h. Work continues; say "hand off" to move it to another tool or account.');
    expect(res.decision).toBeUndefined();
    // Once per window, like enforce.
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
  });

  it('suggest in Codex continues the turn with the note instead of a handoff', () => {
    writeSettings({ at: 95 }, home);
    const res = usageGuard({ cwd: proj, session_id: 'abc', transcript_path: rollout(97, 10) }, { home, now: NOW });
    expect(res.decision).toBe('block');
    expect(res.reason).toContain('Usage is at 97% of the 5-hour limit. It resets in 1 h.');
    expect(res.reason).toContain('say "hand off"');
    expect(res.reason).not.toContain('specweave handoff');
  });

  it('says nothing at the threshold when the full windows reset within the wait', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const soon = NOW / 1000 + 20 * 60;
    const status = (five: number, weekly: number, weeklyReset = soon + 86400) => ({
      session_id: 's1', rate_limits: { five_hour: { used_percentage: five, resets_at: soon }, seven_day: { used_percentage: weekly, resets_at: weeklyReset } },
    });
    recordClaudeUsage(status(97, 10), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
    // No marker: nothing was said, so nothing is spent.
    expect(fs.existsSync(path.join(home, '.specweave', 'usage', 's1.handed-off'))).toBe(false);
    // The weekly window full too: the session cannot go on until it resets, days away.
    recordClaudeUsage(status(97, 96), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW }).hookSpecificOutput?.additionalContext).toContain('It resets in 24 h 20 min.');
  });

  it('a reset more than the wait away, or an unknown one, still acts; 0 turns the wait off', () => {
    const status = (resetIn?: number) => ({
      session_id: 's1', rate_limits: { five_hour: { used_percentage: 97, ...(resetIn !== undefined ? { resets_at: NOW / 1000 + resetIn * 60 } : {}) } },
    });
    writeSettings({ at: 95, waitUnder: 60 }, home);
    recordClaudeUsage(status(45), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
    recordClaudeUsage(status(75), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW }).systemMessage).toContain('which resets in 1 h 15 min');
    writeSettings({ at: 95 }, home);
    recordClaudeUsage({ ...status(), session_id: 's2' }, home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's2' }, { home, now: NOW }).systemMessage).toBe('Auto-handoff: usage is at 97% of the 5-hour limit. Work continues; say "hand off" to move it to another tool or account.');
    writeSettings({ at: 95, waitUnder: 0 }, home);
    recordClaudeUsage({ ...status(5), session_id: 's3' }, home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's3' }, { home, now: NOW }).systemMessage).toContain('which resets in 5 min');
  });

  it('a desktop sample borrows the reset time from the usage cache', () => {
    const mac = { platform: 'darwin' as const };
    const sample = path.join(home, 'Library', 'Application Support', 'Claude', 'plan-usage-history.json');
    fs.mkdirSync(path.dirname(sample), { recursive: true });
    fs.writeFileSync(sample, JSON.stringify({ version: 2, samples: [{ t: NOW - 60_000, org: 'org-a', u: { fh: 97, sd: 30 } }] }));
    const reset = new Date(NOW + 10 * 60_000).toISOString();
    fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({
      cachedUsageUtilization: { fetchedAtMs: NOW - 30 * 60_000, utilization: { five_hour: { utilization: 80, resets_at: reset }, seven_day: { utilization: 29, resets_at: null } } },
    }));
    const env = { CLAUDE_CODE_ORGANIZATION_UUID: 'org-a' };
    expect(claudeFallbackReading({ home, now: NOW, env, ...mac })?.windows).toEqual([
      { name: '5-hour', percent: 97, resetsAt: Math.floor(Date.parse(reset) / 1000) }, { name: 'weekly', percent: 30 },
    ]);
    writeSettings({ at: 95, mode: 'enforce' }, home);
    // 97% but back in 10 minutes: wait rather than hand off.
    expect(usageGuard({ cwd: proj, session_id: 'desk-9' }, { home, now: NOW, env, ...mac })).toEqual({});
  });

  it('checkpoint-only never steers the model, at any percentage', () => {
    writeSettings({ at: 90, mode: 'checkpoint' }, home);
    recordClaudeUsage(claudeStatus('s1', 100), home, NOW);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW })).toEqual({});
    expect(usageGuard({ cwd: proj, session_id: 'abc', transcript_path: rollout(99, 10) }, { home, now: NOW })).toEqual({});
    expect(fs.existsSync(path.join(home, '.specweave', 'usage', 's1.handed-off'))).toBe(false);
  });

  it('inside Studio the hook only saves; Studio switches provider itself', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 97), home, NOW);
    const env = { SPECWEAVE_STUDIO_THREAD_ID: 'thread-1' };
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW, env })).toEqual({});
    // The same session outside Studio still hands off.
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW, env: {} }).hookSpecificOutput).toBeDefined();
  });

  it('a delegated Studio worker id with percent signs still counts as inside Studio', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 92), home, NOW);
    const env = { SPECWEAVE_STUDIO_THREAD_ID: WORKER_THREAD_ID };
    expect(studioThreadId(env)).toBe(WORKER_THREAD_ID);
    expect(usageGuard({ cwd: proj, session_id: 's1' }, { home, now: NOW, env })).toEqual({});
    expect(studioThreadId({ SPECWEAVE_STUDIO_THREAD_ID: '' })).toBeUndefined();
  });

  it('on suggests at 95% by default and keeps the stored mode unless a flag changes it', async () => {
    let out = await quiet(() => autoHandoffCommand('on', { home }));
    expect(readSettings(home)).toMatchObject({ at: 95, mode: 'suggest', waitUnder: 30 });
    expect(out).toContain('Auto-handoff is on at 95% in suggest mode');
    await quiet(() => autoHandoffCommand('on', { home, checkpointOnly: true }));
    expect(readSettings(home)?.mode).toBe('checkpoint');
    await quiet(() => autoHandoffCommand('on', { home }));
    expect(readSettings(home)?.mode).toBe('checkpoint');
    out = await quiet(() => autoHandoffCommand('on', { home, handoff: true }));
    expect(readSettings(home)?.mode).toBe('enforce');
    expect(out).toContain('Auto-handoff is on at 95% in enforce mode');
    out = await quiet(() => autoHandoffCommand('on', { home, mode: 'suggest', at: 97, waitUnder: 60 }));
    expect(readSettings(home)).toMatchObject({ at: 97, mode: 'suggest', waitUnder: 60 });
    expect(out).toContain('resets within 60 min');
    // The wait and the threshold stay when only the mode changes.
    await quiet(() => autoHandoffCommand('on', { home, mode: 'enforce' }));
    expect(readSettings(home)).toMatchObject({ at: 97, mode: 'enforce', waitUnder: 60 });
  });

  it('on rejects an unknown mode, two different modes and a negative wait', async () => {
    const errs: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((c) => { errs.push(String(c)); return true; });
    try {
      expect(await autoHandoffCommand('on', { home, mode: 'always' })).toBe(2);
      expect(await autoHandoffCommand('on', { home, mode: 'suggest', checkpointOnly: true })).toBe(2);
      expect(await autoHandoffCommand('on', { home, waitUnder: -5 })).toBe(2);
    } finally {
      spy.mockRestore();
    }
    expect(errs.join('')).toContain('--mode takes one of suggest, enforce, checkpoint');
    expect(readSettings(home)).toBeUndefined();
  });
});

describe('usage-guard hook command', () => {
  it('saves a checkpoint on every Stop and asks for the handoff once at the threshold', async () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    recordClaudeUsage(claudeStatus('s1', 50), home, NOW);
    const input = JSON.stringify({ session_id: 's1', cwd: proj });
    expect(await quiet(() => usageGuardCommand({ home, input, env: {} }))).toBe('{}\n');
    recordClaudeUsage({ session_id: 's1', rate_limits: { five_hour: { used_percentage: 92 } } }, home, Date.now());
    const out = JSON.parse(await quiet(() => usageGuardCommand({ home, input, env: {} })));
    expect(out.hookSpecificOutput.additionalContext).toContain('specweave handoff --reason "usage at 92% of the 5-hour limit"');
    expect(await quiet(() => usageGuardCommand({ home, input, env: {} }))).toBe('{}\n');
    expect(queueSessionCheckpoint).toHaveBeenCalledTimes(3);
  });

  it('a rate-limited turn inside Studio only saves a checkpoint', async () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const input = JSON.stringify({ session_id: 's9', cwd: proj, error: 'rate_limit' });
    expect(await quiet(() => usageGuardCommand({ home, input, limitHit: true, env: { SPECWEAVE_STUDIO_THREAD_ID: 't-1' } }))).toBe('{}\n');
    expect(queueSessionCheckpoint).toHaveBeenCalledOnce();
    expect(fs.existsSync(path.join(home, '.specweave', 'usage', 's9.limit-hit'))).toBe(false);
  });

  it('does nothing when off and accepts malformed input without a hook error', async () => {
    expect(await quiet(() => usageGuardCommand({ home, input: '{bad' }))).toBe('{}\n');
    expect(queueSessionCheckpoint).not.toHaveBeenCalled();
  });
});
