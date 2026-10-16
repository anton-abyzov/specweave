import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyRange } from '../../../scripts/ci/release-bump-only.mjs';

// A throwaway repository with the release files, so the gate is exercised on
// real git ranges rather than on mocked diffs.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
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
