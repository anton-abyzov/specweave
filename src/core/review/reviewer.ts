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

function quote(p: string): string {
  return process.platform === 'win32' ? `"${p}"` : `'${p.replace(/'/g, `'\\''`)}'`;
}

export interface RunResult {
  code: number;
  output: string;
  timedOut: boolean;
  stderr: string;
}

/** Run a reviewer with the brief on stdin; its answer is `{out}` when used, else stdout. */
export function runReviewer(
  command: string,
  brief: string,
  opts: { cwd: string; outFile: string; timeoutMs: number; env?: NodeJS.ProcessEnv },
): Promise<RunResult> {
  const usesOut = command.includes('{out}');
  const cmd = command.split('{out}').join(quote(opts.outFile));
  if (usesOut) {
    fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
    fs.rmSync(opts.outFile, { force: true });
  }
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd: opts.cwd, shell: true, env: opts.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout?.on('data', (d: Buffer) => { stdout += d.toString('utf8'); });
    child.stderr?.on('data', (d: Buffer) => { stderr = (stderr + d.toString('utf8')).slice(-8000); });
    child.stdin?.on('error', () => { /* reviewer exited before reading the brief */ });
    child.stdin?.end(brief);
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, opts.timeoutMs);
    const finish = (code: number) => {
      clearTimeout(timer);
      const fromFile = usesOut && fs.existsSync(opts.outFile) ? fs.readFileSync(opts.outFile, 'utf8') : '';
      resolve({ code, output: (fromFile || stdout).trim(), timedOut, stderr: stderr.trim() });
    };
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
