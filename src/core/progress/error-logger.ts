/**
 * Error Logger - Comprehensive error logging for batch operations
 *
 * Features:
 * - File-based error logging
 * - Timestamped error records
 * - Structured error format
 * - Automatic log directory creation
 *
 * @module core/progress/error-logger
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdirpSync } from '../../utils/fs-native.js';

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  timestamp: string;
  projectKey: string;
  error: string;
  suggestion?: string;
}

/**
 * Error logger options
 */
export interface ErrorLoggerOptions {
  /** Log file path (default: .specweave/logs/import-errors.log) */
  logFile?: string;
  /** Project root directory */
  projectRoot?: string;
}

/**
 * Get default error log file path
 */
function getDefaultLogPath(projectRoot: string): string {
  return join(projectRoot, '.specweave', 'logs', 'import-errors.log');
}

/**
 * Log error to file
 *
 * @param projectKey Project identifier
 * @param error Error object or message
 * @param options Logger options
 */
export async function logError(
  projectKey: string,
  error: Error | string,
  options: ErrorLoggerOptions = {}
): Promise<void> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const logFile = options.logFile ?? getDefaultLogPath(projectRoot);
  const logDir = join(projectRoot, '.specweave', 'logs');

  // Ensure log directory exists
  mkdirpSync(logDir);

  // Create error entry
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    projectKey,
    error: error instanceof Error ? error.message : error
  };

  // Format log line
  const logLine = `[${entry.timestamp}] ${entry.projectKey}: ${entry.error}\n`;

  // Append to log file
  await fs.appendFile(logFile, logLine, 'utf-8');
}

/**
 * Read error log
 *
 * @param options Logger options
 * @returns Array of error log entries
 */
export async function readErrorLog(options: ErrorLoggerOptions = {}): Promise<ErrorLogEntry[]> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const logFile = options.logFile ?? getDefaultLogPath(projectRoot);

  if (!existsSync(logFile)) {
    return [];
  }

  const content = await fs.readFile(logFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  return lines.map(line => {
    // Parse log line: [timestamp] projectKey: error
    const match = line.match(/^\[([^\]]+)\]\s+([^:]+):\s+(.+)$/);
    if (!match) {
      return {
        timestamp: new Date().toISOString(),
        projectKey: 'UNKNOWN',
        error: line
      };
    }

    return {
      timestamp: match[1],
      projectKey: match[2].trim(),
      error: match[3].trim()
    };
  });
}

/**
 * Clear error log
 *
 * @param options Logger options
 */
export async function clearErrorLog(options: ErrorLoggerOptions = {}): Promise<void> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const logFile = options.logFile ?? getDefaultLogPath(projectRoot);

  if (existsSync(logFile)) {
    await fs.unlink(logFile);
  }
}

/**
 * Get error count from log
 *
 * @param options Logger options
 * @returns Number of errors in log
 */
export async function getErrorCount(options: ErrorLoggerOptions = {}): Promise<number> {
  const entries = await readErrorLog(options);
  return entries.length;
}
