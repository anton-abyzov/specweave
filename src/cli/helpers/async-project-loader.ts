/**
 * Async Project Loader
 *
 * Advanced batch fetching with:
 * - Smart pagination (50-project batches)
 * - Real-time progress tracking
 * - Graceful cancelation (Ctrl+C)
 * - Retry logic with exponential backoff
 * - Rate limit handling
 * - Graceful degradation (reduce batch size on timeout)
 * - Continue-on-failure error handling
 * - Comprehensive error logging
 *
 * @module cli/helpers/async-project-loader
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { ProgressTracker } from './progress-tracker.js';
import { CancelationHandler, type CancelationState } from './cancelation-handler.js';
import type { JiraCredentials, AdoCredentials, JiraInstanceType } from './project-count-fetcher.js';

/**
 * Project provider type
 */
export type ProjectProvider = 'jira' | 'ado';

/**
 * Project metadata
 */
export interface Project {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  simplified?: boolean;
}

/**
 * Fetch options
 */
export interface FetchOptions {
  batchSize?: number; // Default: 50
  updateFrequency?: number; // Progress update frequency (default: 5)
  showEta?: boolean; // Show ETA estimation (default: true)
  stateFile?: string; // Cancelation state file (default: .specweave/cache/import-state.json)
  errorLogFile?: string; // Error log file (default: .specweave/logs/import-errors.log)
  logger?: Logger;
}

/**
 * Fetch result
 */
export interface FetchResult {
  projects: Project[];
  succeeded: number;
  failed: number;
  skipped: number;
  errors: FetchError[];
  canceled?: boolean;
}

/**
 * Fetch error with context
 */
export interface FetchError {
  projectKey: string;
  error: string;
  timestamp: string;
  suggestion: string;
  retryAttempts?: number;
}

/**
 * Async Project Loader
 *
 * Handles batch fetching from issue trackers with advanced features:
 * - Smart pagination (50-project batches for optimal performance)
 * - Real-time progress tracking with ETA
 * - Graceful cancelation with state persistence
 * - Retry logic with exponential backoff (1s, 2s, 4s)
 * - Rate limit detection and throttling
 * - Graceful degradation (reduce batch size on timeout)
 * - Continue-on-failure (single error doesn't block batch)
 * - Comprehensive error logging
 *
 * @example
 * ```typescript
 * const loader = new AsyncProjectLoader(credentials, 'jira', {
 *   batchSize: 50,
 *   showEta: true
 * });
 *
 * const result = await loader.fetchAllProjects(127);
 * console.log(`Imported ${result.succeeded}/${result.projects.length} projects`);
 * ```
 */
export class AsyncProjectLoader {
  private credentials: JiraCredentials | AdoCredentials;
  private provider: ProjectProvider;
  private options: Required<FetchOptions>;

  private progressTracker?: ProgressTracker;
  private cancelHandler?: CancelationHandler;

  private currentBatchSize: number; // Dynamic batch size (for graceful degradation)

  constructor(
    credentials: JiraCredentials | AdoCredentials,
    provider: ProjectProvider,
    options: FetchOptions = {}
  ) {
    this.credentials = credentials;
    this.provider = provider;

    // Set defaults
    this.options = {
      batchSize: options.batchSize ?? 50,
      updateFrequency: options.updateFrequency ?? 5,
      showEta: options.showEta ?? true,
      stateFile: options.stateFile ?? '.specweave/cache/import-state.json',
      errorLogFile: options.errorLogFile ?? '.specweave/logs/import-errors.log',
      logger: options.logger ?? consoleLogger
    };

    this.currentBatchSize = this.options.batchSize;
  }

  /**
   * Fetch all projects with smart pagination
   *
   * @param totalCount - Total number of projects to fetch
   * @returns Fetch result with projects and statistics
   */
  async fetchAllProjects(totalCount: number): Promise<FetchResult> {
    const projects: Project[] = [];
    const errors: FetchError[] = [];

    // Initialize progress tracker
    this.progressTracker = new ProgressTracker({
      total: totalCount,
      updateFrequency: this.options.updateFrequency,
      showEta: this.options.showEta,
      logger: this.options.logger
    });

    // Initialize cancelation handler
    this.cancelHandler = new CancelationHandler({
      stateFile: this.options.stateFile,
      logger: this.options.logger
    });

    // Register cleanup callback (save state on Ctrl+C)
    this.cancelHandler.onCleanup(async () => {
      await this.savePartialState(projects, totalCount, errors);
    });

    // Main fetch loop
    let offset = 0;
    while (offset < totalCount) {
      // Check for cancelation
      if (this.cancelHandler.shouldCancel()) {
        this.progressTracker.cancel();
        this.cancelHandler.suggestResume('/specweave-jira:import-projects --resume');

        return {
          projects,
          succeeded: this.progressTracker.getSummary().succeeded,
          failed: this.progressTracker.getSummary().failed,
          skipped: this.progressTracker.getSummary().skipped,
          errors,
          canceled: true
        };
      }

      // Calculate batch size (last batch may be smaller)
      const limit = Math.min(this.currentBatchSize, totalCount - offset);

      try {
        // Fetch batch with retry logic
        const batch = await this.fetchBatchWithRetry(offset, limit);

        projects.push(...batch);

        // Update progress for each item in batch
        batch.forEach(project => {
          this.progressTracker!.update(project.key, 'success');
        });
      } catch (error: any) {
        // Continue-on-failure: Log error, skip batch, continue
        const batchKey = `BATCH_${offset}-${offset + limit}`;
        const fetchError: FetchError = {
          projectKey: batchKey,
          error: error.message,
          timestamp: new Date().toISOString(),
          suggestion: this.getSuggestion(error),
          retryAttempts: 3
        };

        errors.push(fetchError);
        await this.logError(fetchError);

        // Update progress (mark all as failed)
        for (let i = 0; i < limit; i++) {
          this.progressTracker!.update(`${batchKey}_${i}`, 'failure');
        }

        // Check if we should reduce batch size (graceful degradation)
        if (this.isTimeoutError(error) && this.currentBatchSize > 10) {
          const oldSize = this.currentBatchSize;
          this.currentBatchSize = Math.max(10, Math.floor(this.currentBatchSize / 2));
          this.options.logger.log(
            chalk.yellow(`⚠️  Timeout detected. Reducing batch size: ${oldSize} → ${this.currentBatchSize}`)
          );
        }
      }

      offset += limit;
    }

    // Finish progress tracking
    this.progressTracker.finish();

    // Clear cancelation state (successful completion)
    await this.cancelHandler.clearState();

    // Cleanup
    this.cancelHandler.dispose();

    return {
      projects,
      succeeded: this.progressTracker.getSummary().succeeded,
      failed: this.progressTracker.getSummary().failed,
      skipped: this.progressTracker.getSummary().skipped,
      errors
    };
  }

  /**
   * Fetch single batch with pagination
   *
   * @param offset - Starting offset
   * @param limit - Number of projects to fetch
   * @returns Array of projects
   */
  async fetchBatch(offset: number, limit: number): Promise<Project[]> {
    if (this.provider === 'jira') {
      return this.fetchJiraBatch(offset, limit);
    } else if (this.provider === 'ado') {
      return this.fetchAdoBatch(offset, limit);
    } else {
      throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Fetch JIRA batch with pagination
   */
  private async fetchJiraBatch(offset: number, limit: number): Promise<Project[]> {
    const creds = this.credentials as JiraCredentials;
    const { domain, email, token, instanceType } = creds;

    const apiVersion = instanceType === 'cloud' ? '3' : '2';
    const endpoint = instanceType === 'cloud'
      ? `/rest/api/${apiVersion}/project/search?startAt=${offset}&maxResults=${limit}`
      : `/rest/api/${apiVersion}/project?startAt=${offset}&maxResults=${limit}`;

    const url = `https://${domain}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    // Check rate limit
    await this.checkRateLimit(response.headers);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No error body');
      throw new Error(
        `JIRA API error: ${response.status} ${response.statusText}. ${errorBody}`
      );
    }

    if (instanceType === 'cloud') {
      const data = (await response.json()) as { values: Project[] };
      return data.values;
    } else {
      // Server returns array directly
      return (await response.json()) as Project[];
    }
  }

  /**
   * Fetch Azure DevOps batch with pagination
   */
  private async fetchAdoBatch(offset: number, limit: number): Promise<Project[]> {
    const creds = this.credentials as AdoCredentials;
    const { organization, pat } = creds;

    const url = `https://dev.azure.com/${organization}/_apis/projects?$top=${limit}&$skip=${offset}&api-version=7.0`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No error body');
      throw new Error(
        `Azure DevOps API error: ${response.status} ${response.statusText}. ${errorBody}`
      );
    }

    const data = (await response.json()) as { value: Array<{ id: string; name: string }> };
    return data.value.map(p => ({
      id: p.id,
      key: p.name.toUpperCase().replace(/\s+/g, '-'),
      name: p.name
    }));
  }

  /**
   * Fetch batch with retry logic and exponential backoff
   */
  private async fetchBatchWithRetry(offset: number, limit: number): Promise<Project[]> {
    const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.fetchBatch(offset, limit);
      } catch (error: any) {
        lastError = error;

        // Don't retry on auth failures (4XX except 429)
        if (this.isAuthError(error) && !error.message.includes('429')) {
          throw error;
        }

        // Retry on network errors, 5XX, or 429 errors
        if (attempt < 2) {
          this.options.logger.log(
            chalk.yellow(`⚠️  Retry ${attempt + 1}/3 after ${delays[attempt]}ms... (${error.message})`)
          );
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
      }
    }

    throw lastError || new Error('Failed to fetch batch after 3 attempts');
  }

  /**
   * Check rate limit headers and throttle if needed
   */
  private async checkRateLimit(headers: Headers): Promise<void> {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (remaining && parseInt(remaining, 10) < 10) {
      const resetTime = reset ? parseInt(reset, 10) * 1000 : Date.now() + 60000;
      const waitMs = Math.max(0, resetTime - Date.now());
      const waitSec = Math.ceil(waitMs / 1000);

      this.options.logger.log(
        chalk.yellow(`⚠️  Rate limit threshold reached (${remaining} requests remaining). Pausing ${waitSec}s...`)
      );

      await new Promise(resolve => setTimeout(resolve, waitMs + 1000)); // Add 1s buffer
    }
  }

  /**
   * Save partial state on cancelation
   */
  private async savePartialState(
    projects: Project[],
    total: number,
    errors: FetchError[]
  ): Promise<void> {
    const summary = this.progressTracker!.getSummary();

    // Calculate remaining projects
    const completed = projects.length;
    const remaining: Array<{ key: string; name: string }> = [];

    // Note: We don't have the list of all projects here, so remaining will be empty
    // In a real implementation, this would be populated from the initial project list

    const state: CancelationState = {
      operation: `${this.provider}-import`,
      provider: this.provider,
      domain: 'credentials' in this.credentials ? (this.credentials as any).domain : undefined,
      timestamp: new Date().toISOString(),
      version: '1.0',
      total,
      completed,
      succeeded: summary.succeeded,
      failed: summary.failed,
      skipped: summary.skipped,
      remaining,
      errors
    };

    await this.cancelHandler!.saveState(state);
  }

  /**
   * Log error to file
   */
  private async logError(error: FetchError): Promise<void> {
    try {
      // Ensure log directory exists
      const logDir = path.dirname(this.options.errorLogFile);
      await fs.mkdir(logDir, { recursive: true });

      // Format log entry
      const logEntry = `[${error.timestamp}] ${error.projectKey}: ${error.error} (${error.suggestion})\n`;

      // Append to log file
      await fs.appendFile(this.options.errorLogFile, logEntry, 'utf-8');
    } catch (logError: any) {
      this.options.logger.error('Failed to write error log:', logError);
    }
  }

  /**
   * Get suggestion for error
   */
  private getSuggestion(error: any): string {
    const message = error.message || '';

    if (message.includes('401') || message.includes('403')) {
      return 'Check credentials and project permissions';
    }

    if (message.includes('404')) {
      return 'Project may have been deleted or archived';
    }

    if (message.includes('429')) {
      return 'Rate limit exceeded (throttling applied)';
    }

    if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
      return 'Network timeout (try again or reduce batch size)';
    }

    if (message.includes('5')) {
      return 'API server error (retrying with backoff)';
    }

    return 'Unknown error (check logs for details)';
  }

  /**
   * Check if error is auth-related (4XX)
   */
  private isAuthError(error: any): boolean {
    const message = error.message || '';
    return /\b40[0134]\b/.test(message);
  }

  /**
   * Check if error is timeout-related
   */
  private isTimeoutError(error: any): boolean {
    const message = error.message || '';
    const code = error.code || '';
    return message.includes('timeout') || code === 'ETIMEDOUT' || message.includes('ETIMEDOUT');
  }
}
