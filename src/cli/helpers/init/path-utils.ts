/**
 * Path utilities for init command
 * Handles finding package root and source directories
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import type { ParentSpecweaveFolder, UmbrellaParentResult, SuspiciousPathResult } from './types.js';

/**
 * Find the package root by walking up the directory tree looking for package.json
 * This works reliably on all platforms including Windows with UNC paths
 *
 * @param startDir - Directory to start searching from
 * @returns Path to package root or null if not found
 */
export function findPackageRoot(startDir: string): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        // Verify this is the specweave package
        if (packageJson.name === 'specweave') {
          return currentDir;
        }
      } catch {
        // Not a valid package.json, continue searching
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  return null;
}

/**
 * Find first existing path from candidates
 */
function findExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Find the source directory, trying multiple possible locations
 * Handles both development and installed package scenarios
 * Windows-compatible with proper path normalization
 *
 * @param relativePath - Relative path to find (e.g., 'templates', 'plugins/specweave')
 * @param dirname - Current __dirname value
 * @returns Absolute path to the source directory
 */
export function findSourceDir(relativePath: string, dirname: string): string {
  const packageRoot = findPackageRoot(dirname);

  if (packageRoot) {
    // Try package root subdirectories: root, src/, dist/
    const candidates = [
      path.normalize(path.join(packageRoot, relativePath)),
      path.normalize(path.join(packageRoot, 'src', relativePath)),
      path.normalize(path.join(packageRoot, 'dist', relativePath)),
    ];
    const found = findExistingPath(candidates);
    if (found) return found;
  }

  // Fallback: Try multiple possible locations relative to dirname
  const fallbackPaths = [
    path.normalize(path.join(dirname, '../../..', relativePath)),
    path.normalize(path.join(dirname, '../../../src', relativePath)),
    path.normalize(path.join(dirname, '../../..', 'src', relativePath)),
    path.resolve(dirname, '../../../src', relativePath),
  ];

  return findExistingPath(fallbackPaths) ?? fallbackPaths[0];
}

/**
 * Detect ALL parent directories that contain .specweave/ folders
 * SpecWeave ONLY supports root-level .specweave/ folders
 * Nested .specweave/ folders are NOT supported
 *
 * EXCEPTION: User-level ~/.specweave is VALID and doesn't block initialization.
 * This is used for global SpecWeave settings (memory, logs, state, skills-cache).
 *
 * @param targetDir - Directory where user wants to initialize
 * @returns Array of paths to parent .specweave/ folders with depth info, or null if none found
 */
export function detectNestedSpecweave(targetDir: string): ParentSpecweaveFolder[] | null {
  const foundFolders: ParentSpecweaveFolder[] = [];
  const homeDir = os.homedir();

  // Start from parent of target directory
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;
  let depth = 1;

  // Walk up the directory tree and find ALL .specweave/ folders
  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, '.specweave');

    // Check if .specweave/ exists at this level
    if (fs.existsSync(specweavePath)) {
      const resolvedDir = path.resolve(currentDir);
      const isHomeDir = resolvedDir === path.resolve(homeDir);
      // ~/.specweave is a VALID global settings location and should NOT block init
      // It's used for: memory files, logs, state, skills-cache
      const isUserLevel = isHomeDir;

      // Only consider this a real project if config.json exists.
      // Stale .specweave/ folders (with only logs/state from runtime code)
      // should NOT block initialization of new projects.
      const hasConfig = fs.existsSync(path.join(specweavePath, 'config.json'));
      const isRealProject = hasConfig;

      foundFolders.push({
        path: currentDir,
        depth,
        isHomeDir,
        isUserLevel,
        isStale: !isRealProject && !isUserLevel,
      });
    }

    // Move up one level
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
    depth++;
  }

  return foundFolders.length > 0 ? foundFolders : null;
}

/**
 * Segments that indicate a path is NOT a project root.
 * Used by detectSuspiciousPath() to prevent init in wrong locations.
 */
export const SUSPICIOUS_PATH_SEGMENTS: readonly string[] = [
  // Package managers
  'node_modules', 'vendor', '__pycache__', '.venv', 'venv',
  // Build output
  'dist', 'build', '.next', '.nuxt', '.output', 'out', 'coverage',
  // VCS internals
  '.git', '.svn', '.hg',
  // Temp
  'tmp', 'temp',
  // Test dirs
  '__tests__', 'stories', 'storybook',
  // Platform-specific deep dirs
  '.cache',
] as const;

/**
 * Detect if the target directory is inside an umbrella project.
 * Walks up from targetDir looking for parent .specweave/config.json
 * that indicates an umbrella repo (has repository.umbrellaRepo or
 * a sibling repositories/ directory).
 *
 * @param targetDir - Directory where user wants to initialize
 * @returns UmbrellaParentResult if inside an umbrella, null otherwise
 */
export function detectUmbrellaParent(targetDir: string): UmbrellaParentResult | null {
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const configPath = path.join(currentDir, '.specweave', 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config?.repository?.umbrellaRepo) {
          return { umbrellaRoot: currentDir, reason: 'config-umbrella-repo' };
        }
      } catch {
        // Invalid JSON, skip
      }

      // Check for sibling repositories/ directory
      const repositoriesDir = path.join(currentDir, 'repositories');
      if (fs.existsSync(repositoriesDir) && fs.statSync(repositoriesDir).isDirectory()) {
        return { umbrellaRoot: currentDir, reason: 'repositories-dir' };
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

/**
 * Detect if the target directory path contains suspicious segments
 * that indicate it's NOT a project root (e.g., node_modules, dist, .git).
 *
 * @param targetDir - Directory where user wants to initialize
 * @returns SuspiciousPathResult if suspicious segment found, null otherwise
 */
export function detectSuspiciousPath(targetDir: string): SuspiciousPathResult | null {
  const resolved = path.resolve(targetDir);
  const segments = resolved.split(path.sep);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (SUSPICIOUS_PATH_SEGMENTS.includes(seg)) {
      // suggestedRoot is the directory just before the suspicious segment
      const suggestedRoot = segments.slice(0, i).join(path.sep) || path.sep;
      return { segment: seg, suggestedRoot };
    }
  }

  return null;
}

/**
 * Count files recursively in a directory
 * Used for logging before deletion
 *
 * @param dir - Directory to count files in
 * @returns Total file count
 */
export function countFilesRecursive(dir: string): number {
  let count = 0;
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        count += countFilesRecursive(fullPath);
      } else {
        count++;
      }
    }
  } catch {
    // Ignore errors
  }
  return count;
}
