/**
 * Background Job Launcher
 *
 * Spawns import workers as detached processes that survive terminal close.
 * Progress tracked via file system - check with /specweave:jobs
 */

import { spawn } from 'child_process';
import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { getJobManager } from './job-manager.js';
import type { BackgroundJob, JobType, ImportJobConfig, CloneJobConfig } from './types.js';

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
 * Launch an import job
 *
 * @param options Launch configuration
 * @returns Job info and process details
 */
export async function launchImportJob(options: LaunchOptions): Promise<LaunchResult> {
  const { type, projectPath, coordinatorConfig, estimatedTotal = 100, foreground = false } = options;

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
    console.warn('Background worker not found, running in foreground');
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
    console.warn('Clone worker not found, will run in foreground');
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

        // Only delete completed/failed jobs
        if (!job || job.status === 'completed' || job.status === 'failed') {
          fs.rmSync(jobDir, { recursive: true, force: true });
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
