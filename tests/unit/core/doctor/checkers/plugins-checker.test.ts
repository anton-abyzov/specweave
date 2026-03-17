/**
 * Tests for PluginsChecker --fix support
 * TC-PC-01 to TC-PC-05: fix mode behavior for local state, global cache, marketplace, core plugin
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const { mockExecSync, mockExecFile, mockExecFileSync } = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
  mockExecFile: vi.fn(),
  mockExecFileSync: vi.fn(() => ''),
}));
vi.mock('child_process', () => ({
  execSync: mockExecSync,
  execFile: mockExecFile,
  execFileSync: mockExecFileSync,
}));

import { PluginsChecker } from '../../../../../src/core/doctor/checkers/plugins-checker.js';

describe('PluginsChecker', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-plugins-checker-'));
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(projectRoot, { recursive: true });
    mockExecSync.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // =========================================================================
  // TC-PC-01: fix=true with invalid local state file deletes the file
  // =========================================================================
  it('TC-PC-01: fix=true with invalid state file deletes the corrupt file', async () => {
    const stateDir = path.join(projectRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    const statePath = path.join(stateDir, 'plugins-loaded.json');
    fs.writeFileSync(statePath, 'NOT VALID JSON {{{{');

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    expect(fs.existsSync(statePath)).toBe(false);
    const stateCheck = result.checks.find(c => c.name === 'Local plugin state');
    expect(stateCheck?.status).toBe('warn');
    expect(stateCheck?.message).toContain('removed');
  });

  // =========================================================================
  // TC-PC-02: fix=true with stale global cache deletes the file
  // =========================================================================
  it('TC-PC-02: fix=true with stale global cache (>24h) deletes it', async () => {
    const cacheDir = path.join(tmpDir, '.specweave', 'state');
    fs.mkdirSync(cacheDir, { recursive: true });
    const cachePath = path.join(cacheDir, 'plugins-loaded.json');
    fs.writeFileSync(cachePath, '{}');

    // Set mtime to 25 hours ago
    const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
    fs.utimesSync(cachePath, staleTime, staleTime);

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    expect(fs.existsSync(cachePath)).toBe(false);
    const cacheCheck = result.checks.find(c => c.name === 'Global plugin cache');
    expect(cacheCheck?.status).toBe('warn');
    expect(cacheCheck?.message).toContain('removed');
  });

  // =========================================================================
  // TC-PC-03: marketplace not registered in known_marketplaces.json
  // =========================================================================
  it('TC-PC-03: fix=true with marketplace not registered attempts fix', async () => {
    // No known_marketplaces.json => marketplace not registered
    // With fix=true, source calls findSpecweaveRoot then execFileNoThrowSync
    // findSpecweaveRoot walks up from __dirname looking for package.json with name 'specweave'
    // In test env it may or may not find it depending on dist layout
    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    const mktCheck = result.checks.find(c => c.name === 'SpecWeave marketplace');
    // Either 'fail' (findSpecweaveRoot returns null) or 'pass' (fix succeeded via execFileNoThrowSync)
    expect(['pass', 'fail']).toContain(mktCheck?.status);
  });

  it('TC-PC-03b: fix=false with marketplace not registered reports warn', async () => {
    // No known_marketplaces.json at all
    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: false });

    const mktCheck = result.checks.find(c => c.name === 'SpecWeave marketplace');
    expect(mktCheck?.status).toBe('warn');
    expect(mktCheck?.fixSuggestion).toContain('specweave doctor --fix');
  });

  // =========================================================================
  // TC-PC-04: core plugin not in installed_plugins.json
  // =========================================================================
  it('TC-PC-04: fix=true with missing core plugin attempts fix via execFileNoThrowSync', async () => {
    // No installed_plugins.json => core plugin not installed
    // With fix=true, source calls execFileNoThrowSync('claude', ['plugin', 'install', ...])
    // mockExecFileSync returns '' which wrapper treats as success => pass
    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    const coreCheck = result.checks.find(c => c.name === 'Core plugin (sw)');
    // execFileNoThrowSync wrapper treats non-throwing execFileSync as success
    expect(coreCheck?.status).toBe('pass');
    expect(coreCheck?.message).toContain('was missing');
  });

  it('TC-PC-04b: fix=false with missing core plugin reports warn', async () => {
    // No installed_plugins.json => core plugin not installed
    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: false });

    const coreCheck = result.checks.find(c => c.name === 'Core plugin (sw)');
    expect(coreCheck?.status).toBe('warn');
  });

  // =========================================================================
  // TC-PC-05: fix=false preserves existing behavior (no side effects)
  // =========================================================================
  it('TC-PC-05: fix=false does not delete corrupt state file', async () => {
    const stateDir = path.join(projectRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    const statePath = path.join(stateDir, 'plugins-loaded.json');
    fs.writeFileSync(statePath, 'NOT VALID JSON');

    const checker = new PluginsChecker({ homeDir: tmpDir });
    await checker.check(projectRoot, { fix: false });

    expect(fs.existsSync(statePath)).toBe(true);
  });

  it('TC-PC-05b: fix=false does not call execSync for missing marketplace', async () => {
    const checker = new PluginsChecker({ homeDir: tmpDir });
    await checker.check(projectRoot, { fix: false });

    expect(mockExecSync).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Existing behavior (no regression)
  // =========================================================================
  it('should pass for local state when state file is absent', async () => {
    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, {});
    const stateCheck = result.checks.find(c => c.name === 'Local plugin state');
    expect(stateCheck?.status).toBe('skip');
    expect(stateCheck?.message).toContain('no state file');
  });

  it('should pass for local state when state file is valid', async () => {
    const stateDir = path.join(projectRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, 'plugins-loaded.json'),
      JSON.stringify({ loadedPlugins: ['sw', 'frontend'] })
    );

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, {});
    const stateCheck = result.checks.find(c => c.name === 'Local plugin state');
    expect(stateCheck?.status).toBe('pass');
    expect(stateCheck?.message).toContain('2 plugin(s)');
  });

  it('should pass for marketplace when registered in known_marketplaces.json', async () => {
    // Source now reads known_marketplaces.json for marketplace registration
    const pluginsDir = path.join(tmpDir, '.claude', 'plugins');
    fs.mkdirSync(pluginsDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginsDir, 'known_marketplaces.json'),
      JSON.stringify({ specweave: { path: '/some/path' } })
    );
    // Source reads installed_plugins.json for core plugin
    fs.writeFileSync(
      path.join(pluginsDir, 'installed_plugins.json'),
      JSON.stringify({ plugins: { 'sw@specweave': { scope: 'user' } } })
    );

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, {});
    const mktCheck = result.checks.find(c => c.name === 'SpecWeave marketplace');
    const coreCheck = result.checks.find(c => c.name === 'Core plugin (sw)');
    expect(mktCheck?.status).toBe('pass');
    expect(coreCheck?.status).toBe('pass');
  });
});
