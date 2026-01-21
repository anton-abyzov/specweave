/**
 * Template Utilities
 *
 * Shared functions for finding package root and template files.
 * Used by both AgentsMdGenerator and ClaudeMdGenerator.
 */

import * as fs from '../utils/fs-native.js';
import * as path from 'path';

/**
 * Find the package root by walking up the directory tree looking for package.json
 * This works reliably on all platforms including Windows with UNC paths
 */
export function findPackageRoot(startDir: string): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.name === 'specweave') {
          return currentDir;
        }
      } catch {
        // Not a valid package.json, continue searching
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

/**
 * Find template file using package root detection
 */
export function findTemplateFile(filename: string, dirname: string): string | null {
  const packageRoot = findPackageRoot(dirname);

  if (!packageRoot) {
    return null;
  }

  // Try src/templates/ first (for npm installs)
  const srcPath = path.normalize(path.join(packageRoot, 'src', 'templates', filename));
  if (fs.existsSync(srcPath)) {
    return srcPath;
  }

  // Try dist/templates/
  const distPath = path.normalize(path.join(packageRoot, 'dist', 'templates', filename));
  if (fs.existsSync(distPath)) {
    return distPath;
  }

  // Try templates/ directly in package root
  const rootPath = path.normalize(path.join(packageRoot, 'templates', filename));
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  return null;
}
