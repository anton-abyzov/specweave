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
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { execFileNoThrowSync } from './execFileNoThrow.js';

/**
 * Known removed/renamed plugins that should be cleaned up
 * Add plugins here when they are removed from marketplace.json
 */
const REMOVED_PLUGINS = new Set([
  'sw-tooling',    // Removed 2025-12-11 (functionality moved to core /sw:skill)
  'sw-plugin-dev', // Removed 2026-02-02 (functionality moved to core /sw:skill)
]);

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  removedCount: number;
  removedPlugins: string[];
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

    // 2. Load marketplace to get valid plugin list
    if (!fs.existsSync(marketplaceJsonPath)) {
      throw new Error(`Marketplace not found at ${marketplaceJsonPath}`);
    }

    const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));
    const validPlugins = new Set(
      (marketplace.plugins || []).map((p: { name: string }) => p.name)
    );

    if (verbose) {
      console.log(chalk.blue(`Valid plugins in marketplace: ${Array.from(validPlugins).join(', ')}`));
    }

    // 3. Find stale plugin references
    const stalePlugins: string[] = [];

    // Check enabled plugins (format: "pluginName@marketplace")
    if (settings.enabledPlugins) {
      for (const [pluginKey, enabled] of Object.entries(settings.enabledPlugins)) {
        if (!enabled) continue; // Skip disabled plugins

        // Extract plugin name from "sw-tooling@specweave" format
        const pluginName = pluginKey.split('@')[0];
        const marketplace = pluginKey.split('@')[1];

        // Check if plugin is from specweave marketplace and is stale
        if (
          marketplace === 'specweave' &&
          (!validPlugins.has(pluginName) || REMOVED_PLUGINS.has(pluginName))
        ) {
          stalePlugins.push(pluginKey);
        }
      }
    }

    if (stalePlugins.length === 0) {
      if (verbose) {
        console.log(chalk.green('✓ No stale plugins found'));
      }
      result.success = true;
      return result;
    }

    // 4. Remove stale plugins
    if (verbose) {
      console.log(chalk.yellow(`\nFound ${stalePlugins.length} stale plugin(s):`));
      stalePlugins.forEach(p => console.log(chalk.gray(`  - ${p}`)));
    }

    for (const pluginKey of stalePlugins) {
      delete settings.enabledPlugins[pluginKey];
      result.removedPlugins.push(pluginKey);
    }

    result.removedCount = stalePlugins.length;

    // 5. Write back cleaned settings
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    if (verbose) {
      console.log(chalk.green(`\n✓ Removed ${result.removedCount} stale plugin reference(s)`));
      console.log(chalk.gray(`  Settings saved: ${settingsPath}`));
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
 * - Manual `claude plugin install` without --scope flag
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
        } else if (verbose) {
          console.log(chalk.yellow(`  ⚠ ${pluginKey}: uninstalled but reinstall failed`));
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

    const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));
    const validPlugins = new Set(
      (marketplace.plugins || []).map((p: { name: string }) => p.name)
    );

    const stalePlugins: string[] = [];

    if (settings.enabledPlugins) {
      for (const [pluginKey, enabled] of Object.entries(settings.enabledPlugins)) {
        if (!enabled) continue;

        const pluginName = pluginKey.split('@')[0];
        const marketplace = pluginKey.split('@')[1];

        if (
          marketplace === 'specweave' &&
          (!validPlugins.has(pluginName) || REMOVED_PLUGINS.has(pluginName))
        ) {
          stalePlugins.push(pluginKey);
        }
      }
    }

    return stalePlugins;
  } catch {
    return [];
  }
}
