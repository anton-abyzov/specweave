/**
 * Interview CLI Command Tests
 *
 * Comprehensive tests for the interview command which manages
 * deep-interview tracking for increment planning:
 *   - interviewStart: create state, show categories
 *   - interviewMarkCovered: mark categories, auto-start
 *   - interviewStatus: per-increment and all-interviews views
 *   - interviewClear: delete state
 *   - interviewCommand: action router
 *   - Config integration: custom categories, enforcement modes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockFindProjectRoot } = vi.hoisted(() => ({
  mockFindProjectRoot: vi.fn(),
}));

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  findProjectRoot: mockFindProjectRoot,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  interviewStart,
  interviewMarkCovered,
  interviewStatus,
  interviewClear,
  interviewCommand,
} from '../../../../src/cli/commands/interview.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES = [
  'architecture',
  'integrations',
  'ui-ux',
  'performance',
  'security',
  'edge-cases',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal SpecWeave project tree in a temp directory. */
function createTempProject(options?: {
  config?: Record<string, unknown>;
  createStateDir?: boolean;
}): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-test-'));
  const specweaveDir = path.join(tmpDir, '.specweave');
  fs.mkdirSync(specweaveDir, { recursive: true });

  if (options?.createStateDir) {
    fs.mkdirSync(path.join(specweaveDir, 'state'), { recursive: true });
  }

  if (options?.config) {
    fs.writeFileSync(
      path.join(specweaveDir, 'config.json'),
      JSON.stringify(options.config, null, 2),
    );
  }

  return tmpDir;
}

/** Write an interview state file directly (for pre-populating state). */
function writeState(
  projectRoot: string,
  incrementId: string,
  state: Record<string, unknown>,
): void {
  const stateDir = path.join(projectRoot, '.specweave', 'state');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(stateDir, `interview-${incrementId}.json`),
    JSON.stringify(state, null, 2),
  );
}

/** Read the persisted interview state file. */
function readState(projectRoot: string, incrementId: string): Record<string, unknown> | null {
  const statePath = path.join(
    projectRoot,
    '.specweave',
    'state',
    `interview-${incrementId}.json`,
  );
  if (!fs.existsSync(statePath)) return null;
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('interview command', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = createTempProject({ createStateDir: true });
    mockFindProjectRoot.mockReturnValue(tmpDir);

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    mockExit.mockRestore();
    vi.clearAllMocks();

    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // interviewStart
  // =========================================================================

  describe('interviewStart', () => {
    it('creates state file with correct structure', async () => {
      await interviewStart('0001-feature');

      const state = readState(tmpDir, '0001-feature');
      expect(state).not.toBeNull();
      expect(state!.incrementId).toBe('0001-feature');
      expect(state!.startedAt).toBeDefined();
      expect(typeof state!.startedAt).toBe('string');
      expect(state!.coveredCategories).toEqual({});
    });

    it('creates state directory if it does not exist', async () => {
      // Start from a project that has no state dir
      const freshDir = createTempProject({ createStateDir: false });
      mockFindProjectRoot.mockReturnValue(freshDir);

      const stateDir = path.join(freshDir, '.specweave', 'state');
      expect(fs.existsSync(stateDir)).toBe(false);

      await interviewStart('0002-test');

      expect(fs.existsSync(stateDir)).toBe(true);
      expect(readState(freshDir, '0002-test')).not.toBeNull();

      fs.rmSync(freshDir, { recursive: true, force: true });
    });

    it('shows categories list on start', async () => {
      await interviewStart('0001-feature');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Interview started for 0001-feature');
      expect(output).toContain('Cover all categories before creating spec.md');
      for (const cat of DEFAULT_CATEGORIES) {
        expect(output).toContain(`[ ] ${cat}`);
      }
    });

    it('does NOT overwrite existing interview (shows warning + status)', async () => {
      // Pre-populate state
      writeState(tmpDir, '0001-feature', {
        incrementId: '0001-feature',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {
          architecture: { coveredAt: '2025-01-01T01:00:00.000Z', summary: 'Done' },
        },
      });

      await interviewStart('0001-feature');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Interview already started for 0001-feature');
      // Should also call interviewStatus, which prints category markers
      expect(output).toContain('[x] architecture');
    });

    it('exits if not in a SpecWeave project', async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(interviewStart('0001-feature')).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not in a SpecWeave project'),
      );
    });

    it('stores a valid ISO timestamp in startedAt', async () => {
      await interviewStart('0003-ts');

      const state = readState(tmpDir, '0003-ts');
      const parsed = new Date(state!.startedAt as string);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  // =========================================================================
  // interviewMarkCovered
  // =========================================================================

  describe('interviewMarkCovered', () => {
    it('marks a valid category as covered with summary', async () => {
      // Start first
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await interviewMarkCovered('0001-feature', 'security', 'Auth tokens reviewed');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.security).toBeDefined();
      expect(covered.security.summary).toBe('Auth tokens reviewed');
    });

    it('marks category with empty summary and defaults to "Covered"', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await interviewMarkCovered('0001-feature', 'performance', '');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.performance.summary).toBe('Covered');
    });

    it('auto-starts interview if state file does not exist', async () => {
      // Do NOT call interviewStart first
      await interviewMarkCovered('0001-auto', 'architecture', 'Auto started');

      const state = readState(tmpDir, '0001-auto');
      expect(state).not.toBeNull();
      expect(state!.incrementId).toBe('0001-auto');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.architecture.summary).toBe('Auto started');
    });

    it('rejects unknown category name and exits', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await expect(
        interviewMarkCovered('0001-feature', 'nonexistent-cat', 'oops'),
      ).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown category: nonexistent-cat'),
      );
    });

    it('shows valid categories when rejecting unknown category', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await expect(
        interviewMarkCovered('0001-feature', 'invalid', 'x'),
      ).rejects.toThrow('process.exit');

      const errorOutput = consoleErrorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(errorOutput).toContain('Valid categories:');
      for (const cat of DEFAULT_CATEGORIES) {
        expect(errorOutput).toContain(cat);
      }
    });

    it('shows remaining categories after marking', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await interviewMarkCovered('0001-feature', 'architecture', 'Reviewed');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Remaining:');
      // Should NOT contain architecture in remaining list
      const remainingLine = consoleSpy.mock.calls
        .map(c => String(c[0]))
        .find(l => l.includes('Remaining:'));
      expect(remainingLine).toBeDefined();
      expect(remainingLine).not.toContain('architecture');
    });

    it('shows completion message when all categories covered', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      // Cover all but one
      for (const cat of DEFAULT_CATEGORIES.slice(0, -1)) {
        await interviewMarkCovered('0001-feature', cat, `Covered ${cat}`);
      }
      consoleSpy.mockClear();

      // Cover the last one
      await interviewMarkCovered(
        '0001-feature',
        DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1],
        'Final',
      );

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('All categories covered');
    });

    it('updates existing state file without overwriting other categories', async () => {
      await interviewStart('0001-feature');
      await interviewMarkCovered('0001-feature', 'architecture', 'Arch done');
      await interviewMarkCovered('0001-feature', 'security', 'Sec done');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.architecture.summary).toBe('Arch done');
      expect(covered.security.summary).toBe('Sec done');
    });

    it('exits if not in a SpecWeave project', async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(
        interviewMarkCovered('0001-feature', 'security', 'test'),
      ).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('stores a valid ISO timestamp in coveredAt', async () => {
      await interviewStart('0001-feature');
      await interviewMarkCovered('0001-feature', 'architecture', 'Reviewed');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<
        string,
        { coveredAt: string; summary: string }
      >;
      const parsed = new Date(covered.architecture.coveredAt);
      expect(parsed.getTime()).not.toBeNaN();
    });

    it('prints confirmation with category name and summary', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await interviewMarkCovered('0001-feature', 'integrations', 'API reviewed');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Marked integrations as covered');
      expect(output).toContain('API reviewed');
    });
  });

  // =========================================================================
  // interviewStatus (all)
  // =========================================================================

  describe('interviewStatus (all)', () => {
    it('shows all active interviews when no incrementId', async () => {
      // Create two interviews
      writeState(tmpDir, '0001-alpha', {
        incrementId: '0001-alpha',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: { architecture: { coveredAt: '2025-01-01T01:00:00.000Z', summary: 'Done' } },
      });
      writeState(tmpDir, '0002-beta', {
        incrementId: '0002-beta',
        startedAt: '2025-01-02T00:00:00.000Z',
        coveredCategories: {},
      });

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Active interviews');
      expect(output).toContain('0001-alpha');
      expect(output).toContain('0002-beta');
    });

    it('shows "No active interviews" when state dir is empty', async () => {
      // state dir exists but no interview files
      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No active interviews');
    });

    it('shows "No active interviews" when state dir does not exist', async () => {
      const freshDir = createTempProject({ createStateDir: false });
      mockFindProjectRoot.mockReturnValue(freshDir);

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No active interviews');

      fs.rmSync(freshDir, { recursive: true, force: true });
    });

    it('shows enforcement mode (advisory by default)', async () => {
      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Advisory');
    });

    it('shows enforcement mode (strict) when configured', async () => {
      const strictDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              enabled: true,
              enforcement: 'strict',
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(strictDir);

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('STRICT');

      fs.rmSync(strictDir, { recursive: true, force: true });
    });

    it('shows categories list from config', async () => {
      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Categories:');
      for (const cat of DEFAULT_CATEGORIES) {
        expect(output).toContain(cat);
      }
    });

    it('shows coverage count per interview', async () => {
      writeState(tmpDir, '0001-alpha', {
        incrementId: '0001-alpha',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {
          architecture: { coveredAt: '2025-01-01T01:00:00.000Z', summary: 'Done' },
          security: { coveredAt: '2025-01-01T02:00:00.000Z', summary: 'Done' },
        },
      });

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('2/6');
    });

    it('exits if not in a SpecWeave project', async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(interviewStatus()).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  // =========================================================================
  // interviewStatus (specific)
  // =========================================================================

  describe('interviewStatus (specific increment)', () => {
    it('shows specific increment status with [x] and [ ] markers', async () => {
      writeState(tmpDir, '0001-feature', {
        incrementId: '0001-feature',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {
          architecture: { coveredAt: '2025-01-01T01:00:00.000Z', summary: 'Arch done' },
          security: { coveredAt: '2025-01-01T02:00:00.000Z', summary: 'Sec done' },
        },
      });

      await interviewStatus('0001-feature');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('[x] architecture: Arch done');
      expect(output).toContain('[x] security: Sec done');
      expect(output).toContain('[ ] integrations');
      expect(output).toContain('[ ] ui-ux');
      expect(output).toContain('[ ] performance');
      expect(output).toContain('[ ] edge-cases');
    });

    it('shows "No interview started" for missing increment', async () => {
      await interviewStatus('9999-nonexistent');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No interview started for 9999-nonexistent');
    });

    it('suggests start command for missing increment', async () => {
      await interviewStatus('9999-nonexistent');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('specweave interview start 9999-nonexistent');
    });

    it('shows completion message when all covered', async () => {
      const allCovered: Record<string, { coveredAt: string; summary: string }> = {};
      for (const cat of DEFAULT_CATEGORIES) {
        allCovered[cat] = { coveredAt: '2025-01-01T01:00:00.000Z', summary: `${cat} done` };
      }

      writeState(tmpDir, '0001-complete', {
        incrementId: '0001-complete',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: allCovered,
      });

      await interviewStatus('0001-complete');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('All categories covered');
    });

    it('shows remaining count when not all covered', async () => {
      writeState(tmpDir, '0001-partial', {
        incrementId: '0001-partial',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {
          architecture: { coveredAt: '2025-01-01T01:00:00.000Z', summary: 'Done' },
        },
      });

      await interviewStatus('0001-partial');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('5 categories remaining');
    });

    it('shows startedAt timestamp', async () => {
      writeState(tmpDir, '0001-feature', {
        incrementId: '0001-feature',
        startedAt: '2025-06-15T10:30:00.000Z',
        coveredCategories: {},
      });

      await interviewStatus('0001-feature');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('2025-06-15T10:30:00.000Z');
    });
  });

  // =========================================================================
  // interviewClear
  // =========================================================================

  describe('interviewClear', () => {
    it('deletes interview state file', async () => {
      writeState(tmpDir, '0001-feature', {
        incrementId: '0001-feature',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {},
      });

      const statePath = path.join(tmpDir, '.specweave', 'state', 'interview-0001-feature.json');
      expect(fs.existsSync(statePath)).toBe(true);

      await interviewClear('0001-feature');

      expect(fs.existsSync(statePath)).toBe(false);
      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Interview state cleared for 0001-feature');
    });

    it('shows "No interview state found" for missing file', async () => {
      await interviewClear('9999-nonexistent');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No interview state found for 9999-nonexistent');
    });

    it('exits if not in a SpecWeave project', async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(interviewClear('0001-feature')).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  // =========================================================================
  // interviewCommand (router)
  // =========================================================================

  describe('interviewCommand', () => {
    it('routes "start" to interviewStart', async () => {
      await interviewCommand('start', '0001-feature');

      const state = readState(tmpDir, '0001-feature');
      expect(state).not.toBeNull();
      expect(state!.incrementId).toBe('0001-feature');
    });

    it('routes "mark-covered" to interviewMarkCovered', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await interviewCommand('mark-covered', '0001-feature', 'architecture', 'Reviewed');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.architecture.summary).toBe('Reviewed');
    });

    it('routes "mark" alias to interviewMarkCovered', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await interviewCommand('mark', '0001-feature', 'security', 'Checked');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.security.summary).toBe('Checked');
    });

    it('routes "cover" alias to interviewMarkCovered', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      await interviewCommand('cover', '0001-feature', 'performance', 'Profiled');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.performance.summary).toBe('Profiled');
    });

    it('routes "status" to interviewStatus', async () => {
      writeState(tmpDir, '0001-feature', {
        incrementId: '0001-feature',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {},
      });

      await interviewCommand('status', '0001-feature');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Interview: 0001-feature');
    });

    it('routes "status" without incrementId to show all', async () => {
      await interviewCommand('status');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Deep Interview Mode');
    });

    it('routes "clear" to interviewClear', async () => {
      writeState(tmpDir, '0001-feature', {
        incrementId: '0001-feature',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {},
      });

      await interviewCommand('clear', '0001-feature');

      const statePath = path.join(tmpDir, '.specweave', 'state', 'interview-0001-feature.json');
      expect(fs.existsSync(statePath)).toBe(false);
    });

    it('shows usage for unknown action', async () => {
      await interviewCommand('unknown-action');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Usage: specweave interview <action>');
      expect(output).toContain('start');
      expect(output).toContain('mark-covered');
      expect(output).toContain('status');
      expect(output).toContain('clear');
    });

    it('exits with error when start has no incrementId', async () => {
      await expect(interviewCommand('start')).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: specweave interview start'),
      );
    });

    it('exits with error when mark-covered has no category', async () => {
      await expect(interviewCommand('mark-covered', '0001-feature')).rejects.toThrow(
        'process.exit',
      );
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: specweave interview mark-covered'),
      );
    });

    it('exits with error when clear has no incrementId', async () => {
      await expect(interviewCommand('clear')).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: specweave interview clear'),
      );
    });

    it('passes empty string as summary when no summary arg for mark-covered', async () => {
      await interviewStart('0001-feature');
      consoleSpy.mockClear();

      // No 4th argument -> summary defaults to '' in the router -> 'Covered' in function
      await interviewCommand('mark-covered', '0001-feature', 'architecture');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.architecture.summary).toBe('Covered');
    });
  });

  // =========================================================================
  // Config integration
  // =========================================================================

  describe('config integration', () => {
    it('uses custom categories from config.json', async () => {
      const customDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              categories: ['data-model', 'auth', 'deployment'],
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(customDir);

      await interviewStart('0001-custom');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('[ ] data-model');
      expect(output).toContain('[ ] auth');
      expect(output).toContain('[ ] deployment');
      // Should NOT contain defaults
      expect(output).not.toContain('[ ] architecture');
      expect(output).not.toContain('[ ] integrations');

      fs.rmSync(customDir, { recursive: true, force: true });
    });

    it('uses default categories when no config exists', async () => {
      const noConfigDir = createTempProject({ createStateDir: true });
      // No config.json written
      mockFindProjectRoot.mockReturnValue(noConfigDir);

      await interviewStart('0001-default');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      for (const cat of DEFAULT_CATEGORIES) {
        expect(output).toContain(`[ ] ${cat}`);
      }

      fs.rmSync(noConfigDir, { recursive: true, force: true });
    });

    it('uses default categories when config has no deepInterview section', async () => {
      const emptyConfigDir = createTempProject({
        createStateDir: true,
        config: { version: '1.0.0' },
      });
      mockFindProjectRoot.mockReturnValue(emptyConfigDir);

      await interviewStart('0001-empty-cfg');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      for (const cat of DEFAULT_CATEGORIES) {
        expect(output).toContain(`[ ] ${cat}`);
      }

      fs.rmSync(emptyConfigDir, { recursive: true, force: true });
    });

    it('detects strict enforcement from config', async () => {
      const strictDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              enabled: true,
              enforcement: 'strict',
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(strictDir);

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('STRICT');
      expect(output).toContain('blocks spec creation');

      fs.rmSync(strictDir, { recursive: true, force: true });
    });

    it('defaults to advisory mode', async () => {
      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Advisory');
    });

    it('is advisory when enabled=true but enforcement is not strict', async () => {
      const warnDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              enabled: true,
              enforcement: 'warn',
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(warnDir);

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Advisory');

      fs.rmSync(warnDir, { recursive: true, force: true });
    });

    it('is advisory when enforcement=strict but enabled=false', async () => {
      const disabledDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              enabled: false,
              enforcement: 'strict',
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(disabledDir);

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Advisory');

      fs.rmSync(disabledDir, { recursive: true, force: true });
    });

    it('validates custom categories when marking covered', async () => {
      const customDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              categories: ['data-model', 'auth'],
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(customDir);

      await interviewStart('0001-custom');
      consoleSpy.mockClear();

      // Default category should be rejected
      await expect(
        interviewMarkCovered('0001-custom', 'architecture', 'test'),
      ).rejects.toThrow('process.exit');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown category: architecture'),
      );

      fs.rmSync(customDir, { recursive: true, force: true });
    });

    it('accepts custom categories when marking covered', async () => {
      const customDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              categories: ['data-model', 'auth'],
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(customDir);

      await interviewStart('0001-custom');
      consoleSpy.mockClear();

      await interviewMarkCovered('0001-custom', 'data-model', 'Schema reviewed');

      const state = readState(customDir, '0001-custom');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered['data-model'].summary).toBe('Schema reviewed');

      fs.rmSync(customDir, { recursive: true, force: true });
    });

    it('uses custom categories for completion detection', async () => {
      const customDir = createTempProject({
        createStateDir: true,
        config: {
          planning: {
            deepInterview: {
              categories: ['alpha', 'beta'],
            },
          },
        },
      });
      mockFindProjectRoot.mockReturnValue(customDir);

      await interviewStart('0001-custom');
      await interviewMarkCovered('0001-custom', 'alpha', 'Done');
      consoleSpy.mockClear();
      await interviewMarkCovered('0001-custom', 'beta', 'Done');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('All categories covered');

      fs.rmSync(customDir, { recursive: true, force: true });
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('handles malformed config.json gracefully (falls back to defaults)', async () => {
      const badConfigDir = createTempProject({ createStateDir: true });
      fs.writeFileSync(
        path.join(badConfigDir, '.specweave', 'config.json'),
        'not valid json {{{',
      );
      mockFindProjectRoot.mockReturnValue(badConfigDir);

      await interviewStart('0001-bad-config');

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      for (const cat of DEFAULT_CATEGORIES) {
        expect(output).toContain(`[ ] ${cat}`);
      }

      fs.rmSync(badConfigDir, { recursive: true, force: true });
    });

    it('handles marking same category twice (overwrites)', async () => {
      await interviewStart('0001-feature');
      await interviewMarkCovered('0001-feature', 'architecture', 'First pass');
      await interviewMarkCovered('0001-feature', 'architecture', 'Second pass');

      const state = readState(tmpDir, '0001-feature');
      const covered = state!.coveredCategories as Record<string, { summary: string }>;
      expect(covered.architecture.summary).toBe('Second pass');
    });

    it('non-interview files in state dir are not listed as interviews', async () => {
      // Write a non-interview file to state dir
      fs.writeFileSync(
        path.join(tmpDir, '.specweave', 'state', 'auto-mode.json'),
        JSON.stringify({ active: true }),
      );
      writeState(tmpDir, '0001-real', {
        incrementId: '0001-real',
        startedAt: '2025-01-01T00:00:00.000Z',
        coveredCategories: {},
      });

      await interviewStatus();

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('0001-real');
      // auto-mode.json should not show up
      expect(output).not.toContain('auto-mode');
    });

    it('interview state path uses correct format', async () => {
      await interviewStart('0042-my-feature');

      const expectedPath = path.join(
        tmpDir,
        '.specweave',
        'state',
        'interview-0042-my-feature.json',
      );
      expect(fs.existsSync(expectedPath)).toBe(true);
    });
  });
});
