/**
 * GitHub Repository Validator
 *
 * Validates repository and owner existence before creation.
 * Prevents errors from duplicate repos or non-existent owners.
 *
 * Features:
 * - Repository existence check via GitHub API
 * - Owner/organization validation
 * - Retry logic with exponential backoff
 * - Rate limit awareness
 * - Actionable error messages with troubleshooting steps
 *
 * @module github-validator
 */

import { getActionableError, formatActionableError, type GitApiError } from './git-error-handler.js';

/**
 * Validation result
 */
export interface ValidationResult {
  exists: boolean;
  valid: boolean;
  url?: string;
  error?: string;
}

/**
 * Owner validation result
 */
export interface OwnerValidationResult {
  valid: boolean;
  type?: 'user' | 'org';
  error?: string;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000
};

/**
 * Validate if a GitHub repository exists
 *
 * @param owner - Repository owner (user or org)
 * @param repo - Repository name
 * @param token - GitHub personal access token (optional)
 * @returns Validation result
 */
export async function validateRepository(
  owner: string,
  repo: string,
  token?: string
): Promise<ValidationResult> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (response.status === 404) {
      return { exists: false, valid: true };
    }

    if (response.status === 200) {
      const data: any = await response.json();
      return { exists: true, valid: true, url: data.html_url };
    }

    // Handle all error cases uniformly
    const apiError: GitApiError = {
      status: response.status,
      message: response.statusText,
      platform: 'github',
      operation: 'validate_repo',
      resourceType: 'repository',
      resourceName: `${owner}/${repo}`
    };

    return {
      exists: false,
      valid: false,
      error: formatActionableError(getActionableError(apiError))
    };
  } catch (error) {
    return {
      exists: false,
      valid: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate if a GitHub owner (user or organization) exists
 *
 * @param owner - Owner name to validate
 * @param token - GitHub personal access token (optional)
 * @returns Owner validation result
 */
export async function validateOwner(
  owner: string,
  token?: string
): Promise<OwnerValidationResult> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    // Try as user first (covers both users and organizations)
    const userResponse = await fetch(`https://api.github.com/users/${owner}`, { headers });

    if (userResponse.status === 200) {
      const data: any = await userResponse.json();
      return { valid: true, type: data.type === 'Organization' ? 'org' : 'user' };
    }

    // Try as organization if user endpoint failed
    const orgResponse = await fetch(`https://api.github.com/orgs/${owner}`, { headers });

    if (orgResponse.status === 200) {
      return { valid: true, type: 'org' };
    }

    // Not found
    const apiError: GitApiError = {
      status: 404,
      message: 'Not Found',
      platform: 'github',
      operation: 'validate_owner',
      resourceType: 'user',
      resourceName: owner
    };

    return { valid: false, error: formatActionableError(getActionableError(apiError)) };
  } catch (error) {
    return {
      valid: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate with retry logic
 *
 * @param fn - Validation function to retry
 * @param config - Retry configuration
 * @returns Validation result
 */
export async function validateWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxAttempts) {
        // Exponential backoff
        const delay = config.baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Validation failed');
}

export async function checkRateLimit(token?: string): Promise<{
  remaining: number;
  resetAt: Date;
}> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch('https://api.github.com/rate_limit', { headers });
    const data: any = await response.json();
    const core = data.resources.core;

    return {
      remaining: core.remaining,
      resetAt: new Date(core.reset * 1000)
    };
  } catch (error) {
    throw new Error(`Failed to check rate limit: ${error instanceof Error ? error.message : String(error)}`);
  }
}
