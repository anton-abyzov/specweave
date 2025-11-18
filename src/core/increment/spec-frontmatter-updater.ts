/**
 * SpecFrontmatterUpdater - Update spec.md YAML frontmatter
 *
 * Implements atomic updates to spec.md frontmatter while preserving all other fields.
 * Used to keep spec.md in sync with metadata.json during status transitions.
 *
 * Task: T-001
 * Increment: 0043-spec-md-desync-fix
 * User Stories: US-002
 * Acceptance Criteria: AC-US2-01, AC-US2-04
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { IncrementStatus } from '../types/increment-metadata.js';

/**
 * Error thrown when spec.md frontmatter update fails
 */
export class SpecUpdateError extends Error {
  constructor(
    message: string,
    public incrementId: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SpecUpdateError';
    Object.setPrototypeOf(this, SpecUpdateError.prototype);
  }
}

/**
 * SpecFrontmatterUpdater - Manages spec.md YAML frontmatter updates
 *
 * Key Features:
 * - Atomic updates (temp file → rename pattern)
 * - Preserves all existing frontmatter fields
 * - Validates status against IncrementStatus enum
 * - Thread-safe writes
 *
 * Usage:
 * ```typescript
 * await SpecFrontmatterUpdater.updateStatus('0001-test', IncrementStatus.COMPLETED);
 * ```
 */
export class SpecFrontmatterUpdater {
  /**
   * Update spec.md YAML frontmatter status field
   *
   * Performs atomic update using temp file → rename pattern to prevent partial writes.
   * Preserves all other frontmatter fields.
   *
   * @param incrementId - Increment ID (e.g., "0001-test-increment")
   * @param status - New status value (must be valid IncrementStatus enum)
   * @throws {SpecUpdateError} If update fails or status invalid
   *
   * @example
   * ```typescript
   * await SpecFrontmatterUpdater.updateStatus('0001-test', IncrementStatus.COMPLETED);
   * ```
   *
   * AC-US2-01: Updates both metadata.json AND spec.md frontmatter
   * AC-US2-03: All status transitions update spec.md
   * AC-US2-04: Status field matches IncrementStatus enum values exactly
   */
  static async updateStatus(
    incrementId: string,
    status: IncrementStatus
  ): Promise<void> {
    try {
      // Validate status is valid enum value
      if (!Object.values(IncrementStatus).includes(status)) {
        throw new SpecUpdateError(
          `Invalid status value: "${status}". Must be one of: ${Object.values(IncrementStatus).join(', ')}`,
          incrementId
        );
      }

      // Build spec.md path
      const specPath = path.join(
        process.cwd(),
        '.specweave',
        'increments',
        incrementId,
        'spec.md'
      );

      // Check if spec.md exists
      if (!(await fs.pathExists(specPath))) {
        throw new SpecUpdateError(
          `spec.md not found for increment ${incrementId}`,
          incrementId
        );
      }

      // Read spec.md content
      const content = await fs.readFile(specPath, 'utf-8');

      // Parse YAML frontmatter using gray-matter
      const parsed = matter(content);

      // Update status field (preserves all other fields)
      parsed.data.status = status;

      // Stringify updated content
      const updatedContent = matter.stringify(parsed.content, parsed.data);

      // Atomic write: temp file → rename
      const tempPath = `${specPath}.tmp`;
      await fs.writeFile(tempPath, updatedContent, 'utf-8');
      await fs.rename(tempPath, specPath);

      // Success - spec.md updated atomically
    } catch (error) {
      if (error instanceof SpecUpdateError) {
        throw error;
      }

      throw new SpecUpdateError(
        `Failed to update spec.md for increment ${incrementId}: ${error instanceof Error ? error.message : String(error)}`,
        incrementId,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Read current status from spec.md frontmatter
   *
   * @param incrementId - Increment ID
   * @returns Current status value or null if missing
   *
   * AC-US2-02: Desync detection reads both files
   * AC-US2-04: Validates status is valid enum value
   */
  static async readStatus(incrementId: string): Promise<IncrementStatus | null> {
    try {
      // Build spec.md path
      const specPath = path.join(
        process.cwd(),
        '.specweave',
        'increments',
        incrementId,
        'spec.md'
      );

      // Check if spec.md exists
      if (!(await fs.pathExists(specPath))) {
        return null;
      }

      // Read and parse spec.md frontmatter
      const content = await fs.readFile(specPath, 'utf-8');
      const parsed = matter(content);

      // Extract status field
      const status = parsed.data.status;

      if (!status) {
        return null;
      }

      // Validate status is valid enum value
      if (!Object.values(IncrementStatus).includes(status as IncrementStatus)) {
        throw new SpecUpdateError(
          `Invalid status value in spec.md: "${status}". Must be one of: ${Object.values(IncrementStatus).join(', ')}`,
          incrementId
        );
      }

      return status as IncrementStatus;
    } catch (error) {
      if (error instanceof SpecUpdateError) {
        throw error;
      }

      throw new SpecUpdateError(
        `Failed to read status from spec.md for increment ${incrementId}: ${error instanceof Error ? error.message : String(error)}`,
        incrementId,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate spec.md frontmatter status field
   *
   * @param incrementId - Increment ID
   * @returns true if validation passes
   * @throws {SpecUpdateError} If status invalid or missing
   *
   * AC-US2-02: Validation detects desyncs
   * AC-US2-04: Validates status matches IncrementStatus enum
   */
  static async validate(incrementId: string): Promise<boolean> {
    const status = await this.readStatus(incrementId);

    if (status === null) {
      throw new SpecUpdateError(
        `spec.md missing status field or file not found for increment ${incrementId}`,
        incrementId
      );
    }

    // If readStatus() succeeded, status is valid
    return true;
  }
}
