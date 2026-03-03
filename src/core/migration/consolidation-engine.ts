/**
 * Consolidation Engine
 *
 * Scans nested repo `.specweave/` directories for orphaned increments
 * and living docs, then consolidates them into the umbrella root.
 *
 * Used by `migrate-to-umbrella --consolidate` CLI command.
 *
 * @module core/migration/consolidation-engine
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * A planned move operation
 */
export interface ConsolidationMove {
  /** Source path (absolute) */
  from: string;
  /** Destination path (absolute) */
  to: string;
  /** Type of item being moved */
  type: 'increment' | 'living-doc';
}

/**
 * A planned deletion operation
 */
export interface ConsolidationDeletion {
  /** Path to delete (absolute) */
  path: string;
  /** Reason for deletion */
  reason: 'duplicate';
}

/**
 * Plan produced by scanForOrphans(), consumed by executeConsolidation()
 */
export interface ConsolidationPlan {
  moves: ConsolidationMove[];
  deletions: ConsolidationDeletion[];
}

/**
 * Scan nested repos for orphaned increments and living docs.
 *
 * For each `repositories/{org}/{repo}/.specweave/increments/{id}/`:
 * - If the same increment ID exists in umbrella root → schedule deletion (duplicate)
 * - If not → schedule move to umbrella root
 *
 * For each `repositories/{org}/{repo}/.specweave/docs/{...}`:
 * - Schedule move to umbrella root docs
 *
 * @param umbrellaRoot - Absolute path to umbrella root directory
 * @returns ConsolidationPlan with moves and deletions
 */
export async function scanForOrphans(umbrellaRoot: string): Promise<ConsolidationPlan> {
  const plan: ConsolidationPlan = { moves: [], deletions: [] };

  const reposDir = path.join(umbrellaRoot, 'repositories');
  if (!fs.existsSync(reposDir)) {
    return plan;
  }

  // Collect all nested repo paths: repositories/{org}/{repo}
  const nestedRepoPaths = collectNestedRepoPaths(reposDir);

  // Get umbrella root increment IDs for duplicate detection
  const umbrellaIncrementsDir = path.join(umbrellaRoot, '.specweave', 'increments');
  const umbrellaIncrementIds = listDirectoryNames(umbrellaIncrementsDir);

  for (const repoPath of nestedRepoPaths) {
    // Scan increments
    const nestedIncDir = path.join(repoPath, '.specweave', 'increments');
    if (fs.existsSync(nestedIncDir)) {
      const nestedIncrements = listDirectoryNames(nestedIncDir);
      for (const incName of nestedIncrements) {
        const nestedIncPath = path.join(nestedIncDir, incName);
        const umbrellaIncPath = path.join(umbrellaIncrementsDir, incName);

        if (umbrellaIncrementIds.has(incName)) {
          // Duplicate — schedule deletion of nested copy
          plan.deletions.push({
            path: nestedIncPath,
            reason: 'duplicate',
          });
        } else {
          // Orphan — schedule move
          plan.moves.push({
            from: nestedIncPath,
            to: umbrellaIncPath,
            type: 'increment',
          });
        }
      }
    }

    // Scan docs
    const nestedDocsDir = path.join(repoPath, '.specweave', 'docs');
    if (fs.existsSync(nestedDocsDir)) {
      const umbrellaDocsDir = path.join(umbrellaRoot, '.specweave', 'docs');
      scanDocsRecursive(nestedDocsDir, umbrellaDocsDir, plan);
    }
  }

  return plan;
}

/**
 * Execute a consolidation plan: move orphans and delete duplicates.
 *
 * @param plan - ConsolidationPlan from scanForOrphans()
 * @param _umbrellaRoot - Umbrella root path (reserved for future use)
 */
export async function executeConsolidation(
  plan: ConsolidationPlan,
  _umbrellaRoot: string,
): Promise<void> {
  // Execute moves
  for (const move of plan.moves) {
    // Ensure parent directory exists
    const parentDir = path.dirname(move.to);
    await fs.promises.mkdir(parentDir, { recursive: true });

    // Move via rename (same filesystem assumed for umbrella)
    await fs.promises.rename(move.from, move.to);
  }

  // Execute deletions
  for (const deletion of plan.deletions) {
    await fs.promises.rm(deletion.path, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Collect all nested repo paths under repositories/{org}/{repo}
 */
function collectNestedRepoPaths(reposDir: string): string[] {
  const repoPaths: string[] = [];

  try {
    const orgEntries = fs.readdirSync(reposDir, { withFileTypes: true });
    for (const orgEntry of orgEntries) {
      if (!orgEntry.isDirectory()) continue;
      const orgDir = path.join(reposDir, orgEntry.name);
      const repoEntries = fs.readdirSync(orgDir, { withFileTypes: true });
      for (const repoEntry of repoEntries) {
        if (!repoEntry.isDirectory()) continue;
        repoPaths.push(path.join(orgDir, repoEntry.name));
      }
    }
  } catch {
    // Ignore read errors
  }

  return repoPaths;
}

/**
 * List directory names (non-recursive) as a Set
 */
function listDirectoryNames(dirPath: string): Set<string> {
  const names = new Set<string>();
  if (!fs.existsSync(dirPath)) return names;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        names.add(entry.name);
      }
    }
  } catch {
    // Ignore read errors
  }

  return names;
}

/**
 * Recursively scan a nested docs directory for leaf directories to move.
 * Finds the deepest directories containing files and schedules moves.
 */
function scanDocsRecursive(
  nestedDocsDir: string,
  umbrellaDocsDir: string,
  plan: ConsolidationPlan,
): void {
  try {
    const entries = fs.readdirSync(nestedDocsDir, { withFileTypes: true });
    const hasFiles = entries.some(e => e.isFile());
    const subdirs = entries.filter(e => e.isDirectory());

    if (hasFiles) {
      // This directory has files — schedule move
      // umbrellaDocsDir already has the correct target path via recursion
      plan.moves.push({
        from: nestedDocsDir,
        to: umbrellaDocsDir,
        type: 'living-doc',
      });
      return; // Don't recurse further — moving the whole directory
    }

    // Recurse into subdirectories
    for (const subdir of subdirs) {
      scanDocsRecursive(
        path.join(nestedDocsDir, subdir.name),
        path.join(umbrellaDocsDir, subdir.name),
        plan,
      );
    }
  } catch {
    // Ignore read errors
  }
}
