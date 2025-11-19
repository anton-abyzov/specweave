/**
 * Logger Interface
 *
 * Abstraction for logging to enable silent testing and flexible log output.
 * Prevents test output pollution from expected error conditions.
 */

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  /**
   * Log informational message
   */
  log(message: string): void;

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
 */
export const consoleLogger: Logger = {
  log: (message: string) => console.log(message),
  error: (message: string, error?: any) => {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  },
  warn: (message: string) => console.warn(message),
  debug: (message: string) => console.log(message)
};

/**
 * Silent logger (for testing)
 *
 * Suppresses all log output - use in tests to prevent pollution
 * from expected error conditions.
 */
export const silentLogger: Logger = {
  log: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {}
};

/**
 * Create a custom logger that filters based on log level
 *
 * @param minLevel - Minimum level to log (debug=0, log=1, warn=2, error=3)
 * @returns Logger instance
 */
export function createFilteredLogger(minLevel: 'debug' | 'log' | 'warn' | 'error' = 'log'): Logger {
  const levels = { debug: 0, log: 1, warn: 2, error: 3 };
  const threshold = levels[minLevel];

  return {
    log: (msg) => levels.log >= threshold && console.log(msg),
    error: (msg, err) => levels.error >= threshold && (err ? console.error(msg, err) : console.error(msg)),
    warn: (msg) => levels.warn >= threshold && console.warn(msg),
    debug: (msg) => levels.debug >= threshold && console.log(msg)
  };
}
