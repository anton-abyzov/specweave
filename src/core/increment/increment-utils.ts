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
import { findNextAvailableIdForProject } from '../../utils/feature-id-collision.js';

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
   * Get the next available increment number that won't collide in the target project's feature ID space.
   *
   * PER-PROJECT COLLISION PREVENTION (v1.0.19+):
   * - First gets candidate from global increment pool (gap-filling)
   * - Then checks if that number would collide with existing FS-IDs in the target project
   * - If collision (FS-XXX or FS-XXXE exists), finds next available number
   *
   * This prevents the scenario where:
   * - Project ec-web-ui has external import FS-001E
   * - User creates internal increment 0001-feature → would derive to FS-001
   * - But FS-001 collides with FS-001E (same base number in unified sequence)
   *
   * @param projectRoot - Project root directory
   * @param projectId - Target project ID (from spec.md **Project**: field or config)
   * @param options - Additional options
   * @param options.isExternal - If true, checks for external collision (FS-XXXE)
   * @returns Next increment number as 4-digit string that won't collide in the project
   *
   * @example
   * ```typescript
   * // Project 'ec-web-ui' has FS-001E (from external import)
   * const nextId = IncrementNumberManager.getNextIncrementNumberForProject(
   *   process.cwd(),
   *   'ec-web-ui'
   * );
   * // Returns "0002" (skips 0001 because FS-001E exists)
   * ```
   *
   * @since 1.0.19
   */
  static getNextIncrementNumberForProject(
    projectRoot: string,
    projectId: string,
    options: { isExternal?: boolean } = {}
  ): string {
    // 1. Get candidate from global increment pool (existing gap-filling logic)
    const candidate = parseInt(this.getNextIncrementNumber(projectRoot), 10);

    // 2. Check per-project feature ID collision across ALL locations
    // For 2-level structures (JIRA boards, ADO area paths), this scans:
    // - specs/{project}/FS-XXX (1-level)
    // - specs/{board}/{project}/FS-XXX (2-level)
    // Returns the first available number that doesn't conflict with any existing FS-ID
    const specsPath = path.join(projectRoot, '.specweave/docs/internal/specs');
    const safeNumber = findNextAvailableIdForProject(candidate, specsPath, projectId);

    return String(safeNumber).padStart(4, '0');
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
   * Reserved names that CANNOT be used as increment IDs.
   * These names are reserved for SpecWeave internal use and would cause
   * structural violations if used as increment names.
   *
   * @since 1.0.105
   * @private
   */
  private static readonly RESERVED_INCREMENT_NAMES = [
    'reports',
    'backup',
    'backups',
    'temp',
    'tmp',
    'logs',
    'scripts',
    'docs',
    'documentation',
    'archive',
    'abandoned',
    'paused',
    'config',
    'cache',
    'state'
  ];

  /**
   * Get all existing increment numbers across all directories.
   *
   * CRITICAL COLLISION PREVENTION (v1.0.42):
   * Both internal (0001-xxx) and external (0001E-xxx) increments share
   * the SAME numeric namespace. This function extracts the BASE number
   * from both variants to ensure:
   * - If 0001E-external exists → 0001-internal is BLOCKED (returns 0002)
   * - If 0001-internal exists → 0001E-external is BLOCKED (returns 0002E)
   *
   * RESERVED NAME VALIDATION (v1.0.105):
   * Folders using reserved names like "reports", "backup", "temp" are
   * REJECTED and logged as errors. This prevents pollution of the
   * increments directory with folders that should not exist there.
   *
   * Returns a Set of all increment numbers found in:
   * 1. .specweave/increments/ (main)
   * 2. .specweave/increments/_archive/
   * 3. .specweave/increments/_abandoned/
   * 4. .specweave/increments/_paused/
   *
   * @param incrementsDir - Path to .specweave/increments directory
   * @returns Set of BASE increment numbers (e.g., Set([1, 2, 4, 5]))
   *          Note: Both 0001-xxx and 0001E-xxx contribute "1" to this set
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

          // **CRITICAL VALIDATION (v1.0.103)**: Reject invalid increment IDs
          // 1. Must start with digits (XXXX-name format)
          // 2. Cannot be 0000 (must be positive: 0001+)
          // 3. No non-numeric prefixes (reject .specweave, _templates, etc.)
          // 4. **NEW (v1.0.105)**: Cannot use reserved names (reports, backup, temp, etc.)

          // Match pattern: 0032-name, 032-name, or 0032E-name (external)
          // CRITICAL: Extract BASE number - both 0001 and 0001E → 1
          const match = entry.name.match(/^(\d{3,4})E?-/);
          if (match) {
            const number = parseInt(match[1], 10);

            // **VALIDATION**: Reject 0000 - increment numbers must be positive (0001+)
            if (number === 0) {
              console.warn(`⚠️  INVALID INCREMENT ID: ${entry.name} - Increment numbers must start from 0001, not 0000`);
              continue; // Skip this invalid increment
            }

            numbers.add(number);
          } else {
            // **VALIDATION**: Warn about non-standard increment folder names
            // Valid: XXXX-name, XXXE-name
            // Invalid: .specweave, _templates, 0000-adhoc, reports, backup, etc.
            if (!entry.name.startsWith('_')) { // Ignore system folders like _archive
              // **NEW (v1.0.105)**: Check for reserved names
              const folderName = entry.name.toLowerCase();
              if (this.RESERVED_INCREMENT_NAMES.includes(folderName)) {
                console.error(
                  `🚨 RESERVED NAME VIOLATION: "${entry.name}" is a RESERVED name!\n` +
                  `   Location: ${dirPath}\n` +
                  `   This folder MUST be removed or renamed.\n` +
                  `   Reserved names: ${this.RESERVED_INCREMENT_NAMES.join(', ')}\n` +
                  `   FIX: Increments must follow XXXX-name format (e.g., 0001-my-feature)`
                );
              } else {
                console.warn(`⚠️  NON-STANDARD INCREMENT FOLDER: ${entry.name} - Must follow XXXX-name format (4 digits + hyphen + name)`);
              }
            }
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
   * Validate that an increment number is valid (must be >= 0001, never 0000).
   *
   * CRITICAL VALIDATION (v1.0.104):
   * Increment numbers MUST start from 0001. 0000 is PERMANENTLY FORBIDDEN.
   * This prevents structural violations and invalid increment creation.
   *
   * @param number - Increment number to validate (4-digit string)
   * @throws Error if number is 0000
   *
   * @example
   * ```typescript
   * IncrementNumberManager.validateIncrementNumber('0001'); // OK
   * IncrementNumberManager.validateIncrementNumber('0042'); // OK
   * IncrementNumberManager.validateIncrementNumber('0000'); // THROWS ERROR
   * ```
   *
   * @since 1.0.104
   * @private
   */
  private static validateIncrementNumber(number: string): void {
    const numericValue = parseInt(number, 10);
    if (numericValue === 0) {
      throw new Error(
        `🚨 INVALID INCREMENT NUMBER: 0000 is FORBIDDEN!\n\n` +
        `Increment numbers MUST start from 0001, never 0000.\n\n` +
        `REASON: 0000 violates SpecWeave increment structure requirements.\n` +
        `  - Increments must have spec.md, tasks.md, and metadata.json\n` +
        `  - 0000 is reserved and should never be created\n` +
        `  - All increments must follow sequential numbering from 0001+\n\n` +
        `FIX: The next available increment number will be used automatically.\n` +
        `If you're seeing this error from a script, the script needs to be fixed\n` +
        `to use proper increment creation APIs instead of raw filesystem operations.`
      );
    }
  }

  /**
   * Validate that an increment name is not a reserved keyword.
   *
   * CRITICAL VALIDATION (v1.0.105):
   * Increment names CANNOT use reserved keywords like "reports", "backup", "temp".
   * These names are reserved for SpecWeave internal use and would cause
   * structural violations if used as increment names.
   *
   * @param name - Increment name to validate (kebab-case)
   * @throws Error if name is reserved
   *
   * @example
   * ```typescript
   * IncrementNumberManager.validateIncrementName('my-feature'); // OK
   * IncrementNumberManager.validateIncrementName('reports');    // THROWS ERROR
   * IncrementNumberManager.validateIncrementName('backup');     // THROWS ERROR
   * ```
   *
   * @since 1.0.105
   * @private
   */
  private static validateIncrementName(name: string): void {
    const normalizedName = name.toLowerCase();
    if (this.RESERVED_INCREMENT_NAMES.includes(normalizedName)) {
      throw new Error(
        `🚨 RESERVED NAME VIOLATION: "${name}" is a RESERVED name!\n\n` +
        `Increment names CANNOT use reserved keywords like:\n` +
        `  ${this.RESERVED_INCREMENT_NAMES.join(', ')}\n\n` +
        `REASON: These names are reserved for SpecWeave internal use.\n` +
        `  - "reports" → Used for increment report folders\n` +
        `  - "backup" → Used for backup storage\n` +
        `  - "temp" → Used for temporary files\n` +
        `  - "logs" → Used for execution logs\n` +
        `  - etc.\n\n` +
        `FIX: Choose a different increment name that describes your feature.\n` +
        `Example: Instead of "reports", use "reporting-feature" or "report-generation"\n` +
        `Example: Instead of "backup", use "backup-system" or "data-backup-feature"`
      );
    }
  }

  /**
   * Generate a full increment folder name.
   *
   * @param name - Kebab-case increment name (e.g., "dora-metrics-fix")
   * @param options - Options for ID generation
   * @param options.isExternal - If true, adds E suffix for external items
   * @param options.projectRoot - Project root directory
   * @param options.projectId - Target project ID for per-project collision prevention (v1.0.19+)
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
   *
   * // With per-project collision prevention (v1.0.19+)
   * // If project 'ec-web-ui' has FS-001E, this returns "0002-feature" instead of "0001-feature"
   * const safeId = IncrementNumberManager.generateIncrementId('feature', { projectId: 'ec-web-ui' });
   * ```
   *
   * @since 0.32.0
   */
  static generateIncrementId(
    name: string,
    options: { isExternal?: boolean; projectRoot?: string; projectId?: string; skipValidation?: boolean } = {}
  ): string {
    const { isExternal = false, projectRoot = process.cwd(), projectId, skipValidation = false } = options;

    // 🚨 CRITICAL VALIDATION (v1.0.105): Block reserved names at creation time
    this.validateIncrementName(name);

    // PER-PROJECT COLLISION PREVENTION (v1.0.19+):
    // When projectId is provided, use project-scoped number generation
    // This checks the target project's FS-ID space and skips colliding numbers
    const number = projectId
      ? this.getNextIncrementNumberForProject(projectRoot, projectId, { isExternal })
      : this.getNextIncrementNumber(projectRoot);

    // 🚨 CRITICAL VALIDATION (v1.0.104): Block 0000 at creation time
    this.validateIncrementNumber(number);

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

    // 🚨 CRITICAL VALIDATION (v1.0.104): Block 0000 at validation time
    this.validateIncrementNumber(number);

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
