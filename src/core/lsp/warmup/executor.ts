/**
 * WarmupExecutor - Executes warm-up strategies sequentially
 *
 * Opens files one at a time with configurable delay to trigger
 * LSP indexing without overwhelming the server.
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-05
 */

import type { WarmupStrategy, WarmupResult } from './strategy.js';

/**
 * Options for warm-up execution
 */
export interface WarmupOptions {
  /** Maximum number of files to open (default: 3) */
  openCount?: number;
  /** Delay between file opens in milliseconds (default: 100) */
  delayMs?: number;
  /** Callback when a file is opened */
  onFileOpen?: (file: string) => void;
  /** Callback when an error occurs */
  onError?: (file: string, error: Error) => void;
}

/**
 * Executes warm-up strategies with sequential file opening
 */
export class WarmupExecutor {
  private static readonly DEFAULT_OPEN_COUNT = 3;
  private static readonly DEFAULT_DELAY_MS = 100;

  /**
   * Execute a warm-up strategy
   *
   * @param strategy - The warm-up strategy to execute
   * @param projectRoot - Root directory of the project
   * @param options - Execution options
   * @returns Promise resolving to warm-up result
   */
  async warmup(
    strategy: WarmupStrategy,
    projectRoot: string,
    options: WarmupOptions = {}
  ): Promise<WarmupResult> {
    const startTime = Date.now();
    const openCount = options.openCount ?? WarmupExecutor.DEFAULT_OPEN_COUNT;
    const delayMs = options.delayMs ?? WarmupExecutor.DEFAULT_DELAY_MS;

    const allFiles = await strategy.getFilesToOpen(projectRoot);
    const filesToOpen = allFiles.slice(0, openCount);

    let filesOpened = 0;

    for (let i = 0; i < filesToOpen.length; i++) {
      const file = filesToOpen[i];

      // Add delay between file opens (but not before the first one)
      if (i > 0 && delayMs > 0) {
        await this.delay(delayMs);
      }

      try {
        if (options.onFileOpen) {
          options.onFileOpen(file);
        }
        filesOpened++;
      } catch (error) {
        if (options.onError) {
          options.onError(file, error instanceof Error ? error : new Error(String(error)));
        }
        // Continue to next file on error
      }
    }

    return {
      language: strategy.language,
      filesOpened,
      elapsedMs: Date.now() - startTime,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
