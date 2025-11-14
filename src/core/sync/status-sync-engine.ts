/**
 * Status Sync Engine
 *
 * Core orchestration logic for status synchronization between SpecWeave
 * increments and external tools (GitHub, JIRA, Azure DevOps).
 *
 * Responsibilities:
 * - Orchestrate bidirectional status sync
 * - Detect and resolve conflicts
 * - Map statuses between SpecWeave and external tools
 * - Respect user preferences (autoSync, promptUser, conflictResolution)
 */

import { StatusMapper, StatusMappingConfig, ExternalTool, SpecWeaveStatus } from './status-mapper';
import { ConflictResolver, StatusConflict, ConflictResolution, ConflictResolutionStrategy } from './conflict-resolver';

export type SyncDirection = 'to-external' | 'from-external' | 'bidirectional';

export type SyncAction =
  | 'no-sync-needed'
  | 'sync-to-external'
  | 'sync-from-external';

export interface SyncInput {
  incrementId: string;
  tool: ExternalTool;
  localStatus: SpecWeaveStatus;
  remoteStatus: string; // Can be SpecWeave status OR external tool status
  localTimestamp: string;
  remoteTimestamp: string;
}

export interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  action: SyncAction;
  conflict: StatusConflict | null;
  resolution: ConflictResolution | null;
  externalMapping: StatusMappingConfig | null;
  error?: string;
  wasAutomatic?: boolean; // True if sync was automatic (no user prompt)
  wasPrompted?: boolean; // True if user was prompted
}

export interface StatusSyncConfig {
  sync: {
    statusSync: {
      enabled: boolean;
      autoSync?: boolean;
      promptUser?: boolean;
      conflictResolution?: ConflictResolutionStrategy;
      mappings: {
        github?: any;
        jira?: any;
        ado?: any;
      };
    };
  };
}

/**
 * Bulk sync input (multiple increments)
 */
export type BulkSyncInput = SyncInput;

/**
 * Bulk sync options
 */
export interface BulkSyncOptions {
  batchSize?: number; // Default: 5
  delayMs?: number; // Delay between batches (default: 1000ms)
}

/**
 * Individual sync result with increment ID
 */
export interface BulkSyncItemResult extends SyncResult {
  incrementId: string;
}

/**
 * Bulk sync result
 */
export interface BulkSyncResult {
  totalItems: number;
  successCount: number;
  failureCount: number;
  results: BulkSyncItemResult[];
  duration: string; // e.g., "1234ms"
}

export class StatusSyncEngine {
  private mapper: StatusMapper;
  private resolver: ConflictResolver;
  private config: StatusSyncConfig;

  constructor(config: StatusSyncConfig) {
    this.config = config;
    this.mapper = new StatusMapper(config as any);
    this.resolver = new ConflictResolver();
  }

  /**
   * Sync SpecWeave status to external tool (one-way: SpecWeave → External)
   *
   * @param input - Sync input with local/remote statuses
   * @returns Sync result with conflict resolution details
   */
  public async syncToExternal(input: SyncInput): Promise<SyncResult> {
    this.validateSyncEnabled();

    const result: SyncResult = {
      success: false,
      direction: 'to-external',
      action: 'no-sync-needed',
      conflict: null,
      resolution: null,
      externalMapping: null
    };

    try {
      // Detect conflict
      const conflict = await this.resolver.detect({
        incrementId: input.incrementId,
        local: input.localStatus,
        remote: input.remoteStatus,
        tool: input.tool,
        localTimestamp: input.localTimestamp,
        remoteTimestamp: input.remoteTimestamp
      });

      result.conflict = conflict;

      // No conflict - statuses already match
      if (!conflict) {
        result.success = true;
        result.action = 'no-sync-needed';
        return result;
      }

      // Resolve conflict
      const strategy = this.config.sync.statusSync.conflictResolution || 'last-write-wins';
      const resolution = await this.resolver.resolve(conflict, strategy);
      result.resolution = resolution;

      // Determine action based on resolution
      if (resolution.action === 'use-local') {
        result.action = 'sync-to-external';
        result.externalMapping = this.mapper.mapToExternal(input.localStatus, input.tool);
      } else {
        // Resolution says use-remote, but we're syncing TO external
        // This means external is already correct, no sync needed
        result.action = 'no-sync-needed';
      }

      result.success = true;
      return result;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Sync external status to SpecWeave (one-way: External → SpecWeave)
   *
   * @param input - Sync input with local/remote statuses
   * @returns Sync result with conflict resolution details
   */
  public async syncFromExternal(input: SyncInput): Promise<SyncResult> {
    this.validateSyncEnabled();

    const result: SyncResult = {
      success: false,
      direction: 'from-external',
      action: 'no-sync-needed',
      conflict: null,
      resolution: null,
      externalMapping: null
    };

    try {
      // Detect conflict
      const conflict = await this.resolver.detect({
        incrementId: input.incrementId,
        local: input.localStatus,
        remote: input.remoteStatus,
        tool: input.tool,
        localTimestamp: input.localTimestamp,
        remoteTimestamp: input.remoteTimestamp
      });

      result.conflict = conflict;

      // No conflict - statuses already match
      if (!conflict) {
        result.success = true;
        result.action = 'no-sync-needed';
        return result;
      }

      // Resolve conflict
      const strategy = this.config.sync.statusSync.conflictResolution || 'last-write-wins';
      const resolution = await this.resolver.resolve(conflict, strategy);
      result.resolution = resolution;

      // Determine action based on resolution
      if (resolution.action === 'use-remote') {
        result.action = 'sync-from-external';
      } else {
        // Resolution says use-local, but we're syncing FROM external
        // This means local is already correct, no sync needed
        result.action = 'no-sync-needed';
      }

      result.success = true;
      return result;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Bidirectional sync (SpecWeave ↔ External)
   *
   * Detects conflict and resolves based on strategy.
   * Syncs in the direction indicated by resolution.
   *
   * @param input - Sync input with local/remote statuses
   * @returns Sync result with conflict resolution details
   */
  public async bidirectionalSync(input: SyncInput): Promise<SyncResult> {
    this.validateSyncEnabled();

    const result: SyncResult = {
      success: false,
      direction: 'bidirectional',
      action: 'no-sync-needed',
      conflict: null,
      resolution: null,
      externalMapping: null
    };

    try {
      // Detect conflict
      const conflict = await this.resolver.detect({
        incrementId: input.incrementId,
        local: input.localStatus,
        remote: input.remoteStatus,
        tool: input.tool,
        localTimestamp: input.localTimestamp,
        remoteTimestamp: input.remoteTimestamp
      });

      result.conflict = conflict;

      // No conflict - statuses already match
      if (!conflict) {
        result.success = true;
        result.action = 'no-sync-needed';
        return result;
      }

      // Resolve conflict
      const strategy = this.config.sync.statusSync.conflictResolution || 'last-write-wins';
      const resolution = await this.resolver.resolve(conflict, strategy);
      result.resolution = resolution;

      // Determine action based on resolution
      if (resolution.action === 'use-local') {
        result.action = 'sync-to-external';
        result.externalMapping = this.mapper.mapToExternal(input.localStatus, input.tool);
      } else {
        result.action = 'sync-from-external';
      }

      result.success = true;
      return result;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Bulk sync multiple increments to external tools
   *
   * Batches requests to avoid rate limiting.
   * Adds delays between batches.
   * Returns aggregate results with success/failure counts.
   *
   * @param inputs - Array of sync inputs
   * @param options - Bulk sync options (batch size, delay)
   * @returns Bulk sync result
   */
  public async bulkSyncToExternal(
    inputs: BulkSyncInput[],
    options?: BulkSyncOptions
  ): Promise<BulkSyncResult> {
    const startTime = Date.now();
    const batchSize = options?.batchSize || 5;
    const delayMs = options?.delayMs || 1000;

    const results: BulkSyncItemResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Calculate batches
    const batches = this.calculateBatches(inputs, batchSize);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Process all items in batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(input => this.syncToExternal(input))
      );

      // Collect results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const input = batch[j];

        if (result.status === 'fulfilled') {
          results.push({
            ...result.value,
            incrementId: input.incrementId
          });
          if (result.value.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          // Rejection
          results.push({
            incrementId: input.incrementId,
            success: false,
            direction: 'to-external',
            action: 'no-sync-needed',
            conflict: null,
            resolution: null,
            externalMapping: null,
            error: result.reason.message || 'Unknown error'
          });
          failureCount++;
        }
      }

      // Add delay between batches (except after last batch)
      if (i < batches.length - 1) {
        await this.delay(delayMs);
      }
    }

    const duration = `${Date.now() - startTime}ms`;

    return {
      totalItems: inputs.length,
      successCount,
      failureCount,
      results,
      duration
    };
  }

  /**
   * Check if auto-sync is enabled
   *
   * @returns True if auto-sync is enabled
   */
  public isAutoSyncEnabled(): boolean {
    return this.config.sync.statusSync.autoSync === true;
  }

  /**
   * Check if user should be prompted
   *
   * @returns True if user should be prompted (default: true)
   */
  public shouldPromptUser(): boolean {
    // Default to true if not specified
    return this.config.sync.statusSync.promptUser !== false;
  }

  /**
   * Execute automatic sync without prompting
   *
   * Validates that auto-sync is enabled.
   * Handles errors gracefully (doesn't throw, returns error in result).
   *
   * @param input - Sync input
   * @returns Sync result with wasAutomatic flag
   */
  public async executeAutoSync(input: SyncInput): Promise<SyncResult> {
    // Validate auto-sync is enabled
    if (!this.isAutoSyncEnabled()) {
      throw new Error('Auto-sync is disabled');
    }

    try {
      const result = await this.syncToExternal(input);
      return {
        ...result,
        wasAutomatic: true,
        wasPrompted: false
      };
    } catch (error) {
      // Handle errors gracefully - return error in result
      // Don't throw to avoid blocking increment completion
      return {
        success: false,
        direction: 'to-external',
        action: 'no-sync-needed',
        conflict: null,
        resolution: null,
        externalMapping: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        wasAutomatic: true,
        wasPrompted: false
      };
    }
  }

  /**
   * Calculate batches from input array
   *
   * @param inputs - Array of inputs
   * @param batchSize - Size of each batch
   * @returns Array of batches
   */
  private calculateBatches<T>(inputs: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < inputs.length; i += batchSize) {
      batches.push(inputs.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay execution for specified milliseconds
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate that status synchronization is enabled
   *
   * @throws Error if sync is disabled
   */
  private validateSyncEnabled(): void {
    if (!this.config.sync.statusSync.enabled) {
      throw new Error('Status synchronization is disabled');
    }
  }
}
