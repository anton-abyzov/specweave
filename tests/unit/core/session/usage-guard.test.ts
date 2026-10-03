import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  usageGuard, recordClaudeUsage, codexWindows, writeSettings, readSettings, latestCodexReading, claudeCachedReading, desktopUsageReading, claudeFallbackReading,
} from '../../../../src/core/session/usage-guard.js';
import { autoHandoffCommand, autoHandoffStatus, codexHookTrusted, statuslineCommand } from '../../../../src/cli/commands/auto-handoff.js';

let home: string;
const NOW = Date.parse('2026-09-25T20:00:00Z');
const LATER = NOW / 1000 + 3600;

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

function rollout(primary: number, secondary: number): string {
  const file = path.join(home, '.codex', 'sessions', '2026', '09', '25', 'rollout-2026-09-25T19-00-00-abc.jsonl');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tokenCount = (p: number) => JSON.stringify({
    timestamp: '2026-09-25T19:59:00Z', type: 'event_msg',
    payload: {
      type: 'token_count', info: { total_token_usage: { input_tokens: 1 } },
      rate_limits: {
        limit_id: 'codex', primary: { used_percent: p, window_minutes: 300, resets_at: LATER },
        secondary: { used_percent: secondary, window_minutes: 10080, resets_at: LATER + 86400 },
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

beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-usage-')); });
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
    writeSettings({ at: 90 }, home);
    claudeCache(93, NOW - 10 * 60_000);
    expect(claudeCachedReading({ home, now: NOW })?.windows).toEqual([
      { name: '5-hour', percent: 93, resetsAt: LATER },
      { name: 'weekly', percent: 30, resetsAt: LATER },
    ]);
    const res = usageGuard({ session_id: 'desk-1', transcript_path: path.join(home, 'x.jsonl') }, { home, now: NOW });
    expect(res.hookSpecificOutput?.additionalContext).toContain('93% of the 5-hour limit');
  });

  it('ignores a cache older than an hour or saved for another account', () => {
    writeSettings({ at: 90 }, home);
    claudeCache(95, NOW - 61 * 60_000);
    expect(usageGuard({ session_id: 'd1' }, { home, now: NOW })).toEqual({});
    claudeCache(95, NOW - 60_000, { accountUuid: 'acc-2' });
    expect(usageGuard({ session_id: 'd2' }, { home, now: NOW })).toEqual({});
  });

  it('prefers what this session\'s status line saw', () => {
    writeSettings({ at: 90 }, home);
    claudeCache(95, NOW - 60_000);
    recordClaudeUsage(claudeStatus('term-1', 40), home, NOW);
    expect(usageGuard({ session_id: 'term-1' }, { home, now: NOW })).toEqual({});
  });

  function desktopSamples(samples: object[]) {
    const dir = path.join(home, 'Library', 'Application Support', 'Claude');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'plan-usage-history.json'), JSON.stringify({ version: 2, samples }));
  }
  const mac = { platform: 'darwin' as const };

  it('reads the desktop app\'s newest sample for this session\'s organization', () => {
    writeSettings({ at: 90 }, home);
    desktopSamples([
      { t: NOW - 40 * 60_000, org: 'org-a', u: { fh: 50, sd: 20, xu: 0 } },
      { t: NOW - 5 * 60_000, org: 'org-a', u: { fh: 94, sd: 31, xu: 0 } },
      { t: NOW - 60_000, org: 'org-b', u: { fh: 10, sd: 5 } },
    ]);
    const env = { CLAUDE_CODE_ORGANIZATION_UUID: 'org-a', CLAUDE_CODE_ENTRYPOINT: 'claude-desktop' };
    expect(desktopUsageReading({ home, now: NOW, env, ...mac })).toEqual({
      tool: 'Claude Code', at: NOW - 5 * 60_000, windows: [{ name: '5-hour', percent: 94 }, { name: 'weekly', percent: 31 }],
    });
    const res = usageGuard({ session_id: 'desk-2' }, { home, now: NOW, env, ...mac });
    expect(res.hookSpecificOutput?.additionalContext).toContain('94% of the 5-hour limit');
    // Another organization's session sees its own, lower sample.
    expect(usageGuard({ session_id: 'desk-3' }, { home, now: NOW, env: { CLAUDE_CODE_ORGANIZATION_UUID: 'org-b' }, ...mac })).toEqual({});
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
    expect(usageGuard({ session_id: 's1' }, { home, now: NOW })).toEqual({});
  });

  it('Claude Code: blocks once when the status line saw the 5-hour window past the threshold', () => {
    writeSettings({ at: 90 }, home);
    recordClaudeUsage(claudeStatus('s1', 50), home, NOW);
    expect(usageGuard({ session_id: 's1' }, { home, now: NOW })).toEqual({});

    recordClaudeUsage(claudeStatus('s1', 92.4), home, NOW);
    const first = usageGuard({ session_id: 's1' }, { home, now: NOW });
    // Not a block: Claude Code shows a block to the user as "Stop hook error".
    expect(first.decision).toBeUndefined();
    const context = first.hookSpecificOutput?.additionalContext ?? '';
    expect(first.hookSpecificOutput?.hookEventName).toBe('Stop');
    expect(context).toContain('Usage is at 92% of the 5-hour limit');
    expect(context).toContain('specweave handoff --reason "usage at 92% of the 5-hour limit"');
    expect(context).toContain('"pick up"');
    expect(first.systemMessage).toBe('Auto-handoff: usage is at 92% of the 5-hour limit, so this session is handing off. Say "pick up" in another tool or account to continue.');
    // The handoff turn ends with another Stop; it must not loop.
    expect(usageGuard({ session_id: 's1', stop_hook_active: true }, { home, now: NOW })).toEqual({});
    // Other sessions are judged on their own.
    expect(usageGuard({ session_id: 's2' }, { home, now: NOW })).toEqual({});
  });

  it('asks again in a later window once the window that triggered the handoff has reset', () => {
    writeSettings({ at: 90 }, home);
    recordClaudeUsage(claudeStatus('s1', 95), home, NOW);
    expect(usageGuard({ session_id: 's1' }, { home, now: NOW }).hookSpecificOutput).toBeDefined();
    expect(usageGuard({ session_id: 's1' }, { home, now: NOW + 60_000 })).toEqual({});
    // The 5-hour window resets; the session keeps going and fills the next one.
    const next = LATER + 5 * 3600;
    recordClaudeUsage({ ...claudeStatus('s1', 93), rate_limits: { five_hour: { used_percentage: 93, resets_at: next } } }, home, NOW);
    const again = usageGuard({ session_id: 's1' }, { home, now: (LATER + 60) * 1000 });
    expect(again.hookSpecificOutput?.additionalContext).toContain('93% of the 5-hour limit');
  });

  it('a marker from 3.0.3 (no reset time) keeps the session handed off', () => {
    writeSettings({ at: 90 }, home);
    recordClaudeUsage(claudeStatus('s1', 95), home, NOW);
    fs.writeFileSync(path.join(home, '.specweave', 'usage', 's1.handed-off'), '2026-09-25T20:00:00.000Z 5-hour 95\n');
    expect(usageGuard({ session_id: 's1' }, { home, now: NOW })).toEqual({});
  });

  it('ignores a window that has already reset', () => {
    writeSettings({ at: 90 }, home);
    recordClaudeUsage(claudeStatus('s1', 97), home, NOW);
    expect(usageGuard({ session_id: 's1' }, { home, now: (LATER + 1) * 1000 })).toEqual({});
  });

  it('Codex: reads the newest token_count in the rollout the hook points at', () => {
    writeSettings({ at: 85 }, home);
    const file = rollout(88, 40);
    expect(codexWindows(file)).toEqual([
      { name: '5-hour', percent: 88, resetsAt: LATER },
      { name: 'weekly', percent: 40, resetsAt: LATER + 86400 },
    ]);
    const res = usageGuard({ session_id: 'abc', transcript_path: file }, { home, now: NOW });
    expect(res.decision).toBe('block'); // Codex reads a block reason
    expect(res.reason).toContain('88% of the 5-hour limit');
  });

  it('Codex: the weekly window counts too', () => {
    writeSettings({ at: 90 }, home);
    const res = usageGuard({ session_id: 'abc', transcript_path: rollout(30, 91) }, { home, now: NOW });
    expect(res.reason).toContain('91% of the weekly limit');
  });

  it('never reads a Claude transcript as a Codex rollout', () => {
    writeSettings({ at: 90 }, home);
    const file = path.join(home, 'transcript.jsonl');
    fs.writeFileSync(file, JSON.stringify({ payload: { rate_limits: { primary: { used_percent: 99 } } } }) + '\n');
    expect(usageGuard({ session_id: 'x', transcript_path: file }, { home, now: NOW })).toEqual({});
  });

  it('rejects session ids that could escape the usage folder', () => {
    writeSettings({ at: 90 }, home);
    recordClaudeUsage({ ...claudeStatus('../../evil', 99) }, home, NOW);
    expect(fs.existsSync(path.join(home, 'evil.json'))).toBe(false);
    expect(usageGuard({ session_id: '../../evil' }, { home, now: NOW })).toEqual({});
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
    expect(lines[0]).toMatch(/^Auto-handoff is on at 90%/);
    expect(lines[1]).toBe('Claude Code: status line, Stop and StopFailure hooks in place; last reading 5-hour 42% · weekly 12% (3 min ago)');
    expect(lines[2]).toContain('Desktop, Remote Control and `claude -p` sessions run no status line');
    expect(lines[3]).toBe('Codex: Stop hook in place; last reading 5-hour 61% · weekly 20% (10 min ago)');
    expect(lines).toHaveLength(4);
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
