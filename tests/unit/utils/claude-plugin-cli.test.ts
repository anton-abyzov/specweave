/**
 * Unit tests for claude-plugin-cli utility
 *
 * Tests the shared Claude CLI registration logic:
 * - Marketplace registration and plugin installation
 * - Error handling and debug logging
 * - Marketplace path validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockExecFileNoThrowSync,
  mockExistsSync,
} = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn().mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
  mockExistsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    existsSync: mockExistsSync,
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { registerPluginsWithClaudeCli } from '../../../src/utils/claude-plugin-cli.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerPluginsWithClaudeCli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });
  });

  it('should return early with empty result when no plugins provided', () => {
    const result = registerPluginsWithClaudeCli('/mock/root', []);

    expect(result.marketplaceRegistered).toBe(false);
    expect(result.installedPlugins).toEqual([]);
    expect(result.failedPlugins).toEqual([]);
    expect(mockExecFileNoThrowSync).not.toHaveBeenCalled();
  });

  it('should skip registration when marketplace.json does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const result = registerPluginsWithClaudeCli('/mock/root', ['sw']);

    expect(result.marketplaceRegistered).toBe(false);
    expect(result.installedPlugins).toEqual([]);
    expect(mockExecFileNoThrowSync).not.toHaveBeenCalled();
  });

  it('should register marketplace and install plugins on success', () => {
    const result = registerPluginsWithClaudeCli('/mock/root', ['sw', 'frontend']);

    expect(result.marketplaceRegistered).toBe(true);
    expect(result.installedPlugins).toEqual(['sw', 'frontend']);
    expect(result.failedPlugins).toEqual([]);

    expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
      'claude', ['plugin', 'marketplace', 'add', '/mock/root'],
    );
    expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
      'claude', ['plugin', 'install', 'sw@specweave'],
    );
    expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
      'claude', ['plugin', 'install', 'frontend@vskill'],
    );
  });

  it('should handle marketplace add failure gracefully', () => {
    mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args.includes('marketplace')) {
        return { success: false, stdout: '', stderr: 'not found', exitCode: 1 };
      }
      return { success: true, stdout: '', stderr: '', exitCode: 0 };
    });

    const result = registerPluginsWithClaudeCli('/mock/root', ['sw']);

    expect(result.marketplaceRegistered).toBe(false);
    // Plugin install should still be attempted
    expect(result.installedPlugins).toEqual(['sw']);
  });

  it('should track failed plugin installations', () => {
    mockExecFileNoThrowSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args.includes('sw-github@specweave')) {
        return { success: false, stdout: '', stderr: 'error', exitCode: 1 };
      }
      return { success: true, stdout: '', stderr: '', exitCode: 0 };
    });

    const result = registerPluginsWithClaudeCli('/mock/root', ['sw', 'sw-github']);

    expect(result.marketplaceRegistered).toBe(true);
    expect(result.installedPlugins).toEqual(['sw']);
    expect(result.failedPlugins).toEqual(['sw-github']);
  });

  it('should log debug info when DEBUG env is set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.DEBUG = '1';

    mockExecFileNoThrowSync.mockReturnValue({ success: false, stdout: '', stderr: 'CLI error', exitCode: 127 });

    registerPluginsWithClaudeCli('/mock/root', ['sw']);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('marketplace add failed'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('plugin install sw@specweave failed'));

    delete process.env.DEBUG;
    warnSpy.mockRestore();
  });

  it('should not log debug info when DEBUG env is not set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    delete process.env.DEBUG;

    mockExecFileNoThrowSync.mockReturnValue({ success: false, stdout: '', stderr: 'CLI error', exitCode: 127 });

    registerPluginsWithClaudeCli('/mock/root', ['sw']);

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
