import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies via vi.hoisted + vi.mock (ESM pattern)
const mocks = vi.hoisted(() => ({
  isCommandAvailable: vi.fn(),
  execFileNoThrow: vi.fn(),
}));

vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  isCommandAvailable: mocks.isCommandAvailable,
  execFileNoThrow: mocks.execFileNoThrow,
}));

// Import after mocks are set up
const { ensureVskillInit } = await import('../../../src/cli/helpers/init/vskill-init-invoker.js');

const VSKILL_INIT_ARGS = ['init', '--yes'];
const NPX_INIT_ARGS = [
  '--yes', '--registry', 'https://registry.npmjs.org',
  '--userconfig', '/dev/null', '--ignore-scripts',
  '--package', 'vskill@^0.5.0',
  'vskill', 'init', '--yes',
];

const ok = { success: true, stdout: 'ok', stderr: '', exitCode: 0 };
const fail = (msg: string) => ({ success: false, stdout: '', stderr: msg, exitCode: 1 });

describe('ensureVskillInit', () => {
  const projectRoot = '/tmp/test-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Tier 1: global vskill ---

  it('invokes global vskill init when available', async () => {
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockResolvedValue(ok);

    const result = await ensureVskillInit(projectRoot);

    expect(result).toEqual({ invoked: true, skipped: false });
    expect(mocks.isCommandAvailable).toHaveBeenCalledWith('vskill');
    expect(mocks.execFileNoThrow).toHaveBeenCalledWith(
      'vskill', VSKILL_INIT_ARGS, { cwd: projectRoot, timeout: 30000 },
    );
  });

  it('falls through to tier-2 when global vskill exits non-zero', async () => {
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockResolvedValue(fail('some warning'));

    const result = await ensureVskillInit(projectRoot);

    // Both tiers failed, should skip gracefully
    expect(result.invoked).toBe(false);
    expect(result.skipped).toBe(true);
    expect(mocks.execFileNoThrow).toHaveBeenCalledTimes(2);
  });

  // --- Tier 2: npx fallback ---

  it('falls back to npx when vskill is not globally installed', async () => {
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    const result = await ensureVskillInit(projectRoot);

    expect(result).toEqual({ invoked: true, skipped: false });
    expect(mocks.execFileNoThrow).toHaveBeenCalledWith(
      'npx', NPX_INIT_ARGS, { cwd: projectRoot, timeout: 60000 },
    );
  });

  it('falls back to npx when global vskill init fails', async () => {
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow
      .mockResolvedValueOnce(fail('vskill error'))
      .mockResolvedValueOnce(ok);

    const result = await ensureVskillInit(projectRoot);

    expect(result).toEqual({ invoked: true, skipped: false });
    expect(mocks.execFileNoThrow).toHaveBeenCalledTimes(2);
    expect(mocks.execFileNoThrow.mock.calls[0][0]).toBe('vskill');
    expect(mocks.execFileNoThrow.mock.calls[1][0]).toBe('npx');
  });

  it('npx uses 60s timeout to allow vskill download', async () => {
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    await ensureVskillInit(projectRoot);

    const npxCall = mocks.execFileNoThrow.mock.calls[0];
    expect(npxCall[0]).toBe('npx');
    expect(npxCall[2].timeout).toBe(60000);
  });

  it('npx passes --registry to bypass .npmrc redirects', async () => {
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    await ensureVskillInit(projectRoot);

    const npxArgs = mocks.execFileNoThrow.mock.calls[0][1] as string[];
    expect(npxArgs).toContain('--registry');
    expect(npxArgs).toContain('https://registry.npmjs.org');
  });

  it('npx passes --userconfig /dev/null to ignore .npmrc', async () => {
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    await ensureVskillInit(projectRoot);

    const npxArgs = mocks.execFileNoThrow.mock.calls[0][1] as string[];
    expect(npxArgs).toContain('--userconfig');
    expect(npxArgs).toContain('/dev/null');
  });

  it('npx pins vskill version range', async () => {
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd !== 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(ok);

    await ensureVskillInit(projectRoot);

    const npxArgs = mocks.execFileNoThrow.mock.calls[0][1] as string[];
    expect(npxArgs).toContain('--package');
    expect(npxArgs).toContain('vskill@^0.5.0');
  });

  // --- Tier 3: graceful skip ---

  it('skips gracefully when no CLI is available', async () => {
    mocks.isCommandAvailable.mockResolvedValue(false);

    const result = await ensureVskillInit(projectRoot);

    expect(result).toEqual({ invoked: false, skipped: true });
    expect(mocks.execFileNoThrow).not.toHaveBeenCalled();
  });

  it('skips gracefully when both tiers fail', async () => {
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow
      .mockResolvedValueOnce(fail('vskill error'))
      .mockResolvedValueOnce(fail('npx error'));

    const result = await ensureVskillInit(projectRoot);

    expect(result.invoked).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toContain('vskill');
    expect(result.error).toContain('npx');
  });

  // --- Error handling ---

  it('never throws even on unexpected errors', async () => {
    mocks.isCommandAvailable.mockRejectedValue(new Error('ENOENT'));

    const result = await ensureVskillInit(projectRoot);

    expect(result.invoked).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.error).toBe('ENOENT');
  });

  it('uses correct project root as cwd', async () => {
    const customRoot = '/home/user/my-project';
    mocks.isCommandAvailable.mockResolvedValue(true);
    mocks.execFileNoThrow.mockResolvedValue(ok);

    await ensureVskillInit(customRoot);

    expect(mocks.execFileNoThrow).toHaveBeenCalledWith(
      'vskill', VSKILL_INIT_ARGS, { cwd: customRoot, timeout: 30000 },
    );
  });

  it('does not attempt npx when npx is not available', async () => {
    // Only vskill available but it fails
    mocks.isCommandAvailable.mockImplementation(async (cmd: string) => cmd === 'vskill');
    mocks.execFileNoThrow.mockResolvedValue(fail('vskill error'));

    const result = await ensureVskillInit(projectRoot);

    expect(result.invoked).toBe(false);
    expect(result.skipped).toBe(true);
    expect(mocks.execFileNoThrow).toHaveBeenCalledTimes(1);
    expect(mocks.execFileNoThrow.mock.calls[0][0]).toBe('vskill');
  });
});
