/**
 * Background Job Launcher
 *
 * Spawns import workers as detached processes that survive terminal close.
 * Progress tracked via file system - check with /specweave:jobs
 */

import { spawn } from 'child_process';
import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getJobManager } from './job-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import type { BackgroundJob, JobType, ImportJobConfig, CloneJobConfig, LivingDocsJobConfig, LivingDocsUserInputs } from './types.js';

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
      `Use '/specweave:jobs --kill ${existingJob.id}' to stop it first, ` +
      `or '/specweave:jobs --follow ${existingJob.id}' to monitor progress.`
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
  const workerPath = findWorkerPath();

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
  const workerPath = findCloneWorkerPath();

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
  const workerPath = findLivingDocsWorkerPath();

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

/**
 * Find the import worker script path
 */
function findWorkerPath(): string | null {
  return findWorkerByName('import-worker.js');
}

/**
 * Find the clone worker script path
 */
function findCloneWorkerPath(): string | null {
  return findWorkerByName('clone-worker.js');
}

/**
 * Find the living-docs worker script path
 */
function findLivingDocsWorkerPath(): string | null {
  return findWorkerByName('living-docs-worker.js');
}

/**
 * Find a worker script by name
 */
function findWorkerByName(workerName: string): string | null {
  // Try relative paths from different locations
  const possiblePaths = [
    // From dist/src/core/background (compiled)
    path.join(__dirname, '../../cli/workers', workerName),
    // From src/core/background (dev)
    path.join(__dirname, '../../../dist/src/cli/workers', workerName),
    // Global install
    path.join(__dirname, '../../../../cli/workers', workerName),
  ];

  for (const p of possiblePaths) {
    const resolved = path.resolve(p);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

/**
 * Detect and handle orphaned jobs
 * P2 FIX: Jobs marked as "running" but worker is dead
 *
 * Returns list of orphaned jobs that were fixed
 */
export function detectOrphanedJobs(projectPath: string): BackgroundJob[] {
  const jobManager = getJobManager(projectPath);
  const activeJobs = jobManager.getActiveJobs();
  const orphaned: BackgroundJob[] = [];

  for (const job of activeJobs) {
    if (job.status === 'running') {
      // Check if worker is actually running
      if (!isJobRunning(projectPath, job.id)) {
        // Worker is dead but job is marked running - orphaned
        orphaned.push(job);

        // Mark job as failed with explanation
        jobManager.completeJob(
          job.id,
          'Worker process died unexpectedly. Job was orphaned and needs manual restart.'
        );

        // Clean up stale PID file if exists
        const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', job.id, 'worker.pid');
        if (fs.existsSync(pidFile)) {
          try {
            fs.unlinkSync(pidFile);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }
  }

  return orphaned;
}

/**
 * Get orphaned jobs without modifying them (for display)
 */
export function getOrphanedJobs(projectPath: string): BackgroundJob[] {
  const jobManager = getJobManager(projectPath);
  const activeJobs = jobManager.getActiveJobs();
  const orphaned: BackgroundJob[] = [];

  for (const job of activeJobs) {
    if (job.status === 'running') {
      if (!isJobRunning(projectPath, job.id)) {
        orphaned.push(job);
      }
    }
  }

  return orphaned;
}

/**
 * Clean up old job directories
 */
export function cleanupOldJobs(projectPath: string, keepDays: number = 7): void {
  const jobsDir = path.join(projectPath, '.specweave', 'state', 'jobs');

  if (!fs.existsSync(jobsDir)) {
    return;
  }

  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

  try {
    const entries = fs.readdirSync(jobsDir);

    for (const entry of entries) {
      const jobDir = path.join(jobsDir, entry);
      const stat = fs.statSync(jobDir);

      if (stat.isDirectory() && stat.mtimeMs < cutoff) {
        // Check job status before deleting
        const jobManager = getJobManager(projectPath);
        const job = jobManager.getJob(entry);

        // Only delete completed/failed/completed_with_warnings jobs
        if (!job || job.status === 'completed' || job.status === 'completed_with_warnings' || job.status === 'failed') {
          fs.rmSync(jobDir, { recursive: true, force: true });
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
