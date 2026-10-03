/**
 * Auto-handoff near the usage limit.
 *
 * Neither Claude Code nor Codex tells a hook how much of the plan's limit is
 * left, so the guard reads it where each tool does expose it:
 *
 *   Claude Code  the status line command receives `rate_limits.five_hour` /
 *                `seven_day` / `spend_limit` `.used_percentage` (Pro and Max,
 *                after the first reply). `specweave statusline` saves them per
 *                session under ~/.specweave/usage/.
 *   Codex        every turn appends a `token_count` event with
 *                `rate_limits.primary` / `secondary` `.used_percent` to the
 *                rollout file the hook's `transcript_path` points at.
 *
 * The Stop hook (`specweave usage-guard`) then blocks the stop once per
 * session and usage window when any window is at or past the threshold, and
 * the agent runs `specweave handoff`. Under the threshold it prints `{}`: no
 * tokens, no files.
 *
 * @module core/session/usage-guard
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findProjectRoot } from '../../utils/find-project-root.js';

export const DEFAULT_THRESHOLD = 90;

/** The shortest usage window; a session that hit the limit may hit it again after this. */
export const LIMIT_HIT_REARM_MS = 5 * 60 * 60 * 1000;

export interface UsageWindow {
  /** "5-hour", "weekly", "spend" or "<n>-minute". */
  name: string;
  /** 0-100. */
  percent: number;
  /** Unix seconds, when known. */
  resetsAt?: number;
}

export interface AutoHandoffSettings {
  at: number;
  since?: string;
  /** Status line command that was there before `auto-handoff on`, restored by `off`. */
  previousStatusLine?: unknown;
}

export function specweaveHome(home = os.homedir()): string {
  return path.join(home, '.specweave');
}

function usageDir(home?: string): string {
  return path.join(specweaveHome(home), 'usage');
}

function safeId(sessionId: string): string | undefined {
  return /^[\w.-]{1,128}$/.test(sessionId) && !sessionId.includes('..') ? sessionId : undefined;
}

export function readSettings(home?: string): AutoHandoffSettings | undefined {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(specweaveHome(home), 'auto-handoff.json'), 'utf8')) as AutoHandoffSettings;
    const at = Number(raw.at);
    return { ...raw, at: at > 0 && at <= 100 ? at : DEFAULT_THRESHOLD };
  } catch {
    return undefined;
  }
}

export function writeSettings(settings: AutoHandoffSettings | undefined, home?: string): void {
  const file = path.join(specweaveHome(home), 'auto-handoff.json');
  if (!settings) { fs.rmSync(file, { force: true }); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
}

/** Windows from Claude Code's status line input (`rate_limits`). */
export function claudeWindows(input: unknown): UsageWindow[] {
  const limits = (input as { rate_limits?: Record<string, { used_percentage?: number; resets_at?: number }> })?.rate_limits;
  if (!limits || typeof limits !== 'object') return [];
  const names: Record<string, string> = { five_hour: '5-hour', seven_day: 'weekly', spend_limit: 'spend' };
  const out: UsageWindow[] = [];
  for (const [key, w] of Object.entries(limits)) {
    if (!w || typeof w.used_percentage !== 'number') continue;
    out.push({ name: names[key] ?? key, percent: w.used_percentage, ...(typeof w.resets_at === 'number' ? { resetsAt: w.resets_at } : {}) });
  }
  return out;
}

/** Save what the status line saw, for the Stop hook of the same session. */
export function recordClaudeUsage(input: unknown, home?: string, now = Date.now()): UsageWindow[] {
  const windows = claudeWindows(input);
  const id = safeId(String((input as { session_id?: unknown })?.session_id ?? ''));
  if (!id || !windows.length) return windows;
  try {
    fs.mkdirSync(usageDir(home), { recursive: true });
    fs.writeFileSync(path.join(usageDir(home), `${id}.json`), JSON.stringify({ at: new Date(now).toISOString(), windows }));
  } catch { /* the status line must never fail */ }
  return windows;
}

function readClaudeUsage(sessionId: string, home?: string): UsageWindow[] {
  const id = safeId(sessionId);
  if (!id) return [];
  try {
    return (JSON.parse(fs.readFileSync(path.join(usageDir(home), `${id}.json`), 'utf8')) as { windows?: UsageWindow[] }).windows ?? [];
  } catch {
    return [];
  }
}

/** Windows from the newest `token_count` event in a Codex rollout file. */
export function codexWindows(transcriptPath: string): UsageWindow[] {
  let text: string;
  try {
    const fd = fs.openSync(transcriptPath, 'r');
    try {
      const size = fs.fstatSync(fd).size;
      const len = Math.min(size, 256 * 1024);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      text = buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"rate_limits"')) continue;
    try {
      const limits = (JSON.parse(lines[i]) as { payload?: { rate_limits?: Record<string, { used_percent?: number; window_minutes?: number; resets_at?: number } | null> } }).payload?.rate_limits;
      if (!limits) continue;
      const out: UsageWindow[] = [];
      for (const key of ['primary', 'secondary']) {
        const w = limits[key];
        if (!w || typeof w.used_percent !== 'number') continue;
        const mins = w.window_minutes;
        const name = mins === 300 ? '5-hour' : mins === 10080 ? 'weekly' : mins ? `${mins}-minute` : key;
        out.push({ name, percent: w.used_percent, ...(typeof w.resets_at === 'number' ? { resetsAt: w.resets_at } : {}) });
      }
      if (out.length) return out;
    } catch { /* a partial first line in the tail; keep looking */ }
  }
  return [];
}

export interface UsageReading {
  tool: 'Claude Code' | 'Codex';
  /** Epoch milliseconds of the reading. */
  at: number;
  windows: UsageWindow[];
}

/** The newest usage any Claude Code session's status line recorded. */
export function latestClaudeReading(home?: string): UsageReading | undefined {
  let best: UsageReading | undefined;
  let names: string[] = [];
  try { names = fs.readdirSync(usageDir(home)).filter((n) => n.endsWith('.json')); } catch { return undefined; }
  for (const name of names) {
    try {
      const saved = JSON.parse(fs.readFileSync(path.join(usageDir(home), name), 'utf8')) as { at?: string; windows?: UsageWindow[] };
      const at = Date.parse(saved.at ?? '');
      if (saved.windows?.length && at && (!best || at > best.at)) best = { tool: 'Claude Code', at, windows: saved.windows };
    } catch { /* skip a half-written file */ }
  }
  return best;
}

/** The newest file under `dir` whose name matches, walking date folders newest first. */
function newestFile(dir: string, match: (name: string) => boolean, depth: number): string | undefined {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return undefined; }
  const files = entries.filter((e) => e.isFile() && match(e.name)).map((e) => path.join(dir, e.name));
  if (files.length) return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  if (depth <= 0) return undefined;
  for (const sub of entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse()) {
    const found = newestFile(path.join(dir, sub), match, depth - 1);
    if (found) return found;
  }
  return undefined;
}

/** The rate limits in the newest Codex session log (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl). */
export function latestCodexReading(home = os.homedir()): UsageReading | undefined {
  const file = newestFile(path.join(home, '.codex', 'sessions'), (n) => n.startsWith('rollout-') && n.endsWith('.jsonl'), 3);
  if (!file) return undefined;
  const windows = codexWindows(file);
  return windows.length ? { tool: 'Codex', at: fs.statSync(file).mtimeMs, windows } : undefined;
}

/** The fullest window that has not reset yet. */
export function fullest(windows: UsageWindow[], now = Date.now()): UsageWindow | undefined {
  return windows
    .filter((w) => !w.resetsAt || w.resetsAt * 1000 > now)
    .sort((a, b) => b.percent - a.percent)[0];
}

/**
 * Whether a session may be asked to hand off (again). A session is asked once
 * per usage window: when the window that triggered the handoff has reset, a
 * session that kept going is guarded again. A marker without a reset time
 * stays spent.
 */
function rearmed(marker: string, now: number): boolean {
  let text: string;
  try { text = fs.readFileSync(marker, 'utf8'); } catch { return true; }
  try {
    const resetsAt = (JSON.parse(text) as { resetsAt?: unknown }).resetsAt;
    return typeof resetsAt === 'number' && resetsAt * 1000 <= now;
  } catch {
    return false;
  }
}

export function handoffInstruction(w: UsageWindow): string {
  const pct = Math.round(w.percent);
  return `Usage is at ${pct}% of the ${w.name} limit. Hand off now so no work is lost: run \`specweave handoff --reason "usage at ${pct}% of the ${w.name} limit"\`, ` +
    `then tell the user in one line that they can say "pick up" in another tool or account to continue, and stop.`;
}

export interface GuardInput {
  session_id?: string;
  transcript_path?: string;
  stop_hook_active?: boolean;
}

/**
 * Stop-hook decision. Returns a block (the agent keeps going and hands off)
 * the first time a session is at or past the threshold, otherwise `{}`.
 */
export function usageGuard(input: GuardInput, opts: { home?: string; now?: number } = {}): { decision?: 'block'; reason?: string } {
  const settings = readSettings(opts.home);
  if (!settings) return {};
  const id = safeId(String(input.session_id ?? ''));
  if (!id) return {};
  const now = opts.now ?? Date.now();
  const marker = path.join(usageDir(opts.home), `${id}.handed-off`);
  if (!rearmed(marker, now)) return {};

  const rollout = input.transcript_path && path.basename(input.transcript_path).startsWith('rollout-') ? input.transcript_path : undefined;
  const windows = [...readClaudeUsage(id, opts.home), ...(rollout ? codexWindows(rollout) : [])];
  const top = fullest(windows, now);
  if (!top || top.percent < settings.at) return {};

  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, JSON.stringify({ at: new Date(now).toISOString(), window: top.name, percent: top.percent, ...(top.resetsAt ? { resetsAt: top.resetsAt } : {}) }) + '\n');
  } catch {
    return {}; // without the marker it would fire every turn; stay quiet instead
  }
  return { decision: 'block', reason: handoffInstruction(top) };
}

/** One short status line: the fullest windows, e.g. "5-hour 42% · weekly 12%". */
export function usageSummary(windows: UsageWindow[]): string {
  return windows.map((w) => `${w.name} ${Math.round(w.percent)}%`).join(' · ');
}

/**
 * When a turn fails on the rate limit, Claude Code and Grok Build fire
 * `StopFailure` with `error: "rate_limit"`. It is the backstop for a session
 * that ran out before the Stop hook could ask for a handoff, and the only
 * signal Grok Build gives (it shows no usage percentage). Grok's hook input is
 * camelCase (`sessionId`, `workspaceRoot`), Claude Code's snake_case.
 */
export interface LimitHitInput {
  sessionId?: string;
  session_id?: string;
  cwd?: string;
  workspaceRoot?: string;
  error?: string;
}

/**
 * Where a rate-limited turn should hand off, or undefined when it should not:
 * auto-handoff is off, the failure is not a rate limit, the session already
 * already wrote one in the last five hours, or the directory is not a
 * SpecWeave project. Writes its marker before returning, so a retry storm
 * hands off once. The marker is separate from the Stop hook's: a session that
 * was asked to hand off at 90% and still ran out writes a fresh handoff.
 */
export function limitHitTarget(input: LimitHitInput, opts: { home?: string; now?: number } = {}): string | undefined {
  if (!readSettings(opts.home)) return undefined;
  if (input.error !== 'rate_limit') return undefined;
  const id = safeId(String(input.sessionId ?? input.session_id ?? ''));
  if (!id) return undefined;
  const start = input.cwd ?? input.workspaceRoot;
  const root = start ? findProjectRoot(start) ?? undefined : undefined;
  if (!root) return undefined;
  const now = opts.now ?? Date.now();
  const marker = path.join(usageDir(opts.home), `${id}.limit-hit`);
  try {
    if (now - fs.statSync(marker).mtimeMs < LIMIT_HIT_REARM_MS) return undefined;
  } catch { /* no marker yet */ }
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, `${new Date(now).toISOString()} rate_limit\n`);
    fs.utimesSync(marker, now / 1000, now / 1000);
  } catch {
    return undefined;
  }
  return root;
}
