/**
 * Tests for plugin-installer.ts inline copier integration
 *
 * TC-018: Init uses inline copier instead of claude plugin install
 * TC-019: Plugin installation reports results to user
 *
 * Updated for v1.0.535: plugin-installer now uses copyPluginSkillsToProject
 * instead of copyPlugin. No lazyMode, no detectClaudeCli dependency.
 * All plugins are installed at init time.
 *
 * @module tests/unit/cli/helpers/init/plugin-installer-vskill
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- hoisted mocks (ESM-safe) ----

const mockCopyPluginSkillsToProject = vi.hoisted(() => vi.fn());
const mockFindSpecweaveRoot = vi.hoisted(() => vi.fn());
const mockFindSourceDir = vi.hoisted(() => vi.fn());
const mockEnablePluginsInSettings = vi.hoisted(() => vi.fn());
const mockGetProjectRoot = vi.hoisted(() => vi.fn());

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
  copyPluginSkillsToProject: mockCopyPluginSkillsToProject,
  findSpecweaveRoot: mockFindSpecweaveRoot,
}));

vi.mock('../../../../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/src/cli/helpers/init',
}));

vi.mock('../../../../../src/cli/helpers/init/path-utils.js', () => ({
  findSourceDir: mockFindSourceDir,
}));

vi.mock('../../../../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePluginsInSettings: mockEnablePluginsInSettings,
}));

vi.mock('../../../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mockGetProjectRoot,
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
}) {
  const plugins = overrides?.plugins ?? [{ name: 'sw' }, { name: 'sw-github' }];

  mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(marketplaceJson(plugins));
  mockEnablePluginsInSettings.mockReturnValue(true);
  mockGetProjectRoot.mockReturnValue('/mock/project');

  // Inline copier: findSpecweaveRoot returns valid root
  mockFindSpecweaveRoot.mockReturnValue('/mock/specweave');

  // Default copyPluginSkillsToProject: succeeds
  mockCopyPluginSkillsToProject.mockReturnValue({
    success: true,
    sha: 'abc123def456',
    targetDir: '/mock/project/.claude/skills',
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
    it('should invoke copyPluginSkillsToProject instead of vskill or claude plugin install', async () => {
      setupHappyPath();

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);

      // CRITICAL: Verify copyPluginSkillsToProject was called
      expect(mockCopyPluginSkillsToProject).toHaveBeenCalled();
      expect(mockCopyPluginSkillsToProject.mock.calls[0][0]).toBe('sw');
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

    it('should install all plugins from marketplace (no lazy mode)', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }, { name: 'sw-github' }] });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);

      const calledPlugins = mockCopyPluginSkillsToProject.mock.calls.map((c: any[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).toContain('sw-github');
    });

    it('should install all plugins listed in marketplace.json', async () => {
      setupHappyPath({ plugins: [{ name: 'sw' }, { name: 'sw-github' }] });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);

      const calledPlugins = mockCopyPluginSkillsToProject.mock.calls.map((c: any[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).toContain('sw-github');
    });

    it('should handle copyPluginSkillsToProject failure gracefully', async () => {
      setupHappyPath();
      mockCopyPluginSkillsToProject.mockReturnValue({ success: false, sha: '', error: 'Source dir not found' });

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(result.failCount).toBe(2);
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

      // Should report plugin installation (mentions "Installed" or "Plugin")
      expect(allLogMessages).toMatch(/plugin|installed/i);
    });

    it('should enable plugins in Claude settings after install', async () => {
      setupHappyPath();

      await installAllPlugins({ dirname: '/test' });

      expect(mockEnablePluginsInSettings).toHaveBeenCalledWith(['sw', 'sw-github']);
    });

    it('should handle specweave root not found', async () => {
      mockFindSourceDir.mockReturnValue('/mock/marketplace.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(marketplaceJson());
      mockFindSpecweaveRoot.mockReturnValue(null);
      mockGetProjectRoot.mockReturnValue('/mock/project');

      const result = await installAllPlugins({ dirname: '/test' });

      expect(result.success).toBe(false);
      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
    });
  });
});
