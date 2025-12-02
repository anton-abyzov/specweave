/**
 * Sync Scheduled Command
 *
 * Executes due scheduled sync jobs. Designed for:
 * 1. Cron jobs (periodic execution)
 * 2. Manual invocation
 * 3. CI/CD pipelines
 *
 * Usage:
 *   specweave sync-scheduled           # Execute due jobs
 *   specweave sync-scheduled --dry-run # Show what would run
 *   specweave sync-scheduled --force   # Run all jobs (ignore schedule)
 *
 * Cron example (every 15 minutes):
 *   0,15,30,45 * * * * cd /path/to/project && npx specweave sync-scheduled
 *
 * @module cli/commands/sync-scheduled
 */

import { Command } from 'commander';
import path from 'path';
import {
  SessionSyncExecutor,
  SessionSyncResult,
} from '../../core/scheduler/session-sync-executor.js';
import { SchedulePersistence } from '../../core/scheduler/schedule-persistence.js';
import { markJobComplete } from '../../core/scheduler/scheduled-job.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Command options
 */
export interface SyncScheduledOptions {
  dryRun?: boolean;
  force?: boolean;
  json?: boolean;
  silent?: boolean;
}

/**
 * Create the sync-scheduled command
 */
export function createSyncScheduledCommand(options: {
  logger?: Logger;
  specweavePath?: string;
} = {}): Command {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');
  const projectRoot = path.dirname(specweavePath);

  const command = new Command('sync-scheduled')
    .description('Execute due scheduled sync jobs (for cron/CI use)')
    .option('--dry-run', 'Show what would run without executing')
    .option('--force', 'Run all sync jobs regardless of schedule')
    .option('--json', 'Output as JSON')
    .option('--silent', 'Suppress output (for cron)')
    .action(async (opts: SyncScheduledOptions) => {
      try {
        if (opts.force) {
          await runForcedSync(projectRoot, opts, logger);
        } else {
          await runScheduledSync(projectRoot, opts, logger);
        }
      } catch (error) {
        if (!opts.silent) {
          logger.error(`Sync failed: ${error}`);
        }
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run scheduled sync (only due jobs)
 */
async function runScheduledSync(
  projectRoot: string,
  opts: SyncScheduledOptions,
  logger: Logger
): Promise<void> {
  const executor = new SessionSyncExecutor({
    projectRoot,
    logger: opts.silent ? createSilentLogger() : logger,
    dryRun: opts.dryRun,
    maxJobsPerSession: 10, // Allow more jobs for cron
  });

  const result = await executor.executeDueJobs();

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (opts.silent) {
    return;
  }

  // Human-readable output
  printResult(result, opts.dryRun);
}

/**
 * Run forced sync (all jobs regardless of schedule)
 */
async function runForcedSync(
  projectRoot: string,
  opts: SyncScheduledOptions,
  logger: Logger
): Promise<void> {
  const specweavePath = path.join(projectRoot, '.specweave');
  const persistence = new SchedulePersistence({
    specweavePath,
    logger: opts.silent ? createSilentLogger() : logger,
  });

  // Load all jobs
  const jobs = await persistence.loadSchedules();

  if (jobs.length === 0) {
    if (!opts.silent) {
      logger.log('No scheduled jobs found');
    }
    return;
  }

  if (!opts.silent) {
    logger.log(`\n🔄 Force sync: ${jobs.length} job(s) to execute\n`);
  }

  // Reset all jobs to be due immediately
  for (const job of jobs) {
    if (job.schedule.enabled) {
      const updatedJob = {
        ...job,
        schedule: {
          ...job.schedule,
          nextRun: new Date().toISOString(),
        },
      };
      await persistence.updateJob(job.id, updatedJob);
    }
  }

  // Now run the executor
  const executor = new SessionSyncExecutor({
    projectRoot,
    logger: opts.silent ? createSilentLogger() : logger,
    dryRun: opts.dryRun,
    maxJobsPerSession: 100, // No limit for forced sync
  });

  const result = await executor.executeDueJobs();

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!opts.silent) {
    printResult(result, opts.dryRun);
  }
}

/**
 * Print human-readable result
 */
function printResult(result: SessionSyncResult, dryRun?: boolean): void {
  const mode = dryRun ? '[DRY RUN] ' : '';

  console.log(`\n${mode}📅 Sync Scheduled Results`);
  console.log('─'.repeat(40));

  console.log(`Due jobs:      ${result.dueJobCount}`);
  console.log(`Executed:      ${result.executedJobs.length}`);
  console.log(`Skipped:       ${result.skippedJobs.length}`);
  console.log(`Duration:      ${result.totalDurationMs}ms`);

  if (result.executedJobs.length > 0) {
    console.log('\nExecuted Jobs:');
    for (const job of result.executedJobs) {
      const status = job.success ? '✅' : '❌';
      const duration = `(${job.durationMs}ms)`;
      console.log(`  ${status} ${job.jobId} ${duration}`);
      if (job.error) {
        console.log(`      Error: ${job.error}`);
      }
    }
  }

  if (result.skippedJobs.length > 0) {
    console.log('\nSkipped Jobs:');
    for (const job of result.skippedJobs) {
      console.log(`  ⏭️  ${job.jobId}: ${job.skipReason || 'Unknown reason'}`);
    }
  }

  console.log('─'.repeat(40));
  console.log(result.success ? '✅ Sync completed successfully' : '⚠️  Some jobs failed');
  console.log('');
}

/**
 * Create a silent logger for cron mode
 */
function createSilentLogger(): Logger {
  return {
    log: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {},
  };
}

// Default export for CLI registration
export default createSyncScheduledCommand;
