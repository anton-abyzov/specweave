/**
 * Session Warning CLI Command
 *
 * Displays a session restart warning when plugins were installed
 * during the current Claude Code session.
 *
 * Usage:
 *   specweave session-warning --plugins sw,sw-frontend --path /project/path
 *   specweave session-warning --plugins sw --acknowledge
 *
 * The command outputs a formatted warning message and returns a result
 * indicating whether execution should halt.
 *
 * @module cli/commands/session-warning
 */

import {
  formatRestartWarning,
  type RestartWarningOptions,
} from '../../core/session/restart-warning.js';
import {
  formatHandoffText,
  type HandoffContextOptions,
} from '../../core/session/handoff-context.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Arguments for the session-warning command
 */
export interface SessionWarningArgs {
  /** List of plugins that were installed */
  plugins: string[];
  /** Project path where installation occurred */
  projectPath?: string;
  /** Original user intent for context */
  originalIntent?: string;
  /** If true, display warning but don't halt */
  acknowledge?: boolean;
  /** Include plugin descriptions in output */
  includeDescriptions?: boolean;
  /** Include available skills list in output */
  includeSkillsList?: boolean;
}

/**
 * Result of running the session-warning command
 */
export interface SessionWarningResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** The formatted output to display */
  output: string;
  /** Whether execution should halt after displaying */
  shouldHalt: boolean;
  /** Marker string for hook detection */
  haltMarker?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Halt marker for hook detection */
const HALT_MARKER = '### SPECWEAVE_SESSION_RESTART_REQUIRED ###';

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Run the session-warning command
 *
 * Generates and returns the session restart warning output.
 * Does NOT actually print to stdout - caller is responsible for output.
 *
 * @param args - Command arguments
 * @returns Command result with output and halt indication
 *
 * @example
 * ```typescript
 * const result = runSessionWarningCommand({
 *   plugins: ['sw', 'sw-frontend'],
 *   projectPath: '/path/to/project',
 *   originalIntent: 'Create React dashboard'
 * });
 *
 * console.log(result.output);
 * if (result.shouldHalt) {
 *   process.exit(0);
 * }
 * ```
 */
export function runSessionWarningCommand(
  args: SessionWarningArgs
): SessionWarningResult {
  const {
    plugins,
    projectPath,
    originalIntent,
    acknowledge = false,
    includeDescriptions = true,
    includeSkillsList = true,
  } = args;

  // Handle empty plugins case - no warning needed
  if (!plugins || plugins.length === 0) {
    return {
      success: true,
      output: 'No plugins were installed.',
      shouldHalt: false,
    };
  }

  // Generate the warning output
  const warningOptions: RestartWarningOptions = {
    plugins,
    projectPath,
    originalIntent,
    includeDescriptions,
    includeSkillsList,
  };

  const warningResult = formatRestartWarning(warningOptions);

  // Build the complete output
  const outputParts: string[] = [];

  // Add the warning banner
  outputParts.push(warningResult.text);

  // Add handoff context if original intent provided
  if (originalIntent) {
    const handoffOptions: HandoffContextOptions = {
      plugins,
      projectPath,
      originalIntent,
    };
    const handoffText = formatHandoffText(handoffOptions);
    outputParts.push('\n');
    outputParts.push(handoffText);
  }

  // Add halt marker for hook detection
  const shouldHalt = !acknowledge && plugins.length > 0;
  if (shouldHalt) {
    outputParts.push('\n');
    outputParts.push(HALT_MARKER);
  }

  return {
    success: true,
    output: outputParts.join(''),
    shouldHalt,
    haltMarker: shouldHalt ? HALT_MARKER : undefined,
  };
}

/**
 * Format session warning output for display
 *
 * Convenience function that generates just the warning text
 * without running the full command.
 *
 * @param options - Warning options
 * @returns Formatted warning text
 *
 * @example
 * ```typescript
 * const output = formatSessionWarningOutput({
 *   plugins: ['sw'],
 *   projectPath: '/path/to/project'
 * });
 * console.log(output);
 * ```
 */
export function formatSessionWarningOutput(
  options: Omit<SessionWarningArgs, 'acknowledge'>
): string {
  const result = runSessionWarningCommand({
    ...options,
    acknowledge: true, // Don't include halt marker in formatted output
  });
  return result.output;
}

/**
 * CLI entry point for session-warning command
 *
 * Parses command line arguments and runs the session-warning command.
 * This is called from the main CLI when `specweave session-warning` is run.
 *
 * @param argv - Command line arguments (yargs format)
 */
export async function sessionWarningHandler(argv: {
  plugins?: string;
  path?: string;
  intent?: string;
  acknowledge?: boolean;
}): Promise<void> {
  // Parse plugins from comma-separated string
  const plugins = argv.plugins
    ? argv.plugins.split(',').map((p) => p.trim())
    : [];

  const result = runSessionWarningCommand({
    plugins,
    projectPath: argv.path,
    originalIntent: argv.intent,
    acknowledge: argv.acknowledge,
  });

  // Output the warning
  console.log(result.output);

  // Note: Actual process.exit() should be handled by the caller/hook
  // This function just returns, letting the CLI framework handle exit
}

/**
 * Check if halt marker is present in output
 *
 * Utility for hooks to detect if they should halt execution.
 *
 * @param output - Command output to check
 * @returns True if halt marker is present
 */
export function hasHaltMarker(output: string): boolean {
  return output.includes(HALT_MARKER);
}

/**
 * Get the halt marker string
 *
 * @returns The halt marker string used for detection
 */
export function getHaltMarker(): string {
  return HALT_MARKER;
}
