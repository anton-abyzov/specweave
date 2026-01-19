/**
 * Unload Plugins Command
 *
 * Unloads plugin groups from SpecWeave active directory.
 * Plugins are removed from ~/.claude/skills/ but preserved in cache.
 *
 * Usage: specweave unload-plugins [group]
 * Groups: core, github, jira, ado, frontend, backend, infra, ml, all
 */

import chalk from 'chalk';
import ora from 'ora';
import {
  PluginCacheManager,
} from '../../core/lazy-loading/cache-manager.js';
import {
  getPluginsForGroup,
  PLUGIN_GROUPS,
} from '../../core/lazy-loading/keyword-detector.js';

export interface UnloadPluginsOptions {
  /** Keep router skill loaded (default: true) */
  keepRouter?: boolean;
  /** Show verbose output */
  verbose?: boolean;
  /** Dry run - show what would be unloaded without unloading */
  dryRun?: boolean;
}

/** Available plugin groups for unloading */
export const UNLOAD_GROUPS = [
  'core',
  'github',
  'jira',
  'ado',
  'frontend',
  'backend',
  'infra',
  'ml',
  'kafka',
  'confluent',
  'mobile',
  'payments',
  'release',
  'testing',
  'diagrams',
  'all',
] as const;

export type UnloadGroup = (typeof UNLOAD_GROUPS)[number];

/**
 * Unload plugins command handler
 *
 * @param group - Plugin group to unload (or 'all' for all except router)
 * @param options - Command options
 */
export async function unloadPluginsCommand(
  group?: string,
  options: UnloadPluginsOptions = {}
): Promise<void> {
  const { keepRouter = true, verbose = false, dryRun = false } = options;

  console.log(chalk.bold.blue('\n📦 SpecWeave Unload Plugins'));
  console.log(chalk.gray('===========================\n'));

  // Validate group
  if (group && group !== 'all' && !PLUGIN_GROUPS[group.toLowerCase()]) {
    console.error(chalk.red(`Unknown plugin group: ${group}`));
    console.log(chalk.gray('\nAvailable groups:'));
    showUnloadGroups();
    process.exit(1);
  }

  // Initialize cache manager
  const cacheManager = new PluginCacheManager();

  // Get currently loaded plugins
  const loadedPlugins = cacheManager.getLoadedPlugins();

  if (loadedPlugins.length === 0) {
    console.log(chalk.yellow('No plugins currently loaded.'));
    return;
  }

  // Determine which plugins to unload
  let pluginsToUnload: string[] = [];
  let groupLabel = '';

  if (!group || group === 'all') {
    // Unload all (except router if keepRouter is true)
    pluginsToUnload = keepRouter
      ? loadedPlugins.filter((p) => p !== 'specweave-router')
      : loadedPlugins;
    groupLabel = keepRouter ? 'all plugins (keeping router)' : 'all plugins';
  } else {
    const normalizedGroup = group.toLowerCase();
    const groupPlugins = getPluginsForGroup(normalizedGroup);

    // Filter to only loaded plugins from this group
    pluginsToUnload = groupPlugins.filter((p) => loadedPlugins.includes(p));
    groupLabel = `${group} group`;
  }

  if (pluginsToUnload.length === 0) {
    console.log(chalk.yellow(`No ${groupLabel} plugins currently loaded.`));
    return;
  }

  // Show what we're going to unload
  console.log(chalk.cyan(`Unloading ${groupLabel}:`));
  for (const plugin of pluginsToUnload) {
    console.log(`  • ${plugin}`);
  }
  console.log();

  // Dry run mode
  if (dryRun) {
    console.log(chalk.yellow('Dry run mode - no changes made.'));
    console.log(chalk.gray(`Would unload ${pluginsToUnload.length} plugin(s).\n`));
    return;
  }

  // Unload plugins with spinner
  const spinner = ora('Unloading plugins...').start();

  const result = await cacheManager.unloadPlugins(pluginsToUnload);

  if (result.success) {
    spinner.succeed(
      chalk.green(
        `Unloaded ${result.pluginsAffected} plugin(s) in ${Math.round(result.durationMs)}ms`
      )
    );

    // Show state summary
    const remainingLoaded = cacheManager.getLoadedPlugins();
    const cachedPlugins = cacheManager.getCachedPlugins();

    console.log(chalk.bold('\n📊 Current State:'));
    console.log(chalk.gray(`   Loaded: ${remainingLoaded.length} plugin(s)`));
    console.log(chalk.gray(`   Cached: ${cachedPlugins.length} plugin(s)`));

    if (remainingLoaded.length > 0 && verbose) {
      console.log(chalk.gray('\n   Still loaded:'));
      for (const plugin of remainingLoaded) {
        console.log(chalk.gray(`     • ${plugin}`));
      }
    }

    console.log(
      chalk.cyan('\n💡 Plugins are preserved in cache. Reload with:')
    );
    console.log(chalk.gray(`   specweave load-plugins ${group || 'all'}\n`));
  } else {
    spinner.fail(chalk.red(`Failed to unload plugins: ${result.error}`));
    process.exit(1);
  }
}

/**
 * Show available groups for unloading
 */
export function showUnloadGroups(): void {
  const groupDescriptions: Record<string, string> = {
    core: 'Core SpecWeave functionality (specweave)',
    github: 'GitHub integration (specweave-github)',
    jira: 'JIRA integration (specweave-jira)',
    ado: 'Azure DevOps integration (specweave-ado)',
    frontend: 'Frontend development (specweave-frontend)',
    backend: 'Backend & database (specweave-backend)',
    infra: 'Infrastructure & K8s (specweave-infrastructure, specweave-k8s)',
    ml: 'Machine learning (specweave-ml)',
    kafka: 'Apache Kafka (specweave-kafka)',
    confluent: 'Confluent Cloud (specweave-confluent)',
    mobile: 'Mobile development (specweave-mobile)',
    payments: 'Payment processing (specweave-payments)',
    release: 'Release management (specweave-release)',
    testing: 'Testing & QA (specweave-testing)',
    diagrams: 'Diagrams & visualization (specweave-diagrams)',
    all: 'All plugins (keeps router by default)',
  };

  for (const [name, description] of Object.entries(groupDescriptions)) {
    console.log(`  ${chalk.cyan(name.padEnd(12))} ${chalk.gray(description)}`);
  }
}

/**
 * Get help text for the command
 */
export function getUnloadPluginsHelp(): string {
  return `
${chalk.bold('Usage:')} specweave unload-plugins [group] [options]

${chalk.bold('Description:')}
  Unloads plugin groups from SpecWeave. Plugins are removed from the
  active directory (~/.claude/skills/) but preserved in the cache for
  quick reloading later.

${chalk.bold('Arguments:')}
  group    Plugin group to unload (default: all)

${chalk.bold('Options:')}
  --no-keep-router  Also unload the router skill
  --verbose         Show detailed output
  --dry-run         Preview without unloading

${chalk.bold('Groups:')}
  core       Core SpecWeave functionality
  github     GitHub integration
  jira       JIRA integration
  ado        Azure DevOps integration
  frontend   Frontend development tools
  backend    Backend & database tools
  infra      Infrastructure & Kubernetes
  ml         Machine learning tools
  all        Unload all plugins (keeps router)

${chalk.bold('Examples:')}
  specweave unload-plugins                  # Unload all (keep router)
  specweave unload-plugins github           # Unload GitHub plugin
  specweave unload-plugins all --no-keep-router  # Unload everything
  specweave unload-plugins --dry-run        # Preview what would unload
`;
}
