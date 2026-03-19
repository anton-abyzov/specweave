import { describe, it, expect, afterEach, vi } from 'vitest';

const mockDetectClaudeCli = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());

vi.mock('../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: mockReadFileSync,
    existsSync: actual.existsSync,
  };
});

import { resolveActiveAdapter } from '../../src/cli/commands/refresh-plugins.js';

describe('resolveActiveAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cursor adapter with file-copy when config.adapters.default is "cursor"', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      adapters: { default: 'cursor' },
    }));

    const result = resolveActiveAdapter('/fake/project');
    expect(result).toEqual({
      name: 'cursor',
      method: 'file-copy',
      skillsDir: '.cursor/skills',
    });
    expect(mockDetectClaudeCli).not.toHaveBeenCalled();
  });

  it('returns opencode adapter with file-copy when config.adapters.default is "opencode"', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      adapters: { default: 'opencode' },
    }));

    const result = resolveActiveAdapter('/fake/project');
    expect(result).toEqual({
      name: 'opencode',
      method: 'file-copy',
      skillsDir: '.opencode/skills',
    });
    expect(mockDetectClaudeCli).not.toHaveBeenCalled();
  });

  it('returns native-cli when config.adapters.default is "claude" and CLI is available', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      adapters: { default: 'claude' },
    }));
    mockDetectClaudeCli.mockReturnValue({
      available: true,
      commandExists: true,
      pluginCommandsWork: true,
    });

    const result = resolveActiveAdapter('/fake/project');
    expect(result).toEqual({
      name: 'claude',
      method: 'native-cli',
      skillsDir: '',
    });
  });

  it('returns file-copy to .claude/skills when config.adapters.default is "claude" and CLI unavailable', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      adapters: { default: 'claude' },
    }));
    mockDetectClaudeCli.mockReturnValue({
      available: false,
      commandExists: false,
      pluginCommandsWork: false,
    });

    const result = resolveActiveAdapter('/fake/project');
    expect(result).toEqual({
      name: 'claude',
      method: 'file-copy',
      skillsDir: '.claude/skills',
    });
  });

  it('falls back to Claude CLI detection when config is missing', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    mockDetectClaudeCli.mockReturnValue({
      available: true,
      commandExists: true,
      pluginCommandsWork: true,
    });

    const result = resolveActiveAdapter('/fake/project');
    expect(result).toEqual({
      name: 'claude',
      method: 'native-cli',
      skillsDir: '',
    });
  });

  it('falls back to Claude detection when adapter name is unknown', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      adapters: { default: 'nonexistent-tool' },
    }));
    mockDetectClaudeCli.mockReturnValue({
      available: true,
      commandExists: true,
      pluginCommandsWork: true,
    });

    const result = resolveActiveAdapter('/fake/project');
    expect(result).toEqual({
      name: 'claude',
      method: 'native-cli',
      skillsDir: '',
    });
  });

  it('falls back to Claude detection when adapters.default is unset', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({}));
    mockDetectClaudeCli.mockReturnValue({
      available: false,
      commandExists: false,
      pluginCommandsWork: false,
    });

    const result = resolveActiveAdapter('/fake/project');
    expect(result).toEqual({
      name: 'claude',
      method: 'file-copy',
      skillsDir: '.claude/skills',
    });
  });
});
