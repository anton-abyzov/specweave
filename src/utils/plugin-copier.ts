/**
 * First-party plugin installer for SpecWeave.
 *
 * Installs plugins via Claude Code's native plugin system:
 *   1. Registers the specweave marketplace
 *   2. Runs `claude plugin install <name>@specweave`
 *   3. Fixes hook permissions in the plugin cache
 *   4. Migrates legacy ~/.claude/commands/<name>/ installations
 *
 * @since 1.0.279 (originally copy-based, migrated to native in 1.0.356)
 */

import {
  chmodSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { execFileNoThrowSync } from './execFileNoThrow.js';
import { getProjectRoot } from './find-project-root.js';
import { getPluginScope, getScopeArgs } from '../core/types/plugin-scope.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CopyPluginOptions {
  /** Force reinstall even if hash matches lockfile */
  force?: boolean;
}

export interface CopyPluginResult {
  success: boolean;
  /** Content hash of source plugin directory */
  sha: string;
  /** Where the plugin was installed to */
  targetDir?: string;
  /** Error message if failed */
  error?: string;
  /** True if skipped because hash unchanged */
  skipped?: boolean;
}

interface LockfileSkillEntry {
  version: string;
  sha: string;
  tier: string;
  installedAt: string;
  source: string;
}

interface VskillLock {
  version: number;
  agents: string[];
  skills: Record<string, LockfileSkillEntry>;
  createdAt: string;
  updatedAt: string;
}

interface MarketplacePlugin {
  name: string;
  source: string;
  version: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCKFILE_NAME = 'vskill.lock';

/** Legacy installation path — used only for migration cleanup */
const LEGACY_COMMANDS_DIR = join(homedir(), '.claude', 'commands');

/** Native plugin cache base path */
const PLUGIN_CACHE_DIR = join(homedir(), '.claude', 'plugins', 'cache');

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 content hash (first 12 hex chars) for a plugin directory.
 * Hashes filename + content for every readable file to detect any change.
 * Path separators are normalized to '/' for cross-platform consistency.
 */
export function computePluginHash(pluginDir: string): string {
  if (!existsSync(pluginDir)) return '';

  const hash = createHash('sha256');
  try {
    const files = readdirSync(pluginDir, { recursive: true, encoding: 'utf-8' });
    for (const file of files.sort()) {
      const fullPath = join(pluginDir, file);
      try {
        const content = readFileSync(fullPath);
        // Normalize path separators for cross-platform hash consistency
        hash.update(file.replace(/\\/g, '/'));
        hash.update('\0');
        hash.update(content);
        hash.update('\0');
      } catch {
        // Skip directories and unreadable files
      }
    }
  } catch {
    // Directory not readable
  }

  return hash.digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Fix hook permissions: chmod 755 on all .sh files recursively.
 */
export function fixHookPermissions(targetDir: string): void {
  try {
    const files = readdirSync(targetDir, { recursive: true, encoding: 'utf-8' });
    for (const file of files) {
      if (file.endsWith('.sh')) {
        chmodSync(join(targetDir, file), 0o755);
      }
    }
  } catch {
    // Ignore permission errors
  }
}

// ---------------------------------------------------------------------------
// Legacy migration
// ---------------------------------------------------------------------------

/**
 * Remove legacy ~/.claude/commands/<name>/ installation.
 *
 * Prior to 1.0.356, SpecWeave installed plugins by manually copying files to
 * ~/.claude/commands/<name>/ with custom flattening and filtering. This
 * bypassed Claude Code's native plugin system. Now that we use the native
 * system, the legacy directory must be removed to avoid duplicate commands.
 */
export function migrateLegacyCommandsDir(pluginName: string): boolean {
  const legacyDir = join(LEGACY_COMMANDS_DIR, pluginName);
  if (!existsSync(legacyDir)) return false;

  try {
    rmSync(legacyDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

/**
 * Read marketplace.json and return plugins array.
 */
function parseMarketplace(marketplacePath: string): MarketplacePlugin[] {
  try {
    const content = readFileSync(marketplacePath, 'utf-8');
    const manifest = JSON.parse(content);
    return Array.isArray(manifest.plugins) ? manifest.plugins : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Lockfile
// ---------------------------------------------------------------------------

/**
 * Read vskill.lock from a directory.
 */
export function readLockfile(dir: string): VskillLock | null {
  const p = join(dir, LOCKFILE_NAME);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as VskillLock;
  } catch {
    return null;
  }
}

/**
 * Write vskill.lock to a directory.
 */
export function writeLockfile(lock: VskillLock, dir: string): void {
  const toWrite = { ...lock, updatedAt: new Date().toISOString() };
  writeFileSync(join(dir, LOCKFILE_NAME), JSON.stringify(toWrite, null, 2) + '\n', 'utf-8');
}

/**
 * Ensure a lockfile exists, creating one if needed.
 */
export function ensureLockfile(dir: string): VskillLock {
  const existing = readLockfile(dir);
  if (existing) return existing;

  const lock: VskillLock = {
    version: 1,
    agents: ['claude-code'],
    skills: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeLockfile(lock, dir);
  return lock;
}

// ---------------------------------------------------------------------------
// Root finder
// ---------------------------------------------------------------------------

/**
 * Find the specweave package root from a start directory.
 * Walks up looking for package.json with name 'specweave' or '@specweave/core'.
 * Works for both development (source) and production (dist/) layouts.
 */
export function findSpecweaveRoot(startDir: string): string | null {
  let dir = resolve(startDir);

  for (let i = 0; i < 8; i++) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'specweave' || pkg.name === '@specweave/core') {
          return dir;
        }
      } catch {
        // Invalid JSON, keep looking
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Core: installPlugin (replaces copyPlugin)
// ---------------------------------------------------------------------------

/**
 * Install a first-party plugin via Claude Code's native plugin system.
 *
 * Steps:
 *   1. Compute content hash and check lockfile for changes
 *   2. Register the specweave marketplace with Claude CLI
 *   3. Install the plugin via `claude plugin install <name>@specweave`
 *   4. Fix hook permissions in the native plugin cache
 *   5. Remove legacy ~/.claude/commands/<name>/ if present
 *   6. Update lockfile
 */
export function installPlugin(
  pluginName: string,
  specweaveRoot: string,
  options: CopyPluginOptions = {},
): CopyPluginResult {
  // 1. Find marketplace.json
  const marketplacePath = join(specweaveRoot, '.claude-plugin', 'marketplace.json');
  if (!existsSync(marketplacePath)) {
    return { success: false, sha: '', error: 'marketplace.json not found' };
  }

  // 2. Resolve plugin source directory
  const plugins = parseMarketplace(marketplacePath);
  const pluginEntry = plugins.find(p => p.name === pluginName);
  if (!pluginEntry) {
    return { success: false, sha: '', error: `Plugin "${pluginName}" not in marketplace.json` };
  }

  const sourceDir = resolve(specweaveRoot, pluginEntry.source);
  if (!existsSync(sourceDir)) {
    return { success: false, sha: '', error: `Source dir not found: ${sourceDir}` };
  }

  // 3. Compute hash and check lockfile
  const sha = computePluginHash(sourceDir);
  const lockDir = getProjectRoot();
  const lock = ensureLockfile(lockDir);

  if (!options.force && lock.skills[pluginName]?.sha === sha) {
    return { success: true, sha, skipped: true };
  }

  // 4. Register marketplace with Claude CLI
  execFileNoThrowSync('claude', ['plugin', 'marketplace', 'add', specweaveRoot], { timeout: 10_000 });

  // 5. Install via Claude Code's native plugin system (scope per plugin-scope config)
  const scope = getPluginScope(pluginName, 'specweave');
  const scopeArgs = getScopeArgs(scope);
  const installResult = execFileNoThrowSync(
    'claude',
    ['plugin', 'install', `${pluginName}@specweave`, ...scopeArgs],
    { timeout: 15_000 },
  );

  if (!installResult.success) {
    return {
      success: false,
      sha,
      error: `claude plugin install failed (exit ${installResult.exitCode}): ${installResult.stderr}`,
    };
  }

  // 6. Fix hook permissions in the plugin cache
  const cacheDir = join(PLUGIN_CACHE_DIR, 'specweave', pluginName);
  if (existsSync(cacheDir)) {
    // Walk version dirs (e.g. 1.0.0/) and fix permissions in each
    try {
      for (const versionDir of readdirSync(cacheDir)) {
        const versionPath = join(cacheDir, versionDir);
        fixHookPermissions(versionPath);
      }
    } catch {
      // Non-fatal
    }
  }

  // 7. Migrate: remove legacy ~/.claude/commands/<name>/ if present
  migrateLegacyCommandsDir(pluginName);

  // 8. Update lockfile
  lock.skills[pluginName] = {
    version: pluginEntry.version || '0.0.0',
    sha,
    tier: 'BUNDLED',
    installedAt: new Date().toISOString(),
    source: 'local:specweave',
  };
  if (!lock.agents.includes('claude-code')) {
    lock.agents.push('claude-code');
  }
  try {
    writeLockfile(lock, lockDir);
  } catch {
    // Non-fatal: lockfile write failure shouldn't block install
  }

  return { success: true, sha, targetDir: cacheDir };
}

/**
 * @deprecated Use installPlugin() instead. Alias kept for backward compatibility.
 */
export const copyPlugin = installPlugin;
