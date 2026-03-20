/**
 * Cleanup Stale Plugin References
 *
 * Removes plugin references from ~/.claude/settings.json that no longer exist
 * in the SpecWeave marketplace. This prevents "Plugin not found" errors for
 * plugins that were removed/renamed.
 *
 * @module cleanup-stale-plugins
 * @since 0.35.2
 */

import * as fs from './fs-native.js';
import * as nodeFs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { execFileNoThrowSync } from './execFileNoThrow.js';

/**
 * Known removed/renamed plugins that should be cleaned up
 * Add plugins here when they are removed from marketplace.json
 */
const REMOVED_PLUGINS = new Set([
  'sw-tooling',    // Removed 2025-12-11 (functionality moved to core sw:skill)
  'sw-plugin-dev', // Removed 2026-02-02 (functionality moved to core sw:skill)
  'sw-github',     // Removed 2026-03-17 (consolidated into sw)
  'sw-jira',       // Removed 2026-03-17 (consolidated into sw)
  'sw-ado',        // Removed 2026-03-17 (consolidated into sw)
  'sw-release',    // Removed 2026-03-17 (consolidated into sw)
  'sw-diagrams',   // Removed 2026-03-17 (consolidated into sw)
  'docs',          // Removed 2026-03-17 (consolidated into sw)
  'sw-media',      // Removed 2026-03-17 (consolidated into sw)
]);

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  removedCount: number;
  removedPlugins: string[];
  /** Cache directories removed from disk during Phase 2 cleanup. */
  removedCacheDirs: string[];
  error?: string;
}

/**
 * Clean up stale plugin references from Claude settings
 *
 * This function:
 * 1. Reads ~/.claude/settings.json
 * 2. Loads marketplace.json to get current plugin list
 * 3. Removes any enabled plugins that don't exist in marketplace
 * 4. Writes back the cleaned settings
 *
 * @param marketplaceJsonPath - Path to marketplace.json
 * @param verbose - Show detailed output
 * @returns Cleanup result
 */
export async function cleanupStalePlugins(
  marketplaceJsonPath: string,
  verbose: boolean = false
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: false,
    removedCount: 0,
    removedPlugins: [],
    removedCacheDirs: [],
  };

  try {
    // 1. Read Claude settings
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

    if (!fs.existsSync(settingsPath)) {
      if (verbose) {
        console.log(chalk.gray('No settings.json found - nothing to clean'));
      }
      result.success = true;
      return result;
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    // 2. Load specweave marketplace (Phase 1a — existing behavior)
    if (!fs.existsSync(marketplaceJsonPath)) {
      throw new Error(`Marketplace not found at ${marketplaceJsonPath}`);
    }

    const specweaveManifest = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));
    const specweaveValidPlugins = new Set<string>(
      (specweaveManifest.plugins || []).map((p: { name: string }) => p.name)
    );

    if (verbose) {
      console.log(chalk.blue(`Valid specweave plugins: ${Array.from(specweaveValidPlugins).join(', ')}`));
    }

    // 2b. Discover all marketplaces dynamically via cache directory scan (Phase 1b)
    const cacheBase = path.join(os.homedir(), '.claude', 'plugins', 'cache');
    const marketplacesBase = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');

    // Build a map of marketplace → valid plugin names
    const marketplacePluginMap = new Map<string, Set<string>>();
    marketplacePluginMap.set('specweave', specweaveValidPlugins);

    if (fs.existsSync(cacheBase)) {
      try {
        const cacheDirs = fs.readdirSync(cacheBase, { withFileTypes: true });
        for (const dir of cacheDirs) {
          if (!dir.isDirectory()) continue;
          const mktName = dir.name;
          if (mktName === 'specweave') continue; // Already handled

          // Try to resolve marketplace.json for this marketplace
          const mktManifestPath = path.join(marketplacesBase, mktName, '.claude-plugin', 'marketplace.json');
          if (!fs.existsSync(mktManifestPath)) {
            // No manifest = marketplace was removed or never registered.
            // Register with empty set so all its plugins in settings are treated as stale.
            marketplacePluginMap.set(mktName, new Set());
            if (verbose) {
              console.log(chalk.yellow(`  Marketplace '${mktName}' has cache but no manifest — treating all plugins as stale`));
            }
            continue;
          }

          try {
            const mktManifest = JSON.parse(fs.readFileSync(mktManifestPath, 'utf-8'));
            const validNames = new Set<string>(
              (mktManifest.plugins || []).map((p: { name: string }) => p.name)
            );
            marketplacePluginMap.set(mktName, validNames);
            if (verbose) {
              console.log(chalk.blue(`  Discovered marketplace '${mktName}' with ${validNames.size} plugins`));
            }
          } catch {
            // Malformed manifest = can't validate plugins. Treat all as stale.
            marketplacePluginMap.set(mktName, new Set());
            if (verbose) {
              console.log(chalk.yellow(`  Marketplace '${mktName}' has malformed manifest — treating all plugins as stale`));
            }
          }
        }
      } catch {
        // Cache dir unreadable — proceed with specweave-only cleanup
      }
    }

    // 2c. Scan enabledPlugins for marketplaces not yet discovered via cache.
    // If a marketplace appears in settings but has no cache and no manifest,
    // register it with an empty set so its plugins are treated as stale.
    if (settings.enabledPlugins) {
      for (const pluginKey of Object.keys(settings.enabledPlugins)) {
        const mktName = pluginKey.split('@')[1];
        if (!mktName || marketplacePluginMap.has(mktName)) continue;

        // Skip well-known external marketplaces managed by Claude Code itself
        if (mktName === 'claude-plugins-official' || mktName === 'claude-code-lsps') continue;

        const mktManifestPath = path.join(marketplacesBase, mktName, '.claude-plugin', 'marketplace.json');
        if (fs.existsSync(mktManifestPath)) {
          try {
            const mktManifest = JSON.parse(fs.readFileSync(mktManifestPath, 'utf-8'));
            const validNames = new Set<string>(
              (mktManifest.plugins || []).map((p: { name: string }) => p.name)
            );
            marketplacePluginMap.set(mktName, validNames);
          } catch {
            marketplacePluginMap.set(mktName, new Set());
          }
        } else {
          // Marketplace has no cache and no manifest — treat all its plugins as stale
          marketplacePluginMap.set(mktName, new Set());
          if (verbose) {
            console.log(chalk.yellow(`  Marketplace '${mktName}' not registered — treating all plugins as stale`));
          }
        }
      }
    }

    // 3. Find stale plugin references across ALL discovered marketplaces
    const stalePlugins: string[] = [];

    if (settings.enabledPlugins) {
      for (const [pluginKey, enabled] of Object.entries(settings.enabledPlugins)) {
        if (!enabled) continue;

        const pluginName = pluginKey.split('@')[0];
        const mktName = pluginKey.split('@')[1];

        // Check against the marketplace's valid plugin set
        const validSet = marketplacePluginMap.get(mktName);
        if (!validSet) continue; // Unknown marketplace — don't touch

        if (!validSet.has(pluginName) || (mktName === 'specweave' && REMOVED_PLUGINS.has(pluginName))) {
          stalePlugins.push(pluginKey);
        }
      }
    }

    // 4. Remove stale settings entries
    if (stalePlugins.length > 0) {
      if (verbose) {
        console.log(chalk.yellow(`\nFound ${stalePlugins.length} stale plugin(s):`));
        stalePlugins.forEach(p => console.log(chalk.gray(`  - ${p}`)));
      }

      for (const pluginKey of stalePlugins) {
        delete settings.enabledPlugins[pluginKey];
        result.removedPlugins.push(pluginKey);
      }
      result.removedCount = stalePlugins.length;

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

      if (verbose) {
        console.log(chalk.green(`\n✓ Removed ${result.removedCount} stale plugin reference(s)`));
        console.log(chalk.gray(`  Settings saved: ${settingsPath}`));
      }
    } else if (verbose) {
      console.log(chalk.green('✓ No stale plugins found in settings'));
    }

    // 5. Phase 2: Remove stale cache directories from disk
    if (fs.existsSync(cacheBase)) {
      for (const [mktName, validSet] of marketplacePluginMap) {
        const mktCacheDir = path.join(cacheBase, mktName);
        if (!fs.existsSync(mktCacheDir)) continue;

        try {
          const cachedEntries = fs.readdirSync(mktCacheDir, { withFileTypes: true });
          for (const entry of cachedEntries) {
            if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
            if (validSet.has(entry.name)) continue;

            const staleDir = path.join(mktCacheDir, entry.name);
            try {
              // Atomic rename then remove to avoid partial reads
              const tempName = staleDir + '.stale-' + Date.now();
              fs.renameSync(staleDir, tempName);
              fs.rmSync(tempName, { recursive: true, force: true });
              result.removedCacheDirs.push(staleDir);
              if (verbose) {
                console.log(chalk.gray(`  Removed stale cache: ${staleDir}`));
              }
            } catch (dirErr) {
              if (verbose) {
                console.log(chalk.yellow(`  ⚠ Could not remove: ${staleDir} (${dirErr})`));
              }
            }
          }
        } catch {
          // Marketplace cache dir unreadable — skip
        }
      }
    }

    // Phase 2.5: Prune stale VERSION subdirectories within valid plugins
    const installedPluginsPath = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
    try {
      const ipRaw = fs.readFileSync(installedPluginsPath, 'utf-8');
      const ipData = JSON.parse(ipRaw);
      const plugins = ipData.plugins ?? ipData;

      if (typeof plugins === 'object' && plugins !== null && !Array.isArray(plugins)) {
        // Build map of active versions: marketplace/pluginName -> version from installPath
        const activeVersions = new Map<string, string>();
        for (const [key, entries] of Object.entries(plugins)) {
          const pluginName = key.split('@')[0];
          const mktName = key.split('@')[1];
          if (Array.isArray(entries) && entries.length > 0) {
            // Extract version from installPath (last segment of path)
            const firstEntry = entries[0];
            const installPath = (typeof firstEntry === 'object' && firstEntry !== null && 'installPath' in firstEntry)
              ? (firstEntry as Record<string, unknown>).installPath as string | undefined
              : undefined;
            if (installPath) {
              const version = path.basename(installPath);
              activeVersions.set(`${mktName}/${pluginName}`, version);
            }
          }
        }

        // Scan cache directories for stale versions
        if (activeVersions.size > 0 && fs.existsSync(cacheBase)) {
          for (const [mktName] of marketplacePluginMap) {
            const mktCacheDir = path.join(cacheBase, mktName);
            if (!fs.existsSync(mktCacheDir)) continue;

            try {
              const pluginEntries = fs.readdirSync(mktCacheDir, { withFileTypes: true });
              for (const entry of pluginEntries) {
                if (!entry.isDirectory()) continue;

                const activeVersion = activeVersions.get(`${mktName}/${entry.name}`);
                if (!activeVersion) continue;

                const pluginCacheDir = path.join(mktCacheDir, entry.name);
                try {
                  const versionDirs = fs.readdirSync(pluginCacheDir, { withFileTypes: true });
                  for (const vDir of versionDirs) {
                    if (!vDir.isDirectory() || vDir.isSymbolicLink()) continue;
                    if (vDir.name === activeVersion) continue;

                    const staleVersionPath = path.join(pluginCacheDir, vDir.name);
                    // Verify resolved path stays under cache base (symlink safety)
                    const resolved = fs.realpathSync(staleVersionPath);
                    if (!resolved.startsWith(cacheBase)) {
                      console.warn(`Phase 2.5: skipping ${staleVersionPath} — resolves outside cache`);
                      continue;
                    }
                    try {
                      // Atomic rename-then-delete (consistent with Phase 2)
                      const tempName = staleVersionPath + '.stale-' + Date.now();
                      fs.renameSync(staleVersionPath, tempName);
                      fs.rmSync(tempName, { recursive: true, force: true });
                      result.removedCacheDirs.push(staleVersionPath);
                      if (verbose) {
                        console.log(chalk.gray(`  Removed stale version: ${entry.name}/${vDir.name} (active: ${activeVersion})`));
                      }
                    } catch (err) {
                      console.debug?.(`Phase 2.5: could not remove stale version ${staleVersionPath}: ${err}`);
                      if (verbose) {
                        console.log(chalk.yellow(`  Could not remove stale version: ${staleVersionPath}`));
                      }
                    }
                  }
                } catch (err) {
                  console.debug?.(`Phase 2.5: plugin dir unreadable ${pluginCacheDir}: ${err}`);
                }
              }
            } catch (err) {
              console.debug?.(`Phase 2.5: marketplace cache dir unreadable ${mktCacheDir}: ${err}`);
            }
          }
        }
      }
    } catch (err) {
      console.debug?.(`Phase 2.5: installed_plugins.json unavailable, skipping version pruning: ${err}`);
    }

    result.success = true;
    return result;

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.error = errorMsg;

    if (verbose) {
      console.error(chalk.red(`✗ Cleanup failed: ${errorMsg}`));
    }

    return result;
  }
}

/**
 * Result of user-level plugin scope migration
 */
export interface ScopeMigrationResult {
  success: boolean;
  migratedCount: number;
  migratedPlugins: string[];
  error?: string;
}

/**
 * Migrate user-level SpecWeave domain plugins and LSP plugins to project scope
 *
 * Prevents global pollution: sw-*@specweave and *-lsp@* should NEVER live in
 * ~/.claude/settings.json (user scope). They belong in .claude/settings.json
 * (project scope) to avoid leaking across projects.
 *
 * Exempt: sw@specweave (core plugin, intentionally user-scoped)
 *
 * Sources of user-level pollution:
 * - Claude Code's own plugin discovery (installs at user scope by default)
 * - Older SpecWeave versions (pre-v1.0.210)
 * - Manual `claude plugin install` / `vskill install` without --scope flag
 *
 * @param projectDir - Project directory with .claude/settings.json (optional, skips project migration if not provided)
 * @param verbose - Show detailed output
 * @returns Migration result
 */
export async function migrateUserLevelPlugins(
  projectDir?: string,
  verbose: boolean = false
): Promise<ScopeMigrationResult> {
  const result: ScopeMigrationResult = {
    success: false,
    migratedCount: 0,
    migratedPlugins: [],
  };

  try {
    const userSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');

    if (!fs.existsSync(userSettingsPath)) {
      result.success = true;
      return result;
    }

    const userSettings = JSON.parse(fs.readFileSync(userSettingsPath, 'utf-8'));
    const enabledPlugins = userSettings.enabledPlugins as Record<string, boolean> | undefined;

    if (!enabledPlugins) {
      result.success = true;
      return result;
    }

    // Find plugins that should be project-scoped
    const toMigrate: string[] = [];
    for (const pluginKey of Object.keys(enabledPlugins)) {
      const pluginName = pluginKey.split('@')[0];

      // sw-*@specweave domain plugins (NOT sw@specweave core)
      if (/^sw-.+@specweave$/.test(pluginKey)) {
        toMigrate.push(pluginKey);
        continue;
      }

      // *-lsp@* plugins (any marketplace)
      if (pluginName.endsWith('-lsp')) {
        toMigrate.push(pluginKey);
        continue;
      }
    }

    if (toMigrate.length === 0) {
      if (verbose) {
        console.log(chalk.green('✓ No user-level plugins need migration'));
      }

      // CRITICAL FIX: Restore sw@specweave enabled state even if no migrations
      // This protects against corruption from other code paths
      try {
        const { enablePlugin } = await import('../cli/helpers/init/claude-plugin-enabler.js');
        enablePlugin('sw', 'specweave', userSettingsPath);
        if (verbose) {
          console.log(chalk.gray('  ✓ Verified sw@specweave enabled state'));
        }
      } catch {
        // Non-critical - settings may already be correct
      }

      result.success = true;
      return result;
    }

    if (verbose) {
      console.log(chalk.yellow(`\nFound ${toMigrate.length} user-level plugin(s) to migrate:`));
      toMigrate.forEach(p => console.log(chalk.gray(`  - ${p}`)));
    }

    // Migrate via CLI commands (uninstall user scope, reinstall project scope)
    // This is more robust than JSON edits because Claude Code syncs its internal
    // registry back to settings.json, overwriting direct file edits.
    for (const pluginKey of toMigrate) {
      // Uninstall from user scope
      const uninstallResult = execFileNoThrowSync('claude', ['plugin', 'uninstall', pluginKey]);
      if (uninstallResult.exitCode === 0) {
        // Reinstall at project scope
        const installResult = execFileNoThrowSync('claude', ['plugin', 'install', pluginKey, '--scope', 'project']);
        if (installResult.exitCode === 0) {
          result.migratedPlugins.push(pluginKey);
          if (verbose) {
            console.log(chalk.gray(`  - ${pluginKey}: user → project`));
          }
        } else {
          console.warn(chalk.yellow(`  ⚠ ${pluginKey}: uninstalled from user scope but reinstall to project scope failed. Run: claude plugin install ${pluginKey} --scope project`));
        }
      } else if (verbose) {
        console.log(chalk.yellow(`  ⚠ ${pluginKey}: could not uninstall from user scope`));
      }
    }
    result.migratedCount = result.migratedPlugins.length;

    if (verbose) {
      console.log(chalk.green(`✓ Migrated ${result.migratedCount} plugin(s) from user → project scope`));
    }

    // CRITICAL FIX: Restore sw@specweave enabled state after uninstall operations
    // claude plugin uninstall can corrupt the entire enabledPlugins object as a side effect
    try {
      const { enablePlugin } = await import('../cli/helpers/init/claude-plugin-enabler.js');
      enablePlugin('sw', 'specweave', userSettingsPath);
      if (verbose) {
        console.log(chalk.gray('  ✓ Restored sw@specweave enabled state'));
      }
    } catch {
      // Non-critical - settings may already be correct
    }

    result.success = true;
    return result;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.error = errorMsg;
    if (verbose) {
      console.error(chalk.red(`✗ Scope migration failed: ${errorMsg}`));
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Stale lockfile cleanup (v1.0.541)
// ---------------------------------------------------------------------------

/** Options for stale lockfile cleanup functions. */
export interface StaleFileCleanupOptions {
  verbose?: boolean;
  /** Override for testing: inject a custom fs module. */
  customFs?: typeof import('fs');
  /** Mtime threshold in ms — files modified more recently than this are skipped. Default: 5000. */
  mtimeThresholdMs?: number;
}

/** Result of a stale lockfile cleanup operation. */
export interface StaleFileResult {
  success: boolean;
  removedCount: number;
  skippedCount: number;
  removedPaths: string[];
  skippedPaths: string[];
  errors: Array<{ path: string; error: string }>;
}

/** Directories to skip during recursive walks. */
const SKIP_DIRS = new Set(['node_modules', '.git', '.specweave']);

function makeEmptyResult(): StaleFileResult {
  return { success: true, removedCount: 0, skippedCount: 0, removedPaths: [], skippedPaths: [], errors: [] };
}

/**
 * Recursively find all files matching `fileName` under `root`, skipping excluded dirs.
 */
function walkForFile(root: string, fileName: string, fsImpl: typeof import('fs')): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    try {
      const names = fsImpl.readdirSync(dir);
      for (const name of names) {
        if (SKIP_DIRS.has(name)) continue;
        const fullPath = path.join(dir, name);
        try {
          const stat = fsImpl.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (name === fileName) {
            results.push(fullPath);
          }
        } catch {
          // Can't stat — skip entry
        }
      }
    } catch {
      // Can't read dir — skip
    }
  }

  walk(root);
  return results;
}

/**
 * Remove all `skills-lock.json` files from the project tree.
 * This is a dead legacy format with no code references.
 *
 * @param projectRoot - Root of the project to scan
 * @param options - Cleanup options (verbose, fs override, mtime threshold)
 */
export function cleanupLegacyLockfiles(
  projectRoot: string,
  options: StaleFileCleanupOptions = {}
): StaleFileResult {
  const result = makeEmptyResult();
  const fsImpl = options.customFs || nodeFs;
  const threshold = options.mtimeThresholdMs ?? 5000;

  const files = walkForFile(projectRoot, 'skills-lock.json', fsImpl);

  for (const filePath of files) {
    try {
      if (threshold > 0) {
        const stat = fsImpl.statSync(filePath);
        if (Date.now() - stat.mtimeMs < threshold) {
          result.skippedCount++;
          result.skippedPaths.push(filePath);
          if (options.verbose) {
            console.log(chalk.gray(`  Skipped (recent): ${filePath}`));
          }
          continue;
        }
      }
      fsImpl.unlinkSync(filePath);
      result.removedCount++;
      result.removedPaths.push(filePath);
      if (options.verbose) {
        console.log(chalk.gray(`  Removed: ${filePath}`));
      }
    } catch (err) {
      result.errors.push({ path: filePath, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}

/**
 * Remove orphaned `vskill.lock` files in child repos of an umbrella project.
 * Only the umbrella root `vskill.lock` is authoritative; child-repo copies are orphans.
 *
 * @param projectRoot - Root of the umbrella project
 * @param options - Cleanup options
 */
export function cleanupOrphanedChildLocks(
  projectRoot: string,
  options: StaleFileCleanupOptions = {}
): StaleFileResult {
  const result = makeEmptyResult();
  const fsImpl = options.customFs || nodeFs;
  const threshold = options.mtimeThresholdMs ?? 5000;

  // Check if this is an umbrella project
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (!fsImpl.existsSync(configPath)) return result;

  let isUmbrella = false;
  try {
    const config = JSON.parse(fsImpl.readFileSync(configPath, 'utf-8'));
    isUmbrella = config?.umbrella?.enabled === true || config?.repository?.umbrellaRepo === true;
  } catch {
    return result;
  }

  if (!isUmbrella) return result;

  // Scan repositories/*/*/vskill.lock
  const reposDir = path.join(projectRoot, 'repositories');
  if (!fsImpl.existsSync(reposDir)) return result;

  try {
    const orgNames = fsImpl.readdirSync(reposDir);
    for (const orgName of orgNames) {
      const orgPath = path.join(reposDir, orgName);
      try {
        const orgStat = fsImpl.statSync(orgPath);
        if (!orgStat.isDirectory()) continue;
      } catch { continue; }

      const repoNames = fsImpl.readdirSync(orgPath);
      for (const repoName of repoNames) {
        const repoPath = path.join(orgPath, repoName);
        try {
          const repoStat = fsImpl.lstatSync(repoPath);
          if (!repoStat.isDirectory() && !repoStat.isSymbolicLink()) continue;
        } catch { continue; }

        const lockPath = path.join(repoPath, 'vskill.lock');

        if (!fsImpl.existsSync(lockPath)) continue;

        // Symlink escape prevention — use path.relative() for boundary-safe check
        try {
          const realLockPath = fsImpl.realpathSync(lockPath);
          const realProjectRoot = fsImpl.realpathSync(projectRoot);
          const relative = path.relative(realProjectRoot, realLockPath);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            result.errors.push({ path: lockPath, error: 'Symlink resolves outside project root' });
            continue;
          }
        } catch {
          // realpathSync failed — skip this file
          result.errors.push({ path: lockPath, error: 'Could not resolve real path' });
          continue;
        }

        try {
          if (threshold > 0) {
            const stat = fsImpl.statSync(lockPath);
            if (Date.now() - stat.mtimeMs < threshold) {
              result.skippedCount++;
              result.skippedPaths.push(lockPath);
              if (options.verbose) {
                console.log(chalk.yellow(`  Skipped (recent): ${lockPath}`));
              }
              continue;
            }
          }
          fsImpl.unlinkSync(lockPath);
          result.removedCount++;
          result.removedPaths.push(lockPath);
          if (options.verbose) {
            console.log(chalk.gray(`  Removed orphaned lock: ${lockPath}`));
          }
        } catch (err) {
          result.errors.push({ path: lockPath, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  } catch {
    // repositories dir unreadable — return what we have
  }

  return result;
}

/**
 * Check if there are stale plugins without removing them
 *
 * @param marketplaceJsonPath - Path to marketplace.json
 * @returns List of stale plugin keys
 */
export async function detectStalePlugins(
  marketplaceJsonPath: string
): Promise<string[]> {
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

    if (!fs.existsSync(settingsPath)) {
      return [];
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    if (!fs.existsSync(marketplaceJsonPath)) {
      return [];
    }

    // Build marketplace plugin map (same approach as cleanupStalePlugins)
    const specweaveManifest = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));
    const specweaveValidPlugins = new Set<string>(
      (specweaveManifest.plugins || []).map((p: { name: string }) => p.name)
    );

    const cacheBase = path.join(os.homedir(), '.claude', 'plugins', 'cache');
    const marketplacesBase = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');
    const marketplacePluginMap = new Map<string, Set<string>>();
    marketplacePluginMap.set('specweave', specweaveValidPlugins);

    // Discover additional marketplaces from cache
    if (fs.existsSync(cacheBase)) {
      try {
        const cacheDirs = fs.readdirSync(cacheBase, { withFileTypes: true });
        for (const dir of cacheDirs) {
          if (!dir.isDirectory() || dir.name === 'specweave') continue;
          const mktManifestPath = path.join(marketplacesBase, dir.name, '.claude-plugin', 'marketplace.json');
          if (fs.existsSync(mktManifestPath)) {
            try {
              const mktManifest = JSON.parse(fs.readFileSync(mktManifestPath, 'utf-8'));
              marketplacePluginMap.set(dir.name, new Set<string>(
                (mktManifest.plugins || []).map((p: { name: string }) => p.name)
              ));
            } catch {
              marketplacePluginMap.set(dir.name, new Set());
            }
          } else {
            marketplacePluginMap.set(dir.name, new Set());
          }
        }
      } catch {
        // Cache dir unreadable — proceed with specweave-only detection
      }
    }

    // Discover marketplaces from settings that aren't in cache
    if (settings.enabledPlugins) {
      for (const pluginKey of Object.keys(settings.enabledPlugins)) {
        const mktName = pluginKey.split('@')[1];
        if (!mktName || marketplacePluginMap.has(mktName)) continue;
        if (mktName === 'claude-plugins-official' || mktName === 'claude-code-lsps') continue;

        const mktManifestPath = path.join(marketplacesBase, mktName, '.claude-plugin', 'marketplace.json');
        if (fs.existsSync(mktManifestPath)) {
          try {
            const mktManifest = JSON.parse(fs.readFileSync(mktManifestPath, 'utf-8'));
            marketplacePluginMap.set(mktName, new Set<string>(
              (mktManifest.plugins || []).map((p: { name: string }) => p.name)
            ));
          } catch {
            marketplacePluginMap.set(mktName, new Set());
          }
        } else {
          marketplacePluginMap.set(mktName, new Set());
        }
      }
    }

    const stalePlugins: string[] = [];

    if (settings.enabledPlugins) {
      for (const [pluginKey, enabled] of Object.entries(settings.enabledPlugins)) {
        if (!enabled) continue;

        const pluginName = pluginKey.split('@')[0];
        const mktName = pluginKey.split('@')[1];

        const validSet = marketplacePluginMap.get(mktName);
        if (!validSet) continue; // Unknown marketplace — don't touch

        if (!validSet.has(pluginName) || (mktName === 'specweave' && REMOVED_PLUGINS.has(pluginName))) {
          stalePlugins.push(pluginKey);
        }
      }
    }

    return stalePlugins;
  } catch {
    return [];
  }
}
