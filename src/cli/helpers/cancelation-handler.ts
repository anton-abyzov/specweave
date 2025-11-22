/**
 * Cancelation Handler
 *
 * Graceful Ctrl+C handling with state persistence and resume capability.
 * Atomic file writes ensure state integrity even during abrupt termination.
 *
 * @module cli/helpers/cancelation-handler
 */

import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Cancelation handler options
 */
export interface CancelationOptions {
  stateFile: string; // Path to state file (e.g., .specweave/cache/import-state.json)
  logger?: Logger;
}

/**
 * Cancelation state (persisted to disk)
 */
export interface CancelationState {
  operation: string; // e.g., "jira-import"
  provider: string; // e.g., "jira", "ado"
  domain?: string; // e.g., "example.atlassian.net"
  timestamp: string; // ISO 8601 timestamp
  version: string; // State version (for compatibility)
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  remaining: Array<{ key: string; name: string }>; // Projects not yet imported
  errors: Array<{ projectKey: string; error: string; timestamp: string }>;
}

/**
 * Cancelation Handler
 *
 * Handles SIGINT (Ctrl+C) signals during long-running operations:
 * - Registers signal handler
 * - Saves partial state to disk (atomic writes)
 * - Provides resume capability
 * - TTL validation (24-hour expiration)
 *
 * @example
 * ```typescript
 * const handler = new CancelationHandler({
 *   stateFile: '.specweave/cache/import-state.json'
 * });
 *
 * handler.onCleanup(async () => {
 *   await savePartialState(projects, total, errors);
 * });
 *
 * for (const project of projects) {
 *   if (handler.shouldCancel()) {
 *     break; // Exit gracefully
 *   }
 *   // ... process project ...
 * }
 * ```
 */
export class CancelationHandler {
  private stateFile: string;
  private logger: Logger;

  private canceled = false;
  private cleanupCallback: (() => Promise<void>) | null = null;
  private sigintHandler: NodeJS.SignalsListener | null = null;
  private ctrlCCount = 0; // Track consecutive Ctrl+C presses

  constructor(options: CancelationOptions) {
    this.stateFile = options.stateFile;
    this.logger = options.logger ?? consoleLogger;

    // Register SIGINT handler
    this.registerSigintHandler();
  }

  /**
   * Register SIGINT (Ctrl+C) handler
   */
  private registerSigintHandler(): void {
    this.sigintHandler = async (signal: NodeJS.Signals) => {
      this.ctrlCCount++;

      // Double Ctrl+C: force exit immediately (no cleanup)
      if (this.ctrlCCount > 1) {
        this.logger.log(chalk.red('\n⚠️  Force exit (no state saved)'));
        process.exit(1);
      }

      // First Ctrl+C: graceful cancelation
      this.canceled = true;
      this.logger.log(chalk.yellow('\n⚠️  Cancelation requested. Saving progress...'));

      // Execute cleanup callback if registered
      if (this.cleanupCallback) {
        try {
          await this.cleanupCallback();
        } catch (error: any) {
          this.logger.error('Error during cleanup:', error);
        }
      }

      // Note: Don't exit here - let the main loop detect shouldCancel() and exit cleanly
    };

    process.on('SIGINT', this.sigintHandler);
  }

  /**
   * Check if cancelation was requested
   *
   * @returns True if Ctrl+C was pressed
   */
  shouldCancel(): boolean {
    return this.canceled;
  }

  /**
   * Register cleanup callback (executed on Ctrl+C)
   *
   * @param callback - Async cleanup function
   */
  onCleanup(callback: () => Promise<void>): void {
    this.cleanupCallback = callback;
  }

  /**
   * Save cancelation state to disk (atomic write)
   *
   * Uses temp file → rename pattern to ensure atomicity.
   *
   * @param state - Cancelation state to persist
   */
  async saveState(state: CancelationState): Promise<void> {
    try {
      // Ensure cache directory exists
      const cacheDir = path.dirname(this.stateFile);
      await fs.mkdir(cacheDir, { recursive: true });

      // Atomic write: temp file → rename
      const tempFile = `${this.stateFile}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(state, null, 2), 'utf-8');
      await fs.rename(tempFile, this.stateFile);

      this.logger.log(chalk.gray(`State saved to ${this.stateFile}`));
    } catch (error: any) {
      this.logger.error('Failed to save state:', error);
      throw error;
    }
  }

  /**
   * Load cancelation state from disk
   *
   * Validates TTL (24-hour expiration) and version compatibility.
   *
   * @returns Cancelation state or null if not found/expired
   */
  async loadState(): Promise<CancelationState | null> {
    try {
      if (!existsSync(this.stateFile)) {
        return null; // No saved state
      }

      const content = await fs.readFile(this.stateFile, 'utf-8');
      const state = JSON.parse(content) as CancelationState;

      // Validate TTL (24 hours)
      const stateTimestamp = new Date(state.timestamp).getTime();
      const now = Date.now();
      const ttlMs = 24 * 60 * 60 * 1000; // 24 hours

      if (now - stateTimestamp > ttlMs) {
        this.logger.log(chalk.yellow('⚠️  Saved state expired (> 24 hours old). Starting fresh import.'));
        await this.clearState(); // Delete expired state
        return null;
      }

      // Validate version (for future compatibility)
      if (state.version !== '1.0') {
        this.logger.log(chalk.yellow('⚠️  Incompatible state version. Starting fresh import.'));
        await this.clearState();
        return null;
      }

      return state;
    } catch (error: any) {
      this.logger.error('Failed to load state:', error);
      await this.clearState(); // Corrupted state - delete it
      return null;
    }
  }

  /**
   * Clear saved state (delete file)
   */
  async clearState(): Promise<void> {
    try {
      if (existsSync(this.stateFile)) {
        await fs.unlink(this.stateFile);
        this.logger.log(chalk.gray('Cleared saved state'));
      }
    } catch (error: any) {
      this.logger.error('Failed to clear state:', error);
    }
  }

  /**
   * Unregister SIGINT handler (cleanup)
   */
  dispose(): void {
    if (this.sigintHandler) {
      process.off('SIGINT', this.sigintHandler);
      this.sigintHandler = null;
    }
  }

  /**
   * Show resume suggestion to user
   *
   * @param resumeCommand - Command to resume operation (e.g., "/specweave-jira:import-projects --resume")
   */
  suggestResume(resumeCommand: string): void {
    this.logger.log(chalk.cyan(`\nResume with: ${resumeCommand}`));
  }
}
