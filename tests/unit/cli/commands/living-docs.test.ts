/**
 * Unit tests for living-docs command
 *
 * Tests the livingDocsCommand handler and all internal helpers:
 * - livingDocsCommand option handling (--resume, --depth, --force, --full-scan)
 * - handleResume (job lookup, checkpoint loading, re-launch)
 * - collectConfiguration (flags-only, interactive, full-scan)
 * - displayLaunchSuccess formatting
 * - getOrphanedLivingDocsJobs / getRunningLivingDocsJob filtering
 * - promptResumeOrphanedJob interactive flow
 * - loadSavedLivingDocsConfig (load + delete one-time config)
 * - getTimeAgo / findJobByPrefix helpers
 * - runChunkedLivingDocs (auto mode chunked execution)
 * - Error handling and edge cases
 *
 * Strategy: All internal helpers are exercised through livingDocsCommand with mocked deps.
 * console.log/console.error output is captured and asserted.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BackgroundJob, JobProgress, LivingDocsJobConfig } from '../../../../src/core/background/types.js';

// ── Hoisted mocks ──────────────────────────────────────────────────────

const {
  mockGetJobManager,
  mockLaunchLivingDocsJob,
  mockGetOrphanedJobs,
  mockIsJobRunning,
  mockExistsSync,
  mockReadFileSync,
  mockUnlinkSync,
  mockDetectBrownfield,
  mockEstimateDuration,
  mockIsClaudeCodeAvailable,
  mockGetClaudeCodeStatus,
  mockGetAvailableProviders,
  mockConfirm,
  mockSelect,
  mockInput,
  mockGetJobs,
  mockGetJob,
  mockStartJob,
  mockCreateJob,
  mockExecuteLivingDocsChunk,
  mockGetProgressSummary,
  mockLoadLivingDocsCheckpoint,
} = vi.hoisted(() => {
  const _mockGetJobs = vi.fn().mockReturnValue([]);
  const _mockGetJob = vi.fn().mockReturnValue(null);
  const _mockStartJob = vi.fn();
  const _mockCreateJob = vi.fn();

  return {
    mockGetJobManager: vi.fn().mockReturnValue({
      getJobs: _mockGetJobs,
      getJob: _mockGetJob,
      startJob: _mockStartJob,
      createJob: _mockCreateJob,
    }),
    mockLaunchLivingDocsJob: vi.fn().mockResolvedValue({
      job: {
        id: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
        type: 'living-docs-builder',
        status: 'running',
        progress: { current: 0, total: 100, percentage: 0, itemsCompleted: [], itemsFailed: [] },
        startedAt: new Date(),
        updatedAt: new Date(),
        config: { type: 'living-docs-builder', projectPath: '/tmp/test' },
      } as BackgroundJob,
      pid: 12345,
      isBackground: true,
    }),
    mockGetOrphanedJobs: vi.fn().mockReturnValue([]),
    mockIsJobRunning: vi.fn().mockReturnValue(false),
    mockExistsSync: vi.fn().mockReturnValue(true),
    mockReadFileSync: vi.fn().mockReturnValue('{}'),
    mockUnlinkSync: vi.fn(),
    mockDetectBrownfield: vi.fn().mockReturnValue(true),
    mockEstimateDuration: vi.fn().mockReturnValue('~5 min'),
    mockIsClaudeCodeAvailable: vi.fn().mockReturnValue(false),
    mockGetClaudeCodeStatus: vi.fn().mockResolvedValue({ available: false, error: 'Not installed' }),
    mockGetAvailableProviders: vi.fn().mockResolvedValue([]),
    mockConfirm: vi.fn().mockResolvedValue(true),
    mockSelect: vi.fn().mockResolvedValue('quick'),
    mockInput: vi.fn().mockResolvedValue(''),
    mockGetJobs: _mockGetJobs,
    mockGetJob: _mockGetJob,
    mockStartJob: _mockStartJob,
    mockCreateJob: _mockCreateJob,
    mockExecuteLivingDocsChunk: vi.fn().mockResolvedValue({ status: 'all_complete' }),
    mockGetProgressSummary: vi.fn().mockReturnValue('Phase 3/8'),
    mockLoadLivingDocsCheckpoint: vi.fn().mockReturnValue(null),
  };
});

vi.mock('../../../../src/core/background/index.js', () => ({
  getJobManager: mockGetJobManager,
  launchLivingDocsJob: mockLaunchLivingDocsJob,
  getOrphanedJobs: mockGetOrphanedJobs,
  isJobRunning: mockIsJobRunning,
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  unlinkSync: mockUnlinkSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    unlinkSync: mockUnlinkSync,
  },
}));

vi.mock('../../../../src/cli/helpers/init/living-docs-preflight.js', () => ({
  detectBrownfield: mockDetectBrownfield,
  estimateDuration: mockEstimateDuration,
}));

vi.mock('../../../../src/core/llm/provider-factory.js', () => ({
  isClaudeCodeAvailable: mockIsClaudeCodeAvailable,
  getClaudeCodeStatus: mockGetClaudeCodeStatus,
  getAvailableProviders: mockGetAvailableProviders,
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: mockConfirm,
  select: mockSelect,
  input: mockInput,
}));

vi.mock('../../../../src/core/background/living-docs-executor.js', () => ({
  executeLivingDocsChunk: mockExecuteLivingDocsChunk,
  getProgressSummary: mockGetProgressSummary,
  loadLivingDocsCheckpoint: mockLoadLivingDocsCheckpoint,
}));

// ── Import under test (after mocks) ────────────────────────────────────

import { livingDocsCommand } from '../../../../src/cli/commands/living-docs.js';
import type { LivingDocsOptions } from '../../../../src/cli/commands/living-docs.js';

// ── Helpers ─────────────────────────────────────────────────────────────

function makeLivingDocsJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  const now = new Date();
  return {
    id: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
    type: 'living-docs-builder',
    status: 'running',
    progress: {
      current: 50,
      total: 100,
      percentage: 50,
      itemsCompleted: [],
      itemsFailed: [],
    },
    startedAt: new Date(now.getTime() - 120_000),
    updatedAt: now,
    config: {
      type: 'living-docs-builder',
      projectPath: '/tmp/test',
      userInputs: {
        analysisDepth: 'quick',
        priorityAreas: [],
        additionalSources: [],
        knownPainPoints: [],
      },
    } as LivingDocsJobConfig,
    ...overrides,
  };
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;
let cwdSpy: ReturnType<typeof vi.spyOn>;

// ── Tests ───────────────────────────────────────────────────────────────

describe('livingDocsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/tmp/test');

    // Defaults: .specweave exists, brownfield, no orphans, no running jobs
    mockExistsSync.mockReturnValue(true);
    mockDetectBrownfield.mockReturnValue(true);
    mockGetOrphanedJobs.mockReturnValue([]);
    mockGetJobs.mockReturnValue([]);
    mockGetJob.mockReturnValue(null);
    mockIsJobRunning.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('{}');
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  // ── Initialization guard ──────────────────────────────────────────

  describe('initialization guard', () => {
    it('should exit early if .specweave directory does not exist', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return false;
        return true;
      });

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No SpecWeave project found');
      expect(output).toContain('specweave init');
      expect(mockLaunchLivingDocsJob).not.toHaveBeenCalled();
    });
  });

  // ── Resume flag ───────────────────────────────────────────────────

  describe('--resume flag', () => {
    it('should look up job by ID and resume it', async () => {
      const job = makeLivingDocsJob({
        status: 'paused',
        progress: { current: 30, total: 100, percentage: 30, itemsCompleted: [], itemsFailed: [] },
      });
      mockGetJob.mockReturnValue(job);

      // existsSync: .specweave=true, checkpoint=false, config=true
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('checkpoints')) return false;
        return true;
      });

      const jobConfig: LivingDocsJobConfig = {
        type: 'living-docs-builder',
        projectPath: '/tmp/test',
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(jobConfig));

      await livingDocsCommand({ resume: job.id });

      expect(mockGetJob).toHaveBeenCalledWith(job.id);
      expect(mockStartJob).toHaveBeenCalledWith(job.id);
      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should display error when job is not found', async () => {
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([]);

      await livingDocsCommand({ resume: 'nonexistent-id' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job not found');
    });

    it('should reject resume of non-living-docs job', async () => {
      const importJob = makeLivingDocsJob({ type: 'import-issues' as any });
      mockGetJob.mockReturnValue(importJob);

      await livingDocsCommand({ resume: importJob.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('not a living-docs job');
    });

    it('should notify user if job is already running', async () => {
      const job = makeLivingDocsJob({ status: 'running' });
      mockGetJob.mockReturnValue(job);
      mockIsJobRunning.mockReturnValue(true);

      await livingDocsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already running');
      expect(mockLaunchLivingDocsJob).not.toHaveBeenCalled();
    });

    it('should notify user if job is already completed', async () => {
      const job = makeLivingDocsJob({ status: 'completed' });
      mockGetJob.mockReturnValue(job);

      await livingDocsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already completed');
    });

    it('should notify user if job is completed_with_warnings', async () => {
      const job = makeLivingDocsJob({ status: 'completed_with_warnings' });
      mockGetJob.mockReturnValue(job);

      await livingDocsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already completed');
    });

    it('should find job by prefix if direct lookup fails', async () => {
      const job = makeLivingDocsJob({
        id: 'abcd1234-5678-90ab-cdef-1234567890ab',
        status: 'paused',
      });
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job]);

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('checkpoints')) return false;
        return true;
      });

      const jobConfig: LivingDocsJobConfig = {
        type: 'living-docs-builder',
        projectPath: '/tmp/test',
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(jobConfig));

      await livingDocsCommand({ resume: 'abcd1234' });

      expect(mockStartJob).toHaveBeenCalledWith(job.id);
      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should display checkpoint info when resuming', async () => {
      const job = makeLivingDocsJob({ status: 'paused' });
      mockGetJob.mockReturnValue(job);

      const checkpoint = { phase: 'deep-dive', currentModule: 'auth' };
      let callCount = 0;
      mockExistsSync.mockImplementation((p: string) => {
        return true; // all paths exist
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('checkpoints')) {
          return JSON.stringify(checkpoint);
        }
        // Return job config for config.json
        return JSON.stringify({
          type: 'living-docs-builder',
          projectPath: '/tmp/test',
          userInputs: {
            analysisDepth: 'quick',
            priorityAreas: [],
            additionalSources: [],
            knownPainPoints: [],
          },
        });
      });

      await livingDocsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('phase=deep-dive');
      expect(output).toContain('module=auth');
    });

    it('should fail when config file is missing for resume', async () => {
      const job = makeLivingDocsJob({ status: 'paused' });
      mockGetJob.mockReturnValue(job);

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json') && p.includes('jobs')) return false;
        if (typeof p === 'string' && p.includes('checkpoints')) return false;
        return true;
      });

      await livingDocsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Cannot resume');
      expect(output).toContain('config not found');
    });

    it('should handle resume launch failure gracefully', async () => {
      const job = makeLivingDocsJob({ status: 'paused' });
      mockGetJob.mockReturnValue(job);

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('checkpoints')) return false;
        return true;
      });

      const jobConfig: LivingDocsJobConfig = {
        type: 'living-docs-builder',
        projectPath: '/tmp/test',
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(jobConfig));
      mockLaunchLivingDocsJob.mockRejectedValueOnce(new Error('Spawn failed'));

      await livingDocsCommand({ resume: job.id });

      const output = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Failed to resume');
      expect(output).toContain('Spawn failed');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should display foreground warning when background mode unavailable', async () => {
      const job = makeLivingDocsJob({ status: 'paused' });
      mockGetJob.mockReturnValue(job);

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('checkpoints')) return false;
        return true;
      });

      const jobConfig: LivingDocsJobConfig = {
        type: 'living-docs-builder',
        projectPath: '/tmp/test',
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(jobConfig));
      mockLaunchLivingDocsJob.mockResolvedValueOnce({
        job: makeLivingDocsJob(),
        pid: undefined,
        isBackground: false,
      });

      await livingDocsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('foreground');
    });
  });

  // ── Orphaned jobs detection ───────────────────────────────────────

  describe('orphaned jobs detection', () => {
    it('should prompt to resume orphaned living-docs jobs', async () => {
      const orphanedJob = makeLivingDocsJob({
        id: 'orphan111-2222-3333-4444-555566667777',
        status: 'running',
        progress: { current: 70, total: 100, percentage: 70, itemsCompleted: [], itemsFailed: [] },
      });
      mockGetOrphanedJobs.mockReturnValue([orphanedJob]);

      // User selects "Start fresh"
      mockSelect.mockResolvedValueOnce('new');

      // After skipping orphan, no running job, brownfield detected
      // => goes to collectConfiguration, so we need saved config or interactive
      // Return saved config
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });

      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      expect(mockSelect).toHaveBeenCalled();
      const selectArgs = mockSelect.mock.calls[0][0];
      expect(selectArgs.message).toContain('What would you like to do');
    });

    it('should resume selected orphaned job', async () => {
      const orphanedJob = makeLivingDocsJob({
        id: 'orphan111-2222-3333-4444-555566667777',
        status: 'running',
      });
      mockGetOrphanedJobs.mockReturnValue([orphanedJob]);

      // User selects the orphaned job to resume
      mockSelect.mockResolvedValueOnce(orphanedJob.id);

      // handleResume path
      mockGetJob.mockReturnValue(orphanedJob);
      mockIsJobRunning.mockReturnValue(true);

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already running');
    });

    it('should skip orphan prompt when --force is used', async () => {
      const orphanedJob = makeLivingDocsJob({ status: 'running' });
      mockGetOrphanedJobs.mockReturnValue([orphanedJob]);

      // With --force, should NOT prompt about orphaned jobs
      // But there's a running job check after orphan check
      mockGetJobs.mockReturnValue([]);

      // Need saved config
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });

      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({ force: true });

      // Select should NOT have been called for orphan prompt
      // (it may be called for configuration though)
      // The key is that we got past orphan detection
      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should handle user cancelling orphan prompt', async () => {
      const orphanedJob = makeLivingDocsJob({ status: 'running' });
      mockGetOrphanedJobs.mockReturnValue([orphanedJob]);

      // User selects "Cancel" - returns null from promptResumeOrphanedJob
      mockSelect.mockResolvedValueOnce('cancel');

      // After cancel, flow continues to running job check, brownfield, etc.
      mockGetJobs.mockReturnValue([]);

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });

      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      // Should continue past orphan detection and eventually launch
      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });
  });

  // ── Running job detection ─────────────────────────────────────────

  describe('running job detection', () => {
    it('should notify and exit if a living-docs job is already running', async () => {
      const runningJob = makeLivingDocsJob({ status: 'running' });
      mockGetJobs.mockReturnValue([runningJob]);
      mockIsJobRunning.mockReturnValue(true);

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already running');
      expect(output).toContain(runningJob.id.slice(0, 8));
      expect(mockLaunchLivingDocsJob).not.toHaveBeenCalled();
    });

    it('should not block if running job is of different type', async () => {
      const importJob = makeLivingDocsJob({
        type: 'import-issues',
        status: 'running',
      });
      mockGetJobs.mockReturnValue([importJob]);
      mockIsJobRunning.mockReturnValue(true);

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should not block if job is living-docs but not actually running (stale)', async () => {
      const staleJob = makeLivingDocsJob({ status: 'running' });
      mockGetJobs.mockReturnValue([staleJob]);
      mockIsJobRunning.mockReturnValue(false); // Process is dead

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });
  });

  // ── Greenfield detection ──────────────────────────────────────────

  describe('greenfield detection', () => {
    it('should exit early for greenfield projects without --force', async () => {
      mockDetectBrownfield.mockReturnValue(false);

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No existing code detected');
      expect(output).toContain('greenfield');
      expect(mockLaunchLivingDocsJob).not.toHaveBeenCalled();
    });

    it('should proceed for greenfield projects with --force', async () => {
      mockDetectBrownfield.mockReturnValue(false);

      // Provide saved config so we don't need interactive
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({ force: true });

      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should proceed for greenfield projects with --full-scan', async () => {
      mockDetectBrownfield.mockReturnValue(false);

      // No saved config - will go to collectConfiguration with fullScan
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return false;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });

      mockGetClaudeCodeStatus.mockResolvedValue({ available: true });

      await livingDocsCommand({ fullScan: true });

      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should suggest --force and --full-scan in greenfield message', async () => {
      mockDetectBrownfield.mockReturnValue(false);

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('--force');
      expect(output).toContain('--full-scan');
    });
  });

  // ── Saved config loading ──────────────────────────────────────────

  describe('saved config loading', () => {
    it('should use saved config from init and delete it after loading', async () => {
      const savedConfig = {
        userInputs: {
          analysisDepth: 'standard',
          priorityAreas: ['auth', 'payments'],
          additionalSources: ['docs/'],
          knownPainPoints: [],
        },
      };

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(savedConfig));

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Using configuration from init');
      expect(output).toContain('standard');
      expect(output).toContain('auth, payments');
      expect(mockUnlinkSync).toHaveBeenCalled();
      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should fall back to interactive if saved config file does not exist', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return false;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });

      // Interactive mode: select depth, input priority, input sources, confirm
      mockSelect.mockResolvedValueOnce('quick');
      mockInput.mockResolvedValueOnce('');
      mockInput.mockResolvedValueOnce('');
      mockConfirm.mockResolvedValueOnce(true);

      await livingDocsCommand({});

      expect(mockSelect).toHaveBeenCalled();
      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });

    it('should handle corrupt saved config gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) {
          return 'not valid json{{{';
        }
        return '{}';
      });

      // Falls back to interactive since loadSavedLivingDocsConfig returns null
      mockSelect.mockResolvedValueOnce('quick');
      mockInput.mockResolvedValueOnce('');
      mockInput.mockResolvedValueOnce('');
      mockConfirm.mockResolvedValueOnce(true);

      await livingDocsCommand({});

      // Should still work (fallback to interactive)
      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
    });
  });

  // ── collectConfiguration ──────────────────────────────────────────

  describe('collectConfiguration', () => {
    beforeEach(() => {
      // No saved config
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return false;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
    });

    it('should use flags when --depth is provided', async () => {
      await livingDocsCommand({ depth: 'standard', priority: 'auth,payments', sources: 'docs/,wiki/' });

      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
      const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
      expect(callArgs.userInputs.analysisDepth).toBe('standard');
      expect(callArgs.userInputs.priorityAreas).toEqual(['auth', 'payments']);
      expect(callArgs.userInputs.additionalSources).toEqual(['docs/', 'wiki/']);
    });

    it('should handle --depth with empty priority and sources', async () => {
      await livingDocsCommand({ depth: 'quick' });

      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
      const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
      expect(callArgs.userInputs.analysisDepth).toBe('quick');
      expect(callArgs.userInputs.priorityAreas).toEqual([]);
      expect(callArgs.userInputs.additionalSources).toEqual([]);
    });

    describe('--full-scan mode', () => {
      it('should use deep-native when Claude Code is available', async () => {
        mockGetClaudeCodeStatus.mockResolvedValue({ available: true });

        await livingDocsCommand({ fullScan: true });

        expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
        const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
        expect(callArgs.userInputs.analysisDepth).toBe('deep-native');
      });

      it('should fail when Claude Code is not available', async () => {
        mockGetClaudeCodeStatus.mockResolvedValue({ available: false, error: 'Not installed' });

        await livingDocsCommand({ fullScan: true });

        const output = logSpy.mock.calls.map(c => c[0]).join('\n');
        expect(output).toContain('Full Scan requires Claude MAX');
        expect(mockLaunchLivingDocsJob).not.toHaveBeenCalled();
      });
    });

    describe('interactive mode', () => {
      it('should collect depth, priority, sources via prompts', async () => {
        mockGetClaudeCodeStatus.mockResolvedValue({ available: false, error: 'Not installed' });

        mockSelect.mockResolvedValueOnce('standard');
        mockInput.mockResolvedValueOnce('auth, payments');
        mockInput.mockResolvedValueOnce('docs/');
        mockConfirm.mockResolvedValueOnce(true);

        await livingDocsCommand({});

        expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
        const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
        expect(callArgs.userInputs.analysisDepth).toBe('standard');
        expect(callArgs.userInputs.priorityAreas).toEqual(['auth', 'payments']);
        expect(callArgs.userInputs.additionalSources).toEqual(['docs/']);
      });

      it('should cancel when user declines confirmation', async () => {
        mockSelect.mockResolvedValueOnce('quick');
        mockInput.mockResolvedValueOnce('');
        mockInput.mockResolvedValueOnce('');
        mockConfirm.mockResolvedValueOnce(false);

        await livingDocsCommand({});

        const output = logSpy.mock.calls.map(c => c[0]).join('\n');
        expect(output).toContain('Cancelled');
        expect(mockLaunchLivingDocsJob).not.toHaveBeenCalled();
      });

      it('should filter empty strings from comma-separated inputs', async () => {
        mockSelect.mockResolvedValueOnce('quick');
        mockInput.mockResolvedValueOnce(',, auth ,,');
        mockInput.mockResolvedValueOnce('');
        mockConfirm.mockResolvedValueOnce(true);

        await livingDocsCommand({});

        const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
        expect(callArgs.userInputs.priorityAreas).toEqual(['auth']);
      });

      it('should show deep-native as recommended when Claude Code is available', async () => {
        mockGetClaudeCodeStatus.mockResolvedValue({ available: true });

        mockSelect.mockResolvedValueOnce('deep-native');
        mockInput.mockResolvedValueOnce('');
        mockInput.mockResolvedValueOnce('');
        mockConfirm.mockResolvedValueOnce(true);

        await livingDocsCommand({});

        // Verify the select was called with deep-native choices
        const selectCall = mockSelect.mock.calls[0][0];
        expect(selectCall.default).toBe('deep-native');
      });

      it('should default to quick when Claude Code is not available', async () => {
        mockGetClaudeCodeStatus.mockResolvedValue({ available: false, error: 'Not installed' });

        mockSelect.mockResolvedValueOnce('quick');
        mockInput.mockResolvedValueOnce('');
        mockInput.mockResolvedValueOnce('');
        mockConfirm.mockResolvedValueOnce(true);

        await livingDocsCommand({});

        const selectCall = mockSelect.mock.calls[0][0];
        expect(selectCall.default).toBe('quick');
      });
    });
  });

  // ── dependsOn parsing ─────────────────────────────────────────────

  describe('dependsOn parsing', () => {
    it('should parse comma-separated depends-on job IDs', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({ dependsOn: 'job-1, job-2, job-3' });

      const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
      expect(callArgs.dependsOn).toEqual(['job-1', 'job-2', 'job-3']);
    });

    it('should pass undefined when no depends-on specified', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
      expect(callArgs.dependsOn).toBeUndefined();
    });
  });

  // ── Auto mode (chunked execution) ─────────────────────────────────

  describe('auto mode (chunked execution)', () => {
    beforeEach(() => {
      // auto-mode.json exists
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('auto-mode.json')) return true;
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));
    });

    it('should run chunked execution in auto mode', async () => {
      mockExecuteLivingDocsChunk.mockResolvedValue({ status: 'all_complete' });
      mockLoadLivingDocsCheckpoint.mockReturnValue(null);

      await livingDocsCommand({});

      expect(mockExecuteLivingDocsChunk).toHaveBeenCalled();
      expect(mockLaunchLivingDocsJob).not.toHaveBeenCalled();

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Auto Mode');
    });

    it('should display all_complete message', async () => {
      mockExecuteLivingDocsChunk.mockResolvedValue({ status: 'all_complete' });
      mockLoadLivingDocsCheckpoint.mockReturnValue(null);

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('All Living Docs Phases Complete');
    });

    it('should display phase_complete message with next phase info', async () => {
      mockExecuteLivingDocsChunk.mockResolvedValue({
        status: 'phase_complete',
        currentPhase: 3,
        nextPhase: 4,
      });
      mockLoadLivingDocsCheckpoint.mockReturnValue(null);

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Phase 3 Complete');
      expect(output).toContain('Next: Phase 4');
    });

    it('should display time_limit message', async () => {
      mockExecuteLivingDocsChunk.mockResolvedValue({
        status: 'time_limit',
        currentPhase: 5,
      });
      mockLoadLivingDocsCheckpoint.mockReturnValue(null);

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Time Limit Reached');
      expect(output).toContain('Phase 5');
    });

    it('should resume from checkpoint when available', async () => {
      const checkpoint = {
        phase: 'deep-dive',
        phaseProgress: {},
        intermediateOutputs: {},
        lastUpdated: new Date().toISOString(),
      };
      mockLoadLivingDocsCheckpoint.mockReturnValue(checkpoint);
      mockExecuteLivingDocsChunk.mockResolvedValue({ status: 'all_complete' });

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Resuming from checkpoint');
      expect(mockGetProgressSummary).toHaveBeenCalledWith(checkpoint);
    });

    it('should handle chunk execution failure', async () => {
      mockExecuteLivingDocsChunk.mockRejectedValue(new Error('Chunk failed'));
      mockLoadLivingDocsCheckpoint.mockReturnValue(null);

      await livingDocsCommand({});

      const output = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Failed to execute living docs chunk');
      expect(output).toContain('Chunk failed');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ── Background launch (non-auto mode) ─────────────────────────────

  describe('background launch', () => {
    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));
    });

    it('should launch background job and display success info', async () => {
      await livingDocsCommand({});

      expect(mockLaunchLivingDocsJob).toHaveBeenCalled();
      const callArgs = mockLaunchLivingDocsJob.mock.calls[0][0];
      expect(callArgs.foreground).toBe(false);

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Living Docs Builder launched');
      expect(output).toContain('Job ID');
    });

    it('should display PID and monitor commands for background job', async () => {
      mockLaunchLivingDocsJob.mockResolvedValueOnce({
        job: makeLivingDocsJob(),
        pid: 99999,
        isBackground: true,
      });

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('99999');
      expect(output).toContain('specweave jobs --follow');
      expect(output).toContain('specweave jobs --logs');
    });

    it('should display foreground warning when background unavailable', async () => {
      mockLaunchLivingDocsJob.mockResolvedValueOnce({
        job: makeLivingDocsJob(),
        pid: undefined,
        isBackground: false,
      });

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Running in foreground');
    });

    it('should display priority areas in success output', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'standard',
          priorityAreas: ['auth', 'api'],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('auth, api');
    });

    it('should display output paths in success message', async () => {
      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('SUGGESTIONS.md');
      expect(output).toContain('ENTERPRISE-HEALTH.md');
    });

    it('should handle launch failure gracefully', async () => {
      mockLaunchLivingDocsJob.mockRejectedValueOnce(new Error('Failed to spawn'));

      await livingDocsCommand({});

      const output = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Failed to launch Living Docs Builder');
      expect(output).toContain('Failed to spawn');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error thrown objects in launch failure', async () => {
      mockLaunchLivingDocsJob.mockRejectedValueOnce('string error');

      await livingDocsCommand({});

      const output = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('string error');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ── displayLaunchSuccess formatting ───────────────────────────────

  describe('displayLaunchSuccess (via integration)', () => {
    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
    });

    it('should display depth in launch output', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'deep-native',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      mockLaunchLivingDocsJob.mockResolvedValueOnce({
        job: makeLivingDocsJob(),
        pid: 12345,
        isBackground: true,
      });

      await livingDocsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('deep-native');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should use process.cwd() as project path', async () => {
      cwdSpy.mockReturnValue('/custom/project/path');

      // Make it exit early (no .specweave)
      mockExistsSync.mockReturnValue(false);

      await livingDocsCommand({});

      expect(cwdSpy).toHaveBeenCalled();
    });

    it('should handle orphaned job with zero total progress', async () => {
      const orphanedJob = makeLivingDocsJob({
        id: 'zero-prog-1111-2222-3333-444455556666',
        status: 'running',
        progress: {
          current: 0,
          total: 0,
          percentage: 0,
          itemsCompleted: [],
          itemsFailed: [],
        },
      });
      mockGetOrphanedJobs.mockReturnValue([orphanedJob]);

      // User selects 'new'
      mockSelect.mockResolvedValueOnce('new');

      // Continue to launch
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      // Should show 0% without crashing
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('0%');
    });

    it('should handle resume with checkpoint parse error gracefully', async () => {
      const job = makeLivingDocsJob({ status: 'paused' });
      mockGetJob.mockReturnValue(job);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('checkpoints')) {
          return 'corrupt json{{{';
        }
        return JSON.stringify({
          type: 'living-docs-builder',
          projectPath: '/tmp/test',
          userInputs: {
            analysisDepth: 'quick',
            priorityAreas: [],
            additionalSources: [],
            knownPainPoints: [],
          },
        });
      });

      await livingDocsCommand({ resume: job.id });

      // Should still proceed (ignoring parse error)
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Resuming');
      expect(output).toContain('beginning'); // Falls back to 'beginning' on parse error
    });

    it('should handle multiple orphaned jobs in prompt', async () => {
      const job1 = makeLivingDocsJob({
        id: 'aaaa1111-2222-3333-4444-555566667777',
        progress: { current: 30, total: 100, percentage: 30, itemsCompleted: [], itemsFailed: [] },
      });
      const job2 = makeLivingDocsJob({
        id: 'bbbb1111-2222-3333-4444-555566667777',
        progress: { current: 80, total: 100, percentage: 80, itemsCompleted: [], itemsFailed: [] },
      });
      mockGetOrphanedJobs.mockReturnValue([job1, job2]);

      // User selects 'new'
      mockSelect.mockResolvedValueOnce('new');

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('living-docs-config.json')) return true;
        if (typeof p === 'string' && p.includes('auto-mode.json')) return false;
        return true;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        userInputs: {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        },
      }));

      await livingDocsCommand({});

      // Should show both orphaned jobs in the select choices
      const selectArgs = mockSelect.mock.calls[0][0];
      expect(selectArgs.choices.length).toBe(4); // 2 jobs + "Start fresh" + "Cancel"
    });
  });
});
