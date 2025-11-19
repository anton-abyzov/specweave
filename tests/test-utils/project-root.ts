/**
 * Safe Project Root Detection for Tests
 *
 * CRITICAL SAFETY:
 * - NEVER use process.cwd() in tests - it's unreliable in parallel execution
 * - ALWAYS use import.meta.url to find test file location
 * - ALWAYS traverse from test file location to find project root
 *
 * This prevents:
 * - Accidental deletion of project files
 * - Parallel test execution failures
 * - Working directory dependencies
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Find project root by looking for .specweave/ directory
 *
 * Starts from the calling test file's location and traverses upward.
 * This is SAFE for parallel test execution because it doesn't depend on process.cwd().
 *
 * @param testFileUrl - Pass `import.meta.url` from the test file
 * @returns Absolute path to project root
 * @throws Error if project root cannot be found
 *
 * @example
 * ```typescript
 * import { findProjectRoot } from '../test-utils/project-root.js';
 *
 * const projectRoot = findProjectRoot(import.meta.url);
 * const hookPath = path.join(projectRoot, 'plugins/specweave/hooks/my-hook.sh');
 * ```
 */
export function findProjectRoot(testFileUrl: string): string {
  const testFileDir = path.dirname(fileURLToPath(testFileUrl));
  let dir = testFileDir;

  while (dir !== '/' && dir !== '.') {
    if (fs.existsSync(path.join(dir, '.specweave'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  throw new Error(
    `Could not find project root (no .specweave/ directory found)\n` +
    `Started searching from: ${testFileDir}`
  );
}

/**
 * DEPRECATED: Do not use process.cwd() in tests
 *
 * This function is kept for documentation purposes only.
 * Using process.cwd() in tests can cause:
 *
 * 1. **Deletion risks**: If cleanup uses wrong cwd, could delete project files
 * 2. **Parallel execution failures**: Different workers have different cwd values
 * 3. **Unreliable paths**: cwd can change during test execution
 *
 * @deprecated Use findProjectRoot(import.meta.url) instead
 */
export function getProjectRootUnsafe(): string {
  throw new Error(
    'UNSAFE: Do not use process.cwd() in tests!\n' +
    'Use: findProjectRoot(import.meta.url) instead'
  );
}
