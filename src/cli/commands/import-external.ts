/**
 * CLI Command: /specweave:import-external
 *
 * Import external work items from GitHub, JIRA, or Azure DevOps
 */

import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { ImportCoordinator, type CoordinatorConfig } from '../../importers/import-coordinator.js';
import { ItemConverter } from '../../importers/item-converter.js';
import { loadSyncMetadata, getLastImportTimestamp } from '../../sync/sync-metadata.js';
import { RateLimiter, type RateLimitInfo } from '../../importers/rate-limiter.js';
import { shouldConfirmLargeImport } from '../../importers/rate-limiter.js';
import path from 'path';
import fs from 'fs-extra';
import type { ExternalItem } from '../../importers/external-importer.js';

// NOTE: This CLI import command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (import progress, summaries, warnings).
// Logger infrastructure available for future internal debug logs if needed.

export interface ImportExternalArgs {
  /** Time range filter */
  since?: 'last' | '1m' | '3m' | '6m' | 'all' | string;

  /** Import from GitHub only */
  githubOnly?: boolean;

  /** Import from JIRA only */
  jiraOnly?: boolean;

  /** Import from Azure DevOps only */
  adoOnly?: boolean;

  /** Dry run mode (preview only) */
  dryRun?: boolean;
}

/**
 * Detect configured external tools from environment
 */
function detectConfiguredTools(): {
  github?: { owner: string; repo: string; token?: string };
  jira?: { host: string; email?: string; apiToken?: string };
  ado?: { orgUrl: string; project: string; pat?: string };
} {
  const config: any = {};

  // GitHub detection
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    // Try to parse git remote
    const gitConfigPath = path.join(process.cwd(), '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
      const remoteMatch = gitConfig.match(/url\s*=\s*(?:https?:\/\/github\.com\/|git@github\.com:)([^/]+)\/([^.\n]+)/);
      if (remoteMatch) {
        config.github = {
          owner: remoteMatch[1],
          repo: remoteMatch[2],
          token: githubToken,
        };
      }
    }
  }

  // JIRA detection
  const jiraHost = process.env.JIRA_HOST;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  if (jiraHost) {
    config.jira = {
      host: jiraHost,
      email: jiraEmail,
      apiToken: jiraApiToken,
    };
  }

  // Azure DevOps detection
  const adoOrgUrl = process.env.ADO_ORG_URL;
  const adoProject = process.env.ADO_PROJECT;
  const adoPat = process.env.ADO_PAT;
  if (adoOrgUrl && adoProject) {
    config.ado = {
      orgUrl: adoOrgUrl,
      project: adoProject,
      pat: adoPat,
    };
  }

  return config;
}

/**
 * Parse time range filter to import config
 */
function parseTimeRange(since: string, platform: 'github' | 'jira' | 'ado', projectRoot: string): number | undefined {
  if (since === 'all') {
    return undefined; // No time filter
  }

  if (since === 'last') {
    // Use last import timestamp from sync metadata
    const lastImport = getLastImportTimestamp(projectRoot, platform);
    if (!lastImport) {
      // No previous import, default to 1 month
      return 1;
    }

    // Calculate months since last import
    const lastImportDate = new Date(lastImport);
    const now = new Date();
    const monthsSince = (now.getTime() - lastImportDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.ceil(monthsSince);
  }

  // Parse relative time ranges (1m, 3m, 6m)
  const monthMatch = since.match(/^(\d+)m$/);
  if (monthMatch) {
    return parseInt(monthMatch[1], 10);
  }

  // Parse absolute date (ISO format: YYYY-MM-DD)
  const dateMatch = since.match(/^\d{4}-\d{2}-\d{2}$/);
  if (dateMatch) {
    const targetDate = new Date(since);
    const now = new Date();
    const monthsSince = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.ceil(monthsSince);
  }

  // Default: 1 month
  return 1;
}

/**
 * Get platform emoji
 */
function getPlatformEmoji(platform: 'github' | 'jira' | 'ado'): string {
  switch (platform) {
    case 'github':
      return '🔗';
    case 'jira':
      return '🎫';
    case 'ado':
      return '📋';
  }
}

/**
 * Import external work items
 */
export async function importExternal(projectRoot: string, args: ImportExternalArgs): Promise<void> {
  console.log(chalk.bold('\n📥 Import External Work Items\n'));

  try {
    // Detect configured tools
    const configuredTools = detectConfiguredTools();

    // Apply platform filters
    const config: any = {};
    if (args.githubOnly) {
      if (configuredTools.github) {
        config.github = configuredTools.github;
      }
    } else if (args.jiraOnly) {
      if (configuredTools.jira) {
        config.jira = configuredTools.jira;
      }
    } else if (args.adoOnly) {
      if (configuredTools.ado) {
        config.ado = configuredTools.ado;
      }
    } else {
      // All platforms
      Object.assign(config, configuredTools);
    }

    // Validate at least one platform configured
    if (!config.github && !config.jira && !config.ado) {
      throw new Error(
        'No external platforms configured.\n\n' +
          '💡 Ensure one of these is set:\n' +
          '   - GitHub: GITHUB_TOKEN + .git/config remote\n' +
          '   - JIRA: JIRA_HOST + JIRA_EMAIL + JIRA_API_TOKEN\n' +
          '   - Azure DevOps: ADO_ORG_URL + ADO_PROJECT + ADO_PAT'
      );
    }

    // Determine time range (default: since last import)
    const since = args.since || 'last';

    // Configure import coordinator
    const importConfig = {
      timeRangeMonths: parseTimeRange(since, 'github', projectRoot),
    };

    const coordinatorConfig: CoordinatorConfig = {
      ...config,
      importConfig,
      projectRoot,
      enableSyncMetadata: !args.dryRun, // Only update sync metadata if not dry run
      enableRateLimiting: true,
      onProgress: (platform: string, count: number, total?: number) => {
        // Progress callback handled by spinner
      },
      onRateLimitWarning: (platform: string, rateLimitInfo: RateLimitInfo) => {
        const rateLimiter = new RateLimiter();
        console.log(chalk.yellow(`\n${rateLimiter.formatWarning(rateLimitInfo)}\n`));
      },
      onRateLimitPause: (platform: string, seconds: number) => {
        const rateLimiter = new RateLimiter();
        console.log(chalk.yellow(`\n${rateLimiter.formatPauseMessage(platform, seconds)}\n`));
      },
    };

    // Create import coordinator
    const coordinator = new ImportCoordinator(coordinatorConfig);
    const platforms = coordinator.getConfiguredPlatforms();

    // Show configuration summary
    if (!args.dryRun) {
      console.log(chalk.dim('📋 Import Configuration:\n'));
      console.log(chalk.dim(`  Platforms: ${platforms.map(p => p.toUpperCase()).join(', ')}`));
      console.log(chalk.dim(`  Time range: ${since}`));
      console.log(chalk.dim(`  Dry run: ${args.dryRun ? 'Yes' : 'No'}\n`));
    }

    // Import from all platforms
    const allItems: ExternalItem[] = [];
    const platformCounts: Record<string, number> = {};
    const platformSpinners: Record<string, any> = {};

    for (const platform of platforms) {
      const spinner = ora({
        text: `Importing from ${platform.toUpperCase()}...`,
        color: 'cyan',
      }).start();

      platformSpinners[platform] = spinner;

      try {
        const result = await coordinator.importFrom(platform);
        allItems.push(...result.items);
        platformCounts[platform] = result.items.length;

        spinner.succeed(`${getPlatformEmoji(platform)} Imported from ${platform.toUpperCase()}: ${result.items.length} items`);

        if (result.errors.length > 0) {
          console.log(chalk.yellow(`  ⚠️  Warnings: ${result.errors.join(', ')}`));
        }
      } catch (error: any) {
        spinner.fail(`Failed to import from ${platform.toUpperCase()}: ${error.message}`);
      }
    }

    // Check for large imports (> 100 items)
    if (!args.dryRun && shouldConfirmLargeImport(allItems.length)) {
      console.log(chalk.yellow(`\n⚠️  Found ${allItems.length} items to import:`));
      for (const platform of platforms) {
        console.log(chalk.yellow(`   - ${platform.toUpperCase()}: ${platformCounts[platform]} items`));
      }
      console.log(chalk.yellow('\n   This may take 5-10 minutes and use significant API quota.\n'));

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Continue?',
          default: true,
        },
      ]);

      if (!confirm) {
        console.log(chalk.red('\n❌ Import cancelled\n'));
        return;
      }
    }

    // Convert items to living docs (or preview in dry-run mode)
    const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');
    let convertedCount = 0;
    let skippedCount = 0;

    if (args.dryRun) {
      console.log(chalk.cyan('\n🔍 Dry run - no files will be created\n'));
    } else {
      const converter = new ItemConverter({
        specsDir,
        projectRoot,
        enableFeatureAllocation: true,
        enableDuplicateDetection: true,
        onDuplicateSkipped: (externalId, existingUsId) => {
          console.log(chalk.dim(`  ⏭️  Skipped duplicate: ${externalId} (already imported as ${existingUsId})`));
        },
      });

      const conversionSpinner = ora('Converting items to living docs...').start();

      try {
        const converted = await converter.convertItems(allItems);
        convertedCount = converted.length;
        skippedCount = allItems.length - convertedCount;

        conversionSpinner.succeed(`Converted ${convertedCount} items to living docs`);
      } catch (error: any) {
        conversionSpinner.fail(`Conversion failed: ${error.message}`);
        throw error;
      }
    }

    // Display summary report
    console.log(chalk.bold('\n📊 Import Summary:\n'));

    if (args.dryRun) {
      console.log(chalk.cyan('   Preview:'));
      for (const platform of platforms) {
        console.log(`   ${getPlatformEmoji(platform)} ${platform.toUpperCase()}: ${platformCounts[platform]} items`);
      }
      console.log(`   Total: ${allItems.length} items`);
      console.log(chalk.dim('\n   ⚠️  Remove --dry-run to perform actual import\n'));
    } else {
      console.log(`   Total imported: ${chalk.green(convertedCount)} items`);

      for (const platform of platforms) {
        console.log(`   ${getPlatformEmoji(platform)} ${platform.toUpperCase()}: ${platformCounts[platform]} items`);
      }

      if (skippedCount > 0) {
        console.log(chalk.dim(`\n   Duplicates skipped: ${skippedCount} items`));
      }

      console.log(chalk.green('\n✅ Import complete!'));
      console.log(chalk.dim(`   Living docs updated: ${specsDir}`));
      console.log(chalk.dim(`   Sync metadata updated: ${path.join(projectRoot, '.specweave', 'sync-metadata.json')}\n`));
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Import failed: ${error.message}\n`));
    throw error;
  }
}
