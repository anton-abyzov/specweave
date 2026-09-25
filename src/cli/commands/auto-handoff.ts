/**
 * CLI Commands: auto-handoff, statusline, usage-guard
 *
 *   specweave auto-handoff [on|off|status] [--at 90]
 *   specweave statusline [--wrap "<your status line command>"]   (Claude Code status line)
 *   specweave usage-guard                                          (Stop hook, Claude Code and Codex)
 *   specweave usage-guard --limit-hit                              (StopFailure hook, Grok Build)
 *
 * `auto-handoff on` wires the tools once, in the user's own settings:
 * Claude Code gets the status line (wrapping any existing one) and a Stop
 * hook; Codex gets the same Stop hook in ~/.codex/hooks.json. From then on a
 * session that reaches the threshold hands off by itself. Grok Build reports
 * no usage percentage, so it gets a StopFailure hook in ~/.grok/hooks/ that
 * runs the handoff itself right after a turn hits the rate limit.
 *
 * @module cli/commands/auto-handoff
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {
  DEFAULT_THRESHOLD, readSettings, writeSettings, recordClaudeUsage, usageGuard, usageSummary, fullest, limitHitTarget,
} from '../../core/session/usage-guard.js';
import { detectTool } from '../../core/tasks/ledger.js';

const GUARD_COMMAND = 'specweave usage-guard';
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
  const top = fullest(windows);
  process.stdout.write([path.basename(cwd), model, windows.length ? usageSummary(windows) : '', top && top.percent >= (readSettings(opts.home)?.at ?? 101) ? 'hand off' : '']
    .filter(Boolean).join(' · ') + '\n');
  return 0;
}

/**
 * Stop hook for Claude Code and Codex: `{}` or a block that asks for a handoff.
 * With `limitHit` (Grok Build's StopFailure hook) the model has already run
 * out, so the hook writes the handoff itself.
 */
export async function usageGuardCommand(opts: { home?: string; limitHit?: boolean; input?: string } = {}): Promise<number> {
  if (opts.limitHit) {
    try {
      const root = limitHitTarget(parse(opts.input ?? await readStdin()), { home: opts.home });
      if (root) {
        const { handoffCommand } = await import('./handoff.js');
        await handoffCommand({ cwd: root, reason: `rate limit reached in ${detectTool()}` });
      }
    } catch { /* a hook must never break the tool */ }
    return 0;
  }
  let result = {};
  try {
    result = usageGuard(parse(opts.input ?? await readStdin()), { home: opts.home });
  } catch { /* a hook must never break the tool */ }
  process.stdout.write(JSON.stringify(result) + '\n');
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

function hasGuard(s: Settings): boolean {
  return (s.hooks?.Stop ?? []).some((g) => (g.hooks ?? []).some((h) => h.command === GUARD_COMMAND));
}

function addGuard(s: Settings): void {
  s.hooks = s.hooks ?? {};
  s.hooks.Stop = [...(s.hooks.Stop ?? []), { hooks: [{ type: 'command', command: GUARD_COMMAND, timeout: 10 }] }];
}

function removeGuard(s: Settings): void {
  if (!s.hooks?.Stop) return;
  s.hooks.Stop = s.hooks.Stop
    .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => h.command !== GUARD_COMMAND) }))
    .filter((g) => g.hooks.length);
  if (!s.hooks.Stop.length) delete s.hooks.Stop;
  if (!Object.keys(s.hooks).length) delete s.hooks;
}

const GROK_HOOK_FILE = 'specweave-auto-handoff.json';

/** Grok Build hook file: hand off when a turn fails on the rate limit. */
export function grokHook(): Settings {
  return {
    hooks: {
      StopFailure: [{
        matcher: 'rate_limit',
        hooks: [{ type: 'command', command: `${GUARD_COMMAND} --limit-hit`, timeout: 60, env: { SPECWEAVE_TOOL: 'grok' } } as HookEntry],
      }],
    },
  };
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export interface AutoHandoffOptions {
  at?: number;
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
    const previous = readSettings(home);
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
      if (!hasGuard(claude)) addGuard(claude);
      writeJson(claudeFile, claude);
      say(`Claude Code: status line ${current ? 'wraps your existing one' : 'set'} and Stop hook added in ${claudeFile}`);
    }
    if (fs.existsSync(path.dirname(codexFile))) {
      const codex = readJson(codexFile);
      if (!codex) say(`Left ${codexFile} alone: it is not valid JSON.`);
      else {
        if (!hasGuard(codex)) addGuard(codex);
        writeJson(codexFile, codex);
        say(`Codex: Stop hook added in ${codexFile} (Codex asks you to trust a new hook once)`);
      }
    }
    if (fs.existsSync(path.join(home, '.grok'))) {
      writeJson(grokFile, grokHook());
      say(`Grok Build: StopFailure hook added in ${grokFile}; it hands off right after a turn hits the rate limit, since Grok shows no usage percentage`);
    }
    writeSettings({ at, since: new Date().toISOString(), ...(previousStatusLine ? { previousStatusLine } : {}) }, home);
    say(`Auto-handoff is on: at ${at}% of any usage window, the session runs \`specweave handoff\` and tells you to say "pick up" elsewhere.`);
    return 0;
  }

  if (action === 'off') {
    const settings = readSettings(home);
    const claude = readJson(claudeFile);
    if (claude && fs.existsSync(claudeFile)) {
      removeGuard(claude);
      if (claude.statusLine?.command?.startsWith(STATUS_COMMAND)) {
        if (settings?.previousStatusLine) claude.statusLine = settings.previousStatusLine as Settings['statusLine'];
        else delete claude.statusLine;
      }
      writeJson(claudeFile, claude);
    }
    const codex = fs.existsSync(codexFile) ? readJson(codexFile) : undefined;
    if (codex) { removeGuard(codex); writeJson(codexFile, codex); }
    fs.rmSync(grokFile, { force: true });
    writeSettings(undefined, home);
    say('Auto-handoff is off; your previous status line is back.');
    return 0;
  }

  const settings = readSettings(home);
  say(settings ? `Auto-handoff is on at ${settings.at}% (since ${settings.since ?? 'unknown'}).` : 'Auto-handoff is off. Turn it on with `specweave auto-handoff on`.');
  return 0;
}
