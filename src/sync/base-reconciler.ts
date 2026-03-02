/**
 * Base Reconciler - Abstract base class for external tool reconciliation
 *
 * Provides common logic for reconciling external tool states (GitHub, JIRA, ADO)
 * with increment metadata.json statuses.
 *
 * Part of increment 0168: Code Review Fixes
 *
 * @module sync/base-reconciler
 * @since v0.34.0
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * Common options for all reconcilers
 */
export interface BaseReconcileOptions {
  projectRoot: string;
  dryRun?: boolean;
  logger?: Logger;
}

/**
 * Base increment state interface - extended by each reconciler
 */
export interface BaseIncrementState {
  incrementId: string;
  incrementPath: string;
  metadataStatus: string;
  featureId?: string;
}

/**
 * Base reconcile result interface - extended by each reconciler
 */
export interface BaseReconcileResult {
  scanned: number;
  mismatches: number;
  closed: number;
  reopened: number;
  errors: string[];
}

/**
 * Abstract base class for reconcilers
 *
 * Implements the template method pattern for reconciliation:
 * 1. Check if sync is enabled
 * 2. Initialize client/credentials
 * 3. Scan increments
 * 4. Reconcile each increment
 * 5. Print summary
 */
export abstract class BaseReconciler<
  TState extends BaseIncrementState,
  TResult extends BaseReconcileResult
> {
  protected projectRoot: string;
  protected dryRun: boolean;
  protected logger: Logger;

  constructor(options: BaseReconcileOptions) {
    this.projectRoot = options.projectRoot;
    this.dryRun = options.dryRun ?? false;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Main reconciliation entry point (template method)
   */
  async reconcile(): Promise<TResult> {
    const result = this.createEmptyResult();

    try {
      // 1. Check if sync is enabled
      const config = await this.loadConfig();
      if (!this.isSyncEnabled(config)) {
        this.logSyncDisabled();
        return result;
      }

      // 2. Initialize client/credentials
      const initSuccess = await this.initializeClient();
      if (!initSuccess) {
        result.errors.push(this.getInitializationErrorMessage());
        this.logger.error(`❌ ${this.getInitializationErrorMessage()}`);
        return result;
      }

      // 3. Scan all non-archived increments
      const increments = await this.scanIncrements();
      result.scanned = increments.length;

      this.logger.log(`\n📊 Scanning ${increments.length} increment(s) for ${this.getToolName()} state drift...\n`);

      // 4. Check and fix each increment
      for (const inc of increments) {
        await this.reconcileIncrement(inc, result);
      }

      // 5. Report summary
      this.printSummary(result);

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Reconciliation error: ${message}`);
      this.logger.error('❌ Reconciliation failed:', message);
      return result;
    }
  }

  /**
   * Reconcile a single increment
   */
  protected async reconcileIncrement(
    inc: TState,
    result: TResult
  ): Promise<void> {
    const status = inc.metadataStatus;

    // Determine expected external state based on metadata status
    const shouldBeClosed = status === 'completed' || status === 'abandoned';
    const shouldBeOpen =
      status === 'active' ||
      status === 'planning' ||
      status === 'backlog' ||
      status === 'ready_for_review' ||
      status === 'paused';

    if (!shouldBeClosed && !shouldBeOpen) {
      this.logger.log(`  ⚠️ Unknown increment status '${status}' for ${inc.incrementId} — skipping`);
      return;
    }

    // Delegate to subclass for platform-specific reconciliation
    await this.reconcileIncrementItems(inc, shouldBeClosed, shouldBeOpen, status, result);
  }

  /**
   * Scan increments directory including archived/abandoned increments.
   * All increments with external links are included so the reconciler can
   * close issues for completed/abandoned increments that were moved to _archive.
   */
  protected async scanIncrements(): Promise<TState[]> {
    const incrementsPath = path.join(this.projectRoot, '.specweave', 'increments');
    const results: TState[] = [];

    if (!existsSync(incrementsPath)) {
      return results;
    }

    // Scan active increments + archive + abandoned subdirectories
    const dirsToScan = [incrementsPath];
    for (const sub of ['_archive', '_abandoned']) {
      const subPath = path.join(incrementsPath, sub);
      if (existsSync(subPath)) dirsToScan.push(subPath);
    }

    for (const dir of dirsToScan) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

        const incrementPath = path.join(dir, entry.name);
        const metadataPath = path.join(incrementPath, 'metadata.json');

        if (!existsSync(metadataPath)) continue;

        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const metadata = JSON.parse(metadataContent);

          // Delegate to subclass to extract platform-specific state
          const state = await this.extractIncrementState(entry.name, incrementPath, metadata);
          if (state) {
            results.push(state);
          }
        } catch {
          // Skip invalid metadata
          this.logger.log(`  ⚠️  Skipping ${entry.name}: Invalid metadata.json`);
        }
      }
    }

    return results;
  }

  /**
   * Load config.json
   */
  protected async loadConfig(): Promise<Record<string, unknown>> {
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Print reconciliation summary
   */
  protected printSummary(result: TResult): void {
    const toolName = this.getToolName().toUpperCase();
    this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`📊 ${toolName} RECONCILIATION SUMMARY`);
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`   Increments scanned: ${result.scanned}`);
    this.logger.log(`   Mismatches found:   ${result.mismatches}`);
    this.logger.log(`   ${this.getClosedLabel()}:      ${result.closed}`);
    this.logger.log(`   ${this.getReopenedLabel()}:    ${result.reopened}`);
    this.logger.log(`   Errors:             ${result.errors.length}`);
    if (this.dryRun) {
      this.logger.log('\n   ⚠️  DRY RUN - No changes were made');
    }
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  // =========================================================================
  // Abstract methods to be implemented by subclasses
  // =========================================================================

  /**
   * Get the external tool name (e.g., "GitHub", "JIRA", "ADO")
   */
  protected abstract getToolName(): string;

  /**
   * Get the label for closed items (e.g., "Issues closed", "Work items closed")
   */
  protected abstract getClosedLabel(): string;

  /**
   * Get the label for reopened items
   */
  protected abstract getReopenedLabel(): string;

  /**
   * Create an empty result object
   */
  protected abstract createEmptyResult(): TResult;

  /**
   * Check if sync is enabled in config
   */
  protected abstract isSyncEnabled(config: Record<string, unknown>): boolean;

  /**
   * Log that sync is disabled
   */
  protected abstract logSyncDisabled(): void;

  /**
   * Initialize client/credentials
   * @returns true if successful, false otherwise
   */
  protected abstract initializeClient(): Promise<boolean>;

  /**
   * Get the error message for initialization failure
   */
  protected abstract getInitializationErrorMessage(): string;

  /**
   * Extract platform-specific increment state from metadata
   * @returns null if increment has no external links
   */
  protected abstract extractIncrementState(
    incrementId: string,
    incrementPath: string,
    metadata: Record<string, unknown>
  ): Promise<TState | null>;

  /**
   * Reconcile platform-specific items for an increment
   */
  protected abstract reconcileIncrementItems(
    inc: TState,
    shouldBeClosed: boolean,
    shouldBeOpen: boolean,
    metadataStatus: string,
    result: TResult
  ): Promise<void>;
}
