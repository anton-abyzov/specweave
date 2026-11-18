/**
 * Init installs no Claude plugin (3.0): it writes the sw-* project skills.
 * The old plugin installer is gone (1407); what stays pinned here is that
 * init never brings it back, where plugin cleanup lives now, and the
 * marketplace contents.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('init installs no Claude plugin (3.0)', () => {
  it('installs the sw-* project skills instead', () => {
    const content = read('src/cli/commands/init.ts');
    expect(content).toContain('installProjectSkills(targetDir)');
    expect(content).not.toContain('installAllPlugins');
    expect(content).not.toContain('enablePluginsInSettings');
    expect(content).not.toContain('isSwPluginInstalledNatively');
  });

  it('has no plugin installer helper left to call', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'src/cli/helpers/init/plugin-installer.ts'))).toBe(false);
  });

  it('leaves stale plugin cleanup to refresh-plugins', () => {
    expect(read('src/cli/commands/refresh-plugins.ts')).toContain('cleanupStalePlugins');
  });
});

describe('marketplace', () => {
  const marketplace = JSON.parse(read('.claude-plugin/marketplace.json')) as { plugins?: Array<{ name: string }> };

  it('lists the sw core plugin', () => {
    expect(marketplace.plugins?.some((p) => p.name === 'sw')).toBe(true);
  });

  it('no longer lists sw-router (removed in v1.0.160)', () => {
    expect(marketplace.plugins?.some((p) => p.name === 'sw-router')).toBe(false);
  });
});
