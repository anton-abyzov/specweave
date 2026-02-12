/**
 * Unit tests for the jobs command
 *
 * Tests the jobsCommand function and its internal helpers:
 * - formatDuration, getTimeAgo, createProgressBar, formatStatus
 * - findJobByPrefix, getJobProvider
 * - jobsCommand option handling (--kill, --logs, --id, --resume, list)
 *
 * Strategy: All internal helpers are exercised through jobsCommand with mocked deps.
 * console.log/console.error output is captured and asserted.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BackgroundJob, JobProgress } from '../../../../src/core/background/types.js';

// ── Hoisted mocks ──────────────────────────────────────────────────────

const {
  mockGetJobManager,
  mockIsJobRunning,
  mockKillJob,
  mockGetJobLog,
  mockGetJobResult,
  mockLaunchImportJob,
  mockExistsSync,
  mockReadFileSync,
  mockGetJobs,
  mockGetJob,
  mockStartJob,
} = vi.hoisted(() => {
  const _mockGetJobs = vi.fn().mockReturnValue([]);
  const _mockGetJob = vi.fn().mockReturnValue(null);
  const _mockStartJob = vi.fn();

  return {
    mockGetJobManager: vi.fn().mockReturnValue({
      getJobs: _mockGetJobs,
      getJob: _mockGetJob,
      startJob: _mockStartJob,
    }),
    mockIsJobRunning: vi.fn().mockReturnValue(false),
    mockKillJob: vi.fn().mockReturnValue(true),
    mockGetJobLog: vi.fn().mockReturnValue(''),
    mockGetJobResult: vi.fn().mockReturnValue(null),
    mockLaunchImportJob: vi.fn().mockResolvedValue({ isBackground: true, pid: 12345 }),
    mockExistsSync: vi.fn().mockReturnValue(true),
    mockReadFileSync: vi.fn().mockReturnValue('12345'),
    mockGetJobs: _mockGetJobs,
    mockGetJob: _mockGetJob,
    mockStartJob: _mockStartJob,
  };
});

vi.mock('../../../../src/core/background/index.js', () => ({
  getJobManager: mockGetJobManager,
  isJobRunning: mockIsJobRunning,
  killJob: mockKillJob,
  getJobLog: mockGetJobLog,
  getJobResult: mockGetJobResult,
  launchImportJob: mockLaunchImportJob,
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
}));

// ── Import under test (after mocks) ────────────────────────────────────

import { jobsCommand } from '../../../../src/cli/commands/jobs.js';

// ── Helpers ─────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  const now = new Date();
  return {
    id: 'abcdef12-3456-7890-abcd-ef1234567890',
    type: 'import-issues',
    status: 'running',
    progress: {
      current: 50,
      total: 100,
      percentage: 50,
      itemsCompleted: [],
      itemsFailed: [],
    },
    startedAt: new Date(now.getTime() - 120_000) as any, // 2 minutes ago
    updatedAt: now as any,
    config: { type: 'import-issues', provider: 'github', timeRangeMonths: 6, projectPath: '/tmp' },
    ...overrides,
  };
}

function makeProgress(overrides: Partial<JobProgress> = {}): JobProgress {
  return {
    current: 0,
    total: 100,
    percentage: 0,
    itemsCompleted: [],
    itemsFailed: [],
    ...overrides,
  };
}

// ── Test suites ─────────────────────────────────────────────────────────

describe('jobsCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let originalCwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    originalCwd = process.cwd();

    // Default: .specweave exists
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('12345');
    mockGetJobs.mockReturnValue([]);
    mockGetJob.mockReturnValue(null);
    mockIsJobRunning.mockReturnValue(false);
    mockKillJob.mockReturnValue(true);
    mockGetJobLog.mockReturnValue('');
    mockGetJobResult.mockReturnValue(null);
    mockGetJobManager.mockReturnValue({
      getJobs: mockGetJobs,
      getJob: mockGetJob,
      startJob: mockStartJob,
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    process.chdir(originalCwd);
  });

  // ── No .specweave directory ────────────────────────────────────────

  describe('when .specweave directory does not exist', () => {
    it('should show "no project found" message', async () => {
      mockExistsSync.mockReturnValue(false);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No SpecWeave project found');
      expect(output).toContain('specweave init');
    });

    it('should not call getJobManager', async () => {
      mockExistsSync.mockReturnValue(false);

      await jobsCommand({});

      expect(mockGetJobManager).not.toHaveBeenCalled();
    });
  });

  // ── Default list (no options) ──────────────────────────────────────

  describe('default list (no options)', () => {
    it('should show "no jobs" message when empty', async () => {
      mockGetJobs.mockReturnValue([]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No background jobs found');
    });

    it('should show running jobs section', async () => {
      const job = makeJob({ status: 'running' });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Running');
      expect(output).toContain('abcdef12');
    });

    it('should show pending jobs with alive worker', async () => {
      const job = makeJob({ status: 'pending' });
      mockGetJobs.mockReturnValue([job]);
      mockIsJobRunning.mockReturnValue(true);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Pending');
      expect(output).not.toContain('Worker not running');
    });

    it('should show crash warning for pending jobs with dead worker', async () => {
      const job = makeJob({ status: 'pending' });
      mockGetJobs.mockReturnValue([job]);
      mockIsJobRunning.mockReturnValue(false);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Pending');
      expect(output).toContain('Worker not running');
    });

    it('should show paused jobs section', async () => {
      const job = makeJob({ status: 'paused' });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Paused');
    });

    it('should show failed jobs section', async () => {
      const job = makeJob({ status: 'failed', error: 'Rate limit hit' });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Failed');
    });

    it('should show completed_with_warnings section', async () => {
      const job = makeJob({ status: 'completed_with_warnings', error: '3 items failed' });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Completed with Warnings');
      expect(output).toContain('3 items failed');
    });

    it('should show completed jobs (default is showAll=true)', async () => {
      const job = makeJob({ status: 'completed' });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Completed');
    });

    it('should truncate completed list at 10 and show remainder count', async () => {
      const jobs = Array.from({ length: 15 }, (_, i) =>
        makeJob({
          id: `completed-${String(i).padStart(4, '0')}-0000-0000-000000000000`,
          status: 'completed',
        })
      );
      mockGetJobs.mockReturnValue(jobs);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('and 5 more');
    });

    it('should show multiple status sections when mixed', async () => {
      const running = makeJob({ id: 'running0-0000-0000-0000-000000000000', status: 'running' });
      const failed = makeJob({ id: 'failed00-0000-0000-0000-000000000000', status: 'failed', error: 'boom' });
      mockGetJobs.mockReturnValue([running, failed]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Running');
      expect(output).toContain('Failed');
    });

    it('should show hint commands at the bottom', async () => {
      mockGetJobs.mockReturnValue([makeJob()]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('specweave jobs --id');
      expect(output).toContain('specweave jobs --follow');
    });

    it('should show resume hint when paused jobs exist', async () => {
      mockGetJobs.mockReturnValue([makeJob({ status: 'paused' })]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('--resume');
    });

    it('should show kill hint when running jobs exist', async () => {
      mockGetJobs.mockReturnValue([makeJob({ status: 'running' })]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('--kill');
    });
  });

  // ── Progress bar (createProgressBar) ───────────────────────────────

  describe('progress bar rendering (createProgressBar)', () => {
    it('should show 0% as all empty blocks', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 0, total: 100, percentage: 0 }),
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // 20 empty blocks
      expect(output).toContain('[░░░░░░░░░░░░░░░░░░░░]');
    });

    it('should show 100% as all filled blocks', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 100, total: 100, percentage: 100 }),
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('[████████████████████]');
    });

    it('should show 50% as half filled', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 50, total: 100, percentage: 50 }),
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('[██████████░░░░░░░░░░]');
    });

    it('should show 25% progress (5 filled, 15 empty)', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 25, total: 100, percentage: 25 }),
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('[█████░░░░░░░░░░░░░░░]');
    });

    it('should show 75% progress', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 75, total: 100, percentage: 75 }),
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // Math.round(75/100 * 20) = 15
      expect(output).toContain('[███████████████░░░░░]');
    });

    it('should handle 0/0 total as 0%', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 0, total: 0, percentage: 0 }),
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('[░░░░░░░░░░░░░░░░░░░░]');
      expect(output).toContain('0/0 (0%)');
    });
  });

  // ── Duration formatting (formatDuration) ───────────────────────────

  describe('duration formatting (formatDuration via ETA)', () => {
    // formatDuration is called with the ETA calculation from printJobSummary.
    // We can control it by controlling current/total and elapsed time.

    it('should show "calculating..." when ETA is 0', async () => {
      // When progress.current === progress.total, remaining = 0, eta = 0 => "calculating..."
      const job = makeJob({
        progress: makeProgress({ current: 100, total: 100 }),
        startedAt: new Date(Date.now() - 10_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('calculating...');
    });

    it('should show seconds format for short ETAs', async () => {
      // remaining = 30, rate ~ 1/s => ETA ~ 30 => "30s"
      const job = makeJob({
        progress: makeProgress({ current: 10, total: 40 }),
        startedAt: new Date(Date.now() - 10_000) as any, // 10 seconds ago
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // rate = 10/10 = 1/s, remaining = 30, eta = 30 => "30s"
      expect(output).toContain('30s');
    });

    it('should show minutes and seconds for medium ETAs', async () => {
      // remaining = 900, rate = 10/s => ETA = 90 => "1m 30s"
      const job = makeJob({
        progress: makeProgress({ current: 100, total: 1000 }),
        startedAt: new Date(Date.now() - 10_000) as any, // 10 seconds ago
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // rate = 100/10 = 10/s, remaining = 900, eta = 90 => "1m 30s"
      expect(output).toContain('1m 30s');
    });

    it('should show hours and minutes for long ETAs', async () => {
      // remaining = 36000, rate = 10/s => ETA = 3600 => "1h 0m"
      const job = makeJob({
        progress: makeProgress({ current: 100, total: 36100 }),
        startedAt: new Date(Date.now() - 10_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // rate = 100/10 = 10/s, remaining = 36000, eta = 3600 => "1h 0m"
      expect(output).toContain('1h 0m');
    });

    it('should show multi-hour ETAs', async () => {
      // remaining = 72000, rate = 10/s => ETA = 7200 => "2h 0m"
      const job = makeJob({
        progress: makeProgress({ current: 100, total: 72100 }),
        startedAt: new Date(Date.now() - 10_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // rate = 100/10 = 10/s, remaining = 72000, eta = 7200 => "2h 0m"
      expect(output).toContain('2h 0m');
    });

    it('should show minutes format just under an hour', async () => {
      // remaining = 5900, rate = 1/s => ETA = 5900 => minutes = 98 => >=60 => hours
      // Actually: 5900s => 98m => >= 60 => hours = 1, minutes % 60 = 38 => "1h 38m"
      // Let's use remaining = 3540, rate = 1/s => ETA = 3540 => 59m 0s
      const job = makeJob({
        progress: makeProgress({ current: 60, total: 3600 }),
        startedAt: new Date(Date.now() - 60_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // rate = 60/60 = 1/s, remaining = 3540, eta = 3540 => minutes = 59 => "59m 0s"
      expect(output).toContain('59m 0s');
    });
  });

  // ── Time ago (getTimeAgo) ──────────────────────────────────────────

  describe('time ago formatting (getTimeAgo via compact completed jobs)', () => {
    it('should show "just now" for recent updates', async () => {
      const job = makeJob({
        status: 'completed',
        updatedAt: new Date() as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({ all: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('just now');
    });

    it('should show "N mins ago" for updates under an hour', async () => {
      const job = makeJob({
        status: 'completed',
        updatedAt: new Date(Date.now() - 5 * 60_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({ all: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('5 mins ago');
    });

    it('should show "N hours ago" for updates under a day', async () => {
      const job = makeJob({
        status: 'completed',
        updatedAt: new Date(Date.now() - 3 * 3600_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({ all: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('3 hours ago');
    });

    it('should show "N days ago" for older updates', async () => {
      const job = makeJob({
        status: 'completed',
        updatedAt: new Date(Date.now() - 2 * 86400_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({ all: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('2 days ago');
    });

    it('should show "1 mins ago" for 90 seconds ago', async () => {
      const job = makeJob({
        status: 'completed',
        updatedAt: new Date(Date.now() - 90_000) as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({ all: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('1 mins ago');
    });
  });

  // ── getJobProvider ─────────────────────────────────────────────────

  describe('getJobProvider', () => {
    it('should show provider for import-issues type', async () => {
      const job = makeJob({
        config: { type: 'import-issues', provider: 'jira', timeRangeMonths: 6, projectPath: '/tmp' },
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('jira');
    });

    it('should show provider for sync-external type', async () => {
      const job = makeJob({
        type: 'sync-external',
        config: { type: 'sync-external', provider: 'ado', direction: 'import', profileId: 'p1', projectPath: '/tmp' },
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('ado');
    });

    it('should show "git" for clone-repos type', async () => {
      const job = makeJob({
        type: 'clone-repos',
        config: { type: 'clone-repos', repositories: [], projectPath: '/tmp' },
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('git');
    });

    it('should show "brownfield" for brownfield-analysis type', async () => {
      const job = makeJob({
        type: 'brownfield-analysis',
        config: { type: 'brownfield-analysis', projectPath: '/tmp', analysisDepth: 'quick' },
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('brownfield');
    });

    it('should show "codebase analysis" for living-docs-builder with ready deps', async () => {
      const job = makeJob({
        type: 'living-docs-builder',
        config: {
          type: 'living-docs-builder',
          projectPath: '/tmp',
          userInputs: { additionalSources: [], priorityAreas: [], knownPainPoints: [], analysisDepth: 'quick' },
        },
        dependencyStatus: 'ready',
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('codebase analysis');
    });

    it('should show "waiting for deps" for living-docs-builder with waiting status', async () => {
      const job = makeJob({
        type: 'living-docs-builder',
        config: {
          type: 'living-docs-builder',
          projectPath: '/tmp',
          userInputs: { additionalSources: [], priorityAreas: [], knownPainPoints: [], analysisDepth: 'quick' },
        },
        dependencyStatus: 'waiting',
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('waiting for deps');
    });

    it('should show truncated dep IDs when waiting with dependsOn', async () => {
      const job = makeJob({
        type: 'living-docs-builder',
        config: {
          type: 'living-docs-builder',
          projectPath: '/tmp',
          userInputs: { additionalSources: [], priorityAreas: [], knownPainPoints: [], analysisDepth: 'quick' },
        },
        dependencyStatus: 'waiting',
        dependsOn: ['dep12345-aaaa-bbbb-cccc-dddddddddddd'],
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('waiting: dep12345');
    });

    it('should show "running (some deps failed)" for partial dependency status', async () => {
      const job = makeJob({
        type: 'living-docs-builder',
        config: {
          type: 'living-docs-builder',
          projectPath: '/tmp',
          userInputs: { additionalSources: [], priorityAreas: [], knownPainPoints: [], analysisDepth: 'quick' },
        },
        dependencyStatus: 'partial',
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('running (some deps failed)');
    });

    it('should show "waiting" when dependsOn set but no dependencyStatus', async () => {
      const job = makeJob({
        type: 'living-docs-builder',
        config: {
          type: 'living-docs-builder',
          projectPath: '/tmp',
          userInputs: { additionalSources: [], priorityAreas: [], knownPainPoints: [], analysisDepth: 'quick' },
        },
        dependsOn: ['some-dep-id-xxxx-yyyy-zzzzzzzzzzzz'],
        // no dependencyStatus set
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('waiting: some-dep');
    });

    it('should show "unknown" for unrecognized config type', async () => {
      const job = makeJob({
        type: 'codebase-rescan' as any,
        config: {
          type: 'codebase-rescan',
          projectPath: '/tmp',
          closedIncrementId: '0001',
          depth: 'quick',
        } as any,
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('unknown');
    });

    it('should show github provider for import-issues', async () => {
      const job = makeJob({
        config: { type: 'import-issues', provider: 'github', timeRangeMonths: 12, projectPath: '/tmp' },
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('github');
    });
  });

  // ── --kill option ──────────────────────────────────────────────────

  describe('--kill option', () => {
    it('should kill a job by full ID', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockKillJob.mockReturnValue(true);

      await jobsCommand({ kill: job.id });

      expect(mockKillJob).toHaveBeenCalledWith(expect.any(String), job.id);
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job killed');
    });

    it('should show resume hint after successful kill', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockKillJob.mockReturnValue(true);

      await jobsCommand({ kill: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('--resume');
    });

    it('should show warning when kill fails', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockKillJob.mockReturnValue(false);

      await jobsCommand({ kill: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Could not kill job');
    });

    it('should find job by prefix when full ID not found', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job]);
      mockKillJob.mockReturnValue(true);

      await jobsCommand({ kill: 'abcdef12' });

      expect(mockKillJob).toHaveBeenCalledWith(expect.any(String), job.id);
    });

    it('should show "not found" for nonexistent job', async () => {
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([]);

      await jobsCommand({ kill: 'nonexist' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job not found');
    });

    it('should display job progress info before killing', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 75, total: 200 }),
      });
      mockGetJob.mockReturnValue(job);
      mockKillJob.mockReturnValue(true);

      await jobsCommand({ kill: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('75/200');
    });
  });

  // ── --logs option ──────────────────────────────────────────────────

  describe('--logs option', () => {
    it('should display logs for an existing job', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockGetJobLog.mockReturnValue('line 1\nline 2\nline 3');

      await jobsCommand({ logs: job.id });

      expect(mockGetJobLog).toHaveBeenCalledWith(expect.any(String), job.id, 50);
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('line 1');
      expect(output).toContain('line 3');
    });

    it('should show "no logs" when log is empty', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockGetJobLog.mockReturnValue('');

      await jobsCommand({ logs: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No logs available');
    });

    it('should find job by prefix for logs', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job]);
      mockGetJobLog.mockReturnValue('log data');

      await jobsCommand({ logs: 'abcdef12' });

      expect(mockGetJobLog).toHaveBeenCalledWith(expect.any(String), job.id, 50);
    });

    it('should show "not found" for nonexistent job logs', async () => {
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([]);

      await jobsCommand({ logs: 'nope1234' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job not found');
    });

    it('should show short ID in log header', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockGetJobLog.mockReturnValue('some log');

      await jobsCommand({ logs: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('abcdef12');
    });
  });

  // ── --id option (job details) ──────────────────────────────────────

  describe('--id option (job details)', () => {
    it('should display full job details', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 42, total: 100, currentItem: 'PROJ-42' }),
      });
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job Details');
      expect(output).toContain('import-issues');
      expect(output).toContain('42/100');
      expect(output).toContain('PROJ-42');
    });

    it('should show result data when available', async () => {
      const job = makeJob({ status: 'completed' });
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue({ totalCount: 500, completedAt: '2025-01-01T00:00:00Z' });

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('500');
      expect(output).toContain('2025-01-01');
    });

    it('should show error when job has error', async () => {
      const job = makeJob({ status: 'failed', error: 'Token expired' });
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Token expired');
    });

    it('should show file paths', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('config.json');
      expect(output).toContain('worker.log');
      expect(output).toContain('worker.pid');
    });

    it('should find job by prefix for details', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job]);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: 'abcdef12' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job Details');
    });

    it('should show "not found" for nonexistent job ID', async () => {
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([]);

      await jobsCommand({ id: 'missing1' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job not found');
    });

    it('should show PID from pid file', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue(null);
      mockReadFileSync.mockReturnValue('99887');

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('99887');
    });

    it('should show N/A when pid file does not exist', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue(null);
      // existsSync returns false for pid file (second call or specific path)
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('worker.pid')) return false;
        return true; // .specweave dir exists
      });

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('N/A');
    });

    it('should show rate as items/sec', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 200, total: 400 }),
        startedAt: new Date(Date.now() - 20_000) as any, // 20s ago => rate = 10/s
      });
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('10.0 items/sec');
    });
  });

  // ── --resume option ────────────────────────────────────────────────

  describe('--resume option', () => {
    it('should show "not found" for missing job', async () => {
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([]);

      await jobsCommand({ resume: 'missing1' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job not found');
    });

    it('should show "already running" for running job', async () => {
      const job = makeJob({ status: 'running' });
      mockGetJob.mockReturnValue(job);

      await jobsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already running');
    });

    it('should show "already completed" for completed job', async () => {
      const job = makeJob({ status: 'completed' });
      mockGetJob.mockReturnValue(job);

      await jobsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already completed');
    });

    it('should fail if config.json does not exist', async () => {
      const job = makeJob({ status: 'paused' });
      mockGetJob.mockReturnValue(job);
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('config.json')) return false;
        return true;
      });

      await jobsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Cannot resume');
    });

    it('should resume paused job and launch in background', async () => {
      const job = makeJob({
        status: 'paused',
        progress: makeProgress({ current: 50, total: 200 }),
      });
      mockGetJob.mockReturnValue(job);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ coordinatorConfig: {} }));
      mockLaunchImportJob.mockResolvedValue({ isBackground: true, pid: 54321 });

      await jobsCommand({ resume: job.id });

      expect(mockStartJob).toHaveBeenCalledWith(job.id);
      expect(mockLaunchImportJob).toHaveBeenCalled();
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('resumed in background');
    });

    it('should show foreground warning when background not available', async () => {
      const job = makeJob({
        status: 'paused',
        progress: makeProgress({ current: 10, total: 100 }),
      });
      mockGetJob.mockReturnValue(job);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ coordinatorConfig: {} }));
      mockLaunchImportJob.mockResolvedValue({ isBackground: false });

      await jobsCommand({ resume: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('foreground');
    });

    it('should find job by prefix for resume', async () => {
      const job = makeJob({ status: 'paused' });
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({ resume: 'abcdef12' });

      // Should find job via prefix even though getJob returned null
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Resuming job');
    });
  });

  // ── formatStatus ───────────────────────────────────────────────────

  describe('formatStatus (via --id option)', () => {
    const statuses = ['running', 'paused', 'completed', 'completed_with_warnings', 'failed'] as const;

    for (const status of statuses) {
      it(`should format "${status}" status`, async () => {
        const job = makeJob({ status });
        mockGetJob.mockReturnValue(job);
        mockGetJobResult.mockReturnValue(null);

        await jobsCommand({ id: job.id });

        const output = logSpy.mock.calls.map(c => c[0]).join('\n');
        // Status line should be printed
        expect(output).toContain('Status:');
      });
    }

    it('should pass through unknown status as-is', async () => {
      const job = makeJob({ status: 'pending' });
      mockGetJob.mockReturnValue(job);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: job.id });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Status:');
      // pending is not in the statusMap so it passes through as "pending"
      expect(output).toContain('pending');
    });
  });

  // ── findJobByPrefix ────────────────────────────────────────────────

  describe('findJobByPrefix', () => {
    it('should match a job by first 8 chars of ID', async () => {
      const job = makeJob({ id: 'abcdef12-xxxx-yyyy-zzzz-123456789012' });
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job]);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: 'abcdef12' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job Details');
    });

    it('should not match when prefix does not match any job', async () => {
      const job = makeJob({ id: 'abcdef12-xxxx-yyyy-zzzz-123456789012' });
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({ id: 'zzzzzzz' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Job not found');
    });

    it('should match the first job when multiple share a prefix', async () => {
      const job1 = makeJob({ id: 'abc00001-xxxx-yyyy-zzzz-111111111111' });
      const job2 = makeJob({ id: 'abc00002-xxxx-yyyy-zzzz-222222222222' });
      mockGetJob.mockReturnValue(null);
      mockGetJobs.mockReturnValue([job1, job2]);
      mockGetJobResult.mockReturnValue(null);

      await jobsCommand({ id: 'abc0000' });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      // findJobByPrefix returns the first match
      expect(output).toContain('abc00001');
    });
  });

  // ── printJobSummary details ────────────────────────────────────────

  describe('printJobSummary details', () => {
    it('should show currentItem when present', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 5, total: 10, currentItem: 'myorg/my-repo' }),
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('myorg/my-repo');
    });

    it('should show PID and alive status', async () => {
      const job = makeJob();
      mockGetJobs.mockReturnValue([job]);
      mockIsJobRunning.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('77777');

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('77777');
      expect(output).toContain('alive');
    });

    it('should show "not running" when worker is dead', async () => {
      const job = makeJob();
      mockGetJobs.mockReturnValue([job]);
      mockIsJobRunning.mockReturnValue(false);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('not running');
    });

    it('should show error in failed job summary', async () => {
      const job = makeJob({ status: 'failed', error: 'Connection refused' });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Connection refused');
    });

    it('should show rate in items/s', async () => {
      const job = makeJob({
        progress: makeProgress({ current: 50, total: 100 }),
        startedAt: new Date(Date.now() - 5_000) as any, // 5s ago => rate = 10/s
      });
      mockGetJobs.mockReturnValue([job]);

      await jobsCommand({});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('10.0/s');
    });
  });

  // ── Error handling ─────────────────────────────────────────────────

  describe('error handling', () => {
    it('should catch and display errors, then exit(1)', async () => {
      mockGetJobManager.mockImplementation(() => {
        throw new Error('State file corrupted');
      });

      await jobsCommand({});

      const errOutput = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(errOutput).toContain('State file corrupted');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error thrown objects', async () => {
      mockGetJobManager.mockImplementation(() => {
        throw 'string error';
      });

      await jobsCommand({});

      const errOutput = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(errOutput).toContain('string error');
    });
  });

  // ── Option priority ────────────────────────────────────────────────

  describe('option priority', () => {
    it('should handle --kill before --logs', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockKillJob.mockReturnValue(true);

      await jobsCommand({ kill: job.id, logs: job.id });

      expect(mockKillJob).toHaveBeenCalled();
      expect(mockGetJobLog).not.toHaveBeenCalled();
    });

    it('should handle --resume before --logs', async () => {
      const job = makeJob({ status: 'running' });
      mockGetJob.mockReturnValue(job);

      await jobsCommand({ resume: job.id, logs: job.id });

      // resume is checked before logs
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('already running');
      expect(mockGetJobLog).not.toHaveBeenCalled();
    });

    it('should handle --logs before --id', async () => {
      const job = makeJob();
      mockGetJob.mockReturnValue(job);
      mockGetJobLog.mockReturnValue('log content');

      await jobsCommand({ logs: job.id, id: job.id });

      expect(mockGetJobLog).toHaveBeenCalled();
      // --id detail section should NOT appear
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).not.toContain('Job Details');
    });
  });
});
