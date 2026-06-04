/**
 * Unit tests for syncNativePluginContent (0872).
 *
 * refresh-plugins must FORCE the installed plugin content to match the current
 * package, because `claude plugin install` dedups and leaves stale content in
 * the fixed installPath. This function copies the plugin source into each
 * installPath recorded in installed_plugins.json and refreshes the version label.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncNativePluginContent } from '../../../src/utils/plugin-copier.js';

function writeJson(p: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

describe('syncNativePluginContent (0872)', () => {
  let tmp = '';
  let home = '';
  let specweaveRoot = '';
  let installPath = '';

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-plugin-'));
    home = path.join(tmp, 'home');
    specweaveRoot = path.join(tmp, 'pkg');
    installPath = path.join(tmp, 'cache', 'specweave', 'sw', '1.0.0');

    // Fake specweave package: marketplace.json (source mapping) + the plugin source.
    writeJson(path.join(specweaveRoot, '.claude-plugin', 'marketplace.json'), {
      plugins: [{ name: 'sw', source: './plugins/specweave', version: '2.0.0' }],
    });
    const src = path.join(specweaveRoot, 'plugins', 'specweave');
    writeJson(path.join(src, '.claude-plugin', 'plugin.json'), { name: 'sw', version: '2.0.0' });
    fs.mkdirSync(path.join(src, 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(src, 'hooks', 'hooks.json'), '{"NEW":true}');
    fs.mkdirSync(path.join(src, 'skills', 'handoff'), { recursive: true });
    fs.writeFileSync(path.join(src, 'skills', 'handoff', 'SKILL.md'), 'handoff');
    fs.mkdirSync(path.join(src, 'hooks-sh'), { recursive: true });
    fs.writeFileSync(path.join(src, 'hooks-sh', 'x.sh'), '#!/bin/sh\n');

    // installed_plugins.json points at a STALE installPath.
    writeJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), {
      version: 2,
      plugins: {
        'sw@specweave': [
          { scope: 'project', projectPath: '/x', installPath, version: '1.0.0', lastUpdated: 'old' },
        ],
      },
    });
  });

  afterEach(() => {
    if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('copies current source into a STALE installPath + drops stale files (AC-US1-01)', () => {
    // Pre-existing stale content: old hooks.json + a file that no longer exists in source.
    fs.mkdirSync(path.join(installPath, 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(installPath, 'hooks', 'hooks.json'), '{"OLD":true}');

    const res = syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });

    expect(res.synced).toBe(1);
    expect(res.paths).toContain(installPath);
    expect(fs.readFileSync(path.join(installPath, 'hooks', 'hooks.json'), 'utf8')).toBe('{"NEW":true}');
    expect(fs.existsSync(path.join(installPath, 'skills', 'handoff', 'SKILL.md'))).toBe(true);
  });

  it('updates the installed_plugins.json version label to the manifest version (AC-US1-02)', () => {
    syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });
    const ip = JSON.parse(
      fs.readFileSync(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8'),
    );
    expect(ip.plugins['sw@specweave'][0].version).toBe('2.0.0');
  });

  it('recreates a WIPED installPath dir (AC-US1-04)', () => {
    // installPath does not exist at all.
    expect(fs.existsSync(installPath)).toBe(false);
    const res = syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });
    expect(res.synced).toBe(1);
    expect(fs.readFileSync(path.join(installPath, 'hooks', 'hooks.json'), 'utf8')).toBe('{"NEW":true}');
  });

  it('no-ops (no throw) when installed_plugins.json is absent (AC-US1-04)', () => {
    fs.rmSync(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), { force: true });
    const res = syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });
    expect(res.synced).toBe(0);
  });

  it('no-ops when the plugin is not in the marketplace (AC-US1-04)', () => {
    const res = syncNativePluginContent('not-a-plugin', specweaveRoot, { homeOverride: home });
    expect(res.synced).toBe(0);
  });
});
