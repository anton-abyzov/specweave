/**
 * JIRA Paginated Search with Rate-Limit Retry
 *
 * Provides a paginated JQL search that fetches all results
 * by iterating through pages using startAt/maxResults.
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
  let startAt = 0;
  let total = Infinity;

  while (startAt < total) {
    const response = await requestWithRetry(client, '/search', {
      params: {
        jql,
        startAt,
        maxResults,
        ...(fields ? { fields } : {}),
      },
    });

    const data = response.data;
    total = data.total;
    const issues = data.issues || [];
    allIssues.push(...issues);

    startAt += issues.length;

    // Safety: if no issues returned, break to avoid infinite loop
    if (issues.length === 0) break;
  }

  return allIssues;
}

/**
 * Make an HTTP GET request with exponential backoff retry on 429.
 */
async function requestWithRetry(
  client: AxiosInstance,
  url: string,
  config: any,
  attempt: number = 0
): Promise<any> {
  try {
    return await client.get(url, config);
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
      return requestWithRetry(client, url, config, attempt + 1);
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
