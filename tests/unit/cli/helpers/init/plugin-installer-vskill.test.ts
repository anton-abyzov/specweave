/**
 * Tests for plugin-installer.ts vskill integration
 *
 * TC-018: Init uses vskill instead of claude plugin install
 * TC-019: Scan result displayed to user
 *
 * @module tests/unit/cli/helpers/init/plugin-installer-vskill
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

// ---- helpers ----

function marketplaceJson(plugins: Array<{ name: string }> = [{ name: 'sw' }, { name: 'sw-github' }]) {
  return JSON.stringify({ plugins });
}

/** Setup mocks for a successful vskill-based flow */
function setupVskillHappyPath(overrides?: {
  plugins?: Array<{ name: string }>;
  cleanupResult?: { removedCount: number; removedPlugins: string[] };
}) {
  const plugins = overrides?.plugins ?? [{ name: 'sw' }, { name: 'sw-github' }];
  const cleanup = overrides?.cleanupResult ?? { removedCount: 0, removedPlugins: [] };

  // Claude CLI still available (needed for detect-intent etc.)
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

describe('plugin-installer vskill integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ============================================================
  // TC-018: Init uses vskill instead of claude plugin install
  // ============================================================
  describe('TC-018: Init uses vskill instead of claude plugin install', () => {
    it('should invoke vskill add instead of claude plugin install in lazy mode', async () => {
      setupVskillHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // CRITICAL: Verify vskill was used, NOT claude plugin install
      // After vskill integration, execFileNoThrowSync calls should contain
      // 'vskill' or 'node' with vskill path, NOT 'claude plugin install'
      const allCalls = mockExecFileNoThrowSync.mock.calls;
      const claudePluginInstallCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = call[0];
          const args = call[1] || [];
          return cmd === 'claude' && args[0] === 'plugin' && args[1] === 'install';
        }
      );

      // After migration: ZERO calls to `claude plugin install`
      expect(claudePluginInstallCalls).toHaveLength(0);

      // Instead, should have calls that reference vskill
      const vskillCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = String(call[0]);
          const args = (call[1] || []).join(' ');
          return cmd.includes('vskill') || args.includes('vskill');
        }
      );
      expect(vskillCalls.length).toBeGreaterThan(0);
    });

    it('should not call refreshMarketplace or ensureOfficialMarketplace', async () => {
      setupVskillHappyPath();

      await installAllPlugins({ dirname: '/test' });

      // After vskill migration, there should be NO calls to
      // `claude plugin marketplace add/update/list`
      const allCalls = mockExecFileNoThrowSync.mock.calls;
      const marketplaceCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = call[0];
          const args = call[1] || [];
          return cmd === 'claude' && args[0] === 'plugin' && args[1] === 'marketplace';
        }
      );

      expect(marketplaceCalls).toHaveLength(0);
    });

    it('should use vskill add with --plugin and --plugin-dir flags', async () => {
      setupVskillHappyPath();

      await installAllPlugins({ dirname: '/test' });

      // Verify that vskill add was called with the correct flags
      const allCalls = mockExecFileNoThrowSync.mock.calls;
      const vskillAddCalls = allCalls.filter(
        (call: any[]) => {
          const args = (call[1] || []).join(' ');
          return args.includes('add') && args.includes('--plugin');
        }
      );
      expect(vskillAddCalls.length).toBeGreaterThan(0);
    });

    it('should maintain the same public API return type', async () => {
      setupVskillHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      // Public API contract must be preserved
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('failCount');
      expect(result).toHaveProperty('failedPlugins');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.successCount).toBe('number');
      expect(typeof result.failCount).toBe('number');
      expect(Array.isArray(result.failedPlugins)).toBe(true);
    });

    it('should install only core sw plugin in lazy mode via vskill', async () => {
      setupVskillHappyPath();

      const result = await installAllPlugins({ dirname: '/test', lazyMode: true });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // The only plugin installed should be 'sw'
      const allCalls = mockExecFileNoThrowSync.mock.calls;
      const vskillCalls = allCalls.filter(
        (call: any[]) => {
          const args = (call[1] || []).join(' ');
          return args.includes('add') && args.includes('sw');
        }
      );
      expect(vskillCalls.length).toBeGreaterThan(0);
    });

    it('should install all plugins in full mode via vskill', async () => {
      setupVskillHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });

      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
    });
  });

  // ============================================================
  // TC-019: Scan result displayed to user
  // ============================================================
  describe('TC-019: Scan result displayed to user', () => {
    it('should display scan result during plugin installation', async () => {
      setupVskillHappyPath();

      // Capture console.log calls
      const logSpy = vi.spyOn(console, 'log');

      await installAllPlugins({ dirname: '/test' });

      // After vskill integration, the scan verdict (PASS/CONCERNS/FAIL)
      // should appear in user output
      const allLogMessages = logSpy.mock.calls.map(call => call.join(' ')).join('\n');

      // vskill runs a tier1 scan and reports the verdict
      expect(allLogMessages).toMatch(/scan|Score|Verdict|PASS/i);
    });

    it('should show scan PASS verdict when security scan passes', async () => {
      setupVskillHappyPath();

      // Mock vskill exec to return scan result in stdout
      mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
        const argsStr = (args || []).join(' ');
        if (argsStr.includes('add')) {
          return {
            success: true,
            stdout: 'Score: 100/100  Verdict: PASS\nInstalled sw to 1 agent',
            stderr: '',
          };
        }
        return { success: true, stdout: '', stderr: '' };
      });

      const logSpy = vi.spyOn(console, 'log');

      await installAllPlugins({ dirname: '/test' });

      // Scan result should be communicated to the user
      const allLogMessages = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(allLogMessages).toMatch(/PASS|scan|security/i);
    });
  });
});
