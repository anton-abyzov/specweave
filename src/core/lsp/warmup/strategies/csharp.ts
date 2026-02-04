/**
 * CSharpStrategy - Warm-up strategy for C# projects
 *
 * Handles .sln and .csproj detection with upward directory search.
 * Supports multiple solution file selection with caching.
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-01, AC-US1-03
 */

import type { WarmupStrategy } from '../strategy.js';

/**
 * Filesystem abstraction for testing
 */
export interface FileSystemProvider {
  glob(pattern: string, cwd: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  findUp(pattern: string, startDir: string): Promise<string | null>;
}

/**
 * Prompt provider for interactive selection
 */
export type PromptProvider = (options: string[], message: string) => Promise<string>;

/**
 * Cache provider for persisting choices
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

/** Maximum files to return for warm-up */
const MAX_FILES = 10;

/**
 * C# warm-up strategy with solution/project file detection
 */
export class CSharpStrategy implements WarmupStrategy {
  readonly language = 'csharp';

  private readonly fs: FileSystemProvider;
  private readonly prompt?: PromptProvider;
  private readonly cache?: CacheProvider;

  /** Detected solution file name */
  solutionFile?: string;
  /** Detected project file name (fallback when no .sln) */
  projectFile?: string;

  private projectRoot?: string;

  constructor(
    fs: FileSystemProvider,
    prompt?: PromptProvider,
    cache?: CacheProvider
  ) {
    this.fs = fs;
    this.prompt = prompt;
    this.cache = cache;
  }

  /**
   * Detect the C# project root by searching for .sln or .csproj files
   *
   * @param startDir - Directory to start searching from
   * @returns Project root directory, or null if no C# project found
   */
  async detectProjectRoot(startDir: string): Promise<string | null> {
    // Try to find .sln file first (preferred)
    const slnPath = await this.fs.findUp('*.sln', startDir);
    if (slnPath) {
      const dir = slnPath.substring(0, slnPath.lastIndexOf('/'));
      const files = await this.fs.glob('*.sln', dir);

      if (files.length > 1) {
        // Multiple solutions - check cache or prompt
        const cached = await this.getCachedChoice(dir);
        if (cached && files.includes(cached)) {
          this.solutionFile = cached;
        } else if (this.prompt) {
          const choice = await this.prompt(files, 'Select a solution file:');
          this.solutionFile = choice;
          await this.setCachedChoice(dir, choice);
        } else {
          // No prompt available, use first one
          this.solutionFile = files[0];
        }
      } else {
        this.solutionFile = slnPath.substring(slnPath.lastIndexOf('/') + 1);
      }

      this.projectRoot = dir;
      return dir;
    }

    // Fall back to .csproj
    const csprojPath = await this.fs.findUp('*.csproj', startDir);
    if (csprojPath) {
      const dir = csprojPath.substring(0, csprojPath.lastIndexOf('/'));
      this.projectFile = csprojPath.substring(csprojPath.lastIndexOf('/') + 1);
      this.projectRoot = dir;
      return dir;
    }

    return null;
  }

  /**
   * Get files to open for warm-up
   *
   * @param projectRoot - Root directory of the project
   * @returns Promise resolving to array of .cs file paths
   */
  async getFilesToOpen(projectRoot: string): Promise<string[]> {
    const files = await this.fs.glob('*.cs', projectRoot);
    return files.slice(0, MAX_FILES);
  }

  private getCacheKey(dir: string): string {
    return `csharp:${dir}:solution`;
  }

  private async getCachedChoice(dir: string): Promise<string | null> {
    if (!this.cache) return null;
    return this.cache.get<string>(this.getCacheKey(dir));
  }

  private async setCachedChoice(dir: string, choice: string): Promise<void> {
    if (!this.cache) return;
    await this.cache.set(this.getCacheKey(dir), choice);
  }
}
