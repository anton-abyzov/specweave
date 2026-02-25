/**
 * Plugin Installation Flag Management
 *
 * Creates and manages flag files that track plugin installations during
 * a Claude Code session. These flags enable the session restart warning
 * feature to detect when plugins were installed and notify the user.
 *
 * Flag files are stored in `.specweave/state/`:
 * - `plugins-installed-this-session.flag` - JSON with installation metadata
 * - `installed-plugins.txt` - Simple text file with one plugin per line
 *
 * @module cli/helpers/init/plugin-install-flags
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PluginInstallTrigger } from '../../../core/session/plugin-install-detector.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Plugin installation flag data
 */
export interface PluginInstallFlag {
  /** ISO-8601 timestamp of installation */
  timestamp: string;
  /** List of installed plugins */
  plugins: string[];
  /** What triggered the installation */
  trigger: PluginInstallTrigger;
  /** Project path where installation occurred */
  projectPath?: string;
}

/**
 * Options for creating a plugin install flag
 */
export interface CreateFlagOptions {
  /** List of plugins installed */
  plugins: string[];
  /** What triggered the installation */
  trigger: PluginInstallTrigger;
  /** Project path */
  projectPath?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Name of the JSON flag file */
const FLAG_FILE_NAME = 'plugins-installed-this-session.flag';

/** Name of the plain text plugins file */
const PLUGINS_FILE_NAME = 'installed-plugins.txt';

/** Directory containing state files */
const STATE_DIR_NAME = 'state';

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get the path to the state directory
 */
function getStateDirPath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', STATE_DIR_NAME);
}

/**
 * Get the path to the flag file
 */
function getFlagFilePath(projectRoot: string): string {
  return path.join(getStateDirPath(projectRoot), FLAG_FILE_NAME);
}

/**
 * Get the path to the plugins text file
 */
function getPluginsFilePath(projectRoot: string): string {
  return path.join(getStateDirPath(projectRoot), PLUGINS_FILE_NAME);
}

/**
 * Ensure the state directory exists
 */
function ensureStateDirectory(projectRoot: string): void {
  const stateDir = getStateDirPath(projectRoot);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Create plugin installation flag files
 *
 * Creates both the JSON flag file and the plain text plugins file
 * to track that plugins were installed during this session.
 *
 * @param projectRoot - Root directory of the project
 * @param options - Flag creation options
 *
 * @example
 * ```typescript
 * createPluginInstallFlag('/path/to/project', {
 *   plugins: ['sw', 'frontend'],
 *   trigger: 'specweave-init',
 *   projectPath: '/path/to/project'
 * });
 * ```
 */
export function createPluginInstallFlag(
  projectRoot: string,
  options: CreateFlagOptions
): void {
  const { plugins, trigger, projectPath } = options;

  ensureStateDirectory(projectRoot);

  // Create the JSON flag file
  const flag: PluginInstallFlag = {
    timestamp: new Date().toISOString(),
    plugins: [...plugins],
    trigger,
    projectPath,
  };

  const flagFile = getFlagFilePath(projectRoot);
  fs.writeFileSync(flagFile, JSON.stringify(flag, null, 2), 'utf-8');

  // Create the plain text plugins file
  const pluginsFile = getPluginsFilePath(projectRoot);
  fs.writeFileSync(pluginsFile, plugins.join('\n') + '\n', 'utf-8');
}

/**
 * Read plugin installation flag
 *
 * Reads the flag file and returns its contents. Returns null if
 * the file doesn't exist or contains invalid data.
 *
 * @param projectRoot - Root directory of the project
 * @returns Flag data or null if not found/invalid
 *
 * @example
 * ```typescript
 * const flag = readPluginInstallFlag('/path/to/project');
 * if (flag) {
 *   console.log('Plugins installed:', flag.plugins);
 * }
 * ```
 */
export function readPluginInstallFlag(
  projectRoot: string
): PluginInstallFlag | null {
  const flagFile = getFlagFilePath(projectRoot);

  if (!fs.existsSync(flagFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(flagFile, 'utf-8');
    const flag = JSON.parse(content) as PluginInstallFlag;

    // Basic validation
    if (!flag.plugins || !Array.isArray(flag.plugins)) {
      return null;
    }

    return flag;
  } catch {
    // Invalid JSON or read error
    return null;
  }
}

/**
 * Append plugins to existing flag
 *
 * Adds new plugins to an existing flag file. If no flag exists,
 * creates a new one with 'manual' trigger.
 *
 * @param projectRoot - Root directory of the project
 * @param newPlugins - Plugins to append
 *
 * @example
 * ```typescript
 * appendInstalledPlugins('/path/to/project', ['sw-github', 'sw-jira']);
 * ```
 */
export function appendInstalledPlugins(
  projectRoot: string,
  newPlugins: string[]
): void {
  const existingFlag = readPluginInstallFlag(projectRoot);

  if (existingFlag) {
    // Merge plugins (deduplicate)
    const allPlugins = new Set([...existingFlag.plugins, ...newPlugins]);

    // Update flag with merged plugins
    createPluginInstallFlag(projectRoot, {
      plugins: Array.from(allPlugins),
      trigger: existingFlag.trigger,
      projectPath: existingFlag.projectPath,
    });
  } else {
    // Create new flag
    createPluginInstallFlag(projectRoot, {
      plugins: newPlugins,
      trigger: 'manual',
    });
  }
}

/**
 * Clear plugin installation flag files
 *
 * Removes both the JSON flag file and the plain text plugins file.
 * Safe to call even if files don't exist.
 *
 * @param projectRoot - Root directory of the project
 *
 * @example
 * ```typescript
 * clearPluginInstallFlag('/path/to/project');
 * ```
 */
export function clearPluginInstallFlag(projectRoot: string): void {
  const flagFile = getFlagFilePath(projectRoot);
  const pluginsFile = getPluginsFilePath(projectRoot);

  try {
    if (fs.existsSync(flagFile)) {
      fs.unlinkSync(flagFile);
    }
    if (fs.existsSync(pluginsFile)) {
      fs.unlinkSync(pluginsFile);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Check if plugins were installed this session
 *
 * Quick check for whether the flag file exists.
 *
 * @param projectRoot - Root directory of the project
 * @returns True if flag exists
 */
export function hasPluginInstallFlag(projectRoot: string): boolean {
  const flagFile = getFlagFilePath(projectRoot);
  return fs.existsSync(flagFile);
}
