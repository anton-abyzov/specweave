/**
 * Project Count Fetcher
 *
 * Lightweight query to get project count without fetching full metadata.
 * Optimized for < 1 second response time with retry logic.
 *
 * @module cli/helpers/project-count-fetcher
 */

import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Supported issue tracker providers
 */
export type ProjectProvider = 'jira' | 'ado';

/**
 * Jira instance type (Cloud vs Server/Data Center)
 */
export type JiraInstanceType = 'cloud' | 'server';

/**
 * Jira credentials
 */
export interface JiraCredentials {
  domain: string;
  email: string;
  token: string;
  instanceType: JiraInstanceType;
}

/**
 * Azure DevOps credentials
 */
export interface AdoCredentials {
  organization: string;
  pat: string;
}

/**
 * Project count options
 */
export interface ProjectCountOptions {
  credentials: JiraCredentials | AdoCredentials;
  provider: ProjectProvider;
  logger?: Logger;
}

/**
 * Project count result
 */
export interface ProjectCountResult {
  total: number;
  accessible: number;
  error?: string;
}

/**
 * Get project count from issue tracker
 *
 * Performs lightweight count-only query (no metadata fetched).
 * Target response time: < 1 second
 *
 * @param options - Project count options
 * @returns Project count result
 *
 * @example
 * ```typescript
 * const result = await getProjectCount({
 *   credentials: { domain: 'example.atlassian.net', email: 'user@example.com', token: 'xyz', instanceType: 'cloud' },
 *   provider: 'jira'
 * });
 * console.log(`Found ${result.total} projects`);
 * ```
 */
export async function getProjectCount(
  options: ProjectCountOptions
): Promise<ProjectCountResult> {
  const { provider, credentials, logger = consoleLogger } = options;

  try {
    if (provider === 'jira') {
      return await getJiraProjectCount(credentials as JiraCredentials, logger);
    } else if (provider === 'ado') {
      return await getAdoProjectCount(credentials as AdoCredentials, logger);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error: any) {
    logger.error('Error fetching project count:', error);
    return {
      total: 0,
      accessible: 0,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get JIRA project count (Cloud or Server)
 *
 * API Endpoints:
 * - Cloud: GET /rest/api/3/project/search?maxResults=0
 * - Server: GET /rest/api/2/project?maxResults=0
 *
 * @param credentials - JIRA credentials
 * @param logger - Logger instance
 * @returns Project count result
 */
async function getJiraProjectCount(
  credentials: JiraCredentials,
  logger: Logger
): Promise<ProjectCountResult> {
  const { domain, email, token, instanceType } = credentials;

  // Determine API endpoint based on instance type
  const apiVersion = instanceType === 'cloud' ? '3' : '2';
  const endpoint = instanceType === 'cloud'
    ? `/rest/api/${apiVersion}/project/search?maxResults=0`
    : `/rest/api/${apiVersion}/project?maxResults=0`;

  const url = `https://${domain}${endpoint}`;

  // Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
  const delays = [1000, 2000, 4000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'No error body');
        throw new Error(
          `JIRA API error: ${response.status} ${response.statusText}. ${errorBody}`
        );
      }

      if (instanceType === 'cloud') {
        // Cloud returns { total: N, values: [] }
        const data = (await response.json()) as { total: number };
        return {
          total: data.total,
          accessible: data.total
        };
      } else {
        // Server returns [] with X-Total-Count header
        const totalHeader = response.headers.get('X-Total-Count');
        const total = totalHeader ? parseInt(totalHeader, 10) : 0;
        return {
          total,
          accessible: total
        };
      }
    } catch (error: any) {
      lastError = error;

      // Don't retry on auth failures (4XX except 429)
      const isAuthError =
        error.message && /\b40[0134]\b/.test(error.message);
      if (isAuthError && !error.message.includes('429')) {
        throw error;
      }

      // Retry on network errors or 5XX/429 errors
      if (attempt < 2) {
        logger.log(`Retry ${attempt + 1}/3 after ${delays[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw lastError || new Error('Failed to get project count after 3 attempts');
}

/**
 * Get Azure DevOps project count
 *
 * API Endpoint:
 * - GET https://dev.azure.com/{org}/_apis/projects?$top=0
 *
 * @param credentials - ADO credentials
 * @param logger - Logger instance
 * @returns Project count result
 */
async function getAdoProjectCount(
  credentials: AdoCredentials,
  logger: Logger
): Promise<ProjectCountResult> {
  const { organization, pat } = credentials;

  const url = `https://dev.azure.com/${organization}/_apis/projects?$top=0&api-version=7.0`;

  // Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
  const delays = [1000, 2000, 4000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'No error body');
        const looksLikeHtml = errorBody.trim().startsWith('<!DOCTYPE') ||
                              errorBody.trim().startsWith('<html');

        if (looksLikeHtml) {
          throw new Error(
            `Azure DevOps returned an error page (HTTP ${response.status}).\n` +
            `This usually indicates an authentication or configuration issue.\n\n` +
            `Possible causes:\n` +
            `• Invalid or expired Personal Access Token (PAT)\n` +
            `• Incorrect organization name "${organization}"\n` +
            `• Corporate firewall or proxy intercepting the request\n` +
            `• SSO/authentication redirect (try accessing Azure DevOps in browser first)`
          );
        }

        throw new Error(
          `Azure DevOps API error: ${response.status} ${response.statusText}. ${errorBody.substring(0, 200)}`
        );
      }

      // Parse JSON response safely
      const responseText = await response.text();
      const looksLikeHtml = responseText.trim().startsWith('<!DOCTYPE') ||
                            responseText.trim().startsWith('<html');

      if (looksLikeHtml) {
        throw new Error(
          `Azure DevOps returned HTML instead of JSON.\n` +
          `This usually indicates an authentication or configuration issue.\n\n` +
          `Possible causes:\n` +
          `• Invalid or expired Personal Access Token (PAT)\n` +
          `• Incorrect organization name "${organization}"\n` +
          `• Corporate firewall or proxy intercepting the request\n` +
          `• SSO/authentication redirect`
        );
      }

      let data: { count: number };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Azure DevOps returned invalid JSON.\n` +
          `Response preview: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`
        );
      }

      return {
        total: data.count,
        accessible: data.count
      };
    } catch (error: any) {
      lastError = error;

      // Don't retry on auth failures (4XX except 429)
      const isAuthError =
        error.message && /\b40[0134]\b/.test(error.message);
      if (isAuthError && !error.message.includes('429')) {
        throw error;
      }

      // Retry on network errors or 5XX/429 errors
      if (attempt < 2) {
        logger.log(`Retry ${attempt + 1}/3 after ${delays[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw lastError || new Error('Failed to get ADO project count after 3 attempts');
}
