/**
 * Scheduled Job Types
 *
 * Defines the types for scheduled jobs in the sync orchestration system.
 *
 * @module core/scheduler/scheduled-job
 */

/**
 * Job types supported by the scheduler
 */
export type JobType =
  | 'external-sync'         // Push sync to GitHub/JIRA/ADO
  | 'external-pull'         // Pull changes from GitHub/JIRA/ADO
  | 'discrepancy-check'     // Code vs spec comparison
  | 'living-docs-sync'      // Sync living docs changes
  | 'notification-cleanup'; // Clean old notifications

/**
 * Job status values
 */
export type JobStatus = 'idle' | 'running' | 'failed' | 'disabled';

/**
 * Job schedule configuration
 */
export interface JobSchedule {
  /**
   * Interval between job runs in milliseconds
   */
  intervalMs: number;

  /**
   * Whether the job is enabled
   */
  enabled: boolean;

  /**
   * ISO timestamp of last successful run
   */
  lastRun?: string;

  /**
   * ISO timestamp of next scheduled run
   */
  nextRun?: string;

  /**
   * Current retry count for failed jobs
   */
  retryCount: number;

  /**
   * Maximum retries before giving up
   * @default 3
   */
  maxRetries: number;
}

/**
 * Scheduled job definition
 */
export interface ScheduledJob {
  /**
   * Unique job identifier (e.g., 'external-sync', 'discrepancy-check')
   */
  id: string;

  /**
   * Job type
   */
  type: JobType;

  /**
   * Schedule configuration
   */
  schedule: JobSchedule;

  /**
   * Current job status
   */
  status: JobStatus;

  /**
   * Error message if job failed
   */
  lastError?: string;

  /**
   * ISO timestamp of last state change
   */
  lastStateChange?: string;
}

/**
 * Configuration for registering a new job
 */
export interface ScheduledJobConfig {
  /**
   * Job identifier
   */
  id: string;

  /**
   * Job type
   */
  type: JobType;

  /**
   * Interval in milliseconds
   */
  intervalMs: number;

  /**
   * Initial enabled state
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum retries
   * @default 3
   */
  maxRetries?: number;
}

/**
 * Job execution result
 */
export interface JobExecutionResult {
  /**
   * Whether the job succeeded
   */
  success: boolean;

  /**
   * Duration in milliseconds
   */
  durationMs: number;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Job-specific result data
   */
  data?: Record<string, unknown>;
}

/**
 * Create a new scheduled job from config
 *
 * @param config - Job configuration
 * @returns New scheduled job
 */
export function createScheduledJob(config: ScheduledJobConfig): ScheduledJob {
  const now = new Date().toISOString();
  const intervalMs = config.intervalMs;
  const nextRun = new Date(Date.now() + intervalMs).toISOString();

  return {
    id: config.id,
    type: config.type,
    schedule: {
      intervalMs,
      enabled: config.enabled ?? true,
      nextRun,
      retryCount: 0,
      maxRetries: config.maxRetries ?? 3,
    },
    status: 'idle',
    lastStateChange: now,
  };
}

/**
 * Calculate next run time with optional exponential backoff
 *
 * @param job - The job to calculate next run for
 * @param withBackoff - Whether to apply exponential backoff (for retries)
 * @returns ISO timestamp of next run
 */
export function calculateNextRun(job: ScheduledJob, withBackoff = false): string {
  let delayMs = job.schedule.intervalMs;

  if (withBackoff && job.schedule.retryCount > 0) {
    // Exponential backoff: 2^retryCount * base interval, capped at 1 hour
    const backoffMultiplier = Math.pow(2, job.schedule.retryCount);
    delayMs = Math.min(delayMs * backoffMultiplier, 60 * 60 * 1000);
  }

  return new Date(Date.now() + delayMs).toISOString();
}

/**
 * Check if a job is due for execution
 *
 * @param job - The job to check
 * @returns true if job should run now
 */
export function isJobDue(job: ScheduledJob): boolean {
  // Job must be enabled and idle
  if (!job.schedule.enabled || job.status !== 'idle') {
    return false;
  }

  // If no next run scheduled, it's due
  if (!job.schedule.nextRun) {
    return true;
  }

  // Check if current time is past scheduled time
  const now = Date.now();
  const nextRun = new Date(job.schedule.nextRun).getTime();

  return now >= nextRun;
}

/**
 * Update job state after successful execution
 *
 * @param job - The job to update
 * @returns Updated job
 */
export function markJobComplete(job: ScheduledJob): ScheduledJob {
  const now = new Date().toISOString();
  return {
    ...job,
    status: 'idle',
    schedule: {
      ...job.schedule,
      lastRun: now,
      nextRun: calculateNextRun(job),
      retryCount: 0, // Reset retry count on success
    },
    lastError: undefined,
    lastStateChange: now,
  };
}

/**
 * Update job state after failed execution
 *
 * @param job - The job to update
 * @param error - Error message
 * @returns Updated job
 */
export function markJobFailed(job: ScheduledJob, error: string): ScheduledJob {
  const now = new Date().toISOString();
  const newRetryCount = job.schedule.retryCount + 1;
  const maxRetriesReached = newRetryCount >= job.schedule.maxRetries;

  const updatedJob: ScheduledJob = {
    ...job,
    status: maxRetriesReached ? 'failed' : 'idle',
    schedule: {
      ...job.schedule,
      retryCount: newRetryCount,
      nextRun: maxRetriesReached ? undefined : calculateNextRun(job, true),
    },
    lastError: error,
    lastStateChange: now,
  };

  return updatedJob;
}

/**
 * Mark job as running
 *
 * @param job - The job to update
 * @returns Updated job
 */
export function markJobRunning(job: ScheduledJob): ScheduledJob {
  return {
    ...job,
    status: 'running',
    lastStateChange: new Date().toISOString(),
  };
}

/**
 * Pause a job (disable without clearing schedule)
 *
 * @param job - The job to pause
 * @returns Updated job
 */
export function pauseJob(job: ScheduledJob): ScheduledJob {
  return {
    ...job,
    status: 'disabled',
    schedule: {
      ...job.schedule,
      enabled: false,
    },
    lastStateChange: new Date().toISOString(),
  };
}

/**
 * Resume a paused job
 *
 * @param job - The job to resume
 * @returns Updated job
 */
export function resumeJob(job: ScheduledJob): ScheduledJob {
  return {
    ...job,
    status: 'idle',
    schedule: {
      ...job.schedule,
      enabled: true,
      nextRun: calculateNextRun(job),
      retryCount: 0, // Reset retries on resume
    },
    lastError: undefined,
    lastStateChange: new Date().toISOString(),
  };
}

/**
 * Reset a failed job for retry
 *
 * @param job - The job to reset
 * @returns Updated job
 */
export function resetJob(job: ScheduledJob): ScheduledJob {
  return {
    ...job,
    status: 'idle',
    schedule: {
      ...job.schedule,
      retryCount: 0,
      nextRun: calculateNextRun(job),
    },
    lastError: undefined,
    lastStateChange: new Date().toISOString(),
  };
}
