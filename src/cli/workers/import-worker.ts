#!/usr/bin/env node
/**
 * Background Import Worker
 *
 * Standalone script that runs import in a detached process.
 * Survives terminal close - progress tracked via job state file.
 *
 * Usage:
 *   node import-worker.js <jobId> <projectPath>
 *
 * The worker reads job configuration from:
 *   .specweave/state/jobs/<jobId>/config.json
 *
 * And updates progress to:
 *   .specweave/state/background-jobs.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Worker-specific imports (loaded dynamically to reduce startup time)
let ImportCoordinator: any;
let getJobManager: any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WorkerJobConfig {
  jobId: string;
  projectPath: string;
  coordinatorConfig: any;
  startedAt: string;
}

/**
 * Main worker entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: import-worker.js <jobId> <projectPath>');
    process.exit(1);
  }

  const jobId = args[0];
  const projectPath = args[1];

  // Write PID file for process management
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  fs.writeFileSync(pidFile, process.pid.toString());

  // Setup cleanup on exit
  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  process.on('exit', cleanup);
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  try {
    // Load job configuration
    const configPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'config.json');

    if (!fs.existsSync(configPath)) {
      throw new Error(`Job config not found: ${configPath}`);
    }

    const jobConfig: WorkerJobConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Log to worker-specific log file
    const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    };

    log(`Worker started for job ${jobId}`);
    log(`Project path: ${projectPath}`);
    log(`PID: ${process.pid}`);

    // Dynamically import heavy dependencies
    const importCoordinatorModule = await import('../../importers/import-coordinator.js');
    ImportCoordinator = importCoordinatorModule.ImportCoordinator;

    const jobManagerModule = await import('../../core/background/job-manager.js');
    getJobManager = jobManagerModule.getJobManager;

    // Get job manager and mark as running
    const jobManager = getJobManager(projectPath);
    jobManager.startJob(jobId);

    log('Dependencies loaded, starting import...');

    // Setup progress tracking
    const coordinatorConfig = jobConfig.coordinatorConfig;
    let totalEstimate = 0;
    let currentCount = 0;

    coordinatorConfig.onProgressEnhanced = (info: any) => {
      currentCount = info.current || currentCount;
      if (info.total && info.total > totalEstimate) {
        totalEstimate = info.total;
      }

      // Update job progress
      jobManager.updateProgress(
        jobId,
        currentCount,
        info.sourceRepo || info.platform,
        undefined,
        undefined
      );

      // Update total estimate if we now know more
      const job = jobManager.getJob(jobId);
      if (job && totalEstimate > job.progress.total) {
        job.progress.total = totalEstimate;
        // Force save with new total
        jobManager.updateProgress(jobId, currentCount, info.sourceRepo || info.platform);
      }

      log(`Progress: ${currentCount}/${totalEstimate} - ${info.platform} ${info.sourceRepo || ''}`);
    };

    // Rate limit handling
    coordinatorConfig.onRateLimitPause = (platform: string, seconds: number) => {
      log(`Rate limited by ${platform}, pausing for ${seconds}s`);
      jobManager.pauseJob(jobId);

      // Set resume time
      const job = jobManager.getJob(jobId);
      if (job) {
        job.resumeAfter = new Date(Date.now() + seconds * 1000);
      }
    };

    // Execute import
    const coordinator = new ImportCoordinator(coordinatorConfig);
    const result = await coordinator.importAll();

    log(`Import complete: ${result.totalCount} items imported`);

    // Mark job as complete
    jobManager.completeJob(jobId);

    // Write result summary
    const resultPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      totalCount: result.totalCount,
      completedAt: new Date().toISOString(),
      summary: result.summary || {}
    }, null, 2));

    log('Worker finished successfully');
    process.exit(0);

  } catch (error: any) {
    // Log error
    const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${error.message}\n`);
    fs.appendFileSync(logPath, `${error.stack}\n`);

    // Mark job as failed
    try {
      const jobManagerModule = await import('../../core/background/job-manager.js');
      const jobManager = jobManagerModule.getJobManager(projectPath);
      jobManager.completeJob(jobId, error.message);
    } catch {
      // Ignore if can't update job
    }

    console.error(`Worker error: ${error.message}`);
    process.exit(1);
  }
}

// Run worker
main().catch((error) => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});
