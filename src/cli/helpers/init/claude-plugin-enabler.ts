/**
 * Claude Plugin Enabler
 *
 * Enables installed plugins in .claude/settings.json
 * This is required after plugin installation for them to be active.
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';

/**
 * Enable installed SpecWeave plugins in Claude Code settings
 *
 * After installing plugins via `claude plugin install`, they must be
 * explicitly enabled in ~/.claude/settings.json for them to be active.
 *
 * @param pluginNames - Array of plugin names to enable (e.g., ['sw', 'sw-github'])
 * @param marketplace - Marketplace name (default: 'specweave')
 * @param customSettingsPath - Optional custom path to settings.json (for testing)
 * @returns true if successful, false otherwise
 */
export function enablePluginsInSettings(
  pluginNames: string[],
  marketplace: string = 'specweave',
  customSettingsPath?: string
): boolean {
  try {
    const settingsPath = customSettingsPath || path.join(os.homedir(), '.claude', 'settings.json');

    // Read existing settings or create new
    let settings: Record<string, unknown> = {};
    if (fs.existsSync(settingsPath)) {
      try {
        const content = fs.readFileSync(settingsPath, 'utf-8');
        settings = JSON.parse(content);
      } catch {
        settings = {};
      }
    }

    // Ensure .claude directory exists
    const claudeDir = path.dirname(settingsPath);
    fs.mkdirSync(claudeDir, { recursive: true });

    // Get existing enabled plugins or create new object
    const enabledPlugins = (settings.enabledPlugins || {}) as Record<string, boolean>;

    // Enable each plugin
    for (const pluginName of pluginNames) {
      const pluginKey = `${pluginName}@${marketplace}`;
      enabledPlugins[pluginKey] = true;
    }

    settings.enabledPlugins = enabledPlugins;

    // Write back with formatting
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

    return true;
  } catch (error) {
    if (process.env.DEBUG) {
      console.error('Failed to enable plugins in settings:', error);
    }
    return false;
  }
}

/**
 * Enable a single plugin in Claude Code settings
 *
 * @param pluginName - Plugin name (e.g., 'sw')
 * @param marketplace - Marketplace name (default: 'specweave')
 * @param customSettingsPath - Optional custom path to settings.json (for testing)
 * @returns true if successful, false otherwise
 */
export function enablePlugin(
  pluginName: string,
  marketplace: string = 'specweave',
  customSettingsPath?: string
): boolean {
  return enablePluginsInSettings([pluginName], marketplace, customSettingsPath);
}
