/**
 * Increment Number Management Utility
 *
 * Provides centralized utilities for managing increment numbers across
 * all SpecWeave directories (main, _archive, _abandoned, _paused).
 *
 * Prevents increment number reuse when increments are moved to subdirectories.
 *
 * CRITICAL FIX (v0.30.21): Removed cache entirely to prevent duplicate IDs.
 * The cache was premature optimization that caused bugs. Scanning 4 directories
 * is fast enough (~5ms) and doesn't need caching.
 *
 * @module increment-utils
 * @since 0.18.3
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Centralized manager for increment number generation and validation.
 *
 * Scans ALL increment directories to ensure sequential numbering and
 * prevent duplicate increment IDs.
 *
 * @example
 * ```typescript
 * // Get next increment number
 * const nextId = IncrementNumberManager.getNextIncrementNumber();
 * console.log(nextId); // "0033"
 *
 * // Check if increment exists
 * const exists = IncrementNumberManager.incrementNumberExists("0032");
 * console.log(exists); // true
 * ```
 */
export class IncrementNumberManager {
  /**
   * Get the next available increment number across all directories.
   *
   * ALWAYS performs fresh filesystem scan to guarantee unique IDs.
   * No caching - simplicity over premature optimization.
   *
   * @param projectRoot - Project root directory (defaults to process.cwd())
   * @param _useCache - DEPRECATED: ignored, always scans fresh (kept for API compatibility)
   * @returns Next increment number as 4-digit string (e.g., "0033")
   *
   * @example
   * ```typescript
   * const nextId = IncrementNumberManager.getNextIncrementNumber();
   * // "0033" - always unique, always fresh scan
   * ```
   */
  static getNextIncrementNumber(
    projectRoot: string = process.cwd(),
    _useCache: boolean = true // Ignored - always fresh scan
  ): string {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    // ALWAYS scan fresh - no caching to prevent duplicate ID bugs
    const highestNumber = this.scanAllIncrementDirectories(incrementsDir);
    const nextNumber = highestNumber + 1;

    return String(nextNumber).padStart(4, '0');
  }

  /**
   * @deprecated No-op, kept for API compatibility. Cache was removed in v0.30.21.
   */
  static clearCache(): void {
    // No-op - cache removed
  }

  /**
   * Check if an increment number already exists in any directory.
   *
   * Scans all directories to determine if the given increment number
   * has already been used. Normalizes 3-digit IDs to 4-digit for comparison.
   *
   * @param incrementNumber - Increment number to check (string or number)
   * @param projectRoot - Project root directory (defaults to process.cwd())
   * @returns true if increment exists, false otherwise
   *
   * @example
   * ```typescript
   * IncrementNumberManager.incrementNumberExists("0032"); // true
   * IncrementNumberManager.incrementNumberExists(32);     // true
   * IncrementNumberManager.incrementNumberExists("9999"); // false
   * ```
   */
  static incrementNumberExists(
    incrementNumber: string | number,
    projectRoot: string = process.cwd()
  ): boolean {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    // Normalize to 4-digit string
    const normalizedNumber = String(incrementNumber).padStart(4, '0');

    // Directories to check
    const dirsToCheck = [
      incrementsDir,
      path.join(incrementsDir, '_archive'),
      path.join(incrementsDir, '_abandoned'),
      path.join(incrementsDir, '_paused')
    ];

    // Check each directory
    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          // Match pattern: 0032-name or 032-name
          const match = entry.name.match(/^(\d{3,4})-/);
          if (match) {
            const entryNumber = match[1].padStart(4, '0');
            if (entryNumber === normalizedNumber) {
              return true;
            }
          }
        }
      } catch (error) {
        // Permission denied or other error - continue
        continue;
      }
    }

    return false;
  }


  /**
   * Scan all increment directories and return highest number found.
   *
   * Scans these directories (in order):
   * 1. .specweave/increments/ (main)
   * 2. .specweave/increments/_archive/
   * 3. .specweave/increments/_abandoned/
   * 4. .specweave/increments/_paused/
   *
   * @param incrementsDir - Path to .specweave/increments directory
   * @returns Highest increment number found (0 if none exist)
   * @private
   */
  private static scanAllIncrementDirectories(incrementsDir: string): number {
    let highestNumber = 0;
    let scannedDirs = 0;
    let totalIncrements = 0;

    // Directories to scan
    const dirsToScan = [
      { path: incrementsDir, label: 'main' },
      { path: path.join(incrementsDir, '_archive'), label: '_archive' },
      { path: path.join(incrementsDir, '_abandoned'), label: '_abandoned' },
      { path: path.join(incrementsDir, '_paused'), label: '_paused' }
    ];

    // Scan each directory
    for (const { path: dirPath, label } of dirsToScan) {
      if (!fs.existsSync(dirPath)) continue;

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        scannedDirs++;

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          // Match pattern: 0032-name or 032-name
          const match = entry.name.match(/^(\d{3,4})-/);
          if (match) {
            totalIncrements++;
            const number = parseInt(match[1], 10);
            if (number > highestNumber) {
              highestNumber = number;
            }
          }
        }
      } catch (error) {
        // Permission denied or other error - log warning and continue
        console.warn(`Warning: Could not scan directory ${dirPath}:`, (error as Error).message);
        continue;
      }
    }

    // Validation: Detect scan anomalies
    if (highestNumber === 0 && scannedDirs > 0 && totalIncrements > 0) {
      // Found increments but highest is 0 - this should never happen
      throw new Error(
        `Scan anomaly detected: Found ${totalIncrements} increments but highest number is 0. ` +
        `This indicates a critical bug in increment number scanning.`
      );
    }

    return highestNumber;
  }
}
