/**
 * CLI Commands: auto-handoff, statusline, usage-guard
 *
 *   specweave auto-handoff [on|off|status] [--at 90] [--checkpoint-only | --handoff]
 *   specweave statusline [--wrap "<your status line command>"]   (Claude Code status line)
 *   specweave usage-guard                                          (Stop hook, Claude Code and Codex)
 *   specweave usage-guard --limit-hit                              (StopFailure hook, Claude Code and Grok Build)
 *
 * `auto-handoff on` wires the tools once, in the user's own settings. Every
 * hook saves a local checkpoint. In the default `handoff` mode the Stop hook
 * also asks the session, once per usage window, to run `specweave handoff`
 * when any window reaches the threshold, and a turn that fails on the rate
 * limit hands off from the StopFailure hook itself. `--checkpoint-only` keeps
 * only the checkpoints, for plans where credits or a proxy keep working past
 * the limit. Inside SpecWeave Studio the hooks only save the checkpoint:
 * Studio switches provider between turns.
 *
 * @module cli/commands/auto-handoff
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {
  DEFAULT_THRESHOLD, readSettings, writeSettings, recordClaudeUsage, usageGuard, usageSummary, fullest, limitHitTarget,
  handsOff, studioThreadId, type AutoHandoffMode, latestClaudeReading, latestCodexReading, claudeCachedReading, desktopUsageReading, type UsageReading,
} from '../../core/session/usage-guard.js';
import { queueSessionCheckpoint } from '../../core/session/session-checkpoint.js';
import { detectTool } from '../../core/tasks/ledger.js';

const GUARD_COMMAND = 'specweave usage-guard';
const LIMIT_HIT_COMMAND = `${GUARD_COMMAND} --limit-hit`;
const STATUS_COMMAND = 'specweave statusline';

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function parse(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** Claude Code status line: record usage, then print a line (or the wrapped command's). */
export async function statuslineCommand(opts: { wrap?: string; home?: string } = {}): Promise<number> {
  const raw = await readStdin();
  const input = parse(raw);
  const windows = recordClaudeUsage(input, opts.home);
  if (opts.wrap) {
    const r = spawnSync(opts.wrap, { shell: true, input: raw, encoding: 'utf8', timeout: 5000 });
    process.stdout.write(r.stdout ?? '');
    return 0;
  }
  const cwd = (input.workspace as { current_dir?: string } | undefined)?.current_dir ?? (input.cwd as string | undefined) ?? process.cwd();
  const model = (input.model as { display_name?: string } | undefined)?.display_name;
  const settings = readSettings(opts.home);
  const top = fullest(windows);
  const due = !!settings && handsOff(settings) && !!top && top.percent >= settings.at;
  process.stdout.write([path.basename(cwd), model, windows.length ? usageSummary(windows) : '', due ? 'hand off' : '']
    .filter(Boolean).join(' · ') + '\n');
  return 0;
}

/**
 * Stop hook (Claude Code, Codex): queue a local checkpoint, then print `{}` or,
 * once per usage window at the threshold, the output that asks for a handoff.
 * With `limitHit` (StopFailure, Claude Code and Grok Build) the model has
 * already run out, so the hook writes the handoff itself, or only the
 * checkpoint when the mode or Studio says so.
 */
export async function usageGuardCommand(opts: { home?: string; limitHit?: boolean; input?: string; env?: NodeJS.ProcessEnv } = {}): Promise<number> {
  let result = {};
  try {
    const input = parse(opts.input ?? await readStdin());
    if (opts.limitHit) {
      const root = limitHitTarget(input, { home: opts.home, env: opts.env });
      if (root) {
        const { handoffCommand } = await import('./handoff.js');
        const tool = detectTool();
        await handoffCommand({ cwd: root, reason: tool === 'cli' ? 'usage limit reached' : `usage limit reached in ${tool}` });
      } else if (readSettings(opts.home) && input.error === 'rate_limit') {
        queueSessionCheckpoint(input, { home: opts.home });
      }
    } else if (readSettings(opts.home)) {
      queueSessionCheckpoint(input, { home: opts.home });
      result = usageGuard(input, { home: opts.home, env: opts.env });
    }
  } catch { /* a hook must never break the tool */ }
  // The limit-hit hook's output is ignored; keep stdout valid JSON either way.
  process.stdout.write(JSON.stringify(opts.limitHit ? {} : result) + '\n');
  return 0;
}

interface HookEntry { type?: string; command?: string; timeout?: number; env?: Record<string, string> }
interface HookGroup { matcher?: string; hooks?: HookEntry[] }
type Settings = Record<string, unknown> & { hooks?: Record<string, HookGroup[]>; statusLine?: { type?: string; command?: string } };

function readJson(file: string): Settings | undefined {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Settings;
  } catch {
    return undefined; // unreadable: leave it alone
  }
}

function writeJson(file: string, data: Settings): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function hasHook(s: Settings, event: string, command: string): boolean {
  return (s.hooks?.[event] ?? []).some((g) => (g.hooks ?? []).some((h) => h.command === command));
}

function addHook(s: Settings, event: string, group: HookGroup): void {
  const command = group.hooks?.[0]?.command ?? '';
  if (hasHook(s, event, command)) return;
  s.hooks = s.hooks ?? {};
  s.hooks[event] = [...(s.hooks[event] ?? []), group];
}

function removeHook(s: Settings, event: string, command: string): void {
  if (!s.hooks?.[event]) return;
  s.hooks[event] = s.hooks[event]
    .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => h.command !== command) }))
    .filter((g) => g.hooks.length);
  if (!s.hooks[event].length) delete s.hooks[event];
  if (!Object.keys(s.hooks).length) delete s.hooks;
}

const STOP_HOOK: HookGroup = { hooks: [{ type: 'command', command: GUARD_COMMAND, timeout: 10 }] };
/** Claude Code: a turn that failed on the usage limit (HTTP 429) hands off from the hook itself. */
const CLAUDE_LIMIT_HOOK: HookGroup = { matcher: 'rate_limit', hooks: [{ type: 'command', command: LIMIT_HIT_COMMAND, timeout: 60 }] };

const GROK_HOOK_FILE = 'specweave-auto-handoff.json';

/** Grok Build hook file: hand off when a turn fails on the rate limit. */
export function grokHook(): Settings {
  return {
    hooks: {
      StopFailure: [{
        matcher: 'rate_limit',
        hooks: [{ type: 'command', command: LIMIT_HIT_COMMAND, timeout: 60, env: { SPECWEAVE_TOOL: 'grok' } } as HookEntry],
      }],
    },
  };
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export interface AutoHandoffOptions {
  at?: number;
  /** Only save local checkpoints; never stop on usage. */
  checkpointOnly?: boolean;
  /** Back to the default after `--checkpoint-only`. */
  handoff?: boolean;
  home?: string;
}

export async function autoHandoffCommand(action = 'status', opts: AutoHandoffOptions = {}): Promise<number> {
  const home = opts.home ?? os.homedir();
  const claudeFile = path.join(home, '.claude', 'settings.json');
  const codexFile = path.join(home, '.codex', 'hooks.json');
  const grokFile = path.join(home, '.grok', 'hooks', GROK_HOOK_FILE);
  const say = (line: string) => process.stdout.write(line + '\n');

  if (action === 'on') {
    const at = opts.at ?? readSettings(home)?.at ?? DEFAULT_THRESHOLD;
    if (!(at > 0 && at <= 100)) { process.stderr.write('--at takes a percentage from 1 to 100\n'); return 2; }
    if (opts.checkpointOnly && opts.handoff) { process.stderr.write('Choose one of --checkpoint-only and --handoff\n'); return 2; }
    const previous = readSettings(home);
    const mode: AutoHandoffMode = opts.checkpointOnly ? 'checkpoint' : opts.handoff ? 'handoff' : previous?.mode ?? 'handoff';
    const claude = readJson(claudeFile);
    let previousStatusLine = previous?.previousStatusLine;
    if (!claude) {
      say(`Left ${claudeFile} alone: it is not valid JSON.`);
    } else {
      const current = claude.statusLine?.command ?? '';
      if (!current.startsWith(STATUS_COMMAND)) {
        previousStatusLine = claude.statusLine;
        claude.statusLine = { ...(claude.statusLine ?? {}), type: 'command', command: current ? `${STATUS_COMMAND} --wrap ${shellQuote(current)}` : STATUS_COMMAND };
      }
      addHook(claude, 'Stop', STOP_HOOK);
      addHook(claude, 'StopFailure', CLAUDE_LIMIT_HOOK);
      writeJson(claudeFile, claude);
      say(`Claude Code: status line ${current ? 'wraps your existing one' : 'set'}, Stop and StopFailure hooks added in ${claudeFile}`);
    }
    if (fs.existsSync(path.dirname(codexFile))) {
      const codex = readJson(codexFile);
      if (!codex) say(`Left ${codexFile} alone: it is not valid JSON.`);
      else {
        addHook(codex, 'Stop', STOP_HOOK);
        writeJson(codexFile, codex);
        say(`Codex: Stop hook added in ${codexFile}. Codex skips it until you trust it: open \`codex\` in a terminal once and approve the hook when it asks.`);
      }
    }
    if (fs.existsSync(path.join(home, '.grok'))) {
      writeJson(grokFile, grokHook());
      say(`Grok Build: StopFailure hook added in ${grokFile}; ${mode === 'handoff' ? 'it hands off right after a turn hits the rate limit, since Grok shows no usage percentage' : 'it saves a local checkpoint after a rate-limit failure'}`);
    }
    writeSettings({ at, mode, since: new Date().toISOString(), ...(previousStatusLine ? { previousStatusLine } : {}) }, home);
    say(mode === 'handoff'
      ? `Auto-handoff is on at ${at}%: the first time a session reaches ${at}% of any usage window, it runs \`specweave handoff\` and tells you to say "pick up" in another tool or account. Local checkpoints are saved after turns in between.`
      : 'Auto-handoff is on in checkpoint-only mode: local checkpoints refresh after turns, at most once every five minutes, and usage never stops work. Run `specweave auto-handoff on --handoff` to hand off at the threshold again.');
    return 0;
  }

  if (action === 'off') {
    const settings = readSettings(home);
    const claude = readJson(claudeFile);
    if (claude && fs.existsSync(claudeFile)) {
      removeHook(claude, 'Stop', GUARD_COMMAND);
      removeHook(claude, 'StopFailure', LIMIT_HIT_COMMAND);
      if (claude.statusLine?.command?.startsWith(STATUS_COMMAND)) {
        if (settings?.previousStatusLine) claude.statusLine = settings.previousStatusLine as Settings['statusLine'];
        else delete claude.statusLine;
      }
      writeJson(claudeFile, claude);
    }
    const codex = fs.existsSync(codexFile) ? readJson(codexFile) : undefined;
    if (codex) { removeHook(codex, 'Stop', GUARD_COMMAND); writeJson(codexFile, codex); }
    fs.rmSync(grokFile, { force: true });
    writeSettings(undefined, home);
    say('Auto-handoff is off; your previous status line is back.');
    return 0;
  }

  for (const line of autoHandoffStatus(home)) say(line);
  return 0;
}

/**
 * Codex runs a user hook only after the user trusts it, and records that in
 * ~/.codex/config.toml as a `[hooks.state."<home>/.codex/hooks.json:stop:<group>:<hook>"]`
 * table with a `trusted_hash`. Plugin hooks use keys like
 * `"sw@specweave:hooks/hooks.json:stop:0:0"`, which say nothing about ours.
 * The hash covers the hook's content, so a changed hook needs approving again.
 * There is no command to approve one; Codex asks when it next starts in a terminal.
 */
export function codexHookTrusted(home = os.homedir()): boolean {
  const hooksFile = path.join(home, '.codex', 'hooks.json');
  const codex = readJson(hooksFile);
  const groups = codex?.hooks?.Stop ?? [];
  const wanted = new Set<string>();
  groups.forEach((g, gi) => (g.hooks ?? []).forEach((h, hi) => {
    if (h.command === GUARD_COMMAND) wanted.add(`${hooksFile}:stop:${gi}:${hi}`);
  }));
  if (!wanted.size) return false;
  let toml: string;
  try { toml = fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8'); } catch { return false; }
  let current: string | undefined;
  for (const line of toml.split(/\r?\n/)) {
    const table = line.match(/^\s*\[(.*)\]\s*(#.*)?$/);
    if (table) {
      const key = table[1].match(/^\s*hooks\.state\.\s*"((?:[^"\\]|\\.)*)"\s*$/);
      current = key ? key[1].replace(/\\(.)/g, '$1') : undefined;
      continue;
    }
    if (current && wanted.has(current) && /^\s*trusted_hash\s*=\s*"[^"]+"/.test(line)) return true;
  }
  return false;
}

function ago(ms: number, now: number): string {
  const min = Math.max(0, Math.round((now - ms) / 60000));
  return min < 60 ? `${min} min ago` : min < 48 * 60 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
}

function readingLine(r: UsageReading | undefined, now: number): string {
  return r ? `last reading ${usageSummary(r.windows)} (${ago(r.at, now)})` : 'no usage reading yet';
}

/**
 * What `auto-handoff status` prints: checkpoint policy, whether each tool's hooks
 * are actually in place, and the last usage each tool reported.
 */
export function autoHandoffStatus(home = os.homedir(), now = Date.now()): string[] {
  const settings = readSettings(home);
  if (!settings) return ['Auto-handoff is off. Turn it on with `specweave auto-handoff on`.'];
  const lines = [handsOff(settings)
    ? `Auto-handoff is on at ${settings.at}% (since ${settings.since ?? 'unknown'}): a session hands off once per usage window at the threshold, and saves local checkpoints in between.`
    : `Auto-handoff is on in checkpoint-only mode (since ${settings.since ?? 'unknown'}): local background checkpoints every five minutes after turns; usage never stops work.`];
  let broken = false;

  const claude = readJson(path.join(home, '.claude', 'settings.json'));
  if (claude) {
    const missing = [
      claude.statusLine?.command?.startsWith(STATUS_COMMAND) ? '' : 'status line',
      hasHook(claude, 'Stop', GUARD_COMMAND) ? '' : 'Stop hook',
      hasHook(claude, 'StopFailure', LIMIT_HIT_COMMAND) ? '' : 'StopFailure hook',
    ].filter(Boolean);
    broken ||= missing.length > 0;
    const statusReading = latestClaudeReading(home);
    const fallbacks: Array<[UsageReading | undefined, string]> = [
      [statusReading, ''],
      [desktopUsageReading({ home, now }), ' from the desktop app'],
      [claudeCachedReading({ home, now }), ' from Claude Code\'s usage cache'],
    ];
    const [best, source] = fallbacks.filter(([r]) => r).sort(([a], [b]) => b!.at - a!.at)[0] ?? [undefined, ''];
    const reading = `${readingLine(best, now)}${source}`;
    lines.push(`Claude Code: ${missing.length ? `missing ${missing.join(', ')}` : 'status line, Stop and StopFailure hooks in place'}; ${reading}`);
    lines.push(handsOff(settings)
      ? '  Desktop, Remote Control and `claude -p` sessions run no status line. They read the desktop app\'s usage samples (every 15 minutes or so) or Claude Code\'s usage cache when either is fresh, so a jump past the threshold between samples is missed; then they hand off when a turn hits the limit.'
      : '  Usage readings are informational only; saving does not depend on a status line, account quota or proxy provider.');
  }
  const codexFile = path.join(home, '.codex', 'hooks.json');
  if (fs.existsSync(path.dirname(codexFile))) {
    const codex = readJson(codexFile);
    const ok = !!codex && hasHook(codex, 'Stop', GUARD_COMMAND);
    broken ||= !ok;
    const trusted = codexHookTrusted(home);
    lines.push(`Codex: ${ok ? `Stop hook in place${trusted ? '' : ' but not approved yet'}` : 'missing Stop hook'}; ${readingLine(latestCodexReading(home), now)}`);
    if (ok && !trusted) lines.push('  Codex skips a hook until you trust it: open `codex` in a terminal and approve the hook when it asks. It asks again whenever the hook changes, for example after `auto-handoff on` with a new SpecWeave version.');
  }
  if (fs.existsSync(path.join(home, '.grok'))) {
    const ok = fs.existsSync(path.join(home, '.grok', 'hooks', GROK_HOOK_FILE));
    broken ||= !ok;
    lines.push(`Grok Build: ${ok ? 'StopFailure hook in place' : 'missing StopFailure hook'}; Grok reports no usage, so it ${handsOff(settings) ? 'hands off' : 'saves locally'} when a turn hits the limit`);
  }
  lines.push(`Local checkpoints: ${path.join(home, '.specweave', 'checkpoints')} (per worktree and session; current.json points to the latest complete save).`);
  lines.push(handsOff(settings)
    ? 'Checkpoints never push or release claims; the handoff at the threshold does, so the next tool can `specweave pickup`.'
    : 'To transfer work to another tool or machine, run `specweave handoff` explicitly. Automatic checkpoints never push or release claims.');
  if (studioThreadId()) lines.push('Running inside SpecWeave Studio: hooks only save checkpoints here, and Studio switches provider between turns.');
  if (broken) lines.push('Run `specweave auto-handoff on` again to put the missing pieces back.');
  return lines;
}
