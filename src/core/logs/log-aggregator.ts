/**
 * Log Aggregator
 *
 * Provides efficient querying across multiple log files with streaming,
 * filtering, and pagination support.
 *
 * @module core/logs/log-aggregator
 */

import { promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';
import { createReadStream } from 'fs';
import { SyncPlatform } from '../types/sync-config.js';
import { SyncOperation } from '../sync/permission-enforcer.js';
import { AuditLogEntry } from '../sync/sync-audit-logger.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Query options for log aggregation
 */
export interface LogQuery {
  /**
   * Start date (inclusive)
   */
  since?: Date;

  /**
   * End date (inclusive)
   */
  until?: Date;

  /**
   * Filter by platform
   */
  platform?: SyncPlatform;

  /**
   * Filter by operation type
   */
  operation?: SyncOperation;

  /**
   * Filter by result
   */
  result?: 'success' | 'denied' | 'error';

  /**
   * Maximum number of entries to return
   * @default 100
   */
  limit?: number;

  /**
   * Number of entries to skip
   * @default 0
   */
  offset?: number;
}

/**
 * Query result with metadata
 */
export interface LogQueryResult {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
  query: LogQuery;
  executionTimeMs: number;
}

/**
 * Log aggregator options
 */
export interface LogAggregatorOptions {
  /**
   * Path to .specweave directory
   */
  specweavePath?: string;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Default query limit
   * @default 100
   */
  defaultLimit?: number;
}

/**
 * LogAggregator - Efficient cross-file log querying
 *
 * Features:
 * - Stream-based processing (memory efficient)
 * - Date range filtering
 * - Platform/operation/result filtering
 * - Pagination support
 * - Early termination when limit reached
 */
export class LogAggregator {
  private readonly logDir: string;
  private readonly logger: Logger;
  private readonly defaultLimit: number;

  constructor(options: LogAggregatorOptions = {}) {
    const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');
    this.logDir = path.join(specweavePath, 'logs', 'sync');
    this.logger = options.logger ?? consoleLogger;
    this.defaultLimit = options.defaultLimit ?? 100;
  }

  /**
   * Query log entries across all log files
   */
  async query(query: LogQuery = {}): Promise<LogQueryResult> {
    const startTime = Date.now();
    const limit = query.limit ?? this.defaultLimit;
    const offset = query.offset ?? 0;

    // Get relevant log files based on date range
    const logFiles = await this.getLogFilesForDateRange(query.since, query.until);

    const allEntries: AuditLogEntry[] = [];
    let totalMatches = 0;

    // Process files from newest to oldest
    for (const logFile of logFiles) {
      if (allEntries.length >= limit + offset) {
        break;
      }

      const entries = await this.readAndFilterFile(logFile, query);
      for (const entry of entries) {
        totalMatches++;
        if (totalMatches > offset && allEntries.length < limit) {
          allEntries.push(entry);
        }
      }
    }

    return {
      entries: allEntries,
      total: totalMatches,
      hasMore: totalMatches > offset + limit,
      query,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Count entries matching query
   */
  async count(query: LogQuery = {}): Promise<number> {
    const logFiles = await this.getLogFilesForDateRange(query.since, query.until);
    let count = 0;

    for (const logFile of logFiles) {
      const entries = await this.readAndFilterFile(logFile, query);
      count += entries.length;
    }

    return count;
  }

  /**
   * Get aggregated statistics
   */
  async getStats(query: LogQuery = {}): Promise<{
    total: number;
    byResult: Record<string, number>;
    byPlatform: Record<SyncPlatform, number>;
    byOperation: Record<string, number>;
    avgDurationMs: number;
  }> {
    const result = await this.query({ ...query, limit: 10000 });

    const stats = {
      total: result.entries.length,
      byResult: { success: 0, denied: 0, error: 0 } as Record<string, number>,
      byPlatform: { github: 0, jira: 0, ado: 0 } as Record<SyncPlatform, number>,
      byOperation: {} as Record<string, number>,
      avgDurationMs: 0,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const entry of result.entries) {
      stats.byResult[entry.result] = (stats.byResult[entry.result] || 0) + 1;
      stats.byPlatform[entry.platform] = (stats.byPlatform[entry.platform] || 0) + 1;
      stats.byOperation[entry.operation] = (stats.byOperation[entry.operation] || 0) + 1;

      if (entry.durationMs) {
        totalDuration += entry.durationMs;
        durationCount++;
      }
    }

    stats.avgDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return stats;
  }

  /**
   * Get all log files in date range, sorted newest first
   */
  private async getLogFilesForDateRange(
    since?: Date,
    until?: Date
  ): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'))
        .map(f => ({
          path: path.join(this.logDir, f),
          date: this.extractDateFromFilename(f),
        }))
        .filter(f => f.date !== null)
        .filter(f => {
          if (since && f.date! < this.formatDateStr(since)) return false;
          if (until && f.date! > this.formatDateStr(until)) return false;
          return true;
        })
        .sort((a, b) => b.date!.localeCompare(a.date!)) // Newest first
        .map(f => f.path);

      return logFiles;
    } catch {
      return [];
    }
  }

  /**
   * Read and filter a single log file using streaming
   */
  private async readAndFilterFile(
    filePath: string,
    query: LogQuery
  ): Promise<AuditLogEntry[]> {
    const entries: AuditLogEntry[] = [];

    try {
      const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry = JSON.parse(line) as AuditLogEntry;

          if (this.matchesQuery(entry, query)) {
            entries.push(entry);
          }
        } catch {
          // Skip malformed lines
          this.logger.debug(`Skipping malformed log line in ${filePath}`);
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to read log file ${filePath}: ${error}`);
    }

    // Sort by timestamp descending (newest first)
    return entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Check if an entry matches the query filters
   */
  private matchesQuery(entry: AuditLogEntry, query: LogQuery): boolean {
    const entryTime = new Date(entry.timestamp).getTime();

    if (query.since && entryTime < query.since.getTime()) return false;
    if (query.until && entryTime > query.until.getTime()) return false;
    if (query.platform && entry.platform !== query.platform) return false;
    if (query.operation && entry.operation !== query.operation) return false;
    if (query.result && entry.result !== query.result) return false;

    return true;
  }

  /**
   * Extract date string from filename (audit-YYYY-MM-DD.jsonl)
   */
  private extractDateFromFilename(filename: string): string | null {
    const match = filename.match(/audit-(\d{4}-\d{2}-\d{2})(?:-\d+)?\.jsonl/);
    return match ? match[1] : null;
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
