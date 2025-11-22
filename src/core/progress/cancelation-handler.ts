/**
 * CancelationHandler - Graceful Ctrl+C (SIGINT) handling with state persistence
 *
 * Features:
 * - Single Ctrl+C: Save state and exit gracefully
 * - Double Ctrl+C (within 2s): Force exit immediately
 * - Polling mechanism for cooperative cancelation
 * - State persistence to resume later
 *
 * @module core/progress/cancelation-handler
 */

import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';

/**
 * Cancelation handler options
 */
export interface CancelationOptions {
  /** State save callback - called when Ctrl+C is pressed */
  onSaveState?: () => Promise<void>;
  /** Logger instance */
  logger?: Logger;
  /** Force exit timeout in milliseconds (default: 2000ms) */
  forceExitTimeout?: number;
}

/**
 * CancelationHandler - Handles SIGINT gracefully with double Ctrl+C force exit
 *
 * @example
 * ```typescript
 * const handler = new CancelationHandler({
 *   onSaveState: async () => {
 *     await saveImportState();
 *   }
 * });
 *
 * handler.register();
 *
 * // In import loop
 * for (const project of projects) {
 *   if (handler.shouldCancel()) {
 *     break;
 *   }
 *   await importProject(project);
 * }
 *
 * handler.unregister();
 * ```
 */
export class CancelationHandler {
  private logger: Logger;
  private onSaveState?: () => Promise<void>;
  private forceExitTimeout: number;

  private cancelRequested: boolean = false;
  private firstCtrlCTime: number | null = null;
  private sigintHandler: (() => void) | null = null;

  constructor(options: CancelationOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.onSaveState = options.onSaveState;
    this.forceExitTimeout = options.forceExitTimeout ?? 2000;
  }

  /**
   * Register SIGINT listener
   */
  register(): void {
    this.sigintHandler = () => {
      void this.handleSigint();
    };

    process.on('SIGINT', this.sigintHandler);
  }

  /**
   * Unregister SIGINT listener
   */
  unregister(): void {
    if (this.sigintHandler) {
      process.off('SIGINT', this.sigintHandler);
      this.sigintHandler = null;
    }
  }

  /**
   * Check if cancelation was requested (polling mechanism)
   *
   * @returns true if Ctrl+C was pressed
   */
  shouldCancel(): boolean {
    return this.cancelRequested;
  }

  /**
   * Handle SIGINT signal (Ctrl+C)
   */
  private async handleSigint(): Promise<void> {
    const now = Date.now();

    // Double Ctrl+C detection
    if (this.firstCtrlCTime !== null) {
      const elapsed = now - this.firstCtrlCTime;
      if (elapsed < this.forceExitTimeout) {
        // Force exit on double Ctrl+C
        this.logger.warn('\n⚠️  Forced exit (progress may be lost)');
        process.exit(1);
      }
    }

    // First Ctrl+C
    this.firstCtrlCTime = now;
    this.cancelRequested = true;

    this.logger.log('\n⏸️  Cancelation requested. Saving progress...');

    try {
      // Save state if callback provided
      if (this.onSaveState) {
        await this.onSaveState();
      }

      this.logger.log('✅ Progress saved. Run with --resume to continue.');
      process.exit(0);
    } catch (error) {
      this.logger.error('❌ Failed to save progress:', error);
      process.exit(1);
    }
  }

  /**
   * Reset cancelation state (useful for testing)
   */
  reset(): void {
    this.cancelRequested = false;
    this.firstCtrlCTime = null;
  }
}
