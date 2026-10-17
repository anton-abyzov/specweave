/**
 * Reviewers for `specweave review`: a CLI command per reviewer that reads the
 * brief on stdin and answers on stdout, or into `{out}` when the command names
 * one. SpecWeave holds no model keys; each CLI uses its own login.
 *
 * Defaults: Codex with GPT-6.1-Sol for code another family wrote, Claude Opus for
 * code OpenAI models wrote. `review.reviewers` in config overrides or adds.
 *
 * @module core/review/reviewer
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn, spawnSync } from 'child_process';
import type { ReviewConfiguration, ReviewerConfiguration } from '../config/types.js';
import { familyOfTool } from './brief.js';

export interface Reviewer extends ReviewerConfiguration {
  name: string;
  family: string;
}

export const BUILTIN_REVIEWERS: Record<string, ReviewerConfiguration> = {
  codex: {
    command: 'codex exec -m gpt-6.1-sol -c model_reasoning_effort="high" -s read-only --skip-git-repo-check -o {out} -',
    family: 'openai',
  },
  claude: {
    command: 'claude -p --model opus --permission-mode plan',
    family: 'claude',
  },
};

export const DEFAULT_TIMEOUT_MINUTES = 30;

export function reviewersFrom(config: ReviewConfiguration | undefined): Reviewer[] {
  const merged: Record<string, ReviewerConfiguration> = { ...BUILTIN_REVIEWERS };
  for (const [name, r] of Object.entries(config?.reviewers ?? {})) {
    if (r && typeof r.command === 'string' && r.command.trim()) merged[name] = { ...BUILTIN_REVIEWERS[name], ...r };
  }
  return Object.entries(merged).map(([name, r]) => ({ name, command: r.command, family: familyOfTool(r.family ?? name) }));
}

/** First word of a command, unquoted. */
export function commandBinary(command: string): string {
  const m = command.trim().match(/^"([^"]+)"|^'([^']+)'|^(\S+)/);
  return m ? (m[1] ?? m[2] ?? m[3]) : '';
}

export function onPath(binary: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!binary) return false;
  if (binary.includes('/') || binary.includes('\\')) return fs.existsSync(binary);
  const probe = process.platform === 'win32' ? spawnSync('where', [binary], { env }) : spawnSync('sh', ['-c', 'command -v "$1"', 'sh', binary], { env });
  return probe.status === 0;
}

export interface ReviewerChoice {
  reviewer?: Reviewer;
  /** Why this one, or why none. */
  why: string;
}

/**
 * `--reviewer`, else `review.reviewer` unless it is `auto`, else the first installed
 * reviewer of another family than the author (Codex first). An unknown author gets
 * Codex, since most code SpecWeave sees is written by Claude.
 */
export function pickReviewer(
  reviewers: Reviewer[],
  authorFamily: string | undefined,
  opts: { explicit?: string; configured?: string; available?: (r: Reviewer) => boolean } = {},
): ReviewerChoice {
  const available = opts.available ?? ((r: Reviewer) => onPath(commandBinary(r.command)));
  const named = opts.explicit || (opts.configured && opts.configured !== 'auto' ? opts.configured : undefined);
  if (named) {
    const r = reviewers.find((x) => x.name === named);
    if (!r) return { why: `no reviewer "${named}"; known: ${reviewers.map((x) => x.name).join(', ')}` };
    return { reviewer: r, why: opts.explicit ? '--reviewer' : 'review.reviewer' };
  }
  const order = [...reviewers].sort((a, b) => Number(b.name === 'codex') - Number(a.name === 'codex'));
  const other = order.filter((r) => r.family !== authorFamily);
  const pick = other.find(available);
  if (pick) {
    return { reviewer: pick, why: authorFamily ? `another family than the author (${authorFamily})` : 'author unknown' };
  }
  const missing = other.map((r) => commandBinary(r.command)).join(', ') || 'none configured';
  return { why: `no reviewer from another family than ${authorFamily ?? 'the author'} is installed (${missing})` };
}

/** Env var holding the answer file; `{out}` becomes a quoted reference to it, never the path itself. */
export const OUT_ENV = 'SPECWEAVE_REVIEW_OUT';

/** `{out}`, `"{out}"` or `'{out}'` → `"$SPECWEAVE_REVIEW_OUT"` (`"%SPECWEAVE_REVIEW_OUT%"` on Windows). */
export function expandOut(command: string, platform: NodeJS.Platform = process.platform): string {
  const ref = platform === 'win32' ? `"%${OUT_ENV}%"` : `"$${OUT_ENV}"`;
  return command.replace(/(["']?)\{out\}\1/g, ref);
}

export interface RunResult {
  code: number;
  output: string;
  timedOut: boolean;
  stderr: string;
}

/** Grace between SIGTERM and SIGKILL, and again before giving up on the pipes. */
const KILL_GRACE_MS = 5_000;

/**
 * Run a reviewer with the brief on stdin; its answer is `{out}` when used, else
 * stdout. On timeout the whole process tree is stopped, and the result returns
 * within two grace periods even if a descendant keeps the pipes open.
 */
export function runReviewer(
  command: string,
  brief: string,
  opts: { cwd: string; outFile: string; timeoutMs: number; env?: NodeJS.ProcessEnv; graceMs?: number },
): Promise<RunResult> {
  const usesOut = command.includes('{out}');
  const cmd = expandOut(command);
  const grace = opts.graceMs ?? KILL_GRACE_MS;
  if (usesOut) {
    fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
    fs.rmSync(opts.outFile, { force: true });
  }
  return new Promise((resolve) => {
    const posix = process.platform !== 'win32';
    const child = spawn(cmd, {
      cwd: opts.cwd,
      shell: true,
      // Own process group on POSIX so a timeout or Ctrl-C stops the reviewer's children too.
      detached: posix,
      env: { ...(opts.env ?? process.env), [OUT_ENV]: opts.outFile },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let done = false;
    const killTree = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        if (posix) process.kill(-child.pid, signal);
        else spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 2000 });
      } catch {
        // already gone
      }
    };
    // Ctrl-C or a kill of `specweave review`: there is no time left to escalate, so
    // the reviewer's group is killed outright before the signal is passed on.
    const onSignal = (signal: NodeJS.Signals) => {
      killTree('SIGKILL');
      process.kill(process.pid, signal);
    };
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    child.stdout?.on('data', (d: Buffer) => { stdout += d.toString('utf8'); });
    child.stderr?.on('data', (d: Buffer) => { stderr = (stderr + d.toString('utf8')).slice(-8000); });
    child.stdin?.on('error', () => { /* reviewer exited before reading the brief */ });
    child.stdin?.end(brief);
    const timers: NodeJS.Timeout[] = [];
    const finish = (code: number) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      // Whatever the reviewer left behind (a descendant that ignored SIGTERM, a
      // background job) goes with it: the group is ours alone.
      if (posix || timedOut) killTree('SIGKILL');
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      const fromFile = usesOut && fs.existsSync(opts.outFile) ? fs.readFileSync(opts.outFile, 'utf8') : '';
      resolve({ code, output: (fromFile || stdout).trim(), timedOut, stderr: stderr.trim() });
    };
    timers.push(setTimeout(() => {
      timedOut = true;
      killTree('SIGTERM');
      timers.push(setTimeout(() => {
        killTree('SIGKILL');
        timers.push(setTimeout(() => finish(124), grace));
      }, grace));
    }, opts.timeoutMs));
    child.on('close', (code) => finish(code ?? 1));
    child.on('error', (e) => { stderr += String(e); finish(127); });
  });
}

export type Verdict = 'ship' | 'fix first';

/** `Verdict: fix first` / `**Verdict:** ship` anywhere in the answer; the first one wins. */
export function parseVerdict(text: string): Verdict | undefined {
  const m = text.match(/^[\s>*_#-]*verdict[*_]*\s*:[*_\s]*(ship|fix[ -]first)\b/im);
  if (!m) return undefined;
  return m[1].toLowerCase() === 'ship' ? 'ship' : 'fix first';
}
