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

const VSKILL_ARGS = ['install', 'anthropics/skills/skill-creator', '--yes', '--agent', 'claude-code'];
const NPX_ARGS = ['--registry', 'https://registry.npmjs.org', 'vskill', ...VSKILL_ARGS];
const CLAUDE_ARGS = ['install-skill', 'https://github.com/anthropics/skills/tree/main/skills/skill-creator'];

const ok = { success: true, stdout: 'ok', stderr: '', exitCode: 0 };
const fail = (msg: string) => ({ success: false, stdout: '', stderr: msg, exitCode: 1 });

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
    mocks.existsSync.mockReturnValue(true);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: false, skipped: true });
    expect(mocks.execFileNoThrow).not.toHaveBeenCalled();
  });

  // --- Tier 1: global vskill ---

  it('installs via global vskill when available', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockResolvedValue(ok);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: true, skipped: false });
    expect(mocks.isCommandAvailable).toHaveBeenCalledWith('vskill');
    expect(mocks.execFileNoThrow).toHaveBeenCalledWith(
      'vskill', VSKILL_ARGS, { cwd: projectRoot, timeout: 30000 },
    );
  });

  // --- Tier 2: npx with explicit registry ---

  it('falls back to npx when vskill is not globally installed', async () => {
    mocks.existsSync.mockReturnValue(false);
    // vskill not available, npx available
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: true, skipped: false });
    expect(mocks.execFileNoThrow).toHaveBeenCalledWith(
      'npx', NPX_ARGS, { cwd: projectRoot, timeout: 60000 },
    );
  });

  it('falls back to npx when global vskill install fails', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow
      .mockResolvedValueOnce(fail('GitHub rate limit'))
      .mockResolvedValueOnce(ok);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: true, skipped: false });
    expect(mocks.execFileNoThrow).toHaveBeenCalledTimes(2);
    expect(mocks.execFileNoThrow.mock.calls[0][0]).toBe('vskill');
    expect(mocks.execFileNoThrow.mock.calls[1][0]).toBe('npx');
  });

  it('npx uses 60s timeout to allow vskill download', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    await ensureSkillCreator(projectRoot);

    const npxCall = mocks.execFileNoThrow.mock.calls[0];
    expect(npxCall[0]).toBe('npx');
    expect(npxCall[2].timeout).toBe(60000);
  });

  it('npx passes --registry to bypass .npmrc redirects', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    await ensureSkillCreator(projectRoot);

    const npxCall = mocks.execFileNoThrow.mock.calls[0];
    expect(npxCall[1]).toContain('--registry');
    expect(npxCall[1]).toContain('https://registry.npmjs.org');
  });

  // --- Tier 3: claude install-skill ---

  it('falls back to claude CLI when both vskill and npx fail', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow
      .mockResolvedValueOnce(fail('vskill error'))
      .mockResolvedValueOnce(fail('npx error'))
      .mockResolvedValueOnce(ok);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: true, skipped: false });
    expect(mocks.execFileNoThrow).toHaveBeenCalledTimes(3);
    expect(mocks.execFileNoThrow.mock.calls[2]).toEqual([
      'claude', CLAUDE_ARGS, { cwd: projectRoot, timeout: 30000 },
    ]);
  });

  it('falls back to claude when vskill and npx are unavailable', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd === 'claude');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({ installed: true, skipped: false });
    expect(mocks.execFileNoThrow).toHaveBeenCalledOnce();
    expect(mocks.execFileNoThrow).toHaveBeenCalledWith(
      'claude', CLAUDE_ARGS, { cwd: projectRoot, timeout: 30000 },
    );
  });

  // --- No CLI available ---

  it('reports error when no CLI is available', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(false);

    const result = await ensureSkillCreator(projectRoot);

    expect(result).toEqual({
      installed: false,
      skipped: false,
      error: 'no CLI available (vskill, npx, or claude)',
    });
    expect(mocks.execFileNoThrow).not.toHaveBeenCalled();
  });

  // --- All tiers fail ---

  it('reports error when all three tiers fail', async () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow
      .mockResolvedValueOnce(fail('vskill error'))
      .mockResolvedValueOnce(fail('npx error'))
      .mockResolvedValueOnce(fail('claude error'));

    const result = await ensureSkillCreator(projectRoot);

    expect(result.installed).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe('claude error');
  });

  // --- Error handling ---

  it('never throws even on unexpected errors', async () => {
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
});
