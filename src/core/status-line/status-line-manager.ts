/**
 * Status Line Manager (Simplified)
 *
 * Simple, reliable status line rendering.
 * Shows: [increment-name] ████░░░░ X/Y tasks (Z open)
 *
 * Architecture:
 * - Hook reads from spec.md (source of truth) and updates cache
 * - Manager reads cache and formats output
 * - Smart display: Shows full ID if multiple increments, just name if single
 * - Simple age-based validation (no complex mtime checks)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  StatusLineCache,
  StatusLineConfig,
  DEFAULT_STATUS_LINE_CONFIG,
} from './types.js';

export class StatusLineManager {
  private cacheFile: string;
  private config: StatusLineConfig;

  constructor(
    private rootDir: string = process.cwd(),
    config: Partial<StatusLineConfig> = {}
  ) {
    this.cacheFile = path.join(rootDir, '.specweave/state/status-line.json');
    this.config = { ...DEFAULT_STATUS_LINE_CONFIG, ...config };
  }

  /**
   * Render status line
   *
   * Returns formatted string or null if no active increment.
   */
  public render(): string | null {
    if (!this.config.enabled) {
      return null;
    }

    const cache = this.readCache();
    if (!cache || !cache.current) {
      return 'No active increment';
    }

    return this.formatStatusLine(cache);
  }

  /**
   * Read cache from disk
   *
   * Simple read with basic validation.
   */
  private readCache(): StatusLineCache | null {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }

      const content = fs.readFileSync(this.cacheFile, 'utf8');
      const cache = JSON.parse(content) as StatusLineCache;

      // Simple age check (warn if stale but still show)
      const age = Date.now() - new Date(cache.lastUpdate).getTime();
      if (age > this.config.maxCacheAge) {
        // Stale but we still show it (better than nothing)
        // Hook will update it soon
      }

      return cache;
    } catch {
      return null;
    }
  }

  /**
   * Format status line
   *
   * Format: [XXXX-name] ████░░░░ X/Y (Z open)
   * Shows: Full ID always to prevent confusion
   */
  private formatStatusLine(cache: StatusLineCache): string {
    const current = cache.current!;
    const parts: string[] = [];

    // Always show increment ID (XXXX-name format) for clarity
    // Truncate if needed to fit in status line
    const name = this.truncate(current.name, this.config.maxNameLength);
    parts.push(`[${name}]`);

    // Progress bar
    const bar = this.renderProgressBar(current.completed, current.total);
    parts.push(bar);

    // Tasks count
    parts.push(`${current.completed}/${current.total}`);

    // Open count (if more than 1)
    if (cache.openCount > 1) {
      parts.push(`(${cache.openCount} open)`);
    }

    return parts.join(' ');
  }

  /**
   * Render ASCII progress bar
   *
   * Handles edge cases: completed > total (caps at 100%), negative values
   */
  private renderProgressBar(completed: number, total: number): string {
    if (total === 0) {
      return '░'.repeat(this.config.progressBarWidth);
    }

    // Cap percentage at 100% (handle cases where completed > total)
    const percentage = Math.min(1, Math.max(0, completed / total));
    const filled = Math.floor(percentage * this.config.progressBarWidth);
    const empty = Math.max(0, this.config.progressBarWidth - filled);

    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Truncate string with ellipsis
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 1) + '…';
  }

  /**
   * Get raw cache data (for testing/debugging)
   */
  public getCacheData(): StatusLineCache | null {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }
      const content = fs.readFileSync(this.cacheFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Clear cache (for testing/manual reset)
   */
  public clearCache(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
      }
    } catch {
      // Ignore errors
    }
  }
}
