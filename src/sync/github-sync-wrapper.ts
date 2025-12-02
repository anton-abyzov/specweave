/**
 * GitHub Sync Wrapper
 *
 * Wraps GitHub sync operations with the SyncInterceptor for permission checks
 * and audit logging. This provides a consistent interface for all GitHub sync
 * operations while ensuring they go through the permission enforcement layer.
 *
 * Usage:
 * ```typescript
 * const wrapper = new GitHubSyncWrapper({
 *   client: GitHubClientV2.fromRepo(owner, repo),
 *   interceptor,
 *   logger
 * });
 *
 * // All operations now go through permission enforcement
 * const issue = await wrapper.createUserStoryIssue(params);
 * ```
 *
 * @module sync/github-sync-wrapper
 */

import { SyncInterceptor, InterceptorResult } from '../core/sync/sync-interceptor.js';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { GitHubIssue } from '../../plugins/specweave-github/lib/types.js';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * User story issue creation parameters
 */
export interface CreateUserStoryIssueParams {
  featureId: string;
  userStoryId: string;
  title: string;
  body: string;
  labels?: string[];
  milestone?: number | null;
}

/**
 * Wrapper options
 */
export interface GitHubSyncWrapperOptions {
  /**
   * GitHub client instance
   */
  client: GitHubClientV2;

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
 * GitHubSyncWrapper - Permission-enforced GitHub sync operations
 *
 * All GitHub sync operations pass through the SyncInterceptor which:
 * 1. Checks permissions before execution
 * 2. Logs all attempts (success, denied, error)
 * 3. Provides consistent error handling
 *
 * This wrapper does NOT modify the underlying GitHubClientV2 - it provides
 * a parallel interface that can be used when permission checking is needed.
 */
export class GitHubSyncWrapper {
  private readonly client: GitHubClientV2;
  private readonly interceptor: SyncInterceptor;
  private readonly logger: Logger;

  constructor(options: GitHubSyncWrapperOptions) {
    this.client = options.client;
    this.interceptor = options.interceptor;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Create a GitHub issue for a user story
   *
   * @param params - Issue creation parameters
   * @returns Wrapped operation result
   */
  async createUserStoryIssue(
    params: CreateUserStoryIssueParams
  ): Promise<WrappedOperationResult<GitHubIssue>> {
    const itemId = `${params.featureId}/${params.userStoryId}`;

    const result = await this.interceptor.intercept(
      'github',
      'upsert-internal',
      itemId,
      'internal',
      () =>
        this.client.createUserStoryIssue({
          featureId: params.featureId,
          userStoryId: params.userStoryId,
          title: params.title,
          body: params.body,
          labels: params.labels || [],
          milestone: params.milestone ?? undefined,
        })
    );

    return this.toWrappedResult(result);
  }

  /**
   * Create a generic epic/increment issue
   *
   * @param title - Issue title
   * @param body - Issue body
   * @param milestone - Optional milestone number or string
   * @param labels - Issue labels
   * @returns Wrapped operation result
   */
  async createEpicIssue(
    title: string,
    body: string,
    milestone?: number | string,
    labels: string[] = []
  ): Promise<WrappedOperationResult<GitHubIssue>> {
    // Extract item ID from title if possible
    const match = title.match(/\[([^\]]+)\]/);
    const itemId = match ? match[1] : 'unknown';

    const result = await this.interceptor.intercept(
      'github',
      'upsert-internal',
      itemId,
      'internal',
      () => this.client.createEpicIssue(title, body, milestone, labels)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Update a GitHub issue body
   *
   * @param issueNumber - Issue number
   * @param body - New issue body
   * @param origin - Item origin (internal or external)
   * @returns Wrapped operation result
   */
  async updateIssueBody(
    issueNumber: number,
    body: string,
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<void>> {
    const itemId = `issue-${issueNumber}`;
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'github',
      operation,
      itemId,
      origin,
      () => this.client.updateIssueBody(issueNumber, body)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Close a GitHub issue
   *
   * @param issueNumber - Issue number
   * @param comment - Optional closing comment
   * @returns Wrapped operation result
   */
  async closeIssue(
    issueNumber: number,
    comment?: string
  ): Promise<WrappedOperationResult<void>> {
    const itemId = `issue-${issueNumber}`;

    const result = await this.interceptor.interceptStatusUpdate(
      'github',
      itemId,
      () => this.client.closeIssue(issueNumber, comment)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Reopen a GitHub issue
   *
   * @param issueNumber - Issue number
   * @param comment - Optional reopening comment
   * @returns Wrapped operation result
   */
  async reopenIssue(
    issueNumber: number,
    comment?: string
  ): Promise<WrappedOperationResult<void>> {
    const itemId = `issue-${issueNumber}`;

    const result = await this.interceptor.interceptStatusUpdate(
      'github',
      itemId,
      () => this.client.reopenIssue(issueNumber, comment)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Add a comment to a GitHub issue
   *
   * @param issueNumber - Issue number
   * @param comment - Comment body
   * @param origin - Item origin
   * @returns Wrapped operation result
   */
  async addComment(
    issueNumber: number,
    comment: string,
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<void>> {
    const itemId = `issue-${issueNumber}`;
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'github',
      operation,
      itemId,
      origin,
      () => this.client.addComment(issueNumber, comment)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Add labels to a GitHub issue
   *
   * @param issueNumber - Issue number
   * @param labels - Labels to add
   * @returns Wrapped operation result
   */
  async addLabels(
    issueNumber: number,
    labels: string[]
  ): Promise<WrappedOperationResult<void>> {
    const itemId = `issue-${issueNumber}`;

    const result = await this.interceptor.interceptUpsert(
      'github',
      itemId,
      () => this.client.addLabels(issueNumber, labels)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Get a GitHub issue (read-only, always allowed)
   *
   * @param issueNumber - Issue number
   * @returns Wrapped operation result
   */
  async getIssue(issueNumber: number): Promise<WrappedOperationResult<GitHubIssue | null>> {
    const itemId = `issue-${issueNumber}`;

    const result = await this.interceptor.interceptRead(
      'github',
      itemId,
      () => this.client.getIssue(issueNumber)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Search for an issue by title (read-only, always allowed)
   *
   * @param title - Title to search for
   * @returns Wrapped operation result
   */
  async searchIssueByTitle(title: string): Promise<WrappedOperationResult<GitHubIssue | null>> {
    const result = await this.interceptor.interceptRead(
      'github',
      `search:${title}`,
      () => this.client.searchIssueByTitle(title)
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
    return this.interceptor.wouldAllow('github', operation, itemId);
  }

  /**
   * Get the underlying client for operations that don't need interception
   * (e.g., already-checked operations in bulk workflows)
   */
  getClient(): GitHubClientV2 {
    return this.client;
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

/**
 * Factory function to create GitHubSyncWrapper
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param interceptor - Sync interceptor
 * @param logger - Optional logger
 */
export function createGitHubSyncWrapper(
  owner: string,
  repo: string,
  interceptor: SyncInterceptor,
  logger?: Logger
): GitHubSyncWrapper {
  const client = GitHubClientV2.fromRepo(owner, repo);
  return new GitHubSyncWrapper({
    client,
    interceptor,
    logger,
  });
}
