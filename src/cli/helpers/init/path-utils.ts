/**
 * Path utilities for init command
 * Handles finding package root and source directories
 */

import * as fs from '../../../utils/fs-native.js';
import * as nativeFs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { isWithin, readWorkspaceConfig, canonicalPath } from '../../../core/workspace/context.js';
import { findNestedCheckouts } from '../../../core/session/nested-repos.js';
import type { ParentSpecweaveFolder, UmbrellaParentResult, SuspiciousPathResult, DiscoveredRepo, UmbrellaDiscoveryResult } from './types.js';
import type { WorkspaceRepo, WorkspaceConfig } from '../../../core/config/types.js';

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
  // Resolve symlinks so macOS /var/… → /private/var/… comparison works correctly
  const sysTmp = (() => { try { return nativeFs.realpathSync(os.tmpdir()); } catch { return path.resolve(os.tmpdir()); } })();

  // Start from parent of target directory (use path.resolve, not realpath, to preserve
  // the path form the caller used — consumers compare f.path against their own tmpdir values)
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;
  let depth = 1;

  // Walk up the directory tree and find ALL .specweave/ folders
  while (currentDir !== root) {
    // Stop walking when we reach os.tmpdir() itself (or any ancestor of it).
    // Parent directories of the temp root (e.g. /var/folders/js/… on macOS) may
    // contain stale/rogue .specweave/ folders left by test runs — they must never
    // block initialization of real projects living inside the temp tree.
    // We keep scanning within /tmp/… itself (subdirs are valid project locations).
    // Resolve symlinks for the comparison so /var/… matches /private/var/… on macOS.
    const realCurrentDir = (() => { try { return nativeFs.realpathSync(currentDir); } catch { return currentDir; } })();
    if (sysTmp.startsWith(realCurrentDir + path.sep) || realCurrentDir === sysTmp) {
      break;
    }

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
  // Resolve symlinks so macOS /var/… → /private/var/… comparison works correctly
  const sysTmp = (() => { try { return nativeFs.realpathSync(os.tmpdir()); } catch { return path.resolve(os.tmpdir()); } })();
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    // Stop walking when we reach os.tmpdir() itself (or any ancestor of it).
    // Resolve symlinks for the comparison so /var/… matches /private/var/… on macOS.
    const realCurrentDir = (() => { try { return nativeFs.realpathSync(currentDir); } catch { return currentDir; } })();
    if (sysTmp.startsWith(realCurrentDir + path.sep) || realCurrentDir === sysTmp) {
      break;
    }

    const configPath = path.join(currentDir, '.specweave', 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config?.umbrella?.enabled || config?.repository?.umbrellaRepo
          || config?.workspace?.repos?.some((repo: { path?: string }) => {
            if (typeof repo.path !== 'string' || !repo.path) return false;
            try { return isWithin(canonicalPath(path.resolve(currentDir, repo.path)), canonicalPath(targetDir)); }
            catch { return false; }
          })) {
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

const canonicalOr = (p: string): string => {
  try { return canonicalPath(p); } catch { return p; }
};

/** The folder is a Git checkout or sits inside one (a package folder of a monorepo). */
function insideCheckout(targetDir: string): boolean {
  let dir = path.resolve(targetDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

/**
 * `repositories/<repo>` and `repositories/<org>/<repo>`, read directly as init always has, so
 * no walk budget hides them and a symlink to a checkout elsewhere on disk still counts.
 */
function conventionalCheckouts(targetDir: string): string[] {
  const reposDir = path.join(targetDir, 'repositories');
  const children = (dir: string): string[] => {
    try { return fs.readdirSync(dir).filter((name: string) => !name.startsWith('.')).sort(); } catch { return []; }
  };
  const isCheckoutDir = (dir: string) => {
    try { return fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, '.git')); } catch { return false; }
  };
  const isDir = (dir: string) => {
    try { return fs.statSync(dir).isDirectory(); } catch { return false; }
  };
  const found: string[] = [];
  for (const first of children(reposDir)) {
    const level1 = path.join(reposDir, first);
    if (isCheckoutDir(level1)) { found.push(path.join('repositories', first)); continue; }
    if (!isDir(level1)) continue;
    for (const second of children(level1)) {
      if (isCheckoutDir(path.join(level1, second))) found.push(path.join('repositories', first, second));
    }
  }
  return found;
}

/**
 * Checkouts nested anywhere in a folder, as paths relative to it: the walk `specweave handoff --all`
 * and SpecWithCode use (up to three levels down, any folder names, dot and dependency folders
 * skipped, symlinks only inside the folder, each real path once).
 */
function nestedCheckouts(targetDir: string): string[] {
  const root = path.resolve(targetDir);
  const canonicalRoot = canonicalOr(root);
  let found: string[];
  try {
    found = findNestedCheckouts(root);
  } catch {
    return []; // an unreadable workspace config; scanWorkspaceRepos reports it
  }
  return found
    // Registered entries come back canonical (symlinks resolved), walked ones under `root`.
    .map((found) => {
      const relative = path.relative(root, found);
      return relative.startsWith('..') || path.isAbsolute(relative) ? path.relative(canonicalRoot, found) : relative;
    })
    .filter((relative) => relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Discover the repositories a workspace folder holds. No layout is required:
 *
 * - `repositories/<org>/<repo>` (where `specweave get` clones) and `repositories/<repo>` always count.
 * - A folder outside any Git checkout can only be a folder of repositories, so any checkout up
 *   to three levels down counts too, whatever its folders are called (`api`, `services/web`).
 * - In a checkout, or a folder inside one, other nested checkouts may be fixtures or vendored
 *   copies, so they are not added; {@link scanUnregisteredCheckouts} names them for
 *   `specweave get ./<path>`.
 *
 * Sibling and external repositories are never guessed: `specweave get ../<path>` registers them.
 *
 * @param targetDir - The project root directory to scan
 * @returns UmbrellaDiscoveryResult if repos found, null otherwise
 */
export function scanUmbrellaRepos(targetDir: string): UmbrellaDiscoveryResult | null {
  try {
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) return null;
  } catch {
    return null;
  }
  const root = path.resolve(targetDir);

  // One entry per real path; the conventional path wins over another route to the same checkout.
  const byReal = new Map<string, string>();
  const add = (relative: string) => {
    const key = canonicalOr(path.join(root, relative));
    if (!byReal.has(key)) byReal.set(key, relative);
  };
  conventionalCheckouts(root).forEach(add);
  if (!insideCheckout(root)) nestedCheckouts(root).forEach(add);

  const repos: DiscoveredRepo[] = [...byReal.values()].sort().map((relative) => {
    const parts = relative.split(path.sep);
    return {
      org: parts[0] === 'repositories' && parts.length === 3 ? parts[1] : '',
      name: parts[parts.length - 1],
      path: relative,
      hasGit: true,
    };
  });

  if (repos.length === 0) return null;

  return {
    isUmbrella: true,
    repositoriesDir: path.join(targetDir, 'repositories'),
    orgs: [...new Set(repos.map((repo) => repo.org).filter(Boolean))],
    repos,
    totalRepoCount: repos.length,
  };
}

/**
 * Discover workspace repos: the registered `workspace.repos` entries, then the
 * nested checkouts scanUmbrellaRepos finds that are not registered yet.
 *
 * @param targetDir - The project root directory to scan
 * @returns UmbrellaDiscoveryResult if repos found, null otherwise
 */
export function scanWorkspaceRepos(targetDir: string): UmbrellaDiscoveryResult | null {
  const discovered = scanUmbrellaRepos(targetDir);
  if (!fs.existsSync(path.join(targetDir, '.specweave', 'config.json'))) return discovered;
  const config = readWorkspaceConfig(targetDir);
  const registered: WorkspaceRepo[] = config.workspace?.repos ?? config.umbrella?.childRepos ?? [];
  if (!registered.length) return discovered;
  const repos: DiscoveredRepo[] = registered.map(repo => ({
    org: repo.sync?.github?.owner ?? '', name: repo.name ?? repo.id, path: repo.path!,
    hasGit: fs.existsSync(path.join(path.resolve(targetDir, repo.path!), '.git')), registered: repo,
  }));
  const resolved = (repoPath: string) => {
    const absolute = path.resolve(targetDir, repoPath);
    try { return canonicalPath(absolute); } catch { return absolute; }
  };
  for (const repo of discovered?.repos ?? []) {
    if (!repos.some(existing => resolved(existing.path) === resolved(repo.path))) repos.push(repo);
  }
  return { isUmbrella: true, repositoriesDir: path.join(targetDir, 'repositories'),
    orgs: [...new Set(repos.map(repo => repo.org).filter(Boolean))], repos, totalRepoCount: repos.length };
}

/**
 * Separate clones (a `.git` folder) nested in a workspace folder that is, or sits inside,
 * a Git checkout and not listed by the scan, as POSIX paths relative to it. Init names each
 * with the command that adds it in place. Submodules and linked worktrees (a `.git`
 * file) belong to the folder's own repository and are left out.
 *
 * @param targetDir - The project root directory to scan
 * @param discovery - Result of scanWorkspaceRepos(), whose repositories are already listed
 * @returns Relative paths of the unlisted clones, sorted
 */
export function scanUnregisteredCheckouts(targetDir: string, discovery: UmbrellaDiscoveryResult | null): string[] {
  try {
    if (!fs.existsSync(targetDir) || !insideCheckout(targetDir)) return [];
  } catch {
    return [];
  }
  const root = path.resolve(targetDir);
  const listed = new Set((discovery?.repos ?? []).map((repo) => canonicalOr(path.resolve(root, repo.path))));
  return nestedCheckouts(root)
    .filter((relative) => {
      try {
        if (!nativeFs.lstatSync(path.join(root, relative, '.git')).isDirectory()) return false;
      } catch {
        return false;
      }
      return !listed.has(canonicalOr(path.join(root, relative)));
    })
    .map((relative) => relative.split(path.sep).join('/'));
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
 * Build workspace config fragment from discovered repos.
 * Returns { workspace: WorkspaceConfig } instead of the legacy { umbrella: UmbrellaConfig }.
 * Each repo gets an empty sync: {} default.
 *
 * @param discovery - Result of scanWorkspaceRepos()
 * @param projectName - Name of the workspace project
 * @returns Config fragment with workspace field
 */
export function buildWorkspaceConfig(
  discovery: UmbrellaDiscoveryResult,
  projectName: string
): {
  workspace: WorkspaceConfig;
  repository: { umbrellaRepo: true };
} {
  const usedPrefixes = new Set<string>();
  const usedIds = new Set(discovery.repos.flatMap(r => (r.registered ? [r.registered.id] : [])));
  const repos: WorkspaceRepo[] = discovery.repos.map(r => {
    if (r.registered) { usedPrefixes.add(r.registered.prefix); return r.registered; }
    // Two repositories with one name (`apps/api`, `services/api`) get the parent folder in the id.
    let id = r.name;
    if (usedIds.has(id)) {
      const parent = path.basename(path.dirname(r.path));
      const base = parent && parent !== '.' && parent !== 'repositories' ? `${parent}-${r.name}` : r.name;
      id = base;
      for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    }
    usedIds.add(id);
    let prefix = r.name.substring(0, 3).toUpperCase();
    if (usedPrefixes.has(prefix)) {
      let suffix = 2;
      while (usedPrefixes.has(prefix.substring(0, 2) + suffix)) suffix++;
      prefix = prefix.substring(0, 2) + suffix;
    }
    usedPrefixes.add(prefix);
    return { id, path: r.path, name: r.name, prefix, sync: {} };
  });

  return {
    workspace: { name: projectName, repos },
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
