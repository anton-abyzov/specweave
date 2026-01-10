/**
 * Path utilities for init command
 * Handles finding package root and source directories
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import type { ParentSpecweaveFolder } from './types.js';

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
      const isHomeDir = path.resolve(currentDir) === path.resolve(homeDir);
      foundFolders.push({ path: currentDir, depth, isHomeDir });
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
