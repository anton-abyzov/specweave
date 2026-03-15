/**
 * Unit tests for refresh-plugins command
 *
 * Tests both installation modes:
 * - Native Claude CLI mode (claude plugin install) when CLI is available
 * - Direct file copy fallback (.claude/skills/) when CLI is unavailable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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
  mockDetectClaudeCli,
  mockEnablePluginsInSettings,
} = vi.hoisted(() => ({
  mockCopyPluginSkillsToProject: vi.fn(),
  mockInstallPlugin: vi.fn(),
  mockFindSpecweaveRoot: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockGetProjectRoot: vi.fn(),
  mockDetectClaudeCli: vi.fn(),
  mockEnablePluginsInSettings: vi.fn(),
}));

// Mock plugin-copier
vi.mock('../../../../src/utils/plugin-copier.js', () => ({
  copyPluginSkillsToProject: mockCopyPluginSkillsToProject,
  installPlugin: mockInstallPlugin,
  findSpecweaveRoot: mockFindSpecweaveRoot,
}));

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mockGetProjectRoot,
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
    { name: 'sw', source: './plugins/specweave', version: '1.0.272', description: 'Core framework' },
    { name: 'sw-github', source: './plugins/specweave-github', version: '1.0.30', description: 'GitHub sync' },
    { name: 'sw-jira', source: './plugins/specweave-jira', version: '1.0.0', description: 'JIRA sync' },
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
  });

  // -------------------------------------------------------------------------
  // Fallback mode: direct copy (Claude CLI unavailable)
  // -------------------------------------------------------------------------

  describe('fallback mode (Claude CLI unavailable)', () => {
    it('should use copyPluginSkillsToProject when Claude CLI is not available', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_UNAVAILABLE);

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
      expect(mockInstallPlugin).not.toHaveBeenCalled();
    });

    it('should use fallback when CLI exists but plugin commands do not work', async () => {
      mockDetectClaudeCli.mockReturnValue(CLI_PARTIAL);

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
      expect(mockInstallPlugin).not.toHaveBeenCalled();
    });

    it('should install all plugins from marketplace.json', async () => {
      await refreshPluginsCommand({});

      const calledPlugins = mockCopyPluginSkillsToProject.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).toContain('sw-github');
      expect(calledPlugins).toContain('sw-jira');
    });

    it('should pass project root to copyPluginSkillsToProject', async () => {
      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw',
        '/mock/specweave',
        '/mock/project',
        { force: undefined },
      );
    });

    it('should call enablePluginsInSettings even in fallback mode', async () => {
      await refreshPluginsCommand({});

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-github', 'sw-jira']);
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
      await refreshPluginsCommand({});

      expect(mockInstallPlugin).toHaveBeenCalledTimes(3);
      // copyPluginSkillsToProject should not be called when all native installs succeed
      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
    });

    it('should fall back to copyPluginSkillsToProject when native install fails for a plugin', async () => {
      mockInstallPlugin
        .mockReturnValueOnce({ success: true, sha: 'abc123' })
        .mockReturnValueOnce({ success: false, sha: '', error: 'CLI crash' })
        .mockReturnValueOnce({ success: true, sha: 'def456' });
      mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'fallback' });

      await refreshPluginsCommand({});

      // Plugin 2 (sw-github) failed natively, should have been retried via copy
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(1);
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw-github',
        '/mock/specweave',
        '/mock/project',
        { force: undefined },
      );
    });

    it('should install all plugins from marketplace.json via native CLI', async () => {
      await refreshPluginsCommand({});

      const calledPlugins = mockInstallPlugin.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).toContain('sw-github');
      expect(calledPlugins).toContain('sw-jira');
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
      await refreshPluginsCommand({});

      expect(mockEnablePluginsInSettings).toHaveBeenCalledTimes(1);
      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-github', 'sw-jira']);
    });

    it('should only enable successfully installed plugins (excludes double-failures)', async () => {
      // Native fails for sw-github, AND fallback also fails
      mockInstallPlugin
        .mockReturnValueOnce({ success: true, sha: 'abc123' })
        .mockReturnValueOnce({ success: false, sha: '', error: 'install failed' })
        .mockReturnValueOnce({ success: true, sha: 'def456' });
      mockCopyPluginSkillsToProject.mockReturnValue({ success: false, sha: '', error: 'copy also failed' });

      await refreshPluginsCommand({});

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-jira']);
    });

    it('should not call enablePluginsInSettings when all plugins fail (native + fallback)', async () => {
      // Both native and fallback fail for every plugin
      mockInstallPlugin.mockReturnValue({ success: false, sha: '', error: 'native failed' });
      mockCopyPluginSkillsToProject.mockReturnValue({ success: false, sha: '', error: 'copy also failed' });

      await refreshPluginsCommand({});

      expect(mockEnablePluginsInSettings).not.toHaveBeenCalled();
    });

    it('should include skipped plugins in enablement list', async () => {
      mockInstallPlugin.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      await refreshPluginsCommand({});

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-github', 'sw-jira']);
    });
  });

  // -------------------------------------------------------------------------
  // Hash comparison and skip (both modes)
  // -------------------------------------------------------------------------

  describe('hash comparison and skip', () => {
    it('should report skipped plugins when copyPluginSkillsToProject returns skipped=true', async () => {
      mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
    });

    it('should pass force flag to copyPluginSkillsToProject', async () => {
      await refreshPluginsCommand({ force: true });

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw',
        '/mock/specweave',
        '/mock/project',
        { force: true },
      );
    });

    it('should handle plugin failures with error messages', async () => {
      mockCopyPluginSkillsToProject.mockReturnValue({ success: false, sha: '', error: 'Source dir not found' });

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
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

      await refreshPluginsCommand({});

      // Should gracefully fall back to copy mode, not crash
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
      expect(mockInstallPlugin).not.toHaveBeenCalled();
      // Even in fallback mode, enablement should happen
      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-github', 'sw-jira']);
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
      mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'fallback123' });

      await refreshPluginsCommand({});

      // Each plugin: native fails → fallback copy succeeds
      expect(mockInstallPlugin).toHaveBeenCalledTimes(3);
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
      // All plugins recovered via copy, so enablement should still happen
      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-github', 'sw-jira']);
    });
  });
});
