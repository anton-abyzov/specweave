import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock status-commands
const mockCompleteIncrement = vi.hoisted(() => vi.fn());
vi.mock('../../../src/core/increment/status-commands.js', () => ({
  completeIncrement: mockCompleteIncrement,
}));

// Mock resolve-increment-id
const mockResolveIncrementId = vi.hoisted(() => vi.fn());
vi.mock('../../../src/utils/resolve-increment-id.js', () => ({
  resolveIncrementId: mockResolveIncrementId,
}));

// Mock find-project-root
vi.mock('../../../src/utils/find-project-root.js', () => ({
  resolveEffectiveRoot: () => '/mock-root',
}));

// Mock process.exit to prevent test runner from exiting
const mockExit = vi.hoisted(() => vi.fn());
vi.stubGlobal('process', { ...process, exit: mockExit });

// Mock console for output assertions
const mockConsoleError = vi.hoisted(() => vi.fn());
const mockConsoleLog = vi.hoisted(() => vi.fn());
vi.stubGlobal('console', { ...console, error: mockConsoleError, log: mockConsoleLog });

import { completeCommand } from '../../../src/cli/commands/complete.js';

describe('completeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExit.mockImplementation(() => { throw new Error('process.exit called'); });
  });

  it('completes a single ID successfully', async () => {
    mockResolveIncrementId.mockReturnValue('0589-cli-complete-improvements');
    mockCompleteIncrement.mockResolvedValue(true);

    await completeCommand('0589', [], {});

    expect(mockCompleteIncrement).toHaveBeenCalledTimes(1);
    expect(mockCompleteIncrement).toHaveBeenCalledWith(
      expect.objectContaining({ incrementId: '0589-cli-complete-improvements' })
    );
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('resolves short ID before completing', async () => {
    mockResolveIncrementId.mockReturnValue('0589-cli-complete-improvements');
    mockCompleteIncrement.mockResolvedValue(true);

    await completeCommand('0589', [], {});

    expect(mockResolveIncrementId).toHaveBeenCalledWith('0589', '/mock-root');
    expect(mockCompleteIncrement).toHaveBeenCalledWith(
      expect.objectContaining({ incrementId: '0589-cli-complete-improvements' })
    );
  });

  it('errors on unknown short ID', async () => {
    mockResolveIncrementId.mockReturnValue(null);

    await expect(completeCommand('9999', [], {})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('9999'));
  });

  it('errors on ambiguous ID and lists matches', async () => {
    mockResolveIncrementId.mockReturnValue(['0573-fix-a', '0573-fix-b']);

    await expect(completeCommand('0573', [], {})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('0573-fix-a'));
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('0573-fix-b'));
  });

  it('batch — all IDs succeed, no exit', async () => {
    mockResolveIncrementId
      .mockReturnValueOnce('0573-fix-corruption')
      .mockReturnValueOnce('0562-vskill-studio')
      .mockReturnValueOnce('0571-fix-init');
    mockCompleteIncrement.mockResolvedValue(true);

    await completeCommand('0573', ['0562', '0571'], {});

    expect(mockCompleteIncrement).toHaveBeenCalledTimes(3);
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('batch — one fails, others continue, exits 1', async () => {
    mockResolveIncrementId
      .mockReturnValueOnce('0573-fix-corruption')
      .mockReturnValueOnce('0562-vskill-studio')
      .mockReturnValueOnce('0571-fix-init');
    mockCompleteIncrement
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)   // 0562 fails
      .mockResolvedValueOnce(true);

    await expect(completeCommand('0573', ['0562', '0571'], {})).rejects.toThrow('process.exit called');

    // All 3 should be attempted despite the failure
    expect(mockCompleteIncrement).toHaveBeenCalledTimes(3);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('batch — resolves short IDs for all entries', async () => {
    mockResolveIncrementId
      .mockReturnValueOnce('0573-fix-corruption')
      .mockReturnValueOnce('0562-vskill-studio');
    mockCompleteIncrement.mockResolvedValue(true);

    await completeCommand('0573', ['0562'], {});

    expect(mockResolveIncrementId).toHaveBeenCalledWith('0573', '/mock-root');
    expect(mockResolveIncrementId).toHaveBeenCalledWith('0562', '/mock-root');
  });
});
