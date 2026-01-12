/**
 * Package.json Cache - Performance optimization for package.json reads
 *
 * Provides a caching layer for package.json reads to avoid redundant file I/O
 * during codebase analysis operations like repo scanning and discovery.
 *
 * Part of increment 0168: Code Review Fixes
 *
 * @module utils/package-json-cache
 * @since v0.34.0
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Parsed package.json content
 */
export interface PackageJsonContent {
  name?: string;
  version?: string;
  main?: string;
  exports?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  content: PackageJsonContent | null;
  mtime: number;
  readAt: number;
}

/**
 * Cache options
 */
export interface PackageJsonCacheOptions {
  /** Maximum number of entries to cache (default: 1000) */
  maxEntries?: number;
  /** Time-to-live in milliseconds (default: 60000 = 1 minute) */
  ttl?: number;
  /** Whether to validate cache entries by mtime (default: true) */
  validateMtime?: boolean;
}

/**
 * Statistics for cache performance monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  size: number;
}

/**
 * Package.json Cache - Singleton pattern for shared caching
 *
 * Usage:
 * ```typescript
 * const cache = PackageJsonCache.getInstance();
 * const pkg = cache.get('/path/to/project');
 * if (pkg) {
 *   const deps = cache.getAllDependencies(pkg);
 * }
 * ```
 */
export class PackageJsonCache {
  private static instance: PackageJsonCache | null = null;

  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, invalidations: 0, size: 0 };
  private options: Required<PackageJsonCacheOptions>;

  private constructor(options: PackageJsonCacheOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries ?? 1000,
      ttl: options.ttl ?? 60000,
      validateMtime: options.validateMtime ?? true,
    };
  }

  /**
   * Get the singleton instance
   */
  static getInstance(options?: PackageJsonCacheOptions): PackageJsonCache {
    if (!PackageJsonCache.instance) {
      PackageJsonCache.instance = new PackageJsonCache(options);
    }
    return PackageJsonCache.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    PackageJsonCache.instance = null;
  }

  /**
   * Get package.json content for a project path
   *
   * @param projectPath - Path to the project directory (not the package.json file)
   * @returns Parsed package.json content or null if not found/invalid
   */
  get(projectPath: string): PackageJsonContent | null {
    const normalizedPath = path.resolve(projectPath);
    const packageJsonPath = path.join(normalizedPath, 'package.json');

    // Check cache first
    const cached = this.cache.get(normalizedPath);
    if (cached && this.isValid(cached, packageJsonPath)) {
      this.stats.hits++;
      return cached.content;
    }

    // Cache miss - read and cache
    this.stats.misses++;
    const entry = this.readAndCache(normalizedPath, packageJsonPath);
    return entry.content;
  }

  /**
   * Check if a package.json exists at the given path
   *
   * @param projectPath - Path to the project directory
   * @returns true if package.json exists
   */
  exists(projectPath: string): boolean {
    const normalizedPath = path.resolve(projectPath);
    const packageJsonPath = path.join(normalizedPath, 'package.json');

    // Check cache first
    const cached = this.cache.get(normalizedPath);
    if (cached && this.isValid(cached, packageJsonPath)) {
      return cached.content !== null;
    }

    return fs.existsSync(packageJsonPath);
  }

  /**
   * Get all dependencies (dependencies + devDependencies + peerDependencies)
   *
   * @param pkg - Package.json content
   * @returns Combined dependencies object
   */
  getAllDependencies(pkg: PackageJsonContent): Record<string, string> {
    return {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };
  }

  /**
   * Get production dependencies only
   *
   * @param pkg - Package.json content
   * @returns Production dependencies
   */
  getProductionDependencies(pkg: PackageJsonContent): Record<string, string> {
    return {
      ...(pkg.dependencies || {}),
    };
  }

  /**
   * Check if a dependency exists
   *
   * @param pkg - Package.json content
   * @param depName - Dependency name to check
   * @returns true if dependency exists in any dependency type
   */
  hasDependency(pkg: PackageJsonContent, depName: string): boolean {
    const allDeps = this.getAllDependencies(pkg);
    return depName in allDeps;
  }

  /**
   * Invalidate cache for a specific path
   *
   * @param projectPath - Path to invalidate
   */
  invalidate(projectPath: string): void {
    const normalizedPath = path.resolve(projectPath);
    if (this.cache.delete(normalizedPath)) {
      this.stats.invalidations++;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Pre-warm cache with multiple paths (useful for batch operations)
   *
   * @param projectPaths - Array of project paths to pre-load
   */
  preWarm(projectPaths: string[]): void {
    for (const projectPath of projectPaths) {
      this.get(projectPath);
    }
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid(entry: CacheEntry, packageJsonPath: string): boolean {
    const now = Date.now();

    // Check TTL
    if (now - entry.readAt > this.options.ttl) {
      return false;
    }

    // Check mtime if enabled
    if (this.options.validateMtime) {
      try {
        const stat = fs.statSync(packageJsonPath);
        if (stat.mtimeMs !== entry.mtime) {
          return false;
        }
      } catch {
        // File doesn't exist anymore
        return entry.content === null;
      }
    }

    return true;
  }

  /**
   * Read package.json and cache the result
   */
  private readAndCache(normalizedPath: string, packageJsonPath: string): CacheEntry {
    // Enforce max entries
    if (this.cache.size >= this.options.maxEntries) {
      this.evictOldest();
    }

    let content: PackageJsonContent | null = null;
    let mtime = 0;

    try {
      if (fs.existsSync(packageJsonPath)) {
        const stat = fs.statSync(packageJsonPath);
        mtime = stat.mtimeMs;
        const rawContent = fs.readFileSync(packageJsonPath, 'utf-8');
        content = JSON.parse(rawContent) as PackageJsonContent;
      }
    } catch {
      // Invalid JSON or read error - cache as null
      content = null;
    }

    const entry: CacheEntry = {
      content,
      mtime,
      readAt: Date.now(),
    };

    this.cache.set(normalizedPath, entry);
    this.stats.size = this.cache.size;

    return entry;
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    // Remove 10% of oldest entries
    const toRemove = Math.max(1, Math.floor(this.options.maxEntries * 0.1));
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].readAt - b[1].readAt)
      .slice(0, toRemove);

    for (const [key] of entries) {
      this.cache.delete(key);
    }
    this.stats.size = this.cache.size;
  }
}

/**
 * Convenience function for one-off reads (uses singleton)
 *
 * @param projectPath - Path to the project directory
 * @returns Parsed package.json content or null
 */
export function readPackageJson(projectPath: string): PackageJsonContent | null {
  return PackageJsonCache.getInstance().get(projectPath);
}

/**
 * Convenience function for checking package.json existence (uses singleton)
 *
 * @param projectPath - Path to the project directory
 * @returns true if package.json exists
 */
export function packageJsonExists(projectPath: string): boolean {
  return PackageJsonCache.getInstance().exists(projectPath);
}

/**
 * Convenience function for getting all dependencies (uses singleton)
 *
 * @param projectPath - Path to the project directory
 * @returns Combined dependencies or empty object if not found
 */
export function getAllDependencies(projectPath: string): Record<string, string> {
  const cache = PackageJsonCache.getInstance();
  const pkg = cache.get(projectPath);
  return pkg ? cache.getAllDependencies(pkg) : {};
}
