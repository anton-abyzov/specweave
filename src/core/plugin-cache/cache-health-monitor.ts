/**
 * Cache Health Monitor
 *
 * Validates cached plugin files for merge conflicts, syntax errors, and checksum mismatches.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CacheHealthIssue } from './types.js';
import { CacheMetadataManager } from './cache-metadata.js';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Health report for a plugin cache
 */
export interface HealthReport {
  /** Plugin name */
  pluginName: string;

  /** Plugin version */
  version: string;

  /** Whether the cache is healthy */
  healthy: boolean;

  /** Total number of issues */
  totalIssues: number;

  /** Number of critical issues */
  criticalIssues: number;

  /** All detected issues */
  issues: CacheHealthIssue[];

  /** ISO timestamp of scan */
  scannedAt: string;
}

/**
 * Options for bash syntax validation
 */
export interface ValidationOptions {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Monitors plugin cache health
 */
export class CacheHealthMonitor {
  private metadataManager: CacheMetadataManager;

  constructor() {
    this.metadataManager = new CacheMetadataManager();
  }

  /**
   * Detect actual merge conflict markers in a file
   *
   * A real merge conflict has:
   * 1. All three markers present: <<<<<<<, =======, >>>>>>>
   * 2. Markers appear at line start (possibly with leading whitespace)
   * 3. Markers are NOT inside code fences (documentation examples)
   *
   * This avoids false positives from:
   * - Documentation showing conflict examples (inside code blocks)
   * - Comment dividers using repeated characters
   *
   * @param filePath - Absolute path to file
   * @returns True if real merge conflict markers detected
   */
  detectMergeConflicts(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Check if all 3 marker types are present (required for a real conflict)
    // <<<<<<< followed by space/branch name at line start
    const hasOpenMarker = /^<{7}\s/m.test(content);
    // ======= on its own line
    const hasMidMarker = /^={7}$/m.test(content);
    // >>>>>>> followed by space/branch name at line start
    const hasCloseMarker = /^>{7}\s/m.test(content);

    if (!hasOpenMarker || !hasMidMarker || !hasCloseMarker) {
      return false; // Not all markers present = not a real conflict
    }

    // All 3 present - now check they're not inside code fences
    return this.hasMarkersOutsideCodeFences(content);
  }

  /**
   * Check if merge conflict markers exist outside of code fences
   *
   * Code fences (``` blocks) often contain documentation examples
   * showing what conflicts look like. These should not be flagged.
   *
   * @param content - File content to analyze
   * @returns True if conflict markers found outside code fences
   */
  private hasMarkersOutsideCodeFences(content: string): boolean {
    const lines = content.split('\n');
    let inCodeFence = false;
    let foundOpenMarker = false;
    let foundMidMarker = false;
    let foundCloseMarker = false;

    for (const line of lines) {
      // Track code fence state (``` at line start, with optional language)
      if (/^```/.test(line.trim())) {
        inCodeFence = !inCodeFence;
        continue;
      }

      // Only check for markers outside code fences
      if (!inCodeFence) {
        if (/^<{7}\s/.test(line)) foundOpenMarker = true;
        if (/^={7}$/.test(line)) foundMidMarker = true;
        if (/^>{7}\s/.test(line)) foundCloseMarker = true;
      }
    }

    // Return true if all markers found outside code fences (real conflict)
    return foundOpenMarker && foundMidMarker && foundCloseMarker;
  }

  /**
   * Validate bash script syntax
   *
   * Uses `bash -n` to check for syntax errors without executing the script.
   *
   * @param scriptPath - Absolute path to bash script
   * @param options - Validation options
   * @returns Validation result with error details if invalid
   */
  validateBashSyntax(
    scriptPath: string,
    options: ValidationOptions = {}
  ): { valid: boolean; error?: string } {
    const timeout = options.timeout || 5000;

    try {
      execSync(`bash -n "${scriptPath}"`, {
        stdio: 'pipe',
        timeout
      });
      return { valid: true };
    } catch (error: any) {
      const errorOutput = error.stderr?.toString() || error.message;
      return { valid: false, error: errorOutput };
    }
  }

  /**
   * Check plugin cache health
   *
   * Scans the plugin cache directory for issues:
   * - Merge conflicts in files
   * - Bash syntax errors in .sh files
   * - Checksum mismatches (if metadata exists)
   * - Missing files (if metadata exists)
   *
   * @param pluginPath - Absolute path to plugin version directory
   * @param version - Plugin version
   * @returns Array of detected issues (empty if healthy)
   */
  checkPluginHealth(pluginPath: string, version: string): CacheHealthIssue[] {
    const issues: CacheHealthIssue[] = [];

    // Read metadata if it exists
    const metadata = this.metadataManager.readMetadata(pluginPath);

    // Scan all files recursively
    const scanDirectory = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(pluginPath, fullPath);

        // Skip metadata file itself
        if (entry.name === '.cache-metadata.json') {
          continue;
        }

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check for merge conflicts in all files
          try {
            if (this.detectMergeConflicts(fullPath)) {
              issues.push({
                severity: 'critical',
                type: 'merge_conflict',
                file: relativePath,
                message: 'Unresolved merge conflict markers detected',
                suggestion: `Run: specweave cache-refresh ${this.extractPluginName(pluginPath)} --force`
              });
            }
          } catch (error) {
            logger.debug(`Skipping merge conflict check for ${relativePath}: ${error}`);
          }

          // Validate bash syntax for .sh files
          if (entry.name.endsWith('.sh')) {
            const syntaxResult = this.validateBashSyntax(fullPath);
            if (!syntaxResult.valid) {
              issues.push({
                severity: 'critical',
                type: 'syntax_error',
                file: relativePath,
                message: `Bash syntax error: ${syntaxResult.error}`,
                suggestion: `Fix syntax errors or run: specweave cache-refresh ${this.extractPluginName(pluginPath)} --force`
              });
            }
          }

          // Validate checksums if metadata exists
          if (metadata && metadata.checksums[relativePath]) {
            try {
              const actualChecksum = this.metadataManager.computeChecksum(fullPath);
              const expectedChecksum = metadata.checksums[relativePath];

              if (actualChecksum !== expectedChecksum) {
                issues.push({
                  severity: 'medium',
                  type: 'checksum_mismatch',
                  file: relativePath,
                  message: `File checksum does not match metadata (expected: ${expectedChecksum.substring(0, 8)}..., got: ${actualChecksum.substring(0, 8)}...)`,
                  suggestion: `File may have been modified. Run: specweave cache-refresh ${this.extractPluginName(pluginPath)}`
                });
              }
            } catch (error) {
              logger.debug(`Skipping checksum validation for ${relativePath}: ${error}`);
            }
          }
        }
      }
    };

    if (fs.existsSync(pluginPath)) {
      scanDirectory(pluginPath);
    }

    // Check for missing files listed in metadata
    if (metadata) {
      for (const [relativePath, _checksum] of Object.entries(metadata.checksums)) {
        const fullPath = path.join(pluginPath, relativePath);
        if (!fs.existsSync(fullPath)) {
          issues.push({
            severity: 'medium',
            type: 'missing_file',
            file: relativePath,
            message: `File listed in metadata but missing from cache`,
            suggestion: `Run: specweave cache-refresh ${this.extractPluginName(pluginPath)}`
          });
        }
      }
    }

    return issues;
  }

  /**
   * Generate health report for a plugin
   *
   * @param pluginPath - Absolute path to plugin version directory
   * @param version - Plugin version
   * @returns Health report
   */
  generateHealthReport(pluginPath: string, version: string): HealthReport {
    const issues = this.checkPluginHealth(pluginPath, version);
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;

    return {
      pluginName: this.extractPluginName(pluginPath),
      version,
      healthy: issues.length === 0,
      totalIssues: issues.length,
      criticalIssues,
      issues,
      scannedAt: new Date().toISOString()
    };
  }

  /**
   * Extract plugin name from cache path
   *
   * @param pluginPath - Plugin cache path
   * @returns Plugin name
   */
  private extractPluginName(pluginPath: string): string {
    // Path format: ~/.claude/plugins/cache/specweave/{pluginName}/{version}
    const parts = pluginPath.split(path.sep);
    const cacheIndex = parts.lastIndexOf('cache');
    if (cacheIndex >= 0 && cacheIndex + 2 < parts.length) {
      return parts[cacheIndex + 2]; // Skip "specweave", get plugin name
    }
    return 'sw'; // Fallback
  }
}
