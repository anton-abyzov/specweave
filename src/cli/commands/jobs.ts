/**
 * Background Jobs CLI Command
 *
 * Monitor and manage long-running background operations:
 * - Repository cloning (multi-repo/umbrella setup)
 * - Issue import (10K+ items from GitHub/JIRA/ADO)
 * - External sync operations
 *
 * Usage:
 *   specweave jobs                    # Show active jobs
 *   specweave jobs --all              # Show all jobs (including completed)
 *   specweave jobs --id <jobId>       # Show details for specific job
 *   specweave jobs --logs <jobId>     # Show worker log output
 *   specweave jobs --follow <jobId>   # Follow job progress in real-time
 *   specweave jobs --kill <jobId>     # Kill running background job
 *   specweave jobs --resume <jobId>   # Resume paused job
 */

import * as path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import {
  getJobManager,
  isJobRunning,
  killJob,
  getJobLog,
  getJobResult,
  launchImportJob,
} from '../../core/background/index.js';
import type { BackgroundJob, ImportJobConfig, SyncJobConfig } from '../../core/background/types.js';
import * as fs from '../../utils/fs-native.js';

interface JobsCommandOptions {
  all?: boolean;
  id?: string;
  logs?: string;
  follow?: string;
  kill?: string;
  resume?: string;
}

/**
 * Execute jobs command logic
 * Exported for use in bin/specweave.js
 */
export async function jobsCommand(options: JobsCommandOptions = {}): Promise<void> {
  const projectPath = process.cwd();

  // Check if SpecWeave is initialized
  const specweavePath = path.join(projectPath, '.specweave');
  if (!fs.existsSync(specweavePath)) {
    console.log(chalk.yellow('No SpecWeave project found in current directory.'));
    console.log(chalk.gray('Run `specweave init` to initialize a project.'));
    return;
  }

  try {
    if (options.kill) {
      await handleKill(projectPath, options.kill);
    } else if (options.resume) {
      await handleResume(projectPath, options.resume);
    } else if (options.logs) {
      await handleLogs(projectPath, options.logs);
    } else if (options.follow) {
      await handleFollow(projectPath, options.follow);
    } else if (options.id) {
      await handleJobDetails(projectPath, options.id);
    } else {
      await handleListJobs(projectPath, options.all ?? true); // Default: show all jobs
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}

export function createJobsCommand(): Command {
  const cmd = new Command('jobs')
    .description('Monitor and manage background jobs (imports, cloning, sync)')
    .option('--all', 'Show all jobs (including completed)')
    .option('--id <jobId>', 'Show details for specific job')
    .option('--logs <jobId>', 'Show worker log output')
    .option('--follow <jobId>', 'Follow job progress in real-time')
    .option('--kill <jobId>', 'Kill running background job')
    .option('--resume <jobId>', 'Resume paused job')
    .action(async (options) => {
      await jobsCommand(options);
    });

  return cmd;
}

/**
 * Get provider/description from job config (type-safe)
 */
function getJobProvider(job: BackgroundJob): string {
  const config = job.config;
  if (config.type === 'import-issues' || config.type === 'sync-external') {
    return (config as ImportJobConfig | SyncJobConfig).provider || 'unknown';
  }
  if (config.type === 'clone-repos') {
    return 'git';
  }
  if (config.type === 'living-docs-builder') {
    // Show dependency status if waiting
    // Check both job.dependencyStatus AND job.dependsOn (for jobs created before this fix)
    const depStatus = job.dependencyStatus;
    const hasDependencies = job.dependsOn && job.dependsOn.length > 0;

    if (depStatus === 'waiting' || (hasDependencies && depStatus !== 'ready' && depStatus !== 'partial')) {
      // Show which jobs we're waiting for
      const depIds = job.dependsOn?.map(id => id.slice(0, 8)).join(', ') || '';
      return depIds ? `waiting: ${depIds}` : 'waiting for deps';
    }
    if (depStatus === 'partial') {
      return 'running (some deps failed)';
    }
    return 'codebase analysis';
  }
  if (config.type === 'brownfield-analysis') {
    return 'brownfield';
  }
  return 'unknown';
}

/**
 * List all jobs
 */
async function handleListJobs(projectPath: string, showAll: boolean): Promise<void> {
  const jobManager = getJobManager(projectPath);
  const jobs = jobManager.getJobs();

  if (jobs.length === 0) {
    console.log(chalk.gray('No background jobs found.'));
    console.log(chalk.gray('\nJobs are created when importing large datasets during `specweave init`.'));
    return;
  }

  // Group jobs by status
  const running = jobs.filter((j: BackgroundJob) => j.status === 'running');
  const pending = jobs.filter((j: BackgroundJob) => j.status === 'pending');
  const paused = jobs.filter((j: BackgroundJob) => j.status === 'paused');
  const completed = jobs.filter((j: BackgroundJob) => j.status === 'completed');
  const completedWithWarnings = jobs.filter((j: BackgroundJob) => j.status === 'completed_with_warnings');
  const failed = jobs.filter((j: BackgroundJob) => j.status === 'failed');

  console.log(chalk.blue('\n📋 Background Jobs\n'));

  // Running jobs
  if (running.length > 0) {
    console.log(chalk.green(`🔄 Running (${running.length}):`));
    for (const job of running) {
      printJobSummary(job, projectPath);
    }
    console.log('');
  }

  // Pending jobs (worker started but not yet running - may indicate crash)
  if (pending.length > 0) {
    console.log(chalk.yellow(`⏳ Pending (${pending.length}):`));
    for (const job of pending) {
      // Check if worker is actually running
      const workerAlive = isJobRunning(projectPath, job.id);
      printJobSummary(job, projectPath);
      if (!workerAlive) {
        console.log(chalk.red(`     ⚠️  Worker not running - job may have crashed before starting`));
        console.log(chalk.gray(`     → Check logs: specweave jobs --logs ${job.id.slice(0, 8)}`));
      }
    }
    console.log('');
  }

  // Paused jobs
  if (paused.length > 0) {
    console.log(chalk.yellow(`⏸️  Paused (${paused.length}):`));
    for (const job of paused) {
      printJobSummary(job, projectPath);
    }
    console.log('');
  }

  // Completed with warnings (partial success - v0.33.5)
  if (completedWithWarnings.length > 0) {
    console.log(chalk.yellow(`⚠️  Completed with Warnings (${completedWithWarnings.length}):`));
    for (const job of completedWithWarnings) {
      printJobSummary(job, projectPath);
      if (job.error) {
        console.log(chalk.yellow(`     ℹ️  ${job.error}`));
      }
    }
    console.log('');
  }

  // Failed jobs
  if (failed.length > 0) {
    console.log(chalk.red(`❌ Failed (${failed.length}):`));
    for (const job of failed) {
      printJobSummary(job, projectPath);
    }
    console.log('');
  }

  // Completed jobs (only if --all)
  if (showAll && completed.length > 0) {
    console.log(chalk.gray(`✅ Completed (${completed.length}):`));
    for (const job of completed.slice(0, 10)) {
      printJobSummary(job, projectPath, true);
    }
    if (completed.length > 10) {
      console.log(chalk.gray(`   ... and ${completed.length - 10} more`));
    }
    console.log('');
  }

  // Show hints
  console.log(chalk.blue('💡 Commands:'));
  console.log(chalk.gray('   specweave jobs --id <jobId>     → Details for specific job'));
  console.log(chalk.gray('   specweave jobs --follow <jobId> → Follow progress live'));
  console.log(chalk.gray('   specweave jobs --logs <jobId>   → View worker logs'));
  if (paused.length > 0) {
    console.log(chalk.gray('   specweave jobs --resume <jobId> → Resume paused job'));
  }
  if (running.length > 0) {
    console.log(chalk.gray('   specweave jobs --kill <jobId>   → Kill running job'));
  }
  console.log(chalk.gray('   specweave jobs --all            → Show all jobs (including completed)'));
  console.log('');
}

/**
 * Print job summary line
 */
function printJobSummary(job: BackgroundJob, projectPath: string, compact = false): void {
  const shortId = job.id.slice(0, 8);
  const provider = getJobProvider(job);
  const progress = job.progress;

  if (compact) {
    // Compact format for completed jobs
    const ago = getTimeAgo(job.updatedAt);
    console.log(chalk.gray(`  [${shortId}] ${job.type} - ${progress.current} items - ${ago}`));
    return;
  }

  // Full format for active jobs
  console.log(chalk.white(`  [${shortId}] ${job.type} (${provider})`));

  // Progress bar
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;
  const progressBar = createProgressBar(percentage);
  console.log(chalk.gray(`     Progress: ${progressBar} ${progress.current}/${progress.total} (${percentage}%)`));

  // Rate and ETA
  const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
  const rate = elapsed > 0 ? (progress.current / elapsed).toFixed(1) : '0';
  const remaining = progress.total - progress.current;
  const eta = parseFloat(rate) > 0 ? Math.round(remaining / parseFloat(rate)) : 0;
  const etaStr = formatDuration(eta);
  console.log(chalk.gray(`     Rate: ${rate}/s | ETA: ${etaStr}`));

  // Current item
  if (progress.currentItem) {
    console.log(chalk.gray(`     Current: ${progress.currentItem}`));
  }

  // Process status
  const running = isJobRunning(projectPath, job.id);
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', job.id, 'worker.pid');
  let pid = 'unknown';
  try {
    if (fs.existsSync(pidFile)) {
      pid = fs.readFileSync(pidFile, 'utf-8').trim();
    }
  } catch { /* ignore */ }

  const started = getTimeAgo(job.startedAt);
  console.log(chalk.gray(`     PID: ${pid} (${running ? 'alive' : 'not running'}) | Started: ${started}`));

  // Error for failed jobs
  if (job.error) {
    console.log(chalk.red(`     Error: ${job.error}`));
  }
}

/**
 * Show detailed job info
 */
async function handleJobDetails(projectPath: string, jobId: string): Promise<void> {
  const jobManager = getJobManager(projectPath);
  const job = jobManager.getJob(jobId) || findJobByPrefix(jobManager.getJobs(), jobId);

  if (!job) {
    console.log(chalk.red(`Job not found: ${jobId}`));
    return;
  }

  console.log(chalk.blue(`\n📦 Job Details: ${job.id}\n`));

  console.log(`Type: ${job.type}`);
  console.log(`Status: ${formatStatus(job.status)}`);
  console.log(`Provider: ${getJobProvider(job)}`);

  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', job.id, 'worker.pid');
  let pid = 'N/A';
  try {
    if (fs.existsSync(pidFile)) {
      pid = fs.readFileSync(pidFile, 'utf-8').trim();
    }
  } catch { /* ignore */ }
  console.log(`PID: ${pid}`);
  console.log('');

  console.log(`Started: ${job.startedAt}`);
  console.log(`Updated: ${job.updatedAt}`);
  console.log('');

  const progress = job.progress;
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;
  console.log(`Progress: ${progress.current}/${progress.total} (${percentage}%)`);
  if (progress.currentItem) {
    console.log(`Current: ${progress.currentItem}`);
  }

  const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
  const rate = elapsed > 0 ? (progress.current / elapsed).toFixed(1) : '0';
  console.log(`Rate: ${rate} items/sec`);

  const remaining = progress.total - progress.current;
  const eta = parseFloat(rate) > 0 ? Math.round(remaining / parseFloat(rate)) : 0;
  console.log(`ETA: ${formatDuration(eta)}`);
  console.log('');

  // Files
  console.log('Files:');
  const jobDir = path.join(projectPath, '.specweave', 'state', 'jobs', job.id);
  console.log(`  Config: ${path.join(jobDir, 'config.json')}`);
  console.log(`  Logs: ${path.join(jobDir, 'worker.log')}`);
  console.log(`  PID: ${pidFile}`);

  // Result if available
  const result = getJobResult(projectPath, job.id);
  if (result) {
    console.log('');
    console.log('Result:');
    console.log(`  Total Count: ${result.totalCount}`);
    console.log(`  Completed At: ${result.completedAt}`);
  }

  // Error if any
  if (job.error) {
    console.log('');
    console.log(chalk.red(`Error: ${job.error}`));
  }
}

/**
 * Show job logs
 */
async function handleLogs(projectPath: string, jobId: string): Promise<void> {
  const jobManager = getJobManager(projectPath);
  const job = jobManager.getJob(jobId) || findJobByPrefix(jobManager.getJobs(), jobId);

  if (!job) {
    console.log(chalk.red(`Job not found: ${jobId}`));
    return;
  }

  const logs = getJobLog(projectPath, job.id, 50);

  if (!logs) {
    console.log(chalk.gray('No logs available for this job.'));
    return;
  }

  console.log(chalk.blue(`\n📋 Worker Logs for ${job.id.slice(0, 8)} (last 50 lines):\n`));
  console.log(logs);
}

/**
 * Follow job progress in real-time
 */
async function handleFollow(projectPath: string, jobId: string): Promise<void> {
  const jobManager = getJobManager(projectPath);
  let job: BackgroundJob | null = jobManager.getJob(jobId) ?? findJobByPrefix(jobManager.getJobs(), jobId) ?? null;

  if (!job) {
    console.log(chalk.red(`Job not found: ${jobId}`));
    return;
  }

  console.log(chalk.blue(`\n📦 Following job ${job.id.slice(0, 8)} (Ctrl+C to stop)\n`));

  let lastProgress = -1;
  let lastItem = '';

  const interval = setInterval(() => {
    // Refresh job data
    job = jobManager.getJob(job!.id);
    if (!job) {
      console.log(chalk.yellow('\nJob no longer exists.'));
      clearInterval(interval);
      return;
    }

    const progress = job.progress;
    const timestamp = new Date().toLocaleTimeString();

    // Only print if something changed
    if (progress.current !== lastProgress || progress.currentItem !== lastItem) {
      const percentage = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;
      const progressBar = createProgressBar(percentage);
      console.log(chalk.gray(`[${timestamp}] ${progressBar} ${progress.current}/${progress.total} (${percentage}%) - ${progress.currentItem || 'processing...'}`));

      lastProgress = progress.current;
      lastItem = progress.currentItem || '';
    }

    // Stop if job completed (including partial success)
    if (job.status === 'completed' || job.status === 'completed_with_warnings' || job.status === 'failed') {
      console.log('');
      if (job.status === 'completed') {
        console.log(chalk.green(`✅ Job completed! ${progress.current} items processed.`));
      } else if (job.status === 'completed_with_warnings') {
        console.log(chalk.yellow(`⚠️  Job completed with warnings: ${job.error}`));
      } else {
        console.log(chalk.red(`❌ Job failed: ${job.error}`));
      }
      clearInterval(interval);
    }
  }, 1000);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log(chalk.gray('\nStopped following. Job continues in background.'));
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {}); // Never resolves, until SIGINT
}

/**
 * Kill a running job
 */
async function handleKill(projectPath: string, jobId: string): Promise<void> {
  const jobManager = getJobManager(projectPath);
  const job = jobManager.getJob(jobId) || findJobByPrefix(jobManager.getJobs(), jobId);

  if (!job) {
    console.log(chalk.red(`Job not found: ${jobId}`));
    return;
  }

  const progress = job.progress;
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  console.log(chalk.yellow(`\n⚠️  Killing job ${job.id.slice(0, 8)}...`));
  console.log(`   Type: ${job.type}`);
  console.log(`   Progress: ${progress.current}/${progress.total} (${percentage}%)`);

  const success = killJob(projectPath, job.id);

  if (success) {
    console.log(chalk.green('\n✅ Job killed. Status changed to "paused".'));
    console.log(chalk.gray(`   Resume later: specweave jobs --resume ${job.id.slice(0, 8)}`));
  } else {
    console.log(chalk.yellow('\n⚠️  Could not kill job (may already be stopped).'));
    console.log(chalk.gray('   Check status: specweave jobs --id ' + job.id.slice(0, 8)));
  }
}

/**
 * Resume a paused job
 */
async function handleResume(projectPath: string, jobId: string): Promise<void> {
  const jobManager = getJobManager(projectPath);
  const job = jobManager.getJob(jobId) || findJobByPrefix(jobManager.getJobs(), jobId);

  if (!job) {
    console.log(chalk.red(`Job not found: ${jobId}`));
    return;
  }

  if (job.status === 'running') {
    console.log(chalk.yellow(`Job ${job.id.slice(0, 8)} is already running.`));
    console.log(chalk.gray(`   Follow progress: specweave jobs --follow ${job.id.slice(0, 8)}`));
    return;
  }

  if (job.status === 'completed') {
    console.log(chalk.gray(`Job ${job.id.slice(0, 8)} is already completed.`));
    return;
  }

  console.log(chalk.cyan(`\n🔄 Resuming job ${job.id.slice(0, 8)}...`));
  console.log(`   Type: ${job.type}`);
  console.log(`   Provider: ${getJobProvider(job)}`);
  console.log(`   Resuming from: item ${job.progress.current} of ${job.progress.total}`);

  // Load original config
  const configPath = path.join(projectPath, '.specweave', 'state', 'jobs', job.id, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('\n❌ Cannot resume: job config not found.'));
    return;
  }

  const jobConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Mark job as running again (startJob does this)
  jobManager.startJob(job.id);

  // Re-launch worker
  const result = await launchImportJob({
    type: job.type as 'import-issues',
    projectPath,
    coordinatorConfig: jobConfig.coordinatorConfig,
    estimatedTotal: job.progress.total,
  });

  if (result.isBackground) {
    console.log(chalk.green(`\n✅ Job resumed in background.`));
    console.log(chalk.gray(`   New PID: ${result.pid}`));
    console.log(chalk.gray(`   Check progress: specweave jobs --follow ${job.id.slice(0, 8)}`));
  } else {
    console.log(chalk.yellow('\n⚠️  Running in foreground (background mode unavailable).'));
  }
}

// Helper functions

function findJobByPrefix(jobs: BackgroundJob[], prefix: string): BackgroundJob | undefined {
  return jobs.find(j => j.id.startsWith(prefix));
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    running: chalk.green('running'),
    paused: chalk.yellow('paused'),
    completed: chalk.gray('completed'),
    completed_with_warnings: chalk.yellow('completed with warnings'),
    failed: chalk.red('failed'),
  };
  return statusMap[status] ?? status;
}

function createProgressBar(percentage: number, width = 20): string {
  const filled = Math.round((percentage / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'calculating...';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function getTimeAgo(dateStr: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
