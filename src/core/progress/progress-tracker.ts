/**
 * ProgressTracker - Real-time progress tracking with ETA calculation
 *
 * Features:
 * - ASCII progress bar (30 characters)
 * - Linear ETA extrapolation
 * - Elapsed time tracking
 * - Project-level status display (✅ ❌ ⏳)
 * - Configurable update frequency
 *
 * @module core/progress/progress-tracker
 */

import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Item status types
 */
export type ItemStatus = 'pending' | 'success' | 'error';

/**
 * Progress tracker options
 */
export interface ProgressTrackerOptions {
  /** Total number of items to process */
  total: number;
  /** Label for the operation (e.g., "Importing projects") */
  label: string;
  /** Show ETA calculation */
  showEta?: boolean;
  /** Update frequency (update every N items, default: 5) */
  updateFrequency?: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Item with status
 */
interface TrackedItem {
  name: string;
  status: ItemStatus;
  timestamp: number;
}

/**
 * ProgressTracker - Real-time progress tracking with ASCII progress bar and ETA
 *
 * @example
 * ```typescript
 * const tracker = new ProgressTracker({
 *   total: 127,
 *   label: 'Importing projects',
 *   showEta: true,
 *   updateFrequency: 5
 * });
 *
 * for (const project of projects) {
 *   await importProject(project);
 *   tracker.update(project.key, 'success');
 * }
 *
 * tracker.finish(120, 5, 2);
 * ```
 */
export class ProgressTracker {
  private total: number;
  private label: string;
  private showEta: boolean;
  private updateFrequency: number;
  private logger: Logger;

  private items: Map<string, TrackedItem> = new Map();
  private startTime: number;
  private lastUpdateCount: number = 0;

  constructor(options: ProgressTrackerOptions) {
    this.total = options.total;
    this.label = options.label;
    this.showEta = options.showEta ?? true;
    this.updateFrequency = options.updateFrequency ?? 5;
    this.logger = options.logger ?? consoleLogger;
    this.startTime = Date.now();
  }

  /**
   * Update progress for a specific item
   *
   * @param itemName Item identifier (e.g., project key)
   * @param status Item status (pending, success, error)
   */
  update(itemName: string, status: ItemStatus): void {
    // Track item
    this.items.set(itemName, {
      name: itemName,
      status,
      timestamp: Date.now(),
    });

    const completed = this.getCompletedCount();

    // Only render if we've processed enough items since last update
    if (
      completed - this.lastUpdateCount >= this.updateFrequency ||
      completed === this.total
    ) {
      this.render();
      this.lastUpdateCount = completed;
    }
  }

  /**
   * Finish progress tracking and show final summary
   *
   * @param succeeded Count of successful items
   * @param failed Count of failed items
   * @param skipped Count of skipped items
   */
  finish(succeeded: number, failed: number, skipped: number): void {
    // Final render
    this.render();

    // Show summary
    console.log(''); // Blank line
    console.log(`✅ Succeeded: ${succeeded}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
    }
    if (skipped > 0) {
      console.log(`⏭️  Skipped: ${skipped}`);
    }
    console.log(''); // Blank line
  }

  /**
   * Render progress bar to console
   */
  private render(): void {
    const completed = this.getCompletedCount();
    const percentage = Math.round((completed / this.total) * 100);
    const progressBar = this.renderProgressBar(percentage);
    const elapsed = this.getElapsedTime();
    const eta = this.showEta ? this.getEta() : '';

    // Clear current line and print progress
    process.stdout.write('\r'); // Carriage return to beginning of line
    process.stdout.write(
      `${this.label}... ${completed}/${this.total} (${percentage}%) ${progressBar} [${elapsed}${eta}]`
    );
  }

  /**
   * Render ASCII progress bar
   *
   * @param percentage Completion percentage (0-100)
   * @returns ASCII progress bar (30 characters)
   *
   * @example
   * renderProgressBar(0)   => "[>                             ]"
   * renderProgressBar(37)  => "[==========>                   ]"
   * renderProgressBar(100) => "[==============================]"
   */
  renderProgressBar(percentage: number): string {
    const barLength = 30;
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;

    let bar = '[';

    // Filled portion
    if (filledLength > 0) {
      bar += '='.repeat(Math.max(0, filledLength - 1));
      bar += '>';
      bar += ' '.repeat(Math.max(0, emptyLength));
    } else {
      // At 0%, show cursor at start
      bar += '>';
      bar += ' '.repeat(Math.max(0, emptyLength - 1));
    }

    bar += ']';

    return bar;
  }

  /**
   * Get elapsed time in human-readable format
   *
   * @returns Elapsed time string (e.g., "2m 34s", "45s")
   */
  getElapsedTime(): string {
    const elapsedMs = Date.now() - this.startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s elapsed`;
    }

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}m ${seconds}s elapsed`;
  }

  /**
   * Get estimated time remaining (ETA) using linear extrapolation
   *
   * Formula: ETA = (total - completed) * (elapsed / completed)
   *
   * @returns ETA string (e.g., ", ~2m remaining", ", ~45s remaining")
   */
  getEta(): string {
    const completed = this.getCompletedCount();

    if (completed === 0) {
      return ', ~? remaining';
    }

    if (completed === this.total) {
      return ', ~0s remaining';
    }

    const elapsedMs = Date.now() - this.startTime;
    const avgTimePerItem = elapsedMs / completed;
    const remaining = this.total - completed;
    const etaMs = remaining * avgTimePerItem;
    const etaSeconds = Math.floor(etaMs / 1000);

    if (etaSeconds < 60) {
      return `, ~${etaSeconds}s remaining`;
    }

    const minutes = Math.floor(etaSeconds / 60);
    return `, ~${minutes}m remaining`;
  }

  /**
   * Get count of completed items (success + error)
   */
  private getCompletedCount(): number {
    let count = 0;
    for (const item of this.items.values()) {
      if (item.status === 'success' || item.status === 'error') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get items by status
   */
  getItemsByStatus(status: ItemStatus): TrackedItem[] {
    const result: TrackedItem[] = [];
    for (const item of this.items.values()) {
      if (item.status === status) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Get current progress statistics
   */
  getStats(): {
    total: number;
    completed: number;
    succeeded: number;
    failed: number;
    pending: number;
    percentage: number;
    elapsedMs: number;
    etaMs: number | null;
  } {
    const completed = this.getCompletedCount();
    const succeeded = this.getItemsByStatus('success').length;
    const failed = this.getItemsByStatus('error').length;
    const pending = this.getItemsByStatus('pending').length;
    const percentage = Math.round((completed / this.total) * 100);
    const elapsedMs = Date.now() - this.startTime;

    let etaMs: number | null = null;
    if (completed > 0 && completed < this.total) {
      const avgTimePerItem = elapsedMs / completed;
      const remaining = this.total - completed;
      etaMs = remaining * avgTimePerItem;
    }

    return {
      total: this.total,
      completed,
      succeeded,
      failed,
      pending,
      percentage,
      elapsedMs,
      etaMs,
    };
  }
}
