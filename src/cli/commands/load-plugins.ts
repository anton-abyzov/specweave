/**
 * Load Plugins Command
 *
 * Manually loads plugin groups for SpecWeave lazy loading.
 * Plugins are loaded directly from marketplace to skills directory for hot-reload.
 *
 * SIMPLIFIED (v1.0.122+): No intermediate cache needed!
 * Loads from ~/.claude/plugins/specweave/ → ~/.claude/skills/
 *
 * Usage: specweave load-plugins [group]
 * Groups: core, github, jira, ado, frontend, backend, infra, ml, all
 */

import chalk from 'chalk';
import ora from 'ora';
import {
  PluginCacheManager,
  InstallOptions,
} from '../../core/lazy-loading/cache-manager.js';
import {
  getPluginGroups,
  getPluginsForGroup,
  getAllPlugins,
  PLUGIN_GROUPS,
} from '../../core/lazy-loading/keyword-detector.js';
import { logError, logInfo, logWarn, getLogFilePath } from '../../core/lazy-loading/failure-logger.js';

export interface LoadPluginsOptions {
  /** Force reinstall even if already loaded */
  force?: boolean;
  /** Run in background (non-blocking) */
  background?: boolean;
  /** Show verbose output */
  verbose?: boolean;
  /** Silent mode - no stdout output (for hooks) - T-021 */
  silent?: boolean;
}

/** Available plugin groups */
export const AVAILABLE_GROUPS = [
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

export type PluginGroup = (typeof AVAILABLE_GROUPS)[number];

/**
 * Load plugins command handler
 *
 * @param group - Plugin group to load (or 'all' for all plugins)
 * @param options - Command options
 */
export async function loadPluginsCommand(
  group?: string,
  options: LoadPluginsOptions = {}
): Promise<void> {
  // T-021: Silent mode helper
  const log = (message: string) => {
    if (!options.silent) console.log(message);
  };
  const logErr = (message: string) => {
    if (!options.silent) console.error(message);
  };

  log(chalk.bold.blue('\n📦 SpecWeave Load Plugins'));
  log(chalk.gray('=========================\n'));

  // Validate group
  if (group && group !== 'all' && !PLUGIN_GROUPS[group.toLowerCase()]) {
    logErr(chalk.red(`Unknown plugin group: ${group}`));
    log(chalk.gray('\nAvailable groups:'));
    if (!options.silent) showAvailableGroups();
    process.exit(1);
  }

  // Initialize cache manager
  const cacheManager = new PluginCacheManager();

  // Check if marketplace has plugins
  const availablePlugins = cacheManager.getCachedPlugins(); // Now returns marketplace plugins directly
  if (availablePlugins.length === 0) {
    log(chalk.yellow('⚠️  No plugins in marketplace.'));
    log(chalk.gray('Run: specweave refresh-marketplace'));
    return;
  }

  // Determine which plugins to load
  let pluginsToLoad: string[] = [];
  let groupLabel = '';

  if (!group || group === 'all') {
    pluginsToLoad = availablePlugins;
    groupLabel = 'all plugins';
  } else {
    const normalizedGroup = group.toLowerCase();
    pluginsToLoad = getPluginsForGroup(normalizedGroup);

    if (pluginsToLoad.length === 0) {
      logErr(chalk.red(`No plugins found for group: ${group}`));
      return;
    }

    // Filter to only available plugins in marketplace
    pluginsToLoad = pluginsToLoad.filter((p) => availablePlugins.includes(p));
    groupLabel = `${group} group`;
  }

  if (pluginsToLoad.length === 0) {
    log(chalk.yellow('No plugins to load.'));
    return;
  }

  // Show what we're going to load (skip in silent mode)
  log(chalk.cyan(`Loading ${groupLabel}:`));
  if (options.verbose && !options.silent) {
    for (const plugin of pluginsToLoad) {
      const loaded = cacheManager.isPluginLoaded(plugin);
      const status = loaded
        ? chalk.gray('(already loaded)')
        : chalk.yellow('(will load)');
      console.log(`  • ${plugin} ${status}`);
    }
    console.log();
  } else {
    log(chalk.gray(`  ${pluginsToLoad.length} plugin(s)\n`));
  }

  // Background or foreground install
  if (options.background) {
    const taskId = cacheManager.installPluginsBackground({
      plugins: pluginsToLoad,
      force: options.force,
    });

    log(chalk.green('✅ Background installation started'));
    log(chalk.gray(`   Task ID: ${taskId}`));
    log(chalk.gray('   Check status with: specweave plugin-status\n'));
    return;
  }

  // Foreground installation with spinner and retry mechanism (disabled in silent mode)
  const spinner = options.silent ? null : ora('Loading plugins...').start();

  const maxRetries = 3;
  const retryDelays = [500, 1000, 2000]; // Exponential backoff
  let lastError: string | undefined;
  let result: Awaited<ReturnType<typeof cacheManager.installPlugins>> | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      result = await cacheManager.installPlugins({
        plugins: pluginsToLoad,
        force: options.force || attempt > 1, // Force on retry
      });

      if (result.success) {
        logInfo('installPlugins', `Successfully loaded ${result.pluginsAffected} plugin(s)`, {
          plugins: pluginsToLoad,
          attempt,
          durationMs: result.durationMs,
        });
        break; // Success, exit retry loop
      }

      lastError = result.error;
      logWarn('installPlugins', `Attempt ${attempt} failed`, {
        error: result.error,
        plugins: pluginsToLoad,
      });

      if (attempt < maxRetries) {
        const delay = retryDelays[attempt - 1];
        if (spinner) spinner.text = `Retrying (${attempt}/${maxRetries})... waiting ${delay}ms`;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error.message;

      logError('installPlugins', `Attempt ${attempt} threw exception`, error, {
        plugins: pluginsToLoad,
        attempt,
      });

      if (attempt < maxRetries) {
        const delay = retryDelays[attempt - 1];
        if (spinner) spinner.text = `Error occurred, retrying (${attempt}/${maxRetries})...`;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (result?.success) {
    if (spinner) {
      spinner.succeed(
        chalk.green(
          `Loaded ${result.pluginsAffected} plugin(s) in ${Math.round(result.durationMs)}ms`
        )
      );
    }

    // Show hot-reload notice (skip in silent mode)
    log(chalk.cyan('\n🔄 Hot-reload will activate skills within seconds.'));
    log(chalk.gray('   No restart required.\n'));

    // Show loaded plugins summary
    const loadedPlugins = cacheManager.getLoadedPlugins();
    log(chalk.bold('📊 Currently Loaded:'));
    log(chalk.gray(`   ${loadedPlugins.length} plugin(s) active\n`));
  } else {
    // Log the final failure
    logError('installPlugins', `Failed to load plugins after ${maxRetries} attempts`, undefined, {
      plugins: pluginsToLoad,
      lastError,
      attempts: maxRetries,
    });

    if (spinner) {
      spinner.fail(chalk.red(`Failed to load plugins after ${maxRetries} attempts`));
    }
    logErr(chalk.red(`\nLast error: ${lastError || 'Unknown error'}`));
    log(chalk.yellow('\nTroubleshooting steps:'));
    log(chalk.gray('  1. Run: specweave refresh-marketplace'));
    log(chalk.gray('  2. Ensure ~/.claude/plugins/specweave/ has plugins'));
    log(chalk.gray('  3. Check disk space and permissions'));
    log(chalk.gray('  4. Restart Claude Code if hot-reload fails'));
    log(chalk.gray(`\n📋 Detailed logs: ${getLogFilePath()}\n`));
    process.exit(1);
  }
}

/**
 * Show available plugin groups with descriptions
 */
export function showAvailableGroups(): void {
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
    all: 'All available plugins',
  };

  for (const [name, description] of Object.entries(groupDescriptions)) {
    console.log(`  ${chalk.cyan(name.padEnd(12))} ${chalk.gray(description)}`);
  }
}

/**
 * Get help text for the command
 */
export function getLoadPluginsHelp(): string {
  return `
${chalk.bold('Usage:')} specweave load-plugins [group] [options]

${chalk.bold('Description:')}
  Manually loads plugin groups for SpecWeave. Plugins are loaded directly
  from the marketplace to the skills directory for hot-reload activation.

${chalk.bold('Arguments:')}
  group    Plugin group to load (default: all)

${chalk.bold('Options:')}
  --force       Force reinstall even if already loaded
  --background  Run installation in background
  --verbose     Show detailed output
  --silent      Silent mode - no stdout output (for hooks)

${chalk.bold('Groups:')}
  core       Core SpecWeave functionality
  github     GitHub integration
  jira       JIRA integration
  ado        Azure DevOps integration
  frontend   Frontend development tools
  backend    Backend & database tools
  infra      Infrastructure & Kubernetes
  ml         Machine learning tools
  all        Load all available plugins

${chalk.bold('Examples:')}
  specweave load-plugins                 # Load all plugins
  specweave load-plugins github          # Load GitHub plugin
  specweave load-plugins infra --force   # Force reload infra plugins
  specweave load-plugins ml --background # Load ML plugins in background
`;
}
