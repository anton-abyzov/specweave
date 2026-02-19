/**
 * Integration tests for the full vskill plugin pipeline
 *
 * Tests the end-to-end flow across multiple components:
 * - TC-026: refresh-plugins end-to-end with vskill
 * - TC-027: Init with vskill end-to-end
 * - TC-028: Migration end-to-end
 *
 * These tests exercise the integration between:
 * - refresh-plugins command (src/cli/commands/refresh-plugins.ts)
 * - plugin-installer (src/cli/helpers/init/plugin-installer.ts)
 * - migrate-to-vskill (src/cli/commands/migrate-to-vskill.ts)
 *
 * All external I/O (filesystem, child_process) is mocked via vi.mock.
 *
 * @module tests/integration/vskill-plugin-pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — declared before vi.mock() calls (ESM requirement)
// ---------------------------------------------------------------------------

const {
  mockExecFileNoThrowSync,
  mockExistsSync,
  mockReadFileSync,
  mockReaddirSync,
  mockStatSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockCpSync,
  mockChmodSync,
  mockRmSync,
  mockHomedir,
} = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockReadFileSync: vi.fn().mockReturnValue(''),
  mockReaddirSync: vi.fn().mockReturnValue([]),
  mockStatSync: vi.fn().mockReturnValue({ isDirectory: () => true }),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockCpSync: vi.fn(),
  mockChmodSync: vi.fn(),
  mockRmSync: vi.fn(),
  mockHomedir: vi.fn().mockReturnValue('/home/testuser'),
}));

const mockDetectClaudeCli = vi.hoisted(() => vi.fn());
const mockGetClaudeCliDiagnostic = vi.hoisted(() => vi.fn());
const mockGetClaudeCliSuggestions = vi.hoisted(() => vi.fn());
const mockFindSourceDir = vi.hoisted(() => vi.fn());
const mockCleanupStalePlugins = vi.hoisted(() => vi.fn());
const mockGetPluginScope = vi.hoisted(() => vi.fn());
const mockGetScopeArgs = vi.hoisted(() => vi.fn());
const mockEnablePluginsInSettings = vi.hoisted(() => vi.fn());

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

// ---------------------------------------------------------------------------
// vi.mock() declarations
// ---------------------------------------------------------------------------

// Mock execFileNoThrowSync (used by refresh-plugins and plugin-installer)
vi.mock('../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

// Mock ESM helpers (provides __dirname equivalent for refresh-plugins)
vi.mock('../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/src/cli/commands',
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock chalk - identity proxy (strip formatting for easy assertions)
vi.mock('chalk', () => {
  const identity = (s: unknown) => String(s);
  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(identity, handler);
      if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') return undefined;
      return new Proxy(identity, handler);
    },
    apply(_target, _thisArg, args) {
      return String(args[0]);
    },
  };
  return { default: new Proxy(identity, handler) };
});

// Mock fs (for refresh-plugins which uses `import * as fs from 'fs'`)
vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
      readdirSync: mockReaddirSync,
      statSync: mockStatSync,
      writeFileSync: mockWriteFileSync,
      mkdirSync: mockMkdirSync,
      cpSync: mockCpSync,
      chmodSync: mockChmodSync,
      rmSync: mockRmSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    cpSync: mockCpSync,
    chmodSync: mockChmodSync,
    rmSync: mockRmSync,
  };
});

// Mock node:fs (for migrate-to-vskill which uses `import from 'node:fs'`)
vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  statSync: mockStatSync,
  rmSync: mockRmSync,
  default: {
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    statSync: mockStatSync,
    rmSync: mockRmSync,
  },
}));

// Mock node:os (for migrate-to-vskill)
vi.mock('node:os', () => ({
  homedir: mockHomedir,
  default: { homedir: mockHomedir },
}));

// Mock node:crypto (pass through actual crypto for hash computation)
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return { ...actual, default: actual };
});

// Mock fs-native (for plugin-installer)
vi.mock('../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
  copyFileSync: vi.fn(),
}));

// Mock ora (for plugin-installer)
vi.mock('ora', () => ({ default: mockOra }));

// Mock os (for plugin-installer)
vi.mock('os', () => ({
  default: { homedir: mockHomedir },
  homedir: mockHomedir,
}));

// Mock Claude CLI detector (for plugin-installer)
vi.mock('../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  getClaudeCliDiagnostic: mockGetClaudeCliDiagnostic,
  getClaudeCliSuggestions: mockGetClaudeCliSuggestions,
}));

// Mock path-utils (for plugin-installer)
vi.mock('../../src/cli/helpers/init/path-utils.js', () => ({
  findSourceDir: mockFindSourceDir,
}));

// Mock cleanup-stale-plugins (for plugin-installer)
vi.mock('../../src/utils/cleanup-stale-plugins.js', () => ({
  cleanupStalePlugins: mockCleanupStalePlugins,
}));

// Mock plugin-scope (for plugin-installer)
vi.mock('../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: mockGetPluginScope,
  getScopeArgs: mockGetScopeArgs,
}));

// Mock claude-plugin-enabler (for plugin-installer)
vi.mock('../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePluginsInSettings: mockEnablePluginsInSettings,
}));

// Mock vskill-resolver (for plugin-installer)
vi.mock('../../src/utils/vskill-resolver.js', () => ({
  resolveVskillPath: () => '/mock/vskill/dist/cli.js',
  resolveSpecweaveDir: () => '/mock/specweave',
}));

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { refreshPluginsCommand } from '../../src/cli/commands/refresh-plugins.js';
import { installAllPlugins } from '../../src/cli/helpers/init/plugin-installer.js';
import { migrateToVskill, shouldOfferMigration } from '../../src/cli/commands/migrate-to-vskill.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function execOk(stdout = '', stderr = ''): { stdout: string; stderr: string; exitCode: number; success: boolean } {
  return { stdout, stderr, exitCode: 0, success: true };
}

/** Sample marketplace.json content */
const MARKETPLACE_JSON = JSON.stringify({
  name: 'specweave',
  version: '1.0.0',
  plugins: [
    { name: 'sw', source: './plugins/specweave', version: '1.0.272', description: 'Core framework' },
    { name: 'sw-frontend', source: './plugins/specweave-frontend', version: '1.0.50', description: 'Frontend' },
    { name: 'sw-github', source: './plugins/specweave-github', version: '1.0.30', description: 'GitHub sync' },
  ],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('vskill plugin pipeline integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockExecFileNoThrowSync.mockReturnValue(execOk('installed successfully'));
    mockReaddirSync.mockReturnValue([]);
    mockHomedir.mockReturnValue('/home/testuser');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // =========================================================================
  // TC-026: refresh-plugins end-to-end with vskill
  // =========================================================================
  describe('TC-026: refresh-plugins end-to-end with vskill', () => {
    it('should invoke vskill add for plugins listed in marketplace.json', async () => {
      // Given: a configured project with marketplace.json
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        if (p.includes('vskill.lock')) return false;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refreshPluginsCommand runs with --all
      await refreshPluginsCommand({ all: true });

      // Then: vskill add is invoked for each plugin
      const vskillCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const args = c[1] as string[];
          return args?.some((a: string) => a === '--plugin');
        }
      );

      const pluginNames = vskillCalls.map((c: unknown[]) => {
        const args = c[1] as string[];
        const idx = args.indexOf('--plugin');
        return idx >= 0 ? args[idx + 1] : null;
      });

      expect(pluginNames).toContain('sw');
      expect(pluginNames).toContain('sw-frontend');
      expect(pluginNames).toContain('sw-github');
    });

    it('should create/update the vskill.lock lockfile after refresh', async () => {
      // Given: marketplace.json exists, no prior lockfile
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return true;
        if (typeof p === 'string' && p.includes('vskill.lock')) return false;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refreshPluginsCommand runs
      await refreshPluginsCommand({ all: true });

      // Then: lockfile is written
      const lockfileWrites = mockWriteFileSync.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('vskill.lock')
      );
      expect(lockfileWrites.length).toBeGreaterThanOrEqual(1);

      // Parse the written lockfile
      const lastWrite = lockfileWrites[lockfileWrites.length - 1];
      const lockContent = JSON.parse(lastWrite[1] as string);
      expect(lockContent.version).toBe(1);
      expect(lockContent.skills).toBeDefined();
      expect(lockContent.updatedAt).toBeDefined();
    });

    it('should skip unchanged plugins based on hash comparison', async () => {
      // Given: existing lockfile with hashes matching current plugin content
      // (empty readdirSync => hash is always the same for "empty" dirs)
      const emptyHash = 'e3b0c44298fc'; // SHA-256 of empty input, first 12 chars

      const existingLockfile = JSON.stringify({
        version: 1,
        agents: ['claude'],
        skills: {
          'sw': { version: '1.0.272', sha: emptyHash, tier: 'SCANNED', installedAt: '2026-02-01T00:00:00Z', source: 'local:specweave' },
          'sw-frontend': { version: '1.0.50', sha: emptyHash, tier: 'SCANNED', installedAt: '2026-02-01T00:00:00Z', source: 'local:specweave' },
          'sw-github': { version: '1.0.30', sha: emptyHash, tier: 'SCANNED', installedAt: '2026-02-01T00:00:00Z', source: 'local:specweave' },
        },
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return true;
        if (typeof p === 'string' && p.includes('vskill.lock')) return true;
        if (typeof p === 'string' && p.includes('plugins/specweave')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        if (typeof p === 'string' && p.includes('vskill.lock')) return existingLockfile;
        return '';
      });

      mockReaddirSync.mockReturnValue([]);

      // When: refreshPluginsCommand runs with --all
      await refreshPluginsCommand({ all: true });

      // Then: NO vskill add calls (all plugins unchanged)
      const vskillAddCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const args = c[1] as string[];
          return args?.some((a: string) => a === '--plugin');
        }
      );
      expect(vskillAddCalls.length).toBe(0);
    });

    it('should NOT invoke claude plugin install (legacy path)', async () => {
      // Given: configured project
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refresh runs
      await refreshPluginsCommand({ all: true });

      // Then: no calls to claude plugin install
      const claudePluginInstallCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const cmd = c[0] as string;
          const args = (c[1] || []) as string[];
          return cmd === 'claude' && args[0] === 'plugin' && args[1] === 'install';
        }
      );
      expect(claudePluginInstallCalls).toHaveLength(0);
    });
  });

  // =========================================================================
  // TC-027: Init with vskill end-to-end
  // =========================================================================
  describe('TC-027: Init with vskill end-to-end', () => {
    /** Setup mocks for a working init-via-vskill flow */
    function setupInitMocks(plugins: Array<{ name: string }> = [{ name: 'sw' }, { name: 'sw-github' }]) {
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ plugins }));
      mockCleanupStalePlugins.mockResolvedValue({ success: true, removedCount: 0, removedPlugins: [] });
      mockGetPluginScope.mockReturnValue('user');
      mockGetScopeArgs.mockReturnValue([]);
      mockEnablePluginsInSettings.mockReturnValue(true);

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

    it('should call vskill add (not claude plugin install) during installAllPlugins', async () => {
      setupInitMocks();

      // When: installAllPlugins runs
      const result = await installAllPlugins({ dirname: '/test' });

      // Then: success
      expect(result.success).toBe(true);
      expect(result.successCount).toBeGreaterThanOrEqual(1);

      // Verify: vskill was called, NOT claude plugin install
      const allCalls = mockExecFileNoThrowSync.mock.calls;

      // No calls to claude plugin install
      const claudePluginInstallCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = call[0];
          const args = call[1] || [];
          return cmd === 'claude' && args[0] === 'plugin' && args[1] === 'install';
        }
      );
      expect(claudePluginInstallCalls).toHaveLength(0);

      // vskill add calls should be present
      const vskillCalls = allCalls.filter(
        (call: any[]) => {
          const args = (call[1] || []).join(' ');
          return args.includes('add') && args.includes('--plugin');
        }
      );
      expect(vskillCalls.length).toBeGreaterThan(0);
    });

    it('should not register or invoke marketplace commands', async () => {
      setupInitMocks();

      // When: init runs
      await installAllPlugins({ dirname: '/test' });

      // Then: no marketplace registration calls
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

    it('should install only the core sw plugin in lazy mode (default)', async () => {
      setupInitMocks([{ name: 'sw' }, { name: 'sw-frontend' }, { name: 'sw-github' }]);

      // When: installAllPlugins runs in lazy mode
      const result = await installAllPlugins({ dirname: '/test', lazyMode: true });

      // Then: only 1 plugin installed (sw)
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // Verify: only sw plugin was installed via vskill
      const vskillCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (call: any[]) => {
          const args = (call[1] || []).join(' ');
          return args.includes('add') && args.includes('--plugin');
        }
      );

      const installedPluginNames = vskillCalls.map((call: any[]) => {
        const args = call[1] || [];
        const idx = args.indexOf('--plugin');
        return idx >= 0 ? args[idx + 1] : null;
      });

      expect(installedPluginNames).toContain('sw');
      expect(installedPluginNames).not.toContain('sw-frontend');
      expect(installedPluginNames).not.toContain('sw-github');
    });

    it('should install all plugins when lazyMode is false', async () => {
      setupInitMocks([{ name: 'sw' }, { name: 'sw-frontend' }, { name: 'sw-github' }]);

      // When: installAllPlugins runs in full mode
      const result = await installAllPlugins({ dirname: '/test', lazyMode: false });

      // Then: all plugins installed
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
    });

    it('should display scan results to user during installation', async () => {
      setupInitMocks();
      const logSpy = vi.spyOn(console, 'log');

      // When: init runs
      await installAllPlugins({ dirname: '/test' });

      // Then: scan verdict is visible in output
      const allLogMessages = logSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(allLogMessages).toMatch(/scan|Score|Verdict|PASS/i);
    });

    it('should preserve the public API return type contract', async () => {
      setupInitMocks();

      // When
      const result = await installAllPlugins({ dirname: '/test' });

      // Then: return type matches PluginInstallResult
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('failCount');
      expect(result).toHaveProperty('failedPlugins');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.successCount).toBe('number');
      expect(typeof result.failCount).toBe('number');
      expect(Array.isArray(result.failedPlugins)).toBe(true);
    });
  });

  // =========================================================================
  // TC-028: Migration end-to-end
  // =========================================================================
  describe('TC-028: Migration end-to-end', () => {
    it('should create a lockfile with entries for all discovered marketplace plugins', () => {
      // Given: marketplace-installed plugins at ~/.claude/plugins/cache/specweave/
      const pluginDirs = ['sw', 'sw-frontend', 'sw-backend', 'sw-testing', 'sw-github'];

      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (pluginDirs.some(d => p.endsWith(`/cache/specweave/${d}`))) return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      mockReaddirSync.mockImplementation((p: string, _opts?: unknown) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return pluginDirs.map(name => ({
            name,
            isDirectory: () => true,
            isFile: () => false,
          }));
        }
        // Each plugin directory contains some files
        if (pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`))) {
          return [
            { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
            { name: 'hooks.json', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('SKILL.md')) return '# Skill content';
        if (typeof p === 'string' && p.endsWith('hooks.json')) return '{"hooks":[]}';
        return '';
      });

      mockStatSync.mockImplementation((p: string) => ({
        isDirectory: () => pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
        isFile: () => !pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
      }));

      // When: migrateToVskill() runs
      const result = migrateToVskill();

      // Then: lockfile is created with entries for all 5 plugins
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(5);
      expect(result.plugins).toHaveLength(5);

      // Verify lockfile was written
      expect(mockWriteFileSync).toHaveBeenCalled();
      const writeCall = mockWriteFileSync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).endsWith('vskill.lock')
      );
      expect(writeCall).toBeDefined();

      // Parse lockfile content
      const lockContent = JSON.parse(writeCall![1] as string);
      expect(lockContent.version).toBe(1);
      expect(Object.keys(lockContent.skills)).toHaveLength(5);

      // Each plugin has required fields
      for (const name of pluginDirs) {
        const entry = lockContent.skills[name];
        expect(entry).toBeDefined();
        expect(entry.sha).toBeTruthy();
        expect(entry.sha).toMatch(/^[a-f0-9]{64}$/); // SHA-256 full hex
        expect(entry.marketplace).toBe('specweave');
        expect(entry.pluginDir).toBe(true);
        expect(entry.installedPath).toContain(`/cache/specweave/${name}`);
      }
    });

    it('should preserve original plugin files (non-destructive migration)', () => {
      // Given: marketplace-installed plugins
      const pluginDirs = ['sw', 'sw-frontend'];

      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (pluginDirs.some(d => p.endsWith(`/cache/specweave/${d}`))) return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return pluginDirs.map(name => ({
            name,
            isDirectory: () => true,
            isFile: () => false,
          }));
        }
        if (pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`))) {
          return [
            { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });

      mockReadFileSync.mockReturnValue('# content');
      mockStatSync.mockImplementation((p: string) => ({
        isDirectory: () => pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
        isFile: () => !pluginDirs.some(d => typeof p === 'string' && p.endsWith(`/cache/specweave/${d}`)),
      }));

      // When: migration runs
      migrateToVskill();

      // Then: no files are deleted
      expect(mockRmSync).not.toHaveBeenCalled();

      // Only vskill.lock is written, not any plugin files
      const writeCalls = mockWriteFileSync.mock.calls;
      for (const call of writeCalls) {
        const filePath = call[0] as string;
        expect(filePath).not.toContain('/cache/specweave/sw/');
        expect(filePath).not.toContain('/cache/specweave/sw-frontend/');
      }
    });

    it('should correctly detect when migration is needed', () => {
      // Given: marketplace plugins exist but no vskill.lock
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return [
            { name: 'sw', isDirectory: () => true, isFile: () => false },
            { name: 'sw-frontend', isDirectory: () => true, isFile: () => false },
          ];
        }
        return [];
      });

      // When: shouldOfferMigration() is called
      const shouldMigrate = shouldOfferMigration();

      // Then: returns true
      expect(shouldMigrate).toBe(true);
    });

    it('should skip migration when vskill.lock already exists', () => {
      // Given: vskill.lock already exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return true;
        return false;
      });

      // When: shouldOfferMigration() is called
      const shouldMigrate = shouldOfferMigration();

      // Then: returns false (already migrated)
      expect(shouldMigrate).toBe(false);
    });

    it('should handle empty cache directory gracefully', () => {
      // Given: cache directory exists but is empty
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });
      mockReaddirSync.mockReturnValue([]);

      // When: migration runs
      const result = migrateToVskill();

      // Then: succeeds with 0 migrated
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
    });

    it('should not write lockfile in dry-run mode', () => {
      // Given: plugins exist
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('/cache/specweave/sw')) return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('/cache/specweave')) {
          return [{ name: 'sw', isDirectory: () => true, isFile: () => false }];
        }
        if (typeof p === 'string' && p.endsWith('/cache/specweave/sw')) {
          return [{ name: 'SKILL.md', isDirectory: () => false, isFile: () => true }];
        }
        return [];
      });

      mockReadFileSync.mockReturnValue('# content');
      mockStatSync.mockReturnValue({ isDirectory: () => true, isFile: () => false });

      // When: migration runs with dryRun
      const result = migrateToVskill({ dryRun: true });

      // Then: no writes but result still correct
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Cross-component integration: pipeline coherence
  // =========================================================================
  describe('Pipeline coherence', () => {
    it('all three paths (refresh, init, migrate) avoid claude plugin install', async () => {
      // Setup for refresh
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      await refreshPluginsCommand({ all: true });

      // Setup for init
      mockDetectClaudeCli.mockReturnValue({ available: true, commandExists: true, pluginCommandsWork: true });
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ plugins: [{ name: 'sw' }] }));
      mockCleanupStalePlugins.mockResolvedValue({ success: true, removedCount: 0, removedPlugins: [] });
      mockGetPluginScope.mockReturnValue('user');
      mockGetScopeArgs.mockReturnValue([]);
      mockEnablePluginsInSettings.mockReturnValue(true);
      mockExecFileNoThrowSync.mockReturnValue(execOk('Score: 100/100  Verdict: PASS'));

      await installAllPlugins({ dirname: '/test' });

      // Migration (synchronous, no exec calls)
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '/home/testuser/.claude/plugins/cache/specweave') return true;
        if (p.endsWith('vskill.lock')) return false;
        return false;
      });
      mockReaddirSync.mockReturnValue([]);
      migrateToVskill();

      // Across ALL calls: ZERO invocations of `claude plugin install`
      const allCalls = mockExecFileNoThrowSync.mock.calls;
      const legacyCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = call[0];
          const args = call[1] || [];
          return cmd === 'claude' && args[0] === 'plugin' && args[1] === 'install';
        }
      );
      expect(legacyCalls).toHaveLength(0);
    });
  });
});
