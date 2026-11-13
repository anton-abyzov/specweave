/**
 * Closure gate for `specweave complete` (2.0).
 *
 * By default, verify.json is required unless the caller supplies --reason.
 * With testing.strictClose, terminal tasks, scoped checks and review are
 * required, and --reason cannot override them.
 *
 * @module core/tasks/closure-gate
 */

import * as fs from 'fs';
import * as path from 'path';
import { readVerifyReport, describeUncheckedAcs, specDeclaresAcs, deriveAcStatus, readSpecAcs, detectVerifyCommands } from './verify-runner.js';
import { readStrictClose, resolveOwnerChecks } from './strict-close.js';
import { deriveAcAcceptance, acCloses } from './accepted-skip.js';
import { loadTaskBoard } from './task-board.js';
import { parseVerdict } from '../review/reviewer.js';
import { authorFamilies, git } from '../review/brief.js';
import { canonicalFamily, describePolicy, FAMILY_LABEL, policyAccepts, resolveReviewPolicy } from '../review/policy.js';
import { incrementRepoPaths, readReviewRecords, sameRepo, type ReviewRecord } from '../review/record.js';

export interface ClosureGateResult {
  ok: boolean;
  /** Blocking errors (empty when ok). */
  errors: string[];
  /** Non-blocking notices — things the reader may want to act on. */
  notices: string[];
  /**
   * Purely informational results. A PASSING verify belongs here, not in
   * `notices`: printing "verify ok" under a "⚠️ Warnings" header made a green
   * closure read like a problem report.
   */
  info: string[];
}

export function checkClosureGate(incrementDir: string, incrementId: string, opts: { reason?: string } = {}): ClosureGateResult {
  const errors: string[] = [];
  const notices: string[] = [];
  const info: string[] = [];
  const verify = readVerifyReport(incrementDir);
  const root = path.resolve(incrementDir, '..', '..', '..');
  const strict = readStrictClose(root);
  const reason = strict ? undefined : opts.reason?.trim();
  if (strict && opts.reason?.trim()) errors.push('testing.strictClose does not allow --reason to bypass closure checks');

  if (!verify) {
    if (!reason) {
      errors.push(`reports/verify.json missing — run \`specweave verify ${incrementId}\` first${strict ? '' : ', or pass --reason "<why closing without it>"'}`);
    } else {
      notices.push(`closing without verify.json — reason: ${reason}`);
    }
  } else if (!verify.ok) {
    // Say WHY it is not ok: failing commands and/or unticked acceptance
    // criteria. "not ok (failed)" sent people hunting for a broken test that
    // did not exist when the real blocker was 0 of 2 ACs.
    const parts: string[] = [];
    const failed = verify.commands.filter((c) => c.exit !== 0).map((c) => `${c.cmd} (exit ${c.exit})`).join(', ');
    if (failed) parts.push(failed);
    const unchecked = describeUncheckedAcs(verify.acs);
    if (unchecked) parts.push(unchecked);
    const why = parts.join('; ') || 'failed';
    if (!reason) {
      errors.push(`verify.json is not ok (${why}) — fix and re-run \`specweave verify ${incrementId}\`${strict ? '' : ', or pass --reason'}`);
    } else {
      notices.push(`closing with failed verify (${why}) — reason: ${reason}`);
    }
  } else {
    info.push(`verify ok (${verify.ranAt}; ${verify.commands.length} command(s); ACs ${verify.acs.done}/${verify.acs.total})`);
    // Accepted skips close an AC without verifying it: name every one.
    const accepted = (verify.acs.items ?? []).filter((a) => a.acceptance === 'skipped-accepted').map((a) => a.id);
    if (accepted.length) info.push(`skipped (accepted), not verified: ${accepted.join(', ')} — see reports/verify.md`);
    const uncovered = (verify.acs.items ?? []).filter((a) => a.uncovered).map((a) => a.id);
    if (uncovered.length) notices.push(`${uncovered.join(', ')} closed by accepted skips with no task citing them — check no task cites them in a form the parser does not read`);
    // An `ok` report that still has open ACs can only come from a spec with no
    // AC lines at all, or a hand-edited verify.json. Say so out loud.
    const unchecked = describeUncheckedAcs(verify.acs);
    if (unchecked) notices.push(`${unchecked} — verify.json still reports ok; check reports/verify.json`);
  }

  // 0933: an increment with no acceptance criteria has no definition of done.
  if (fs.existsSync(path.join(incrementDir, 'spec.md')) && !specDeclaresAcs(incrementDir)) {
    if (!reason) {
      errors.push('spec.md declares no acceptance criteria — add `- [ ] AC-01: …` lines' +
        (strict ? '' : ', or pass --reason "<why closing without them>"'));
    } else {
      notices.push(`spec.md declares no acceptance criteria — closing anyway, reason: ${reason}`);
    }
  }

  try {
    const board = loadTaskBoard(incrementDir);
    const open = board.tasks.filter((t) => t.state.status !== 'done' && t.state.status !== 'skipped');
    if (open.length) (strict ? errors : notices).push(`${open.length} task(s) not done: ${open.map((t) => `${t.id} (${t.state.status})`).join(', ')}`);
    if (strict) {
      if (board.fold.malformed) errors.push('Fix malformed task ledger entries before closing');
      if (!deriveAcAcceptance(deriveAcStatus(readSpecAcs(incrementDir), board), board).every(acCloses)) {
        errors.push('Current acceptance criteria are not met');
      }
      const owners = resolveOwnerChecks(root, board, strict);
      errors.push(...owners.errors);
      if (verify?.increment !== incrementId || !verify.strictClose || !Number.isFinite(Date.parse(verify.ranAt))) {
        errors.push('Run strict verification for this increment before closing');
      } else {
        const detected = detectVerifyCommands(root);
        const required = [...owners.checks, ...detected.commands.map((cmd) => ({ cmd, cwd: '.', source: detected.source }))];
        if (required.length === 0 || required.some(({ cmd, cwd, source }) =>
          !verify.commands.some((check) => check.cmd === cmd && check.cwd === cwd && check.source === source && check.exit === 0))) {
          errors.push('Required project or owning product verification is missing or has changed — re-run verify');
        }
      }
    }
  } catch {
    if (strict) errors.push('Unable to read the task board for strict closure');
  }

  (strict ? errors : notices).push(...reviewNotices(incrementDir, strict ? verify?.ranAt ?? '' : undefined));

  // A review policy that requires a review (spec.md `## Review`, review.policy,
  // review.crossModel) is checked by family, verdict and reviewed code.
  const policyProblems = reviewPolicyErrors(root, incrementDir, verify?.ranAt);
  if (policyProblems.length) {
    if (!reason) errors.push(...policyProblems);
    else notices.push(...policyProblems.map((p) => `${p} — closing anyway, reason: ${reason}`));
  }

  return { ok: errors.length === 0, errors, notices, info };
}

/**
 * Review notices: none on file, a `fix first` verdict in the newest
 * `reports/review*.md`, or no cross-model review while `review.crossModel` is on.
 */
function reviewNotices(incrementDir: string, verifiedAt?: string): string[] {
  const reportsDir = path.join(incrementDir, 'reports');
  const reviews = fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir)
        .filter((f) => /^review(-[A-Za-z0-9._-]+)?\.md$/.test(f))
        .map((f) => ({ f, mtime: fs.statSync(path.join(reportsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
    : [];
  if (!reviews.length) return ['no reports/review.md or review-<reviewer>.md — run sw-review (or `specweave review` for another model) before shipping user-facing work'];
  const notices: string[] = [];
  const newest = fs.readFileSync(path.join(reportsDir, reviews[0].f), 'utf8');
  if (verifiedAt !== undefined && (!Number.isFinite(Date.parse(verifiedAt)) || reviews[0].mtime < Date.parse(verifiedAt))) {
    notices.push('The newest review predates verification — review again after verify');
  }
  if (verifiedAt !== undefined && !parseVerdict(newest)) notices.push('The newest review needs an explicit Verdict: ship');
  if (parseVerdict(newest) === 'fix first') notices.push(`reports/${reviews[0].f} says fix first — fix its critical and high findings and review again`);
  if (crossModelRequired(incrementDir)) {
    const crossModel = reviews.find((r) => r.f.startsWith('review-'));
    if (!crossModel) {
      notices.push('review.crossModel is on but no cross-model review is on file — run `specweave review`');
    } else if (verifiedAt !== undefined && (crossModel.mtime < Date.parse(verifiedAt) ||
      parseVerdict(fs.readFileSync(path.join(reportsDir, crossModel.f), 'utf8')) !== 'ship')) {
      notices.push('The latest cross-model review must say ship and follow verification — run `specweave review`');
    }
  }
  return notices;
}

function crossModelRequired(incrementDir: string): boolean {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.resolve(incrementDir, '..', '..', 'config.json'), 'utf-8')) as { review?: { crossModel?: unknown } };
    return cfg.review?.crossModel === true;
  } catch {
    return false;
  }
}

function describeRecord(r: ReviewRecord): string {
  const who = r.model ?? r.reviewer;
  const known = canonicalFamily(r.family);
  const family = known ? FAMILY_LABEL[known] ?? known : r.family === 'unknown' ? 'family not recorded' : `unrecognized family "${r.family}"`;
  return `${who} (${family}${r.depth ? `, ${r.depth}` : ''})${r.head ? ` at ${r.head.slice(0, 12)}` : ''}, ${r.verdict ?? 'no verdict'}, reports/${r.file}`;
}

/**
 * With a required review policy: for every repository holding the increment's
 * task Files, the newest review matching the policy must say ship, follow
 * verification, and have read the code that is there now (the reviewed commit
 * and HEAD agree on the task Files, so a squash-merged pull request passes).
 */
export function reviewPolicyErrors(root: string, incrementDir: string, verifiedAt: string | undefined): string[] {
  let policy;
  try {
    policy = resolveReviewPolicy(root, incrementDir);
  } catch {
    return [];
  }
  if (!policy.required) return [];
  const author = authorFamilies(incrementDir).primary;
  const records = readReviewRecords(incrementDir);
  const wanted = describePolicy(policy, author);
  const from = policy.sources.required === 'spec' ? 'spec.md ## Review' : policy.sources.required === 'crossModel' ? 'review.crossModel' : 'review.policy';
  const howTo = policy.family === 'cross-family' || policy.family === 'openai'
    ? 'run `specweave review`, or have that model review and record it with `specweave review --record <file> --model <id>`'
    : 'have that model review and record it with `specweave review --record <file> --model <id>`';
  const errors: string[] = [];
  const groups = incrementRepoPaths(root, incrementDir);
  const repos: Array<[string, string[]]> = groups.size ? [...groups] : [['', []]];
  for (const [repo, paths] of repos) {
    const inRepo = repo === '' ? records : records.filter((r) => sameRepo(r.repo, repo));
    const where = repo === '' ? '' : ` for ${repo === '.' ? 'the project root' : repo}`;
    const match = inRepo.find((r) => policyAccepts(policy, r, r.author ?? author));
    if (!match) {
      const newest = inRepo[0] ?? records[0];
      errors.push(`Review policy (${from}) requires ${wanted}${where}; ${newest ? `the newest review is ${describeRecord(newest)}` : 'no review is on file'} — ${howTo}`);
      continue;
    }
    if (match.verdict !== 'ship') {
      errors.push(`The required review${where} says ${match.verdict ?? 'no verdict'}: ${describeRecord(match)} — fix its critical and high findings and review again`);
      continue;
    }
    // The record's own time decides; a checkout resets file times.
    if (verifiedAt !== undefined && Number.isFinite(Date.parse(verifiedAt))) {
      if (!match.timed) {
        errors.push(`The required review${where} does not say when it was recorded: ${describeRecord(match)} — record it with \`specweave review --record <file> --model <id> --head <sha>\``);
        continue;
      }
      if (match.atMs < Date.parse(verifiedAt)) {
        errors.push(`The required review${where} predates verification: ${describeRecord(match)} — record or run it again after \`specweave verify\``);
        continue;
      }
    }
    if (repo === '') continue;
    if (!match.head) {
      errors.push(`The required review${where} does not name the commit it read: ${describeRecord(match)} — record it with \`specweave review --record <file> --model <id> --head <sha>\``);
      continue;
    }
    const repoDir = path.resolve(root, repo);
    if (git(repoDir, ['cat-file', '-e', `${match.head}^{commit}`]) === null) {
      errors.push(`The reviewed commit ${match.head.slice(0, 12)} is not in ${repo === '.' ? 'the project' : repo} — fetch it (git fetch origin) and close again`);
      continue;
    }
    // Literal pathspecs: a task File is a path, never Git pathspec magic.
    const diff = git(repoDir, ['--literal-pathspecs', 'diff', '--name-only', match.head, 'HEAD', '--', ...paths]);
    if (diff === null) {
      errors.push(`Could not compare the reviewed commit ${match.head.slice(0, 12)} with HEAD${where} (git diff failed) — check the task Files and the checkout, then close again`);
      continue;
    }
    const changed = diff.trim().split('\n').filter(Boolean);
    if (changed.length) {
      const head = git(repoDir, ['rev-parse', '--short=12', 'HEAD'])?.trim() ?? 'HEAD';
      errors.push(`The code${where} changed since the review at ${match.head.slice(0, 12)}: ${changed.length} file(s) differ at ${head} (${changed.slice(0, 5).join(', ')}${changed.length > 5 ? ', …' : ''}) — update the checkout to the shipped code, or review again`);
    }
  }
  return errors;
}
