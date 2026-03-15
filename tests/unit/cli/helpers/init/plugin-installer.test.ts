/**
 * Tests for plugin-installer.ts
 *
 * Covers: installAllPlugins — direct file copy to .claude/skills/
 * (v1.0.535: replaced CLI-based installation with project-local copy)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- hoisted mocks (ESM-safe) ----

const mockCopyPluginSkillsToProject = vi.hoisted(() => vi.fn());
const mockFindSpecweaveRoot = vi.hoisted(() => vi.fn());
const mockFindSourceDir = vi.hoisted(() => vi.fn());
const mockGetProjectRoot = vi.hoisted(() => vi.fn());
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
  copyPluginSkillsToProject: mockCopyPluginSkillsToProject,
  findSpecweaveRoot: mockFindSpecweaveRoot,
}));

vi.mock('../../../../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/src/cli/helpers/init',
}));

vi.mock('../../../../../src/cli/helpers/init/path-utils.js', () => ({
  findSourceDir: mockFindSourceDir,
}));

vi.mock('../../../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mockGetProjectRoot,
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

/** Setup mocks for a successful flow */
function setupHappyPath(overrides?: {
  plugins?: Array<{ name: string }>;
}) {
  const plugins = overrides?.plugins ?? [{ name: 'sw' }, { name: 'sw-github' }];

  mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(marketplaceJson(plugins));
  mockGetProjectRoot.mockReturnValue('/mock/project');

  // findSpecweaveRoot returns valid root
  mockFindSpecweaveRoot.mockReturnValue('/mock/specweave');

  // Default copyPluginSkillsToProject: succeeds
  mockCopyPluginSkillsToProject.mockReturnValue({
    success: true,
    sha: 'abc123def456',
    targetDir: '/mock/project/.claude/skills',
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
  // installAllPlugins - marketplace errors
  // ============================================================
  describe('installAllPlugins - marketplace errors', () => {
    it('should handle missing marketplace.json', async () => {
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockFs.existsSync.mockReturnValue(false);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });

    it('should handle empty plugins array in marketplace.json', async () => {
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ plugins: [] }));

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // installAllPlugins - all plugins installed (always full mode)
  // ============================================================
  describe('installAllPlugins - full install', () => {
    it('should install all plugins from marketplace.json', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(0);
    });

    it('should call copyPluginSkillsToProject for each plugin', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });

      await installAllPlugins({ dirname: '/test' });

      const calledPlugins = mockCopyPluginSkillsToProject.mock.calls.map((c: any[]) => c[0]);
      expect(calledPlugins).toContain('sw-github');
      expect(calledPlugins).toContain('sw-jira');
    });

    it('should pass project root as third argument to copyPluginSkillsToProject', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }] });

      await installAllPlugins({ dirname: '/test' });

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw',
        '/mock/specweave',
        '/mock/project',
        expect.any(Object),
      );
    });

    it('should report partial failures', async () => {
      setupHappyPath({ plugins: [{ name: 'sw-github' }, { name: 'sw-jira' }] });
      let callCount = 0;
      mockCopyPluginSkillsToProject.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { success: true, sha: 'abc123' };
        }
        return { success: false, sha: '', error: 'timeout' };
      });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toContain('sw-jira');
    });

    it('should handle already-installed (skipped) plugins', async () => {
      setupHappyPath();
      mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
    });
  });

  // ============================================================
  // Error handling
  // ============================================================
  describe('error handling', () => {
    it('should handle marketplace.json with no plugins key', async () => {
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
    });

    it('should handle findSpecweaveRoot returning null', async () => {
      setupHappyPath();
      mockFindSpecweaveRoot.mockReturnValue(null);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
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

    it('should pass force option to copyPluginSkillsToProject', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }] });

      await installAllPlugins({ dirname: '/test', forceRefresh: true });

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw',
        '/mock/specweave',
        '/mock/project',
        { force: true },
      );
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('edge cases', () => {
    it('should handle all plugins failing', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }] });
      mockCopyPluginSkillsToProject.mockReturnValue({ success: false, sha: '', error: 'Source dir not found' });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(result.failCount).toBe(1);
      expect(result.failedPlugins).toEqual(['sw']);
    });

    it('should ensure .claude/skills/ directory exists', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }] });

      await installAllPlugins({ dirname: '/test' });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        '/mock/project/.claude/skills',
        { recursive: true },
      );
    });
  });

  // ============================================================
  // Settings enablement (AC-US2-01, AC-US2-02, AC-US2-03)
  // ============================================================
  describe('settings enablement', () => {
    it('should call enablePluginsInSettings with successful plugin names', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }, { name: 'sw-github' }] });
      mockEnablePluginsInSettings.mockReturnValue(true);

      await installAllPlugins({ dirname: '/test' });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-github']);
    });

    it('should exclude failed plugins from enablePluginsInSettings call', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }, { name: 'sw-github' }, { name: 'sw-jira' }] });
      mockEnablePluginsInSettings.mockReturnValue(true);
      let callCount = 0;
      mockCopyPluginSkillsToProject.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return { success: false, sha: '', error: 'timeout' };
        }
        return { success: true, sha: 'abc123' };
      });

      await installAllPlugins({ dirname: '/test' });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-jira']);
    });

    it('should not call enablePluginsInSettings when no plugins succeed', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }] });
      mockCopyPluginSkillsToProject.mockReturnValue({ success: false, sha: '', error: 'fail' });

      await installAllPlugins({ dirname: '/test' });

      expect(mockEnablePluginsInSettings).not.toHaveBeenCalled();
    });

    it('should not throw when enablePluginsInSettings returns false', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }] });
      mockEnablePluginsInSettings.mockReturnValue(false);

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
    });
  });
});
