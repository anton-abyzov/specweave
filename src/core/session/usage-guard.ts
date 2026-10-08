/** Usage readings for display only. Automatic saving is quota-independent.
 * A plan allowance may be exhausted while paid credits or a proxy still work.
 * Never turn these advisory readings into a stop/continue instruction.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const DEFAULT_THRESHOLD = 90;

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

/** Claude Code drops its own usage cache after an hour; so does the guard. */
export const CLAUDE_CACHE_MAX_AGE_MS = 60 * 60 * 1000;

function claudeConfigFile(env: NodeJS.ProcessEnv, home = os.homedir()): string {
  const dir = env.CLAUDE_CONFIG_DIR?.trim();
  return dir ? path.join(dir, '.claude.json') : path.join(home, '.claude.json');
}

type CachedWindow = { utilization?: number | null; resets_at?: string | null };

/**
 * Claude Code's own record of the plan usage: `cachedUsageUtilization` in
 * ~/.claude.json (or $CLAUDE_CONFIG_DIR/.claude.json), written whenever Claude
 * Code fetches the usage, in every kind of session: terminal, desktop, Remote
 * Control and `claude -p`. It is the reading for sessions that never run a
 * status line. Ignored when older than an hour or saved for another account.
 */
export function claudeCachedReading(opts: { env?: NodeJS.ProcessEnv; home?: string; now?: number } = {}): UsageReading | undefined {
  const now = opts.now ?? Date.now();
  let cfg: { oauthAccount?: { accountUuid?: string }; cachedUsageUtilization?: { fetchedAtMs?: number; accountUuid?: string; utilization?: Record<string, unknown> } };
  try {
    cfg = JSON.parse(fs.readFileSync(claudeConfigFile(opts.env ?? process.env, opts.home), 'utf8'));
  } catch {
    return undefined;
  }
  const cache = cfg?.cachedUsageUtilization;
  const at = cache?.fetchedAtMs;
  if (!cache || typeof at !== 'number' || now - at < 0 || now - at > CLAUDE_CACHE_MAX_AGE_MS) return undefined;
  const account = cfg.oauthAccount?.accountUuid;
  if (account && cache.accountUuid && account !== cache.accountUuid) return undefined;
  const u = cache.utilization ?? {};
  const windows: UsageWindow[] = [];
  const names: Record<string, string> = { five_hour: '5-hour', seven_day: 'weekly' };
  for (const [key, name] of Object.entries(names)) {
    const w = u[key] as CachedWindow | null | undefined;
    if (!w || typeof w.utilization !== 'number') continue;
    const reset = w.resets_at ? Date.parse(w.resets_at) : NaN;
    windows.push({ name, percent: w.utilization, ...(Number.isFinite(reset) ? { resetsAt: Math.floor(reset / 1000) } : {}) });
  }
  return windows.length ? { tool: 'Claude Code', at, windows } : undefined;
}

/** Desktop samples arrive about every 15 minutes; an older one may miss a jump to the limit. */
export const DESKTOP_SAMPLE_MAX_AGE_MS = 20 * 60 * 1000;

/** Where the Claude desktop app keeps its own files. */
export function desktopAppDir(home = os.homedir(), platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env): string {
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Claude');
  if (platform === 'win32') return path.join(env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Claude');
  return path.join(env.XDG_CONFIG_HOME ?? path.join(home, '.config'), 'Claude');
}

/**
 * The Claude desktop app's plan-usage samples, `plan-usage-history.json`:
 * `{ version: 2, samples: [{ t, org, u: { fh, sd } }] }`, 5-hour (`fh`) and
 * 7-day (`sd`) percentages per organization, written about every 15 minutes
 * while the app runs. It is the only reading desktop and Remote Control
 * sessions leave on disk. Undocumented, so best effort: only the newest sample
 * of this session's organization (CLAUDE_CODE_ORGANIZATION_UUID), and only
 * when it is under 20 minutes old.
 */
export function desktopUsageReading(opts: { env?: NodeJS.ProcessEnv; home?: string; now?: number; platform?: NodeJS.Platform } = {}): UsageReading | undefined {
  const env = opts.env ?? process.env;
  const now = opts.now ?? Date.now();
  let samples: Array<{ t?: unknown; org?: unknown; u?: { fh?: unknown; sd?: unknown } }>;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(desktopAppDir(opts.home, opts.platform, env), 'plan-usage-history.json'), 'utf8'));
    samples = Array.isArray(raw?.samples) ? raw.samples : [];
  } catch {
    return undefined;
  }
  let org = env.CLAUDE_CODE_ORGANIZATION_UUID?.trim();
  if (!org) {
    const orgs = new Set(samples.map((x) => x?.org).filter((o) => typeof o === 'string'));
    if (orgs.size !== 1) return undefined; // several accounts and no way to tell which is this one
    org = [...orgs][0] as string;
  }
  let newest: (typeof samples)[number] | undefined;
  for (const x of samples) {
    if (x?.org === org && typeof x.t === 'number' && (!newest || x.t > (newest.t as number))) newest = x;
  }
  const at = newest?.t as number | undefined;
  if (!newest || at === undefined || now - at < 0 || now - at > DESKTOP_SAMPLE_MAX_AGE_MS) return undefined;
  const windows: UsageWindow[] = [];
  if (typeof newest.u?.fh === 'number') windows.push({ name: '5-hour', percent: newest.u.fh });
  if (typeof newest.u?.sd === 'number') windows.push({ name: 'weekly', percent: newest.u.sd });
  return windows.length ? { tool: 'Claude Code', at, windows } : undefined;
}

/** The freshest reading for a Claude Code session that runs no status line. */
export function claudeFallbackReading(opts: { env?: NodeJS.ProcessEnv; home?: string; now?: number; platform?: NodeJS.Platform } = {}): UsageReading | undefined {
  const readings = [desktopUsageReading(opts), claudeCachedReading(opts)].filter((r): r is UsageReading => !!r);
  return readings.sort((a, b) => b.at - a.at)[0];
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

/** Retained for integrations that imported the old guard. Never steer the model. */
export interface GuardInput {
  session_id?: string;
  transcript_path?: string;
  stop_hook_active?: boolean;
}
export type GuardOutput = Record<string, never>;
export function usageGuard(_input: GuardInput, _opts: { home?: string; now?: number; env?: NodeJS.ProcessEnv; platform?: NodeJS.Platform } = {}): GuardOutput {
  return {};
}

/** One short status line: the fullest windows, e.g. "5-hour 42% · weekly 12%". */
export function usageSummary(windows: UsageWindow[]): string {
  return windows.map((w) => `${w.name} ${Math.round(w.percent)}%`).join(' · ');
}
