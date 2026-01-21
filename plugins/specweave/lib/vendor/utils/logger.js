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
 * Mask message and variadic string args
 */
function maskMessageAndArgs(message, args) {
    return {
        msg: maskCredentials(message),
        maskedArgs: args.map(arg => typeof arg === 'string' ? maskCredentials(arg) : arg)
    };
}
/**
 * Mask an error object or string
 */
function maskError(error) {
    if (error && typeof error === 'object') {
        return maskCredentialsInData(error);
    }
    if (typeof error === 'string') {
        return maskCredentials(error);
    }
    return error;
}
/**
 * Console logger (default production logger)
 *
 * Logs to console.log/error/warn
 * SECURITY: Automatically masks all credentials before logging
 */
export const consoleLogger = {
    log: (message, ...args) => {
        const { msg, maskedArgs } = maskMessageAndArgs(message, args);
        console.log(msg, ...maskedArgs);
    },
    info: (message, ...args) => {
        const { msg, maskedArgs } = maskMessageAndArgs(message, args);
        console.log(msg, ...maskedArgs);
    },
    error: (message, error) => {
        const msg = maskCredentials(message);
        const maskedError = maskError(error);
        if (maskedError) {
            console.error(msg, maskedError);
        }
        else {
            console.error(msg);
        }
    },
    warn: (message) => {
        console.warn(maskCredentials(message));
    },
    debug: (message) => {
        console.log(maskCredentials(message));
    }
};
/**
 * Silent logger (for testing)
 *
 * Suppresses all log output - use in tests to prevent pollution
 * from expected error conditions.
 */
export const silentLogger = {
    log: () => { },
    info: () => { },
    error: () => { },
    warn: () => { },
    debug: () => { }
};
/**
 * Create a custom logger that filters based on log level
 *
 * @param minLevel - Minimum level to log (debug=0, log=1, warn=2, error=3)
 * @returns Logger instance
 * SECURITY: Automatically masks all credentials before logging
 */
export function createFilteredLogger(minLevel = 'log') {
    const levels = { debug: 0, log: 1, info: 1, warn: 2, error: 3 };
    const threshold = levels[minLevel];
    return {
        log: (msg, ...args) => {
            if (levels.log < threshold)
                return;
            const { msg: masked, maskedArgs } = maskMessageAndArgs(msg, args);
            console.log(masked, ...maskedArgs);
        },
        info: (msg, ...args) => {
            if (levels.info < threshold)
                return;
            const { msg: masked, maskedArgs } = maskMessageAndArgs(msg, args);
            console.log(masked, ...maskedArgs);
        },
        error: (msg, err) => {
            if (levels.error < threshold)
                return;
            const maskedMsg = maskCredentials(msg);
            const maskedErr = maskError(err);
            if (maskedErr) {
                console.error(maskedMsg, maskedErr);
            }
            else {
                console.error(maskedMsg);
            }
        },
        warn: (msg) => {
            if (levels.warn < threshold)
                return;
            console.warn(maskCredentials(msg));
        },
        debug: (msg) => {
            if (levels.debug < threshold)
                return;
            console.log(maskCredentials(msg));
        }
    };
}
//# sourceMappingURL=logger.js.map