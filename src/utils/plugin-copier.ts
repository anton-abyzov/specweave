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
  copyFileSync,
  cpSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join, resolve, dirname, normalize } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { execFileNoThrowSync } from './execFileNoThrow.js';
import { consoleLogger } from './logger.js';
import { compareSemverDesc } from './semver-sort.js';
// getProjectRoot no longer used here — bundled plugins use global lock
import { getPluginScope, getScopeArgs } from '../core/types/plugin-scope.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CopyPluginOptions {
  /** Force reinstall even if hash matches lockfile */
  force?: boolean;
  /** Override target skills directory (relative to projectRoot). Defaults to '.claude/skills'. */
  targetSkillsDir?: string;
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

/** Global bundled plugin hash cache filename */
export const GLOBAL_LOCKFILE_NAME = 'plugins-lock.json';

/** Legacy installation path — used only for migration cleanup */
const LEGACY_COMMANDS_DIR = join(homedir(), '.claude', 'commands');

/** Native plugin cache base path */
const PLUGIN_CACHE_DIR = join(homedir(), '.claude', 'plugins', 'cache');

// ---------------------------------------------------------------------------
// Native plugin detection
// ---------------------------------------------------------------------------

/**
 * Check if the core SW plugin is installed and enabled natively in Claude Code.
 *
 * Runs `claude plugin list` and parses the output for `sw@specweave` with
 * enabled status. This is cross-platform and does not rely on internal file
 * formats that may change between Claude Code versions.
 *
 * @returns true if sw@specweave is present and enabled
 */
export function isSwPluginInstalledNatively(): boolean {
  try {
    const result = execFileNoThrowSync('claude', ['plugin', 'list'], { timeout: 10_000 });
    if (!result.success || !result.stdout) return false;

    const lines = result.stdout.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('sw@specweave')) {
        // Check subsequent lines for Status field
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].includes('Status:') && lines[j].includes('enabled')) return true;
          if (lines[j].includes('Status:')) return false; // present but disabled
          if (lines[j].trim().startsWith('❯')) break; // next plugin entry
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 content hash (first 12 hex chars) for a plugin directory.
 * Hashes filename + content for every readable file to detect any change.
 * Path separators are normalized to '/' for cross-platform consistency.
 */
export function computePluginHash(pluginDir: string): string {
  if (!existsSync(pluginDir)) {
    consoleLogger.debug(`computePluginHash: directory not found: ${pluginDir}`);
    return '';
  }

  const hash = createHash('sha256');
  try {
    const files = readdirSync(pluginDir, { recursive: true, encoding: 'utf-8' });
    for (const file of files.sort()) {
      const fullPath = join(pluginDir, file);
      try {
        const stat = statSync(fullPath, { throwIfNoEntry: false });
        if (!stat?.isFile()) continue;
        const content = readFileSync(fullPath);
        // Normalize path separators for cross-platform hash consistency
        hash.update(file.replace(/\\/g, '/'));
        hash.update('\0');
        hash.update(content);
        hash.update('\0');
      } catch (err) {
        consoleLogger.debug(`computePluginHash: skipping unreadable entry: ${err instanceof Error ? err.message : err}`);
      }
    }
  } catch (err) {
    consoleLogger.debug(`computePluginHash: directory read failed: ${err instanceof Error ? err.message : err}`);
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
  } catch (err) {
    consoleLogger.debug(`fixHookPermissions failed for ${targetDir}: ${err instanceof Error ? err.message : err}`);
  }
}

// ---------------------------------------------------------------------------
// Force content sync (0872)
// ---------------------------------------------------------------------------

export interface SyncContentResult {
  /** Number of installPaths whose content was (re)copied. */
  synced: number;
  /** The installPaths that were synced. */
  paths: string[];
  /** The manifest version the content was synced to (if resolvable). */
  toVersion?: string;
}

/**
 * Force the installed plugin CONTENT to match the current package.
 *
 * Why: `claude plugin install` (which refresh-plugins wraps) records a fixed
 * installPath in installed_plugins.json and, on re-run after a version bump,
 * reports "active" WITHOUT re-copying content — so users keep stale hooks/skills.
 * This copies the plugin source into every recorded installPath (recreating a
 * wiped dir), fixes hook permissions, and refreshes the stale version label.
 *
 * Never throws — returns { synced: 0 } on any problem (missing/malformed
 * installed_plugins.json, plugin not in marketplace, absent source dir).
 *
 * @param pluginName    Marketplace plugin name (e.g. "sw").
 * @param specweaveRoot Marketplace root (contains .claude-plugin/marketplace.json + plugins/).
 * @param opts.homeOverride  Override $HOME (for tests).
 */
export function syncNativePluginContent(
  pluginName: string,
  specweaveRoot: string,
  opts: { homeOverride?: string } = {},
): SyncContentResult {
  const empty: SyncContentResult = { synced: 0, paths: [] };
  try {
    // 1. Resolve the plugin's source dir from the marketplace's `source` mapping.
    const marketplacePath = join(specweaveRoot, '.claude-plugin', 'marketplace.json');
    if (!existsSync(marketplacePath)) return empty;
    const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf-8'));
    const entry = (marketplace?.plugins ?? []).find((p: { name?: string }) => p?.name === pluginName);
    if (!entry?.source) return empty;
    const sourceDir = resolve(specweaveRoot, entry.source);
    if (!existsSync(sourceDir)) return empty;

    // 2. Read the install records for this plugin from installed_plugins.json.
    const home = opts.homeOverride ?? homedir();
    const installedPath = join(home, '.claude', 'plugins', 'installed_plugins.json');
    if (!existsSync(installedPath)) return empty;
    const installed = JSON.parse(readFileSync(installedPath, 'utf-8'));
    const key = `${pluginName}@specweave`;
    const raw = installed?.plugins?.[key];
    const records: Array<Record<string, unknown>> = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (records.length === 0) return empty;

    // 3. Resolve the source manifest version (for the label refresh).
    let toVersion: string | undefined;
    try {
      const manifest = JSON.parse(
        readFileSync(join(sourceDir, '.claude-plugin', 'plugin.json'), 'utf-8'),
      );
      toVersion = typeof manifest?.version === 'string' ? manifest.version : undefined;
    } catch { /* no manifest — leave version label as-is */ }

    // 4. Copy source → each installPath (recreate if wiped) + fix perms + label.
    const paths: string[] = [];
    let recordsChanged = false;
    const now = new Date().toISOString();
    for (const rec of records) {
      const installPath = typeof rec?.installPath === 'string' ? rec.installPath : '';
      if (!installPath) continue;
      try {
        mkdirSync(installPath, { recursive: true });
        cpSync(sourceDir, installPath, { recursive: true, force: true });
        fixHookPermissions(installPath);
        paths.push(installPath);
        if (toVersion && rec.version !== toVersion) {
          rec.version = toVersion;
          rec.lastUpdated = now;
          recordsChanged = true;
        }
      } catch (err) {
        consoleLogger.debug(`syncNativePluginContent: copy to ${installPath} failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    // 5. Persist the refreshed version labels.
    if (recordsChanged) {
      try {
        writeFileSync(installedPath, JSON.stringify(installed, null, 2));
      } catch (err) {
        consoleLogger.debug(`syncNativePluginContent: failed to write installed_plugins.json: ${err instanceof Error ? err.message : err}`);
      }
    }

    return { synced: paths.length, paths, ...(toVersion ? { toVersion } : {}) };
  } catch (err) {
    consoleLogger.debug(`syncNativePluginContent failed: ${err instanceof Error ? err.message : err}`);
    return empty;
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
  } catch (err) {
    consoleLogger.debug(`migrateLegacyCommandsDir: failed to remove ${legacyDir}: ${err}`);
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
  } catch (err) {
    consoleLogger.warn(`Failed to parse marketplace.json at ${marketplacePath}: ${err instanceof Error ? err.message : err}`);
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
    const lock = JSON.parse(readFileSync(p, 'utf-8')) as VskillLock;
    if (!Array.isArray(lock.agents)) lock.agents = ['claude-code'];
    if (!lock.skills || typeof lock.skills !== 'object') lock.skills = {};
    return lock;
  } catch (err) {
    consoleLogger.debug(`Failed to parse lockfile at ${p}: ${err instanceof Error ? err.message : err}`);
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
// Global lockfile (bundled plugin hash cache at ~/.specweave/)
// ---------------------------------------------------------------------------

/**
 * Return the global lock directory (~/.specweave/), creating it if needed.
 * Accepts an optional homeDir override for testing.
 */
export function getGlobalLockDir(homeOverride?: string): string {
  const home = homeOverride ?? homedir();
  if (!home) throw new Error('No home directory');
  const dir = join(home, '.specweave');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Read the global plugins-lock.json.
 */
export function readGlobalLockfile(homeOverride?: string): VskillLock | null {
  try {
    const dir = getGlobalLockDir(homeOverride);
    const p = join(dir, GLOBAL_LOCKFILE_NAME);
    if (!existsSync(p)) return null;
    const lock = JSON.parse(readFileSync(p, 'utf-8')) as VskillLock;
    if (!Array.isArray(lock.agents)) lock.agents = ['claude-code'];
    if (!lock.skills || typeof lock.skills !== 'object') lock.skills = {};
    return lock;
  } catch (err) {
    consoleLogger.debug(`Failed to read global lockfile: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/**
 * Write the global plugins-lock.json.
 */
export function writeGlobalLockfile(lock: VskillLock, homeOverride?: string): void {
  const dir = getGlobalLockDir(homeOverride);
  const toWrite = { ...lock, updatedAt: new Date().toISOString() };
  writeFileSync(join(dir, GLOBAL_LOCKFILE_NAME), JSON.stringify(toWrite, null, 2) + '\n', 'utf-8');
}

/**
 * Ensure global lockfile exists, creating one if needed.
 */
export function ensureGlobalLockfile(homeOverride?: string): VskillLock {
  const existing = readGlobalLockfile(homeOverride);
  if (existing) return existing;

  const lock: VskillLock = {
    version: 1,
    agents: ['claude-code'],
    skills: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeGlobalLockfile(lock, homeOverride);
  return lock;
}

// ---------------------------------------------------------------------------
// Migration: move bundled entries from project vskill.lock to global lock
// ---------------------------------------------------------------------------

/**
 * Migrate bundled plugin entries (source: 'local:specweave') from a project's
 * vskill.lock to the global ~/.specweave/plugins-lock.json.
 *
 * - Only moves entries with source === 'local:specweave'
 * - Preserves newer global entries (timestamp comparison)
 * - Deletes project vskill.lock if it becomes empty after migration
 * - Idempotent: safe to run multiple times
 */
export function migrateBundledToGlobalLock(
  projectRoot: string,
  homeOverride?: string,
): { migratedCount: number; deletedProjectLock: boolean } {
  const projectLock = readLockfile(projectRoot);
  if (!projectLock) return { migratedCount: 0, deletedProjectLock: false };

  const bundledEntries = Object.entries(projectLock.skills)
    .filter(([, entry]) => entry.source === 'local:specweave');

  if (bundledEntries.length === 0) return { migratedCount: 0, deletedProjectLock: false };

  const globalLock = ensureGlobalLockfile(homeOverride);
  let migratedCount = 0;

  for (const [name, entry] of bundledEntries) {
    const existing = globalLock.skills[name];
    // Only overwrite if global entry doesn't exist or project entry is newer
    if (!existing || entry.installedAt > existing.installedAt) {
      globalLock.skills[name] = entry;
    }
    delete projectLock.skills[name];
    migratedCount++;
  }

  writeGlobalLockfile(globalLock, homeOverride);

  // Delete project lock if no entries remain
  const remainingSkills = Object.keys(projectLock.skills).length;
  let deletedProjectLock = false;
  if (remainingSkills === 0) {
    try {
      rmSync(join(projectRoot, LOCKFILE_NAME), { force: true });
      deletedProjectLock = true;
    } catch { /* non-fatal */ }
  } else {
    writeLockfile(projectLock, projectRoot);
  }

  return { migratedCount, deletedProjectLock };
}

// ---------------------------------------------------------------------------
// Migration: remove satellite plugin entries from lockfiles
// ---------------------------------------------------------------------------

/** Satellite plugin names that were consolidated into the unified 'sw' plugin. */
const SATELLITE_PLUGIN_NAMES = new Set([
  'sw-github',
  'sw-jira',
  'sw-ado',
  'sw-release',
  'sw-diagrams',
  'docs',
  'sw-media',
]);

/**
 * Remove satellite plugin entries from both global and project lockfiles.
 *
 * After consolidation, all satellite skills ship under the 'sw' plugin.
 * This function cleans up stale lockfile entries that reference the old
 * satellite plugin names.
 *
 * - Idempotent: safe to run multiple times
 * - Failure non-blocking: returns {migratedCount: 0} on any error
 *
 * @param projectRoot - Project directory (optional — only global lock if omitted)
 * @param homeOverride - Override home directory for testing
 */
export function migrateSatelliteToUnifiedLock(
  projectRoot?: string,
  homeOverride?: string,
): { migratedCount: number } {
  let migratedCount = 0;

  try {
    // 1. Clean global plugins-lock.json
    const globalLock = readGlobalLockfile(homeOverride);
    if (globalLock) {
      let globalChanged = false;
      for (const skillName of Object.keys(globalLock.skills)) {
        const entry = globalLock.skills[skillName];
        // Match entries whose source references a satellite plugin
        if (entry.source && SATELLITE_PLUGIN_NAMES.has(entry.source.replace('local:', ''))) {
          delete globalLock.skills[skillName];
          migratedCount++;
          globalChanged = true;
        }
      }
      if (globalChanged) {
        writeGlobalLockfile(globalLock, homeOverride);
      }
    }

    // 2. Clean project vskill.lock (if provided)
    if (projectRoot) {
      const projectLock = readLockfile(projectRoot);
      if (projectLock) {
        let projectChanged = false;
        for (const skillName of Object.keys(projectLock.skills)) {
          const entry = projectLock.skills[skillName];
          if (entry.source && SATELLITE_PLUGIN_NAMES.has(entry.source.replace('local:', ''))) {
            delete projectLock.skills[skillName];
            migratedCount++;
            projectChanged = true;
          }
        }
        if (projectChanged) {
          const remaining = Object.keys(projectLock.skills).length;
          if (remaining === 0) {
            try {
              rmSync(join(projectRoot, LOCKFILE_NAME), { force: true });
            } catch (err) { consoleLogger.debug(`migrateSatelliteToUnifiedLock: failed to remove project lockfile: ${err}`); }
          } else {
            writeLockfile(projectLock, projectRoot);
          }
        }
      }
    }
  } catch (err) {
    consoleLogger.debug(`migrateSatelliteToUnifiedLock: non-blocking failure: ${err}`);
  }

  return { migratedCount };
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
      } catch (err) {
        consoleLogger.debug(`Invalid package.json at ${pkgPath}: ${err instanceof Error ? err.message : err}`);
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Cache validation
// ---------------------------------------------------------------------------

/**
 * Validate that a plugin's cache directory contains the minimum required structure.
 * Catches partial installs where `claude plugin install` exits 0 but cache is incomplete.
 */
function validatePluginCache(
  cacheDir: string,
  pluginName: string,
): { valid: true } | { valid: false; error: string } {
  if (!existsSync(cacheDir)) {
    return { valid: false, error: `Plugin cache dir missing after install: ${cacheDir}` };
  }

  let versionDirs: string[];
  try {
    versionDirs = readdirSync(cacheDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return { valid: false, error: `Cannot read plugin cache dir: ${cacheDir}` };
  }

  if (versionDirs.length === 0) {
    return { valid: false, error: `Plugin "${pluginName}" cache is empty (no version directories)` };
  }

  // Pick latest version dir (semver descending)
  const sorted = [...versionDirs].sort(compareSemverDesc);
  const latestDir = join(cacheDir, sorted[0]);

  // Check for plugin.json
  if (!existsSync(join(latestDir, '.claude-plugin', 'plugin.json'))) {
    return { valid: false, error: `Plugin "${pluginName}" cache missing .claude-plugin/plugin.json in ${sorted[0]}` };
  }

  // Check for at least one component directory
  const hasSkills = existsSync(join(latestDir, 'skills'));
  const hasHooks = existsSync(join(latestDir, 'hooks'));
  const hasCommands = existsSync(join(latestDir, 'commands'));

  if (!hasSkills && !hasHooks && !hasCommands) {
    return { valid: false, error: `Plugin "${pluginName}" cache has no skills/, hooks/, or commands/ in ${sorted[0]}` };
  }

  return { valid: true };
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

  // 3. Ensure marketplace is registered — runs before the hash check so that
  //    known_marketplaces.json is repaired even when the plugin content is unchanged.
  //    We check the file first to avoid a CLI spawn on every call when already healthy.
  const knownMarketplacesPath = join(homedir(), '.claude', 'plugins', 'known_marketplaces.json');
  let marketplaceRegistered = false;
  try {
    const mkts = JSON.parse(readFileSync(knownMarketplacesPath, 'utf-8'));
    marketplaceRegistered = typeof mkts === 'object' && mkts !== null && 'specweave' in mkts;
  } catch (err) { consoleLogger.debug(`installPlugin: known_marketplaces.json read failed: ${err}`); }

  if (!marketplaceRegistered) {
    execFileNoThrowSync('claude', ['plugin', 'marketplace', 'add', specweaveRoot], { timeout: 10_000 });
  }

  // 4. Compute hash and check global lockfile
  const sha = computePluginHash(sourceDir);
  let lock: VskillLock;
  try {
    lock = ensureGlobalLockfile();
  } catch (err) {
    consoleLogger.warn(`installPlugin: global lockfile unavailable, using in-memory lock: ${err}`);
    lock = { version: 1, agents: ['claude-code'], skills: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  if (!options.force && lock.skills[pluginName]?.sha === sha) {
    // Hash unchanged — but only skip if the plugin is actually installed in Claude Code.
    // installed_plugins.json can be wiped by a Claude Code update, in which case we must
    // reinstall even though the source content hasn't changed.
    const installedPluginsPath = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
    let isActuallyInstalled = false;
    try {
      const data = JSON.parse(readFileSync(installedPluginsPath, 'utf-8'));
      const plugins = data.plugins ?? data;
      isActuallyInstalled = !Array.isArray(plugins) && typeof plugins === 'object'
        && plugins !== null && `${pluginName}@specweave` in plugins;
    } catch (err) { consoleLogger.debug(`installPlugin: installed_plugins.json check failed: ${err}`); }

    if (isActuallyInstalled) {
      return { success: true, sha, skipped: true };
    }
    // Plugin missing from installed_plugins.json — fall through to reinstall
  }

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
      const versionDirs = readdirSync(cacheDir);
      if (versionDirs.length > 1) {
        consoleLogger.debug(`Plugin "${pluginName}": ${versionDirs.length} version dirs in cache, consider cleanup`);
      }
      for (const versionDir of versionDirs) {
        const versionPath = join(cacheDir, versionDir);
        fixHookPermissions(versionPath);
      }
    } catch (err) {
      consoleLogger.debug(`installPlugin: hook permission fix failed for ${pluginName}: ${err}`);
    }
  }

  // 6b. Validate cache integrity — catch partial installs
  const validation = validatePluginCache(cacheDir, pluginName);
  if (!validation.valid) {
    return { success: false, sha, error: validation.error };
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
    writeGlobalLockfile(lock);
  } catch (err) {
    consoleLogger.warn(`Plugin installed but lockfile write failed: ${err instanceof Error ? err.message : err}`);
  }

  return { success: true, sha, targetDir: cacheDir };
}

/**
 * @deprecated Use installPlugin() instead. Alias kept for backward compatibility.
 */
export const copyPlugin = installPlugin;

// ---------------------------------------------------------------------------
// Frontmatter normalization for non-Claude targets
// ---------------------------------------------------------------------------

/** Claude-specific frontmatter fields to strip for non-Claude tools */
const CLAUDE_FIELDS = [
  /^user-invoc?k?able\s*:.*\n?/gm,
  /^allowed-tools\s*:.*\n?/gm,
  /^model\s*:.*\n?/gm,
  /^argument-hint\s*:.*\n?/gm,
  /^context\s*:.*\n?/gm,
];

/** Match a multi-line hooks: block (hooks: line + all indented continuation lines) */
const HOOKS_BLOCK_RE = /^hooks\s*:.*\n(?:[ \t]+.*\n)*/gm;

/**
 * Normalize SKILL.md frontmatter for non-Claude tools:
 * - Ensure `name:` field (derived from skill directory name)
 * - Ensure `description:` field (extracted from body if missing)
 * - Strip Claude-specific fields (user-invocable, allowed-tools, model, hooks, etc.)
 */
function normalizeSkillFrontmatter(content: string, skillName: string): string {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---')) {
    const desc = extractFirstContentLine(normalized, skillName);
    return `---\nname: ${skillName}\ndescription: ${desc}\n---\n\n${normalized}`;
  }

  const endIdx = normalized.indexOf('---', 3);
  if (endIdx === -1) return normalized;

  let fmBlock = normalized.substring(3, endIdx);
  const body = normalized.substring(endIdx + 3);

  // Strip Claude-specific single-line fields
  for (const pattern of CLAUDE_FIELDS) {
    fmBlock = fmBlock.replace(new RegExp(pattern.source, pattern.flags), '');
  }
  // Strip multi-line hooks: block
  fmBlock = fmBlock.replace(HOOKS_BLOCK_RE, '');

  // Ensure name:
  if (!/^name\s*:/m.test(fmBlock)) {
    fmBlock = `name: ${skillName}\n${fmBlock}`;
  }

  // Ensure description:
  if (!/^description\s*:/m.test(fmBlock)) {
    const desc = extractFirstContentLine(body, skillName);
    fmBlock = `${fmBlock}description: ${desc}\n`;
  }

  return `---\n${fmBlock.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n')}---${body}`;
}

/**
 * Extract first non-blank, non-heading line from body for description fallback.
 */
function extractFirstContentLine(body: string, fallback: string): string {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const clean = trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
    // Quote if contains YAML-special chars
    if (/[:#\[\]{}'*&!>|"\\]/.test(clean)) {
      return `"${clean.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return clean;
  }
  return fallback.replace(/-/g, ' ');
}

// ---------------------------------------------------------------------------
// Core: copyPluginSkillsToProject (v1.0.535 — direct file copy, no CLI)
// ---------------------------------------------------------------------------

/**
 * Copy all skills from a specweave plugin directly into .claude/skills/.
 *
 * Instead of using `claude plugin install` (which writes to global cache),
 * this walks the plugin's skills/ directory and copies each SKILL.md to
 * the project-local `.claude/skills/{skillName}/SKILL.md`.
 *
 * @param pluginName - Name of the plugin in marketplace.json
 * @param specweaveRoot - Root of the specweave package
 * @param projectRoot - Root of the user's project (where .claude/ lives)
 * @param options - Installation options
 * @returns Installation result
 */
export function copyPluginSkillsToProject(
  pluginName: string,
  specweaveRoot: string,
  projectRoot: string,
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

  // 3. Compute hash and check global lockfile for skip
  //    Bundled plugin state is global (same as installPlugin), not per-project.
  const sha = computePluginHash(sourceDir);
  let lock: VskillLock;
  try {
    lock = ensureGlobalLockfile();
  } catch (err) {
    consoleLogger.warn(`copyPluginSkillsToProject: global lockfile unavailable, using in-memory lock: ${err}`);
    lock = { version: 1, agents: ['claude-code'], skills: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  if (!options.force && lock.skills[pluginName]?.sha === sha) {
    return { success: true, sha, skipped: true };
  }

  // 4. Find skills/ subdirectory in the plugin source
  const skillsDir = join(sourceDir, 'skills');
  if (!existsSync(skillsDir)) {
    // Plugin has no skills (e.g. hooks-only plugin) — nothing to copy
    return { success: true, sha, skipped: true };
  }

  // 5. Recursively copy each skill directory to the target skills directory.
  //    Copies ALL files (SKILL.md, agents/, phases/, templates/, evals/, etc.)
  //    so that SKILL.md references to subdirectories resolve correctly.
  const skillsDirRelative = options.targetSkillsDir || join('.claude', 'skills');
  const targetSkillsBase = join(projectRoot, skillsDirRelative);
  const isClaudeTarget = !options.targetSkillsDir || normalize(options.targetSkillsDir) === normalize(join('.claude', 'skills'));
  let copiedCount = 0;

  try {
    const skillDirs = readdirSync(skillsDir, { encoding: 'utf-8' });
    for (const skillName of skillDirs) {
      const skillSourceDir = join(skillsDir, skillName);

      // Skip non-directories and symlinks
      try {
        const st = lstatSync(skillSourceDir);
        if (!st.isDirectory()) continue;
      } catch (err) {
        consoleLogger.debug(`copyPluginSkillsToProject: lstat failed for ${skillSourceDir}: ${err}`);
        continue;
      }

      const skillMdPath = join(skillSourceDir, 'SKILL.md');
      if (!existsSync(skillMdPath)) continue;

      // Recursively copy all files in this skill directory.
      // For non-Claude targets, normalize SKILL.md frontmatter (ensure name + description,
      // strip Claude-specific fields) so that non-Claude tools can discover the skill.
      const targetDir = join(targetSkillsBase, skillName);
      const allFiles = readdirSync(skillSourceDir, { recursive: true, encoding: 'utf-8' });
      for (const file of allFiles) {
        const srcPath = join(skillSourceDir, file);
        try {
          const st = lstatSync(srcPath);
          if (!st.isFile()) continue; // skip directories and symlinks
          const destPath = join(targetDir, file);
          mkdirSync(dirname(destPath), { recursive: true });
          if (!isClaudeTarget && file === 'SKILL.md') {
            const content = readFileSync(srcPath, 'utf-8');
            writeFileSync(destPath, normalizeSkillFrontmatter(content, skillName), 'utf-8');
          } else {
            copyFileSync(srcPath, destPath);
          }
        } catch (err) {
          consoleLogger.debug(`copyPluginSkillsToProject: skipping unreadable file ${srcPath}: ${err}`);
        }
      }
      copiedCount++;
    }
  } catch (err) {
    return { success: false, sha, error: `Failed to copy skills: ${err}` };
  }

  if (copiedCount === 0) {
    consoleLogger.warn(`Plugin "${pluginName}": skills/ directory exists but no skills were copied`);
  }

  // 6. Hooks are now handled via CLI delegation (specweave hook <event>).
  //    hooks.json in the plugin source is loaded by Claude Code directly via
  //    the plugin cache — no need to copy hook scripts to .claude/hooks/.

  // 7. Migrate: remove legacy ~/.claude/commands/<name>/ if present (Claude-only)
  if (isClaudeTarget) {
    migrateLegacyCommandsDir(pluginName);
  }

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
    writeGlobalLockfile(lock);
  } catch (err) {
    consoleLogger.warn(`Plugin skills copied but lockfile write failed: ${err instanceof Error ? err.message : err}`);
  }

  return { success: true, sha, targetDir: targetSkillsBase };
}
