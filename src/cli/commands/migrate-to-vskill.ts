/**
 * Migrate to vskill command
 *
 * Scans ~/.claude/plugins/cache/specweave/ for installed plugin directories
 * and creates a vskill.lock file with entries for all found plugins.
 *
 * This migration bridges the gap from `claude plugin install` to the
 * vskill lockfile-based plugin management system.
 *
 * @module cli/commands/migrate-to-vskill
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  plugins: string[];
  lockfilePath?: string;
  error?: string;
}

export interface MigrateOptions {
  /** If true, compute results but do not write any files */
  dryRun?: boolean;
  /** Directory to write vskill.lock into (defaults to cwd) */
  lockDir?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_DIR = '.claude/plugins/cache/specweave';
const LOCKFILE_NAME = 'vskill.lock';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 content hash for a plugin directory.
 *
 * Uses the same algorithm as vskill's computeSha(files) for compatibility:
 * - Sorts files by relative path
 * - Format: "relativePath\0normalizedContent\n" per file
 * - Normalizes content: strip BOM, convert CRLF to LF
 * - Recursively reads all files (not just top-level)
 */
function computeDirectoryHash(dirPath: string): string {
  const hash = createHash('sha256');
  const files: { relPath: string; content: string }[] = [];

  function walkDir(dir: string, prefix: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkDir(fullPath, relPath);
        } else if (entry.isFile()) {
          const content = readFileSync(fullPath, 'utf-8');
          files.push({ relPath, content });
        }
      }
    } catch {
      // If we can't read, skip
    }
  }

  walkDir(dirPath, '');

  // Sort by path for determinism (matches vskill)
  files.sort((a, b) => a.relPath.localeCompare(b.relPath));

  for (const file of files) {
    // Normalize: strip BOM, convert CRLF to LF (matches vskill's normalizeContent)
    const normalized = file.content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    hash.update(`${file.relPath}\0${normalized}\n`);
  }

  return hash.digest('hex');
}

/**
 * Scan the plugin cache directory and return directory names.
 */
function scanPluginCache(): { name: string; path: string }[] {
  const cacheDir = join(homedir(), CACHE_DIR);

  if (!existsSync(cacheDir)) {
    return [];
  }

  try {
    const entries = readdirSync(cacheDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => ({
        name: e.name,
        path: join(cacheDir, e.name),
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main exports
// ---------------------------------------------------------------------------

/**
 * Check whether migration should be offered.
 *
 * Returns true when:
 * 1. Marketplace plugins exist in ~/.claude/plugins/cache/specweave/
 * 2. No vskill.lock exists yet (in cwd)
 */
export function shouldOfferMigration(lockDir?: string): boolean {
  const lockPath = join(lockDir || process.cwd(), LOCKFILE_NAME);

  // Already migrated (project-local lock exists)
  if (existsSync(lockPath)) {
    return false;
  }

  // Also check global plugins-lock.json — if bundled plugins are tracked there,
  // no migration is needed
  try {
    const globalLockPath = join(homedir(), '.specweave', 'plugins-lock.json');
    if (existsSync(globalLockPath)) {
      const globalLock = JSON.parse(readFileSync(globalLockPath, 'utf-8'));
      if (globalLock.skills && Object.keys(globalLock.skills).length > 0) {
        return false;
      }
    }
  } catch { /* non-fatal */ }

  // Check if there are any plugins to migrate
  const plugins = scanPluginCache();
  return plugins.length > 0;
}

/**
 * Migrate installed marketplace plugins to a vskill.lock file.
 *
 * Scans ~/.claude/plugins/cache/specweave/ for plugin directories,
 * computes a content hash for each, and writes a vskill.lock.
 *
 * Plugin files are NEVER deleted or moved — this is a non-destructive
 * operation that creates a lockfile alongside existing installations.
 */
export function migrateToVskill(opts?: MigrateOptions): MigrationResult {
  const plugins = scanPluginCache();

  if (plugins.length === 0) {
    return {
      success: true,
      migratedCount: 0,
      plugins: [],
    };
  }

  const now = new Date().toISOString();
  const skills: Record<string, {
    version: string;
    sha: string;
    tier: string;
    installedAt: string;
    source: string;
    marketplace: string;
    pluginDir: boolean;
    scope: string;
    installedPath: string;
  }> = {};

  for (const plugin of plugins) {
    const sha = computeDirectoryHash(plugin.path);

    skills[plugin.name] = {
      version: '1.0.0',
      sha,
      tier: 'VERIFIED',
      installedAt: now,
      source: `marketplace:anton-abyzov/specweave#${plugin.name}`,
      marketplace: 'specweave',
      pluginDir: true,
      scope: 'user',
      installedPath: plugin.path,
    };
  }

  const lock = {
    version: 1,
    agents: [],
    skills,
    createdAt: now,
    updatedAt: now,
  };

  const lockDir = opts?.lockDir || process.cwd();
  const lockPath = join(lockDir, LOCKFILE_NAME);

  if (!opts?.dryRun) {
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
  }

  return {
    success: true,
    migratedCount: plugins.length,
    plugins: plugins.map(p => p.name),
    lockfilePath: lockPath,
  };
}
