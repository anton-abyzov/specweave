/**
 * Bash Output Sanitizer
 *
 * Sanitizes bash command outputs to prevent credential leaks.
 * Integrates with credential-masker to protect sensitive data in shell outputs.
 *
 * Use cases:
 * - Sanitizing `grep` outputs that search for env variables
 * - Cleaning command outputs before displaying to users
 * - Protecting logs from accidental credential exposure
 */

import { sanitizeBashOutput, maskCredentials } from './credential-masker.js';

/**
 * Sanitize command output before displaying
 *
 * @param output - Raw command output
 * @param command - Original command (for context)
 * @returns Sanitized output safe for display
 *
 * @example
 * sanitizeCommandOutput('GITHUB_TOKEN=ghp_123456', 'grep GITHUB_TOKEN .env')
 * // Returns: 'GITHUB_TOKEN=ghp_****456'
 */
export function sanitizeCommandOutput(output: string, command?: string): string {
  if (!output) return output;

  // Check if this is a sensitive command that might expose credentials
  const isSensitiveCommand = command && (
    command.includes('grep') ||
    command.includes('cat') ||
    command.includes('echo') ||
    command.includes('.env') ||
    command.includes('TOKEN') ||
    command.includes('PASSWORD') ||
    command.includes('SECRET') ||
    command.includes('KEY')
  );

  // Always sanitize if command is sensitive or output contains credentials
  return sanitizeBashOutput(output);
}

/**
 * Wrap a bash command execution with automatic output sanitization
 *
 * @param executor - Function that executes the command and returns output
 * @param command - Command being executed
 * @returns Sanitized output
 */
export async function sanitizedExec<T>(
  executor: () => Promise<T>,
  command: string
): Promise<T> {
  try {
    const result = await executor();

    // If result is a string, sanitize it
    if (typeof result === 'string') {
      return sanitizeCommandOutput(result, command) as T;
    }

    // If result is an object with stdout/stderr, sanitize those
    if (result && typeof result === 'object') {
      const sanitized: any = { ...result };

      if ('stdout' in result && typeof (result as any).stdout === 'string') {
        sanitized.stdout = sanitizeCommandOutput((result as any).stdout, command);
      }

      if ('stderr' in result && typeof (result as any).stderr === 'string') {
        sanitized.stderr = sanitizeCommandOutput((result as any).stderr, command);
      }

      if ('output' in result && typeof (result as any).output === 'string') {
        sanitized.output = sanitizeCommandOutput((result as any).output, command);
      }

      return sanitized as T;
    }

    return result;
  } catch (error: any) {
    // Sanitize error messages too
    if (error && typeof error.message === 'string') {
      error.message = maskCredentials(error.message);
    }

    if (error && typeof error.stdout === 'string') {
      error.stdout = sanitizeCommandOutput(error.stdout, command);
    }

    if (error && typeof error.stderr === 'string') {
      error.stderr = sanitizeCommandOutput(error.stderr, command);
    }

    throw error;
  }
}

/**
 * Check if a command is potentially sensitive
 *
 * @param command - Command to check
 * @returns True if command might expose credentials
 */
export function isSensitiveCommand(command: string): boolean {
  if (!command) return false;

  const sensitivePatterns = [
    /grep.*TOKEN/i,
    /grep.*PASSWORD/i,
    /grep.*SECRET/i,
    /grep.*KEY/i,
    /grep.*\.env/i,
    /cat.*\.env/i,
    /echo.*TOKEN/i,
    /echo.*PASSWORD/i,
    /printenv/i,
    /env\s*\|/i,
    /export.*TOKEN/i,
    /export.*PASSWORD/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(command));
}

/**
 * Sanitize a command string for logging
 *
 * Masks credential values in the command itself
 *
 * @param command - Command to sanitize
 * @returns Sanitized command
 *
 * @example
 * sanitizeCommand('export GITHUB_TOKEN=ghp_123456')
 * // Returns: 'export GITHUB_TOKEN=ghp_****456'
 */
export function sanitizeCommand(command: string): string {
  if (!command) return command;

  return maskCredentials(command);
}

/**
 * Create a sanitized logger for bash operations
 *
 * @param logger - Original logger
 * @returns Logger that automatically sanitizes all output
 */
export function createBashLogger(logger: any) {
  return {
    log: (message: string, ...args: any[]) => {
      const sanitized = maskCredentials(message);
      const sanitizedArgs = args.map(arg =>
        typeof arg === 'string' ? maskCredentials(arg) : arg
      );
      logger.log(sanitized, ...sanitizedArgs);
    },

    info: (message: string, ...args: any[]) => {
      const sanitized = maskCredentials(message);
      const sanitizedArgs = args.map(arg =>
        typeof arg === 'string' ? maskCredentials(arg) : arg
      );
      logger.info(sanitized, ...sanitizedArgs);
    },

    error: (message: string, error?: any) => {
      const sanitized = maskCredentials(message);
      let sanitizedError = error;

      if (typeof error === 'string') {
        sanitizedError = maskCredentials(error);
      }

      logger.error(sanitized, sanitizedError);
    },

    warn: (message: string) => {
      const sanitized = maskCredentials(message);
      logger.warn(sanitized);
    },

    debug: (message: string) => {
      const sanitized = maskCredentials(message);
      logger.debug(sanitized);
    }
  };
}

/**
 * Environment variable display helper
 *
 * Shows environment variables with credentials masked
 *
 * @param env - Environment object
 * @returns Formatted string safe for display
 */
export function displayEnvironment(env: NodeJS.ProcessEnv = process.env): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;

    const line = `${key}=${value}`;
    lines.push(maskCredentials(line));
  }

  return lines.join('\n');
}
