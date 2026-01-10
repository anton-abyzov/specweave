import * as fs from 'fs';
import * as path from 'path';

/**
 * Warning entry for hook execution
 */
export interface HookWarning {
  severity: 'WARNING' | 'ERROR';
  message: string;
  recommendation?: string;
}

/**
 * Log entry for hook execution
 */
export interface HookLogEntry {
  hookName: string;
  status: 'success' | 'warning' | 'error';
  duration?: number;
  timestamp?: string;
  requestId?: string;
  error?: string;
  stackTrace?: string;
  warnings?: HookWarning[];
  startTime?: number;
  endTime?: number;
}

/**
 * Centralized hook logging system with structured output
 *
 * Features:
 * - Real-time log writing to .specweave/logs/hooks/
 * - Structured JSON format for easy parsing
 * - Request ID correlation for multi-hook operations
 * - Append-only logs per hook name
 *
 * @example
 * ```typescript
 * const logger = new HookLogger('.specweave/logs/hooks');
 *
 * await logger.log({
 *   hookName: 'user-prompt-submit',
 *   status: 'warning',
 *   duration: 5200,
 *   warnings: [{
 *     severity: 'WARNING',
 *     message: 'Hook execution timeout after 5s',
 *     recommendation: 'Run specweave check-hooks'
 *   }]
 * });
 * ```
 */
export class HookLogger {
  private logDir: string;

  /**
   * Create a new HookLogger instance
   *
   * @param logDir - Directory to write log files (e.g., '.specweave/logs/hooks')
   */
  constructor(logDir: string) {
    this.logDir = logDir;
  }

  /**
   * Log a hook execution event
   *
   * Writes to {logDir}/{hookName}.log in append mode.
   * Each line is a complete JSON object.
   *
   * @param entry - Hook log entry
   */
  async log(entry: HookLogEntry): Promise<void> {
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Add timestamp if not provided
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    // Build log file path
    const logFile = path.join(this.logDir, `${entry.hookName}.log`);

    // Write log entry as JSON line
    const logLine = JSON.stringify(logEntry) + '\n';

    // Append to log file
    fs.appendFileSync(logFile, logLine, 'utf8');
  }

  /**
   * Read recent log entries for a hook
   *
   * @param hookName - Name of the hook
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of log entries, most recent first
   */
  async readLogs(hookName: string, limit: number = 100): Promise<HookLogEntry[]> {
    const logFile = path.join(this.logDir, `${hookName}.log`);

    if (!fs.existsSync(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    const entries = lines
      .map(line => {
        try {
          return JSON.parse(line) as HookLogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is HookLogEntry => entry !== null);

    return entries.slice(-limit).reverse();
  }

  /**
   * List all hooks that have log files
   */
  async listHooks(): Promise<string[]> {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }
    return fs.readdirSync(this.logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => file.replace('.log', ''));
  }

  /**
   * Clear logs for a specific hook or all hooks
   */
  async clearLogs(hookName?: string): Promise<void> {
    if (hookName) {
      const logFile = path.join(this.logDir, `${hookName}.log`);
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
      return;
    }

    if (!fs.existsSync(this.logDir)) {
      return;
    }

    for (const file of fs.readdirSync(this.logDir)) {
      if (file.endsWith('.log')) {
        fs.unlinkSync(path.join(this.logDir, file));
      }
    }
  }
}
