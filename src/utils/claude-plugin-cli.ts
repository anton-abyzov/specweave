/**
 * Claude Code Plugin CLI Integration
 *
 * Registers SpecWeave plugins with Claude Code's plugin system via the
 * `claude` CLI binary. This makes plugins appear in the `/plugin Installed`
 * UI alongside marketplace metadata.
 *
 * All operations are non-fatal — failures are logged (in DEBUG mode) but
 * never block the primary plugin installation to ~/.claude/commands/.
 *
 * @since 1.0.290
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileNoThrowSync } from './execFileNoThrow.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CliRegistrationResult {
  /** True if marketplace was registered successfully */
  marketplaceRegistered: boolean;
  /** Plugin names that were successfully installed via CLI */
  installedPlugins: string[];
  /** Plugin names that failed CLI installation */
  failedPlugins: string[];
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Register SpecWeave marketplace and install plugins via Claude CLI.
 *
 * Steps:
 * 1. Validates specweaveRoot contains .claude-plugin/marketplace.json
 * 2. Runs `claude plugin marketplace add <specweaveRoot>`
 * 3. Runs `claude plugin install <name>@specweave` for each plugin
 *
 * Entirely non-fatal. Returns a result with success/failure per plugin.
 */
export function registerPluginsWithClaudeCli(
  specweaveRoot: string,
  pluginNames: string[],
): CliRegistrationResult {
  const result: CliRegistrationResult = {
    marketplaceRegistered: false,
    installedPlugins: [],
    failedPlugins: [],
  };

  if (pluginNames.length === 0) return result;

  // Validate marketplace exists at path
  const marketplacePath = join(specweaveRoot, '.claude-plugin', 'marketplace.json');
  if (!existsSync(marketplacePath)) {
    if (process.env.DEBUG) {
      console.warn(`[DEBUG] Skipping Claude CLI registration: no marketplace.json at ${marketplacePath}`);
    }
    return result;
  }

  // Register marketplace
  const addResult = execFileNoThrowSync('claude', ['plugin', 'marketplace', 'add', specweaveRoot]);
  if (addResult.success || addResult.exitCode === 0) {
    result.marketplaceRegistered = true;
  } else {
    if (process.env.DEBUG) {
      console.warn(`[DEBUG] claude plugin marketplace add failed (exit ${addResult.exitCode}): ${addResult.stderr}`);
    }
    // Don't bail — install may still work if marketplace was already registered
  }

  // Install each plugin
  for (const name of pluginNames) {
    const installResult = execFileNoThrowSync('claude', ['plugin', 'install', `${name}@specweave`]);
    if (installResult.success || installResult.exitCode === 0) {
      result.installedPlugins.push(name);
    } else {
      result.failedPlugins.push(name);
      if (process.env.DEBUG) {
        console.warn(`[DEBUG] claude plugin install ${name}@specweave failed (exit ${installResult.exitCode}): ${installResult.stderr}`);
      }
    }
  }

  return result;
}
