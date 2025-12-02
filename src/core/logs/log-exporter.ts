/**
 * Log Exporter
 *
 * Exports log query results to various formats.
 *
 * @module core/logs/log-exporter
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AuditLogEntry } from '../sync/sync-audit-logger.js';
import { LogQueryResult } from './log-aggregator.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'jsonl' | 'csv';

/**
 * Export options
 */
export interface ExportOptions {
  /**
   * Output format
   * @default 'json'
   */
  format?: ExportFormat;

  /**
   * Pretty print JSON
   * @default true
   */
  pretty?: boolean;

  /**
   * Include query metadata in export
   * @default true
   */
  includeMetadata?: boolean;
}

/**
 * Log exporter options
 */
export interface LogExporterOptions {
  logger?: Logger;
}

/**
 * LogExporter - Export log entries to files
 *
 * Supports:
 * - JSON (single object with entries array)
 * - JSONL (one entry per line)
 * - CSV (for spreadsheet import)
 */
export class LogExporter {
  private readonly logger: Logger;

  constructor(options: LogExporterOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Export query results to a file
   */
  async export(
    result: LogQueryResult,
    outputPath: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const format = options.format ?? this.detectFormat(outputPath);
    const content = this.formatContent(result, format, options);

    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Write file
    await fs.writeFile(outputPath, content, 'utf-8');

    this.logger.debug(`Exported ${result.entries.length} entries to ${outputPath}`);
  }

  /**
   * Export entries to a string
   */
  exportToString(
    entries: AuditLogEntry[],
    format: ExportFormat,
    options: ExportOptions = {}
  ): string {
    const result: LogQueryResult = {
      entries,
      total: entries.length,
      hasMore: false,
      query: {},
      executionTimeMs: 0,
    };

    return this.formatContent(result, format, options);
  }

  /**
   * Format content based on format type
   */
  private formatContent(
    result: LogQueryResult,
    format: ExportFormat,
    options: ExportOptions
  ): string {
    switch (format) {
      case 'json':
        return this.formatJson(result, options);
      case 'jsonl':
        return this.formatJsonl(result);
      case 'csv':
        return this.formatCsv(result);
      default:
        return this.formatJson(result, options);
    }
  }

  /**
   * Format as JSON
   */
  private formatJson(result: LogQueryResult, options: ExportOptions): string {
    const pretty = options.pretty ?? true;
    const includeMetadata = options.includeMetadata ?? true;

    const output = includeMetadata
      ? {
          metadata: {
            exportedAt: new Date().toISOString(),
            total: result.total,
            hasMore: result.hasMore,
            query: result.query,
            executionTimeMs: result.executionTimeMs,
          },
          entries: result.entries,
        }
      : result.entries;

    return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  }

  /**
   * Format as JSONL (one JSON object per line)
   */
  private formatJsonl(result: LogQueryResult): string {
    return result.entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  }

  /**
   * Format as CSV
   */
  private formatCsv(result: LogQueryResult): string {
    const headers = [
      'timestamp',
      'platform',
      'operation',
      'itemId',
      'result',
      'reason',
      'error',
      'durationMs',
    ];

    const rows = result.entries.map(entry => [
      entry.timestamp,
      entry.platform,
      entry.operation,
      entry.itemId,
      entry.result,
      entry.reason ?? '',
      entry.error ?? '',
      entry.durationMs?.toString() ?? '',
    ]);

    const escape = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(escape).join(',')),
    ];

    return csvLines.join('\n') + '\n';
  }

  /**
   * Detect format from file extension
   */
  private detectFormat(filePath: string): ExportFormat {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jsonl':
        return 'jsonl';
      case '.csv':
        return 'csv';
      case '.json':
      default:
        return 'json';
    }
  }
}
