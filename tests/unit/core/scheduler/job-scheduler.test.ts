/**
 * Tests for JobScheduler
 *
 * Comprehensive unit tests for the job scheduler class.
 * Uses vi.hoisted() + vi.mock() for ESM mocking of scheduled-job module.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '../../../../src/utils/logger.js';

// Hoisted mocks for scheduled-job functions
const {
  mockCreateScheduledJob,
  mockIsJobDue,
  mockMarkJobComplete,
  mockMarkJobFailed,
  mockMarkJobRunning,
  mockPauseJob,
  mockResumeJob,
  mockResetJob,
} = vi.hoisted(() => ({
  mockCreateScheduledJob: vi.fn(),
  mockIsJobDue: vi.fn(),
  mockMarkJobComplete: vi.fn(),
  mockMarkJobFailed: vi.fn(),
  mockMarkJobRunning: vi.fn(),
  mockPauseJob: vi.fn(),
  mockResumeJob: vi.fn(),
  mockResetJob: vi.fn(),
}));

vi.mock('../../../../src/core/scheduler/scheduled-job.js', () => ({
  createScheduledJob: mockCreateScheduledJob,
  isJobDue: mockIsJobDue,
  markJobComplete: mockMarkJobComplete,
  markJobFailed: mockMarkJobFailed,
  markJobRunning: mockMarkJobRunning,
  pauseJob: mockPauseJob,
  resumeJob: mockResumeJob,
  resetJob: mockResetJob,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { JobScheduler } from '../../../../src/core/scheduler/job-scheduler.js';
import type { ScheduledJob, ScheduledJobConfig, JobType } from '../../../../src/core/scheduler/scheduled-job.js';

/**
 * Helper to create a mock ScheduledJob
 */
function createMockJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'test-job',
    type: 'external-sync' as JobType,
    status: 'idle',
    schedule: {
      intervalMs: 60000,
      enabled: true,
      retryCount: 0,
      maxRetries: 3,
      nextRun: new Date(Date.now() + 60000).toISOString(),
    },
    lastStateChange: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Silent logger for tests
 */
function createSilentLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('JobScheduler', () => {
  let scheduler: JobScheduler;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createSilentLogger();
    scheduler = new JobScheduler({ logger });
  });

  describe('constructor', () => {
    it('should initialize with empty job list', () => {
      expect(scheduler.getAllJobs()).toEqual([]);
    });

    it('should use provided logger', () => {
      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 1000 });

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should use default logger when none provided', () => {
      // Should not throw
      const defaultScheduler = new JobScheduler();
      expect(defaultScheduler).toBeDefined();
    });
  });

  describe('registerJob', () => {
    it('should register a new job', () => {
      const job = createMockJob({ id: 'my-job' });
      mockCreateScheduledJob.mockReturnValue(job);

      const config: ScheduledJobConfig = {
        id: 'my-job',
        type: 'external-sync',
        intervalMs: 60000,
      };

      scheduler.registerJob(config);

      expect(mockCreateScheduledJob).toHaveBeenCalledWith(config);
      expect(scheduler.getJob('my-job')).toEqual(job);
    });

    it('should throw if job with same ID already exists', () => {
      const job = createMockJob({ id: 'dup-job' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'dup-job', type: 'external-sync', intervalMs: 1000 });

      expect(() => {
        scheduler.registerJob({ id: 'dup-job', type: 'external-sync', intervalMs: 1000 });
      }).toThrow('Job with ID "dup-job" already registered');
    });

    it('should emit job-registered event', () => {
      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);

      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 1000 });

      expect(listener).toHaveBeenCalledWith('job-registered', job, undefined);
    });

    it('should log registration debug message', () => {
      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 5000 });

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Registered job: test')
      );
    });
  });

  describe('unregisterJob', () => {
    it('should remove an existing job', () => {
      const job = createMockJob({ id: 'to-remove' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'to-remove', type: 'external-sync', intervalMs: 1000 });

      const removed = scheduler.unregisterJob('to-remove');

      expect(removed).toBe(true);
      expect(scheduler.getJob('to-remove')).toBeUndefined();
    });

    it('should return false when job not found', () => {
      const removed = scheduler.unregisterJob('nonexistent');

      expect(removed).toBe(false);
    });

    it('should emit job-unregistered event', () => {
      const job = createMockJob({ id: 'to-remove' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'to-remove', type: 'external-sync', intervalMs: 1000 });

      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.unregisterJob('to-remove');

      expect(listener).toHaveBeenCalledWith('job-unregistered', job, undefined);
    });

    it('should not emit event when job not found', () => {
      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.unregisterJob('nonexistent');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getJob', () => {
    it('should return job by ID', () => {
      const job = createMockJob({ id: 'my-job' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'my-job', type: 'external-sync', intervalMs: 1000 });

      expect(scheduler.getJob('my-job')).toEqual(job);
    });

    it('should return undefined for unknown job', () => {
      expect(scheduler.getJob('unknown')).toBeUndefined();
    });
  });

  describe('getAllJobs', () => {
    it('should return all registered jobs', () => {
      const job1 = createMockJob({ id: 'job-1' });
      const job2 = createMockJob({ id: 'job-2' });

      mockCreateScheduledJob
        .mockReturnValueOnce(job1)
        .mockReturnValueOnce(job2);

      scheduler.registerJob({ id: 'job-1', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'job-2', type: 'external-pull', intervalMs: 2000 });

      const jobs = scheduler.getAllJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs).toContain(job1);
      expect(jobs).toContain(job2);
    });

    it('should return empty array when no jobs registered', () => {
      expect(scheduler.getAllJobs()).toEqual([]);
    });
  });

  describe('getJobsByType', () => {
    it('should return jobs filtered by type', () => {
      const syncJob = createMockJob({ id: 'sync-1', type: 'external-sync' });
      const pullJob = createMockJob({ id: 'pull-1', type: 'external-pull' });
      const syncJob2 = createMockJob({ id: 'sync-2', type: 'external-sync' });

      mockCreateScheduledJob
        .mockReturnValueOnce(syncJob)
        .mockReturnValueOnce(pullJob)
        .mockReturnValueOnce(syncJob2);

      scheduler.registerJob({ id: 'sync-1', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'pull-1', type: 'external-pull', intervalMs: 1000 });
      scheduler.registerJob({ id: 'sync-2', type: 'external-sync', intervalMs: 1000 });

      const syncJobs = scheduler.getJobsByType('external-sync');

      expect(syncJobs).toHaveLength(2);
      expect(syncJobs).toContain(syncJob);
      expect(syncJobs).toContain(syncJob2);
    });

    it('should return empty array for unmatched type', () => {
      const job = createMockJob({ id: 'sync-1', type: 'external-sync' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'sync-1', type: 'external-sync', intervalMs: 1000 });

      expect(scheduler.getJobsByType('notification-cleanup')).toEqual([]);
    });
  });

  describe('getNextDueJobs', () => {
    it('should return due jobs', () => {
      const job1 = createMockJob({ id: 'job-1' });
      const job2 = createMockJob({ id: 'job-2' });

      mockCreateScheduledJob
        .mockReturnValueOnce(job1)
        .mockReturnValueOnce(job2);

      scheduler.registerJob({ id: 'job-1', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'job-2', type: 'external-pull', intervalMs: 1000 });

      mockIsJobDue.mockImplementation((job: ScheduledJob) => job.id === 'job-1');

      const dueJobs = scheduler.getNextDueJobs();

      expect(dueJobs).toHaveLength(1);
      expect(dueJobs[0].id).toBe('job-1');
    });

    it('should sort due jobs by next run time (earliest first)', () => {
      const earlyJob = createMockJob({
        id: 'early',
        schedule: {
          intervalMs: 1000,
          enabled: true,
          retryCount: 0,
          maxRetries: 3,
          nextRun: '2025-01-01T00:00:00Z',
        },
      });
      const lateJob = createMockJob({
        id: 'late',
        schedule: {
          intervalMs: 1000,
          enabled: true,
          retryCount: 0,
          maxRetries: 3,
          nextRun: '2025-06-01T00:00:00Z',
        },
      });

      mockCreateScheduledJob
        .mockReturnValueOnce(lateJob)
        .mockReturnValueOnce(earlyJob);

      scheduler.registerJob({ id: 'late', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'early', type: 'external-sync', intervalMs: 1000 });

      mockIsJobDue.mockReturnValue(true);

      const dueJobs = scheduler.getNextDueJobs();

      expect(dueJobs[0].id).toBe('early');
      expect(dueJobs[1].id).toBe('late');
    });

    it('should handle jobs without nextRun (sort at beginning)', () => {
      const noRunJob = createMockJob({
        id: 'no-run',
        schedule: {
          intervalMs: 1000,
          enabled: true,
          retryCount: 0,
          maxRetries: 3,
          // no nextRun
        },
      });
      const withRunJob = createMockJob({
        id: 'with-run',
        schedule: {
          intervalMs: 1000,
          enabled: true,
          retryCount: 0,
          maxRetries: 3,
          nextRun: '2025-06-01T00:00:00Z',
        },
      });

      mockCreateScheduledJob
        .mockReturnValueOnce(withRunJob)
        .mockReturnValueOnce(noRunJob);

      scheduler.registerJob({ id: 'with-run', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'no-run', type: 'external-sync', intervalMs: 1000 });

      mockIsJobDue.mockReturnValue(true);

      const dueJobs = scheduler.getNextDueJobs();

      expect(dueJobs[0].id).toBe('no-run');
    });

    it('should return empty array when no jobs are due', () => {
      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);
      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 1000 });

      mockIsJobDue.mockReturnValue(false);

      expect(scheduler.getNextDueJobs()).toEqual([]);
    });
  });

  describe('markJobStarted', () => {
    it('should mark idle job as running', () => {
      const job = createMockJob({ id: 'run-job', status: 'idle' });
      const runningJob = createMockJob({ id: 'run-job', status: 'running' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobRunning.mockReturnValue(runningJob);

      scheduler.registerJob({ id: 'run-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.markJobStarted('run-job');

      expect(mockMarkJobRunning).toHaveBeenCalledWith(job);
      expect(scheduler.getJob('run-job')).toEqual(runningJob);
    });

    it('should throw if job not found', () => {
      expect(() => scheduler.markJobStarted('unknown')).toThrow('Job not found: unknown');
    });

    it('should throw if job is not idle', () => {
      const job = createMockJob({ id: 'running-job', status: 'running' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'running-job', type: 'external-sync', intervalMs: 1000 });

      expect(() => scheduler.markJobStarted('running-job')).toThrow(
        'Cannot start job "running-job" - status is "running", expected "idle"'
      );
    });

    it('should throw if job is failed', () => {
      const job = createMockJob({ id: 'failed-job', status: 'failed' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'failed-job', type: 'external-sync', intervalMs: 1000 });

      expect(() => scheduler.markJobStarted('failed-job')).toThrow(
        'Cannot start job "failed-job" - status is "failed", expected "idle"'
      );
    });

    it('should throw if job is disabled', () => {
      const job = createMockJob({ id: 'disabled-job', status: 'disabled' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'disabled-job', type: 'external-sync', intervalMs: 1000 });

      expect(() => scheduler.markJobStarted('disabled-job')).toThrow(
        'Cannot start job "disabled-job" - status is "disabled", expected "idle"'
      );
    });

    it('should emit job-started event', () => {
      const job = createMockJob({ id: 'start-job', status: 'idle' });
      const runningJob = createMockJob({ id: 'start-job', status: 'running' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobRunning.mockReturnValue(runningJob);

      scheduler.registerJob({ id: 'start-job', type: 'external-sync', intervalMs: 1000 });

      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.markJobStarted('start-job');

      // First call is job-registered, second is job-started
      expect(listener).toHaveBeenCalledWith('job-started', runningJob, undefined);
    });
  });

  describe('markJobComplete', () => {
    it('should mark job as complete', () => {
      const job = createMockJob({ id: 'done-job' });
      const completedJob = createMockJob({
        id: 'done-job',
        schedule: {
          intervalMs: 60000,
          enabled: true,
          retryCount: 0,
          maxRetries: 3,
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 60000).toISOString(),
        },
      });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobComplete.mockReturnValue(completedJob);

      scheduler.registerJob({ id: 'done-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.markJobComplete('done-job');

      expect(mockMarkJobComplete).toHaveBeenCalledWith(job);
      expect(scheduler.getJob('done-job')).toEqual(completedJob);
    });

    it('should throw if job not found', () => {
      expect(() => scheduler.markJobComplete('unknown')).toThrow('Job not found: unknown');
    });

    it('should emit job-completed event with optional data', () => {
      const job = createMockJob({ id: 'complete-job' });
      const completedJob = createMockJob({ id: 'complete-job' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobComplete.mockReturnValue(completedJob);

      scheduler.registerJob({ id: 'complete-job', type: 'external-sync', intervalMs: 1000 });

      const listener = vi.fn();
      scheduler.addEventListener(listener);

      const data = { syncedItems: 5 };
      scheduler.markJobComplete('complete-job', data);

      expect(listener).toHaveBeenCalledWith('job-completed', completedJob, data);
    });

    it('should emit job-completed event without data', () => {
      const job = createMockJob({ id: 'complete-job' });
      const completedJob = createMockJob({ id: 'complete-job' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobComplete.mockReturnValue(completedJob);

      scheduler.registerJob({ id: 'complete-job', type: 'external-sync', intervalMs: 1000 });

      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.markJobComplete('complete-job');

      expect(listener).toHaveBeenCalledWith('job-completed', completedJob, undefined);
    });
  });

  describe('markJobFailed', () => {
    it('should mark job as failed with error', () => {
      const job = createMockJob({ id: 'fail-job' });
      const failedJob = createMockJob({
        id: 'fail-job',
        status: 'idle',
        lastError: 'Connection timeout',
        schedule: {
          intervalMs: 60000,
          enabled: true,
          retryCount: 1,
          maxRetries: 3,
        },
      });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobFailed.mockReturnValue(failedJob);

      scheduler.registerJob({ id: 'fail-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.markJobFailed('fail-job', 'Connection timeout');

      expect(mockMarkJobFailed).toHaveBeenCalledWith(job, 'Connection timeout');
      expect(scheduler.getJob('fail-job')).toEqual(failedJob);
    });

    it('should throw if job not found', () => {
      expect(() => scheduler.markJobFailed('unknown', 'error')).toThrow('Job not found: unknown');
    });

    it('should emit job-failed event with error data', () => {
      const job = createMockJob({ id: 'fail-job' });
      const failedJob = createMockJob({ id: 'fail-job', status: 'idle' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobFailed.mockReturnValue(failedJob);

      scheduler.registerJob({ id: 'fail-job', type: 'external-sync', intervalMs: 1000 });

      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.markJobFailed('fail-job', 'error msg');

      expect(listener).toHaveBeenCalledWith('job-failed', failedJob, { error: 'error msg' });
    });

    it('should log max retries reached when status is failed', () => {
      const job = createMockJob({ id: 'fail-max' });
      const failedJob = createMockJob({ id: 'fail-max', status: 'failed' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobFailed.mockReturnValue(failedJob);

      scheduler.registerJob({ id: 'fail-max', type: 'external-sync', intervalMs: 1000 });
      scheduler.markJobFailed('fail-max', 'error');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('max retries reached')
      );
    });

    it('should log retry count when retries remain', () => {
      const job = createMockJob({ id: 'fail-retry' });
      const failedJob = createMockJob({
        id: 'fail-retry',
        status: 'idle',
        schedule: {
          intervalMs: 60000,
          enabled: true,
          retryCount: 2,
          maxRetries: 3,
        },
      });

      mockCreateScheduledJob.mockReturnValue(job);
      mockMarkJobFailed.mockReturnValue(failedJob);

      scheduler.registerJob({ id: 'fail-retry', type: 'external-sync', intervalMs: 1000 });
      scheduler.markJobFailed('fail-retry', 'error');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('retry 2/3')
      );
    });
  });

  describe('pauseJob', () => {
    it('should pause a job', () => {
      const job = createMockJob({ id: 'pause-job' });
      const pausedJob = createMockJob({ id: 'pause-job', status: 'disabled' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockPauseJob.mockReturnValue(pausedJob);

      scheduler.registerJob({ id: 'pause-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.pauseJob('pause-job');

      expect(mockPauseJob).toHaveBeenCalledWith(job);
      expect(scheduler.getJob('pause-job')).toEqual(pausedJob);
    });

    it('should throw if job not found', () => {
      expect(() => scheduler.pauseJob('unknown')).toThrow('Job not found: unknown');
    });

    it('should emit job-paused event', () => {
      const job = createMockJob({ id: 'pause-job' });
      const pausedJob = createMockJob({ id: 'pause-job', status: 'disabled' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockPauseJob.mockReturnValue(pausedJob);

      scheduler.registerJob({ id: 'pause-job', type: 'external-sync', intervalMs: 1000 });

      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.pauseJob('pause-job');

      expect(listener).toHaveBeenCalledWith('job-paused', pausedJob, undefined);
    });
  });

  describe('resumeJob', () => {
    it('should resume a paused job', () => {
      const job = createMockJob({ id: 'resume-job', status: 'disabled' });
      const resumedJob = createMockJob({ id: 'resume-job', status: 'idle' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockResumeJob.mockReturnValue(resumedJob);

      scheduler.registerJob({ id: 'resume-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.resumeJob('resume-job');

      expect(mockResumeJob).toHaveBeenCalledWith(job);
      expect(scheduler.getJob('resume-job')).toEqual(resumedJob);
    });

    it('should throw if job not found', () => {
      expect(() => scheduler.resumeJob('unknown')).toThrow('Job not found: unknown');
    });

    it('should emit job-resumed event', () => {
      const job = createMockJob({ id: 'resume-job' });
      const resumedJob = createMockJob({ id: 'resume-job', status: 'idle' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockResumeJob.mockReturnValue(resumedJob);

      scheduler.registerJob({ id: 'resume-job', type: 'external-sync', intervalMs: 1000 });

      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.resumeJob('resume-job');

      expect(listener).toHaveBeenCalledWith('job-resumed', resumedJob, undefined);
    });
  });

  describe('resetJob', () => {
    it('should reset a failed job', () => {
      const job = createMockJob({ id: 'reset-job', status: 'failed' });
      const resetJobResult = createMockJob({ id: 'reset-job', status: 'idle' });

      mockCreateScheduledJob.mockReturnValue(job);
      mockResetJob.mockReturnValue(resetJobResult);

      scheduler.registerJob({ id: 'reset-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.resetJob('reset-job');

      expect(mockResetJob).toHaveBeenCalledWith(job);
      expect(scheduler.getJob('reset-job')).toEqual(resetJobResult);
    });

    it('should throw if job not found', () => {
      expect(() => scheduler.resetJob('unknown')).toThrow('Job not found: unknown');
    });
  });

  describe('updateJobInterval', () => {
    it('should update job interval', () => {
      const job = createMockJob({ id: 'interval-job' });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'interval-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.updateJobInterval('interval-job', 5000);

      const updatedJob = scheduler.getJob('interval-job');
      expect(updatedJob!.schedule.intervalMs).toBe(5000);
    });

    it('should throw if job not found', () => {
      expect(() => scheduler.updateJobInterval('unknown', 5000)).toThrow('Job not found: unknown');
    });

    it('should preserve other schedule properties', () => {
      const job = createMockJob({
        id: 'interval-job',
        schedule: {
          intervalMs: 1000,
          enabled: true,
          retryCount: 2,
          maxRetries: 5,
          lastRun: '2025-01-01T00:00:00Z',
          nextRun: '2025-01-01T01:00:00Z',
        },
      });
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'interval-job', type: 'external-sync', intervalMs: 1000 });
      scheduler.updateJobInterval('interval-job', 5000);

      const updatedJob = scheduler.getJob('interval-job');
      expect(updatedJob!.schedule.intervalMs).toBe(5000);
      expect(updatedJob!.schedule.retryCount).toBe(2);
      expect(updatedJob!.schedule.maxRetries).toBe(5);
      expect(updatedJob!.schedule.lastRun).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('loadJobs', () => {
    it('should load persisted jobs replacing existing ones', () => {
      const existingJob = createMockJob({ id: 'existing' });
      mockCreateScheduledJob.mockReturnValue(existingJob);

      scheduler.registerJob({ id: 'existing', type: 'external-sync', intervalMs: 1000 });

      const loadedJob1 = createMockJob({ id: 'loaded-1' });
      const loadedJob2 = createMockJob({ id: 'loaded-2' });

      scheduler.loadJobs([loadedJob1, loadedJob2]);

      expect(scheduler.getJob('existing')).toBeUndefined();
      expect(scheduler.getJob('loaded-1')).toEqual(loadedJob1);
      expect(scheduler.getJob('loaded-2')).toEqual(loadedJob2);
      expect(scheduler.getAllJobs()).toHaveLength(2);
    });

    it('should handle empty array', () => {
      scheduler.loadJobs([]);

      expect(scheduler.getAllJobs()).toHaveLength(0);
    });
  });

  describe('getJobsForPersistence', () => {
    it('should return all jobs for persistence', () => {
      const job1 = createMockJob({ id: 'persist-1' });
      const job2 = createMockJob({ id: 'persist-2' });

      mockCreateScheduledJob
        .mockReturnValueOnce(job1)
        .mockReturnValueOnce(job2);

      scheduler.registerJob({ id: 'persist-1', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'persist-2', type: 'external-pull', intervalMs: 1000 });

      const forPersistence = scheduler.getJobsForPersistence();

      expect(forPersistence).toHaveLength(2);
      expect(forPersistence).toContain(job1);
      expect(forPersistence).toContain(job2);
    });
  });

  describe('addEventListener / removeEventListener', () => {
    it('should add and call event listener', () => {
      const listener = vi.fn();
      scheduler.addEventListener(listener);

      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 1000 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('job-registered', job, undefined);
    });

    it('should remove event listener', () => {
      const listener = vi.fn();
      scheduler.addEventListener(listener);
      scheduler.removeEventListener(listener);

      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 1000 });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      scheduler.addEventListener(listener1);
      scheduler.addEventListener(listener2);

      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);

      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 1000 });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      scheduler.addEventListener(badListener);
      scheduler.addEventListener(goodListener);

      const job = createMockJob();
      mockCreateScheduledJob.mockReturnValue(job);

      // Should not throw
      scheduler.registerJob({ id: 'test', type: 'external-sync', intervalMs: 1000 });

      expect(badListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in job scheduler event listener')
      );
    });
  });

  describe('getStats', () => {
    it('should return stats for empty scheduler', () => {
      mockIsJobDue.mockReturnValue(false);

      const stats = scheduler.getStats();

      expect(stats.totalJobs).toBe(0);
      expect(stats.byStatus).toEqual({});
      expect(stats.byType).toEqual({});
      expect(stats.dueCount).toBe(0);
    });

    it('should return correct stats for multiple jobs', () => {
      const idleSync = createMockJob({ id: 'sync-1', type: 'external-sync', status: 'idle' });
      const runningSync = createMockJob({ id: 'sync-2', type: 'external-sync', status: 'running' });
      const failedPull = createMockJob({ id: 'pull-1', type: 'external-pull', status: 'failed' });

      mockCreateScheduledJob
        .mockReturnValueOnce(idleSync)
        .mockReturnValueOnce(runningSync)
        .mockReturnValueOnce(failedPull);

      scheduler.registerJob({ id: 'sync-1', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'sync-2', type: 'external-sync', intervalMs: 1000 });
      scheduler.registerJob({ id: 'pull-1', type: 'external-pull', intervalMs: 1000 });

      mockIsJobDue.mockImplementation((job: ScheduledJob) => job.id === 'sync-1');

      const stats = scheduler.getStats();

      expect(stats.totalJobs).toBe(3);
      expect(stats.byStatus).toEqual({ idle: 1, running: 1, failed: 1 });
      expect(stats.byType).toEqual({ 'external-sync': 2, 'external-pull': 1 });
      expect(stats.dueCount).toBe(1);
    });
  });
});
