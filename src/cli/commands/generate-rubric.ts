/**
 * Generate Rubric CLI Command (0865 AC-US1-02)
 *
 * Generates (or refreshes) the AC-tied quality contract `rubric.md` at the
 * increment ROOT from spec.md acceptance criteria. Idempotent: an existing
 * non-template rubric is left untouched unless `--refresh` is passed.
 *
 * Usage:
 *   specweave generate-rubric <increment-id>            # generate if missing/template
 *   specweave generate-rubric <increment-id> --refresh  # regenerate from current ACs
 *
 * @module cli/commands/generate-rubric
 */

import * as path from 'path';
import { findProjectRoot } from '../../utils/find-project-root.js';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import { ensureRubricFile } from '../../core/rubric/rubric-generator.js';

export interface GenerateRubricOptions {
  /** Overwrite an existing non-template rubric.md. */
  refresh?: boolean;
  /** Suppress stdout (JSON only / silent). */
  silent?: boolean;
}

export interface GenerateRubricResult {
  success: boolean;
  incrementId?: string;
  rubricPath?: string;
  written: boolean;
  message: string;
}

/**
 * CLI entry point for `specweave generate-rubric`.
 *
 * Resolves the increment, then idempotently ensures a non-template root
 * rubric.md exists. Returns a structured result; never throws on the normal
 * "increment not found" path.
 */
export async function generateRubricCommand(
  incrementId: string,
  options: GenerateRubricOptions = {},
): Promise<GenerateRubricResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return {
      success: false,
      written: false,
      message: 'Not in a SpecWeave project',
    };
  }

  const resolved = resolveIncrementId(incrementId, projectRoot);
  if (!resolved || Array.isArray(resolved)) {
    return {
      success: false,
      written: false,
      message: Array.isArray(resolved)
        ? `Ambiguous increment ID: ${incrementId} matches ${resolved.join(', ')}`
        : `Increment not found: ${incrementId}`,
    };
  }

  const incrementPath = path.join(projectRoot, '.specweave', 'increments', resolved);

  try {
    const result = await ensureRubricFile(resolved, incrementPath, {
      refresh: options.refresh,
    });
    const message = result.written
      ? `Generated rubric at ${result.rubricPath}`
      : result.skippedReason === 'exists-non-template'
        ? `Rubric already exists (use --refresh to regenerate): ${result.rubricPath}`
        : `No acceptance criteria found; rubric not generated`;

    if (!options.silent) {
      console.log(message);
    }

    return {
      success: true,
      incrementId: resolved,
      rubricPath: result.rubricPath,
      written: result.written,
      message,
    };
  } catch (error) {
    const message = `Failed to generate rubric: ${error instanceof Error ? error.message : String(error)}`;
    if (!options.silent) {
      console.error(message);
    }
    return { success: false, incrementId: resolved, written: false, message };
  }
}
