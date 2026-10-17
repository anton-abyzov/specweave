/**
 * CLI: `specweave review [id]` — adversarial review of an increment's diff by a
 * model from another family than the one that wrote it (Codex with GPT-6.1-Sol
 * for Claude-written code). Writes reports/review-<reviewer>.md and a ledger note.
 *
 * Exit 0: verdict ship. 3: fix first, or the reviewer gave no verdict. 1: error.
 * `--brief` prints the brief and runs nothing.
 *
 * @module cli/commands/review
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { resolveIncrement, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { appendEvent, getAgentId, ledgerPath, INCREMENT_EVENT_TASK } from '../../core/tasks/ledger.js';
import { buildBrief, git, resolveBase } from '../../core/review/brief.js';
import {
  DEFAULT_TIMEOUT_MINUTES,
  parseVerdict,
  pickReviewer,
  reviewersFrom,
  runReviewer,
  type Reviewer,
} from '../../core/review/reviewer.js';
import type { ReviewConfiguration } from '../../core/config/types.js';

export interface ReviewCommandOptions {
  brief?: boolean;
  reviewer?: string;
  base?: string;
  timeout?: string;
  json?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
  /** Reviewer availability probe (tests). */
  available?: (r: Reviewer) => boolean;
}

function readReviewConfig(projectRoot: string): ReviewConfiguration {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf8')) as { review?: ReviewConfiguration };
    return cfg.review && typeof cfg.review === 'object' ? cfg.review : {};
  } catch {
    return {};
  }
}

export async function reviewCommand(incrementId?: string, opts: ReviewCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  const cwd = opts.cwd ?? process.cwd();
  const projectRoot = resolveEffectiveRoot(cwd);

  let inc;
  try {
    inc = resolveIncrement(projectRoot, incrementId);
  } catch (e) {
    if (e instanceof IncrementResolutionError) { err(e.message); return 1; }
    throw e;
  }
  const repoRoot = git(cwd, ['rev-parse', '--show-toplevel'])?.trim();
  if (!repoRoot) {
    err('Not inside a Git repository; run specweave review from the repository that holds the code.');
    return 1;
  }
  const base = resolveBase(repoRoot, opts.base);
  if (!base) {
    err(opts.base ? `Cannot find a merge-base with "${opts.base}".` : 'No base branch found (origin/HEAD, develop, main, master); pass --base <ref>.');
    return 1;
  }

  const config = readReviewConfig(projectRoot);
  const brief = buildBrief({ projectRoot, repoRoot, incrementId: inc.id, incrementDir: inc.dir, base });
  if (opts.brief) {
    if (opts.json) out(JSON.stringify(brief, null, 2));
    else process.stdout.write(brief.text);
    return 0;
  }

  const choice = pickReviewer(reviewersFrom(config), brief.author.primary, {
    explicit: opts.reviewer,
    configured: config.reviewer,
    available: opts.available,
  });
  if (!choice.reviewer) {
    err(`No reviewer: ${choice.why}. Install Codex (codex login), pass --reviewer, or paste \`specweave review --brief\` into another model.`);
    return 1;
  }
  const reviewer = choice.reviewer;
  const minutes = opts.timeout !== undefined ? Number(opts.timeout) : config.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    err(`--timeout must be a positive number of minutes, got "${opts.timeout}".`);
    return 1;
  }

  const reportsDir = path.join(inc.dir, 'reports');
  const reportPath = path.join(reportsDir, `review-${reviewer.name.replace(/[^A-Za-z0-9._-]/g, '-')}.md`);
  const sameFamily = brief.author.primary !== undefined && reviewer.family === brief.author.primary;
  if (!opts.json) {
    out(`Reviewer: ${reviewer.name} (${reviewer.family}; ${choice.why}). Author: ${brief.author.primary ?? 'unknown'}.`);
    if (sameFamily) out(`  ${reviewer.name} is the same family as the author; this is not a cross-model review.`);
    out(`  ${brief.paths.length ? `${brief.paths.length} path(s)` : 'whole diff'} since ${base.slice(0, 12)} · timeout ${minutes} min`);
  }

  const run = await runReviewer(reviewer.command, brief.text, {
    cwd: repoRoot,
    outFile: path.join(reportsDir, `.review-${reviewer.name}.out`),
    timeoutMs: minutes * 60_000,
  });
  fs.rmSync(path.join(reportsDir, `.review-${reviewer.name}.out`), { force: true });
  const verdict = parseVerdict(run.output);
  // A reviewer that failed counts only if it still gave a verdict.
  if (run.timedOut || (run.code !== 0 && !verdict)) {
    err(run.timedOut ? `${reviewer.name} timed out after ${minutes} min.` : `${reviewer.name} exited ${run.code}.`);
    const tail = run.stderr || run.output;
    if (tail) err(tail.split('\n').slice(-15).join('\n'));
    return 1;
  }

  fs.mkdirSync(reportsDir, { recursive: true });
  const at = new Date().toISOString();
  const header = `<!-- specweave review: reviewer=${reviewer.name} family=${reviewer.family} author=${brief.author.primary ?? 'unknown'} base=${base} head=${brief.head} at=${at} -->`;
  fs.writeFileSync(reportPath, `${header}\n${run.output}\n`);
  const rel = path.relative(inc.dir, reportPath).split(path.sep).join('/');
  appendEvent(ledgerPath(inc.dir), {
    t: INCREMENT_EVENT_TASK,
    e: 'note',
    by: getAgentId(),
    at,
    note: `review by ${reviewer.name} (${reviewer.family}): ${verdict ?? 'no verdict'} · ${rel}`,
  });

  const code = verdict === 'ship' ? 0 : 3;
  if (opts.json) {
    out(JSON.stringify({ reviewer: reviewer.name, family: reviewer.family, author: brief.author.primary ?? null, verdict: verdict ?? null, report: reportPath, base, head: brief.head }, null, 2));
  } else {
    out(`${verdict ? `Verdict: ${verdict}` : 'No verdict line in the answer; read the report'} → ${reportPath}`);
    if (verdict === 'fix first') out('Fix every critical and high finding (or add a task for it), then verify and review again.');
  }
  return code;
}
