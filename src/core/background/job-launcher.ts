/**
 * Background Job Launcher
 *
 * Spawns import workers as detached processes that survive terminal close.
 * Progress tracked via file system - check with /sw:jobs
 */

import { spawn } from 'child_process';
import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getJobManager } from './job-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import type { BackgroundJob, JobType, ImportJobConfig, CloneJobConfig, LivingDocsJobConfig, LivingDocsUserInputs, CodebaseRescanJobConfig, MarketplaceScanJobConfig } from './types.js';

/**
 * Module logger - can be replaced for testing
 */
let moduleLogger: Logger = consoleLogger;

/**
 * Set the logger for this module
 */
export function setJobLauncherLogger(logger: Logger): void {
  moduleLogger = logger;
}

// ESM compatibility: create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LaunchOptions {
  /** Job type */
  type: JobType;
  /** Project path */
  projectPath: string;
  /** Coordinator config for import */
  coordinatorConfig: any;
  /** Estimated total items (can be updated by worker) */
  estimatedTotal?: number;
  /** Run in foreground (blocking) instead of background */
  foreground?: boolean;
}

export interface LaunchResult {
  job: BackgroundJob;
  /** PID of background process (undefined if foreground) */
  pid?: number;
  /** Whether running in background */
  isBackground: boolean;
}

/**
 * Check if there's an active import job running
 * P2 FIX: Prevents concurrent imports that could conflict
 */
export function getActiveImportJob(projectPath: string): BackgroundJob | null {
  const jobManager = getJobManager(projectPath);
  const activeJobs = jobManager.getActiveJobs();

  // Find any running/pending import job
  const activeImport = activeJobs.find(
    j => j.type === 'import-issues' && (j.status === 'running' || j.status === 'pending')
  );

  if (activeImport) {
    // Verify it's actually running (not orphaned)
    if (isJobRunning(projectPath, activeImport.id)) {
      return activeImport;
    }
  }

  return null;
}

/**
 * Launch an import job
 *
 * @param options Launch configuration
 * @returns Job info and process details
 */
export async function launchImportJob(options: LaunchOptions): Promise<LaunchResult> {
  const { type, projectPath, coordinatorConfig, estimatedTotal = 100, foreground = false } = options;

  // P2 FIX: Check for existing active import to prevent conflicts
  const existingJob = getActiveImportJob(projectPath);
  if (existingJob) {
    throw new Error(
      `An import job is already running (Job ID: ${existingJob.id}). ` +
      `Use '/sw:jobs --kill ${existingJob.id}' to stop it first, ` +
      `or '/sw:jobs --follow ${existingJob.id}' to monitor progress.`
    );
  }

  // Create job via job manager
  const jobManager = getJobManager(projectPath);

  const provider = coordinatorConfig.github ? 'github' :
                   coordinatorConfig.jira ? 'jira' :
                   coordinatorConfig.ado ? 'ado' : 'github';

  const jobConfig: ImportJobConfig = {
    type: 'import-issues',
    provider: provider as 'github' | 'jira' | 'ado',
    projectPath,
    timeRangeMonths: coordinatorConfig.importConfig?.timeRangeMonths || 3,
    repositories: coordinatorConfig.githubRepositories?.map((r: any) => `${r.owner}/${r.repo}`)
  };

  const job = jobManager.createJob(type, jobConfig, estimatedTotal);

  // Create job-specific directory for config and logs
  const jobDir = path.join(projectPath, '.specweave', 'state', 'jobs', job.id);
  fs.ensureDirSync(jobDir);

  // Write coordinator config for worker
  const configPath = path.join(jobDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    jobId: job.id,
    projectPath,
    coordinatorConfig,
    startedAt: new Date().toISOString()
  }, null, 2));

  // If foreground mode, return job without spawning worker
  // Caller will handle the import directly
  if (foreground) {
    return {
      job,
      isBackground: false
    };
  }

  // Find worker script path
  const workerPath = findWorkerByName('import-worker.js');

  if (!workerPath) {
    // Fallback to foreground if worker not found
    moduleLogger.warn('Background worker not found, running in foreground');
    return {
      job,
      isBackground: false
    };
  }

  // Spawn detached process
  const child = spawn('node', [workerPath, job.id, projectPath], {
    detached: true,
    stdio: 'ignore',
    cwd: projectPath,
    windowsHide: true, // Prevent console window flash on Windows
    env: {
      ...process.env,
      // Pass any necessary env vars
      SPECWEAVE_BACKGROUND_JOB: '1'
    }
  });

  // Unref to allow parent to exit independently
  child.unref();

  // P1 FIX: Validate worker actually started before reporting success
  // Wait briefly and verify PID file exists + process is alive
  await validateWorkerStarted(projectPath, job.id, child.pid);

  // Update job with PID
  const updatedJob = jobManager.getJob(job.id);
  if (updatedJob) {
    (updatedJob as any).pid = child.pid;
    (updatedJob as any).isBackground = true;
  }

  return {
    job: updatedJob || job,
    pid: child.pid,
    isBackground: true
  };
}

/**
 * Validate that a worker process started successfully
 * Waits up to 2 seconds for PID file to appear and verifies process is alive
 */
async function validateWorkerStarted(
  projectPath: string,
  jobId: string,
  expectedPid?: number
): Promise<void> {
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');
  const maxWaitMs = 2000;
  const checkIntervalMs = 100;
  let elapsed = 0;

  // Wait for PID file to appear (worker writes it on startup)
  while (elapsed < maxWaitMs) {
    if (fs.existsSync(pidFile)) {
      // PID file exists - verify process is alive
      try {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);

        // Verify it matches expected PID (if provided)
        if (expectedPid && pid !== expectedPid) {
          throw new Error(`Worker PID mismatch: expected ${expectedPid}, got ${pid}`);
        }

        // Check process is alive (signal 0 = check without killing)
        process.kill(pid, 0);
        return; // Success - worker is running
      } catch (err: any) {
        if (err.code === 'ESRCH') {
          // Process not found - worker died immediately
          throw new Error('Worker process died immediately after startup. Check job logs.');
        }
        throw err;
      }
    }

    // Wait and retry
    await sleep(checkIntervalMs);
    elapsed += checkIntervalMs;
  }

  // Timeout - PID file never appeared
  throw new Error(`Worker failed to start within ${maxWaitMs}ms. Check job logs for errors.`);
}

/**
 * Simple sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface CloneLaunchOptions {
  /** Project path */
  projectPath: string;
  /** Repositories to clone with URLs */
  repositories: Array<{
    owner: string;
    name: string;
    path: string;
    cloneUrl: string;
  }>;
  /** Run in foreground (blocking) instead of background */
  foreground?: boolean;
}

/**
 * Launch a clone job
 *
 * @param options Launch configuration
 * @returns Job info and process details
 */
export async function launchCloneJob(options: CloneLaunchOptions): Promise<LaunchResult> {
  const { projectPath, repositories, foreground = false } = options;

  // Create job via job manager
  const jobManager = getJobManager(projectPath);

  const jobConfig: CloneJobConfig = {
    type: 'clone-repos',
    repositories: repositories.map(r => ({
      owner: r.owner,
      name: r.name,
      path: r.path
    })),
    projectPath
  };

  const job = jobManager.createJob('clone-repos', jobConfig, repositories.length);

  // Create job-specific directory for config and logs
  const jobDir = path.join(projectPath, '.specweave', 'state', 'jobs', job.id);
  fs.ensureDirSync(jobDir);

  // Write worker config (includes clone URLs with auth)
  const configPath = path.join(jobDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    jobId: job.id,
    projectPath,
    repositories,
    startedAt: new Date().toISOString()
  }, null, 2));

  // If foreground mode, return job without spawning worker
  if (foreground) {
    return {
      job,
      isBackground: false
    };
  }

  // Find clone worker script path
  const workerPath = findWorkerByName('clone-worker.js');

  if (!workerPath) {
    // Fallback to foreground if worker not found
    moduleLogger.warn('Clone worker not found, will run in foreground');
    return {
      job,
      isBackground: false
    };
  }

  // Spawn detached process
  const child = spawn('node', [workerPath, job.id, projectPath], {
    detached: true,
    stdio: 'ignore',
    cwd: projectPath,
    windowsHide: true, // Prevent console window flash on Windows
    env: {
      ...process.env,
      SPECWEAVE_BACKGROUND_JOB: '1'
    }
  });

  // Unref to allow parent to exit independently
  child.unref();

  // P1 FIX: Validate worker actually started before reporting success
  await validateWorkerStarted(projectPath, job.id, child.pid);

  // Update job with PID
  const updatedJob = jobManager.getJob(job.id);
  if (updatedJob) {
    (updatedJob as any).pid = child.pid;
    (updatedJob as any).isBackground = true;
  }

  return {
    job: updatedJob || job,
    pid: child.pid,
    isBackground: true
  };
}

export interface LivingDocsLaunchOptions {
  /** Project path */
  projectPath: string;
  /** User inputs collected before launch */
  userInputs: LivingDocsUserInputs;
  /** Job IDs to wait for before starting */
  dependsOn?: string[];
  /** Run in foreground (blocking) instead of background */
  foreground?: boolean;
}

/**
 * Launch a living-docs-builder job
 *
 * This job waits for dependencies (clone/import jobs) to complete before
 * analyzing the codebase and generating living documentation.
 *
 * @param options Launch configuration
 * @returns Job info and process details
 */
export async function launchLivingDocsJob(options: LivingDocsLaunchOptions): Promise<LaunchResult> {
  const { projectPath, userInputs, dependsOn, foreground = false } = options;

  // Create job via job manager
  const jobManager = getJobManager(projectPath);

  const jobConfig: LivingDocsJobConfig = {
    type: 'living-docs-builder',
    projectPath,
    dependsOn,
    userInputs
  };

  // Create job with initial estimate (will be updated during discovery)
  let job = jobManager.createJob('living-docs-builder', jobConfig, 100);

  // Set dependency tracking on the job (PERSISTED to background-jobs.json)
  // CRITICAL FIX (2025-12-09): Must use setDependencies() to persist, not direct mutation
  if (dependsOn && dependsOn.length > 0) {
    const updatedJob = jobManager.setDependencies(job.id, dependsOn);
    if (updatedJob) {
      job = updatedJob;
    }
  }

  // Create job-specific directory for config and logs
  const jobDir = path.join(projectPath, '.specweave', 'state', 'jobs', job.id);
  fs.ensureDirSync(jobDir);

  // Create checkpoints directory
  const checkpointsDir = path.join(jobDir, 'checkpoints');
  fs.ensureDirSync(checkpointsDir);

  // Create outputs directory
  const outputsDir = path.join(jobDir, 'outputs');
  fs.ensureDirSync(outputsDir);

  // Write worker config
  const configPath = path.join(jobDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    jobId: job.id,
    projectPath,
    userInputs,
    dependsOn: dependsOn || [],
    startedAt: new Date().toISOString()
  }, null, 2));

  // If foreground mode, return job without spawning worker
  if (foreground) {
    return {
      job,
      isBackground: false
    };
  }

  // Find living-docs worker script path
  const workerPath = findWorkerByName('living-docs-worker.js');

  if (!workerPath) {
    // Fallback to foreground if worker not found
    moduleLogger.warn('Living docs worker not found, will run in foreground');
    return {
      job,
      isBackground: false
    };
  }

  // Spawn detached process
  const child = spawn('node', [workerPath, job.id, projectPath], {
    detached: true,
    stdio: 'ignore',
    cwd: projectPath,
    windowsHide: true, // Prevent console window flash on Windows
    env: {
      ...process.env,
      SPECWEAVE_BACKGROUND_JOB: '1'
    }
  });

  // Unref to allow parent to exit independently
  child.unref();

  // Validate worker actually started before reporting success
  await validateWorkerStarted(projectPath, job.id, child.pid);

  // Update job with PID
  const updatedJob = jobManager.getJob(job.id);
  if (updatedJob) {
    (updatedJob as any).pid = child.pid;
    (updatedJob as any).isBackground = true;
  }

  return {
    job: updatedJob || job,
    pid: child.pid,
    isBackground: true
  };
}

export interface CodebaseRescanLaunchOptions {
  /** Project path */
  projectPath: string;
  /** The closed increment that triggered this rescan */
  closedIncrementId: string;
  /** Feature ID associated with the increment */
  featureId?: string;
  /** Specific paths/modules to focus on (derived from increment scope) */
  scopePaths?: string[];
  /** Whether to do deep analysis or quick sync */
  depth?: 'quick' | 'full';
  /** Run in foreground (blocking) instead of background */
  foreground?: boolean;
}

/**
 * Launch a codebase rescan job
 *
 * Triggered automatically when an increment closes to ensure living docs
 * reflect the ACTUAL code implementation (code as source of truth).
 *
 * @param options Launch configuration
 * @returns Job info and process details
 */
export async function launchCodebaseRescanJob(options: CodebaseRescanLaunchOptions): Promise<LaunchResult> {
  const {
    projectPath,
    closedIncrementId,
    featureId,
    scopePaths,
    depth = 'quick',
    foreground = false
  } = options;

  // Create job via job manager
  const jobManager = getJobManager(projectPath);

  const jobConfig: CodebaseRescanJobConfig = {
    type: 'codebase-rescan',
    projectPath,
    closedIncrementId,
    featureId,
    scopePaths,
    depth
  };

  // Create job with initial estimate
  const job = jobManager.createJob('codebase-rescan', jobConfig, 100);

  // Create job-specific directory for config and logs
  const jobDir = path.join(projectPath, '.specweave', 'state', 'jobs', job.id);
  fs.ensureDirSync(jobDir);

  // Write worker config
  const configPath = path.join(jobDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    jobId: job.id,
    projectPath,
    closedIncrementId,
    featureId,
    scopePaths,
    depth,
    startedAt: new Date().toISOString()
  }, null, 2));

  // If foreground mode, return job without spawning worker
  if (foreground) {
    return {
      job,
      isBackground: false
    };
  }

  // Find codebase-rescan worker script path
  const workerPath = findWorkerByName('codebase-rescan-worker.js');

  if (!workerPath) {
    // Fallback to foreground if worker not found
    moduleLogger.warn('Codebase rescan worker not found, will run in foreground');
    return {
      job,
      isBackground: false
    };
  }

  // Spawn detached process
  const child = spawn('node', [workerPath, job.id, projectPath], {
    detached: true,
    stdio: 'ignore',
    cwd: projectPath,
    windowsHide: true,
    env: {
      ...process.env,
      SPECWEAVE_BACKGROUND_JOB: '1'
    }
  });

  // Unref to allow parent to exit independently
  child.unref();

  // Validate worker actually started before reporting success
  await validateWorkerStarted(projectPath, job.id, child.pid);

  // Update job with PID
  const updatedJob = jobManager.getJob(job.id);
  if (updatedJob) {
    (updatedJob as any).pid = child.pid;
    (updatedJob as any).isBackground = true;
  }

  return {
    job: updatedJob || job,
    pid: child.pid,
    isBackground: true
  };
}

export interface MarketplaceScanLaunchOptions {
  /** Project path */
  projectPath: string;
  /** GitHub topics to search for */
  searchTopics: string[];
  /** Filenames to search for in repos */
  searchFilenames: string[];
  /** Maximum results per scan cycle */
  maxResultsPerScan?: number;
  /** Minutes between scan cycles */
  intervalMinutes?: number;
  /** Run in foreground (blocking) instead of background */
  foreground?: boolean;
}

/**
 * Launch a marketplace scan job
 *
 * Scans GitHub for community Claude Code skills and feeds them
 * through the submission queue for security verification.
 *
 * @param options Launch configuration
 * @returns Job info and process details
 */
export async function launchMarketplaceScanJob(options: MarketplaceScanLaunchOptions): Promise<LaunchResult> {
  const {
    projectPath,
    searchTopics,
    searchFilenames,
    maxResultsPerScan = 100,
    intervalMinutes = 60,
    foreground = false,
  } = options;

  // Create job via job manager
  const jobManager = getJobManager(projectPath);

  const jobConfig: MarketplaceScanJobConfig = {
    type: 'marketplace-scan',
    projectPath,
    searchTopics,
    searchFilenames,
    maxResultsPerScan,
    intervalMinutes,
  };

  const job = jobManager.createJob('marketplace-scan', jobConfig, maxResultsPerScan);

  // Create job-specific directory for config and logs
  const jobDir = path.join(projectPath, '.specweave', 'state', 'jobs', job.id);
  fs.ensureDirSync(jobDir);

  // Write worker config
  const configPath = path.join(jobDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    jobId: job.id,
    projectPath,
    searchTopics,
    searchFilenames,
    maxResultsPerScan,
    intervalMinutes,
    startedAt: new Date().toISOString()
  }, null, 2));

  // If foreground mode, return job without spawning worker
  if (foreground) {
    return {
      job,
      isBackground: false
    };
  }

  // Find marketplace scanner worker script path
  const workerPath = findWorkerByName('marketplace-scanner-worker.js');

  if (!workerPath) {
    // Fallback to foreground if worker not found
    moduleLogger.warn('Marketplace scanner worker not found, will run in foreground');
    return {
      job,
      isBackground: false
    };
  }

  // Spawn detached process
  const child = spawn('node', [workerPath, job.id, projectPath], {
    detached: true,
    stdio: 'ignore',
    cwd: projectPath,
    windowsHide: true,
    env: {
      ...process.env,
      SPECWEAVE_BACKGROUND_JOB: '1'
    }
  });

  // Unref to allow parent to exit independently
  child.unref();

  // Validate worker actually started before reporting success
  await validateWorkerStarted(projectPath, job.id, child.pid);

  // Update job with PID
  const updatedJob = jobManager.getJob(job.id);
  if (updatedJob) {
    (updatedJob as any).pid = child.pid;
    (updatedJob as any).isBackground = true;
  }

  return {
    job: updatedJob || job,
    pid: child.pid,
    isBackground: true
  };
}

/**
 * Check if a background job is still running
 */
export function isJobRunning(projectPath: string, jobId: string): boolean {
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');

  if (!fs.existsSync(pidFile)) {
    return false;
  }

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);

    // Check if process is running (signal 0 doesn't kill, just checks)
    process.kill(pid, 0);
    return true;
  } catch {
    // Process not running or no permission
    return false;
  }
}

/**
 * Kill a background job
 */
export function killJob(projectPath: string, jobId: string): boolean {
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');

  if (!fs.existsSync(pidFile)) {
    return false;
  }

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);

    // Send SIGTERM for graceful shutdown
    process.kill(pid, 'SIGTERM');

    // Update job status
    const jobManager = getJobManager(projectPath);
    jobManager.pauseJob(jobId);

    return true;
  } catch {
    return false;
  }
}

/**
 * Get worker log output
 */
export function getJobLog(projectPath: string, jobId: string, tailLines?: number): string {
  const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');

  if (!fs.existsSync(logPath)) {
    return '';
  }

  const content = fs.readFileSync(logPath, 'utf-8');

  if (tailLines && tailLines > 0) {
    const lines = content.split('\n');
    return lines.slice(-tailLines).join('\n');
  }

  return content;
}

/**
 * Get job result (after completion)
 */
export function getJobResult(projectPath: string, jobId: string): any | null {
  const resultPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'result.json');

  if (!fs.existsSync(resultPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
  } catch {
    return null;
  }
}

const WORKER_PATHS = [
  '../../cli/workers',           // From dist/src/core/background (compiled)
  '../../../dist/src/cli/workers', // From src/core/background (dev)
  '../../../../cli/workers',     // Global install
];

/**
 * Find a worker script by name
 */
function findWorkerByName(workerName: string): string | null {
  for (const basePath of WORKER_PATHS) {
    const resolved = path.resolve(path.join(__dirname, basePath, workerName));
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  return null;
}

/**
 * Get orphaned jobs without modifying them (for display)
 */
export function getOrphanedJobs(projectPath: string): BackgroundJob[] {
  const jobManager = getJobManager(projectPath);
  return jobManager.getActiveJobs().filter(
    job => job.status === 'running' && !isJobRunning(projectPath, job.id)
  );
}

/**
 * Detect and handle orphaned jobs
 * P2 FIX: Jobs marked as "running" but worker is dead
 *
 * Returns list of orphaned jobs that were fixed
 */
export function detectOrphanedJobs(projectPath: string): BackgroundJob[] {
  const jobManager = getJobManager(projectPath);
  const orphaned = getOrphanedJobs(projectPath);

  for (const job of orphaned) {
    // Mark job as failed with explanation
    jobManager.completeJob(
      job.id,
      'Worker process died unexpectedly. Job was orphaned and needs manual restart.'
    );

    // Clean up stale PID file if exists
    const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', job.id, 'worker.pid');
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // Ignore cleanup errors
    }
  }

  return orphaned;
}

const DELETABLE_STATUSES = ['completed', 'completed_with_warnings', 'failed'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Clean up old job directories
 */
export function cleanupOldJobs(projectPath: string, keepDays: number = 7): void {
  const jobsDir = path.join(projectPath, '.specweave', 'state', 'jobs');

  if (!fs.existsSync(jobsDir)) {
    return;
  }

  const cutoff = Date.now() - keepDays * MS_PER_DAY;
  const jobManager = getJobManager(projectPath);

  try {
    for (const entry of fs.readdirSync(jobsDir)) {
      const jobDir = path.join(jobsDir, entry);
      const stat = fs.statSync(jobDir);

      if (!stat.isDirectory() || stat.mtimeMs >= cutoff) {
        continue;
      }

      const job = jobManager.getJob(entry);
      if (!job || DELETABLE_STATUSES.includes(job.status)) {
        fs.rmSync(jobDir, { recursive: true, force: true });
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
