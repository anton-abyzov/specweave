/**
 * Tests for plugin-installer.ts
 *
 * Covers: installAllPlugins, installLazyMode, installPluginsFullMode
 * (inline copier-based plugin installation via plugin-copier.ts)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- hoisted mocks (ESM-safe) ----

const mockCopyPlugin = vi.hoisted(() => vi.fn());
const mockFindSpecweaveRoot = vi.hoisted(() => vi.fn());
const mockDetectClaudeCli = vi.hoisted(() => vi.fn());
const mockGetClaudeCliDiagnostic = vi.hoisted(() => vi.fn());
const mockGetClaudeCliSuggestions = vi.hoisted(() => vi.fn());
const mockFindSourceDir = vi.hoisted(() => vi.fn());
const mockCleanupStalePlugins = vi.hoisted(() => vi.fn());
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

vi.mock('../../../../../src/utils/plugin-copier.js', () => ({
  copyPlugin: mockCopyPlugin,
  findSpecweaveRoot: mockFindSpecweaveRoot,
}));

vi.mock('../../../../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/src/cli/helpers/init',
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

vi.mock('../../../../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePluginsInSettings: mockEnablePluginsInSettings,
}));

// ---- import under test (AFTER mocks) ----

import { installAllPlugins } from '../../../../../src/cli/helpers/init/plugin-installer.js';

// ---- helpers ----

/** Standard marketplace.json content */
function marketplaceJson(plugins: Array<{ name: string }> = [{ name: 'sw' }, { name: 'sw-github' }]) {
  return JSON.stringify({ plugins });
}

/** Setup mocks for a successful inline copier flow */
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
  mockEnablePluginsInSettings.mockReturnValue(true);

  // Inline copier: findSpecweaveRoot returns valid root
  mockFindSpecweaveRoot.mockReturnValue('/mock/specweave');

  // Default copyPlugin: succeeds
  mockCopyPlugin.mockReturnValue({
    success: true,
    sha: 'abc123def456',
    targetDir: '/mock-home/.claude/commands/sw',
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
      mockFs.existsSync.mockReturnValue(false);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });

    it('should handle empty plugins array in marketplace.json', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
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
      // copyPlugin returns skipped=true for already-installed plugin
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });

    it('should handle core plugin install failure in lazy mode', async () => {
      setupHappyPath();
      mockCopyPlugin.mockReturnValue({ success: false, sha: '', error: 'Source dir not found' });

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
      // copyPlugin returns skipped
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

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
      let callCount = 0;
      mockCopyPlugin.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { success: true, sha: 'abc123' };
        }
        return { success: false, sha: '', error: 'timeout' };
      });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toContain('sw-jira');
    });

    it('should install all plugins via copyPlugin in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });

      await installAllPlugins({ dirname: '/test', lazyMode: false });

      // Both plugins should have been installed via copyPlugin
      const calledPlugins = mockCopyPlugin.mock.calls.map((c: any[]) => c[0]);
      expect(calledPlugins).toContain('sw-github');
      expect(calledPlugins).toContain('sw-jira');
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
  // installPluginsFullMode via copyPlugin
  // ============================================================
  describe('installPluginsFullMode via copyPlugin (full mode)', () => {
    it('should install plugin via copyPlugin in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }] });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // Verify copyPlugin was called
      expect(mockCopyPlugin).toHaveBeenCalled();
    });

    it('should handle copyPlugin failure in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }] });
      mockCopyPlugin.mockReturnValue({ success: false, sha: '', error: 'plugin not found' });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toContain('sw-github');
    });

    it('should install multiple plugins sequentially via copyPlugin', async () => {
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
    it('should handle marketplace.json with no plugins key', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await installAllPlugins({ dirname: '/test' });

      // Empty plugins array from `marketplace.plugins || []`
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // forceRefresh option
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
    it('should handle findSpecweaveRoot returning null', async () => {
      setupHappyPath();
      mockFindSpecweaveRoot.mockReturnValue(null);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(mockCopyPlugin).not.toHaveBeenCalled();
    });

    it('should handle copyPlugin returning skipped=true', async () => {
      setupHappyPath();
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });
  });
});
