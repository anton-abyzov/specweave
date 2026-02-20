/**
 * Tests for plugin-installer.ts inline copier integration
 *
 * TC-018: Init uses inline copier instead of claude plugin install
 * TC-019: Plugin installation reports results to user
 *
 * @module tests/unit/cli/helpers/init/plugin-installer-vskill
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

describe('plugin-installer inline copier integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ============================================================
  // TC-018: Init uses inline copier instead of claude plugin install
  // ============================================================
  describe('TC-018: Init uses inline copier instead of claude plugin install', () => {
    it('should invoke copyPlugin instead of vskill or claude plugin install', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // CRITICAL: Verify copyPlugin was called
      expect(mockCopyPlugin).toHaveBeenCalled();
      expect(mockCopyPlugin.mock.calls[0][0]).toBe('sw');
    });

    it('should maintain the same public API return type', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('failCount');
      expect(result).toHaveProperty('failedPlugins');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.successCount).toBe('number');
      expect(typeof result.failCount).toBe('number');
      expect(Array.isArray(result.failedPlugins)).toBe(true);
    });

    it('should install only core sw plugin in lazy mode', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test', lazyMode: true });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // Only 'sw' should be installed
      const calledPlugins = mockCopyPlugin.mock.calls.map((c: any[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).not.toContain('sw-github');
    });

    it('should install all plugins in full mode', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }, { name: 'sw-github' }] });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);

      const calledPlugins = mockCopyPlugin.mock.calls.map((c: any[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).toContain('sw-github');
    });

    it('should handle copyPlugin failure gracefully', async () => {
      setupHappyPath();
      mockCopyPlugin.mockReturnValue({ success: false, sha: '', error: 'Source dir not found' });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toContain('sw');
    });
  });

  // ============================================================
  // TC-019: Plugin installation reports results
  // ============================================================
  describe('TC-019: Plugin installation reports results', () => {
    it('should report successful installation to user', async () => {
      setupHappyPath();

      const logSpy = vi.spyOn(console, 'log');

      await installAllPlugins({ dirname: '/test' });

      const allLogMessages = logSpy.mock.calls.map(call => call.join(' ')).join('\n');

      // Should report installation success
      expect(allLogMessages).toMatch(/install/i);
    });

    it('should enable plugins in Claude settings after install', async () => {
      setupHappyPath();

      await installAllPlugins({ dirname: '/test' });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw'], 'specweave');
    });

    it('should handle Claude CLI not available', async () => {
      mockDetectClaudeCli.mockReturnValue({ available: false, error: 'command_not_found' });
      mockGetClaudeCliDiagnostic.mockReturnValue('Claude CLI not found');
      mockGetClaudeCliSuggestions.mockReturnValue(['Install Claude Code']);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(mockCopyPlugin).not.toHaveBeenCalled();
    });
  });
});
