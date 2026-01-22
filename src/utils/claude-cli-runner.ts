/**
 * Claude CLI Runner - Shared LLM invocation module
 *
 * Provides a unified interface for spawning Claude CLI commands.
 * Used by plugin detection, reflect system, and completion evaluation.
 *
 * Features:
 * - Cross-platform support (Windows, macOS, Linux)
 * - Handles shell functions/aliases on Unix
 * - Clean environment (removes debugger flags)
 * - Proper timeout handling
 * - JSON response parsing
 *
 * @module utils/claude-cli-runner
 */

import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as os from 'os';
import { consoleLogger as logger } from './logger.js';
import { detectClaudeCli, getCleanEnv, type ClaudeCliStatus as DetectorStatus } from './claude-cli-detector.js';

/**
 * Available models for Claude CLI
 */
export type ClaudeModel = 'haiku' | 'sonnet' | 'opus';

/**
 * Options for running Claude CLI
 */
export interface ClaudeCliOptions {
  /** Model to use (default: haiku for speed) */
  model?: ClaudeModel;
  /** The prompt to send */
  prompt: string;
  /** Optional stdin input (for large content like transcripts) */
  stdin?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Maximum output tokens (not currently used by CLI, reserved for future) */
  maxOutputTokens?: number;
}

/**
 * Result of Claude CLI execution
 */
export interface ClaudeCliResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Exit code from the process */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of Claude CLI availability check
 */
export interface ClaudeCliStatus {
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
}

// Cache the CLI detection result for performance
let cachedCliStatus: DetectorStatus | null = null;

/**
 * Clear the cached CLI status (useful for testing)
 */
export function clearCliCache(): void {
  cachedCliStatus = null;
}

/**
 * Check if Claude CLI is available
 */
export function isClaudeCliAvailable(): ClaudeCliStatus {
  if (cachedCliStatus) {
    return {
      available: cachedCliStatus.available,
      path: cachedCliStatus.commandPath,
      version: cachedCliStatus.version,
      error: cachedCliStatus.available ? undefined : cachedCliStatus.errorMessage,
    };
  }

  logger.debug('[claude-cli-runner] Running fresh CLI detection...');
  const status = detectClaudeCli();
  cachedCliStatus = status;

  if (!status.available) {
    logger.warn(`[claude-cli-runner] Claude CLI not available: ${status.errorMessage}`);
  } else {
    logger.debug(`[claude-cli-runner] Claude CLI available: ${status.version} at ${status.commandPath}`);
  }

  return {
    available: status.available,
    path: status.commandPath,
    version: status.version,
    error: status.available ? undefined : status.errorMessage,
  };
}

/**
 * Execute Claude CLI command safely
 *
 * Handles:
 * - Direct binary execution (preferred)
 * - Shell function/alias fallback on Unix
 * - Windows shell execution
 * - Clean environment (no debugger flags)
 */
function executeClaudeCli(
  args: string[],
  timeout: number = 30000
): SpawnSyncReturns<string> {
  const isWindows = process.platform === 'win32';

  // Ensure we have cached CLI status
  if (!cachedCliStatus) {
    cachedCliStatus = detectClaudeCli();
  }

  const cleanEnv = getCleanEnv();
  const spawnOptions = {
    encoding: 'utf8' as const,
    timeout,
    maxBuffer: 1024 * 1024, // 1MB
    windowsHide: true,
    cwd: os.tmpdir(),
    env: {
      ...cleanEnv,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    },
  };

  // Prefer direct binary path (bypasses shell function wrappers)
  if (cachedCliStatus.commandPath && !cachedCliStatus.shellWorkaround) {
    logger.debug(`[claude-cli-runner] Using direct binary: ${cachedCliStatus.commandPath}`);
    return spawnSync(cachedCliStatus.commandPath, args, spawnOptions);
  }

  // Unix with shell function only: use interactive shell
  if (!isWindows) {
    logger.debug('[claude-cli-runner] Using interactive shell (no direct binary)');
    return executeViaInteractiveShell(args, timeout);
  }

  // Windows: use shell for PATH resolution
  return spawnSync('claude', args, { ...spawnOptions, shell: true });
}

/**
 * Execute via interactive shell (for shell functions/aliases)
 */
function executeViaInteractiveShell(
  args: string[],
  timeout: number
): SpawnSyncReturns<string> {
  const userShell = process.env.SHELL || '/bin/bash';
  const isZsh = userShell.includes('zsh');
  const shell = isZsh ? 'zsh' : 'bash';

  // Escape arguments properly
  const escapedArgs = args.map((arg) => `'${arg.replace(/'/g, "'\\''")}'`);
  const command = `claude ${escapedArgs.join(' ')}`;

  const cleanEnv = getCleanEnv();
  return spawnSync(shell, ['-ic', command], {
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    cwd: os.tmpdir(),
    env: {
      ...cleanEnv,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      BASH_SILENCE_DEPRECATION_WARNING: '1',
    },
  });
}

/**
 * Run Claude CLI with a prompt
 *
 * This is the main entry point for invoking Claude via CLI.
 *
 * @example
 * ```typescript
 * const result = await runClaudeCli({
 *   model: 'haiku',
 *   prompt: 'Analyze this code for security issues',
 *   timeoutMs: 30000,
 * });
 *
 * if (result.success) {
 *   console.log(result.stdout);
 * }
 * ```
 */
export function runClaudeCli(options: ClaudeCliOptions): ClaudeCliResult {
  const startTime = performance.now();
  const { model = 'haiku', prompt, timeoutMs = 30000 } = options;

  // Check CLI availability
  const cliStatus = isClaudeCliAvailable();
  if (!cliStatus.available) {
    return {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: '',
      durationMs: performance.now() - startTime,
      error: cliStatus.error || 'Claude CLI not available',
    };
  }

  // Build arguments
  const args = ['-p', prompt, '--model', model];

  try {
    const result = executeClaudeCli(args, timeoutMs);

    // Handle spawn errors
    if (result.error) {
      const errorMsg = result.error.message || String(result.error);

      if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('TIMEOUT')) {
        return {
          success: false,
          exitCode: -1,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          durationMs: performance.now() - startTime,
          error: `Timeout after ${timeoutMs}ms`,
        };
      }

      return {
        success: false,
        exitCode: result.status ?? -1,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        durationMs: performance.now() - startTime,
        error: `CLI error: ${errorMsg}`,
      };
    }

    // Handle non-zero exit
    if (result.status !== 0) {
      const stderr = result.stderr || '';

      if (stderr.includes('authentication') || stderr.includes('API key')) {
        return {
          success: false,
          exitCode: result.status ?? -1,
          stdout: result.stdout || '',
          stderr,
          durationMs: performance.now() - startTime,
          error: 'Authentication error. Run: claude login',
        };
      }

      if (stderr.includes('rate limit')) {
        return {
          success: false,
          exitCode: result.status ?? -1,
          stdout: result.stdout || '',
          stderr,
          durationMs: performance.now() - startTime,
          error: 'Rate limit exceeded. Try again later.',
        };
      }

      return {
        success: false,
        exitCode: result.status ?? -1,
        stdout: result.stdout || '',
        stderr,
        durationMs: performance.now() - startTime,
        error: `Exit code ${result.status}: ${stderr || result.stdout}`,
      };
    }

    return {
      success: true,
      exitCode: 0,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      durationMs: performance.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: '',
      durationMs: performance.now() - startTime,
      error: `Unexpected error: ${errorMsg}`,
    };
  }
}

/**
 * Parse JSON from Claude CLI output
 *
 * Handles:
 * - Plain JSON
 * - JSON wrapped in markdown code blocks
 * - Malformed responses
 */
export function parseJsonFromOutput<T>(output: string): { success: boolean; data?: T; error?: string } {
  const trimmed = output.trim();

  if (!trimmed) {
    return { success: false, error: 'Empty response' };
  }

  let jsonStr = trimmed;

  // Remove markdown code blocks if present
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Find JSON object in string
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { success: false, error: 'No JSON object found in response' };
  }

  try {
    const data = JSON.parse(jsonMatch[0]) as T;
    return { success: true, data };
  } catch (parseError) {
    return { success: false, error: `JSON parse error: ${parseError}` };
  }
}
