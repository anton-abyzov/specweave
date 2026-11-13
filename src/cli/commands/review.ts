/**
 * CLI: `specweave review [id]` — adversarial review of an increment's diff by a
 * model from another family than the one that wrote it (Codex with GPT-6.1-Sol
 * for Claude-written code). Writes reports/reviews/review-<reviewer>-<n>.md for
 * each run, a copy as reports/review-<reviewer>.md (the latest), and a ledger note.
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
  commandForPolicy,
  DEFAULT_TIMEOUT_MINUTES,
  parseVerdict,
  pickReviewer,
  reviewersFrom,
  runReviewer,
  type Reviewer,
} from '../../core/review/reviewer.js';
import { describePolicy, familyOfModel, policyAccepts, resolveReviewPolicy, type ReviewPolicy } from '../../core/review/policy.js';
import { formatRecordHeader, modelOfCommand, stripRecordHeader, type ReviewRecordFields } from '../../core/review/record.js';
import { toProjectPath } from '../../core/tasks/strict-close.js';
import type { ReviewConfiguration } from '../../core/config/types.js';

export interface ReviewCommandOptions {
  brief?: boolean;
  reviewer?: string;
  base?: string;
  timeout?: string;
  json?: boolean;
  /** Record a review written elsewhere (any tool or model) instead of running one. */
  record?: string;
  /** The model that wrote the recorded review, such as gpt-6.1-sol. */
  model?: string;
  /** Its family when the model id does not say (openai, claude, google, xai, meta). */
  family?: string;
  /** The commit the recorded review read; default HEAD. */
  head?: string;
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
  const policy = resolveReviewPolicy(projectRoot, inc.dir, config);
  const brief = buildBrief({ projectRoot, repoRoot, incrementId: inc.id, incrementDir: inc.dir, base, policy });
  if (opts.brief) {
    if (opts.json) out(JSON.stringify(brief, null, 2));
    else process.stdout.write(brief.text);
    return 0;
  }
  const repo = toProjectPath(projectRoot, repoRoot) || '.';
  if (opts.record !== undefined) return recordReview(opts, { inc, policy, author: brief.author.primary, base, head: brief.head, repo, cwd, out, err });

  const choice = pickReviewer(reviewersFrom(config), brief.author.primary, {
    explicit: opts.reviewer,
    configured: config.reviewer,
    available: opts.available,
    policyFamily: policy.family,
    policyRequired: policy.required,
  });
  if (!opts.json) out(`Review policy: ${describePolicy(policy, brief.author.primary)}${policy.required ? ', required to close' : ''} (from ${policy.sources.reviewer}).`);
  if (!choice.reviewer) {
    err(`No reviewer: ${choice.why}. Install Codex (codex login), pass --reviewer, or have a model of that family review \`specweave review --brief\` and record it with \`specweave review --record <file> --model <id>\`.`);
    return 1;
  }
  const reviewer = choice.reviewer;
  if (choice.conflict) err(`Warning: ${choice.conflict}.`);
  // The policy's model only applies to a reviewer of that model's family.
  const policyModel = policy.model && familyOfModel(policy.model) === reviewer.family ? policy.model : undefined;
  const command = commandForPolicy(reviewer, { model: policyModel, depth: policy.depth });
  const minutes = opts.timeout !== undefined ? Number(opts.timeout) : config.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    err(`--timeout must be a positive number of minutes, got "${opts.timeout}".`);
    return 1;
  }

  const reportsDir = path.join(inc.dir, 'reports');
  const safeName = reviewer.name.replace(/[^A-Za-z0-9._-]/g, '-');
  const reportPath = path.join(reportsDir, `review-${safeName}.md`);
  const sameFamily = brief.author.primary !== undefined && reviewer.family === brief.author.primary;
  if (!opts.json) {
    out(`Reviewer: ${reviewer.name} (${reviewer.family}; ${choice.why}). Author: ${brief.author.primary ?? 'unknown'}.`);
    if (sameFamily) out(`  ${reviewer.name} is the same family as the author; this is not a cross-model review.`);
    out(`  ${brief.paths.length ? `${brief.paths.length} path(s)` : 'whole diff'} since ${base.slice(0, 12)} · timeout ${minutes} min`);
  }

  const run = await runReviewer(command, brief.text, {
    cwd: repoRoot,
    outFile: path.join(reportsDir, `.review-${reviewer.name}.out`),
    timeoutMs: minutes * 60_000,
  });
  fs.rmSync(path.join(reportsDir, `.review-${reviewer.name}.out`), { force: true });
  // A reviewer that failed or timed out never counts, whatever its output says.
  if (run.timedOut || run.code !== 0) {
    err(run.timedOut ? `${reviewer.name} timed out after ${minutes} min.` : `${reviewer.name} exited ${run.code}.`);
    const tail = run.stderr || run.output;
    if (tail) err(tail.split('\n').slice(-15).join('\n'));
    return 1;
  }

  const verdict = parseVerdict(run.output);
  fs.mkdirSync(reportsDir, { recursive: true });
  const at = new Date().toISOString();
  const header = formatRecordHeader({
    reviewer: reviewer.name,
    ...(modelOfCommand(command) ? { model: modelOfCommand(command) } : {}),
    family: reviewer.family,
    author: brief.author.primary ?? 'unknown',
    depth: policy.depth,
    repo,
    base,
    head: brief.head,
    at,
  });
  // Each run keeps its own numbered file, so a later review never erases the
  // one an earlier ledger note points at; review-<reviewer>.md is the latest.
  const runPath = nextRunPath(path.join(reportsDir, 'reviews'), safeName);
  fs.mkdirSync(path.dirname(runPath), { recursive: true });
  fs.writeFileSync(runPath, `${header}\n${run.output}\n`);
  fs.copyFileSync(runPath, reportPath);
  const rel = path.relative(inc.dir, runPath).split(path.sep).join('/');
  appendEvent(ledgerPath(inc.dir), {
    t: INCREMENT_EVENT_TASK,
    e: 'note',
    by: getAgentId(),
    at,
    note: `review by ${reviewer.name} (${reviewer.family}): ${verdict ?? 'no verdict'} · ${rel}`,
  });

  const code = verdict === 'ship' ? 0 : 3;
  if (opts.json) {
    out(JSON.stringify({ reviewer: reviewer.name, family: reviewer.family, author: brief.author.primary ?? null, verdict: verdict ?? null, report: reportPath, run: runPath, base, head: brief.head }, null, 2));
  } else {
    const shown = path.relative(cwd, reportPath).split(path.sep).join('/');
    out(`${verdict ? `Verdict: ${verdict}` : 'No verdict line in the answer; read the report'} → ${shown}`);
    if (verdict === 'fix first') out('Fix every critical and high finding (or add a task for it), then verify and review again.');
  }
  return code;
}

interface RecordContext {
  inc: { id: string; dir: string };
  policy: ReviewPolicy;
  author: string | undefined;
  base: string;
  head: string;
  repo: string;
  cwd: string;
  out: (s: string) => void;
  err: (s: string) => void;
}

/**
 * `--record <file>`: a review some other tool or model wrote (a SpecWithCode
 * review thread, Codex, Claude Code) becomes a record like the ones
 * `specweave review` writes, so closure can check its family and commit.
 */
function recordReview(opts: ReviewCommandOptions, c: RecordContext): number {
  const file = path.resolve(c.cwd, opts.record ?? '');
  let text: string;
  try {
    text = stripRecordHeader(fs.readFileSync(file, 'utf8')).trim();
  } catch {
    c.err(`Cannot read the review to record: ${opts.record}`);
    return 1;
  }
  const model = opts.model?.trim();
  if (!model) {
    c.err('--record needs --model <id>: the model that wrote the review, such as gpt-6.1-sol or claude-opus-5-5.');
    return 1;
  }
  const verdict = parseVerdict(text);
  if (!verdict) {
    c.err(`${opts.record} has no verdict line; its second line must read \`Verdict: ship\` or \`Verdict: fix first\`.`);
    return 1;
  }
  const head = opts.head?.trim() || c.head;
  if (!/^[0-9a-f]{7,40}$/i.test(head)) {
    c.err(`--head must be a commit id, got "${head}".`);
    return 1;
  }
  const family = (opts.family?.trim() || familyOfModel(model)).toLowerCase();
  const fields: ReviewRecordFields = {
    reviewer: opts.reviewer?.trim() || model,
    model,
    family,
    author: c.author ?? 'unknown',
    depth: c.policy.depth,
    repo: c.repo,
    base: c.base,
    head,
    at: new Date().toISOString(),
  };
  const reportsDir = path.join(c.inc.dir, 'reports');
  const safeName = fields.reviewer.replace(/[^A-Za-z0-9._-]/g, '-');
  const runPath = nextRunPath(path.join(reportsDir, 'reviews'), safeName);
  fs.mkdirSync(path.dirname(runPath), { recursive: true });
  fs.writeFileSync(runPath, `${formatRecordHeader(fields)}\n${text}\n`);
  fs.copyFileSync(runPath, path.join(reportsDir, `review-${safeName}.md`));
  const rel = path.relative(c.inc.dir, runPath).split(path.sep).join('/');
  const accepted = policyAccepts(c.policy, { family, model, depth: fields.depth }, c.author);
  appendEvent(ledgerPath(c.inc.dir), {
    t: INCREMENT_EVENT_TASK,
    e: 'note',
    by: getAgentId(),
    at: fields.at!,
    note: `review by ${model} (${family}) at ${head.slice(0, 12)}: ${verdict} · ${rel}`,
  });
  if (opts.json) {
    c.out(JSON.stringify({ reviewer: fields.reviewer, model, family, author: c.author ?? null, verdict, head, repo: c.repo, run: runPath, satisfiesPolicy: accepted }, null, 2));
  } else {
    c.out(`Recorded: ${model} (${family}) reviewed ${c.repo === '.' ? 'the project' : c.repo} at ${head.slice(0, 12)}, verdict ${verdict} → ${path.relative(c.cwd, runPath).split(path.sep).join('/')}`);
    c.out(accepted
      ? `It satisfies the review policy (${describePolicy(c.policy, c.author)}).`
      : `It does NOT satisfy the review policy: ${describePolicy(c.policy, c.author)}.${c.policy.required ? ' Closure will refuse until such a review says ship.' : ''}`);
  }
  return verdict === 'ship' ? 0 : 3;
}

/** reviews/review-<name>-<n>.md with n one past the highest run on file. */
function nextRunPath(dir: string, name: string): string {
  const re = new RegExp(`^review-${name.replace(/[.\\-]/g, '\\$&')}-(\\d+)\\.md$`);
  let max = 0;
  try {
    for (const f of fs.readdirSync(dir)) {
      const m = re.exec(f);
      if (m) max = Math.max(max, Number(m[1]));
    }
  } catch {
    // no runs yet
  }
  return path.join(dir, `review-${name}-${max + 1}.md`);
}
