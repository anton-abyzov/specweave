/**
 * JIRA Paginated Search with Rate-Limit Retry
 *
 * Provides a paginated JQL search that fetches all results
 * using cursor-based pagination (nextPageToken).
 *
 * Uses POST /search/jql endpoint (Atlassian Cloud deprecated
 * GET /search; POST /search also returns 410).
 *
 * NOTE: POST /search/jql does NOT accept startAt — it uses
 * nextPageToken for cursor-based pagination instead.
 *
 * Includes exponential backoff retry on HTTP 429 (rate limit).
 *
 * @module jira-paginated-search
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const DEFAULT_PAGE_SIZE = 50;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export interface PaginatedSearchOptions {
  jql: string;
  fields?: string;
  maxResults?: number;
}

/**
 * Search all issues matching a JQL query with full pagination.
 * Handles rate limiting with exponential backoff.
 *
 * Uses POST /search/jql with cursor-based pagination (nextPageToken).
 *
 * @param client - Axios instance configured with JIRA auth
 * @param options - Search options (jql, fields, maxResults per page)
 * @returns All matching issues across all pages
 */
export async function searchAllIssues(
  client: AxiosInstance,
  options: PaginatedSearchOptions
): Promise<any[]> {
  const { jql, fields, maxResults = DEFAULT_PAGE_SIZE } = options;
  const allIssues: any[] = [];
  let nextPageToken: string | undefined;

  do {
    const body: Record<string, any> = {
      jql,
      maxResults,
    };

    if (nextPageToken) {
      body.nextPageToken = nextPageToken;
    }

    if (fields) {
      body.fields = fields.split(',').map((f: string) => f.trim());
    }

    const response = await requestWithRetry(client, '/search/jql', body);

    const data = response.data;
    const issues = data.issues || [];
    allIssues.push(...issues);

    nextPageToken = data.nextPageToken;

    // Safety: if no issues returned, break to avoid infinite loop
    if (issues.length === 0) break;
  } while (nextPageToken);

  return allIssues;
}

/**
 * Make an HTTP POST request with exponential backoff retry on 429.
 */
async function requestWithRetry(
  client: AxiosInstance,
  url: string,
  body: any,
  attempt: number = 0
): Promise<any> {
  try {
    return await client.post(url, body);
  } catch (error: any) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (status === 429 && attempt < MAX_RETRIES) {
      // Read Retry-After header (seconds) or use exponential backoff
      const retryAfterHeader = axiosError.response?.headers?.['retry-after'];
      const retryAfterMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt);

      console.warn(
        `Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${retryAfterMs}ms...`
      );

      await sleep(retryAfterMs);
      return requestWithRetry(client, url, body, attempt + 1);
    }

    if (status === 429) {
      throw new Error(
        `JIRA rate limit exceeded after ${MAX_RETRIES} retries. ` +
        `Try again later or reduce request frequency.`
      );
    }

    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
