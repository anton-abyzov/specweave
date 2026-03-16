import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// Mock dependencies via vi.hoisted + vi.mock (ESM pattern)
const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  isCommandAvailable: vi.fn(),
  execFileNoThrow: vi.fn(),
}));

vi.mock('../../../src/utils/fs-native.js', () => ({
  existsSync: mocks.existsSync,
  default: { existsSync: mocks.existsSync },
}));

vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  isCommandAvailable: mocks.isCommandAvailable,
  execFileNoThrow: mocks.execFileNoThrow,
}));

// Import after mocks are set up
const { ensureSkillCreator } = await import('../../../src/cli/helpers/init/skill-creator-installer.js');

describe('ensureSkillCreator', () => {
  const projectRoot = '/tmp/test-project';
  const expectedLocalPath = path.join(projectRoot, '.claude/skills/skill-creator/SKILL.md');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips when skill-creator already exists locally', async () => {
    mocks.existsSync.mockReturnValue(true);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: false, skipped: true });
    expect(mocks.existsSync).toHaveBeenCalledWith(expectedLocalPath);
    expect(mocks.isCommandAvailable).not.toHaveBeenCalled();
    expect(mocks.execFileNoThrow).not.toHaveBeenCalled();
  });

  it('treats symlink as existing (existsSync follows symlinks)', async () => {
    // fs.existsSync follows symlinks — if target exists, returns true
    mocks.existsSync.mockReturnValue(true);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: false, skipped: true });
    expect(mocks.execFileNoThrow).not.toHaveBeenCalled();
  });

  it('warns and skips when claude CLI is not available', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(false);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({
      installed: false,
      skipped: false,
      error: 'claude CLI not found',
    });
    expect(mocks.isCommandAvailable).toHaveBeenCalledWith('claude');
    expect(mocks.execFileNoThrow).not.toHaveBeenCalled();
  });

  it('installs successfully when not present and claude CLI available', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockResolvedValue({
      success: true,
      stdout: 'Installed skill-creator',
      stderr: '',
      exitCode: 0,
    });

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: true, skipped: false });
    expect(mocks.execFileNoThrow).toHaveBeenCalledWith(
      'claude',
      ['install-skill', 'https://github.com/anthropics/claude-code/tree/main/skill-creator'],
      { cwd: projectRoot, timeout: 30000 },
    );
  });

  it('warns without throwing when install command fails', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockResolvedValue({
      success: false,
      stdout: '',
      stderr: 'network timeout',
      exitCode: 1,
    });

    const result = await ensureSkillCreator(projectRoot);

    expect(result.installed).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe('network timeout');
  });

  it('warns without throwing when install command throws unexpectedly', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockRejectedValue(new Error('ENOENT'));

    const result = await ensureSkillCreator(projectRoot);

    expect(result.installed).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe('ENOENT');
  });

  it('uses correct project root path for local check', async () => {
    const customRoot = '/home/user/my-project';
    mocks.existsSync.mockReturnValue(true);

    await ensureSkillCreator(customRoot);

    expect(mocks.existsSync).toHaveBeenCalledWith(
      path.join(customRoot, '.claude/skills/skill-creator/SKILL.md'),
    );
  });

  it('passes 30s timeout to execFileNoThrow', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
    });

    await ensureSkillCreator(projectRoot);

    const callArgs = mocks.execFileNoThrow.mock.calls[0];
    expect(callArgs[2].timeout).toBe(30000);
  });
});
