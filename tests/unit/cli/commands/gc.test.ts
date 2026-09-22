/**
 * Unit tests for the gc command.
 *
 * 0879: gc resolved its root with resolveEffectiveRoot(), which falls back to
 * process.cwd() outside a project, then purged <cwd>/.specweave/state and
 * scanned the cwd tree for nested .specweave/ directories. It now stops.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockFindEffectiveRoot, mockPurgeState, mockFindNested, mockWorktreesSize } = vi.hoisted(() => ({
  mockFindEffectiveRoot: vi.fn(),
  mockPurgeState: vi.fn(),
  mockFindNested: vi.fn(),
  mockWorktreesSize: vi.fn(),
}));

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  findEffectiveRoot: mockFindEffectiveRoot,
}));

vi.mock('../../../../src/core/state/state-gc.js', () => ({
  purgeState: mockPurgeState,
  findNestedSpecweaveDirs: mockFindNested,
  worktreesSize: mockWorktreesSize,
  formatBytes: (n: number) => `${n} B`,
}));

import { gcCommand } from '../../../../src/cli/commands/gc.js';

describe('gcCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let exitCodeBefore: typeof process.exitCode;

  const output = () => logSpy.mock.calls.map((c) => String(c[0])).join('\n');

  beforeEach(() => {
    vi.clearAllMocks();
    exitCodeBefore = process.exitCode;
    process.exitCode = undefined;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockPurgeState.mockReturnValue({ applied: false, candidates: [], deleted: [], bytes: 0 });
    mockFindNested.mockReturnValue([]);
    mockWorktreesSize.mockReturnValue(0);
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = exitCodeBefore;
  });

  describe('no project found (0879)', () => {
    beforeEach(() => {
      mockFindEffectiveRoot.mockReturnValue(null);
    });

    it('bails out with exit code 1, names the cwd and .specweave/config.json, and never scans', async () => {
      await gcCommand({});

      const text = output();
      expect(text).toContain('No SpecWeave project found');
      expect(text).toContain('.specweave/config.json');
      expect(text).toContain(process.cwd());
      expect(text).toContain('specweave init');
      expect(process.exitCode).toBe(1);
      expect(mockPurgeState).not.toHaveBeenCalled();
      expect(mockWorktreesSize).not.toHaveBeenCalled();
      expect(mockFindNested).not.toHaveBeenCalled();
    });

    it('reports the error as JSON under --json', async () => {
      await gcCommand({ json: true });

      const parsed = JSON.parse(output());
      expect(parsed.error).toContain('No SpecWeave project found');
      expect(process.exitCode).toBe(1);
      expect(mockPurgeState).not.toHaveBeenCalled();
    });

    it('still runs against an explicit projectRoot', async () => {
      await gcCommand({ projectRoot: '/explicit/root', json: true });

      expect(mockPurgeState).toHaveBeenCalledWith('/explicit/root/.specweave/state', { apply: false });
      expect(mockWorktreesSize).toHaveBeenCalledWith('/explicit/root');
      expect(mockFindNested).toHaveBeenCalledWith('/explicit/root');
      expect(process.exitCode).not.toBe(1);
    });
  });

  describe('inside a project', () => {
    it('uses the resolved effective root for the purge and the scans', async () => {
      mockFindEffectiveRoot.mockReturnValue('/proj');

      await gcCommand({ yes: true });

      expect(mockPurgeState).toHaveBeenCalledWith('/proj/.specweave/state', { apply: true });
      expect(mockWorktreesSize).toHaveBeenCalledWith('/proj');
      expect(mockFindNested).toHaveBeenCalledWith('/proj');
      expect(output()).toContain('specweave gc');
      expect(process.exitCode).not.toBe(1);
    });
  });
});
