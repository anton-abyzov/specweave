import { consoleLogger } from './logger.js';

/**
 * Error Message Formatter
 *
 * Provides consistent error formatting across SpecWeave commands.
 * All error messages follow the same structure with emoji indicators,
 * clear descriptions, and actionable next steps.
 *
 * @module utils/error-formatter
 * @version 1.0.102
 */

/**
 * Error severity levels
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Formatted error message structure
 */
export interface FormattedError {
  /** Error title */
  title: string;
  /** Error description */
  description: string;
  /** Suggested next steps (optional) */
  suggestions?: string[];
  /** Related commands (optional) */
  relatedCommands?: string[];
  /** Example of correct usage (optional) */
  example?: string;
}

/**
 * Common error scenarios with formatted messages
 */
export const ERROR_MESSAGES = {
  // Increment errors
  INCREMENT_NOT_FOUND: (id: string): FormattedError => ({
    title: `Increment '${id}' not found`,
    description: `The increment directory does not exist or ID format is invalid.`,
    suggestions: [
      `Check if increment exists: ls .specweave/increments/ | grep "${id}"`,
      `Use 4-digit format: 0001, 0042, 0157 (not 1, 42, 157)`,
      `Create new increment: /sw:increment "description"`
    ],
    relatedCommands: ['/sw:status', '/sw:increment']
  }),

  SPEC_NOT_FOUND: (incrementId: string): FormattedError => ({
    title: 'spec.md not found',
    description: `Increment '${incrementId}' exists but has no spec.md file.`,
    suggestions: [
      `Create spec.md using: /sw:increment (for new increments)`,
      `Or manually create: .specweave/increments/${incrementId}/spec.md`
    ],
    relatedCommands: ['/sw:increment']
  }),

  // Skill routing errors
  WRONG_COMMAND_FOR_NEW_INCREMENT: (): FormattedError => ({
    title: '/sw:plan is for EXISTING increments only',
    description: 'You are trying to plan a new increment. Use /sw:increment instead.',
    suggestions: [
      `/sw:increment creates NEW increments from scratch`,
      `/sw:plan generates plan.md for EXISTING increments (with spec.md)`
    ],
    relatedCommands: ['/sw:increment'],
    example: `/sw:increment "Add user authentication"`
  }),

  WRONG_COMMAND_FOR_EXISTING_INCREMENT: (incrementId: string): FormattedError => ({
    title: '/sw:increment is for NEW increments',
    description: `Increment '${incrementId}' already exists. Use /sw:plan to generate plan.md.`,
    suggestions: [
      `/sw:plan ${incrementId} - Generate plan.md and tasks.md`,
      `/sw:do ${incrementId} - Start implementation`
    ],
    relatedCommands: ['/sw:plan', '/sw:do']
  }),

  INTERNAL_SKILL_DIRECT_CALL: (skillName: string, allowedCallers: string[]): FormattedError => ({
    title: `Cannot call internal skill '${skillName}' directly`,
    description: `This skill is internal-only and can only be invoked by specific commands.`,
    suggestions: [
      `Use one of these commands instead:`,
      ...allowedCallers.map(cmd => `  • ${cmd}`)
    ],
    relatedCommands: allowedCallers
  }),

  // Validation errors
  INVALID_INCREMENT_NUMBER: (provided: string, expected: string): FormattedError => ({
    title: 'Invalid increment number format',
    description: `Increment numbers must be 4 digits (e.g., ${expected}).`,
    suggestions: [
      `Use ${expected} for the next sequential increment`,
      `Format: 0001, 0042, 0157 (leading zeros required)`
    ]
  }),

  DUPLICATE_INCREMENT: (id: string): FormattedError => ({
    title: `Increment '${id}' already exists`,
    description: `An increment with this number already exists.`,
    suggestions: [
      `Check existing: /sw:status`,
      `Use next available number`,
      `Or specify different name: ${id}-alternative`
    ],
    relatedCommands: ['/sw:status', '/sw:fix-duplicates']
  }),

  // Status errors
  INVALID_STATUS_TRANSITION: (from: string, to: string): FormattedError => ({
    title: `Cannot transition from '${from}' to '${to}'`,
    description: `This status transition is not allowed by the workflow.`,
    suggestions: [
      `Valid transitions from ${from}:`,
      `Check /sw:workflow for status transition rules`
    ],
    relatedCommands: ['/sw:workflow', '/sw:status']
  }),

  INCREMENT_NOT_READY: (incrementId: string, reason: string): FormattedError => ({
    title: `Increment '${incrementId}' is not ready`,
    description: reason,
    suggestions: [
      `Check status: /sw:status ${incrementId}`,
      `View tasks: cat .specweave/increments/${incrementId}/tasks.md`,
      `Validate: /sw:validate ${incrementId}`
    ],
    relatedCommands: ['/sw:status', '/sw:validate']
  }),

  // General errors
  MISSING_REQUIRED_ARG: (argName: string, command: string): FormattedError => ({
    title: `Missing required argument: ${argName}`,
    description: `This argument is required but was not provided.`,
    suggestions: [
      `Usage: ${command} <${argName}>`,
      `Run '${command} --help' for more information`
    ]
  })
};

/**
 * Formats and logs an error message with consistent styling
 *
 * @param error - Formatted error object
 * @param severity - Error severity level (default: 'error')
 *
 * @example
 * ```typescript
 * formatError(ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042'));
 * ```
 */
export function formatError(error: FormattedError, severity: ErrorSeverity = 'error'): void {
  const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
  const logFn = severity === 'error' ? consoleLogger.error : severity === 'warning' ? consoleLogger.warn : consoleLogger.info;

  // Title
  logFn(`${icon} ${error.title}`);
  logFn('');

  // Description
  if (error.description) {
    logFn(error.description);
    logFn('');
  }

  // Suggestions
  if (error.suggestions && error.suggestions.length > 0) {
    logFn('💡 Suggestions:');
    error.suggestions.forEach(suggestion => {
      logFn(`   ${suggestion}`);
    });
    logFn('');
  }

  // Related commands
  if (error.relatedCommands && error.relatedCommands.length > 0) {
    logFn('📚 Related commands:');
    error.relatedCommands.forEach(cmd => {
      logFn(`   ${cmd}`);
    });
    logFn('');
  }

  // Example
  if (error.example) {
    logFn('📝 Example:');
    logFn(`   ${error.example}`);
    logFn('');
  }
}

/**
 * Quick helper to format and throw an error
 *
 * @param error - Formatted error object
 * @throws Error with formatted message
 *
 * @example
 * ```typescript
 * throwFormattedError(ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042'));
 * ```
 */
export function throwFormattedError(error: FormattedError): never {
  formatError(error, 'error');
  throw new Error(error.title);
}

/**
 * Format a simple error message (for custom errors not in ERROR_MESSAGES)
 *
 * @param title - Error title
 * @param description - Error description
 * @param suggestions - Optional suggestions
 *
 * @example
 * ```typescript
 * formatSimpleError('File not found', 'The file does not exist', ['Check the path']);
 * ```
 */
export function formatSimpleError(
  title: string,
  description: string,
  suggestions?: string[]
): void {
  formatError({
    title,
    description,
    suggestions
  });
}
