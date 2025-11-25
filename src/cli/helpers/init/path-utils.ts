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
 * Find the source directory, trying multiple possible locations
 * Handles both development and installed package scenarios
 * Windows-compatible with proper path normalization
 *
 * @param relativePath - Relative path to find (e.g., 'templates', 'plugins/specweave')
 * @param dirname - Current __dirname value
 * @returns Absolute path to the source directory
 */
export function findSourceDir(relativePath: string, dirname: string): string {
  // First, try to find package root by walking up from dirname
  const packageRoot = findPackageRoot(dirname);

  if (packageRoot) {
    // Try directly in package root FIRST (for plugins/, .claude-plugin/)
    // This is critical because package.json includes these folders for npm publish
    const rootPath = path.normalize(path.join(packageRoot, relativePath));
    if (fs.existsSync(rootPath)) {
      return rootPath;
    }

    // Try src/ directory (for templates/, utils/, etc.)
    const srcPath = path.normalize(path.join(packageRoot, 'src', relativePath));
    if (fs.existsSync(srcPath)) {
      return srcPath;
    }

    // Try dist/ directory (fallback for compiled outputs)
    const distPath = path.normalize(path.join(packageRoot, 'dist', relativePath));
    if (fs.existsSync(distPath)) {
      return distPath;
    }
  }

  // Fallback: Try multiple possible locations relative to dirname
  const possiblePaths = [
    // Development: dist/cli/commands -> src/
    path.normalize(path.join(dirname, '../../..', relativePath)),
    // Installed: node_modules/specweave/dist/cli/commands -> node_modules/specweave/src/
    path.normalize(path.join(dirname, '../../../src', relativePath)),
    // Alternative: go up from dist/ to package root, then to src/
    path.normalize(path.join(dirname, '../../..', 'src', relativePath)),
    // Absolute from package root (for global installs)
    path.resolve(dirname, '../../../src', relativePath),
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  // If nothing found, return the first path and let the caller handle the error
  return possiblePaths[0];
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
