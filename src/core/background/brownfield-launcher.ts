/**
 * Brownfield Analysis Job Launcher
 *
 * Launches brownfield documentation analysis as a background job.
 * Supports long-running analysis of large codebases (1000+ files).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  BackgroundJob,
  BrownfieldJobConfig,
  BrownfieldPhase,
  JobProgress,
} from './types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Options for launching brownfield analysis
 */
export interface BrownfieldLaunchOptions {
  projectPath: string;
  sourceDocsPath?: string;
  analysisDepth: 'quick' | 'standard' | 'deep';
  logger?: Logger;
}

/**
 * Result of launching a brownfield job
 */
export interface BrownfieldLaunchResult {
  success: boolean;
  jobId: string;
  message: string;
}

/**
 * Brownfield job state directory
 */
function getJobsDir(projectPath: string): string {
  return path.join(projectPath, '.specweave', 'state', 'jobs', 'brownfield');
}

/**
 * Get job state file path
 */
function getJobStatePath(projectPath: string, jobId: string): string {
  return path.join(getJobsDir(projectPath), `${jobId}.json`);
}

/**
 * Create initial job state
 */
function createInitialJobState(
  jobId: string,
  config: BrownfieldJobConfig
): BackgroundJob {
  return {
    id: jobId,
    type: 'brownfield-analysis',
    status: 'pending',
    progress: {
      current: 0,
      total: 5, // 5 phases
      percentage: 0,
      currentItem: 'Initializing',
      itemsCompleted: [],
      itemsFailed: [],
    },
    startedAt: new Date(),
    updatedAt: new Date(),
    config,
  };
}

/**
 * Save job state to filesystem
 */
function saveJobState(projectPath: string, job: BackgroundJob): void {
  const jobsDir = getJobsDir(projectPath);
  if (!fs.existsSync(jobsDir)) {
    fs.mkdirSync(jobsDir, { recursive: true });
  }
  const statePath = getJobStatePath(projectPath, job.id);
  fs.writeFileSync(statePath, JSON.stringify(job, null, 2));
}

/**
 * Load job state from filesystem
 */
export function loadJobState(projectPath: string, jobId: string): BackgroundJob | null {
  const statePath = getJobStatePath(projectPath, jobId);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content) as BackgroundJob;
  } catch {
    return null;
  }
}

/**
 * List all brownfield jobs for a project
 */
export function listBrownfieldJobs(projectPath: string): BackgroundJob[] {
  const jobsDir = getJobsDir(projectPath);
  if (!fs.existsSync(jobsDir)) {
    return [];
  }

  const jobs: BackgroundJob[] = [];
  const files = fs.readdirSync(jobsDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const jobId = file.replace('.json', '');
    const job = loadJobState(projectPath, jobId);
    if (job) {
      jobs.push(job);
    }
  }

  // Sort by start date, newest first
  return jobs.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Get the most recent active brownfield job
 */
export function getActiveBrownfieldJob(projectPath: string): BackgroundJob | null {
  const jobs = listBrownfieldJobs(projectPath);
  return jobs.find(j => j.status === 'running' || j.status === 'pending') || null;
}

/**
 * Update job progress
 */
export function updateJobProgress(
  projectPath: string,
  jobId: string,
  phase: BrownfieldPhase,
  current: number,
  total: number,
  currentItem?: string
): void {
  const job = loadJobState(projectPath, jobId);
  if (!job) return;

  const phaseIndex = {
    'discovery': 0,
    'code-analysis': 1,
    'doc-matching': 2,
    'discrepancy-detect': 3,
    'reporting': 4,
  };

  job.progress = {
    current: phaseIndex[phase],
    total: 5,
    percentage: Math.round((phaseIndex[phase] / 5) * 100),
    currentItem: currentItem || `Phase: ${phase} (${current}/${total})`,
    itemsCompleted: job.progress.itemsCompleted,
    itemsFailed: job.progress.itemsFailed,
  };
  job.updatedAt = new Date();
  job.status = 'running';

  // Update checkpoint for resume
  const config = job.config as BrownfieldJobConfig;
  config.checkpoint = {
    phase,
    lastProcessedPath: currentItem || '',
    processedCount: current,
  };

  saveJobState(projectPath, job);
}

/**
 * Brownfield completion statistics
 */
export interface BrownfieldCompletionStats {
  discrepancyCount: number;
  filesAnalyzed: number;
  modulesDetected: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  durationMs: number;
}

/**
 * Mark job as completed with full statistics
 */
export function completeJob(
  projectPath: string,
  jobId: string,
  discrepancyCount: number,
  stats?: BrownfieldCompletionStats
): void {
  const job = loadJobState(projectPath, jobId);
  if (!job) return;

  const startTime = new Date(job.startedAt).getTime();
  const endTime = Date.now();
  const durationMs = endTime - startTime;

  job.status = 'completed';
  job.completedAt = new Date();
  job.progress = {
    ...job.progress,
    current: 5,
    total: 5,
    percentage: 100,
    currentItem: `Completed: ${discrepancyCount} discrepancies found`,
  };
  job.updatedAt = new Date();
  job.result = {
    discrepancyCount,
    filesAnalyzed: stats?.filesAnalyzed ?? 0,
    modulesDetected: stats?.modulesDetected ?? 0,
    byType: stats?.byType ?? {},
    byPriority: stats?.byPriority ?? {},
    durationMs: stats?.durationMs ?? durationMs,
  };

  saveJobState(projectPath, job);
}

/**
 * Format completion notification for display
 */
export function formatCompletionNotification(
  jobId: string,
  stats: BrownfieldCompletionStats
): string {
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
  };

  const typeLines = Object.entries(stats.byType)
    .map(([type, count]) => {
      const percentage = Math.round((count / stats.discrepancyCount) * 100);
      return `     ${type.padEnd(15)}: ${String(count).padStart(3)} (${percentage}%)`;
    })
    .join('\n');

  const priorityIcons: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  const priorityLines = Object.entries(stats.byPriority)
    .map(([priority, count]) => {
      const icon = priorityIcons[priority] ?? '⚪';
      return `     ${icon} ${priority.charAt(0).toUpperCase() + priority.slice(1).padEnd(8)}: ${String(count).padStart(3)}`;
    })
    .join('\n');

  return `
✅ Brownfield Analysis Complete (${jobId})

📊 Results Summary:
   Files analyzed: ${stats.filesAnalyzed.toLocaleString()}
   Modules detected: ${stats.modulesDetected}
   Duration: ${formatDuration(stats.durationMs)}

📋 Discrepancies Found: ${stats.discrepancyCount}
   By Type:
${typeLines}

   By Priority:
${priorityLines}

💡 Next Steps:
   /specweave:discrepancies           → View all pending discrepancies
   /specweave:discrepancies --module <name> → Filter by module
   /specweave:discrepancy-to-increment DISC-0001 DISC-0002 → Create increment
`.trim();
}

/**
 * Mark job as failed
 */
export function failJob(projectPath: string, jobId: string, error: string): void {
  const job = loadJobState(projectPath, jobId);
  if (!job) return;

  job.status = 'failed';
  job.error = error;
  job.updatedAt = new Date();

  saveJobState(projectPath, job);
}

/**
 * Pause a running job
 */
export function pauseJob(projectPath: string, jobId: string): boolean {
  const job = loadJobState(projectPath, jobId);
  if (!job || job.status !== 'running') return false;

  job.status = 'paused';
  job.updatedAt = new Date();

  saveJobState(projectPath, job);
  return true;
}

/**
 * Launch brownfield analysis as a background job
 *
 * Note: In the current implementation, this creates the job state
 * but the actual analysis is performed by the brownfield-worker
 * which is invoked separately. For now, this sets up the job
 * for future integration with a proper background process system.
 */
export async function launchBrownfieldAnalysisJob(
  options: BrownfieldLaunchOptions
): Promise<BrownfieldLaunchResult> {
  const logger = options.logger ?? consoleLogger;
  const jobId = `bf-${uuidv4().slice(0, 8)}`;

  const config: BrownfieldJobConfig = {
    type: 'brownfield-analysis',
    projectPath: options.projectPath,
    sourceDocsPath: options.sourceDocsPath,
    analysisDepth: options.analysisDepth,
  };

  // Create initial job state
  const job = createInitialJobState(jobId, config);
  saveJobState(options.projectPath, job);

  logger.log(`Created brownfield analysis job: ${jobId}`);
  logger.log(`Analysis depth: ${options.analysisDepth}`);
  if (options.sourceDocsPath) {
    logger.log(`Source docs: ${options.sourceDocsPath}`);
  }

  // Note: In a full implementation, we would spawn a worker process here
  // For now, the job is created and can be executed by the worker manually
  // or as part of the init flow

  return {
    success: true,
    jobId,
    message: `Brownfield analysis job ${jobId} created. Run /specweave:jobs to monitor.`,
  };
}

/**
 * Resume a paused job
 */
export function resumeJob(projectPath: string, jobId: string): boolean {
  const job = loadJobState(projectPath, jobId);
  if (!job || job.status !== 'paused') return false;

  job.status = 'running';
  job.updatedAt = new Date();

  saveJobState(projectPath, job);
  return true;
}

/**
 * Delete a job and its state
 */
export function deleteJob(projectPath: string, jobId: string): boolean {
  const statePath = getJobStatePath(projectPath, jobId);
  if (!fs.existsSync(statePath)) return false;

  try {
    fs.unlinkSync(statePath);
    return true;
  } catch {
    return false;
  }
}
