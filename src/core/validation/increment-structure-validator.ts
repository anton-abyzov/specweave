import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Increment Structure Validator
 *
 * Enforces single source of truth principle by preventing duplicate task files
 * and validating increment directory structure.
 *
 * Critical Rules:
 * 1. Only ONE tasks.md file per increment (no tasks-detailed.md, tasks-final.md, etc.)
 * 2. Only core files allowed at root: spec.md, plan.md, tasks.md, metadata.json, README.md
 * 3. Supporting files go in subdirectories: reports/, scripts/, logs/, diagrams/
 * 4. Unknown root-level files are rejected
 *
 * Usage:
 * ```typescript
 * const result = await validateIncrementStructure('/path/to/increment');
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */

export interface IncrementStructureValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Allowed root-level files in an increment directory
 */
const ALLOWED_ROOT_FILES = new Set([
  'spec.md',
  'plan.md',
  'tasks.md',
  'metadata.json',
  'README.md'
]);

/**
 * Allowed subdirectories in an increment directory
 */
const ALLOWED_SUBDIRECTORIES = new Set([
  'reports',
  'scripts',
  'logs',
  'diagrams'
]);

/**
 * Validates increment directory structure
 *
 * @param incrementPath Absolute path to increment directory
 * @returns Validation result with errors and warnings
 */
export async function validateIncrementStructure(
  incrementPath: string
): Promise<IncrementStructureValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Read directory contents
    const entries = await fs.readdir(incrementPath, { withFileTypes: true });

    // CRITICAL: Check for duplicate task files
    const taskFileVariants = entries
      .filter(entry => entry.isFile())
      .filter(entry => entry.name.startsWith('tasks') && entry.name.endsWith('.md'))
      .map(entry => entry.name);

    if (taskFileVariants.length > 1) {
      errors.push(
        `❌ Duplicate task files detected: ${taskFileVariants.join(', ')}. ` +
        `Only ONE tasks.md allowed per increment. ` +
        `Move detailed breakdowns to reports/tasks-detailed.md instead.`
      );
    }

    // Check for unknown root-level files
    const rootFiles = entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name);

    const unknownFiles = rootFiles.filter(filename =>
      !ALLOWED_ROOT_FILES.has(filename) &&
      !(filename.startsWith('tasks') && filename.endsWith('.md'))
    );

    for (const filename of unknownFiles) {
      const suggestion = getSuggestionForUnknownFile(filename);
      errors.push(`❌ Unknown root-level file: ${filename}. ${suggestion}`);
    }

    // Check subdirectories (informational only, not strict)
    const subdirectories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    const unknownSubdirs = subdirectories.filter(
      dirname => !ALLOWED_SUBDIRECTORIES.has(dirname) && !dirname.startsWith('.')
    );

    for (const dirname of unknownSubdirs) {
      warnings.push(
        `⚠️  Unknown subdirectory: ${dirname}/. ` +
        `Consider using standard directories: reports/, scripts/, logs/, diagrams/`
      );
    }
  } catch (error) {
    errors.push(
      `❌ Failed to validate increment structure: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get suggestion for where to move unknown file
 *
 * @param filename The unknown file name
 * @returns Suggestion text
 */
function getSuggestionForUnknownFile(filename: string): string {
  const lowerFilename = filename.toLowerCase();

  if (lowerFilename.includes('report') || lowerFilename.includes('summary')) {
    return `Move to reports/ directory.`;
  }

  if (lowerFilename.includes('script') || lowerFilename.endsWith('.sh') || lowerFilename.endsWith('.bash')) {
    return `Move to scripts/ directory.`;
  }

  if (lowerFilename.includes('log') || lowerFilename.endsWith('.log')) {
    return `Move to logs/ directory.`;
  }

  if (lowerFilename.includes('diagram') || lowerFilename.endsWith('.mmd') || lowerFilename.endsWith('.puml')) {
    return `Move to diagrams/ directory.`;
  }

  if (lowerFilename.includes('analysis') || lowerFilename.includes('research')) {
    return `Move to reports/ directory.`;
  }

  // Default suggestion
  return `Move to reports/ directory or remove if not needed.`;
}

/**
 * Validates all increments in .specweave/increments/ directory
 *
 * @param specweaveRoot Path to .specweave directory
 * @returns Map of increment ID to validation result
 */
export async function validateAllIncrements(
  specweaveRoot: string
): Promise<Map<string, IncrementStructureValidationResult>> {
  const incrementsDir = path.join(specweaveRoot, 'increments');
  const results = new Map<string, IncrementStructureValidationResult>();

  try {
    const entries = await fs.readdir(incrementsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_')) {
        const incrementPath = path.join(incrementsDir, entry.name);
        const result = await validateIncrementStructure(incrementPath);
        results.set(entry.name, result);
      }
    }
  } catch (error) {
    // If increments directory doesn't exist, return empty map
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return results;
}

/**
 * Formats validation results for display
 *
 * @param results Map of increment ID to validation result
 * @returns Formatted string for console output
 */
export function formatValidationResults(
  results: Map<string, IncrementStructureValidationResult>
): string {
  const lines: string[] = [];

  let validIncrements = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const [incrementId, result] of results) {
    if (result.valid) {
      validIncrements++;
      continue;
    }

    lines.push(`\n📦 Increment: ${incrementId}`);

    if (result.errors.length > 0) {
      totalErrors += result.errors.length;
      lines.push('\n  Errors:');
      for (const error of result.errors) {
        lines.push(`    ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      totalWarnings += result.warnings.length;
      lines.push('\n  Warnings:');
      for (const warning of result.warnings) {
        lines.push(`    ${warning}`);
      }
    }
  }

  const totalIncrements = results.size;

  // Summary
  const summary = [
    '\n' + '='.repeat(80),
    `📊 Validation Summary`,
    `Total Increments: ${totalIncrements}`,
    `Valid: ${validIncrements}`,
    `Invalid: ${totalIncrements - validIncrements}`,
    `Total Errors: ${totalErrors}`,
    `Total Warnings: ${totalWarnings}`,
    '='.repeat(80)
  ];

  return [...summary, ...lines].join('\n');
}
