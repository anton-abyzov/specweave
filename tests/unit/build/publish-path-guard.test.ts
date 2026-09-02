/**
 * Publish-path wiring guard.
 *
 * The committed `.npmrc` sets `ignore-scripts=true` for supply-chain reasons.
 * npm does not scope that to dependencies: it also suppresses THIS package's
 * own `prepublishOnly`, so a bare `npm publish` runs no rebuild, no version
 * check and no preflight, and will happily upload a tarball with no `dist/`.
 *
 * Two things therefore have to stay true, and nothing else in the repo asserts
 * them:
 *   1. the preflight is actually ON the publish path (hook + documented command)
 *   2. the documented command forces hooks back on (`--ignore-scripts=false`)
 *
 * `.github/workflows/publish-guard.yml` proves the preflight still FAILS on an
 * unbuilt tree; this file proves it is still wired to anything at all.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(process.cwd());
const read = (rel: string): string => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const pkg = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>;
  bin: Record<string, string>;
};

describe('publish path', () => {
  it('the preflight script exists where package.json points', () => {
    expect(pkg.scripts['release:preflight']).toBe('node scripts/release/preflight-publish.mjs');
    expect(fs.existsSync(path.join(repoRoot, 'scripts/release/preflight-publish.mjs'))).toBe(true);
  });

  it('prepublishOnly still rebuilds, checks versions and preflights', () => {
    const hook = pkg.scripts.prepublishOnly;
    expect(hook).toContain('rebuild');
    expect(hook).toContain('validate:versions');
    expect(hook).toContain('release:preflight');
  });

  it('`npm run release` publishes with lifecycle hooks forced back on', () => {
    // Without --ignore-scripts=false the .npmrc wins and prepublishOnly is
    // skipped — the exact hole this guard exists to close.
    expect(pkg.scripts.release).toBe('npm publish --ignore-scripts=false');
  });

  it('.npmrc still documents why the hand-publish command is not bare `npm publish`', () => {
    const npmrc = read('.npmrc');
    expect(npmrc).toMatch(/^\s*ignore-scripts\s*=\s*true\s*$/m);
    expect(npmrc).toContain('npm run release');
  });

  it('the CI release workflow runs build, version check and preflight before publishing', () => {
    const wf = read('.github/workflows/release.yml');
    const order = ['npm run build', 'npm run validate:versions', 'npm run release:preflight', 'npm publish'];
    let cursor = -1;
    for (const step of order) {
      const at = wf.indexOf(step, cursor + 1);
      expect(at, `${step} missing from release.yml after position ${cursor}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it('the declared bin entrypoint exists on disk', () => {
    for (const target of Object.values(pkg.bin)) {
      expect(fs.existsSync(path.join(repoRoot, target)), `${target} is declared in bin but missing`).toBe(true);
    }
  });
});
