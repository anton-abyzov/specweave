/**
 * Test Logger Helper
 *
 * Creates a mock logger that captures log/warn/error messages for test assertions.
 */

import { Logger } from '../../src/utils/logger.js';

export interface TestLogger extends Logger {
  logMessages: string[];
  warnMessages: string[];
  errorMessages: string[];
  debugMessages: string[];
  clear: () => void;
}

export function createTestLogger(): TestLogger {
  const logMessages: string[] = [];
  const warnMessages: string[] = [];
  const errorMessages: string[] = [];
  const debugMessages: string[] = [];

  return {
    logMessages,
    warnMessages,
    errorMessages,
    debugMessages,

    log: (message: string, ...args: unknown[]) => {
      logMessages.push(message);
    },
    warn: (message: string, ...args: unknown[]) => {
      warnMessages.push(message);
    },
    error: (message: string, ...args: unknown[]) => {
      errorMessages.push(message);
    },
    debug: (message: string, ...args: unknown[]) => {
      debugMessages.push(message);
    },

    clear: () => {
      logMessages.length = 0;
      warnMessages.length = 0;
      errorMessages.length = 0;
      debugMessages.length = 0;
    }
  };
}
