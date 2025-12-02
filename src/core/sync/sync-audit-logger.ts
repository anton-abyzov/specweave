/**
 * Sync Audit Logger
 *
 * Logs all sync operations for compliance and debugging.
 * Uses JSONL format for efficient appending and querying.
 *
 * Features:
 * - JSONL format (one JSON object per line)
 * - Log rotation (new file when > 100MB or new day)
 * - Configurable retention
 *
 * @module core/sync/sync-audit-logger
 */

import { promises as fs } from 'fs';
import path from 'path';
import { SyncPlatform } from '../types/sync-config.js';
import { SyncOperation } from './permission-enforcer.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Audit log entry - single sync operation record
 */
export interface AuditLogEntry {
  /**
   * ISO timestamp of the operation
   */
  timestamp: string;

  /**
   * Target platform
   */
  platform: SyncPlatform;

  /**
   * Operation type
   */
  operation: SyncOperation;

  /**
   * Item ID being operated on
   */
  itemId: string;

  /**
   * Operation result
   */
  result: 'success' | 'denied' | 'error';

  /**
   * Reason for denial (if denied)
   */
  reason?: string;

  /**
   * Error message (if error)
   */
  error?: string;

  /**
   * Duration of the operation in milliseconds
   */
  durationMs?: number;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;
}

/**
 * Audit logger options
 */
export interface SyncAuditLoggerOptions {
  /**
   * Path to .specweave directory
   */
  specweavePath?: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Max file size in bytes before rotation
   * @default 104857600 (100MB)
   */
  maxFileSizeBytes?: number;

  /**
   * Retention period in days
   * @default 30
   */
  retentionDays?: number;

  /**
   * Enable logging (can be disabled for testing)
   * @default true
   */
  enabled?: boolean;
}

/**
 * SyncAuditLogger - Comprehensive audit logging for sync operations
 *
 * All sync attempts are logged including:
 * - Successful operations
 * - Permission denials
 * - Errors during execution
 *
 * Logs are stored in JSONL format for easy parsing:
 * `.specweave/logs/sync/audit-YYYY-MM-DD.jsonl`
 *
 * Usage:
 * ```typescript
 * const logger = new SyncAuditLogger({ specweavePath });
 *
 * await logger.logSuccess('github', 'upsert-internal', 'FS-001', 150);
 * await logger.logDenied('jira', 'upsert-external', 'EXT-123', 'External updates disabled');
 * await logger.logError('ado', 'update-status', 'US-456', new Error('Network timeout'));
 * ```
 */
export class SyncAuditLogger {
  private readonly logDir: string;
  private readonly logger: Logger;
  private readonly maxFileSizeBytes: number;
  private readonly retentionDays: number;
  private readonly enabled: boolean;

  // Cache current date to detect day changes
  private currentDate: string = '';
  private currentFilePath: string = '';

  constructor(options: SyncAuditLoggerOptions = {}) {
    const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');
    this.logDir = path.join(specweavePath, 'logs', 'sync');
    this.logger = options.logger ?? consoleLogger;
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? 100 * 1024 * 1024; // 100MB
    this.retentionDays = options.retentionDays ?? 30;
    this.enabled = options.enabled ?? true;
  }

  /**
   * Log a successful sync operation
   *
   * @param platform - Target platform
   * @param operation - Operation type
   * @param itemId - Item ID
   * @param durationMs - Operation duration in milliseconds
   * @param context - Optional additional context
   */
  async logSuccess(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string,
    durationMs?: number,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      platform,
      operation,
      itemId,
      result: 'success',
      durationMs,
      context,
    });
  }

  /**
   * Log a denied sync operation
   *
   * @param platform - Target platform
   * @param operation - Operation type
   * @param itemId - Item ID
   * @param reason - Denial reason
   * @param context - Optional additional context
   */
  async logDenied(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string,
    reason: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      platform,
      operation,
      itemId,
      result: 'denied',
      reason,
      context,
    });
  }

  /**
   * Log an error during sync operation
   *
   * @param platform - Target platform
   * @param operation - Operation type
   * @param itemId - Item ID
   * @param error - Error that occurred
   * @param context - Optional additional context
   */
  async logError(
    platform: SyncPlatform,
    operation: SyncOperation,
    itemId: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      platform,
      operation,
      itemId,
      result: 'error',
      error: error.message,
      context: {
        ...context,
        stack: error.stack,
      },
    });
  }

  /**
   * Get log file path for a specific date
   *
   * @param date - Date to get log path for (defaults to today)
   */
  getLogPath(date?: Date): string {
    const d = date ?? new Date();
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `audit-${dateStr}.jsonl`);
  }

  /**
   * Get all log files in the log directory
   *
   * @returns Array of log file paths sorted by date (newest first)
   */
  async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDir);
      return files
        .filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))
        .map((f) => path.join(this.logDir, f))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * Read log entries from a file
   *
   * @param filePath - Path to log file
   * @param limit - Maximum entries to return
   * @param filter - Optional filter function
   */
  async readEntries(
    filePath: string,
    limit?: number,
    filter?: (entry: AuditLogEntry) => boolean
  ): Promise<AuditLogEntry[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let entries = lines.map((line) => JSON.parse(line) as AuditLogEntry);

      if (filter) {
        entries = entries.filter(filter);
      }

      if (limit) {
        entries = entries.slice(-limit); // Last N entries
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Get recent log entries across all log files
   *
   * @param limit - Maximum entries to return
   * @param filter - Optional filter function
   */
  async getRecentEntries(
    limit: number = 100,
    filter?: (entry: AuditLogEntry) => boolean
  ): Promise<AuditLogEntry[]> {
    const files = await this.getLogFiles();
    const entries: AuditLogEntry[] = [];

    for (const file of files) {
      const fileEntries = await this.readEntries(file, undefined, filter);
      entries.push(...fileEntries);

      if (entries.length >= limit) {
        break;
      }
    }

    return entries.slice(-limit);
  }

  /**
   * Get entries for a specific platform
   *
   * @param platform - Platform to filter by
   * @param limit - Maximum entries
   */
  async getEntriesForPlatform(
    platform: SyncPlatform,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return this.getRecentEntries(limit, (e) => e.platform === platform);
  }

  /**
   * Get all denied entries (for monitoring)
   *
   * @param limit - Maximum entries
   */
  async getDeniedEntries(limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getRecentEntries(limit, (e) => e.result === 'denied');
  }

  /**
   * Get all error entries (for debugging)
   *
   * @param limit - Maximum entries
   */
  async getErrorEntries(limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getRecentEntries(limit, (e) => e.result === 'error');
  }

  /**
   * Get statistics for a time period
   *
   * @param since - Start date (defaults to 24 hours ago)
   */
  async getStats(since?: Date): Promise<{
    total: number;
    success: number;
    denied: number;
    errors: number;
    byPlatform: Record<SyncPlatform, number>;
    avgDurationMs: number;
  }> {
    const sinceDate = since ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sinceStr = sinceDate.toISOString();

    const entries = await this.getRecentEntries(10000, (e) => e.timestamp >= sinceStr);

    const stats = {
      total: entries.length,
      success: 0,
      denied: 0,
      errors: 0,
      byPlatform: { github: 0, jira: 0, ado: 0 } as Record<SyncPlatform, number>,
      avgDurationMs: 0,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const entry of entries) {
      if (entry.result === 'success') stats.success++;
      else if (entry.result === 'denied') stats.denied++;
      else if (entry.result === 'error') stats.errors++;

      stats.byPlatform[entry.platform]++;

      if (entry.durationMs) {
        totalDuration += entry.durationMs;
        durationCount++;
      }
    }

    stats.avgDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return stats;
  }

  /**
   * Clean up old log files based on retention policy
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const files = await this.getLogFiles();
    let deletedCount = 0;

    for (const file of files) {
      // Extract date from filename: audit-YYYY-MM-DD.jsonl
      const match = path.basename(file).match(/audit-(\d{4}-\d{2}-\d{2})\.jsonl/);
      if (match && match[1] < cutoffStr) {
        try {
          await fs.unlink(file);
          deletedCount++;
          this.logger.debug(`Deleted old audit log: ${path.basename(file)}`);
        } catch (error) {
          this.logger.debug(`Failed to delete audit log: ${file}`);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Write an entry to the log file
   */
  private async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Ensure directory exists
      await fs.mkdir(this.logDir, { recursive: true });

      // Get current file path (may rotate on new day)
      const filePath = await this.getOrRotateFilePath();

      // Append entry as JSONL
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(filePath, line, 'utf-8');
    } catch (error) {
      // Don't fail the sync operation if logging fails
      this.logger.debug(`Failed to write audit log: ${error}`);
    }
  }

  /**
   * Get current file path, rotating if needed
   */
  private async getOrRotateFilePath(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];

    // Check if we need a new file (new day)
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.currentFilePath = this.getLogPath();
    }

    // Check file size for rotation
    if (this.currentFilePath) {
      try {
        const stats = await fs.stat(this.currentFilePath);
        if (stats.size >= this.maxFileSizeBytes) {
          // Rotate: add sequence number
          const basePath = this.currentFilePath.replace('.jsonl', '');
          let seq = 1;
          while (true) {
            const rotatedPath = `${basePath}-${seq}.jsonl`;
            try {
              await fs.access(rotatedPath);
              seq++;
            } catch {
              // File doesn't exist, use this name
              this.currentFilePath = rotatedPath;
              break;
            }
          }
        }
      } catch {
        // File doesn't exist yet, that's fine
      }
    }

    return this.currentFilePath;
  }
}
