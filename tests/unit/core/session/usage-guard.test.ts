import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  usageGuard, recordClaudeUsage, codexWindows, writeSettings, readSettings,
} from '../../../../src/core/session/usage-guard.js';
import { autoHandoffCommand, statuslineCommand } from '../../../../src/cli/commands/auto-handoff.js';

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
    expect(first.decision).toBe('block');
    expect(first.reason).toContain('Usage is at 92% of the 5-hour limit');
    expect(first.reason).toContain('specweave handoff --reason "usage at 92% of the 5-hour limit"');
    expect(first.reason).toContain('"pick up"');
    // The handoff turn ends with another Stop; it must not loop.
    expect(usageGuard({ session_id: 's1', stop_hook_active: true }, { home, now: NOW })).toEqual({});
    // Other sessions are judged on their own.
    expect(usageGuard({ session_id: 's2' }, { home, now: NOW })).toEqual({});
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
