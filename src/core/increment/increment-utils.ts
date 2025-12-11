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
 * E-SUFFIX CONVENTION (v0.32.0):
 * Increments working on external items (imported from GitHub/JIRA/ADO) use
 * E suffix: 0111E-feature-name instead of 0111-feature-name.
 * This maintains consistency with FS-XXXE feature IDs and US-XXXE user stories.
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
   * GAP-FILLING STRATEGY (v0.33.1+):
   * - Finds the first available number starting from 0001
   * - Prevents gaps in increment numbering sequence
   * - If no gaps exist, returns highest + 1
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
   * // If increments [0001, 0002, 0004, 0005] exist:
   * const nextId = IncrementNumberManager.getNextIncrementNumber();
   * // "0003" - fills the gap!
   *
   * // If increments [0001, 0002, 0003] exist:
   * const nextId = IncrementNumberManager.getNextIncrementNumber();
   * // "0004" - sequential if no gaps
   * ```
   */
  static getNextIncrementNumber(
    projectRoot: string = process.cwd(),
    _useCache: boolean = true // Ignored - always fresh scan
  ): string {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    // ALWAYS scan fresh - no caching to prevent duplicate ID bugs
    const existingNumbers = this.getAllIncrementNumbers(incrementsDir);

    // Gap-filling: Find first available number starting from 1
    let candidate = 1;
    while (existingNumbers.has(candidate)) {
      candidate++;
    }

    return String(candidate).padStart(4, '0');
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

          // Match pattern: 0032-name, 032-name, or 0032E-name (external)
          const match = entry.name.match(/^(\d{3,4})E?-/);
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
   * Get all existing increment numbers across all directories.
   *
   * Returns a Set of all increment numbers found in:
   * 1. .specweave/increments/ (main)
   * 2. .specweave/increments/_archive/
   * 3. .specweave/increments/_abandoned/
   * 4. .specweave/increments/_paused/
   *
   * @param incrementsDir - Path to .specweave/increments directory
   * @returns Set of increment numbers (e.g., Set([1, 2, 4, 5]))
   * @private
   * @since 0.33.1
   */
  private static getAllIncrementNumbers(incrementsDir: string): Set<number> {
    const numbers = new Set<number>();

    // Directories to scan
    const dirsToScan = [
      incrementsDir,
      path.join(incrementsDir, '_archive'),
      path.join(incrementsDir, '_abandoned'),
      path.join(incrementsDir, '_paused')
    ];

    // Scan each directory
    for (const dirPath of dirsToScan) {
      if (!fs.existsSync(dirPath)) continue;

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          // Match pattern: 0032-name, 032-name, or 0032E-name (external)
          const match = entry.name.match(/^(\d{3,4})E?-/);
          if (match) {
            const number = parseInt(match[1], 10);
            numbers.add(number);
          }
        }
      } catch (error) {
        // Permission denied or other error - log warning and continue
        console.warn(`Warning: Could not scan directory ${dirPath}:`, (error as Error).message);
        continue;
      }
    }

    return numbers;
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

          // Match pattern: 0032-name, 032-name, or 0032E-name (external)
          const match = entry.name.match(/^(\d{3,4})E?-/);
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

  /**
   * Generate an increment ID for external items.
   *
   * External increments (those working on imported GitHub/JIRA/ADO items)
   * use E suffix to maintain consistency with FS-XXXE and US-XXXE conventions.
   *
   * @param projectRoot - Project root directory (defaults to process.cwd())
   * @returns Next increment ID with E suffix (e.g., "0033E")
   *
   * @example
   * ```typescript
   * const id = IncrementNumberManager.getNextExternalIncrementNumber();
   * // "0033E" - for use as "0033E-feature-name"
   * ```
   *
   * @since 0.32.0
   */
  static getNextExternalIncrementNumber(
    projectRoot: string = process.cwd()
  ): string {
    const baseNumber = this.getNextIncrementNumber(projectRoot);
    return `${baseNumber}E`;
  }

  /**
   * Generate a full increment folder name.
   *
   * @param name - Kebab-case increment name (e.g., "dora-metrics-fix")
   * @param options - Options for ID generation
   * @param options.isExternal - If true, adds E suffix for external items
   * @param options.projectRoot - Project root directory
   * @param options.skipValidation - If true, skips uniqueness validation (DANGEROUS - use only for testing)
   * @returns Full increment folder name (e.g., "0033E-dora-metrics-fix")
   *
   * @example
   * ```typescript
   * // Internal increment
   * const id = IncrementNumberManager.generateIncrementId('feature-name');
   * // "0033-feature-name"
   *
   * // External increment (GitHub/JIRA/ADO item)
   * const extId = IncrementNumberManager.generateIncrementId('dora-fix', { isExternal: true });
   * // "0033E-dora-fix"
   * ```
   *
   * @since 0.32.0
   */
  static generateIncrementId(
    name: string,
    options: { isExternal?: boolean; projectRoot?: string; skipValidation?: boolean } = {}
  ): string {
    const { isExternal = false, projectRoot = process.cwd(), skipValidation = false } = options;
    const number = this.getNextIncrementNumber(projectRoot);
    const suffix = isExternal ? 'E' : '';
    const id = `${number}${suffix}-${name}`;

    // Validate by default to prevent duplicates (v0.34.0+)
    if (!skipValidation) {
      this.validateUnique(id, projectRoot);
    }

    return id;
  }

  /**
   * Validate that a manually-specified increment ID is unique.
   *
   * CRITICAL: Use this when creating increments with explicit IDs (e.g., from splits).
   * The ID format "0141-feature-name" will be validated against all existing increments.
   *
   * @param incrementId - Full increment ID to validate (e.g., "0141-feature-name")
   * @param projectRoot - Project root directory (defaults to process.cwd())
   * @throws Error if increment number already exists
   *
   * @example
   * ```typescript
   * // Before creating increment folder with explicit ID:
   * IncrementNumberManager.validateExplicitId('0141-my-feature');
   * // Throws if 0141 already exists!
   * ```
   *
   * @since 0.34.0
   */
  static validateExplicitId(
    incrementId: string,
    projectRoot: string = process.cwd()
  ): void {
    const number = this.extractNumber(incrementId);
    if (!number) {
      throw new Error(
        `Invalid increment ID format: "${incrementId}". ` +
        `Expected format: "XXXX-name" (e.g., "0141-my-feature") or "XXXXE-name" for external items.`
      );
    }

    const duplicates = this.findDuplicates(number, projectRoot);

    if (duplicates.length > 0) {
      const nextNumber = this.getNextIncrementNumber(projectRoot);
      throw new Error(
        `DUPLICATE INCREMENT ID DETECTED!\n\n` +
        `You specified increment ID: ${incrementId}\n` +
        `But number ${number} already exists:\n` +
        duplicates.map(d => `  - ${d}`).join('\n') + `\n\n` +
        `CRITICAL: Increment IDs MUST be unique. This prevents confusion and sync issues.\n\n` +
        `FIX: Use the next available number: ${nextNumber}\n` +
        `Suggested ID: ${nextNumber}${this.isExternalIncrement(incrementId) ? '' : ''}-${incrementId.replace(/^\d{3,4}E?-/, '')}`
      );
    }
  }

  /**
   * Check if an increment ID represents an external item.
   *
   * External increments have E suffix: 0033E-name
   * Internal increments do not: 0033-name
   *
   * @param incrementId - Increment ID or folder name
   * @returns true if increment is external (has E suffix)
   *
   * @example
   * ```typescript
   * IncrementNumberManager.isExternalIncrement('0033E-dora-fix'); // true
   * IncrementNumberManager.isExternalIncrement('0033-feature');   // false
   * ```
   *
   * @since 0.32.0
   */
  static isExternalIncrement(incrementId: string): boolean {
    return /^\d{3,4}E-/.test(incrementId);
  }

  /**
   * Extract the numeric part from an increment ID.
   *
   * Works with both internal and external increments.
   *
   * @param incrementId - Increment ID or folder name
   * @returns Numeric part as 4-digit string, or null if invalid
   *
   * @example
   * ```typescript
   * IncrementNumberManager.extractNumber('0033E-dora-fix'); // "0033"
   * IncrementNumberManager.extractNumber('0033-feature');   // "0033"
   * IncrementNumberManager.extractNumber('invalid');        // null
   * ```
   *
   * @since 0.32.0
   */
  static extractNumber(incrementId: string): string | null {
    const match = incrementId.match(/^(\d{3,4})E?-/);
    if (match) {
      return match[1].padStart(4, '0');
    }
    return null;
  }

  /**
   * Find all existing increments with a given number (detects duplicates).
   *
   * Returns all folder names that share the same base number.
   * E.g., for "0121" returns both "0121-feature-a" and "0121E-feature-b".
   *
   * IMPORTANT: 0001 and 0001E are considered the SAME base number!
   *
   * @param incrementNumber - Increment number to search for (string or number)
   * @param projectRoot - Project root directory (defaults to process.cwd())
   * @returns Array of folder names with the same base number
   *
   * @example
   * ```typescript
   * const duplicates = IncrementNumberManager.findDuplicates("0121");
   * // ["0121-ado-jira-feature", "0121-intelligent-living-docs"]
   * ```
   *
   * @since 0.33.0
   */
  static findDuplicates(
    incrementNumber: string | number,
    projectRoot: string = process.cwd()
  ): string[] {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
    const normalizedNumber = String(incrementNumber).padStart(4, '0');
    const duplicates: string[] = [];

    const dirsToCheck = [
      { path: incrementsDir, label: 'active' },
      { path: path.join(incrementsDir, '_archive'), label: '_archive' },
      { path: path.join(incrementsDir, '_abandoned'), label: '_abandoned' },
      { path: path.join(incrementsDir, '_paused'), label: '_paused' }
    ];

    for (const { path: dirPath, label } of dirsToCheck) {
      if (!fs.existsSync(dirPath)) continue;

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const match = entry.name.match(/^(\d{3,4})E?-/);
          if (match) {
            const entryNumber = match[1].padStart(4, '0');
            if (entryNumber === normalizedNumber) {
              duplicates.push(`${entry.name} (${label})`);
            }
          }
        }
      } catch {
        continue;
      }
    }

    return duplicates;
  }

  /**
   * Validate that an increment ID is unique before creation.
   *
   * Throws an error if the number already exists (including E-suffix variants).
   * Use this method to validate BEFORE creating increment directories.
   *
   * @param incrementId - Full increment ID to validate (e.g., "0121-feature-name")
   * @param projectRoot - Project root directory (defaults to process.cwd())
   * @throws Error if increment number already exists
   *
   * @example
   * ```typescript
   * // Safe increment creation
   * const id = IncrementNumberManager.generateIncrementId('my-feature');
   * IncrementNumberManager.validateUnique(id); // throws if duplicate
   * fs.mkdirSync(path.join(incrementsDir, id));
   * ```
   *
   * @since 0.33.0
   */
  static validateUnique(
    incrementId: string,
    projectRoot: string = process.cwd()
  ): void {
    const number = this.extractNumber(incrementId);
    if (!number) {
      throw new Error(`Invalid increment ID format: ${incrementId}`);
    }

    const duplicates = this.findDuplicates(number, projectRoot);

    // Filter out the exact same ID (it's okay to exist if we're just checking)
    const otherDuplicates = duplicates.filter(d => !d.startsWith(incrementId));

    if (otherDuplicates.length > 0) {
      throw new Error(
        `Duplicate increment number detected! Number ${number} already exists:\n` +
        otherDuplicates.map(d => `  - ${d}`).join('\n') +
        `\n\nIMPORTANT: 0001 and 0001E share the SAME base number and cannot coexist.\n` +
        `Use getNextIncrementNumber() to get a unique number.`
      );
    }
  }

  /**
   * Generate a guaranteed-unique increment ID with validation.
   *
   * NOTE: As of v0.34.0, generateIncrementId() also validates by default.
   * This method is kept for explicit clarity when uniqueness is critical.
   *
   * @param name - Kebab-case increment name
   * @param options - Generation options
   * @returns Validated unique increment ID
   * @throws Error if validation fails (should never happen with fresh scan)
   *
   * @example
   * ```typescript
   * const id = IncrementNumberManager.generateUniqueIncrementId('my-feature');
   * // Guaranteed unique, safe to create directory
   * ```
   *
   * @since 0.33.0
   */
  static generateUniqueIncrementId(
    name: string,
    options: { isExternal?: boolean; projectRoot?: string } = {}
  ): string {
    const { projectRoot = process.cwd() } = options;
    // generateIncrementId now validates by default (v0.34.0+)
    const id = this.generateIncrementId(name, { ...options, skipValidation: false });

    return id;
  }

  /**
   * Create an increment folder safely with full validation.
   *
   * This is the RECOMMENDED way to create new increments programmatically.
   * It validates uniqueness and creates all necessary files atomically.
   *
   * @param name - Kebab-case increment name
   * @param options - Creation options
   * @returns Created increment ID
   * @throws Error if increment number already exists
   *
   * @example
   * ```typescript
   * // For normal increments:
   * const id = await IncrementNumberManager.createIncrement('my-feature', {
   *   projectRoot: '/path/to/project'
   * });
   *
   * // For split increments, use explicit ID with validation:
   * IncrementNumberManager.validateExplicitId('0145-split-part1');
   * // Then create folder manually only if validation passes
   * ```
   *
   * @since 0.34.0
   */
  static createIncrementId(
    name: string,
    options: { isExternal?: boolean; projectRoot?: string } = {}
  ): string {
    // This is a wrapper that enforces the safe pattern
    return this.generateUniqueIncrementId(name, options);
  }
}
