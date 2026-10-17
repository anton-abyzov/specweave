/**
 * The brief `specweave review` hands a reviewer: what the increment promised
 * (ACs, Approach, tasks and their Files), who wrote it (model family from the
 * ledger), the diff range and the diff itself, and the report shape to answer in.
 *
 * @module core/review/brief
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { readLedger, ledgerPath } from '../tasks/ledger.js';
import { readSpecAcs } from '../tasks/verify-runner.js';
import { loadTaskBoard } from '../tasks/task-board.js';
import { readGlossary } from '../glossary/parse.js';

/** Diff text above this many characters is left out; the reviewer runs git itself. */
export const MAX_DIFF_CHARS = 150_000;

/** Model family of a tool name as the ledger records it (`claude@mbp` → claude). */
export function familyOfTool(tool: string): string {
  const t = tool.toLowerCase();
  if (/^(claude|anthropic|opus|sonnet|haiku)/.test(t)) return 'claude';
  if (/^(codex|openai|gpt|chatgpt)/.test(t)) return 'openai';
  if (/^(grok|xai)/.test(t)) return 'xai';
  if (/^(gemini|google)/.test(t)) return 'google';
  return t;
}

export interface AuthorFamilies {
  /** Family that finished the most tasks, or undefined when the ledger has none. */
  primary?: string;
  /** Family → number of `done` events. */
  counts: Record<string, number>;
}

/**
 * Who wrote the increment, from its ledger's `done` events (claims when no task is
 * done yet). `SPECWEAVE_AGENT` names without a tool (`api`) do not count.
 */
export function authorFamilies(incrementDir: string): AuthorFamilies {
  const { events } = readLedger(ledgerPath(incrementDir));
  const tally = (type: string) => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      if (e.e !== type || !e.by.includes('@')) continue;
      const family = familyOfTool(e.by.split('@')[0]);
      counts[family] = (counts[family] ?? 0) + 1;
    }
    return counts;
  };
  let counts = tally('done');
  if (!Object.keys(counts).length) counts = tally('claim');
  const primary = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  return { primary, counts };
}

export function git(cwd: string, args: string[]): string | null {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return res.status === 0 ? res.stdout : null;
}

/** `--base`, else the merge-base with the remote's default branch, develop, main or master. */
export function resolveBase(repoRoot: string, explicit?: string): string | null {
  const candidates = explicit
    ? [explicit]
    : ['origin/HEAD', 'origin/develop', 'origin/main', 'origin/master', 'develop', 'main', 'master'];
  for (const ref of candidates) {
    const sha = git(repoRoot, ['merge-base', 'HEAD', ref])?.trim();
    if (sha) return sha;
    if (explicit) return null;
  }
  return null;
}

function section(spec: string, heading: string): string {
  const lines = spec.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return '';
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

export interface ReviewBrief {
  incrementId: string;
  title: string;
  author: AuthorFamilies;
  base: string;
  head: string;
  /** Task Files inside the repository, repo-relative; empty means the whole diff. */
  paths: string[];
  stat: string;
  diffIncluded: boolean;
  text: string;
}

export interface BuildBriefOptions {
  projectRoot: string;
  repoRoot: string;
  incrementId: string;
  incrementDir: string;
  base: string;
}

export function buildBrief(opts: BuildBriefOptions): ReviewBrief {
  const { projectRoot, repoRoot, incrementId, incrementDir, base } = opts;
  const specFile = path.join(incrementDir, 'spec.md');
  const spec = fs.existsSync(specFile) ? fs.readFileSync(specFile, 'utf8') : '';
  const title = spec.match(/^#\s+(.+)$/m)?.[1].trim() ?? incrementId;
  const author = authorFamilies(incrementDir);
  const acs = readSpecAcs(incrementDir);
  let tasks: Array<{ id: string; title: string; files: string[]; test?: string; status: string }> = [];
  try {
    tasks = loadTaskBoard(incrementDir).tasks.map((t) => ({
      id: t.id, title: t.title, files: t.filesAffected ?? [], test: t.test, status: t.state.status,
    }));
  } catch {
    // unreadable tasks: the brief still carries the ACs and the diff
  }

  const paths = [...new Set(tasks.flatMap((t) => t.files))]
    .map((f) => path.relative(repoRoot, path.resolve(projectRoot, f.replace(/\/$/, ''))))
    .filter((f) => f && !f.startsWith('..') && !path.isAbsolute(f))
    .map((f) => f.split(path.sep).join('/'));
  const head = git(repoRoot, ['rev-parse', 'HEAD'])?.trim() ?? 'HEAD';
  const range = `${base}...HEAD`;
  const scope = paths.length ? ['--', ...paths] : [];
  const stat = git(repoRoot, ['diff', '--stat', range, ...scope])?.trim() ?? '';
  const diff = git(repoRoot, ['diff', range, ...scope]) ?? '';
  const diffIncluded = diff.length > 0 && diff.length <= MAX_DIFF_CHARS;
  const diffCmd = `git diff ${base.slice(0, 12)}...HEAD${paths.length ? ` -- ${paths.join(' ')}` : ''}`;

  const glossary = readGlossary(projectRoot);
  const authorLine = author.primary
    ? `${author.primary} (${Object.entries(author.counts).map(([f, n]) => `${f} ${n}`).join(', ')} finished tasks)`
    : 'unknown (no finished tasks in the ledger)';

  const parts: string[] = [
    `# Adversarial review: ${incrementId} ${title}`,
    '',
    'You are reviewing code another model wrote. Do not edit files. Hunt for real failures:',
    'input or state that leads to wrong output, a crash, a hang, data loss, a leak, or an',
    'acceptance criterion claimed but not met. Every finding cites `path:line` and the',
    'concrete failure. Re-open the lines before you report a finding; drop what does not',
    'survive. "Consider refactoring" is not a finding.',
    '',
    `Repository: ${repoRoot}`,
    `Written by: ${authorLine}`,
    `Diff: ${diffCmd} (base ${base}, head ${head})`,
    '',
    'Order: correctness (logic, error paths, races, off-by-one), security (injection, path',
    'traversal, secrets, unsafe exec), spec compliance (ACs below; tests that assert nothing',
    'or mock the subject), portability (Windows paths, shells, encodings).',
    '',
  ];
  if (acs.length) {
    parts.push('## Acceptance criteria', '', ...acs.map((a) => `- ${a.id}: ${a.text}`), '');
  }
  const approach = section(spec, 'Approach');
  if (approach) parts.push('## Approach', '', approach, '');
  if (tasks.length) {
    parts.push('## Tasks', '');
    for (const t of tasks) {
      parts.push(`- ${t.id} ${t.title} [${t.status}]${t.files.length ? ` · Files: ${t.files.join(', ')}` : ''}${t.test ? ` · Test: ${t.test}` : ''}`);
    }
    parts.push('');
  }
  if (glossary.length) {
    parts.push(
      '## Glossary',
      '',
      'New names must use these terms; an avoided word in a new identifier is a low finding.',
      '',
      ...glossary.map((g) => `- ${g.term}${g.avoid.length ? ` (avoid: ${g.avoid.join(', ')})` : ''}`),
      '',
    );
  }
  parts.push('## Diff stat', '', '```', stat || '(empty diff)', '```', '');
  if (diffIncluded) parts.push('## Diff', '', '```diff', diff.trimEnd(), '```', '');
  else if (diff.length) parts.push(`The diff is ${diff.length} characters; run \`${diffCmd}\` and read it in parts.`, '');
  parts.push(
    '## Answer in exactly this shape',
    '',
    '```markdown',
    `# Review: ${incrementId} ${title}`,
    'Verdict: fix first · risk: high · 6 files · 2 findings (1 critical, 1 high)',
    '',
    '## [critical] src/core/tasks/ledger.ts:142 lost claim under equal timestamps',
    'Two agents claim T-01 in the same second; the fold sorts only by `at`, so both read',
    'themselves as owner. Fix: break ties by `by`, then file order.',
    '',
    'Nits: at most 5, on one line.',
    '```',
    '',
    'Severity is critical, high, medium or low. The verdict is `fix first` while any critical',
    'or high finding survives, otherwise `ship`. The second line must start with `Verdict:`.',
  );
  return { incrementId, title, author, base, head, paths, stat, diffIncluded, text: parts.join('\n') + '\n' };
}
