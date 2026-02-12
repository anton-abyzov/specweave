/**
 * Schedule Persistence
 *
 * Persists job schedules to disk so they survive session restarts.
 * Uses atomic writes to prevent corruption.
 *
 * @module core/scheduler/schedule-persistence
 */

import nodeFs from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { ScheduledJob } from './scheduled-job.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Persisted jobs file format
 */
interface PersistedJobsFile {
  /**
   * Schema version for migration support
   */
  version: number;

  /**
   * Array of persisted jobs
   */
  jobs: ScheduledJob[];

  /**
   * ISO timestamp of last update
   */
  lastUpdated: string;
}

/**
 * Current schema version
 */
const CURRENT_VERSION = 1;

/**
 * Schedule persistence options
 */
export interface SchedulePersistenceOptions {
  /**
   * Path to .specweave directory
   * @default process.cwd() + '/.specweave'
   */
  specweavePath?: string;

  /**
   * Logger instance
   */
  logger?: Logger;
}

/**
 * SchedulePersistence - Saves and loads job schedules from disk
 *
 * Features:
 * - Atomic writes using temp file + rename
 * - Schema versioning for migration
 * - Corruption recovery with defaults
 */
export class SchedulePersistence {
  private readonly filePath: string;
  private readonly logger: Logger;
  private readonly specweaveExists: boolean;

  constructor(options: SchedulePersistenceOptions = {}) {
    const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');
    this.filePath = path.join(specweavePath, 'state', 'scheduled-jobs.json');
    this.logger = options.logger ?? consoleLogger;
    // Guard: refuse to operate if .specweave doesn't exist (prevents stale folder creation)
    this.specweaveExists = nodeFs.existsSync(specweavePath);
  }

  /**
   * Load schedules from disk
   *
   * @returns Array of persisted jobs, empty array if file doesn't exist or is corrupted
   */
  async loadSchedules(): Promise<ScheduledJob[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content) as PersistedJobsFile;

      // Validate schema version
      if (!data.version || typeof data.version !== 'number') {
        this.logger.warn('Invalid schedule file format, returning empty');
        return [];
      }

      // Handle schema migration if needed
      if (data.version < CURRENT_VERSION) {
        this.logger.log(`Migrating schedules from v${data.version} to v${CURRENT_VERSION}`);
        return this.migrateSchedules(data);
      }

      // Validate jobs array
      if (!Array.isArray(data.jobs)) {
        this.logger.warn('Invalid jobs array in schedule file, returning empty');
        return [];
      }

      this.logger.debug(`Loaded ${data.jobs.length} scheduled jobs from disk`);
      return data.jobs;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - normal for first run
        this.logger.debug('No scheduled jobs file found (first run)');
        return [];
      }

      if (error instanceof SyntaxError) {
        // JSON parse error - corrupted file
        this.logger.warn(`Corrupted schedule file, creating backup: ${error.message}`);
        await this.backupCorruptedFile();
        return [];
      }

      this.logger.error(`Failed to load schedules: ${error}`);
      return [];
    }
  }

  /**
   * Save schedules to disk
   *
   * Uses atomic write (write to temp file, then rename) to prevent corruption.
   *
   * @param jobs - Jobs to persist
   */
  async saveSchedules(jobs: ScheduledJob[]): Promise<void> {
    // Guard: don't create .specweave/ from scratch in non-project directories
    if (!this.specweaveExists) {
      this.logger.debug('Skipping save: .specweave directory does not exist');
      return;
    }

    const data: PersistedJobsFile = {
      version: CURRENT_VERSION,
      jobs,
      lastUpdated: new Date().toISOString(),
    };

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write to temp file first
    const tempPath = `${this.filePath}.tmp`;
    const content = JSON.stringify(data, null, 2);

    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      // Atomic rename
      await fs.rename(tempPath, this.filePath);
      this.logger.debug(`Saved ${jobs.length} scheduled jobs to disk`);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Update a single job in persistence
   *
   * @param jobId - Job ID to update
   * @param updates - Partial job updates
   */
  async updateJob(jobId: string, updates: Partial<ScheduledJob>): Promise<void> {
    const jobs = await this.loadSchedules();
    const index = jobs.findIndex((j) => j.id === jobId);

    if (index === -1) {
      this.logger.warn(`Job not found for update: ${jobId}`);
      return;
    }

    jobs[index] = { ...jobs[index], ...updates };
    await this.saveSchedules(jobs);
  }

  /**
   * Delete a job from persistence
   *
   * @param jobId - Job ID to delete
   */
  async deleteJob(jobId: string): Promise<void> {
    const jobs = await this.loadSchedules();
    const filtered = jobs.filter((j) => j.id !== jobId);

    if (filtered.length < jobs.length) {
      await this.saveSchedules(filtered);
      this.logger.debug(`Deleted job from persistence: ${jobId}`);
    }
  }

  /**
   * Check if persistence file exists
   *
   * @returns true if file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file path (for testing/debugging)
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Migrate schedules from older schema versions
   */
  private async migrateSchedules(data: PersistedJobsFile): Promise<ScheduledJob[]> {
    // Currently only v1, no migrations needed
    // Future migrations would go here
    return data.jobs || [];
  }

  /**
   * Backup corrupted file for debugging
   */
  private async backupCorruptedFile(): Promise<void> {
    try {
      const backupPath = `${this.filePath}.corrupted.${Date.now()}`;
      await fs.copyFile(this.filePath, backupPath);
      this.logger.log(`Backed up corrupted file to: ${backupPath}`);
    } catch {
      // Ignore backup errors
    }
  }
}
