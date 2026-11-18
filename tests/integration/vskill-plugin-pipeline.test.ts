/**
 * Integration tests for the full vskill plugin pipeline
 *
 * Tests the end-to-end flow across multiple components:
 * - TC-026: refresh-plugins end-to-end with inline copier
 * - TC-027: Init with inline copier end-to-end
 *
 * These tests exercise the integration between:
 * - refresh-plugins command (src/cli/commands/refresh-plugins.ts)
 *
 * All external I/O (filesystem, child_process) is mocked via vi.mock.
 *
 * Updated for v1.0.315 migration: refresh-plugins and plugin-installer
 * now use inline copier (plugin-copier.js) instead of vskill CLI.
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

// Inline copier mocks (replaces vskill CLI)
const mockCopyPlugin = vi.hoisted(() => vi.fn());
const mockCopyPluginSkillsToProject = vi.hoisted(() => vi.fn());
const mockFindSpecweaveRoot = vi.hoisted(() => vi.fn());
const mockGetProjectRoot = vi.hoisted(() => vi.fn());

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

// Mock execFileNoThrowSync (asserts no legacy `claude plugin install` calls)
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

// Mock node:fs
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

// Mock node:os
vi.mock('node:os', () => ({
  homedir: mockHomedir,
  default: { homedir: mockHomedir },
}));

// Mock node:crypto (pass through actual crypto for hash computation)
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return { ...actual, default: actual };
});

// Mock fs-native (for refresh-plugins)
vi.mock('../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
  copyFileSync: vi.fn(),
}));

// Mock ora (for refresh-plugins)
vi.mock('ora', () => ({ default: mockOra }));

// Mock os (for refresh-plugins)
vi.mock('os', () => ({
  default: { homedir: mockHomedir },
  homedir: mockHomedir,
}));

// Mock Claude CLI detector (for refresh-plugins)
vi.mock('../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  getClaudeCliDiagnostic: mockGetClaudeCliDiagnostic,
  getClaudeCliSuggestions: mockGetClaudeCliSuggestions,
}));

// Mock path-utils (for refresh-plugins)
vi.mock('../../src/cli/helpers/init/path-utils.js', () => ({
  findSourceDir: mockFindSourceDir,
}));

// Mock cleanup-stale-plugins (for refresh-plugins)
vi.mock('../../src/utils/cleanup-stale-plugins.js', () => ({
  cleanupStalePlugins: mockCleanupStalePlugins,
}));

// Mock plugin-scope (for refresh-plugins)
vi.mock('../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: mockGetPluginScope,
  getScopeArgs: mockGetScopeArgs,
}));

// Mock claude-plugin-enabler (for refresh-plugins)
vi.mock('../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePluginsInSettings: mockEnablePluginsInSettings,
}));

// Mock plugin-copier (inline copier used by refresh-plugins)
vi.mock('../../src/utils/plugin-copier.js', () => ({
  copyPlugin: mockCopyPlugin,
  installPlugin: mockCopyPlugin,
  copyPluginSkillsToProject: mockCopyPluginSkillsToProject,
  findSpecweaveRoot: mockFindSpecweaveRoot,
  computePluginHash: vi.fn(() => 'mock-hash-abc123'),
  readLockfile: vi.fn(() => null),
  writeLockfile: vi.fn(),
  ensureLockfile: vi.fn(() => ({ version: 1, agents: [], skills: {}, createdAt: '', updatedAt: '' })),
  migrateLegacyCommandsDir: vi.fn(() => false),
  fixHookPermissions: vi.fn(),
}));

// Mock find-project-root (refresh-plugins only works inside a project)
vi.mock('../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mockGetProjectRoot,
  findProjectRoot: vi.fn(() => '/mock/project'),
}));

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { refreshPluginsCommand } from '../../src/cli/commands/refresh-plugins.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Sample marketplace.json content */
const MARKETPLACE_JSON = JSON.stringify({
  name: 'specweave',
  version: '1.0.0',
  plugins: [
    { name: 'sw', source: './plugins/specweave', version: '1.0.272', description: 'Core framework with GitHub, JIRA, ADO sync' },
    { name: 'frontend', source: './plugins/specweave-frontend', version: '1.0.50', description: 'Frontend' },
  ],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('vskill plugin pipeline integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockExecFileNoThrowSync.mockReturnValue({ stdout: '', stderr: '', exitCode: 0, success: true });
    mockReaddirSync.mockReturnValue([]);
    mockHomedir.mockReturnValue('/home/testuser');
    mockFindSpecweaveRoot.mockReturnValue('/mock/specweave-root');
    mockCopyPlugin.mockReturnValue({ success: true, skipped: false });
    mockCopyPluginSkillsToProject.mockReturnValue({ success: true, skipped: false });
    mockGetProjectRoot.mockReturnValue('/mock/project');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // =========================================================================
  // TC-026: refresh-plugins end-to-end with inline copier
  // =========================================================================
  describe('TC-026: refresh-plugins end-to-end with inline copier', () => {
    it('should invoke copyPluginSkillsToProject for plugins listed in marketplace.json', async () => {
      // Given: a configured project with marketplace.json (no Claude CLI available)
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refreshPluginsCommand runs with --all
      await refreshPluginsCommand({ all: true });

      // Then: copyPluginSkillsToProject is invoked for each plugin (no CLI available)
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(2);

      const pluginNames = mockCopyPluginSkillsToProject.mock.calls.map((c: unknown[]) => c[0]);
      expect(pluginNames).toContain('sw');
      expect(pluginNames).toContain('frontend');
    });

    it('should pass specweave root to copyPluginSkillsToProject for each plugin', async () => {
      // Given: marketplace.json exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refreshPluginsCommand runs
      await refreshPluginsCommand({ all: true });

      // Then: each copyPluginSkillsToProject call passes the specweave root
      for (const call of mockCopyPluginSkillsToProject.mock.calls) {
        expect(call[1]).toBe('/mock/specweave-root');
      }
    });

    it('should skip unchanged plugins when copyPluginSkillsToProject returns skipped', async () => {
      // Given: marketplace.json exists, all plugins are unchanged
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // copyPluginSkillsToProject returns skipped for all plugins
      mockCopyPluginSkillsToProject.mockReturnValue({ success: true, skipped: true });

      // When: refreshPluginsCommand runs with --all
      await refreshPluginsCommand({ all: true });

      // Then: copyPluginSkillsToProject was called but all returned skipped
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(2);
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

      // Then: no calls to execFileNoThrowSync with claude plugin install
      const claudePluginInstallCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const cmd = c[0] as string;
          const args = (c[1] || []) as string[];
          return cmd === 'claude' && args[0] === 'plugin' && args[1] === 'install';
        }
      );
      expect(claudePluginInstallCalls).toHaveLength(0);
    });

    it('should install plugins via copyPluginSkillsToProject without separate CLI registration', async () => {
      // Given: marketplace.json exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refreshPluginsCommand runs
      await refreshPluginsCommand({ all: true });

      // Then: copyPluginSkillsToProject handles direct file copy
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(2); // sw, frontend
    });
  });

  // =========================================================================
  // Cross-component integration: pipeline coherence
  // =========================================================================
  describe('Pipeline coherence', () => {
    it('refresh avoids claude plugin install', async () => {
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
