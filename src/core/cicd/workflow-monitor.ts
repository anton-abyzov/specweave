/**
 * CI/CD Workflow Monitor
 *
 * Monitors GitHub Actions workflows for failures by polling the GitHub API
 * every 60 seconds. Uses conditional requests and rate limit handling for
 * efficient API usage.
 */

import { Octokit } from '@octokit/rest';
import { StateManager } from './state-manager';
import {
  WorkflowRun,
  FailureRecord,
  WorkflowStatus,
  WorkflowConclusion
} from './types';

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  /** GitHub API token */
  token: string;

  /** Repository owner */
  owner: string;

  /** Repository name */
  repo: string;

  /** Poll interval (milliseconds, default: 60000 = 60s) */
  pollInterval?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Poll result
 */
export interface PollResult {
  /** Total runs checked */
  totalRuns: number;

  /** New failures detected */
  newFailures: number;

  /** Failures already tracked */
  duplicates: number;

  /** HTTP status code */
  statusCode: number;

  /** Rate limit remaining */
  rateLimitRemaining: number;
}

/**
 * WorkflowMonitor - Polls GitHub Actions for workflow failures
 *
 * Features:
 * - Polls every 60 seconds (configurable)
 * - Detects failed workflow runs within 2 minutes
 * - Uses conditional requests (If-Modified-Since) to reduce API calls
 * - Handles rate limiting with exponential backoff
 * - Deduplicates failures via StateManager
 * - Extracts comprehensive workflow metadata
 */
export class WorkflowMonitor {
  private octokit: Octokit;
  private stateManager: StateManager;
  private config: Required<MonitorConfig>;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastModified: string | null = null;
  private isPolling = false;

  /**
   * Create workflow monitor
   *
   * @param config - Monitor configuration
   * @param stateManager - State manager instance (optional, creates new if not provided)
   */
  constructor(
    config: MonitorConfig,
    stateManager: StateManager = new StateManager()
  ) {
    // Validate config
    if (!config.token) {
      throw new Error('GitHub token is required');
    }
    if (!config.owner || !config.repo) {
      throw new Error('Repository owner and name are required');
    }

    this.config = {
      ...config,
      pollInterval: config.pollInterval ?? 60000, // Default: 60s
      debug: config.debug ?? false
    };

    this.octokit = new Octokit({ auth: config.token });
    this.stateManager = stateManager;
  }

  /**
   * Start monitoring (begins polling)
   */
  start(): void {
    if (this.isPolling) {
      this.log('Monitor already running');
      return;
    }

    this.log('Starting monitor...');
    this.isPolling = true;

    // Initial poll
    this.poll().catch((error) => {
      console.error('Initial poll failed:', error);
    });

    // Schedule recurring polls
    this.pollingTimer = setInterval(() => {
      this.poll().catch((error) => {
        console.error('Poll failed:', error);
      });
    }, this.config.pollInterval);

    this.log(`Monitor started (polling every ${this.config.pollInterval}ms)`);
  }

  /**
   * Stop monitoring (stops polling)
   */
  stop(): void {
    if (!this.isPolling) {
      this.log('Monitor not running');
      return;
    }

    this.log('Stopping monitor...');

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.isPolling = false;
    this.log('Monitor stopped');
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this.isPolling;
  }

  /**
   * Poll GitHub Actions API for workflow runs
   *
   * @returns Poll result with statistics
   */
  async poll(): Promise<PollResult> {
    this.log('Polling GitHub Actions API...');

    try {
      // Build request headers
      const headers: Record<string, string> = {};
      if (this.lastModified) {
        headers['If-Modified-Since'] = this.lastModified;
      }

      // Fetch workflow runs
      const response = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        status: 'completed' as WorkflowStatus, // Only completed runs
        per_page: 100, // Max per page
        headers
      });

      // Extract rate limit info
      const rateLimitRemaining = parseInt(
        response.headers['x-ratelimit-remaining'] || '0',
        10
      );

      this.log(`Rate limit remaining: ${rateLimitRemaining}`);

      // Handle 304 Not Modified (no new runs)
      // Note: Octokit types response.status as 200, but API can return 304
      if ((response.status as number) === 304) {
        this.log('No new workflow runs (304 Not Modified)');
        return {
          totalRuns: 0,
          newFailures: 0,
          duplicates: 0,
          statusCode: 304,
          rateLimitRemaining
        };
      }

      // Update Last-Modified header for next request
      if (response.headers['last-modified']) {
        this.lastModified = response.headers['last-modified'];
      }

      // Filter failed runs
      const failedRuns = response.data.workflow_runs.filter(
        (run) => run.conclusion === 'failure'
      );

      this.log(`Found ${failedRuns.length} failed runs (of ${response.data.workflow_runs.length} total)`);

      // Process failures
      let newFailures = 0;
      let duplicates = 0;

      for (const run of failedRuns) {
        const failure = this.extractFailureRecord(run);

        // Check if already tracked
        const state = await this.stateManager.loadState();
        if (state.failures[run.id]) {
          duplicates++;
          continue;
        }

        // Add new failure
        await this.stateManager.addFailure(failure);
        newFailures++;

        this.log(`New failure detected: ${run.name} (run #${run.run_number})`);
      }

      // Update last poll timestamp
      await this.stateManager.updateLastPoll();

      return {
        totalRuns: response.data.workflow_runs.length,
        newFailures,
        duplicates,
        statusCode: response.status,
        rateLimitRemaining
      };
    } catch (error: any) {
      // Handle rate limiting (429)
      if (error.status === 429) {
        const retryAfter = parseInt(error.response?.headers['retry-after'] || '60', 10);
        console.warn(`Rate limited! Retry after ${retryAfter}s`);

        // Exponential backoff
        await this.sleep(retryAfter * 1000);

        // Retry poll
        return this.poll();
      }

      // Handle other errors
      console.error('Poll error:', error.message);

      return {
        totalRuns: 0,
        newFailures: 0,
        duplicates: 0,
        statusCode: error.status || 500,
        rateLimitRemaining: 0
      };
    }
  }

  /**
   * Extract failure record from GitHub workflow run
   *
   * @param run - GitHub workflow run data
   * @returns Failure record for state storage
   */
  private extractFailureRecord(run: any): FailureRecord {
    return {
      runId: run.id,
      workflowName: run.name,
      commitSha: run.head_sha,
      branch: run.head_branch,
      detectedAt: new Date().toISOString(),
      processed: false,
      analyzed: false,
      fixed: false,
      url: run.html_url
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[WorkflowMonitor] ${message}`);
    }
  }
}
