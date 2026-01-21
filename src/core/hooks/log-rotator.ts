import * as fs from 'fs';
import * as path from 'path';

/**
 * Log rotation system for hook logs
 *
 * Features:
 * - Dated log files (YYYY-MM-DD format)
 * - Automatic cleanup of old logs
 * - Configurable retention period
 *
 * @example
 * ```typescript
 * const rotator = new LogRotator('.specweave/logs/hooks');
 *
 * // Get current log path
 * const logPath = rotator.getCurrentLogPath('session-start');
 * // Returns: .specweave/logs/hooks/session-start-2026-01-08.log
 *
 * // Clean logs older than 7 days
 * await rotator.cleanOldLogs(7);
 * ```
 */
export class LogRotator {
  private logDir: string;

  /**
   * Create a new LogRotator instance
   *
   * @param logDir - Directory containing log files
   */
  constructor(logDir: string) {
    this.logDir = logDir;
  }

  /**
   * Get the current log file path for a hook
   *
   * Returns path with today's date: {hookName}-YYYY-MM-DD.log
   *
   * @param hookName - Name of the hook
   * @returns Full path to current log file
   */
  getCurrentLogPath(hookName: string): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${hookName}-${today}.log`);
  }

  private static readonly DATE_PATTERN = /(\d{4}-\d{2}-\d{2})\.log$/;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  /**
   * Clean up log files older than retention period
   * Only removes files matching pattern: *-YYYY-MM-DD.log
   */
  async cleanOldLogs(retentionDays: number): Promise<void> {
    if (!fs.existsSync(this.logDir)) {
      return;
    }

    const cutoffDate = Date.now() - retentionDays * LogRotator.MS_PER_DAY;

    for (const file of fs.readdirSync(this.logDir)) {
      if (!file.endsWith('.log')) {
        continue;
      }

      const dateMatch = file.match(LogRotator.DATE_PATTERN);
      if (!dateMatch) {
        continue;
      }

      const fileDate = new Date(dateMatch[1]).getTime();
      if (fileDate < cutoffDate) {
        fs.unlinkSync(path.join(this.logDir, file));
      }
    }
  }

  /**
   * Get all dated log files for a specific hook
   * @returns Array of log file paths, sorted by date (newest first)
   */
  async getLogFiles(hookName: string): Promise<string[]> {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }

    const pattern = new RegExp(`^${hookName}-(\\d{4}-\\d{2}-\\d{2})\\.log$`);

    return fs.readdirSync(this.logDir)
      .filter(file => pattern.test(file))
      .map(file => ({ path: path.join(this.logDir, file), date: file.match(pattern)![1] }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(f => f.path);
  }
}
