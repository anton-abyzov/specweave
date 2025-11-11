/**
 * Status Line Manager
 *
 * Ultra-fast status line rendering with intelligent caching.
 * Target: <1ms render time for 99% of requests.
 *
 * Architecture:
 * - Hook pre-computes cache (async, 10-50ms)
 * - Renderer reads cache (sync, <1ms)
 * - mtime-based invalidation (handles external edits)
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
   * Render status line (FAST PATH: <1ms)
   *
   * Returns formatted status line string or null if no active increment.
   */
  public render(): string | null {
    if (!this.config.enabled) {
      return null;
    }

    const cache = this.getCache();
    if (!cache) {
      return null; // No active increment or cache stale
    }

    return this.formatStatusLine(cache);
  }

  /**
   * Get cache with freshness validation (0.5-1ms)
   *
   * Returns null if:
   * - Cache file missing
   * - Cache too old (>maxCacheAge)
   * - tasks.md modified since cache update
   */
  private getCache(): StatusLineCache | null {
    try {
      // Step 1: Read cache file (0.3ms)
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }

      const content = fs.readFileSync(this.cacheFile, 'utf8');
      const cache = JSON.parse(content) as StatusLineCache;

      // Step 2: Validate cache has required fields
      if (!cache.incrementId || cache.totalTasks === undefined) {
        return null;
      }

      // Step 3: Check freshness (0.2-0.5ms)
      if (!this.isCacheFresh(cache)) {
        return null;
      }

      return cache;
    } catch (error) {
      // Cache read/parse error = treat as cache miss
      return null;
    }
  }

  /**
   * Check if cache is fresh (0.2-0.5ms)
   *
   * Two-level check:
   * 1. Age check (ultra-fast, no I/O)
   * 2. mtime check (fast, single stat() call)
   */
  private isCacheFresh(cache: StatusLineCache): boolean {
    // Check 1: Recent update? (no I/O, ultra-fast)
    const age = Date.now() - new Date(cache.lastUpdate).getTime();
    if (age < this.config.maxCacheAge) {
      return true; // Cache is fresh (<5s old)
    }

    // Check 2: Has tasks.md changed? (single stat() call)
    try {
      const tasksFile = path.join(
        this.rootDir,
        '.specweave/increments',
        cache.incrementId,
        'tasks.md'
      );

      const stats = fs.statSync(tasksFile);
      const currentMtime = Math.floor(stats.mtimeMs / 1000);

      return currentMtime === cache.lastModified;
    } catch {
      // File missing or stat() failed = invalidate cache
      return false;
    }
  }

  /**
   * Format status line from cache (0.1ms)
   */
  private formatStatusLine(cache: StatusLineCache): string {
    const parts: string[] = [];

    // Increment name (truncated)
    const name = this.truncate(
      cache.incrementName,
      this.config.maxIncrementNameLength
    );
    parts.push(`[${name}]`);

    // Progress bar
    if (this.config.showProgressBar) {
      const bar = this.renderProgressBar(
        cache.completedTasks,
        cache.totalTasks
      );
      parts.push(bar);
    }

    // Tasks count and percentage
    if (this.config.showPercentage) {
      parts.push(`${cache.completedTasks}/${cache.totalTasks} (${cache.percentage}%)`);
    } else {
      parts.push(`${cache.completedTasks}/${cache.totalTasks}`);
    }

    // Current task
    if (this.config.showCurrentTask && cache.currentTask) {
      const taskTitle = this.truncate(
        cache.currentTask.title,
        this.config.maxTaskTitleLength
      );
      parts.push(`• ${cache.currentTask.id}: ${taskTitle}`);
    }

    return parts.join(' ');
  }

  /**
   * Render ASCII progress bar (0.05ms)
   */
  private renderProgressBar(completed: number, total: number): string {
    if (total === 0) {
      return '░'.repeat(this.config.progressBarWidth);
    }

    const percentage = completed / total;
    const filled = Math.floor(percentage * this.config.progressBarWidth);
    const empty = this.config.progressBarWidth - filled;

    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Truncate string with ellipsis (0.01ms)
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
