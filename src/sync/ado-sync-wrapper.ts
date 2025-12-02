/**
 * Azure DevOps Sync Wrapper
 *
 * Wraps Azure DevOps sync operations with the SyncInterceptor for permission checks
 * and audit logging. This provides a consistent interface for all ADO sync
 * operations while ensuring they go through the permission enforcement layer.
 *
 * Usage:
 * ```typescript
 * const wrapper = new AdoSyncWrapper({
 *   client: new AdoClient(),
 *   interceptor,
 *   logger
 * });
 *
 * // All operations now go through permission enforcement
 * const workItem = await wrapper.createWorkItem(params);
 * ```
 *
 * @module sync/ado-sync-wrapper
 */

import { SyncInterceptor, InterceptorResult } from '../core/sync/sync-interceptor.js';
import {
  AdoClient,
  AdoWorkItem,
  AdoWorkItemCreate,
  AdoWorkItemUpdate,
  AdoWorkItemFilter,
} from '../integrations/ado/ado-client.js';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * Wrapper options
 */
export interface AdoSyncWrapperOptions {
  /**
   * Azure DevOps client instance
   */
  client: AdoClient;

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
 * AdoSyncWrapper - Permission-enforced Azure DevOps sync operations
 *
 * All Azure DevOps sync operations pass through the SyncInterceptor which:
 * 1. Checks permissions before execution
 * 2. Logs all attempts (success, denied, error)
 * 3. Provides consistent error handling
 */
export class AdoSyncWrapper {
  private readonly client: AdoClient;
  private readonly interceptor: SyncInterceptor;
  private readonly logger: Logger;

  constructor(options: AdoSyncWrapperOptions) {
    this.client = options.client;
    this.interceptor = options.interceptor;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Create an Azure DevOps work item
   *
   * @param item - Work item creation parameters
   * @param origin - Item origin (internal or external)
   * @returns Wrapped operation result
   */
  async createWorkItem(
    item: AdoWorkItemCreate,
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<AdoWorkItem>> {
    const itemId = `${item.workItemType}:${item.title.substring(0, 50)}`;
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'ado',
      operation,
      itemId,
      origin,
      () => this.client.createWorkItem(item)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Update an Azure DevOps work item
   *
   * @param update - Work item update parameters
   * @param origin - Item origin (internal or external)
   * @returns Wrapped operation result
   */
  async updateWorkItem(
    update: AdoWorkItemUpdate,
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<AdoWorkItem>> {
    const itemId = `WI-${update.id}`;
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'ado',
      operation,
      itemId,
      origin,
      () => this.client.updateWorkItem(update)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Update work item state (status)
   *
   * @param workItemId - Work item ID
   * @param newState - Target state (e.g., 'Active', 'Resolved', 'Closed')
   * @returns Wrapped operation result
   */
  async updateState(
    workItemId: number,
    newState: string
  ): Promise<WrappedOperationResult<AdoWorkItem>> {
    const itemId = `WI-${workItemId}`;

    const result = await this.interceptor.interceptStatusUpdate(
      'ado',
      itemId,
      () =>
        this.client.updateWorkItem({
          id: workItemId,
          state: newState,
        })
    );

    return this.toWrappedResult(result);
  }

  /**
   * List work items with filter (read-only, always allowed)
   *
   * @param filter - Work item filter
   * @returns Wrapped operation result
   */
  async listWorkItems(
    filter: AdoWorkItemFilter = {}
  ): Promise<WrappedOperationResult<AdoWorkItem[]>> {
    const result = await this.interceptor.interceptRead(
      'ado',
      'list-work-items',
      () => this.client.listWorkItems(filter)
    );

    return this.toWrappedResult(result);
  }

  /**
   * Add tags to a work item
   *
   * @param workItemId - Work item ID
   * @param tags - Tags to add
   * @param origin - Item origin
   * @returns Wrapped operation result
   */
  async addTags(
    workItemId: number,
    tags: string[],
    origin: 'internal' | 'external' = 'internal'
  ): Promise<WrappedOperationResult<AdoWorkItem>> {
    const itemId = `WI-${workItemId}`;
    const operation = origin === 'external' ? 'upsert-external' : 'upsert-internal';

    const result = await this.interceptor.intercept(
      'ado',
      operation,
      itemId,
      origin,
      () =>
        this.client.updateWorkItem({
          id: workItemId,
          tags,
        })
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
    return this.interceptor.wouldAllow('ado', operation, itemId);
  }

  /**
   * Get the underlying client for operations that don't need interception
   */
  getClient(): AdoClient {
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
