/**
 * Failure Logger for Lazy Loading
 *
 * Logs lazy loading failures for debugging with rotation support.
 * Writes to ~/.specweave/logs/lazy-loading.log
 *
 * @module core/lazy-loading/failure-logger
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/** Log entry structure */
export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  operation: string;
  message: string;
  error?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

/** Logger configuration */
export interface LoggerConfig {
  maxFileSize: number; // bytes
  maxFiles: number;
  logDir?: string;
  logFile?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
};

/**
 * Failure Logger for lazy loading operations
 */
export class LazyLoadingLogger {
  private config: LoggerConfig;
  private logPath: string;
  private logDir: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logDir =
      this.config.logDir || path.join(os.homedir(), '.specweave', 'logs');
    this.logPath =
      this.config.logFile || path.join(this.logDir, 'lazy-loading.log');
    this.ensureLogDir();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDir(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch {
      // Silently fail - logging shouldn't crash the app
    }
  }

  /**
   * Rotate logs if file exceeds max size
   */
  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logPath)) {
        return;
      }

      const stats = fs.statSync(this.logPath);
      if (stats.size < this.config.maxFileSize) {
        return;
      }

      // Rotate: lazy-loading.log.4 -> delete, .3 -> .4, .2 -> .3, .1 -> .2, .log -> .1
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const older = `${this.logPath}.${i}`;
        const newer = i === 1 ? this.logPath : `${this.logPath}.${i - 1}`;

        if (i === this.config.maxFiles - 1 && fs.existsSync(older)) {
          fs.unlinkSync(older);
        }

        if (fs.existsSync(newer)) {
          fs.renameSync(newer, `${this.logPath}.${i}`);
        }
      }
    } catch {
      // Silently fail rotation
    }
  }

  /**
   * Write a log entry
   */
  private write(entry: LogEntry): void {
    try {
      this.rotateIfNeeded();

      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logPath, line, 'utf-8');
    } catch {
      // Silently fail - logging shouldn't crash the app
    }
  }

  /**
   * Log an error
   */
  error(operation: string, message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'error',
      operation,
      message,
      error: error?.message,
      stack: error?.stack,
      metadata,
    });
  }

  /**
   * Log a warning
   */
  warn(operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'warn',
      operation,
      message,
      metadata,
    });
  }

  /**
   * Log an info message
   */
  info(operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'info',
      operation,
      message,
      metadata,
    });
  }

  /**
   * Log a debug message
   */
  debug(operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'debug',
      operation,
      message,
      metadata,
    });
  }

  /**
   * Get the log file path for error messages
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Read recent log entries
   */
  getRecentLogs(count = 50): LogEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const content = fs.readFileSync(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      return lines
        .slice(-count)
        .map((line) => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null);
    } catch {
      return [];
    }
  }

  /**
   * Get log statistics
   */
  getStats(): { totalEntries: number; errorCount: number; warnCount: number; fileSize: number } {
    try {
      if (!fs.existsSync(this.logPath)) {
        return { totalEntries: 0, errorCount: 0, warnCount: 0, fileSize: 0 };
      }

      const stats = fs.statSync(this.logPath);
      const entries = this.getRecentLogs(10000);

      return {
        totalEntries: entries.length,
        errorCount: entries.filter((e) => e.level === 'error').length,
        warnCount: entries.filter((e) => e.level === 'warn').length,
        fileSize: stats.size,
      };
    } catch {
      return { totalEntries: 0, errorCount: 0, warnCount: 0, fileSize: 0 };
    }
  }

  /**
   * Clear all logs
   */
  clear(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath);
      }

      // Clear rotated files too
      for (let i = 1; i < this.config.maxFiles; i++) {
        const rotated = `${this.logPath}.${i}`;
        if (fs.existsSync(rotated)) {
          fs.unlinkSync(rotated);
        }
      }
    } catch {
      // Silently fail
    }
  }
}

// Default singleton instance
let defaultLogger: LazyLoadingLogger | null = null;

/**
 * Get the default logger instance
 */
export function getLogger(): LazyLoadingLogger {
  if (!defaultLogger) {
    defaultLogger = new LazyLoadingLogger();
  }
  return defaultLogger;
}

/**
 * Log an error (convenience function)
 */
export function logError(
  operation: string,
  message: string,
  error?: Error,
  metadata?: Record<string, unknown>
): void {
  getLogger().error(operation, message, error, metadata);
}

/**
 * Log a warning (convenience function)
 */
export function logWarn(operation: string, message: string, metadata?: Record<string, unknown>): void {
  getLogger().warn(operation, message, metadata);
}

/**
 * Log info (convenience function)
 */
export function logInfo(operation: string, message: string, metadata?: Record<string, unknown>): void {
  getLogger().info(operation, message, metadata);
}

/**
 * Get log file path for error messages
 */
export function getLogFilePath(): string {
  return getLogger().getLogPath();
}
