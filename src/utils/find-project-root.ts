/**
 * Find Project Root Utility
 *
 * CRITICAL: This utility finds the SpecWeave project root by searching for .specweave directory.
 * Use this instead of process.cwd() when the working directory may not be the project root.
 *
 * Common scenarios where CWD != project root:
 * - Hooks executed from parent directory
 * - CI/CD pipelines with different working directories
 * - Background jobs spawned from different locations
 * - Multi-repo setups where scripts run from umbrella root
 *
 * @module utils/find-project-root
 */

import * as fs from 'fs';
import path from 'path';

/**
 * Find project root by searching for .specweave/config.json
 *
 * Walks up the directory tree from startDir until it finds a directory
 * containing .specweave/config.json. Requires config.json to distinguish
 * real projects from stale .specweave/ folders (created by runtime bugs).
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Project root path or null if not found
 *
 * @example
 * // From /projects/my-app/src/components
 * findProjectRoot()
 * // Returns: "/projects/my-app" (if .specweave/config.json exists there)
 *
 * @example
 * // No .specweave/config.json found anywhere in tree
 * findProjectRoot()
 * // Returns: null
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const specweavePath = path.join(current, '.specweave');
    if (
      fs.existsSync(specweavePath) &&
      fs.statSync(specweavePath).isDirectory() &&
      fs.existsSync(path.join(specweavePath, 'config.json'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * Get project root, falling back to CWD if not found
 *
 * This is the RECOMMENDED function to use in most cases.
 * It returns a valid path even if .specweave doesn't exist.
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Project root path or process.cwd() if not found
 *
 * @example
 * // .specweave exists
 * getProjectRoot() // Returns: "/projects/my-app"
 *
 * // .specweave doesn't exist
 * getProjectRoot() // Returns: process.cwd() (e.g., "/projects/my-app")
 */
export function getProjectRoot(startDir: string = process.cwd()): string {
  return findProjectRoot(startDir) || process.cwd();
}

/**
 * Check if current directory is within a SpecWeave project
 *
 * @param startDir - Directory to check (defaults to process.cwd())
 * @returns true if .specweave directory exists in tree
 */
export function isInsideSpecWeaveProject(startDir: string = process.cwd()): boolean {
  return findProjectRoot(startDir) !== null;
}

/**
 * Get SpecWeave directory path (.specweave folder)
 *
 * @param projectRoot - Project root (will search if not provided)
 * @returns Path to .specweave directory or null if not found
 */
export function getSpecWeaveDir(projectRoot?: string): string | null {
  const root = projectRoot || findProjectRoot();
  if (!root) return null;

  const specweavePath = path.join(root, '.specweave');
  return fs.existsSync(specweavePath) ? specweavePath : null;
}

/**
 * Resolve a path relative to project root
 *
 * Useful for constructing paths that should be relative to project root,
 * not the current working directory.
 *
 * @param relativePath - Path relative to project root
 * @param startDir - Directory to start search from (defaults to process.cwd())
 * @returns Resolved absolute path or null if project root not found
 *
 * @example
 * // From any subdirectory
 * resolveFromProjectRoot('.specweave/config.json')
 * // Returns: "/projects/my-app/.specweave/config.json"
 */
export function resolveFromProjectRoot(
  relativePath: string,
  startDir: string = process.cwd()
): string | null {
  const projectRoot = findProjectRoot(startDir);
  if (!projectRoot) return null;

  return path.resolve(projectRoot, relativePath);
}
