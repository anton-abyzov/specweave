/**
 * Tests for plugin-installer.ts
 *
 * Covers: installAllPlugins, installLazyMode, installPluginsWithRetry
 * (vskill-based plugin installation - see plugin-installer-vskill.test.ts for
 *  TC-018/TC-019 vskill-specific integration tests)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- hoisted mocks (ESM-safe) ----

const mockExecFileNoThrowSync = vi.hoisted(() => vi.fn());
const mockDetectClaudeCli = vi.hoisted(() => vi.fn());
const mockGetClaudeCliDiagnostic = vi.hoisted(() => vi.fn());
const mockGetClaudeCliSuggestions = vi.hoisted(() => vi.fn());
const mockFindSourceDir = vi.hoisted(() => vi.fn());
const mockCleanupStalePlugins = vi.hoisted(() => vi.fn());
const mockGetPluginScope = vi.hoisted(() => vi.fn());
const mockGetScopeArgs = vi.hoisted(() => vi.fn());
const mockEnablePluginsInSettings = vi.hoisted(() => vi.fn());

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

const mockOra = vi.hoisted(() => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  };
  return vi.fn(() => spinner);
});

// ---- vi.mock() declarations ----

vi.mock('../../../../../src/utils/fs-native.js', () => mockFs);

vi.mock('os', () => ({
  default: { homedir: () => '/mock-home' },
  homedir: () => '/mock-home',
}));

vi.mock('ora', () => ({ default: mockOra }));

vi.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get(_target, _prop) {
      const fn: any = passthrough;
      fn.bold = passthrough;
      return new Proxy(fn, handler);
    },
    apply(_target, _thisArg, args) {
      return args[0];
    },
  };
  const chalkProxy = new Proxy(passthrough, handler);
  return { default: chalkProxy };
});

vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

vi.mock('../../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  getClaudeCliDiagnostic: mockGetClaudeCliDiagnostic,
  getClaudeCliSuggestions: mockGetClaudeCliSuggestions,
}));

vi.mock('../../../../../src/cli/helpers/init/path-utils.js', () => ({
  findSourceDir: mockFindSourceDir,
}));

vi.mock('../../../../../src/utils/cleanup-stale-plugins.js', () => ({
  cleanupStalePlugins: mockCleanupStalePlugins,
}));

vi.mock('../../../../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: mockGetPluginScope,
  getScopeArgs: mockGetScopeArgs,
}));

vi.mock('../../../../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePluginsInSettings: mockEnablePluginsInSettings,
}));

// ---- import under test (AFTER mocks) ----

import { installAllPlugins } from '../../../../../src/cli/helpers/init/plugin-installer.js';
import type { PluginInstallOptions, PluginInstallResult } from '../../../../../src/cli/helpers/init/plugin-installer.js';

// ---- helpers ----

function spinner() {
  return mockOra();
}

/** Standard marketplace.json content */
function marketplaceJson(plugins: Array<{ name: string }> = [{ name: 'sw' }, { name: 'sw-github' }]) {
  return JSON.stringify({ plugins });
}

/** Make execFileNoThrowSync return success/fail for specific args */
function stubExec(
  stubs: Array<{
    /** Match when args[1] array starts with these values */
    match: string[];
    result: { success: boolean; stdout?: string; stderr?: string; error?: unknown };
  }>,
  fallback?: { success: boolean; stdout?: string; stderr?: string; error?: unknown }
) {
  mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
    for (const stub of stubs) {
      const matches = stub.match.every((m, i) => args[i] === m);
      if (matches) return stub.result;
    }
    return fallback ?? { success: true, stdout: '', stderr: '', exitCode: 0 };
  });
}

/** Setup mocks for a successful vskill-based plugin discovery flow */
function setupHappyPath(overrides?: {
  plugins?: Array<{ name: string }>;
  cleanupResult?: { removedCount: number; removedPlugins: string[] };
}) {
  const plugins = overrides?.plugins ?? [{ name: 'sw' }, { name: 'sw-github' }];
  const cleanup = overrides?.cleanupResult ?? { removedCount: 0, removedPlugins: [] };

  mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
  mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(marketplaceJson(plugins));
  mockCleanupStalePlugins.mockResolvedValue({ success: true, ...cleanup });
  mockGetPluginScope.mockReturnValue('user');
  mockGetScopeArgs.mockReturnValue([]);
  mockEnablePluginsInSettings.mockReturnValue(true);

  // Default exec stub: vskill add succeeds with scan output
  mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
    const argsStr = (args || []).join(' ');
    if (argsStr.includes('add') && argsStr.includes('--plugin')) {
      return {
        success: true,
        stdout: 'Score: 100/100  Verdict: PASS\nInstalled sw to 1 agent',
        stderr: '',
      };
    }
    return { success: true, stdout: '', stderr: '' };
  });
}

// ---- tests ----

describe('plugin-installer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ============================================================
  // installAllPlugins - Claude CLI not available
  // ============================================================
  describe('installAllPlugins - Claude CLI not available', () => {
    it('should return failure when Claude CLI is not available', async () => {
      mockDetectClaudeCli.mockReturnValue({
        available: false,
        commandExists: false,
        pluginCommandsWork: false,
        error: 'command_not_found',
      });
      mockGetClaudeCliDiagnostic.mockReturnValue('Claude CLI not found');
      mockGetClaudeCliSuggestions.mockReturnValue(['Install Claude CLI']);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result).toEqual({ success: false, successCount: 0, failCount: 0, failedPlugins: [] });
    });

    it('should show SSH diagnostic when command exists but verification fails', async () => {
      mockDetectClaudeCli.mockReturnValue({
        available: false,
        commandExists: true,
        commandPath: '/usr/local/bin/claude',
        exitCode: 1,
        error: 'version_check_failed',
      });
      mockGetClaudeCliDiagnostic.mockReturnValue('Version check failed');
      mockGetClaudeCliSuggestions.mockReturnValue(['Update Claude CLI']);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(mockGetClaudeCliDiagnostic).toHaveBeenCalled();
      expect(mockGetClaudeCliSuggestions).toHaveBeenCalled();
    });

    it('should show alternatives when error is command_not_found', async () => {
      mockDetectClaudeCli.mockReturnValue({
        available: false,
        commandExists: false,
        error: 'command_not_found',
      });
      mockGetClaudeCliDiagnostic.mockReturnValue('not found');
      mockGetClaudeCliSuggestions.mockReturnValue([]);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // installAllPlugins - marketplace.json not found
  // ============================================================
  describe('installAllPlugins - marketplace errors', () => {
    it('should handle missing marketplace.json', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      // marketplace list succeeds, marketplace add succeeds, but marketplace.json does not exist
      stubExec([], { success: true, stdout: 'specweave', stderr: '' });
      mockFs.existsSync.mockReturnValue(false);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });

    it('should handle empty plugins array in marketplace.json', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      stubExec([], { success: true, stdout: 'specweave', stderr: '' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ plugins: [] }));

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // installAllPlugins - Lazy mode (default)
  // ============================================================
  describe('installAllPlugins - lazy mode', () => {
    it('should install only core plugin in lazy mode', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(0);
      expect(result.marketplaceOnly).toBe(false);
    });

    it('should default to lazy mode (lazyMode=true)', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      // In lazy mode only core sw plugin is installed, not all marketplace plugins
      expect(result.successCount).toBe(1);
    });

    it('should handle core plugin already installed', async () => {
      setupHappyPath();
      // vskill add fails but stdout contains "already" -> treated as already installed
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          return { success: false, stdout: 'already installed', stderr: '' };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });

    it('should handle core plugin install failure in lazy mode', async () => {
      setupHappyPath();
      // vskill add fails with no "already" in output -> treated as failure
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          return { success: false, stdout: '', stderr: 'install error' };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toEqual(['sw']);
    });

    it('should enable plugins after successful lazy install', async () => {
      setupHappyPath();

      await installAllPlugins({ dirname: '/test' });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw'], 'specweave');
    });

    it('should handle enablePluginsInSettings returning false', async () => {
      setupHappyPath();
      mockEnablePluginsInSettings.mockReturnValue(false);

      const result = await installAllPlugins({ dirname: '/test' });

      // Still succeeds overall even if enabling fails
      expect(result.success).toBe(true);
    });

    it('should handle "already" in stderr for already-installed plugins', async () => {
      setupHappyPath();
      // vskill add fails but stderr contains "already" -> treated as already installed
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          return { success: false, stdout: '', stderr: 'already installed' };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });
  });

  // ============================================================
  // installAllPlugins - Full mode (lazyMode=false)
  // ============================================================
  describe('installAllPlugins - full mode', () => {
    it('should install all plugins in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(0);
      expect(result.marketplaceOnly).toBe(false);
    });

    it('should report partial failures in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });
      let vskillCallCount = 0;
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          vskillCallCount++;
          if (vskillCallCount === 1) {
            return { success: true, stdout: 'Installed sw-github to 1 agent', stderr: '' };
          }
          return { success: false, stdout: '', stderr: 'timeout' };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toContain('sw-jira');
    });

    it('should install all plugins via vskill in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });
      const installedPlugins: string[] = [];
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          const pluginIdx = args.indexOf('--plugin');
          if (pluginIdx !== -1 && args[pluginIdx + 1]) {
            installedPlugins.push(args[pluginIdx + 1]);
          }
          return { success: true, stdout: 'Installed plugin to 1 agent', stderr: '' };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      await installAllPlugins({ dirname: '/test', lazyMode: false });

      // Both plugins should have been installed via vskill
      expect(installedPlugins).toContain('sw-github');
      expect(installedPlugins).toContain('sw-jira');
    });

    it('should enable plugins after full mode installation', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }] });

      await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(mockEnablePluginsInSettings).toHaveBeenCalled();
    });

    it('should handle enablePluginsInSettings returning false in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }] });
      mockEnablePluginsInSettings.mockReturnValue(false);

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // refreshMarketplace / ensureOfficialMarketplace / enableMarketplaceAutoUpdate
  // REMOVED: These functions were replaced by vskill-based installation (v1.0.272)
  // See plugin-installer-vskill.test.ts for TC-018/TC-019 tests
  // ============================================================



  // ============================================================
  // Stale plugin cleanup
  // ============================================================
  describe('stale plugin cleanup', () => {
    it('should clean up stale plugins when found', async () => {
      setupHappyPath({
        cleanupResult: { removedCount: 2, removedPlugins: ['sw-tooling@specweave', 'sw-old@specweave'] }
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(mockCleanupStalePlugins).toHaveBeenCalled();
    });

    it('should continue when no stale plugins found', async () => {
      setupHappyPath({ cleanupResult: { removedCount: 0, removedPlugins: [] } });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // installPluginsWithRetry via vskill (full mode)
  // ============================================================
  describe('installPluginsWithRetry via vskill (full mode)', () => {
    it('should install plugin via vskill add in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }] });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // Verify vskill add was called
      const vskillCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (call: any[]) => {
          const args = (call[1] || []).join(' ');
          return args.includes('add') && args.includes('--plugin');
        }
      );
      expect(vskillCalls.length).toBeGreaterThan(0);
    });

    it('should handle vskill add failure in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }] });
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          return { success: false, stdout: '', stderr: 'plugin not found' };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toContain('sw-github');
    });

    it('should install multiple plugins sequentially via vskill', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
    });
  });

  // ============================================================
  // Error handling in main try/catch
  // ============================================================
  describe('error handling', () => {
    it('should handle ENOENT errors with appropriate messaging', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockExecFileNoThrowSync.mockImplementation(() => {
        throw new Error('ENOENT: command not found');
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
    });

    it('should handle EACCES errors', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockExecFileNoThrowSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });

    it('should handle ECONNREFUSED errors', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockExecFileNoThrowSync.mockImplementation(() => {
        throw new Error('ECONNREFUSED: network error');
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });

    it('should handle generic errors', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockExecFileNoThrowSync.mockImplementation(() => {
        throw new Error('unknown error');
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });

    it('should show error details when DEBUG env is set', async () => {
      const origDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockExecFileNoThrowSync.mockImplementation(() => {
        throw new Error('some obscure error');
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);

      process.env.DEBUG = origDebug;
    });

    it('should handle non-Error thrown values', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockExecFileNoThrowSync.mockImplementation(() => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // getPluginVersion / manuallyInstallSpecweavePlugin / copyDirRecursive
  // REMOVED: These functions were replaced by vskill-based installation (v1.0.272)
  // ============================================================


  // ============================================================
  // Plugin scope handling
  // REMOVED: vskill does not use Claude's --scope args (v1.0.272)
  // Scoping is handled by vskill's lockfile and agent detection
  // ============================================================

  // ============================================================
  // forceRefresh option (passed through options but used contextually)
  // ============================================================
  describe('options handling', () => {
    it('should accept forceRefresh option without error', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test', forceRefresh: true });

      expect(result.success).toBe(true);
    });

    it('should accept all option combinations', async () => {
      setupHappyPath();

      const result = await installAllPlugins({
        dirname: '/test',
        forceRefresh: true,
        lazyMode: false,
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('edge cases', () => {
    it('should handle marketplace.json with no plugins key', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await installAllPlugins({ dirname: '/test' });

      // Empty plugins array from `marketplace.plugins || []`
      expect(result.success).toBe(false);
    });

    it('should handle vskill returning scan CONCERNS verdict', async () => {
      setupHappyPath();
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          return {
            success: true,
            stdout: 'Score: 70/100  Verdict: CONCERNS\n--force: installing despite CONCERNS.\nInstalled sw to 1 agent',
            stderr: '',
          };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const result = await installAllPlugins({ dirname: '/test' });

      // Still succeeds because --force was used
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });

    it('should handle vskill add returning no scan output', async () => {
      setupHappyPath();
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add') && argsStr.includes('--plugin')) {
          return { success: true, stdout: 'Installed sw to 1 agent', stderr: '' };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });
  });
});
