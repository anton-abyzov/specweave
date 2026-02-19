/**
 * Unit tests for refresh-marketplace deprecation
 *
 * TC-017: Deprecation warning shown on invocation
 *   - Given user calls the refresh-marketplace command handler
 *   - When command executes
 *   - Then deprecation warning mentioning "refresh-plugins" is output
 *   - And the refresh-plugins logic is delegated to
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockExecFileNoThrowSync,
  mockMigrateUserLevelPlugins,
  mockExistsSync,
  mockReadFileSync,
  mockReaddirSync,
  mockStatSync,
  mockWriteFileSync,
  mockRmSync,
  mockMkdirSync,
  mockChmodSync,
  mockRefreshPluginsCommand,
} = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
  mockMigrateUserLevelPlugins: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockStatSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockRmSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockChmodSync: vi.fn(),
  mockRefreshPluginsCommand: vi.fn(),
}));

// Mock execFileNoThrow
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

// Mock ESM helpers (provides __dirname equivalent)
vi.mock('../../../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/src/cli/commands',
}));

// Mock cleanup-stale-plugins
vi.mock('../../../../src/utils/cleanup-stale-plugins.js', () => ({
  migrateUserLevelPlugins: mockMigrateUserLevelPlugins,
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
      rmSync: mockRmSync,
      mkdirSync: mockMkdirSync,
      chmodSync: mockChmodSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
    writeFileSync: mockWriteFileSync,
    rmSync: mockRmSync,
    mkdirSync: mockMkdirSync,
    chmodSync: mockChmodSync,
  };
});

// Mock the refresh-plugins command (delegation target)
vi.mock('../../../../src/cli/commands/refresh-plugins.js', () => ({
  refreshPluginsCommand: mockRefreshPluginsCommand,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { refreshMarketplaceCommand } from '../../../../src/cli/commands/refresh-marketplace.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('refresh-marketplace deprecation (TC-017)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockMigrateUserLevelPlugins.mockResolvedValue({
      success: true,
      migratedCount: 0,
      migratedPlugins: [],
    });
    mockRefreshPluginsCommand.mockResolvedValue(undefined);
  });

  it('should show deprecation warning mentioning "refresh-plugins"', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await refreshMarketplaceCommand({});

    // Combine all console output to check for deprecation warning
    const allWarnOutput = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
    const allLogOutput = consoleLogSpy.mock.calls.map(c => String(c[0])).join('\n');
    const allOutput = allWarnOutput + '\n' + allLogOutput;

    // Should mention "deprecated" and "refresh-plugins" as the replacement
    expect(allOutput).toMatch(/deprecat/i);
    expect(allOutput).toMatch(/refresh-plugins/);

    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should delegate to refreshPluginsCommand with the same options', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const options = { all: true, force: true, verbose: true };
    await refreshMarketplaceCommand(options);

    // Should have called refreshPluginsCommand with the same options
    expect(mockRefreshPluginsCommand).toHaveBeenCalledTimes(1);
    expect(mockRefreshPluginsCommand).toHaveBeenCalledWith(
      expect.objectContaining({ all: true, force: true })
    );
  });

  it('should delegate to refreshPluginsCommand even with no options', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await refreshMarketplaceCommand({});

    expect(mockRefreshPluginsCommand).toHaveBeenCalledTimes(1);
  });
});
