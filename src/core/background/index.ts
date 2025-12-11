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
 * - Check status: /sw:jobs
 * - Resume: /sw:jobs --resume <jobId>
 * - Kill: /sw:jobs --kill <jobId>
 */

export * from './types.js';
export * from './job-manager.js';
export {
  launchImportJob,
  launchCloneJob,
  launchLivingDocsJob,
  isJobRunning,
  killJob,
  getJobLog,
  getJobResult,
  cleanupOldJobs,
  getActiveImportJob,
  detectOrphanedJobs,
  getOrphanedJobs
} from './job-launcher.js';
export type { LaunchOptions, LaunchResult, CloneLaunchOptions, LivingDocsLaunchOptions } from './job-launcher.js';

// Brownfield analysis jobs
export {
  launchBrownfieldAnalysisJob,
  loadJobState as loadBrownfieldJobState,
  listBrownfieldJobs,
  getActiveBrownfieldJob,
  updateJobProgress as updateBrownfieldProgress,
  completeJob as completeBrownfieldJob,
  failJob as failBrownfieldJob,
  pauseJob as pauseBrownfieldJob,
  resumeJob as resumeBrownfieldJob,
  deleteJob as deleteBrownfieldJob,
  formatCompletionNotification as formatBrownfieldNotification,
} from './brownfield-launcher.js';
export type {
  BrownfieldLaunchOptions,
  BrownfieldLaunchResult,
  BrownfieldCompletionStats,
} from './brownfield-launcher.js';
