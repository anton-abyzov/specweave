/**
 * Global Command Deduplication System
 *
 * Prevents ANY command/tool from being invoked twice within a configurable time window.
 * Tracks all SlashCommand, Write, Edit, and other tool invocations.
 *
 * Architecture:
 * - File-based cache: `.specweave/state/command-invocations.json`
 * - Hash-based deduplication: command + args → unique fingerprint
 * - Time-windowed checks: Configurable window (default: 1000ms)
 * - Automatic cleanup: Removes old entries to prevent bloat
 *
 * Usage:
 * ```typescript
 * import { CommandDeduplicator } from './command-deduplicator.js';
 *
 * const dedup = new CommandDeduplicator();
 * const isDuplicate = await dedup.checkDuplicate('/specweave:do', ['0031']);
 *
 * if (isDuplicate) {
 *   console.log('⚠️  Duplicate invocation blocked!');
 *   return;
 * }
 *
 * await dedup.recordInvocation('/specweave:do', ['0031']);
 * // ... execute command
 * ```
 *
 * @module core/deduplication
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Invocation record stored in cache
 */
export interface InvocationRecord {
  /** Unique fingerprint of command + args */
  fingerprint: string;

  /** Command name (e.g., '/specweave:do') */
  command: string;

  /** Command arguments */
  args: string[];

  /** Timestamp when invoked (ms since epoch) */
  timestamp: number;

  /** Human-readable timestamp */
  date: string;
}

/**
 * Cache structure
 */
export interface InvocationCache {
  /** List of invocation records */
  invocations: InvocationRecord[];

  /** Last cleanup timestamp */
  lastCleanup: number;

  /** Total invocations tracked */
  totalInvocations: number;

  /** Total duplicates blocked */
  totalDuplicatesBlocked: number;
}

/**
 * Configuration for deduplication
 */
export interface DeduplicationConfig {
  /** Time window in milliseconds to check for duplicates (default: 1000ms) */
  windowMs?: number;

  /** Path to cache file (default: .specweave/state/command-invocations.json) */
  cachePath?: string;

  /** Maximum cache entries before cleanup (default: 1000) */
  maxCacheSize?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Cleanup interval in milliseconds (default: 60000ms = 1 minute) */
  cleanupIntervalMs?: number;
}

/**
 * Global command deduplication system
 */
export class CommandDeduplicator {
  private config: Required<DeduplicationConfig>;
  private cache: InvocationCache;
  private lastCleanupCheck: number = 0;

  /**
   * Create new deduplicator instance
   *
   * @param config - Configuration options
   * @param projectRoot - Project root directory (default: process.cwd())
   */
  constructor(config: DeduplicationConfig = {}, private projectRoot: string = process.cwd()) {
    this.config = {
      windowMs: config.windowMs ?? 1000,
      cachePath: config.cachePath ?? path.join(projectRoot, '.specweave', 'state', 'command-invocations.json'),
      maxCacheSize: config.maxCacheSize ?? 1000,
      debug: config.debug ?? false,
      cleanupIntervalMs: config.cleanupIntervalMs ?? 60000
    };

    this.cache = this.loadCache();
  }

  /**
   * Check if command invocation is a duplicate
   *
   * @param command - Command name (e.g., '/specweave:do')
   * @param args - Command arguments
   * @returns true if duplicate detected, false otherwise
   */
  public async checkDuplicate(command: string, args: string[] = []): Promise<boolean> {
    const fingerprint = this.createFingerprint(command, args);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Check for recent invocations with same fingerprint
    const recentDuplicates = this.cache.invocations.filter(inv =>
      inv.fingerprint === fingerprint &&
      inv.timestamp >= windowStart
    );

    if (recentDuplicates.length > 0) {
      const mostRecent = recentDuplicates[recentDuplicates.length - 1];
      const timeSince = now - mostRecent.timestamp;

      if (this.config.debug) {
        console.log(`[CommandDeduplicator] 🚫 DUPLICATE DETECTED!`);
        console.log(`  Command: ${command}`);
        console.log(`  Args: ${JSON.stringify(args)}`);
        console.log(`  Time since last: ${timeSince}ms`);
        console.log(`  Window: ${this.config.windowMs}ms`);
      }

      // Increment duplicate counter
      this.cache.totalDuplicatesBlocked++;
      await this.saveCache();

      return true;
    }

    return false;
  }

  /**
   * Record command invocation
   *
   * @param command - Command name
   * @param args - Command arguments
   */
  public async recordInvocation(command: string, args: string[] = []): Promise<void> {
    const fingerprint = this.createFingerprint(command, args);
    const now = Date.now();

    const record: InvocationRecord = {
      fingerprint,
      command,
      args,
      timestamp: now,
      date: new Date(now).toISOString()
    };

    this.cache.invocations.push(record);
    this.cache.totalInvocations++;

    if (this.config.debug) {
      console.log(`[CommandDeduplicator] ✅ Recorded invocation: ${command} ${args.join(' ')}`);
    }

    // Trigger cleanup if needed
    if (now - this.lastCleanupCheck > this.config.cleanupIntervalMs) {
      await this.cleanup();
      this.lastCleanupCheck = now;
    }

    await this.saveCache();
  }

  /**
   * Create unique fingerprint for command + args
   *
   * @param command - Command name
   * @param args - Command arguments
   * @returns SHA256 hash of command + args
   */
  private createFingerprint(command: string, args: string[]): string {
    const data = JSON.stringify({ command, args });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Load cache from disk
   *
   * @returns Invocation cache
   */
  private loadCache(): InvocationCache {
    try {
      if (fs.existsSync(this.config.cachePath)) {
        const data = fs.readJsonSync(this.config.cachePath);

        if (this.config.debug) {
          console.log(`[CommandDeduplicator] 📂 Loaded cache: ${data.invocations.length} invocations`);
        }

        return data;
      }
    } catch (error) {
      if (this.config.debug) {
        console.log(`[CommandDeduplicator] ⚠️  Failed to load cache: ${error}`);
      }
    }

    // Return empty cache
    return {
      invocations: [],
      lastCleanup: Date.now(),
      totalInvocations: 0,
      totalDuplicatesBlocked: 0
    };
  }

  /**
   * Save cache to disk
   */
  private async saveCache(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.config.cachePath));
      await fs.writeJson(this.config.cachePath, this.cache, { spaces: 2 });

      if (this.config.debug) {
        console.log(`[CommandDeduplicator] 💾 Saved cache: ${this.cache.invocations.length} invocations`);
      }
    } catch (error) {
      console.error(`[CommandDeduplicator] ❌ Failed to save cache: ${error}`);
    }
  }

  /**
   * Clean up old invocation records
   *
   * Removes records older than 10x the deduplication window to prevent cache bloat.
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const cutoff = now - (this.config.windowMs * 10); // Keep 10x window

    const before = this.cache.invocations.length;
    this.cache.invocations = this.cache.invocations.filter(inv => inv.timestamp >= cutoff);
    const after = this.cache.invocations.length;

    // Also enforce max cache size
    if (this.cache.invocations.length > this.config.maxCacheSize) {
      this.cache.invocations = this.cache.invocations.slice(-this.config.maxCacheSize);
    }

    this.cache.lastCleanup = now;

    if (this.config.debug && before > after) {
      console.log(`[CommandDeduplicator] 🧹 Cleanup: Removed ${before - after} old records`);
    }

    await this.saveCache();
  }

  /**
   * Get statistics about deduplication
   *
   * @returns Statistics object
   */
  public getStats(): {
    totalInvocations: number;
    totalDuplicatesBlocked: number;
    currentCacheSize: number;
    lastCleanup: string;
  } {
    return {
      totalInvocations: this.cache.totalInvocations,
      totalDuplicatesBlocked: this.cache.totalDuplicatesBlocked,
      currentCacheSize: this.cache.invocations.length,
      lastCleanup: new Date(this.cache.lastCleanup).toISOString()
    };
  }

  /**
   * Clear all cached invocations (useful for testing)
   */
  public async clear(): Promise<void> {
    this.cache = {
      invocations: [],
      lastCleanup: Date.now(),
      totalInvocations: 0,
      totalDuplicatesBlocked: 0
    };
    await this.saveCache();

    if (this.config.debug) {
      console.log(`[CommandDeduplicator] 🗑️  Cache cleared`);
    }
  }
}

/**
 * Global singleton instance (convenience)
 */
let globalInstance: CommandDeduplicator | null = null;

/**
 * Get global deduplicator instance
 *
 * @param config - Configuration (only used on first call)
 * @returns Global deduplicator instance
 */
export function getGlobalDeduplicator(config?: DeduplicationConfig): CommandDeduplicator {
  if (!globalInstance) {
    globalInstance = new CommandDeduplicator(config);
  }
  return globalInstance;
}

/**
 * Convenience function: Check if command is duplicate
 *
 * @param command - Command name
 * @param args - Command arguments
 * @returns true if duplicate, false otherwise
 */
export async function isDuplicate(command: string, args: string[] = []): Promise<boolean> {
  return await getGlobalDeduplicator().checkDuplicate(command, args);
}

/**
 * Convenience function: Record command invocation
 *
 * @param command - Command name
 * @param args - Command arguments
 */
export async function recordCommand(command: string, args: string[] = []): Promise<void> {
  await getGlobalDeduplicator().recordInvocation(command, args);
}
