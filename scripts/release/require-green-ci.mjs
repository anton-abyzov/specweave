#!/usr/bin/env node
// Refuses a release unless Test & Validate passed on the code being released:
// on the released commit itself, or on an older first-parent commit whose
// difference to it only touches files the test change gate skips
// (scripts/ci/release-bump-only.mjs): a patch bump merged on top of tested
// develop, a [skip ci] metrics commit, untested docs paths.
//
//   node scripts/release/require-green-ci.mjs <sha>
//
// Uses `gh api` (GH_TOKEN in CI, the gh login locally). While a relevant run
// is still in progress it polls every 10 s, for at most 10 minutes.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRange } from '../ci/release-bump-only.mjs';

// Job and step names in .github/workflows/test.yml. A run proves the code only
// when these steps ran and passed; the change gate leaves them skipped.
export const TESTED_STEPS = [
  { job: 'smoke', step: 'Run smoke tests' },
  { job: 'unit', step: 'Run unit tests' },
];

export function runOutcome(run, jobs = []) {
  if (run.status !== 'completed') return 'pending';
  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') return 'failed';
  if (run.conclusion !== 'success') return 'ignored'; // cancelled (superseded), skipped, neutral
  const tested = TESTED_STEPS.every(({ job, step }) => {
    const found = jobs.find((candidate) => candidate.name === job);
    return found?.conclusion === 'success' && (found.steps ?? []).some((s) => s.name === step && s.conclusion === 'success');
  });
  return tested ? 'passed' : 'skipped';
}

const short = (sha) => String(sha).slice(0, 9);

// Walks first-parent history from sha. The newest completed run that really
// tested equivalent code decides; a newer run still in progress only matters
// when nothing older passed (it cannot test different code, see the gate).
export async function evaluate(sha, { revList, isEquivalent, listRuns, listJobs }) {
  let pending = null;
  let headHasRuns = false;
  const stop = (reason) => (pending ? { verdict: 'wait', ...pending } : { verdict: 'none', reason, headHasRuns });
  for (const commit of revList(sha)) {
    if (commit !== sha) {
      const equivalent = isEquivalent(commit, sha);
      if (!equivalent.ok) return stop(`${short(commit)}..${short(sha)} changes tested files (${equivalent.reason}), so only a run on ${short(sha)} itself counts`);
    }
    const runs = await listRuns(commit);
    if (commit === sha) headHasRuns = runs.length > 0;
    for (const run of runs) {
      const outcome = run.status === 'completed' && run.conclusion === 'success' ? runOutcome(run, await listJobs(run.id)) : runOutcome(run);
      if (outcome === 'pending') {
        pending ??= { commit, run, reason: `Test & Validate run ${run.html_url ?? run.id} on ${short(commit)} is ${run.status}` };
      } else if (outcome === 'passed') {
        return { verdict: 'pass', commit, run };
      } else if (outcome === 'failed') {
        return pending
          ? { verdict: 'wait', ...pending }
          : { verdict: 'fail', commit, run, reason: `Test & Validate failed on ${short(commit)}: ${run.html_url ?? run.id}` };
      }
    }
  }
  return stop('no Test & Validate run in the last first-parent commits really ran the tests');
}

function gh(apiPath) {
  return JSON.parse(execFileSync('gh', ['api', '-H', 'Accept: application/vnd.github+json', apiPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }));
}

export function liveSources(repo, cwd = process.cwd()) {
  return {
    revList: (sha) => execFileSync('git', ['rev-list', '--first-parent', '-n', '30', sha], { cwd, encoding: 'utf8' }).split('\n').filter(Boolean),
    isEquivalent: (from, to) => {
      try {
        const range = classifyRange(from, to, { cwd });
        return { ok: range.skippable, reason: range.reason };
      } catch (error) {
        return { ok: false, reason: error.message.split('\n')[0] };
      }
    },
    listRuns: async (commit) => gh(`repos/${repo}/actions/workflows/test.yml/runs?head_sha=${commit}&event=push&per_page=20`).workflow_runs ?? [],
    listJobs: async (runId) => gh(`repos/${repo}/actions/runs/${runId}/jobs?per_page=100`).jobs ?? [],
  };
}

export async function requireGreenCi(sha, { sources, pollMs = 10_000, maxWaitMs = 600_000, noRunGraceMs = 120_000, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  const started = now();
  for (;;) {
    const result = await evaluate(sha, sources);
    if (result.verdict === 'pass') {
      log(`[ci-gate] Test & Validate passed on ${short(result.commit)} (${result.run.html_url ?? result.run.id})${result.commit === sha ? '' : `; ${short(sha)} differs from it only in files the tests do not read`}`);
      return result;
    }
    const elapsed = now() - started;
    // A freshly pushed commit gets its run a few seconds late.
    const waitForRun = result.verdict === 'none' && !result.headHasRuns && elapsed < noRunGraceMs;
    if (result.verdict === 'fail' || (result.verdict === 'none' && !waitForRun)) throw new Error(result.reason);
    if (elapsed >= maxWaitMs) throw new Error(`gave up after ${Math.round(elapsed / 1000)}s: ${result.reason ?? 'no run yet'}`);
    log(`[ci-gate] waiting: ${result.verdict === 'wait' ? result.reason : `no Test & Validate run on ${short(sha)} yet`}`);
    await sleep(pollMs);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sha = process.argv[2];
  const repo = process.env.GITHUB_REPOSITORY || 'anton-abyzov/specweave';
  try {
    if (!sha) throw new Error('usage: require-green-ci.mjs <sha>');
    const full = execFileSync('git', ['rev-parse', '--verify', `${sha}^{commit}`], { encoding: 'utf8' }).trim();
    await requireGreenCi(full, { sources: liveSources(repo) });
  } catch (error) {
    console.error(`::error::Release refused, tests are not proven green for this commit: ${error.message}`);
    process.exitCode = 1;
  }
}
