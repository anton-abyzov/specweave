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
 *
 * @module github-validator
 */

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

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000 // 1 second
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
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers
    });

    if (response.status === 404) {
      // Repository does not exist (good for creation)
      return { exists: false, valid: true };
    }

    if (response.status === 200) {
      // Repository already exists
      const data: any = await response.json();
      return {
        exists: true,
        valid: true,
        url: data.html_url
      };
    }

    if (response.status === 401 || response.status === 403) {
      // Authentication or permission error
      const errorMsg = response.status === 401
        ? 'Invalid GitHub token'
        : 'Forbidden - check token permissions or rate limit';

      return { exists: false, valid: false, error: errorMsg };
    }

    // Other error
    return {
      exists: false,
      valid: false,
      error: `GitHub API error: ${response.status} ${response.statusText}`
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
    // Try as user first
    const userResponse = await fetch(`https://api.github.com/users/${owner}`, {
      headers
    });

    if (userResponse.status === 200) {
      const data: any = await userResponse.json();
      const type = data.type === 'Organization' ? 'org' : 'user';
      return { valid: true, type };
    }

    // Try as organization
    const orgResponse = await fetch(`https://api.github.com/orgs/${owner}`, {
      headers
    });

    if (orgResponse.status === 200) {
      return { valid: true, type: 'org' };
    }

    // Not found
    return { valid: false, error: 'Owner not found on GitHub' };

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

/**
 * Check GitHub API rate limit
 *
 * @param token - GitHub personal access token (optional)
 * @returns Rate limit info
 */
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
    const response = await fetch('https://api.github.com/rate_limit', {
      headers
    });

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
