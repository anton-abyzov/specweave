/**
 * ProgressTracker Core Module
 *
 * Provides ASCII progress bar, ETA calculation, and project-level status display
 * for batch operations (JIRA/ADO project imports)
 *
 * @module core/progress/progress-tracker
 */

import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';

export interface ProgressOptions {
  updateInterval?: number;
  showEta?: boolean;
  barWidth?: number;
  logger?: Logger;
}

export interface ProgressItem {
  id: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export class ProgressTracker {
  private total: number;
  private completed: number = 0;
  private succeeded: number = 0;
  private failed: number = 0;
  private skipped: number = 0;
  private items: Map<string, ProgressItem> = new Map();
  private startTime: number;
  private lastUpdateTime: number = 0;
  private options: Required<ProgressOptions>;
  private logger: Logger;

  constructor(total: number, options: ProgressOptions = {}) {
    this.total = total;
    this.startTime = Date.now();
    this.options = {
      updateInterval: options.updateInterval ?? 5,
      showEta: options.showEta ?? true,
      barWidth: options.barWidth ?? 30,
      logger: options.logger ?? consoleLogger
    };
    this.logger = this.options.logger;
  }

  update(item: string, status: 'pending' | 'success' | 'error', error?: string): void {
    this.items.set(item, { id: item, status, error });
    if (status === 'success') {
      this.succeeded++;
      this.completed++;
    } else if (status === 'error') {
      this.failed++;
      this.completed++;
    }
    if (this.shouldUpdate()) {
      this.render();
      this.lastUpdateTime = Date.now();
    }
  }

  finish(succeeded: number, failed: number, skipped: number = 0): void {
    this.succeeded = succeeded;
    this.failed = failed;
    this.skipped = skipped;
    this.completed = succeeded + failed;
    this.render();
    this.logger.log('\n' + this.getSummary());
  }

  renderProgressBar(percentage: number): string {
    const filled = Math.round((percentage / 100) * this.options.barWidth);
    const empty = this.options.barWidth - filled;
    const filledChars = '='.repeat(Math.max(0, filled - 1)) + (filled > 0 ? '>' : '');
    const emptyChars = ' '.repeat(Math.max(0, empty));
    return '[' + filledChars + emptyChars + ']';
  }

  getElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60) {
      return seconds + 's';
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return minutes + 'm ' + remainingSeconds + 's';
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours + 'h ' + minutes + 'm';
    }
  }

  getEta(): string {
    if (this.completed === 0 || !this.options.showEta) {
      return '';
    }
    const elapsed = Date.now() - this.startTime;
    const avgTimePerItem = elapsed / this.completed;
    const remaining = this.total - this.completed;
    const etaMs = avgTimePerItem * remaining;
    const etaSeconds = Math.ceil(etaMs / 1000);
    if (etaSeconds < 60) {
      return '~' + etaSeconds + 's remaining';
    } else if (etaSeconds < 3600) {
      const minutes = Math.ceil(etaSeconds / 60);
      return '~' + minutes + 'm remaining';
    } else {
      const hours = Math.floor(etaSeconds / 3600);
      const minutes = Math.ceil((etaSeconds % 3600) / 60);
      return '~' + hours + 'h ' + minutes + 'm remaining';
    }
  }

  getSummary(): string {
    const lines = [];
    if (this.failed > 0) {
      lines.push('✅ Import Complete (with ' + this.failed + ' error' + (this.failed > 1 ? 's' : '') + ')');
    } else {
      lines.push('✅ Import Complete!');
    }
    lines.push('');
    lines.push('Imported: ' + this.succeeded + ' project' + (this.succeeded > 1 ? 's' : ''));
    if (this.failed > 0) {
      lines.push('Failed: ' + this.failed + ' project' + (this.failed > 1 ? 's' : ''));
      const errors = Array.from(this.items.values()).filter(item => item.status === 'error').slice(0, 3);
      errors.forEach(item => {
        lines.push('  ❌ ' + item.id + ': ' + (item.error || 'Unknown error'));
      });
      if (this.failed > 3) {
        lines.push('  ... and ' + (this.failed - 3) + ' more errors');
      }
    }
    if (this.skipped > 0) {
      lines.push('Skipped: ' + this.skipped + ' project' + (this.skipped > 1 ? 's' : '') + ' (archived)');
    }
    lines.push('');
    lines.push('Total time: ' + this.getElapsedTime());
    return lines.join('\n');
  }

  private shouldUpdate(): boolean {
    if (this.completed === 1 || this.completed === this.total) {
      return true;
    }
    return this.completed % this.options.updateInterval === 0;
  }

  private render(): void {
    const percentage = Math.round((this.completed / this.total) * 100);
    const bar = this.renderProgressBar(percentage);
    const elapsed = this.getElapsedTime();
    const eta = this.getEta();
    let output = 'Progress: ' + this.completed + '/' + this.total + ' ' + bar + ' (' + percentage + '%) [' + elapsed;
    if (eta) {
      output += ', ' + eta;
    }
    output += ']';
    process.stdout.write('\r' + output);
  }
}
