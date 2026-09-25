/**
 * Unit tests for refresh-plugins command
 *
 * Tests both installation modes:
 * - Native Claude CLI mode (claude plugin install) when CLI is available
 * - Direct file copy fallback (.claude/skills/) when CLI is unavailable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockCopyPluginSkillsToProject,
  mockInstallPlugin,
  mockFindSpecweaveRoot,
  mockExistsSync,
  mockReadFileSync,
  mockGetProjectRoot,
  mockFindProjectRoot,
  mockDetectClaudeCli,
  mockEnablePluginsInSettings,
} = vi.hoisted(() => ({
  mockCopyPluginSkillsToProject: vi.fn(),
  mockInstallPlugin: vi.fn(),
  mockFindSpecweaveRoot: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockGetProjectRoot: vi.fn(),
  mockFindProjectRoot: vi.fn(),
  mockDetectClaudeCli: vi.fn(),
  mockEnablePluginsInSettings: vi.fn(),
}));

const { mockInstallProjectSkills, mockRemoveLegacySkillCopies } = vi.hoisted(() => ({
  mockInstallProjectSkills: vi.fn(),
  mockRemoveLegacySkillCopies: vi.fn(),
}));

// The core plugin's project copies are the sw-* skills (3.0)
vi.mock('../../../../src/core/skills/project-skills.js', () => ({
  installProjectSkills: mockInstallProjectSkills,
  removeLegacySkillCopies: mockRemoveLegacySkillCopies,
}));

const {
  mockCleanupLegacyLockfiles,
  mockCleanupOrphanedChildLocks,
  mockCleanupStalePlugins,
  mockMigrateUserLevelPlugins,
} = vi.hoisted(() => ({
  mockCleanupLegacyLockfiles: vi.fn(),
  mockCleanupOrphanedChildLocks: vi.fn(),
  mockCleanupStalePlugins: vi.fn(),
  mockMigrateUserLevelPlugins: vi.fn(),
}));

// Mock plugin-copier
vi.mock('../../../../src/utils/plugin-copier.js', () => ({
  copyPluginSkillsToProject: mockCopyPluginSkillsToProject,
  installPlugin: mockInstallPlugin,
  findSpecweaveRoot: mockFindSpecweaveRoot,
}));

// Mock stale lockfile cleanup + migration
vi.mock('../../../../src/utils/cleanup-stale-plugins.js', () => ({
  cleanupLegacyLockfiles: mockCleanupLegacyLockfiles,
  cleanupOrphanedChildLocks: mockCleanupOrphanedChildLocks,
  cleanupStalePlugins: mockCleanupStalePlugins,
  migrateUserLevelPlugins: mockMigrateUserLevelPlugins,
}));

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mockGetProjectRoot,
  findProjectRoot: mockFindProjectRoot,
}));

// Mock Claude CLI detector
vi.mock('../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
}));

// Mock plugin enabler
vi.mock('../../../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePluginsInSettings: mockEnablePluginsInSettings,
}));

// Mock ESM helpers
vi.mock('../../../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/src/cli/commands',
}));

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock chalk
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

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { refreshPluginsCommand } from '../../../../src/cli/commands/refresh-plugins.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MARKETPLACE_JSON = JSON.stringify({
  name: 'specweave',
  version: '1.0.0',
  plugins: [
    { name: 'sw', source: './plugins/specweave', version: '1.0.272', description: 'Core framework with GitHub, JIRA, ADO sync' },
  ],
});

const MARKETPLACE_WITH_EXTRA = JSON.stringify({
  name: 'specweave',
  version: '1.0.0',
  plugins: [
    { name: 'sw', source: './plugins/specweave', version: '1.0.272' },
    { name: 'sw-github', source: './plugins/specweave-github', version: '1.0.0' },
  ],
});

const CLI_UNAVAILABLE = {
  available: false,
  commandExists: false,
  pluginCommandsWork: false,
  platform: 'darwin' as const,
};

const CLI_AVAILABLE = {
  available: true,
  commandExists: true,
  pluginCommandsWork: true,
  platform: 'darwin' as const,
  version: '2.1.3',
  detectionMethod: 'binary' as const,
};

const CLI_PARTIAL = {
  available: false,
  commandExists: true,
  pluginCommandsWork: false,
  platform: 'darwin' as const,
  error: 'plugin_commands_not_supported' as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('refresh-plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFindSpecweaveRoot.mockReturnValue('/mock/specweave');
    mockGetProjectRoot.mockReturnValue('/mock/project');
    mockFindProjectRoot.mockReturnValue('/mock/project');
    mockDetectClaudeCli.mockReturnValue(CLI_UNAVAILABLE);
    mockEnablePluginsInSettings.mockReturnValue(true);

    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('marketplace.json')) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
      return '';
    });

    mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'abc123def456' });
    mockInstallPlugin.mockReturnValue({ success: true, sha: 'abc123def456' });
    mockInstallProjectSkills.mockReturnValue({ written: ['.claude/skills/sw-do/SKILL.md'], unchanged: [], removed: [] });
    mockRemoveLegacySkillCopies.mockReturnValue([]);

    // Default: cleanup returns no-op results
    mockCleanupLegacyLockfiles.mockReturnValue({
      success: true, removedCount: 0, skippedCount: 0,
      removedPaths: [], skippedPaths: [], errors: [],
    });
    mockCleanupOrphanedChildLocks.mockReturnValue({
      success: true, removedCount: 0, skippedCount: 0,
      removedPaths: [], skippedPaths: [], errors: [],
    });

    // Default: stale plugin cleanup + migration return no-op
    mockCleanupStalePlugins.mockResolvedValue({
      success: true, removedCount: 0, removedPlugins: [], removedCacheDirs: [],
    });
    mockMigrateUserLevelPlugins.mockResolvedValue({
      success: true, migratedCount: 0, migratedPlugins: [],
    });
  });

  // -------------------------------------------------------------------------
  // Fallback mode: direct copy (Claude CLI unavailable)
  // -------------------------------------------------------------------------

  describe('fallback mode (Claude CLI unavailable)', () => {
    it('installs the core plugin as the sw-* project skills when Claude CLI is not available', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_UNAVAILABLE);

      await refreshPluginsCommand({ all: true });

      expect(mockInstallProjectSkills).toHaveBeenCalledTimes(1);
      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
      expect(mockInstallPlugin).not.toHaveBeenCalled();
    });

    it('should use fallback when CLI exists but plugin commands do not work', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_PARTIAL);

      await refreshPluginsCommand({ all: true });

      expect(mockInstallProjectSkills).toHaveBeenCalledTimes(1);
      expect(mockInstallPlugin).not.toHaveBeenCalled();
    });

    it('should install all plugins from marketplace.json', async () => {
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_WITH_EXTRA;
        return '';
      });

      await refreshPluginsCommand({ all: true });

      expect(mockInstallProjectSkills).toHaveBeenCalledTimes(1);
      const calledPlugins = mockCopyPluginSkillsToProject.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledPlugins).toEqual(['sw-github']);
    });

    it('removes the old unnamespaced copies, then installs sw-* into the project root', async () => {
      const order: string[] = [];
      mockRemoveLegacySkillCopies.mockImplementation(() => { order.push('remove'); return []; });
      mockInstallProjectSkills.mockImplementation(() => { order.push('install'); return { written: [], unchanged: [], removed: [] }; });

      await refreshPluginsCommand({});

      expect(mockRemoveLegacySkillCopies).toHaveBeenCalledWith('/mock/project');
      expect(mockInstallProjectSkills).toHaveBeenCalledWith('/mock/project');
      expect(order).toEqual(['remove', 'install']);
    });

    it('should call enablePluginsInSettings even in fallback mode', async () => {
      await refreshPluginsCommand({ all: true });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw']);
    });
  });

  // -------------------------------------------------------------------------
  // Native mode: Claude CLI available
  // -------------------------------------------------------------------------

  describe('native mode (Claude CLI available)', () => {
    beforeEach(() => {
      mockDetectClaudeCli.mockReturnValue(CLI_AVAILABLE);
    });

    it('should use installPlugin when Claude CLI is available', async () => {
      await refreshPluginsCommand({ all: true });

      expect(mockInstallPlugin).toHaveBeenCalledTimes(1);
      // copyPluginSkillsToProject should not be called when all native installs succeed
      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
    });

    it('falls back to the sw-* project skills when the native install of the core plugin fails', async () => {
      mockInstallPlugin
        .mockReturnValueOnce({ success: false, sha: '', error: 'CLI crash' });

      await refreshPluginsCommand({ all: true });

      expect(mockInstallProjectSkills).toHaveBeenCalledWith('/mock/project');
      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
    });

    it('falls back to a direct copy when the native install of another plugin fails', async () => {
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_WITH_EXTRA;
        return '';
      });
      mockInstallPlugin
        .mockReturnValueOnce({ success: true, sha: 'a' })
        .mockReturnValueOnce({ success: false, sha: '', error: 'CLI crash' });
      mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'fallback' });

      await refreshPluginsCommand({ all: true });

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(1);
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw-github',
        '/mock/specweave',
        '/mock/project',
        { force: undefined },
      );
    });

    it('should install all plugins from marketplace.json via native CLI', async () => {
      await refreshPluginsCommand({ all: true });

      const calledPlugins = mockInstallPlugin.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledPlugins).toContain('sw');
    });

    it('should pass specweave root and force option to installPlugin', async () => {
      await refreshPluginsCommand({ force: true });

      expect(mockInstallPlugin).toHaveBeenCalledWith(
        'sw',
        '/mock/specweave',
        { force: true },
      );
    });

    it('should call enablePluginsInSettings with all successful plugin names', async () => {
      await refreshPluginsCommand({ all: true });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledTimes(1);
      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw']);
    });

    it('should only enable successfully installed plugins (excludes double-failures)', async () => {
      // Native fails for sw, AND fallback also fails
      mockInstallPlugin
        .mockReturnValueOnce({ success: false, sha: '', error: 'install failed' });
      mockInstallProjectSkills.mockImplementation(() => { throw new Error('copy also failed'); });

      await refreshPluginsCommand({ all: true });

      expect(mockEnablePluginsInSettings).not.toHaveBeenCalled();
    });

    it('should not call enablePluginsInSettings when all plugins fail (native + fallback)', async () => {
      // Both native and fallback fail for every plugin
      mockInstallPlugin.mockReturnValue({ success: false, sha: '', error: 'native failed' });
      mockInstallProjectSkills.mockImplementation(() => { throw new Error('copy also failed'); });

      await refreshPluginsCommand({ all: true });

      expect(mockEnablePluginsInSettings).not.toHaveBeenCalled();
    });

    it('should include skipped plugins in enablement list', async () => {
      mockInstallPlugin.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      await refreshPluginsCommand({ all: true });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw']);
    });
  });

  // -------------------------------------------------------------------------
  // Hash comparison and skip (both modes)
  // -------------------------------------------------------------------------

  describe('hash comparison and skip', () => {
    it('reports the core plugin as active when the sw-* skills are already current', async () => {
      mockInstallProjectSkills.mockReturnValue({ written: [], unchanged: ['.claude/skills/sw-do/SKILL.md'], removed: [] });
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await refreshPluginsCommand({ all: true });

      expect(result.failed).toBe(0);
      expect(consoleSpy.mock.calls.some((args) => String(args[0]).includes('sw: active'))).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should pass force flag to copyPluginSkillsToProject', async () => {
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_WITH_EXTRA;
        return '';
      });

      await refreshPluginsCommand({ all: true, force: true });

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw-github',
        '/mock/specweave',
        '/mock/project',
        { force: true },
      );
    });

    it('should handle plugin failures with error messages', async () => {
      mockInstallProjectSkills.mockImplementation(() => { throw new Error('Source dir not found'); });

      const result = await refreshPluginsCommand({ all: true });

      expect(mockInstallProjectSkills).toHaveBeenCalledTimes(1);
      expect(result.failed).toBe(1);
      expect(result.errors.join('\n')).toContain('Source dir not found');
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle missing specweave root gracefully', async () => {
      mockFindSpecweaveRoot.mockReturnValue(null);
      mockExistsSync.mockReturnValue(false);

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
      expect(mockInstallPlugin).not.toHaveBeenCalled();
    });

    it('should handle empty marketplace.json', async () => {
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return JSON.stringify({ plugins: [] });
        return '';
      });

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
      expect(mockInstallPlugin).not.toHaveBeenCalled();
    });

    it('should fall back to direct copy when detectClaudeCli() throws', async () => {
      mockDetectClaudeCli.mockImplementation(() => {
        throw new Error('Segfault in child process');
      });

      await refreshPluginsCommand({ all: true });

      // Should gracefully fall back to copy mode, not crash
      expect(mockInstallProjectSkills).toHaveBeenCalledTimes(1);
      expect(mockInstallPlugin).not.toHaveBeenCalled();
      // Even in fallback mode, enablement should happen
      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw']);
    });

    it('should warn user when enablePluginsInSettings fails', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_AVAILABLE);
      mockEnablePluginsInSettings.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'log');

      await refreshPluginsCommand({});

      const warningLogged = consoleSpy.mock.calls.some(
        (args) => String(args[0]).includes('Could not enable plugins'),
      );
      expect(warningLogged).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should recover when all native installs fail by falling back to copy', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_AVAILABLE);
      mockInstallPlugin.mockReturnValue({ success: false, sha: '', error: 'CLI broken' });

      await refreshPluginsCommand({ all: true });

      // Each plugin: native fails → fallback (sw-* project skills) succeeds
      expect(mockInstallPlugin).toHaveBeenCalledTimes(1);
      expect(mockInstallProjectSkills).toHaveBeenCalledTimes(1);
      // All plugins recovered via copy, so enablement should still happen
      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw']);
    });
  });

  // -------------------------------------------------------------------------
  // Stale lockfile cleanup (T-016 through T-019)
  // -------------------------------------------------------------------------

  describe('stale lockfile cleanup', () => {
    it('T-016: cleanup called before plugin install', async () => {
      const callOrder: string[] = [];
      mockCleanupLegacyLockfiles.mockImplementation(() => {
        callOrder.push('cleanupLegacy');
        return {
          success: true, removedCount: 0, skippedCount: 0,
          removedPaths: [], skippedPaths: [], errors: [],
        };
      });
      mockInstallProjectSkills.mockImplementation(() => {
        callOrder.push('installPlugin');
        return { written: [], unchanged: [], removed: [] };
      });

      await refreshPluginsCommand({});

      expect(callOrder.indexOf('cleanupLegacy')).toBeLessThan(
        callOrder.indexOf('installPlugin')
      );
    });

    it('T-017: orphan cleanup called in umbrella mode', async () => {
      await refreshPluginsCommand({});

      expect(mockCleanupOrphanedChildLocks).toHaveBeenCalledTimes(1);
      expect(mockCleanupOrphanedChildLocks).toHaveBeenCalledWith(
        '/mock/project',
        expect.objectContaining({})
      );
    });

    it('T-018: verbose mode logs removed paths', async () => {
      mockCleanupLegacyLockfiles.mockReturnValue({
        success: true, removedCount: 1, skippedCount: 0,
        removedPaths: ['/mock/project/skills-lock.json'],
        skippedPaths: [], errors: [],
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await refreshPluginsCommand({ verbose: true });

      const loggedRemoved = consoleSpy.mock.calls.some(
        (args) => String(args[0]).includes('skills-lock.json')
      );
      expect(loggedRemoved).toBe(true);
      consoleSpy.mockRestore();
    });

    it('T-019: cleanup errors are non-blocking', async () => {
      mockCleanupLegacyLockfiles.mockImplementation(() => {
        throw new Error('Unexpected cleanup crash');
      });

      // Should not throw — plugin installation still proceeds
      await refreshPluginsCommand({ quiet: true });

      // Plugin installation should still have been called
      expect(mockInstallProjectSkills).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // User-level plugin migration (inc 0573)
  // -------------------------------------------------------------------------

  describe('user-level plugin migration', () => {
    it('T-020: calls migrateUserLevelPlugins in native CLI mode', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_AVAILABLE);

      await refreshPluginsCommand({});

      expect(mockMigrateUserLevelPlugins).toHaveBeenCalledTimes(1);
    });

    it('T-021: calls migrateUserLevelPlugins in fallback mode', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_UNAVAILABLE);

      await refreshPluginsCommand({});

      expect(mockMigrateUserLevelPlugins).toHaveBeenCalledTimes(1);
    });

    it('T-022: migration errors are non-blocking', async () => {
      mockMigrateUserLevelPlugins.mockRejectedValue(new Error('Migration crash'));

      // Should not throw
      await refreshPluginsCommand({ quiet: true });

      // Plugin installation should still have been called
      expect(mockInstallProjectSkills).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // No project found (0879): never fall back to process.cwd()
  //
  // getProjectRoot() returns process.cwd() when no .specweave/config.json is
  // found upward; the legacy-lockfile scan then walked that whole tree (from
  // $HOME: one core pinned for 6+ minutes). The command must stop instead.
  // -------------------------------------------------------------------------

  describe('no project found', () => {
    let exitCodeBefore: typeof process.exitCode;

    beforeEach(() => {
      exitCodeBefore = process.exitCode;
      process.exitCode = undefined;
      mockFindProjectRoot.mockReturnValue(null);
    });

    afterEach(() => {
      process.exitCode = exitCodeBefore;
    });

    it('bails out with failed=1, exit code 1 and a message naming the cwd and .specweave/config.json', async () => {
      const result = await refreshPluginsCommand({ quiet: true });

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No SpecWeave project found');
      expect(result.errors[0]).toContain('.specweave/config.json');
      expect(result.errors[0]).toContain(process.cwd());
      expect(process.exitCode).toBe(1);
    });

    it('prints the message and the remedy when not quiet', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await refreshPluginsCommand({});

      const output = consoleSpy.mock.calls.map((args) => String(args[0])).join('\n');
      expect(output).toContain('No SpecWeave project found');
      expect(output).toContain('specweave init');
      consoleSpy.mockRestore();
    });

    it('stays silent with --quiet', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await refreshPluginsCommand({ quiet: true });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('does not scan, migrate, install, or touch settings', async () => {
      await refreshPluginsCommand({ all: true });

      expect(mockGetProjectRoot).not.toHaveBeenCalled();
      expect(mockCleanupLegacyLockfiles).not.toHaveBeenCalled();
      expect(mockCleanupOrphanedChildLocks).not.toHaveBeenCalled();
      expect(mockDetectClaudeCli).not.toHaveBeenCalled();
      expect(mockInstallPlugin).not.toHaveBeenCalled();
      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
      expect(mockInstallProjectSkills).not.toHaveBeenCalled();
      expect(mockEnablePluginsInSettings).not.toHaveBeenCalled();
      expect(mockCleanupStalePlugins).not.toHaveBeenCalled();
      expect(mockMigrateUserLevelPlugins).not.toHaveBeenCalled();
    });

    it('runs normally once a project root is found', async () => {
      mockFindProjectRoot.mockReturnValue('/mock/project');

      const result = await refreshPluginsCommand({});

      expect(result.failed).toBe(0);
      expect(process.exitCode).toBeUndefined();
      expect(mockCleanupLegacyLockfiles).toHaveBeenCalledWith('/mock/project', expect.any(Object));
      expect(mockInstallProjectSkills).toHaveBeenCalledWith('/mock/project');
    });
  });
});
