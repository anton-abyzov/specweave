/**
 * Logger Interface
 *
 * Abstraction for logging to enable silent testing and flexible log output.
 * Prevents test output pollution from expected error conditions.
 *
 * SECURITY: All loggers automatically mask credentials using credential-masker utility.
 */

import { maskCredentials, maskCredentialsInData } from './credential-masker.js';

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  /**
   * Log informational message
   */
  log(message: string, ...args: any[]): void;

  /**
   * Log info message (alias for log)
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log error message with optional error object
   */
  error(message: string, error?: any): void;

  /**
   * Log warning message
   */
  warn(message: string): void;

  /**
   * Log debug message
   */
  debug(message: string): void;
}

/**
 * Console logger (default production logger)
 *
 * Logs to console.log/error/warn
 * SECURITY: Automatically masks all credentials before logging
 */
export const consoleLogger: Logger = {
  log: (message: string, ...args: any[]) => {
    const maskedMsg = maskCredentials(message);
    const maskedArgs = args.map(arg =>
      typeof arg === 'string' ? maskCredentials(arg) : arg
    );
    console.log(maskedMsg, ...maskedArgs);
  },

  info: (message: string, ...args: any[]) => {
    const maskedMsg = maskCredentials(message);
    const maskedArgs = args.map(arg =>
      typeof arg === 'string' ? maskCredentials(arg) : arg
    );
    console.log(maskedMsg, ...maskedArgs);
  },

  error: (message: string, error?: any) => {
    const maskedMsg = maskCredentials(message);
    let maskedError = error;

    if (error && typeof error === 'object') {
      maskedError = maskCredentialsInData(error);
    } else if (typeof error === 'string') {
      maskedError = maskCredentials(error);
    }

    if (maskedError) {
      console.error(maskedMsg, maskedError);
    } else {
      console.error(maskedMsg);
    }
  },

  warn: (message: string) => {
    const maskedMsg = maskCredentials(message);
    console.warn(maskedMsg);
  },

  debug: (message: string) => {
    const maskedMsg = maskCredentials(message);
    console.log(maskedMsg);
  }
};

/**
 * Silent logger (for testing)
 *
 * Suppresses all log output - use in tests to prevent pollution
 * from expected error conditions.
 */
export const silentLogger: Logger = {
  log: () => {},
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {}
};

/**
 * Create a custom logger that filters based on log level
 *
 * @param minLevel - Minimum level to log (debug=0, log=1, warn=2, error=3)
 * @returns Logger instance
 * SECURITY: Automatically masks all credentials before logging
 */
export function createFilteredLogger(minLevel: 'debug' | 'log' | 'warn' | 'error' = 'log'): Logger {
  const levels = { debug: 0, log: 1, info: 1, warn: 2, error: 3 };
  const threshold = levels[minLevel];

  return {
    log: (msg, ...args) => {
      if (levels.log < threshold) return;
      const maskedMsg = maskCredentials(msg);
      const maskedArgs = args.map(arg =>
        typeof arg === 'string' ? maskCredentials(arg) : arg
      );
      console.log(maskedMsg, ...maskedArgs);
    },

    info: (msg, ...args) => {
      if (levels.info < threshold) return;
      const maskedMsg = maskCredentials(msg);
      const maskedArgs = args.map(arg =>
        typeof arg === 'string' ? maskCredentials(arg) : arg
      );
      console.log(maskedMsg, ...maskedArgs);
    },

    error: (msg, err) => {
      if (levels.error < threshold) return;
      const maskedMsg = maskCredentials(msg);
      let maskedErr = err;

      if (err && typeof err === 'object') {
        maskedErr = maskCredentialsInData(err);
      } else if (typeof err === 'string') {
        maskedErr = maskCredentials(err);
      }

      if (maskedErr) {
        console.error(maskedMsg, maskedErr);
      } else {
        console.error(maskedMsg);
      }
    },

    warn: (msg) => {
      if (levels.warn < threshold) return;
      const maskedMsg = maskCredentials(msg);
      console.warn(maskedMsg);
    },

    debug: (msg) => {
      if (levels.debug < threshold) return;
      const maskedMsg = maskCredentials(msg);
      console.log(maskedMsg);
    }
  };
}
