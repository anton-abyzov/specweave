/**
 * Unit tests for refresh-plugins command
 *
 * Tests the new vskill-backed plugin refresh workflow:
 * - TC-014: Lazy mode installs only core plugin (sw)
 * - TC-015: All mode installs all marketplace plugins
 * - TC-016: Changed plugins are re-scanned (hash comparison)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Hoisted mocks
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
} = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockStatSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockCpSync: vi.fn(),
  mockChmodSync: vi.fn(),
}));

// Mock execFileNoThrow (used for shell-out to vskill CLI)
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
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

// Mock fs
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
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    cpSync: mockCpSync,
    chmodSync: mockChmodSync,
  };
});

// ---------------------------------------------------------------------------
// Import after mocks (the module under test)
// ---------------------------------------------------------------------------

import { refreshPluginsCommand } from '../../../../src/cli/commands/refresh-plugins.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execOk(stdout = '', stderr = ''): { stdout: string; stderr: string; exitCode: number; success: boolean } {
  return { stdout, stderr, exitCode: 0, success: true };
}

function execFail(stdout = '', stderr = ''): { stdout: string; stderr: string; exitCode: number; success: boolean } {
  return { stdout, stderr, exitCode: 1, success: false };
}

/** Route execFileNoThrowSync calls by command + args prefix */
function routeExec(routes: Record<string, ReturnType<typeof execOk>>): void {
  mockExecFileNoThrowSync.mockImplementation((cmd: string, args: string[]) => {
    const key = [cmd, ...args].join(' ');
    // Exact match first
    if (routes[key]) return routes[key];
    // Prefix match
    for (const [prefix, result] of Object.entries(routes)) {
      if (key.startsWith(prefix)) return result;
    }
    return execOk();
  });
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

/** Sample lockfile content */
function makeLockfile(skills: Record<string, { sha: string; version: string }>): string {
  const lock = {
    version: 1,
    agents: ['claude'],
    skills: Object.fromEntries(
      Object.entries(skills).map(([name, { sha, version }]) => [
        name,
        { version, sha, tier: 'SCANNED', installedAt: '2026-02-01T00:00:00Z', source: 'local:specweave' },
      ])
    ),
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  };
  return JSON.stringify(lock);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('refresh-plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    // Default: all exec calls succeed (vskill add returns ok)
    mockExecFileNoThrowSync.mockReturnValue(execOk('installed successfully'));
    // Default: readdirSync returns empty (no files to hash)
    mockReaddirSync.mockReturnValue([]);
  });

  // =========================================================================
  // TC-014: Lazy mode installs only core plugin (sw)
  // =========================================================================
  describe('TC-014: lazy mode installs only core plugin', () => {
    it('should install only sw plugin when no flags are passed (default lazy mode)', async () => {
      // Given: a fresh project with no vskill.lock
      mockExistsSync.mockImplementation((p: string) => {
        // marketplace.json exists (in the specweave repo)
        if (p.includes('marketplace.json')) return true;
        // No vskill.lock
        if (p.includes('vskill.lock')) return false;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refreshPlugins() runs with default options (lazy mode)
      await refreshPluginsCommand({});

      // Then: only the sw plugin is installed via vskill
      // Check that vskill add was called for 'sw' but NOT for 'sw-frontend' or 'sw-github'
      const vskillCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const args = c[1] as string[];
          return args?.some((a: string) => a === '--plugin');
        }
      );

      // Should have exactly 1 call (for 'sw' only)
      const pluginNames = vskillCalls.map((c: unknown[]) => {
        const args = c[1] as string[];
        const pluginIdx = args.indexOf('--plugin');
        return pluginIdx >= 0 ? args[pluginIdx + 1] : null;
      });

      expect(pluginNames).toContain('sw');
      expect(pluginNames).not.toContain('sw-frontend');
      expect(pluginNames).not.toContain('sw-github');
    });

    it('should create a vskill.lock if one does not exist', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        if (p.includes('vskill.lock')) return false;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      await refreshPluginsCommand({});

      // Lockfile should have been written
      const lockfileWrites = mockWriteFileSync.mock.calls.filter(
        (c: unknown[]) => (c[0] as string).includes('vskill.lock')
      );
      expect(lockfileWrites.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // TC-015: All mode installs all marketplace plugins
  // =========================================================================
  describe('TC-015: all mode installs all marketplace plugins', () => {
    it('should install all plugins from marketplace.json when --all flag is set', async () => {
      // Given: --all flag is set
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return MARKETPLACE_JSON;
        return '';
      });

      // When: refreshPlugins runs with all: true
      await refreshPluginsCommand({ all: true });

      // Then: all plugins from marketplace.json are processed
      const vskillCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const args = c[1] as string[];
          return args?.some((a: string) => a === '--plugin');
        }
      );

      const pluginNames = vskillCalls.map((c: unknown[]) => {
        const args = c[1] as string[];
        const pluginIdx = args.indexOf('--plugin');
        return pluginIdx >= 0 ? args[pluginIdx + 1] : null;
      });

      expect(pluginNames).toContain('sw');
      expect(pluginNames).toContain('sw-frontend');
      expect(pluginNames).toContain('sw-github');
      expect(pluginNames.length).toBe(3);
    });
  });

  // =========================================================================
  // TC-016: Changed plugins are re-scanned
  // =========================================================================
  describe('TC-016: changed plugins are re-scanned', () => {
    it('should re-scan a plugin when its content hash has changed', async () => {
      const oldHash = 'aabbccdd1122';
      const newContent = 'new plugin content that differs';
      const newHash = createHash('sha256').update(newContent).digest('hex').slice(0, 12);

      // Given: sw-frontend in lockfile with old hash
      const lockfileContent = makeLockfile({
        'sw-frontend': { sha: oldHash, version: '1.0.50' },
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        if (p.includes('vskill.lock')) return true;
        // Plugin source directory exists
        if (p.includes('specweave-frontend')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return MARKETPLACE_JSON;
        if (p.includes('vskill.lock')) return lockfileContent;
        // Simulate reading plugin content that produces a different hash
        return newContent;
      });

      mockReaddirSync.mockReturnValue([]);
      mockStatSync.mockReturnValue({ isDirectory: () => true, mode: 0o755 });

      // When: refreshPlugins runs (all mode to include sw-frontend)
      await refreshPluginsCommand({ all: true });

      // Then: vskill re-scans and updates the plugin (because hash differs)
      const vskillCalls = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const args = c[1] as string[];
          return args?.some((a: string) => a === '--plugin') &&
            args?.some((a: string) => a === 'sw-frontend');
        }
      );

      expect(vskillCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip a plugin when its hash has NOT changed', async () => {
      // Hash of an empty directory (readdirSync returns [])
      // createHash('sha256').digest('hex').slice(0, 12) = 'e3b0c44298fc'
      const emptyDirHash = 'e3b0c44298fc';

      // Given: sw-frontend in lockfile with current hash matching the computed one
      const lockfileContent = makeLockfile({
        sw: { sha: emptyDirHash, version: '1.0.272' },
        'sw-frontend': { sha: emptyDirHash, version: '1.0.50' },
        'sw-github': { sha: emptyDirHash, version: '1.0.30' },
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return true;
        if (p.includes('vskill.lock')) return true;
        // Plugin source directories exist (so computePluginHash can run)
        if (p.includes('plugins/specweave')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('marketplace.json')) return MARKETPLACE_JSON;
        if (p.includes('vskill.lock')) return lockfileContent;
        return '';
      });

      // readdirSync returns empty array (no files) - hash will be 'e3b0c44298fc'
      mockReaddirSync.mockReturnValue([]);

      // When: refreshPlugins runs with all mode
      await refreshPluginsCommand({ all: true });

      // Then: sw-frontend should NOT be re-installed (hash unchanged)
      const vskillCallsForFrontend = mockExecFileNoThrowSync.mock.calls.filter(
        (c: unknown[]) => {
          const args = c[1] as string[];
          return args?.some((a: string) => a === '--plugin') &&
            args?.some((a: string) => a === 'sw-frontend');
        }
      );

      // Expect it was skipped (0 calls for sw-frontend)
      expect(vskillCallsForFrontend.length).toBe(0);
    });
  });
});
