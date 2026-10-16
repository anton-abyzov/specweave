import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRange } from '../../../scripts/ci/release-bump-only.mjs';

const script = fileURLToPath(new URL('../../../scripts/ci/release-bump-only.mjs', import.meta.url));

// A throwaway repository with the release files, so the gate is exercised on
// real git ranges rather than on mocked diffs.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_') && !key.startsWith('GITHUB_')));
let repo = '';
const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], {
    cwd: repo, encoding: 'utf8', env: { ...env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' },
  }).trim();
const write = (file: string, content: unknown) => {
  fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  fs.writeFileSync(path.join(repo, file), typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
};
function release(version: string, extra: Record<string, unknown> = {}) {
  write('package.json', { name: 'specweave', version, dependencies: { chalk: '^5.3.0' }, ...extra });
  write('package-lock.json', { name: 'specweave', version, lockfileVersion: 3, packages: { '': { name: 'specweave', version } } });
  write('plugins/specweave/.claude-plugin/plugin.json', { name: 'sw', version });
  write('.claude-plugin/marketplace.json', { name: 'specweave', version, plugins: [{ name: 'sw', version }] });
}
function commit(message: string) {
  git('add', '-A');
  git('commit', '-q', '-m', message);
  return git('rev-parse', 'HEAD');
}

let base = '';
beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-change-gate-'));
  git('init', '-q', '-b', 'develop');
  release('3.0.21');
  write('CHANGELOG.md', '## [3.0.21]\n\n- one\n');
  write('src/a.ts', 'export const a = 1;\n');
  write('docs-site/docs/a.md', '# a\n');
  base = commit('base');
}, 30_000);
afterAll(() => { if (repo) fs.rmSync(repo, { recursive: true, force: true }); });

function onBranch(name: string, change: () => void) {
  git('checkout', '-q', '-b', name, base);
  change();
  return commit(name);
}

describe('release-bump-only change gate', () => {
  it('skips a patch bump that only touches version fields and the CHANGELOG', () => {
    const head = onBranch('patch', () => { release('3.0.22'); write('CHANGELOG.md', '## [3.0.22]\n\n- two\n'); });
    expect(classifyRange(base, head, { cwd: repo })).toMatchObject({ bumpOnly: true, skippable: true, docsOnly: false });
  }, 20_000);

  it('skips a prerelease bump within the same minor', () => {
    const head = onBranch('pre', () => release('3.0.22-rc.1'));
    expect(classifyRange(base, head, { cwd: repo })).toMatchObject({ bumpOnly: true, skippable: true });
  }, 20_000);

  it('runs the tests for a minor bump', () => {
    const head = onBranch('minor', () => release('3.1.0'));
    const result = classifyRange(base, head, { cwd: repo });
    expect(result).toMatchObject({ bumpOnly: false, skippable: false });
    expect(result.reason).toMatch(/not a patch or prerelease bump/);
  }, 20_000);

  it('runs the tests when a bump also changes a dependency', () => {
    const head = onBranch('dep', () => release('3.0.22', { dependencies: { chalk: '^6.0.0' } }));
    const result = classifyRange(base, head, { cwd: repo });
    expect(result.skippable).toBe(false);
    expect(result.reason).toMatch(/package\.json changes more than its version fields/);
  }, 20_000);

  it('runs the tests when the lockfile changes more than its version', () => {
    const head = onBranch('lock', () => {
      release('3.0.22');
      write('package-lock.json', { name: 'specweave', version: '3.0.22', lockfileVersion: 3, packages: { '': { name: 'specweave', version: '3.0.22' }, 'node_modules/x': { version: '1.0.0' } } });
    });
    expect(classifyRange(base, head, { cwd: repo }).skippable).toBe(false);
  }, 20_000);

  it('runs the tests when code changes next to a bump', () => {
    const head = onBranch('code', () => { release('3.0.22'); write('src/a.ts', 'export const a = 2;\n'); });
    const result = classifyRange(base, head, { cwd: repo });
    expect(result).toMatchObject({ bumpOnly: false, skippable: false });
    expect(result.reason).toMatch(/src\/a\.ts/);
  }, 20_000);

  it('runs the tests for docs-site/docs, which a unit test reads', () => {
    const head = onBranch('docs-tested', () => write('docs-site/docs/a.md', '# b\n'));
    expect(classifyRange(base, head, { cwd: repo })).toMatchObject({ docsOnly: false, skippable: false });
  }, 20_000);

  it('skips changes confined to untested paths', () => {
    const head = onBranch('docs-static', () => { write('docs-site/static/img/a.svg', '<svg/>'); write('metrics/dora-latest.json', '{}'); });
    expect(classifyRange(base, head, { cwd: repo })).toMatchObject({ docsOnly: true, bumpOnly: false, skippable: true });
  }, 20_000);

  it('runs the tests when a manifest is deleted', () => {
    const head = onBranch('deleted', () => fs.rmSync(path.join(repo, 'plugins/specweave/.claude-plugin/plugin.json')));
    expect(classifyRange(base, head, { cwd: repo }).skippable).toBe(false);
  }, 20_000);
});

// The CLI is what CI runs: it must only skip when the range it was given is
// exactly the change of the event GitHub reports.
describe('release-bump-only CLI binds the range to the event', () => {
  let prHead = '';
  let merge = '';
  beforeAll(() => {
    prHead = onBranch('pr-bump', () => release('3.0.22'));
    git('checkout', '-q', '-b', 'pr-merge', base);
    git('merge', '-q', '--no-ff', '--no-edit', 'pr-bump');
    merge = git('rev-parse', 'HEAD');
  }, 30_000);

  function gate(eventName: string, event: unknown, head = merge) {
    const eventPath = path.join(repo, '..', `${path.basename(repo)}-event-${eventName}.json`);
    fs.writeFileSync(eventPath, JSON.stringify(event));
    try {
      const out = execFileSync('node', [script, `${head}^1`, head], {
        cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...env, GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: eventPath },
      });
      return Object.fromEntries(out.trim().split('\n').map((line) => line.split('=')));
    } finally {
      fs.rmSync(eventPath, { force: true });
    }
  }

  it('skips a pull_request merge commit whose second parent is the PR head', () => {
    expect(gate('pull_request', { pull_request: { head: { sha: prHead } } })).toEqual({ bump_only: 'true', docs_only: 'false', skip: 'true' });
  }, 20_000);

  it('runs the tests when the checkout is not the merge of the reported PR head', () => {
    expect(gate('pull_request', { pull_request: { head: { sha: base } } }).skip).toBe('false');
    expect(gate('pull_request', {}).skip).toBe('false');
  }, 20_000);

  it('skips a push of one commit on top of event.before', () => {
    expect(gate('push', { before: base }).skip).toBe('true');
  }, 20_000);

  it('runs the tests for a push of several commits or a new branch', () => {
    expect(gate('push', { before: prHead }).skip).toBe('false');
    expect(gate('push', { before: '0000000000000000000000000000000000000000' }).skip).toBe('false');
  }, 20_000);

  it('runs the tests for any other event', () => {
    expect(gate('workflow_dispatch', {}).skip).toBe('false');
  }, 20_000);
});
