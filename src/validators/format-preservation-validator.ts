/**
 * Format Preservation Validator
 *
 * Validates sync operations to ensure external items maintain their original format.
 * Prevents unintended modifications to external item titles, descriptions, and ACs.
 *
 * Key validations:
 * - External items (format_preservation=true) → only comments allowed
 * - Internal items (format_preservation=false) → full sync allowed
 * - Title immutability for external items
 * - Description immutability for external items
 * - AC modifications blocked for external items
 *
 * Part of increment 0047-us-task-linkage (T-034C)
 */

import type { Logger } from '../utils/logger.js';
import { consoleLogger } from '../utils/logger.js';

/**
 * Sync operation to validate
 */
export interface SyncOperation {
  /** User Story ID (e.g., "US-009") */
  usId: string;

  /** Format preservation enabled flag */
  formatPreservation: boolean;

  /** Fields to update (e.g., ['title', 'description', 'comments']) */
  updates: string[];

  /** Origin (internal | external) */
  origin?: 'internal' | 'external';

  /** Proposed title change (if any) */
  proposedTitle?: string;

  /** Current title (for validation) */
  currentTitle?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation passed flag */
  valid: boolean;

  /** Validation errors */
  errors?: string[];

  /** Validation warnings (non-blocking) */
  warnings?: string[];

  /** Allowed fields (after filtering blocked fields) */
  allowedFields?: string[];

  /** Blocked fields */
  blockedFields?: string[];
}

/**
 * Format Preservation Validator
 *
 * Ensures external items maintain their original format during sync operations.
 */
export class FormatPreservationValidator {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Validate sync operation
   *
   * Checks if the proposed sync operation violates format preservation rules.
   *
   * Rules:
   * 1. External items (format_preservation=true) → ONLY comments allowed
   * 2. Title updates → BLOCKED for external items
   * 3. Description updates → BLOCKED for external items
   * 4. AC updates → BLOCKED for external items
   * 5. Status updates → ALLOWED (external tools control lifecycle)
   * 6. Comments → ALWAYS ALLOWED
   *
   * @param operation - Sync operation to validate
   * @returns Validation result
   */
  validate(operation: SyncOperation): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const blockedFields: string[] = [];
    const allowedFields: string[] = [];

    // Internal items → full sync allowed, no validation needed
    if (!operation.formatPreservation) {
      return {
        valid: true,
        allowedFields: operation.updates,
        blockedFields: []
      };
    }

    // External items → validate each field
    for (const field of operation.updates) {
      if (this.isBlockedField(field)) {
        blockedFields.push(field);
        errors.push(this.getBlockedFieldError(field, operation.usId));
      } else {
        allowedFields.push(field);
      }
    }

    // Validate title immutability (if title change proposed)
    if (operation.proposedTitle && operation.currentTitle) {
      if (operation.proposedTitle !== operation.currentTitle) {
        errors.push(
          `Title immutability violation for ${operation.usId}: ` +
          `Cannot change external item title from "${operation.currentTitle}" to "${operation.proposedTitle}"`
        );
      }
    }

    // Log validation result
    if (errors.length > 0) {
      this.logger.warn(`   ⚠️  Format preservation validation failed for ${operation.usId}:`);
      errors.forEach(err => this.logger.warn(`      - ${err}`));
    }

    if (warnings.length > 0) {
      warnings.forEach(warn => this.logger.warn(`   ⚠️  ${warn}`));
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      allowedFields,
      blockedFields
    };
  }

  /**
   * Check if field is blocked for external items
   *
   * @param field - Field name (e.g., 'title', 'description', 'comments')
   * @returns True if field is blocked for external items
   */
  private isBlockedField(field: string): boolean {
    const BLOCKED_FIELDS = [
      'title',
      'description',
      'acceptance_criteria',
      'acs',
      'body',
      'overview'
    ];

    return BLOCKED_FIELDS.includes(field.toLowerCase());
  }

  /**
   * Get error message for blocked field
   *
   * @param field - Blocked field name
   * @param usId - User Story ID
   * @returns Error message
   */
  private getBlockedFieldError(field: string, usId: string): string {
    const fieldName = field.toLowerCase();

    switch (fieldName) {
      case 'title':
        return `Cannot update title for ${usId} (external item with format preservation enabled). Original title must be preserved.`;

      case 'description':
      case 'body':
      case 'overview':
        return `Cannot update description/body for ${usId} (external item with format preservation enabled). Original description must be preserved.`;

      case 'acceptance_criteria':
      case 'acs':
        return `Cannot update acceptance criteria for ${usId} (external item with format preservation enabled). Original ACs must be preserved.`;

      default:
        return `Cannot update field "${field}" for ${usId} (external item with format preservation enabled).`;
    }
  }

  /**
   * Validate batch sync operations
   *
   * Validates multiple sync operations and returns results for each.
   *
   * @param operations - Array of sync operations
   * @returns Array of validation results
   */
  validateBatch(operations: SyncOperation[]): ValidationResult[] {
    return operations.map(op => this.validate(op));
  }

  /**
   * Quick check: Is sync allowed?
   *
   * Simplified validation that returns true/false without detailed errors.
   *
   * @param formatPreservation - Format preservation flag
   * @param proposedUpdates - Fields to update
   * @returns True if sync is allowed
   */
  isSyncAllowed(formatPreservation: boolean, proposedUpdates: string[]): boolean {
    // Internal items → always allowed
    if (!formatPreservation) {
      return true;
    }

    // External items → check if any blocked fields
    return !proposedUpdates.some(field => this.isBlockedField(field));
  }

  /**
   * Filter allowed fields from sync operation
   *
   * Returns only the fields that are allowed for the given operation.
   *
   * @param operation - Sync operation
   * @returns Array of allowed field names
   */
  filterAllowedFields(operation: SyncOperation): string[] {
    if (!operation.formatPreservation) {
      return operation.updates; // All fields allowed for internal items
    }

    // For external items, filter out blocked fields
    return operation.updates.filter(field => !this.isBlockedField(field));
  }

  /**
   * Get validation summary for logging
   *
   * @param result - Validation result
   * @returns Human-readable summary
   */
  getValidationSummary(result: ValidationResult): string {
    if (result.valid) {
      return `✅ Validation passed (${result.allowedFields?.length || 0} fields allowed)`;
    }

    const errorCount = result.errors?.length || 0;
    const warningCount = result.warnings?.length || 0;
    const blockedCount = result.blockedFields?.length || 0;

    return `❌ Validation failed: ${errorCount} error(s), ${warningCount} warning(s), ${blockedCount} field(s) blocked`;
  }
}
