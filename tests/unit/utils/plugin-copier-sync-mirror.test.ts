/**
 * Unit tests for the mirror behaviour of syncNativePluginContent (0894).
 *
 * Copying over the cache left files the new plugin no longer ships, so 3.x
 * kept offering the retired 2.x `qa` skill. The sync now mirrors the source
 * and only ever touches paths inside ~/.claude/plugins/cache.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncNativePluginContent } from '../../../src/utils/plugin-copier.js';

function write(p: string, content: string): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

describe('syncNativePluginContent mirror (0894)', () => {
  let tmp = '';
  let home = '';
  let specweaveRoot = '';
  let installPath = '';

  function recordInstallPath(p: string): void {
    write(
      path.join(home, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: { 'sw@specweave': [{ scope: 'user', installPath: p, version: '2.1.0' }] } }),
    );
  }

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-mirror-'));
    home = path.join(tmp, 'home');
    specweaveRoot = path.join(tmp, 'pkg');
    installPath = path.join(home, '.claude', 'plugins', 'cache', 'specweave', 'sw', '2.1.0');

    write(
      path.join(specweaveRoot, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({ plugins: [{ name: 'sw', source: './plugins/specweave' }] }),
    );
    const src = path.join(specweaveRoot, 'plugins', 'specweave');
    write(path.join(src, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'sw', version: '3.0.12' }));
    write(path.join(src, 'skills', 'do', 'SKILL.md'), 'do v3');
    write(path.join(src, 'lib', 'keep.js'), 'keep');

    // Stale 2.x content in the cache.
    write(path.join(installPath, 'skills', 'do', 'SKILL.md'), 'do v2');
    write(path.join(installPath, 'skills', 'qa', 'SKILL.md'), 'qa v2');
    write(path.join(installPath, 'lib', 'keep.js'), 'old');
    write(path.join(installPath, 'lib', 'features', 'old.js'), 'old');
    write(path.join(installPath, 'scripts', 'old.sh'), 'old');
    write(path.join(installPath, '.in_use'), '');
    recordInstallPath(installPath);
  });

  afterEach(() => {
    if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('removes skills and files the new version no longer ships', () => {
    const res = syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });

    expect(res.synced).toBe(1);
    expect(fs.readFileSync(path.join(installPath, 'skills', 'do', 'SKILL.md'), 'utf8')).toBe('do v3');
    expect(fs.readFileSync(path.join(installPath, 'lib', 'keep.js'), 'utf8')).toBe('keep');
    expect(fs.existsSync(path.join(installPath, 'skills', 'qa'))).toBe(false);
    expect(fs.existsSync(path.join(installPath, 'lib', 'features'))).toBe(false);
    expect(fs.existsSync(path.join(installPath, 'scripts'))).toBe(false);
  });

  it("keeps Claude Code's root dotfile markers", () => {
    syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });
    expect(fs.existsSync(path.join(installPath, '.in_use'))).toBe(true);
  });

  it('refuses an install path outside the plugin cache and leaves it untouched', () => {
    const outside = path.join(tmp, 'elsewhere', 'sw');
    write(path.join(outside, 'mine.txt'), 'user file');
    recordInstallPath(outside);

    const res = syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });

    expect(res.synced).toBe(0);
    expect(fs.readFileSync(path.join(outside, 'mine.txt'), 'utf8')).toBe('user file');
    expect(fs.existsSync(path.join(outside, 'skills'))).toBe(false);
  });

  it('refuses the cache root itself', () => {
    recordInstallPath(path.join(home, '.claude', 'plugins', 'cache'));
    const res = syncNativePluginContent('sw', specweaveRoot, { homeOverride: home });
    expect(res.synced).toBe(0);
    expect(fs.existsSync(path.join(installPath, 'skills', 'qa'))).toBe(true);
  });
});
