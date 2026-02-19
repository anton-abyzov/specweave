/**
 * Shared vskill path resolution utilities
 *
 * Resolves paths to the vskill CLI and specweave source directory.
 * Used by plugin-installer.ts and llm-plugin-detector.ts.
 */

import { existsSync, readFileSync } from 'node:fs';
import * as path from 'path';

/**
 * Resolve the path to vskill CLI entry point.
 * vskill is a sibling repo at repositories/anton-abyzov/vskill/
 *
 * Resolution order:
 * 1. From callerDir (e.g. __dirname) up to specweave root, then sibling vskill
 * 2. From process.cwd() up to monorepo root
 */
export function resolveVskillPath(callerDir?: string): string {
  // Strategy 1: from caller directory (e.g. __dirname of importing module)
  if (callerDir) {
    const specweaveRoot = findSpecweaveRoot(callerDir);
    if (specweaveRoot) {
      const vskillPath = path.join(specweaveRoot, '..', 'vskill', 'dist', 'cli.js');
      if (existsSync(vskillPath)) {
        return vskillPath;
      }
    }
  }

  // Strategy 2: from cwd
  const cwdRelative = path.resolve(process.cwd(), '../../repositories/anton-abyzov/vskill/dist/cli.js');
  if (existsSync(cwdRelative)) {
    return cwdRelative;
  }

  // Fallback: best guess from callerDir
  if (callerDir) {
    const specweaveRoot = findSpecweaveRoot(callerDir);
    if (specweaveRoot) {
      return path.join(specweaveRoot, '..', 'vskill', 'dist', 'cli.js');
    }
  }

  return cwdRelative;
}

/**
 * Resolve the specweave source directory (contains .claude-plugin/marketplace.json).
 *
 * Resolution order:
 * 1. From callerDir up to specweave root
 * 2. From process.cwd() up to monorepo root
 */
export function resolveSpecweaveDir(callerDir?: string): string {
  // Strategy 1: from caller directory
  if (callerDir) {
    const root = findSpecweaveRoot(callerDir);
    if (root && existsSync(root)) {
      return root;
    }
  }

  // Strategy 2: from cwd
  const cwdRelative = path.resolve(process.cwd(), '../../repositories/anton-abyzov/specweave');
  if (existsSync(cwdRelative)) {
    return cwdRelative;
  }

  // Fallback
  if (callerDir) {
    const root = findSpecweaveRoot(callerDir);
    if (root) return root;
  }

  return cwdRelative;
}

/**
 * Walk up from a directory to find the specweave repo root.
 * Looks for .specweave/ or package.json with specweave name.
 */
function findSpecweaveRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  // Walk up max 6 levels (typical: src/core/lazy-loading/ = 3-4 levels)
  for (let i = 0; i < 6; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'specweave' || pkg.name === '@specweave/core') {
          return dir;
        }
      } catch {
        // Not valid JSON, keep looking
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }

  return null;
}
