/**
 * Unit tests for refresh-plugins command
 *
 * Tests the inline copier-backed plugin refresh workflow:
 * - TC-014: Lazy mode installs only core plugin (sw)
 * - TC-015: All mode installs all marketplace plugins
 * - TC-016: Hash-based skip via copyPlugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockCopyPlugin,
  mockFindSpecweaveRoot,
  mockExistsSync,
  mockReadFileSync,
  mockRegisterPluginsWithClaudeCli,
} = vi.hoisted(() => ({
  mockCopyPlugin: vi.fn(),
  mockFindSpecweaveRoot: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockRegisterPluginsWithClaudeCli: vi.fn().mockReturnValue({
    marketplaceRegistered: true,
    installedPlugins: [],
    failedPlugins: [],
  }),
}));

// Mock plugin-copier (replaces vskill shell-out)
vi.mock('../../../../src/utils/plugin-copier.js', () => ({
  copyPlugin: mockCopyPlugin,
  findSpecweaveRoot: mockFindSpecweaveRoot,
  computePluginHash: vi.fn().mockReturnValue('abc123def456'),
  readLockfile: vi.fn(),
  writeLockfile: vi.fn(),
  ensureLockfile: vi.fn(),
}));

// Mock ESM helpers (provides __dirname equivalent)
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

// Mock chalk – identity proxy (strip formatting for easy assertions)
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

// Mock claude-plugin-cli (shared CLI registration utility)
vi.mock('../../../../src/utils/claude-plugin-cli.js', () => ({
  registerPluginsWithClaudeCli: mockRegisterPluginsWithClaudeCli,
}));

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
// Import after mocks (the module under test)
// ---------------------------------------------------------------------------

import { refreshPluginsCommand } from '../../../../src/cli/commands/refresh-plugins.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

describe('refresh-plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: findSpecweaveRoot returns a valid root
    mockFindSpecweaveRoot.mockReturnValue('/mock/specweave');

    // Default: marketplace.json exists and is readable
    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('marketplace.json')) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
      return '';
    });

    // Default: copyPlugin succeeds
    mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123def456' });
  });

  // =========================================================================
  // TC-014: Lazy mode installs only core plugin (sw)
  // =========================================================================
  describe('TC-014: lazy mode installs only core plugin', () => {
    it('should install only sw plugin when no flags are passed (default lazy mode)', async () => {
      await refreshPluginsCommand({});

      // copyPlugin should be called exactly once, for 'sw'
      expect(mockCopyPlugin).toHaveBeenCalledTimes(1);
      expect(mockCopyPlugin).toHaveBeenCalledWith('sw', '/mock/specweave', { force: undefined });
    });

    it('should not install sw-frontend or sw-github in lazy mode', async () => {
      await refreshPluginsCommand({});

      const calledPlugins = mockCopyPlugin.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledPlugins).not.toContain('sw-frontend');
      expect(calledPlugins).not.toContain('sw-github');
    });
  });

  // =========================================================================
  // TC-015: All mode installs all marketplace plugins
  // =========================================================================
  describe('TC-015: all mode installs all marketplace plugins', () => {
    it('should install all plugins from marketplace.json when --all flag is set', async () => {
      await refreshPluginsCommand({ all: true });

      expect(mockCopyPlugin).toHaveBeenCalledTimes(3);

      const calledPlugins = mockCopyPlugin.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).toContain('sw-frontend');
      expect(calledPlugins).toContain('sw-github');
    });
  });

  // =========================================================================
  // TC-016: Hash-based skip via copyPlugin
  // =========================================================================
  describe('TC-016: hash comparison and skip', () => {
    it('should report skipped plugins when copyPlugin returns skipped=true', async () => {
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      await refreshPluginsCommand({ all: true, verbose: true });

      // All 3 plugins called, all returned skipped
      expect(mockCopyPlugin).toHaveBeenCalledTimes(3);
    });

    it('should pass force flag to copyPlugin', async () => {
      await refreshPluginsCommand({ force: true });

      expect(mockCopyPlugin).toHaveBeenCalledWith('sw', '/mock/specweave', { force: true });
    });

    it('should handle plugin failures with error messages', async () => {
      mockCopyPlugin.mockReturnValue({ success: false, sha: '', error: 'Source dir not found' });

      // Should not throw
      await refreshPluginsCommand({});

      expect(mockCopyPlugin).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Claude CLI plugin registration
  // =========================================================================
  describe('Claude CLI plugin registration', () => {
    it('should call registerPluginsWithClaudeCli after successful install', async () => {
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123' });

      await refreshPluginsCommand({});

      expect(mockRegisterPluginsWithClaudeCli).toHaveBeenCalledWith(
        '/mock/specweave', ['sw'],
      );
    });

    it('should register all plugins in --all mode', async () => {
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123' });

      await refreshPluginsCommand({ all: true });

      expect(mockRegisterPluginsWithClaudeCli).toHaveBeenCalledWith(
        '/mock/specweave', ['sw', 'sw-frontend', 'sw-github'],
      );
    });

    it('should still register via CLI when plugins are skipped (unchanged)', async () => {
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      await refreshPluginsCommand({});

      // skipped counts as success, so CLI registration should still happen
      expect(mockRegisterPluginsWithClaudeCli).toHaveBeenCalled();
    });

    it('should not call CLI when all plugins fail', async () => {
      mockCopyPlugin.mockReturnValue({ success: false, sha: '', error: 'fail' });

      await refreshPluginsCommand({});

      expect(mockRegisterPluginsWithClaudeCli).not.toHaveBeenCalled();
    });

    it('should not crash when registerPluginsWithClaudeCli throws', async () => {
      mockCopyPlugin.mockReturnValue({ success: true, sha: 'abc123' });
      mockRegisterPluginsWithClaudeCli.mockImplementation(() => { throw new Error('CLI not found'); });

      // Should not throw
      await refreshPluginsCommand({});
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('should handle missing specweave root gracefully', async () => {
      mockFindSpecweaveRoot.mockReturnValue(null);
      mockExistsSync.mockReturnValue(false);

      await refreshPluginsCommand({});

      expect(mockCopyPlugin).not.toHaveBeenCalled();
    });

    it('should handle empty marketplace.json', async () => {
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return JSON.stringify({ plugins: [] });
        return '';
      });

      await refreshPluginsCommand({});

      expect(mockCopyPlugin).not.toHaveBeenCalled();
    });
  });
});
