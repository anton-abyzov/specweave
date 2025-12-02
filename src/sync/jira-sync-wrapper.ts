/**
 * JIRA Sync Wrapper
 *
 * Wraps JIRA sync operations with the SyncInterceptor for permission checks
 * and audit logging. This provides a consistent interface for all JIRA sync
 * operations while ensuring they go through the permission enforcement layer.
 *
 * Usage:
 * ```typescript
 * const wrapper = new JiraSyncWrapper({
 *   client: new JiraClient({ baseUrl, credentials }),
 *   projectKey: 'PROJ',
 *   interceptor,
 *   logger
 * });
 *
 * // All operations now go through permission enforcement
 * const issue = await wrapper.createIssue(params);
 * ```
 *
 * @module sync/jira-sync-wrapper
 */

import { SyncInterceptor, InterceptorResult } from '../core/sync/sync-interceptor.js';
import { JiraClient, JiraIssue, JiraIssueCreate, JiraIssueUpdate } from '../integrations/jira/jira-client.js';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * Wrapper options
 */
export interface JiraSyncWrapperOptions {
  /**
   * JIRA client instance
   */
  client: JiraClient;

  /**
   * Default project key for operations
   */
  projectKey: string;

  /**
   * Sync interceptor for permission checking
   */
  interceptor: SyncInterceptor;

  /**
   * Logger instance
   */
  logger?: Logger;
}

/**
 * Operation result with additional metadata
 */
export interface WrappedOperationResult<T> {
  /**
   * Whether the operation was allowed and succeeded
   */
  success: boolean;

  /**
   * The result of the operation (null if denied or failed)
   */
  result: T | null;

  /**
   * Reason for denial (if denied)
   */
  denialReason?: string;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Duration of the operation in milliseconds
   */
  durationMs: number;
}

/**
 * JiraSyncWrapper - Permission-enforced JIRA sync operations
 *
 * All JIRA sync operations pass through the SyncInterceptor which:
 * 1. Checks permissions before execution
 * 2. Logs all attempts (success, denied, error)
 * 3. Provides consistent error handling
 */
export class JiraSyncWrapper {
  private readonly client: JiraClient;
  private readonly projectKey: string;
  private readonly interceptor: SyncInterceptor;
  private readonly logger: Logger;

  constructor(options: JiraSyncWrapperOptions) {
    this.client = options.client;
    this.projectKey = options.projectKey;
    this.interceptor = options.interceptor;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Create a JIRA issue
   *
   * @param issue - Issue creation parameters
   * @param origin - Item origin (internal or external)
   * @returns Wrapped operation result
   */
  async createIssue(
    issue: JiraIssueCreate,
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<JiraIssue>> {
    const itemId = `${this.projectKey}:${issue.summary.substring(0, 50)}`;
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'jira',
      operation,
      itemId,
      origin,
      () => this.client.createIssue(issue, this.projectKey)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Update a JIRA issue
   *
   * @param update - Issue update parameters
   * @param origin - Item origin (internal or external)
   * @returns Wrapped operation result
   */
  async updateIssue(
    update: JiraIssueUpdate,
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<JiraIssue>> {
    const itemId = update.key;
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'jira',
      operation,
      itemId,
      origin,
      () => this.client.updateIssue(update)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Update issue status (transition)
   *
   * @param issueKey - JIRA issue key
   * @param targetStatus - Target status name
   * @returns Wrapped operation result
   */
  async updateStatus(
    issueKey: string,
    targetStatus: string
  ): Promise<WrappedOperationResult<JiraIssue>> {
    const result = await this.interceptor.interceptStatusUpdate(
      'jira',
      issueKey,
      async () => {
        // Update status via updateIssue which handles transitions
        const updatedIssue = await this.client.updateIssue({
          key: issueKey,
          status: targetStatus,
        });
        return updatedIssue;
      }
    );

    return this.toWrappedResult(result);
  }

  /**
   * Get a JIRA issue (read-only, always allowed)
   *
   * @param issueKey - JIRA issue key
   * @returns Wrapped operation result
   */
  async getIssue(issueKey: string): Promise<WrappedOperationResult<JiraIssue>> {
    const result = await this.interceptor.interceptRead(
      'jira',
      issueKey,
      () => this.client.getIssue(issueKey)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Search issues with JQL filter (read-only, always allowed)
   *
   * @param jql - JQL query string
   * @param maxResults - Maximum results to return
   * @returns Wrapped operation result
   */
  async searchIssues(
    jql: string,
    maxResults: number = 50
  ): Promise<WrappedOperationResult<JiraIssue[]>> {
    const result = await this.interceptor.interceptRead(
      'jira',
      `jql:${jql.substring(0, 50)}`,
      () => this.client.searchIssues({ jql, maxResults })
    );

    return this.toWrappedResult(result);
  }

  /**
   * Add labels to a JIRA issue
   *
   * @param issueKey - JIRA issue key
   * @param labels - Labels to add
   * @param origin - Item origin
   * @returns Wrapped operation result
   */
  async addLabels(
    issueKey: string,
    labels: string[],
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<JiraIssue>> {
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'jira',
      operation,
      issueKey,
      origin,
      async () => {
        // Get current labels and merge
        const currentIssue = await this.client.getIssue(issueKey);
        const currentLabels = currentIssue.fields.labels || [];
        const mergedLabels = [...new Set([...currentLabels, ...labels])];

        return this.client.updateIssue({
          key: issueKey,
          labels: mergedLabels,
        });
      }
    );

    return this.toWrappedResult(result);
  }

  /**
   * Check if an operation would be allowed (pre-flight check)
   *
   * @param operation - Operation type
   * @param itemId - Item ID
   * @returns true if operation would be allowed
   */
  wouldAllow(
    operation: 'upsert-internal' | 'upsert-external' | 'update-status' | 'read',
    itemId: string
  ): boolean {
    return this.interceptor.wouldAllow('jira', operation, itemId);
  }

  /**
   * Get the underlying client for operations that don't need interception
   */
  getClient(): JiraClient {
    return this.client;
  }

  /**
   * Get the project key
   */
  getProjectKey(): string {
    return this.projectKey;
  }

  /**
   * Convert interceptor result to wrapped result
   */
  private toWrappedResult<T>(result: InterceptorResult<T>): WrappedOperationResult<T> {
    if (!result.allowed) {
      return {
        success: false,
        result: null,
        denialReason: result.permission.reason,
        durationMs: result.durationMs,
      };
    }

    if (result.error) {
      return {
        success: false,
        result: null,
        error: result.error.message,
        durationMs: result.durationMs,
      };
    }

    return {
      success: true,
      result: result.result,
      durationMs: result.durationMs,
    };
  }
}
