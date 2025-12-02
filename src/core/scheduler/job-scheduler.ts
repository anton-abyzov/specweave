/**
 * Job Scheduler
 *
 * Core scheduler that manages recurring jobs with configurable intervals.
 * Supports pause/resume, retry with backoff, and job state tracking.
 *
 * @module core/scheduler/job-scheduler
 */

import {
  ScheduledJob,
  ScheduledJobConfig,
  JobType,
  createScheduledJob,
  isJobDue,
  markJobComplete,
  markJobFailed,
  markJobRunning,
  pauseJob,
  resumeJob,
  resetJob,
} from './scheduled-job.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Job scheduler configuration
 */
export interface JobSchedulerOptions {
  /**
   * Logger instance
   */
  logger?: Logger;
}

/**
 * Job scheduler events
 */
export type JobSchedulerEvent =
  | 'job-registered'
  | 'job-unregistered'
  | 'job-started'
  | 'job-completed'
  | 'job-failed'
  | 'job-paused'
  | 'job-resumed';

/**
 * Event listener callback
 */
export type JobSchedulerEventListener = (
  event: JobSchedulerEvent,
  job: ScheduledJob,
  data?: Record<string, unknown>
) => void;

/**
 * JobScheduler - Manages recurring background jobs
 *
 * Key features:
 * - Register/unregister jobs dynamically
 * - Check for due jobs (for execution by caller)
 * - Track job state (idle, running, failed, disabled)
 * - Exponential backoff for failed jobs
 * - Event notifications for state changes
 */
export class JobScheduler {
  private jobs: Map<string, ScheduledJob>;
  private listeners: Set<JobSchedulerEventListener>;
  private readonly logger: Logger;

  constructor(options: JobSchedulerOptions = {}) {
    this.jobs = new Map();
    this.listeners = new Set();
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Register a new job with the scheduler
   *
   * @param config - Job configuration
   * @throws Error if job with same ID already exists
   */
  registerJob(config: ScheduledJobConfig): void {
    if (this.jobs.has(config.id)) {
      throw new Error(`Job with ID "${config.id}" already registered`);
    }

    const job = createScheduledJob(config);
    this.jobs.set(config.id, job);

    this.logger.debug(`Registered job: ${config.id} (interval: ${config.intervalMs}ms)`);
    this.emit('job-registered', job);
  }

  /**
   * Unregister a job from the scheduler
   *
   * @param jobId - Job ID to remove
   * @returns true if job was removed, false if not found
   */
  unregisterJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    this.jobs.delete(jobId);
    this.logger.debug(`Unregistered job: ${jobId}`);
    this.emit('job-unregistered', job);
    return true;
  }

  /**
   * Get a job by ID
   *
   * @param jobId - Job ID
   * @returns Job or undefined if not found
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all registered jobs
   *
   * @returns Array of all jobs
   */
  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by type
   *
   * @param type - Job type to filter by
   * @returns Array of matching jobs
   */
  getJobsByType(type: JobType): ScheduledJob[] {
    return this.getAllJobs().filter((job) => job.type === type);
  }

  /**
   * Get all jobs that are due for execution
   *
   * @returns Array of due jobs (sorted by next run time)
   */
  getNextDueJobs(): ScheduledJob[] {
    const dueJobs = this.getAllJobs().filter(isJobDue);

    // Sort by next run time (earliest first)
    return dueJobs.sort((a, b) => {
      const aTime = a.schedule.nextRun ? new Date(a.schedule.nextRun).getTime() : 0;
      const bTime = b.schedule.nextRun ? new Date(b.schedule.nextRun).getTime() : 0;
      return aTime - bTime;
    });
  }

  /**
   * Mark a job as started (running)
   *
   * @param jobId - Job ID
   * @throws Error if job not found or not in idle state
   */
  markJobStarted(jobId: string): void {
    const job = this.getJobOrThrow(jobId);

    if (job.status !== 'idle') {
      throw new Error(`Cannot start job "${jobId}" - status is "${job.status}", expected "idle"`);
    }

    const updatedJob = markJobRunning(job);
    this.jobs.set(jobId, updatedJob);

    this.logger.debug(`Job started: ${jobId}`);
    this.emit('job-started', updatedJob);
  }

  /**
   * Mark a job as completed successfully
   *
   * @param jobId - Job ID
   * @param data - Optional result data
   * @throws Error if job not found
   */
  markJobComplete(jobId: string, data?: Record<string, unknown>): void {
    const job = this.getJobOrThrow(jobId);

    const updatedJob = markJobComplete(job);
    this.jobs.set(jobId, updatedJob);

    this.logger.debug(`Job completed: ${jobId}, next run: ${updatedJob.schedule.nextRun}`);
    this.emit('job-completed', updatedJob, data);
  }

  /**
   * Mark a job as failed
   *
   * @param jobId - Job ID
   * @param error - Error message
   * @throws Error if job not found
   */
  markJobFailed(jobId: string, error: string): void {
    const job = this.getJobOrThrow(jobId);

    const updatedJob = markJobFailed(job, error);
    this.jobs.set(jobId, updatedJob);

    const retryInfo = updatedJob.status === 'failed'
      ? 'max retries reached'
      : `retry ${updatedJob.schedule.retryCount}/${updatedJob.schedule.maxRetries}`;

    this.logger.warn(`Job failed: ${jobId} - ${error} (${retryInfo})`);
    this.emit('job-failed', updatedJob, { error });
  }

  /**
   * Pause a job (stops scheduling but preserves state)
   *
   * @param jobId - Job ID
   * @throws Error if job not found
   */
  pauseJob(jobId: string): void {
    const job = this.getJobOrThrow(jobId);

    const updatedJob = pauseJob(job);
    this.jobs.set(jobId, updatedJob);

    this.logger.debug(`Job paused: ${jobId}`);
    this.emit('job-paused', updatedJob);
  }

  /**
   * Resume a paused job
   *
   * @param jobId - Job ID
   * @throws Error if job not found
   */
  resumeJob(jobId: string): void {
    const job = this.getJobOrThrow(jobId);

    const updatedJob = resumeJob(job);
    this.jobs.set(jobId, updatedJob);

    this.logger.debug(`Job resumed: ${jobId}, next run: ${updatedJob.schedule.nextRun}`);
    this.emit('job-resumed', updatedJob);
  }

  /**
   * Reset a failed job for retry
   *
   * @param jobId - Job ID
   * @throws Error if job not found
   */
  resetJob(jobId: string): void {
    const job = this.getJobOrThrow(jobId);

    const updatedJob = resetJob(job);
    this.jobs.set(jobId, updatedJob);

    this.logger.debug(`Job reset: ${jobId}`);
  }

  /**
   * Update job interval
   *
   * @param jobId - Job ID
   * @param intervalMs - New interval in milliseconds
   * @throws Error if job not found
   */
  updateJobInterval(jobId: string, intervalMs: number): void {
    const job = this.getJobOrThrow(jobId);

    const updatedJob: ScheduledJob = {
      ...job,
      schedule: {
        ...job.schedule,
        intervalMs,
      },
    };
    this.jobs.set(jobId, updatedJob);

    this.logger.debug(`Job interval updated: ${jobId} -> ${intervalMs}ms`);
  }

  /**
   * Load jobs from persisted state
   *
   * @param jobs - Array of persisted jobs
   */
  loadJobs(jobs: ScheduledJob[]): void {
    this.jobs.clear();
    for (const job of jobs) {
      this.jobs.set(job.id, job);
    }
    this.logger.debug(`Loaded ${jobs.length} jobs from persistence`);
  }

  /**
   * Get all jobs for persistence
   *
   * @returns Array of all jobs
   */
  getJobsForPersistence(): ScheduledJob[] {
    return this.getAllJobs();
  }

  /**
   * Add an event listener
   *
   * @param listener - Callback function
   */
  addEventListener(listener: JobSchedulerEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove an event listener
   *
   * @param listener - Callback function
   */
  removeEventListener(listener: JobSchedulerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get scheduler statistics
   *
   * @returns Scheduler stats
   */
  getStats(): {
    totalJobs: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    dueCount: number;
  } {
    const jobs = this.getAllJobs();
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const job of jobs) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      byType[job.type] = (byType[job.type] || 0) + 1;
    }

    return {
      totalJobs: jobs.length,
      byStatus,
      byType,
      dueCount: this.getNextDueJobs().length,
    };
  }

  /**
   * Emit an event to all listeners
   */
  private emit(
    event: JobSchedulerEvent,
    job: ScheduledJob,
    data?: Record<string, unknown>
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(event, job, data);
      } catch (err) {
        this.logger.error(`Error in job scheduler event listener: ${err}`);
      }
    }
  }

  /**
   * Get a job or throw if not found
   */
  private getJobOrThrow(jobId: string): ScheduledJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return job;
  }
}
