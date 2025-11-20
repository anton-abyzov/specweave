/**
 * DesyncDetector - Detect and fix status desyncs between metadata.json and spec.md
 *
 * Prevents silent failures by validating source-of-truth consistency.
 * Critical for maintaining data integrity across increment lifecycle.
 *
 * Incident Reference: 2025-11-20 - Silent failure in /specweave:done caused
 * increment 0047 to have metadata.json="completed" while spec.md="active",
 * breaking status line and user trust.
 *
 * CLAUDE.md Rule #7: spec.md and metadata.json are BOTH source of truth and MUST stay in sync.
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { IncrementStatus } from '../types/increment-metadata.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Desync detection result for a single increment
 */
export interface DesyncResult {
  incrementId: string;
  hasDesync: boolean;
  metadataStatus: IncrementStatus | null;
  specStatus: IncrementStatus | null;
  metadataPath: string;
  specPath: string;
  error?: string;
}

/**
 * Desync scan report for multiple increments
 */
export interface DesyncScanReport {
  totalScanned: number;
  totalDesyncs: number;
  desyncs: DesyncResult[];
  healthy: string[];
  errors: string[];
}

/**
 * Options for desync detection
 */
export interface DesyncDetectorOptions {
  logger?: Logger;
  projectRoot?: string;
  autoFix?: boolean;
}

/**
 * DesyncDetector - Validates status consistency between metadata.json and spec.md
 *
 * Key Features:
 * - Detects status desyncs across all increments
 * - Provides detailed desync reports
 * - Auto-fix capability (optional)
 * - Validates before critical operations
 *
 * Usage:
 * ```typescript
 * // Check single increment
 * const detector = new DesyncDetector();
 * const result = await detector.checkIncrement('0047-us-task-linkage');
 * if (result.hasDesync) {
 *   console.error('Desync detected!', result);
 * }
 *
 * // Scan all increments
 * const report = await detector.scanAll();
 * console.log(`Found ${report.totalDesyncs} desyncs`);
 * ```
 */
export class DesyncDetector {
  private logger: Logger;
  private projectRoot: string;

  constructor(options: DesyncDetectorOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.projectRoot = options.projectRoot ?? process.cwd();
  }

  /**
   * Check single increment for status desync
   *
   * @param incrementId - Increment ID (e.g., "0047-us-task-linkage")
   * @returns Desync result with detailed status info
   *
   * @example
   * ```typescript
   * const result = await detector.checkIncrement('0047-us-task-linkage');
   * if (result.hasDesync) {
   *   console.error(`Desync: metadata=${result.metadataStatus}, spec=${result.specStatus}`);
   * }
   * ```
   */
  async checkIncrement(incrementId: string): Promise<DesyncResult> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'metadata.json'
    );

    const specPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'spec.md'
    );

    try {
      // Read metadata.json status
      let metadataStatus: IncrementStatus | null = null;
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJson(metadataPath);
        metadataStatus = metadata.status ?? null;
      }

      // Read spec.md status
      let specStatus: IncrementStatus | null = null;
      if (await fs.pathExists(specPath)) {
        const content = await fs.readFile(specPath, 'utf-8');
        const parsed = matter(content);
        specStatus = parsed.data.status ?? null;
      }

      // Detect desync
      const hasDesync =
        metadataStatus !== null &&
        specStatus !== null &&
        metadataStatus !== specStatus;

      return {
        incrementId,
        hasDesync,
        metadataStatus,
        specStatus,
        metadataPath,
        specPath,
      };
    } catch (error) {
      return {
        incrementId,
        hasDesync: false,
        metadataStatus: null,
        specStatus: null,
        metadataPath,
        specPath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Scan all increments for desyncs
   *
   * @returns Comprehensive scan report
   *
   * @example
   * ```typescript
   * const report = await detector.scanAll();
   * console.log(`Scanned ${report.totalScanned} increments`);
   * console.log(`Found ${report.totalDesyncs} desyncs`);
   * report.desyncs.forEach(d => console.error(`- ${d.incrementId}`));
   * ```
   */
  async scanAll(): Promise<DesyncScanReport> {
    const incrementsDir = path.join(this.projectRoot, '.specweave', 'increments');

    const report: DesyncScanReport = {
      totalScanned: 0,
      totalDesyncs: 0,
      desyncs: [],
      healthy: [],
      errors: [],
    };

    if (!(await fs.pathExists(incrementsDir))) {
      return report;
    }

    // Get all increment directories
    const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
    const incrementDirs = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name);

    // Check each increment
    for (const incrementId of incrementDirs) {
      report.totalScanned++;

      const result = await this.checkIncrement(incrementId);

      if (result.error) {
        report.errors.push(`${incrementId}: ${result.error}`);
      } else if (result.hasDesync) {
        report.totalDesyncs++;
        report.desyncs.push(result);
      } else {
        report.healthy.push(incrementId);
      }
    }

    return report;
  }

  /**
   * Fix desync by updating spec.md to match metadata.json (source of truth for status)
   *
   * IMPORTANT: metadata.json is considered the source of truth because it's updated
   * atomically and used by the CLI. spec.md should mirror it.
   *
   * @param incrementId - Increment ID to fix
   * @returns true if fixed successfully, false if no desync or fix failed
   *
   * @example
   * ```typescript
   * const fixed = await detector.fixDesync('0047-us-task-linkage');
   * if (fixed) {
   *   console.log('Desync fixed!');
   * }
   * ```
   */
  async fixDesync(incrementId: string): Promise<boolean> {
    const result = await this.checkIncrement(incrementId);

    if (!result.hasDesync) {
      this.logger.log(`No desync detected for ${incrementId}`);
      return false;
    }

    if (result.metadataStatus === null) {
      this.logger.error(`Cannot fix desync - metadata.json missing for ${incrementId}`);
      return false;
    }

    try {
      // Read spec.md
      const content = await fs.readFile(result.specPath, 'utf-8');
      const parsed = matter(content);

      // Update status to match metadata.json (source of truth)
      parsed.data.status = result.metadataStatus;

      // Write back atomically
      const updatedContent = matter.stringify(parsed.content, parsed.data);
      const tempPath = `${result.specPath}.tmp`;
      await fs.writeFile(tempPath, updatedContent, 'utf-8');
      await fs.rename(tempPath, result.specPath);

      this.logger.log(
        `Fixed desync for ${incrementId}: spec.md updated from "${result.specStatus}" to "${result.metadataStatus}"`
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to fix desync for ${incrementId}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Validate increment has no desync, throw if found
   *
   * Use this before critical operations (e.g., closing increment, archiving)
   *
   * @param incrementId - Increment ID to validate
   * @throws Error if desync detected
   *
   * @example
   * ```typescript
   * await detector.validateOrThrow('0047-us-task-linkage');
   * // Throws if desync found, continues if healthy
   * ```
   */
  async validateOrThrow(incrementId: string): Promise<void> {
    const result = await this.checkIncrement(incrementId);

    if (result.error) {
      throw new Error(
        `Cannot validate ${incrementId} - error reading status: ${result.error}`
      );
    }

    if (result.hasDesync) {
      throw new Error(
        `CRITICAL: Status desync detected for ${incrementId}!\n` +
          `metadata.json: ${result.metadataStatus}\n` +
          `spec.md: ${result.specStatus}\n\n` +
          `This is a source-of-truth violation (CLAUDE.md Rule #7).\n` +
          `Run: /specweave:sync-status ${incrementId} to fix`
      );
    }
  }

  /**
   * Generate human-readable report for desyncs
   *
   * @param report - Scan report
   * @returns Formatted report string
   */
  formatReport(report: DesyncScanReport): string {
    const lines: string[] = [];

    lines.push('━'.repeat(80));
    lines.push('STATUS DESYNC DETECTION REPORT');
    lines.push('━'.repeat(80));
    lines.push('');

    lines.push(`Total Scanned: ${report.totalScanned} increments`);
    lines.push(`Healthy: ${report.healthy.length}`);
    lines.push(`Desyncs Found: ${report.totalDesyncs} ⚠️`);
    lines.push(`Errors: ${report.errors.length}`);
    lines.push('');

    if (report.totalDesyncs > 0) {
      lines.push('━'.repeat(80));
      lines.push('DESYNCS DETECTED (CRITICAL!)');
      lines.push('━'.repeat(80));
      lines.push('');

      report.desyncs.forEach((desync) => {
        lines.push(`❌ ${desync.incrementId}`);
        lines.push(`   metadata.json: ${desync.metadataStatus}`);
        lines.push(`   spec.md:       ${desync.specStatus}`);
        lines.push('');
      });

      lines.push('Fix command: /specweave:sync-status');
      lines.push('');
    }

    if (report.errors.length > 0) {
      lines.push('━'.repeat(80));
      lines.push('ERRORS');
      lines.push('━'.repeat(80));
      lines.push('');

      report.errors.forEach((error) => {
        lines.push(`⚠️  ${error}`);
      });
      lines.push('');
    }

    if (report.totalDesyncs === 0 && report.errors.length === 0) {
      lines.push('✅ All increments healthy - no desyncs detected!');
      lines.push('');
    }

    lines.push('━'.repeat(80));

    return lines.join('\n');
  }
}
