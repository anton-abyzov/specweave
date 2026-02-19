#!/usr/bin/env node
/**
 * Refresh SpecWeave Marketplace (DEPRECATED)
 *
 * This command is deprecated in favor of `specweave refresh-plugins`.
 * It now delegates to refresh-plugins with a deprecation warning.
 *
 * @since 1.0.60
 * @deprecated 1.0.272 - Use `specweave refresh-plugins` instead
 */

import chalk from 'chalk';

interface RefreshOptions {
  verbose?: boolean;
  force?: boolean;
  /** Install ALL plugins (legacy mode). Default: false (lazy loading - core only) */
  all?: boolean;
  /** Minimal mode: Remove marketplace entirely, install only core plugins directly. */
  minimal?: boolean;
}

export async function refreshMarketplaceCommand(options: RefreshOptions = {}): Promise<void> {
  // DEPRECATION: refresh-marketplace is deprecated in favor of refresh-plugins (vskill-backed)
  console.log(chalk.yellow('\n[DEPRECATED] "refresh-marketplace" is deprecated. Use "refresh-plugins" instead.'));
  console.log(chalk.gray('  Run: specweave refresh-plugins'));
  console.log(chalk.gray('  This command will be removed in a future version.\n'));

  // Delegate to the new refresh-plugins command
  const { refreshPluginsCommand } = await import('./refresh-plugins.js');
  await refreshPluginsCommand({
    all: options.all,
    force: options.force,
    verbose: options.verbose,
  });
}
