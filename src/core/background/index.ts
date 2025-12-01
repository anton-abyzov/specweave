/**
 * Background Jobs Module
 *
 * Long-running operations that can run in background:
 * - Repository cloning (multi-repo setup)
 * - Issue import (10K+ items from GitHub/JIRA/ADO)
 * - External sync operations
 *
 * ASYNC ARCHITECTURE (2025-12-01):
 * - Jobs spawn as detached processes that survive terminal close
 * - Progress tracked via filesystem (.specweave/state/jobs/)
 * - Check status: /specweave:jobs
 * - Resume: /specweave:jobs --resume <jobId>
 * - Kill: /specweave:jobs --kill <jobId>
 */

export * from './types.js';
export * from './job-manager.js';
export {
  launchImportJob,
  launchCloneJob,
  isJobRunning,
  killJob,
  getJobLog,
  getJobResult,
  cleanupOldJobs,
  getActiveImportJob,
  detectOrphanedJobs,
  getOrphanedJobs
} from './job-launcher.js';
export type { LaunchOptions, LaunchResult, CloneLaunchOptions } from './job-launcher.js';
