#!/usr/bin/env node
/**
 * Scheduler Startup Check (Cross-Platform)
 *
 * Checks for due scheduled jobs on session start.
 * Returns system message if jobs are ready to run.
 *
 * @module hooks/scheduler-startup
 */

import * as path from 'path';
import * as fs from 'fs';
import { findProjectRoot, readJsonSafe, appendLog, outputHookResult } from './platform.js';

/**
 * Sync configuration structure
 */
interface SyncConfig {
  sync?: {
    orchestration?: {
      scheduler?: {
        enabled?: boolean;
      };
    };
  };
}

/**
 * Scheduled job structure
 */
interface ScheduledJob {
  id: string;
  type: string;
  status: 'idle' | 'running' | 'failed' | 'disabled';
  schedule: {
    enabled: boolean;
    intervalMs: number;
    lastRun?: string;
    nextRun?: string;
    retryCount: number;
    maxRetries: number;
  };
}

/**
 * Scheduled jobs file structure
 */
interface ScheduledJobsFile {
  jobs: ScheduledJob[];
  lastUpdated?: string;
}

/**
 * Check for due scheduled jobs
 *
 * @param projectRoot - Project root directory
 * @returns Object with systemMessage if jobs are due
 */
export async function checkScheduledJobs(
  projectRoot?: string
): Promise<{ systemMessage?: string } | null> {
  const root = projectRoot || findProjectRoot();
  if (!root) {
    return null;
  }

  const configFile = path.join(root, '.specweave', 'config.json');
  const scheduledJobsFile = path.join(root, '.specweave', 'state', 'scheduled-jobs.json');
  const logFile = path.join(root, '.specweave', 'logs', 'scheduler.log');

  // Check if scheduler is enabled
  const config = readJsonSafe<SyncConfig>(configFile);
  const schedulerEnabled = config?.sync?.orchestration?.scheduler?.enabled ?? false;

  if (!schedulerEnabled) {
    return null;
  }

  // Check if scheduled jobs file exists
  if (!fs.existsSync(scheduledJobsFile)) {
    return null;
  }

  // Read and parse scheduled jobs
  const jobsData = readJsonSafe<ScheduledJobsFile>(scheduledJobsFile);
  if (!jobsData?.jobs || !Array.isArray(jobsData.jobs)) {
    return null;
  }

  // Find due jobs
  const now = Date.now();
  const dueJobs = jobsData.jobs.filter((job) => {
    // Job must be enabled and idle
    if (!job.schedule.enabled || job.status !== 'idle') {
      return false;
    }

    // No nextRun means it should run now
    if (!job.schedule.nextRun) {
      return true;
    }

    // Check if nextRun has passed
    const nextRunTime = new Date(job.schedule.nextRun).getTime();
    return nextRunTime <= now;
  });

  if (dueJobs.length === 0) {
    return null;
  }

  // Log due jobs
  const dueJobIds = dueJobs.map((j) => j.id);
  appendLog(logFile, `Due sync jobs: ${JSON.stringify(dueJobIds)}`);

  return {
    systemMessage: `Scheduled sync jobs ready to run. Use /specweave:sync-now to execute.`,
  };
}

/**
 * Main entry point (when run directly)
 */
async function main(): Promise<void> {
  // Check if hooks disabled
  if (process.env.SPECWEAVE_DISABLE_HOOKS === '1') {
    outputHookResult({ continue: true });
    return;
  }

  const result = await checkScheduledJobs();

  if (result?.systemMessage) {
    outputHookResult({ continue: true, systemMessage: result.systemMessage });
  } else {
    outputHookResult({ continue: true });
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error(JSON.stringify({ continue: true, error: String(err) }));
    process.exit(0);
  });
}
