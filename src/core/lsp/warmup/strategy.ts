/**
 * WarmupStrategy interface for language-specific warm-up logic
 *
 * Each language implements this interface to define how files should be
 * discovered and opened during LSP warm-up.
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-05
 */

/**
 * Result of a warm-up operation
 */
export interface WarmupResult {
  /** Language that was warmed up */
  language: string;
  /** Number of files opened */
  filesOpened: number;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
}

/**
 * Strategy interface for language-specific warm-up logic
 *
 * Implementations define how to discover files that should be opened
 * to trigger LSP indexing for a specific language.
 */
export interface WarmupStrategy {
  /** Language identifier (e.g., 'typescript', 'csharp', 'python') */
  readonly language: string;

  /**
   * Get files to open for warm-up
   *
   * @param projectRoot - Root directory of the project
   * @returns Promise resolving to array of file paths to open
   */
  getFilesToOpen(projectRoot: string): Promise<string[]>;
}
