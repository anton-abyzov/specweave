/**
 * Greenfield detection for init flow
 *
 * Default assumption: brownfield. Only classify as greenfield when
 * the repo is provably empty (no source files, no real dependencies).
 *
 * Part of 0200-init-two-phase-redesign
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

/** Source file extensions to scan for */
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.java', '.kt', '.kts',
  '.go',
  '.rs',
  '.cs',
  '.rb',
  '.php',
  '.swift',
  '.c', '.cpp', '.h', '.hpp',
  '.scala',
  '.dart',
]);

/** Directories to skip during scan */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.specweave',
  'coverage', '__pycache__', '.next', '.nuxt', 'vendor',
  '.cache', '.output', 'target', 'bin', 'obj',
]);

export interface GreenfieldResult {
  isGreenfield: boolean;
  reason: string;
}

/**
 * Check if a project is greenfield (empty/placeholder repo).
 *
 * Returns true ONLY when the repo has no source files and no real dependencies.
 * Default is false (brownfield) — we assume existing code unless proven empty.
 */
export function isGreenfield(projectPath: string): boolean {
  return isGreenfieldDetailed(projectPath).isGreenfield;
}

/**
 * Detailed greenfield check with reason.
 */
export function isGreenfieldDetailed(projectPath: string): GreenfieldResult {
  // Check for source files (fast: early termination on first find)
  if (hasSourceFiles(projectPath, 0, 5)) {
    return { isGreenfield: false, reason: 'Source files found' };
  }

  // Check package.json for real dependencies
  if (hasRealDependencies(projectPath)) {
    return { isGreenfield: false, reason: 'Real dependencies found' };
  }

  return { isGreenfield: true, reason: 'No source files or dependencies found' };
}

/**
 * Returns true if ALL repos are greenfield (empty).
 * If any repo has code, returns false (brownfield).
 */
export function isGreenfieldMultiRepo(repoPaths: string[]): boolean {
  return repoPaths.every(p => isGreenfield(p));
}

/**
 * Recursively scan for source files. Stops on first match.
 */
function hasSourceFiles(dirPath: string, depth: number, maxDepth: number): boolean {
  if (depth > maxDepth) return false;

  let entries: string[];
  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return false;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;

    const fullPath = path.join(dirPath, entry);
    let stat: ReturnType<typeof fs.statSync>;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext)) {
        return true; // Found a source file → brownfield
      }
    } else if (stat.isDirectory()) {
      if (hasSourceFiles(fullPath, depth + 1, maxDepth)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if package manager files have real dependencies (not just boilerplate).
 */
function hasRealDependencies(projectPath: string): boolean {
  // Check package.json
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const depCount = Object.keys(pkg.dependencies || {}).length;
      const devDepCount = Object.keys(pkg.devDependencies || {}).length;
      if (depCount > 0 || devDepCount > 0) {
        return true;
      }
    } catch {
      // Malformed package.json — not a real project
    }
  }

  // Check requirements.txt (non-empty)
  const reqPath = path.join(projectPath, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    try {
      const content = fs.readFileSync(reqPath, 'utf-8').trim();
      if (content.length > 0 && content.split('\n').some(l => l.trim() && !l.trim().startsWith('#'))) {
        return true;
      }
    } catch { /* ignore */ }
  }

  // Check go.mod (has require block)
  const goModPath = path.join(projectPath, 'go.mod');
  if (fs.existsSync(goModPath)) {
    try {
      const content = fs.readFileSync(goModPath, 'utf-8');
      if (content.includes('require')) {
        return true;
      }
    } catch { /* ignore */ }
  }

  // Check Cargo.toml (has [dependencies])
  const cargoPath = path.join(projectPath, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    try {
      const content = fs.readFileSync(cargoPath, 'utf-8');
      if (content.includes('[dependencies]')) {
        return true;
      }
    } catch { /* ignore */ }
  }

  return false;
}
