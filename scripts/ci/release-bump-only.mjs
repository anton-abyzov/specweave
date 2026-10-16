#!/usr/bin/env node
// Decides whether a change can skip the test jobs, so a release PR does not
// re-test code develop already tested, and a docs-only change does not hold
// the Test & Validate concurrency slot.
//
//   node scripts/ci/release-bump-only.mjs <base> <head>   (CI: HEAD^1 HEAD)
//
// Prints GITHUB_OUTPUT lines:
//   bump_only=true  only version fields, the CHANGELOG and the manifests
//                   changed, within the same major.minor (a minor or major
//                   bump can switch on version-gated code, so it is tested)
//   docs_only=true  only paths no test, build or package reads changed
//   skip=true       every changed file is one of the two kinds above
// Any error, an empty diff, or a range that is not exactly this event's change
// prints false for all three, so the tests run.
//
// scripts/release/require-green-ci.mjs uses classifyRange() to accept an older
// tested commit for a release whose own run skipped its tests.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export const BUMP_FILES = [
  'package.json',
  'package-lock.json',
  'CHANGELOG.md',
  'plugins/specweave/.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
];

// tests/unit/skills/brainstorm-docs.test.ts reads docs-site/docs, so that tree
// is NOT listed here. Nothing under these prefixes is read by a test, the
// build or the npm package.
export const UNTESTED_PREFIXES = [
  'docs-site/static/',
  'docs-site/src/',
  'docs-site/blog/',
  'docs-site/remotion/',
  'metrics/',
  'video/',
];

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

function withoutVersions(file, json) {
  const copy = structuredClone(json);
  delete copy.version;
  if (file === 'package-lock.json' && copy.packages?.['']) delete copy.packages[''].version;
  if (file === '.claude-plugin/marketplace.json' && Array.isArray(copy.plugins)) {
    for (const plugin of copy.plugins) if (plugin && typeof plugin === 'object') delete plugin.version;
  }
  return copy;
}

function majorMinor(version) {
  const match = /^(\d+)\.(\d+)\.\d+/.exec(String(version ?? ''));
  return match ? `${match[1]}.${match[2]}` : null;
}

// Throws when a JSON bump file is missing on either side or is not valid JSON:
// the caller then treats the range as needing tests.
function versionOnlyChange(base, head, file, cwd) {
  const before = JSON.parse(git(['show', `${base}:${file}`], cwd));
  const after = JSON.parse(git(['show', `${head}:${file}`], cwd));
  if (!isDeepStrictEqual(withoutVersions(file, before), withoutVersions(file, after))) {
    return `${file} changes more than its version fields`;
  }
  if (file === 'package.json') {
    const from = majorMinor(before.version);
    if (!from || from !== majorMinor(after.version)) {
      return `package.json ${before.version} -> ${after.version} is not a patch or prerelease bump`;
    }
  }
  return null;
}

export function classifyRange(base, head, { cwd = process.cwd() } = {}) {
  const files = git(['diff', '--name-only', '--no-renames', base, head], cwd).split('\n').filter(Boolean);
  const untested = (file) => UNTESTED_PREFIXES.some((prefix) => file.startsWith(prefix));
  const bumpFiles = files.filter((file) => BUMP_FILES.includes(file));
  const other = files.filter((file) => !BUMP_FILES.includes(file) && !untested(file));
  let reason = other.length ? `tested files changed: ${other.slice(0, 5).join(', ')}${other.length > 5 ? ', ...' : ''}` : null;
  if (!reason) {
    for (const file of bumpFiles) {
      if (!file.endsWith('.json')) continue;
      try {
        reason = versionOnlyChange(base, head, file, cwd);
      } catch (error) {
        reason = `${file}: ${error.message.split('\n')[0]}`;
      }
      if (reason) break;
    }
  }
  const skippable = !reason;
  return {
    files,
    bumpOnly: skippable && files.length > 0 && bumpFiles.length === files.length,
    docsOnly: files.length > 0 && files.every(untested),
    skippable,
    reason: reason ?? (files.length ? 'only version fields, the CHANGELOG or untested paths changed' : 'no files changed'),
  };
}

// The range must be exactly what this event changed. A pull_request checkout is
// the merge commit refs/pull/N/merge, so HEAD^1 is the base tip and HEAD^2 must
// be the PR head. A push is one commit (a PR merge or squash) only when HEAD^1
// is the commit the branch pointed to before the push.
function rangeMatchesEvent(base, head, cwd, env = process.env) {
  if (!env.GITHUB_ACTIONS) return { ok: true };
  const event = env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const rev = (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd).trim();
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    const prHead = event.pull_request?.head?.sha;
    if (!prHead || rev(`${head}^2`) !== prHead || rev(base) !== rev(`${head}^1`)) {
      return { ok: false, reason: 'checkout is not the PR merge commit over its base' };
    }
    return { ok: true };
  }
  if (env.GITHUB_EVENT_NAME === 'push') {
    if (!event.before || rev(base) !== event.before) {
      return { ok: false, reason: `push is more than one commit on top of ${event.before || 'nothing'}` };
    }
    return { ok: true };
  }
  return { ok: false, reason: `${env.GITHUB_EVENT_NAME || 'unknown'} events always run the tests` };
}

function main(argv) {
  const [base, head] = argv;
  let result = { bumpOnly: false, docsOnly: false, skippable: false, reason: 'usage: release-bump-only.mjs <base> <head>' };
  try {
    if (!base || !head) throw new Error(result.reason);
    const cwd = process.cwd();
    const event = rangeMatchesEvent(base, head, cwd);
    result = event.ok ? classifyRange(base, head, { cwd }) : { bumpOnly: false, docsOnly: false, skippable: false, reason: event.reason };
    if (event.ok && result.files.length === 0) result.skippable = false;
  } catch (error) {
    result = { bumpOnly: false, docsOnly: false, skippable: false, reason: `error, running tests: ${error.message.split('\n')[0]}` };
  }
  // stdout goes to $GITHUB_OUTPUT; the explanation goes to the log.
  console.error(`[change-gate] skip=${result.skippable} (${result.reason})`);
  process.stdout.write(`bump_only=${result.bumpOnly}\ndocs_only=${result.docsOnly}\nskip=${result.skippable}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
