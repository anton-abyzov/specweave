/**
 * Unit tests for isSwPluginInstalledNatively()
 *
 * Tests the utility function that checks if the SW plugin is installed
 * natively in Claude Code via `claude plugin list` CLI output parsing.
 *
 * @see src/utils/plugin-copier.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock execFileNoThrowSync — must use vi.hoisted() for ESM
const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));
vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

import { isSwPluginInstalledNatively } from '../../../src/utils/plugin-copier.js';

// ---------------------------------------------------------------------------
// Test fixtures — realistic `claude plugin list` output
// ---------------------------------------------------------------------------

const CLI_OUTPUT_SW_ENABLED = `Installed plugins:

  ❯ frontend-design@claude-plugins-official
    Version: 55b58ec6e564
    Scope: user
    Status: ✔ enabled

  ❯ sw@specweave
    Version: 1.0.0
    Scope: user
    Status: ✔ enabled

  ❯ skill-creator@claude-plugins-official
    Version: 55b58ec6e564
    Scope: user
    Status: ✔ enabled
`;

const CLI_OUTPUT_SW_DISABLED = `Installed plugins:

  ❯ sw@specweave
    Version: 1.0.0
    Scope: user
    Status: ✘ disabled

  ❯ skill-creator@claude-plugins-official
    Version: 55b58ec6e564
    Scope: user
    Status: ✔ enabled
`;

const CLI_OUTPUT_NO_SW = `Installed plugins:

  ❯ frontend-design@claude-plugins-official
    Version: 55b58ec6e564
    Scope: user
    Status: ✔ enabled

  ❯ skill-creator@claude-plugins-official
    Version: 55b58ec6e564
    Scope: user
    Status: ✔ enabled
`;

const CLI_OUTPUT_EMPTY = `Installed plugins:

No plugins installed.
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isSwPluginInstalledNatively', () => {
  beforeEach(() => {
    mockExecFileNoThrowSync.mockReset();
  });

  it('should return true when CLI shows sw@specweave with enabled status', () => {
    mockExecFileNoThrowSync.mockReturnValue({
      success: true,
      stdout: CLI_OUTPUT_SW_ENABLED,
      stderr: '',
      exitCode: 0,
    });

    expect(isSwPluginInstalledNatively()).toBe(true);
    expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
      'claude',
      ['plugin', 'list'],
      expect.objectContaining({ timeout: 10_000 }),
    );
  });

  it('should return false when sw@specweave is disabled', () => {
    mockExecFileNoThrowSync.mockReturnValue({
      success: true,
      stdout: CLI_OUTPUT_SW_DISABLED,
      stderr: '',
      exitCode: 0,
    });

    expect(isSwPluginInstalledNatively()).toBe(false);
  });

  it('should return false when sw@specweave is not in the output', () => {
    mockExecFileNoThrowSync.mockReturnValue({
      success: true,
      stdout: CLI_OUTPUT_NO_SW,
      stderr: '',
      exitCode: 0,
    });

    expect(isSwPluginInstalledNatively()).toBe(false);
  });

  it('should return false when CLI returns empty plugin list', () => {
    mockExecFileNoThrowSync.mockReturnValue({
      success: true,
      stdout: CLI_OUTPUT_EMPTY,
      stderr: '',
      exitCode: 0,
    });

    expect(isSwPluginInstalledNatively()).toBe(false);
  });

  it('should return false when CLI command fails (non-zero exit)', () => {
    mockExecFileNoThrowSync.mockReturnValue({
      success: false,
      stdout: '',
      stderr: 'command not found: claude',
      exitCode: 127,
    });

    expect(isSwPluginInstalledNatively()).toBe(false);
  });

  it('should return false when CLI throws an error', () => {
    mockExecFileNoThrowSync.mockImplementation(() => {
      throw new Error('ENOENT: claude not found');
    });

    expect(isSwPluginInstalledNatively()).toBe(false);
  });

  it('should return false when stdout is undefined', () => {
    mockExecFileNoThrowSync.mockReturnValue({
      success: true,
      stdout: undefined,
      stderr: '',
      exitCode: 0,
    });

    expect(isSwPluginInstalledNatively()).toBe(false);
  });
});
