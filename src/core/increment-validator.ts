import { consoleLogger } from '../utils/logger.js';

/**
 * Result of increment number validation
 */
export interface IncrementValidationResult {
  /** Whether the increment number is valid */
  isValid: boolean;
  /** Warnings about the increment number */
  warnings: string[];
  /** Suggestions for better numbering */
  suggestions: string[];
  /** Expected sequential number */
  expectedNumber?: string;
  /** Number provided by user */
  providedNumber?: string;
}

/**
 * Parses an increment number from an increment ID.
 *
 * @param incrementId - Full increment ID (e.g., "0157-feature-name")
 * @returns Numeric value or null if invalid format
 *
 * @example
 * ```typescript
 * parseIncrementNumber("0157-feature-name") // => 157
 * parseIncrementNumber("invalid") // => null
 * ```
 */
export function parseIncrementNumber(incrementId: string): number | null {
  const match = incrementId.match(/^(\d{4})-/);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10);
}

/**
 * Validates an increment number against existing increments.
 *
 * Checks if the requested number is:
 * - Sequential (expected behavior)
 * - A forward jump (skips numbers)
 * - A backfill (fills gap in numbering)
 *
 * @param requestedNumber - Requested increment number (e.g., "0158")
 * @param existingIncrements - Array of existing increment IDs
 * @returns Validation result with warnings and suggestions
 *
 * @example
 * ```typescript
 * const result = validateIncrementNumber("0160", ["0157-feature", "0158-bug"]);
 * // result.warnings: ["Skipping 1 number (0159)"]
 * // result.suggestions: ["Consider using 0159 for better tracking"]
 * ```
 */
export function validateIncrementNumber(
  requestedNumber: string,
  existingIncrements: string[]
): IncrementValidationResult {
  // Parse all existing increment numbers
  const existingNumbers = existingIncrements
    .map(parseIncrementNumber)
    .filter((num): num is number => num !== null);

  // Find the highest existing number
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

  // Expected sequential number
  const expectedNumber = String(maxNumber + 1).padStart(4, '0');

  // Parse requested number
  const requestedNum = parseIncrementNumber(requestedNumber + '-placeholder');
  if (requestedNum === null) {
    return {
      isValid: false,
      warnings: ['Invalid increment number format. Must be 4 digits (e.g., 0157).'],
      suggestions: [`Use ${expectedNumber} for sequential numbering`],
      expectedNumber,
      providedNumber: requestedNumber
    };
  }

  // Check if it's the expected sequential number
  if (requestedNumber === expectedNumber) {
    return {
      isValid: true,
      warnings: [],
      suggestions: [],
      expectedNumber,
      providedNumber: requestedNumber
    };
  }

  // Check for duplicate
  if (existingNumbers.includes(requestedNum)) {
    return {
      isValid: false,
      warnings: [`Increment ${requestedNumber} already exists!`],
      suggestions: [`Use ${expectedNumber} for the next increment`],
      expectedNumber,
      providedNumber: requestedNumber
    };
  }

  // Check if it's a forward jump (skipping numbers)
  const isJump = requestedNum > maxNumber + 1;
  if (isJump) {
    const skippedCount = requestedNum - maxNumber - 1;
    const skippedRange =
      skippedCount === 1
        ? expectedNumber
        : `${expectedNumber} to ${String(requestedNum - 1).padStart(4, '0')}`;

    return {
      isValid: true,
      warnings: [`⚠️  Skipping ${skippedCount} number(s): ${skippedRange}`],
      suggestions: [
        `Consider using ${expectedNumber} for sequential tracking.`,
        'Non-sequential numbers can make it harder to track increment history.'
      ],
      expectedNumber,
      providedNumber: requestedNumber
    };
  }

  // It's a backfill (filling a gap)
  const isBackfill = requestedNum <= maxNumber;
  if (isBackfill) {
    return {
      isValid: true,
      warnings: [
        `⚠️  Using non-sequential number (expected: ${expectedNumber}, got: ${requestedNumber})`
      ],
      suggestions: [
        'This fills a gap in increment numbering.',
        'Ensure this is intentional (e.g., backfilling skipped numbers).'
      ],
      expectedNumber,
      providedNumber: requestedNumber
    };
  }

  // Should never reach here, but handle edge case
  return {
    isValid: true,
    warnings: [],
    suggestions: [],
    expectedNumber,
    providedNumber: requestedNumber
  };
}

/**
 * Logs increment validation results to console.
 *
 * @param result - Validation result from validateIncrementNumber
 */
export function logValidationResult(result: IncrementValidationResult): void {
  if (!result.isValid) {
    consoleLogger.error('❌ Increment Validation Failed');
    result.warnings.forEach(warning => consoleLogger.error(`   ${warning}`));
    result.suggestions.forEach(suggestion => consoleLogger.info(`   💡 ${suggestion}`));
    return;
  }

  if (result.warnings.length > 0) {
    consoleLogger.warn('⚠️  Increment Number Warning');
    result.warnings.forEach(warning => consoleLogger.warn(`   ${warning}`));
  }

  if (result.suggestions.length > 0) {
    result.suggestions.forEach(suggestion => consoleLogger.info(`   💡 ${suggestion}`));
  }

  if (result.warnings.length === 0 && result.suggestions.length === 0) {
    consoleLogger.info(`✅ Using sequential increment number: ${result.providedNumber}`);
  }
}
