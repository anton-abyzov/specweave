/**
 * Logger Interface
 *
 * Abstraction for logging to enable silent testing and flexible log output.
 * Prevents test output pollution from expected error conditions.
 *
 * SECURITY: All loggers automatically mask credentials using credential-masker utility.
 */
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
export declare const consoleLogger: Logger;
/**
 * Silent logger (for testing)
 *
 * Suppresses all log output - use in tests to prevent pollution
 * from expected error conditions.
 */
export declare const silentLogger: Logger;
/**
 * Create a custom logger that filters based on log level
 *
 * @param minLevel - Minimum level to log (debug=0, log=1, warn=2, error=3)
 * @returns Logger instance
 * SECURITY: Automatically masks all credentials before logging
 */
export declare function createFilteredLogger(minLevel?: 'debug' | 'log' | 'warn' | 'error'): Logger;
//# sourceMappingURL=logger.d.ts.map