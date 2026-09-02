/**
 * Three-way version alignment guard (0871).
 *
 * Claude Code reads plugin.json for the installed-plugin version and
 * marketplace.json for "available updates"; package.json is what npm publishes.
 * If any drift, users are silently pinned to a stale plugin cache (stale hooks /
 * missing skills) — exactly what happened when plugin.json froze at 1.0.586 while
 * package.json reached 1.0.589. This test fails on any drift so it can never ship.
 *
 * Mirrors scripts/validation/validate-versions.cjs as a unit-suite gate.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(process.cwd());

function readJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
}

describe('version alignment (package.json ↔ marketplace.json ↔ plugin.json)', () => {
  const pkg = readJson('package.json').version;

  it('plugin manifest version equals package.json version', () => {
    const plugin = readJson('plugins/specweave/.claude-plugin/plugin.json').version;
    expect(plugin, `plugin.json ${plugin} != package.json ${pkg}`).toBe(pkg);
  });

  it('marketplace.json root + plugins[0] versions equal package.json version', () => {
    const mkt = readJson('.claude-plugin/marketplace.json');
    expect(mkt.version, `marketplace root ${mkt.version} != ${pkg}`).toBe(pkg);
    expect(mkt.plugins?.[0]?.version, `marketplace plugins[0] ${mkt.plugins?.[0]?.version} != ${pkg}`).toBe(pkg);
  });
  it('the skill catalog carries no version of its own (it cannot drift)', () => {
    // plugins/specweave/marketplace.json is a skill catalog, not a manifest. It used to
    // carry its own "version" (2.0.0 while plugin.json said 1.0.593), which read as drift
    // to everyone who opened the two files side by side. There is exactly one version now.
    const catalog = readJson('plugins/specweave/marketplace.json');
    expect(catalog.version, 'skill catalog must not declare a version').toBeUndefined();
  });

  it('every skill the catalog lists exists on disk, and vice versa', () => {
    const catalog = readJson('plugins/specweave/marketplace.json');
    const listed = (catalog.skills ?? []).map((s: any) => s.name.replace(/^sw:/, '')).sort();
    const onDisk = fs
      .readdirSync(path.join(repoRoot, 'plugins/specweave/skills'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(listed).toEqual(onDisk);
  });
});
