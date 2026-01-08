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

  /**
   * Clean up log files older than retention period
   *
   * Only removes files matching pattern: *-YYYY-MM-DD.log
   * Skips non-log files and logs without date suffix.
   *
   * @param retentionDays - Number of days to keep logs
   */
  async cleanOldLogs(retentionDays: number): Promise<void> {
    if (!fs.existsSync(this.logDir)) {
      return;
    }

    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = now - retentionMs;

    const files = fs.readdirSync(this.logDir);

    for (const file of files) {
      // Only process .log files
      if (!file.endsWith('.log')) {
        continue;
      }

      // Extract date from filename (format: hookname-YYYY-MM-DD.log)
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})\.log$/);
      if (!dateMatch) {
        // Skip files without date suffix
        continue;
      }

      const dateStr = dateMatch[1];
      const fileDate = new Date(dateStr).getTime();

      // Delete if older than retention period
      if (fileDate < cutoffDate) {
        const filePath = path.join(this.logDir, file);
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Get all dated log files for a specific hook
   *
   * @param hookName - Name of the hook
   * @returns Array of log file paths, sorted by date (newest first)
   */
  async getLogFiles(hookName: string): Promise<string[]> {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }

    const files = fs.readdirSync(this.logDir);
    const pattern = new RegExp(`^${hookName}-(\\d{4}-\\d{2}-\\d{2})\\.log$`);

    const matchingFiles = files
      .filter(file => pattern.test(file))
      .map(file => ({
        path: path.join(this.logDir, file),
        date: file.match(pattern)![1]
      }))
      .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    return matchingFiles.map(f => f.path);
  }
}
