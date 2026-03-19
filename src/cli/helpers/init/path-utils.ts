/**
 * Path utilities for init command
 * Handles finding package root and source directories
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import type { ParentSpecweaveFolder, UmbrellaParentResult, SuspiciousPathResult, DiscoveredRepo, UmbrellaDiscoveryResult } from './types.js';

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
  // Note: 'tmp' and 'temp' removed — use isSystemTempDir() instead
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
 * Check if a path is inside the OS system temp directory.
 *
 * Uses os.tmpdir() to detect the real system temp dir, avoiding false positives
 * on user-created folders named "temp" or "tmp".
 *
 * @param resolvedPath - Absolute path to check
 * @returns true if the path is the system temp dir or a subdirectory of it
 */
export function isSystemTempDir(resolvedPath: string): boolean {
  const sysTmp = path.resolve(os.tmpdir());
  const normalized = path.resolve(resolvedPath);
  return normalized === sysTmp || normalized.startsWith(sysTmp + path.sep);
}

/**
 * Detect if the target directory path contains suspicious segments
 * that indicate it's NOT a project root (e.g., node_modules, dist, .git),
 * or if it's inside the system temp directory.
 *
 * @param targetDir - Directory where user wants to initialize
 * @returns SuspiciousPathResult if suspicious segment found, null otherwise
 */
export function detectSuspiciousPath(targetDir: string): SuspiciousPathResult | null {
  const resolved = path.resolve(targetDir);

  // Check if inside system temp directory
  if (isSystemTempDir(resolved)) {
    return { segment: 'system temp directory', suggestedRoot: path.dirname(path.resolve(os.tmpdir())) };
  }

  // Check path segments against suspicious list
  const segments = resolved.split(path.sep);
  const homeDir = os.homedir();

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (SUSPICIOUS_PATH_SEGMENTS.includes(seg)) {
      let suggestedRoot = segments.slice(0, i).join(path.sep) || path.sep;

      // Never suggest home directory or an ancestor of it
      if (suggestedRoot === homeDir || homeDir.startsWith(suggestedRoot + path.sep) || suggestedRoot === path.sep) {
        suggestedRoot = path.dirname(resolved);
      }

      return { segment: seg, suggestedRoot };
    }
  }

  return null;
}

/**
 * Scan the repositories/ subdirectory to discover child repos in an umbrella structure.
 * Looks for repositories/{org}/{repo}/.git at exactly 2 levels deep.
 *
 * @param targetDir - The project root directory to scan
 * @returns UmbrellaDiscoveryResult if repos found, null otherwise
 */
export function scanUmbrellaRepos(targetDir: string): UmbrellaDiscoveryResult | null {
  const reposDir = path.join(targetDir, 'repositories');
  try {
    if (!fs.existsSync(reposDir) || !fs.statSync(reposDir).isDirectory()) {
      return null;
    }
  } catch {
    return null;
  }

  const repos: DiscoveredRepo[] = [];
  const orgs = new Set<string>();

  let orgNames: string[];
  try {
    orgNames = fs.readdirSync(reposDir).filter((name: string) => !name.startsWith('.'));
  } catch {
    return null;
  }

  for (const orgName of orgNames) {
    const orgPath = path.join(reposDir, orgName);
    try {
      if (!fs.statSync(orgPath).isDirectory()) continue;
      const repoNames = fs.readdirSync(orgPath).filter((name: string) => !name.startsWith('.'));

      for (const repoName of repoNames) {
        const repoPath = path.join(orgPath, repoName);
        if (!fs.statSync(repoPath).isDirectory()) continue;
        if (fs.existsSync(path.join(repoPath, '.git'))) {
          orgs.add(orgName);
          repos.push({
            org: orgName,
            name: repoName,
            path: path.relative(targetDir, repoPath),
            hasGit: true,
          });
        }
      }
    } catch {
      continue; // skip unreadable org dir
    }
  }

  if (repos.length === 0) return null;

  return {
    isUmbrella: true,
    repositoriesDir: reposDir,
    orgs: Array.from(orgs),
    repos,
    totalRepoCount: repos.length,
  };
}

/**
 * Scan for repositories placed directly under repositories/ without an org subfolder.
 *
 * The standard umbrella layout is repositories/{org}/{repo}/.git (2 levels).
 * This function detects the non-standard 1-level pattern: repositories/{repo}/.git.
 * It is called only when scanUmbrellaRepos() returns null (mutually exclusive).
 *
 * @param targetDir - The project root directory to scan
 * @returns Array of misplaced repo names, or empty array if none found
 */
export function scanMisplacedRepos(targetDir: string): string[] {
  const reposDir = path.join(targetDir, 'repositories');
  try {
    if (!fs.existsSync(reposDir) || !fs.statSync(reposDir).isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const misplaced: string[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(reposDir).filter((name: string) => !name.startsWith('.'));
  } catch {
    return [];
  }

  for (const name of entries) {
    const entryPath = path.join(reposDir, name);
    try {
      if (!fs.statSync(entryPath).isDirectory()) continue;
      if (fs.existsSync(path.join(entryPath, '.git'))) {
        misplaced.push(name);
      }
    } catch {
      continue;
    }
  }

  return misplaced;
}

/**
 * Build umbrella config fragment from discovered repos.
 * Generates 3-char uppercase prefixes with deduplication (2-char + numeric suffix on collision).
 *
 * @param discovery - Result of scanUmbrellaRepos()
 * @param projectName - Name of the umbrella project
 * @returns Config fragment with umbrella and repository fields
 */
export function buildUmbrellaConfig(
  discovery: UmbrellaDiscoveryResult,
  projectName: string
): {
  umbrella: { enabled: true; projectName: string; childRepos: Array<{ id: string; path: string; name: string; prefix: string }> };
  repository: { umbrellaRepo: true };
} {
  const usedPrefixes = new Set<string>();
  const childRepos = discovery.repos.map(r => {
    let prefix = r.name.substring(0, 3).toUpperCase();
    if (usedPrefixes.has(prefix)) {
      let suffix = 2;
      while (usedPrefixes.has(prefix.substring(0, 2) + suffix)) suffix++;
      prefix = prefix.substring(0, 2) + suffix;
    }
    usedPrefixes.add(prefix);
    return { id: r.name, path: r.path, name: r.name, prefix };
  });

  return {
    umbrella: { enabled: true, projectName, childRepos },
    repository: { umbrellaRepo: true },
  };
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
