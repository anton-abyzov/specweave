/**
 * Tests for PluginsChecker --fix support
 * TC-PC-01 to TC-PC-05: fix mode behavior for local state, global cache, marketplace, core plugin
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({ execSync: mockExecSync }));

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
  // TC-PC-03: marketplace issues cannot be auto-fixed (wrong tool)
  // refresh-plugins copies to ~/.claude/commands/, NOT the marketplace dir
  // =========================================================================
  it('TC-PC-03: fix=true with marketplace installed but empty reports warn (no auto-fix)', async () => {
    // Create marketplace dir without plugins/ subdir
    const marketplaceDir = path.join(
      tmpDir,
      '.claude',
      'plugins',
      'marketplaces',
      'specweave'
    );
    fs.mkdirSync(marketplaceDir, { recursive: true });

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    // No execSync — marketplace issues require manual intervention
    expect(mockExecSync).not.toHaveBeenCalled();
    const mktCheck = result.checks.find(c => c.name === 'SpecWeave marketplace');
    expect(mktCheck?.status).toBe('warn');
  });

  it('TC-PC-03b: fix=true with marketplace not installed reports warn (no auto-fix)', async () => {
    // No marketplace dir at all
    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    expect(mockExecSync).not.toHaveBeenCalled();
    const mktCheck = result.checks.find(c => c.name === 'SpecWeave marketplace');
    expect(mktCheck?.status).toBe('warn');
    expect(mktCheck?.fixSuggestion).toContain('claude plugin marketplace add');
  });

  // =========================================================================
  // TC-PC-04: core plugin issues cannot be auto-fixed via refresh-plugins
  // =========================================================================
  it('TC-PC-04: fix=true with missing core plugin reports warn (no auto-fix)', async () => {
    // Create marketplace dir with plugins/ but no specweave core plugin
    const pluginsDir = path.join(
      tmpDir,
      '.claude',
      'plugins',
      'marketplaces',
      'specweave',
      'plugins'
    );
    fs.mkdirSync(pluginsDir, { recursive: true });

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    expect(mockExecSync).not.toHaveBeenCalled();
    const coreCheck = result.checks.find(c => c.name === 'Core plugin (sw)');
    expect(coreCheck?.status).toBe('warn');
  });

  it('TC-PC-04b: fix=true with incomplete core plugin (no skills or commands) reports fail (no auto-fix)', async () => {
    // Create core plugin dir but without skills/ or commands/
    const corePluginDir = path.join(
      tmpDir,
      '.claude',
      'plugins',
      'marketplaces',
      'specweave',
      'plugins',
      'specweave'
    );
    fs.mkdirSync(corePluginDir, { recursive: true });

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, { fix: true });

    expect(mockExecSync).not.toHaveBeenCalled();
    const coreCheck = result.checks.find(c => c.name === 'Core plugin (sw)');
    expect(coreCheck?.status).toBe('fail');
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

  it('should pass for marketplace when fully installed', async () => {
    const corePluginDir = path.join(
      tmpDir,
      '.claude',
      'plugins',
      'marketplaces',
      'specweave',
      'plugins',
      'specweave'
    );
    const skillsDir = path.join(corePluginDir, 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'do.md'), '# Do');

    const checker = new PluginsChecker({ homeDir: tmpDir });
    const result = await checker.check(projectRoot, {});
    const mktCheck = result.checks.find(c => c.name === 'SpecWeave marketplace');
    const coreCheck = result.checks.find(c => c.name === 'Core plugin (sw)');
    expect(mktCheck?.status).toBe('pass');
    expect(coreCheck?.status).toBe('pass');
  });
});
