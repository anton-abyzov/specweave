/**
 * Progress Tracker
 *
 * Real-time progress tracking with percentage, ETA estimation, and final summary.
 * Optimized for CLI workflows with throttled updates to prevent console spam.
 *
 * @module cli/helpers/progress-tracker
 */

import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Progress tracker options
 */
export interface ProgressOptions {
  total: number;
  updateFrequency?: number; // Update every N items (default: 5)
  showEta?: boolean; // Show ETA estimation (default: true)
  progressBarWidth?: number; // Width of progress bar (default: 30)
  logger?: Logger;
}

/**
 * Item status for progress tracking
 */
export type ItemStatus = 'success' | 'failure' | 'skip';

/**
 * Progress summary
 */
export interface ProgressSummary {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  elapsed: number; // milliseconds
}

/**
 * Progress Tracker
 *
 * Tracks batch operation progress with:
 * - Real-time percentage updates
 * - ETA estimation (rolling average of last 10 items)
 * - Throttled console updates (every N items)
 * - Final summary (succeeded/failed/skipped counts)
 *
 * @example
 * ```typescript
 * const tracker = new ProgressTracker({ total: 127, updateFrequency: 5 });
 *
 * for (const project of projects) {
 *   try {
 *     await importProject(project);
 *     tracker.update(project.key, 'success');
 *   } catch (error) {
 *     tracker.update(project.key, 'failure');
 *   }
 * }
 *
 * tracker.finish();
 * // Output: ✅ Imported 125/127 projects (2 failed, 0 skipped) in 28s
 * ```
 */
export class ProgressTracker {
  private total: number;
  private updateFrequency: number;
  private showEta: boolean;
  private progressBarWidth: number;
  private logger: Logger;

  private completed = 0;
  private succeeded = 0;
  private failed = 0;
  private skipped = 0;

  private startTime: number;
  private lastUpdateTime: number;
  private itemTimestamps: number[] = []; // For ETA calculation (rolling average)

  private lastRenderedProgress = ''; // For clearing previous output

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.updateFrequency = options.updateFrequency ?? 5;
    this.showEta = options.showEta ?? true;
    this.progressBarWidth = options.progressBarWidth ?? 30;
    this.logger = options.logger ?? consoleLogger;

    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
  }

  /**
   * Update progress with item result
   *
   * @param item - Item identifier (e.g., project key)
   * @param status - Item status (success, failure, skip)
   */
  update(item: string, status: ItemStatus): void {
    this.completed++;

    if (status === 'success') {
      this.succeeded++;
    } else if (status === 'failure') {
      this.failed++;
    } else if (status === 'skip') {
      this.skipped++;
    }

    // Track timestamp for ETA calculation
    const now = Date.now();
    this.itemTimestamps.push(now);

    // Keep only last 10 timestamps (rolling average)
    if (this.itemTimestamps.length > 10) {
      this.itemTimestamps.shift();
    }

    // Throttle updates: only render every N items
    if (this.completed % this.updateFrequency === 0 || this.completed === this.total) {
      this.render();
    }
  }

  /**
   * Render progress bar to console
   */
  private render(): void {
    const percentage = Math.floor((this.completed / this.total) * 100);
    const progressBar = this.getProgressBar(percentage);
    const eta = this.showEta ? this.getEta() : '';

    const message = `Fetching projects... ${this.completed}/${this.total} (${percentage}%) ${progressBar}${eta}`;

    // Clear previous line if needed (terminal overwrite)
    if (this.lastRenderedProgress) {
      process.stdout.write('\r\x1b[K'); // Clear line
    }

    process.stdout.write(chalk.cyan(message));
    this.lastRenderedProgress = message;
  }

  /**
   * Generate ASCII progress bar
   *
   * @param percentage - Completion percentage (0-100)
   * @returns ASCII progress bar string
   */
  private getProgressBar(percentage: number): string {
    const filledWidth = Math.floor((percentage / 100) * this.progressBarWidth);
    const emptyWidth = this.progressBarWidth - filledWidth;

    const filled = '='.repeat(Math.max(0, filledWidth - 1)) + (filledWidth > 0 ? '>' : '');
    const empty = ' '.repeat(emptyWidth);

    return `[${filled}${empty}]`;
  }

  /**
   * Calculate ETA using rolling average
   *
   * @returns ETA string (e.g., "~2m remaining") or empty if not enough data
   */
  private getEta(): string {
    if (this.itemTimestamps.length < 2) {
      return ''; // Not enough data yet
    }

    // Calculate average time per item (rolling average of last 10)
    const timestamps = this.itemTimestamps;
    const intervals: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgTimePerItem = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    // Calculate remaining time
    const remaining = this.total - this.completed;
    const estimatedMs = remaining * avgTimePerItem;

    // Format ETA
    const estimatedSec = Math.ceil(estimatedMs / 1000);
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

    if (estimatedSec < 60) {
      return ` [${elapsed}s elapsed, ~${estimatedSec}s remaining]`;
    } else {
      const estimatedMin = Math.ceil(estimatedSec / 60);
      return ` [${elapsed}s elapsed, ~${estimatedMin}m remaining]`;
    }
  }

  /**
   * Finish tracking and show final summary
   */
  finish(): void {
    // Clear progress line
    if (this.lastRenderedProgress) {
      process.stdout.write('\r\x1b[K');
    }

    const elapsed = Math.ceil((Date.now() - this.startTime) / 1000);
    const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.ceil(elapsed / 60)}m`;

    if (this.failed === 0 && this.skipped === 0) {
      // Perfect success
      this.logger.log(chalk.green(`✅ Imported ${this.succeeded}/${this.total} projects in ${elapsedStr}`));
    } else {
      // Partial success
      const summary = `✅ Imported ${this.succeeded}/${this.total}`;
      const failures = this.failed > 0 ? chalk.red(`, ${this.failed} failed`) : '';
      const skips = this.skipped > 0 ? chalk.yellow(`, ${this.skipped} skipped`) : '';

      this.logger.log(`${summary}${failures}${skips} in ${elapsedStr}`);

      // Suggest checking error log if failures exist
      if (this.failed > 0) {
        this.logger.log(chalk.yellow('⚠️  Check .specweave/logs/import-errors.log for details'));
      }
    }
  }

  /**
   * Cancel tracking (for use with cancelation)
   */
  cancel(): void {
    // Clear progress line
    if (this.lastRenderedProgress) {
      process.stdout.write('\r\x1b[K');
    }

    const elapsed = Math.ceil((Date.now() - this.startTime) / 1000);
    const percentage = Math.floor((this.completed / this.total) * 100);

    this.logger.log(
      chalk.yellow(
        `⚠️  Operation canceled. Imported ${this.completed}/${this.total} projects (${percentage}% complete) in ${elapsed}s`
      )
    );
  }

  /**
   * Get current progress summary
   *
   * @returns Progress summary object
   */
  getSummary(): ProgressSummary {
    return {
      total: this.total,
      completed: this.completed,
      succeeded: this.succeeded,
      failed: this.failed,
      skipped: this.skipped,
      elapsed: Date.now() - this.startTime
    };
  }

  /**
   * Get current percentage (for testing)
   *
   * @returns Completion percentage (0-100)
   */
  getPercentage(): number {
    return Math.floor((this.completed / this.total) * 100);
  }
}
