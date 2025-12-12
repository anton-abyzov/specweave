/**
 * CLI Command: /sw:import-external
 *
 * Import external work items from GitHub, JIRA, or Azure DevOps
 */

import { confirm as confirmPrompt } from '@inquirer/prompts';
import ora from 'ora';
import chalk from 'chalk';
import { ImportCoordinator, type CoordinatorConfig, type CoordinatorResult } from '../../importers/import-coordinator.js';
import { ItemConverter, type ConvertedUserStory } from '../../importers/item-converter.js';
import { loadSyncMetadata, getLastImportTimestamp } from '../../sync/sync-metadata.js';
import { RateLimiter, type RateLimitInfo } from '../../importers/rate-limiter.js';
import { shouldConfirmLargeImport } from '../../importers/rate-limiter.js';
import { groupItemsByExternalContainer } from '../helpers/init/external-import-grouping.js';
import path from 'path';
import * as fs from '../../utils/fs-native.js';
import type { ExternalItem } from '../../importers/external-importer.js';
import { getGitHubAuthFromProject, getJiraAuthFromProject, getAzureDevOpsAuthFromProject } from '../../utils/auth-helpers.js';

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
 * Get existing sync profiles from config.json
 * Returns array of "owner/repo" strings if profiles exist
 */
function getExistingSyncProfiles(projectRoot: string): string[] | null {
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Check for sync.profiles structure (umbrella repo setup)
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const profiles = config.sync.profiles;
      const repos: string[] = [];

      for (const [profileId, profile] of Object.entries(profiles)) {
        const p = profile as { config?: { owner?: string; repo?: string } };
        if (p.config?.owner && p.config?.repo) {
          repos.push(`${p.config.owner}/${p.config.repo}`);
        }
      }

      return repos.length > 0 ? repos : null;
    }

    return null;
  } catch (error) {
    // Log warning for debugging - config parsing errors shouldn't be silent
    console.warn(chalk.yellow(`   ⚠️  Failed to read sync profiles: ${error instanceof Error ? error.message : String(error)}`));
    return null;
  }
}

/**
 * Detect configured external tools from environment and .env file
 *
 * CRITICAL FIX (v0.35.6): Now uses project-aware auth helpers to read from .env file
 * Previously only read from process.env which is empty unless dotenv is explicitly loaded.
 *
 * @param projectRoot - Path to project root containing .env file
 */
function detectConfiguredTools(projectRoot: string): {
  github?: { owner: string; repo: string; token?: string };
  jira?: { host: string; email?: string; apiToken?: string };
  ado?: { orgUrl: string; project: string; pat?: string };
} {
  const config: any = {};

  // GitHub detection - use project-aware helper to read from .env
  const githubAuth = getGitHubAuthFromProject(projectRoot);
  if (githubAuth.source !== 'none') {
    // Try to parse git remote
    const gitConfigPath = path.join(projectRoot, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
      const remoteMatch = gitConfig.match(/url\s*=\s*(?:https?:\/\/github\.com\/|git@github\.com:)([^/]+)\/([^.\n]+)/);
      if (remoteMatch) {
        config.github = {
          owner: remoteMatch[1],
          repo: remoteMatch[2],
          token: githubAuth.token,
        };
      }
    }
  }

  // JIRA detection - use project-aware helper to read from .env
  // CRITICAL FIX (v0.35.6): Now properly reads JIRA_HOST/JIRA_DOMAIN from .env file
  const jiraAuth = getJiraAuthFromProject(projectRoot);
  if (jiraAuth) {
    config.jira = {
      host: jiraAuth.domain,  // domain field contains JIRA_HOST or JIRA_DOMAIN
      email: jiraAuth.email,
      apiToken: jiraAuth.token,
    };
  }

  // Azure DevOps detection - use project-aware helper to read from .env
  const adoAuth = getAzureDevOpsAuthFromProject(projectRoot);
  if (adoAuth && adoAuth.pat) {
    config.ado = {
      orgUrl: adoAuth.org ? `https://dev.azure.com/${adoAuth.org}` : '',
      project: adoAuth.project,
      pat: adoAuth.pat,
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
    // Detect configured tools from .env file and process.env
    // CRITICAL FIX (v0.35.6): Now reads from .env file in projectRoot
    const configuredTools = detectConfiguredTools(projectRoot);

    // Check for existing sync profiles (multi-repo umbrella setup)
    const existingProfiles = getExistingSyncProfiles(projectRoot);
    let useMultiRepo = false;
    let githubRepositories: Array<{ owner: string; repo: string }> | undefined;

    if (existingProfiles && existingProfiles.length > 0 && !args.jiraOnly && !args.adoOnly) {
      console.log(chalk.dim(`   Using sync profiles: ${existingProfiles.length} repositories`));
      useMultiRepo = true;
      githubRepositories = existingProfiles.map(fullRepo => {
        const [owner, repo] = fullRepo.split('/');
        return { owner, repo };
      });
    }

    // Apply platform filters
    const config: any = {};
    if (args.githubOnly) {
      if (useMultiRepo) {
        // Multi-repo mode takes priority
      } else if (configuredTools.github) {
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
      // All platforms (but prefer multi-repo for GitHub)
      if (!useMultiRepo && configuredTools.github) {
        config.github = configuredTools.github;
      }
      if (configuredTools.jira) {
        config.jira = configuredTools.jira;
      }
      if (configuredTools.ado) {
        config.ado = configuredTools.ado;
      }
    }

    // Validate at least one platform configured
    if (!useMultiRepo && !config.github && !config.jira && !config.ado) {
      throw new Error(
        'No external platforms configured.\n\n' +
          '💡 Configuration required:\n' +
          '   - GitHub: GITHUB_TOKEN in .env + .git/config remote\n' +
          '   - JIRA: issueTracker.domain in config.json + JIRA_EMAIL, JIRA_API_TOKEN in .env\n' +
          '   - Azure DevOps: AZURE_DEVOPS_PAT in .env + issueTracker.organization_ado in config.json'
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

    // Add multi-repo GitHub configuration if using sync profiles
    if (useMultiRepo && githubRepositories) {
      coordinatorConfig.githubRepositories = githubRepositories;
      coordinatorConfig.githubToken = process.env.GITHUB_TOKEN;
    }

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

      const shouldContinue = await confirmPrompt({
        message: 'Continue?',
        default: true,
      });

      if (!shouldContinue) {
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
      const conversionSpinner = ora('Converting items to living docs...').start();

      try {
        // CRITICAL FIX (v0.35.2): Use proper grouping for JIRA/ADO 2-level structure
        // Groups by external container (JIRA project/board, ADO project/area, GitHub repo)
        const containerGroups = groupItemsByExternalContainer(allItems, projectRoot);
        const groupCount = containerGroups.length;
        const allConverted: ConvertedUserStory[] = [];

        // Enable global collision detection when multiple containers exist (umbrella mode)
        const isUmbrellaMode = groupCount > 1;

        for (const group of containerGroups) {
          const groupLabel = group.externalContainer
            ? `${group.externalContainer.containerName || group.containerId}/${group.projectId}`
            : group.projectId;

          conversionSpinner.text = `Converting items from ${groupLabel}...`;

          // Create converter for this container group
          const converter = new ItemConverter({
            specsDir,
            projectRoot,
            enableFeatureAllocation: true,
            enableDuplicateDetection: true,
            // CRITICAL (v0.35.2): Pass projectId AND externalContainer for 2-level structure
            projectId: group.projectId,
            externalContainer: group.externalContainer,
            // CRITICAL: Enable global collision detection in umbrella mode
            // This prevents FS-001 in project-a colliding with FS-001E in project-b
            enableGlobalCollisionDetection: isUmbrellaMode,
            onDuplicateSkipped: (externalId, existingUsId) => {
              console.log(chalk.dim(`  ⏭️  Skipped duplicate: ${externalId} (already imported as ${existingUsId})`));
            },
          });

          const converted = await converter.convertItems(group.items);
          allConverted.push(...converted);
        }

        convertedCount = allConverted.length;
        skippedCount = allItems.length - convertedCount;

        if (groupCount > 1) {
          conversionSpinner.succeed(`Converted ${convertedCount} items to living docs (${groupCount} container groups)`);
        } else {
          const groupLabel = containerGroups[0]?.externalContainer
            ? `${containerGroups[0].containerId}/${containerGroups[0].projectId}`
            : containerGroups[0]?.projectId || 'unknown';
          conversionSpinner.succeed(`Converted ${convertedCount} items to living docs (${groupLabel})`);
        }
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
