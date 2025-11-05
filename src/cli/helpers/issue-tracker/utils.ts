/**
 * Shared Utilities for Issue Tracker Integration
 *
 * @module cli/helpers/issue-tracker/utils
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';
import type { IssueTracker, RateLimitError, RateLimitInfo } from './types.js';

/**
 * Detect default tracker based on project structure
 *
 * @param projectPath - Path to project root (ONLY checks this directory, not parents)
 * @returns Object with tracker and whether it was actually detected
 */
export function detectDefaultTracker(projectPath: string): { tracker: IssueTracker; detected: boolean } {
  // CRITICAL: Only check project directory, NOT parent directories
  const gitConfigPath = path.join(projectPath, '.git', 'config');

  if (fs.existsSync(gitConfigPath)) {
    try {
      const config = fs.readFileSync(gitConfigPath, 'utf-8');

      // Actually detected from .git/config
      if (config.includes('github.com')) return { tracker: 'github', detected: true };
      if (config.includes('dev.azure.com') || config.includes('visualstudio.com')) return { tracker: 'ado', detected: true };
      // Bitbucket not supported yet
      if (config.includes('bitbucket.org')) return { tracker: 'github', detected: false }; // Fallback, not truly detected
    } catch (error) {
      // Ignore errors, use default
    }
  }

  // No .git/config found in project directory - return default (NOT detected)
  return { tracker: 'github', detected: false };
}

/**
 * Check if gh CLI is available
 *
 * @returns True if gh CLI is installed and in PATH
 */
export async function isGhCliAvailable(): Promise<boolean> {
  try {
    const result = execFileNoThrowSync('gh', ['--version']);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Check if Claude CLI is available
 *
 * @returns True if claude CLI is installed and in PATH
 */
export function isClaudeCliAvailable(): boolean {
  try {
    const result = execFileNoThrowSync('claude', ['--version']);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Install tracker plugin via Claude CLI
 *
 * @param tracker - Tracker type
 * @returns True if installation succeeded
 */
export function installTrackerPlugin(tracker: IssueTracker): boolean {
  if (tracker === 'none') return true;

  const pluginName = `specweave-${tracker}`;

  try {
    const result = execFileNoThrowSync('claude', [
      'plugin',
      'install',
      `${pluginName}@specweave`
    ]);

    return result.success;
  } catch {
    return false;
  }
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff for rate limiting
 *
 * @param attempt - Current attempt number (0-indexed)
 * @returns Milliseconds to wait
 */
export function getBackoffDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const baseDelay = 1000;
  return baseDelay * Math.pow(2, attempt);
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @returns Result of function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      if (error.name === 'RateLimitError') {
        const rateLimitError = error as RateLimitError;
        const resetTime = rateLimitError.rateLimitInfo.reset.getTime();
        const now = Date.now();
        const waitMs = Math.max(0, resetTime - now);

        console.log(chalk.yellow(`\n⏳ Rate limit exceeded. Waiting ${Math.ceil(waitMs / 1000)}s...`));
        await sleep(waitMs + 1000); // Add 1s buffer
        continue;
      }

      // For other errors, use exponential backoff
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt);
        console.log(chalk.yellow(`\n⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`));
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Parse rate limit headers from fetch response
 *
 * @param headers - Response headers
 * @returns Rate limit info or null
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: new Date(parseInt(reset, 10) * 1000)
  };
}

/**
 * Check if response is rate limited
 *
 * @param response - Fetch response
 * @returns Rate limit info if rate limited, null otherwise
 */
export function checkRateLimit(response: Response): RateLimitInfo | null {
  if (response.status === 429 || response.status === 403) {
    return parseRateLimitHeaders(response.headers);
  }

  return null;
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns True if valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 *
 * @param email - Email to validate
 * @returns True if valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mask sensitive string (show first 4 and last 4 characters)
 *
 * @param value - String to mask
 * @returns Masked string
 */
export function maskSensitiveValue(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }

  const first4 = value.substring(0, 4);
  const last4 = value.substring(value.length - 4);
  const masked = '*'.repeat(value.length - 8);

  return `${first4}${masked}${last4}`;
}

/**
 * Get plugin name for tracker
 *
 * @param tracker - Tracker type
 * @returns Plugin name
 */
export function getPluginName(tracker: IssueTracker): string {
  if (tracker === 'none') return '';
  return `specweave-${tracker}`;
}

/**
 * Get tracker display name
 *
 * @param tracker - Tracker type
 * @returns Display name
 */
export function getTrackerDisplayName(tracker: IssueTracker): string {
  switch (tracker) {
    case 'github':
      return 'GitHub Issues';
    case 'jira':
      return 'Jira';
    case 'ado':
      return 'Azure DevOps';
    case 'none':
      return 'None';
  }
}
