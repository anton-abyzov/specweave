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
 * NOTE: This returns the NEAREST project root (for config reading).
 * For increment operations in multi-repo setups, use resolveEffectiveRoot()
 * which returns the umbrella root.
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
 * Find the umbrella root by walking up from the nearest project root.
 *
 * In a multi-repo umbrella project, nested repos each have their own
 * .specweave/config.json, but the umbrella root is the TOPMOST one
 * with `umbrella.enabled: true` or a sibling `repositories/` directory.
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Umbrella root path or null if not inside an umbrella project
 */
export function findUmbrellaRoot(startDir: string = process.cwd()): string | null {
  // Find the nearest project root first
  const nearestRoot = findProjectRoot(startDir);
  if (!nearestRoot) return null;

  // Check if the nearest root IS an umbrella root
  const nearestConfigPath = path.join(nearestRoot, '.specweave', 'config.json');
  if (fs.existsSync(nearestConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(nearestConfigPath, 'utf-8'));
      if (config?.umbrella?.enabled || config?.repository?.umbrellaRepo) {
        return nearestRoot;
      }
    } catch {
      // Invalid JSON, continue walking up
    }
    const reposDir = path.join(nearestRoot, 'repositories');
    if (fs.existsSync(reposDir) && fs.statSync(reposDir).isDirectory()) {
      return nearestRoot;
    }
  }

  // Walk up from the parent of the nearest root
  let current = path.dirname(nearestRoot);
  const root = path.parse(current).root;

  while (current !== root) {
    const configPath = path.join(current, '.specweave', 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        // Check umbrella config flags
        if (config?.umbrella?.enabled || config?.repository?.umbrellaRepo) {
          return current;
        }
      } catch {
        // Invalid JSON, skip
      }

      // Check for sibling repositories/ directory (the multi-repo marker)
      const reposDir = path.join(current, 'repositories');
      if (fs.existsSync(reposDir) && fs.statSync(reposDir).isDirectory()) {
        return current;
      }
    }

    current = path.dirname(current);
  }

  return null;
}

/**
 * Resolve the effective project root for increment operations.
 *
 * - In a multi-repo umbrella: returns the umbrella root (increments belong there)
 * - In a single-repo project: returns the nearest project root
 * - Fallback: returns process.cwd()
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Effective project root path
 */
export function resolveEffectiveRoot(startDir: string = process.cwd()): string {
  const umbrellaRoot = findUmbrellaRoot(startDir);
  if (umbrellaRoot) return umbrellaRoot;
  return findProjectRoot(startDir) || process.cwd();
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
