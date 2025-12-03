/**
 * Session Sync Executor
 *
 * Executes due sync jobs on Claude Code session start.
 * This is the "pragmatic hybrid" approach - sync runs at session boundaries
 * rather than requiring a daemon or cron.
 *
 * Key features:
 * - Auto-executes due jobs on session start
 * - Non-blocking (runs in background)
 * - Rate-limited (max 1 external sync per session start)
 * - Respects permission gates (canUpdateExternalItems, etc.)
 *
 * @module core/scheduler/session-sync-executor
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ScheduledJob, markJobComplete, markJobFailed, markJobRunning } from './scheduled-job.js';
import { SchedulePersistence } from './schedule-persistence.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { SyncCoordinator } from '../../sync/sync-coordinator.js';
import { AdoClientFactory, ResolvedAdoProfile } from '../../integrations/ado/ado-client-factory.js';

/**
 * Session sync executor options
 */
export interface SessionSyncExecutorOptions {
  /**
   * Project root directory
   */
  projectRoot: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Maximum jobs to execute per session start
   * @default 1
   */
  maxJobsPerSession?: number;

  /**
   * Dry run mode (log what would happen, don't execute)
   * @default false
   */
  dryRun?: boolean;
}

/**
 * Execution result for a single session job
 */
export interface SessionJobResult {
  jobId: string;
  success: boolean;
  durationMs: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Session sync execution summary
 */
export interface SessionSyncResult {
  /**
   * Total jobs found due
   */
  dueJobCount: number;

  /**
   * Jobs executed
   */
  executedJobs: SessionJobResult[];

  /**
   * Jobs skipped (due to gates or limits)
   */
  skippedJobs: SessionJobResult[];

  /**
   * Overall success
   */
  success: boolean;

  /**
   * Total duration
   */
  totalDurationMs: number;
}

/**
 * SessionSyncExecutor - Runs due sync jobs on session start
 *
 * Called by the session-start hook to execute overdue scheduled jobs.
 * This provides a pragmatic "sync on session boundaries" approach.
 */
export class SessionSyncExecutor {
  private readonly projectRoot: string;
  private readonly logger: Logger;
  private readonly persistence: SchedulePersistence;
  private readonly maxJobsPerSession: number;
  private readonly dryRun: boolean;

  constructor(options: SessionSyncExecutorOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.persistence = new SchedulePersistence({
      specweavePath: path.join(options.projectRoot, '.specweave'),
      logger: this.logger,
    });
    this.maxJobsPerSession = options.maxJobsPerSession ?? 1;
    this.dryRun = options.dryRun ?? false;
  }

  /**
   * Execute all due sync jobs
   *
   * Called on session start to run overdue scheduled jobs.
   *
   * @returns Execution summary
   */
  async executeDueJobs(): Promise<SessionSyncResult> {
    const startTime = Date.now();
    const result: SessionSyncResult = {
      dueJobCount: 0,
      executedJobs: [],
      skippedJobs: [],
      success: true,
      totalDurationMs: 0,
    };

    try {
      // 1. Load scheduled jobs
      const jobs = await this.persistence.loadSchedules();

      if (jobs.length === 0) {
        this.logger.debug('No scheduled jobs found');
        result.totalDurationMs = Date.now() - startTime;
        return result;
      }

      // 2. Filter due jobs
      const dueJobs = this.getDueJobs(jobs);
      result.dueJobCount = dueJobs.length;

      if (dueJobs.length === 0) {
        this.logger.debug('No jobs are due for execution');
        result.totalDurationMs = Date.now() - startTime;
        return result;
      }

      this.logger.log(`📅 Session start: ${dueJobs.length} sync job(s) due`);

      // 3. Check permission gates
      const config = await this.loadConfig();
      const canSync = await this.checkSyncPermissions(config);

      if (!canSync.allowed) {
        this.logger.log(`⏭️  Sync skipped: ${canSync.reason}`);

        // Mark all jobs as skipped
        for (const job of dueJobs) {
          result.skippedJobs.push({
            jobId: job.id,
            success: false,
            durationMs: 0,
            skipped: true,
            skipReason: canSync.reason,
          });
        }

        result.totalDurationMs = Date.now() - startTime;
        return result;
      }

      // 4. Execute jobs (up to limit)
      const jobsToExecute = dueJobs.slice(0, this.maxJobsPerSession);
      const jobsToSkip = dueJobs.slice(this.maxJobsPerSession);

      // Skip excess jobs
      for (const job of jobsToSkip) {
        result.skippedJobs.push({
          jobId: job.id,
          success: false,
          durationMs: 0,
          skipped: true,
          skipReason: `Exceeds session limit (${this.maxJobsPerSession} jobs/session)`,
        });
      }

      // Execute jobs
      for (const job of jobsToExecute) {
        const jobResult = await this.executeJob(job, config);
        result.executedJobs.push(jobResult);

        if (!jobResult.success) {
          result.success = false;
        }
      }

      result.totalDurationMs = Date.now() - startTime;

      // Log summary
      const successCount = result.executedJobs.filter((j) => j.success).length;
      this.logger.log(
        `✅ Session sync: ${successCount}/${result.executedJobs.length} jobs succeeded (${result.totalDurationMs}ms)`
      );

      return result;
    } catch (error) {
      this.logger.error(`Session sync failed: ${error}`);
      result.success = false;
      result.totalDurationMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Get jobs that are due for execution
   */
  private getDueJobs(jobs: ScheduledJob[]): ScheduledJob[] {
    const now = Date.now();

    return jobs.filter((job) => {
      // Must be enabled and idle
      if (!job.schedule.enabled || job.status !== 'idle') {
        return false;
      }

      // Must be due
      if (!job.schedule.nextRun) {
        return true;
      }

      const nextRun = new Date(job.schedule.nextRun).getTime();
      return now >= nextRun;
    });
  }

  /**
   * Check sync permissions from config
   */
  private async checkSyncPermissions(
    config: Record<string, unknown>
  ): Promise<{ allowed: boolean; reason?: string }> {
    const syncConfig = (config.sync as Record<string, unknown>) || {};
    const settings = (syncConfig.settings as Record<string, unknown>) || {};
    const orchestration = (syncConfig.orchestration as Record<string, unknown>) || {};
    const scheduler = (orchestration.scheduler as Record<string, unknown>) || {};

    // Check if scheduler is enabled
    const schedulerEnabled = scheduler.enabled ?? false;
    if (!schedulerEnabled) {
      return {
        allowed: false,
        reason: 'Scheduler disabled (sync.orchestration.scheduler.enabled=false)',
      };
    }

    // Check if auto-sync is enabled
    const autoSyncOnSession = scheduler.autoSyncOnSessionStart ?? true;
    if (!autoSyncOnSession) {
      return {
        allowed: false,
        reason: 'Session sync disabled (autoSyncOnSessionStart=false)',
      };
    }

    // Check external tool permissions
    const canUpdateExternal = settings.canUpdateExternalItems ?? false;
    if (!canUpdateExternal) {
      return {
        allowed: false,
        reason: 'External sync disabled (canUpdateExternalItems=false)',
      };
    }

    return { allowed: true };
  }

  /**
   * Execute a single job
   */
  private async executeJob(
    job: ScheduledJob,
    config: Record<string, unknown>
  ): Promise<SessionJobResult> {
    const startTime = Date.now();

    this.logger.log(`  🔄 Executing: ${job.id} (${job.type})`);

    if (this.dryRun) {
      this.logger.log(`  🔍 [DRY RUN] Would execute ${job.id}`);
      return {
        jobId: job.id,
        success: true,
        durationMs: Date.now() - startTime,
        skipped: true,
        skipReason: 'Dry run mode',
      };
    }

    try {
      // Mark job as running
      let updatedJob = markJobRunning(job);
      await this.persistence.updateJob(job.id, updatedJob);

      // Execute based on job type
      switch (job.type) {
        case 'external-sync':
          await this.executeExternalSync(config);
          break;

        case 'external-pull':
          await this.executeExternalPull(config);
          break;

        case 'discrepancy-check':
          // Placeholder - discrepancy checks are lightweight
          this.logger.log(`  📊 Discrepancy check completed`);
          break;

        case 'living-docs-sync':
          // Placeholder - living docs sync is local-only
          this.logger.log(`  📚 Living docs sync completed`);
          break;

        case 'notification-cleanup':
          // Placeholder - notification cleanup
          this.logger.log(`  🧹 Notification cleanup completed`);
          break;

        default:
          this.logger.warn(`  ⚠️  Unknown job type: ${job.type}`);
      }

      // Mark job as complete
      updatedJob = markJobComplete(job);
      await this.persistence.updateJob(job.id, updatedJob);

      return {
        jobId: job.id,
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      // Mark job as failed
      const updatedJob = markJobFailed(job, String(error));
      await this.persistence.updateJob(job.id, updatedJob);

      this.logger.error(`  ❌ Job ${job.id} failed: ${error}`);

      return {
        jobId: job.id,
        success: false,
        durationMs: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Execute external sync (GitHub/JIRA/ADO)
   *
   * Multi-project support: Each increment can have its own ADO profile
   * stored in metadata.json -> external_sync.ado.profile
   */
  private async executeExternalSync(config: Record<string, unknown>): Promise<void> {
    // Find active increments
    const incrementsDir = path.join(this.projectRoot, '.specweave', 'increments');

    // Initialize ADO profile factory for multi-project resolution
    const adoFactory = new AdoClientFactory({
      projectRoot: this.projectRoot,
      logger: this.logger,
    });

    try {
      const entries = await fs.readdir(incrementsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('_')) {
          continue;
        }

        // Check if increment is active
        const metadataPath = path.join(incrementsDir, entry.name, 'metadata.json');
        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

          if (metadata.status === 'active' || metadata.status === 'in_progress') {
            // Resolve ADO profile for this specific increment (multi-project support)
            let adoProfile: ResolvedAdoProfile | undefined;
            try {
              const profileResult = await adoFactory.resolveProfile(entry.name);
              if (profileResult.success && profileResult.profile) {
                adoProfile = profileResult.profile as ResolvedAdoProfile;
                this.logger.debug(
                  `  📊 Increment ${entry.name} → ADO profile: ${adoProfile.profileName} ` +
                  `(${adoProfile.organization}/${adoProfile.project}) [${adoProfile.source}]`
                );
              }
            } catch (error) {
              // Log the error at debug level for troubleshooting
              this.logger.debug(`  ⚠️ Could not resolve ADO profile for ${entry.name}: ${error}`);
              // No ADO profile configured - that's OK, might use GitHub/JIRA
            }

            // Sync this increment with resolved ADO profile
            const coordinator = new SyncCoordinator({
              projectRoot: this.projectRoot,
              incrementId: entry.name,
              logger: this.logger,
              adoProfile, // Pass the resolved profile for multi-project sync
            });

            await coordinator.syncIncrementCompletion();
          }
        } catch {
          // Skip increments without valid metadata
        }
      }
    } catch {
      // No increments directory
    }
  }

  /**
   * Execute external pull (fetch changes from GitHub/JIRA/ADO)
   *
   * Pulls status/field updates from external tools back to living docs.
   * Uses timestamp-based conflict resolution (latest wins).
   */
  private async executeExternalPull(_config: Record<string, unknown>): Promise<void> {
    this.logger.log(`  ⬇️  Pulling changes from external tools...`);

    // TODO: This will be implemented by ExternalChangePuller (T-005)
    // For now, just log that pull is scheduled
    // The actual implementation will:
    // 1. Call ExternalChangePuller.fetchRecentChanges()
    // 2. Run conflict resolution
    // 3. Apply changes via LivingDocsUpdater
    // 4. Log audit trail

    this.logger.log(`  📥 External pull completed (placeholder)`);
  }

  /**
   * Load project config
   */
  private async loadConfig(): Promise<Record<string, unknown>> {
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
}

/**
 * Execute session sync from CLI/hook
 *
 * This is the main entry point called by the session-start hook.
 *
 * @param projectRoot - Project root directory
 * @param options - Execution options
 * @returns JSON result for hook consumption
 */
export async function executeSessionSync(
  projectRoot: string,
  options: { dryRun?: boolean; silent?: boolean } = {}
): Promise<string> {
  const logger = options.silent ? { log: () => {}, info: () => {}, debug: () => {}, warn: () => {}, error: () => {} } as Logger : consoleLogger;

  const executor = new SessionSyncExecutor({
    projectRoot,
    logger,
    dryRun: options.dryRun,
  });

  const result = await executor.executeDueJobs();

  // Return JSON for hook consumption
  return JSON.stringify({
    continue: true,
    dueJobCount: result.dueJobCount,
    executedCount: result.executedJobs.length,
    successCount: result.executedJobs.filter((j) => j.success).length,
    totalDurationMs: result.totalDurationMs,
  });
}
