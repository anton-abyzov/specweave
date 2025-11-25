/**
 * External tool import functionality
 * Imports work items from GitHub, JIRA, Azure DevOps
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { select, confirm } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { ImportCoordinator, CoordinatorConfig, CoordinatorResult, ProgressInfo } from '../../../importers/import-coordinator.js';
import { ItemConverter } from '../../../importers/item-converter.js';
import { loadImportConfig } from '../../../config/import-config.js';
import { selectRepositories, type RepoSelectionConfig } from '../github-repo-selector.js';
import { detectAllConfigs } from './config-detection.js';

/**
 * Prompt user and run external tool import
 * Detects GitHub/JIRA/ADO configuration and imports work items
 *
 * @param targetDir - Project directory
 * @param isCI - Whether running in CI mode
 * @returns Import result
 */
export async function promptAndRunExternalImport(
  targetDir: string,
  isCI: boolean
): Promise<CoordinatorResult> {
  // Load import configuration
  const importConfig = loadImportConfig(targetDir);

  // Check if import is disabled via config
  if (!importConfig.enabled) {
    return emptyResult();
  }

  // Detect available external tools
  const { github, jira, ado, availableTools } = detectAllConfigs(targetDir);

  // If no tools detected, skip import
  if (availableTools.length === 0) {
    return emptyResult();
  }

  console.log(chalk.blue('\n🔍 External Tool Detection'));
  console.log(chalk.gray(`   Found: ${availableTools.join(', ')}`));
  console.log('');

  // In CI mode, skip import without prompting
  if (isCI) {
    console.log(chalk.gray('   → CI mode: Skipping import (can run manually later)\n'));
    return emptyResult();
  }

  // Prompt user to import
  const shouldImport = await confirm({
    message: `Import existing work items from ${availableTools.join(', ')}?`,
    default: false
  });

  if (!shouldImport) {
    console.log(chalk.gray('   ✓ Skipping import\n'));
    return emptyResult();
  }

  // Handle multi-repo selection for GitHub
  let repoSelectionConfig: RepoSelectionConfig | null = null;

  if (github && process.env.GITHUB_TOKEN) {
    repoSelectionConfig = await promptMultiRepoSelection(targetDir);
  }

  // Map config timeRangeMonths to closest prompt option
  let defaultTimeRange = 3;
  if (importConfig.timeRangeMonths === 1) defaultTimeRange = 1;
  else if (importConfig.timeRangeMonths <= 3) defaultTimeRange = 3;
  else if (importConfig.timeRangeMonths <= 6) defaultTimeRange = 6;
  else defaultTimeRange = 999;

  // Prompt for time range
  const timeRange = await select({
    message: 'How far back should we import?',
    choices: [
      { name: '1 month (recent items only)', value: 1 },
      { name: '3 months (recommended)', value: 3 },
      { name: '6 months (comprehensive)', value: 6 },
      { name: 'All time (warning: may be slow)', value: 999 }
    ],
    default: defaultTimeRange
  });

  // Build coordinator configuration
  const coordinatorConfig: CoordinatorConfig = {
    importConfig: {
      timeRangeMonths: timeRange,
      includeClosed: false,
      pageSize: importConfig.pageSize
    },
    parallel: true,
    projectRoot: targetDir
  };

  // Add GitHub config - prefer multi-repo if selected
  if (github) {
    if (repoSelectionConfig && repoSelectionConfig.repositories.length > 0) {
      // Multi-repo mode: import from all selected repositories
      coordinatorConfig.githubRepositories = repoSelectionConfig.repositories.map(fullRepo => {
        const [owner, repo] = fullRepo.split('/');
        return { owner, repo };
      });
      coordinatorConfig.githubToken = process.env.GITHUB_TOKEN;
    } else {
      // Single repo mode (backwards compatible)
      coordinatorConfig.github = {
        owner: github.owner,
        repo: github.repo,
        token: process.env.GITHUB_TOKEN
      };
    }
  }

  // Add JIRA config if available
  if (jira) {
    coordinatorConfig.jira = {
      host: jira.host,
      email: jira.email,
      apiToken: jira.apiToken
    };
  }

  // Add ADO config if available
  if (ado) {
    coordinatorConfig.ado = {
      orgUrl: ado.orgUrl,
      project: ado.project,
      pat: ado.pat
    };
  }

  // Run import with progress tracking
  return await runImport(targetDir, coordinatorConfig);
}

/**
 * Prompt for multi-repository selection
 */
async function promptMultiRepoSelection(targetDir: string): Promise<RepoSelectionConfig | null> {
  try {
    const useMultiRepo = await confirm({
      message: 'Do you want to import from multiple repositories?',
      default: false
    });

    if (!useMultiRepo) {
      return null;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const repoSelectionConfig = await selectRepositories(octokit, process.env.GITHUB_TOKEN!);

    if (repoSelectionConfig) {
      // Save to config
      try {
        const configPath = path.join(targetDir, '.specweave', 'config.json');
        let config: Record<string, unknown> = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        if (!config.github) {
          config.github = {};
        }

        const githubConfig = config.github as Record<string, unknown>;
        githubConfig.repositories = repoSelectionConfig.repositories;
        githubConfig.selectionStrategy = repoSelectionConfig.selectionStrategy;
        if (repoSelectionConfig.pattern) {
          githubConfig.pattern = repoSelectionConfig.pattern;
        }
        if (repoSelectionConfig.organizationName) {
          githubConfig.organizationName = repoSelectionConfig.organizationName;
        }

        fs.ensureDirSync(path.dirname(configPath));
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      } catch {
        // Silent - config save is not critical
      }
    }

    return repoSelectionConfig;
  } catch {
    return null;
  }
}

/**
 * Run the import with progress tracking
 */
async function runImport(
  targetDir: string,
  coordinatorConfig: CoordinatorConfig
): Promise<CoordinatorResult> {
  const spinner = ora('Importing items...').start();
  let lastRepo = '';

  // Enhanced progress callback with percentage and ETA
  coordinatorConfig.onProgressEnhanced = (info: ProgressInfo) => {
    const parts: string[] = [];

    // Show repo name for multi-repo imports
    if (info.sourceRepo && info.sourceRepo !== lastRepo) {
      lastRepo = info.sourceRepo;
    }

    const repoLabel = info.sourceRepo ? ` (${info.sourceRepo})` : '';

    // Build progress string
    if (info.total && info.percentage !== undefined) {
      parts.push(`[${info.current}/${info.total}] ${info.percentage}%`);
    } else {
      parts.push(`${info.current} items`);
    }

    // Add rate if available
    if (info.rate !== undefined && info.rate > 0) {
      parts.push(`${info.rate}/s`);
    }

    // Add ETA if available
    if (info.eta !== undefined && info.eta > 0) {
      const minutes = Math.floor(info.eta / 60);
      const seconds = info.eta % 60;
      if (minutes > 0) {
        parts.push(`ETA: ${minutes}m ${seconds}s`);
      } else {
        parts.push(`ETA: ${seconds}s`);
      }
    }

    spinner.text = `Importing from ${info.platform}${repoLabel}... ${parts.join(' | ')}`;
  };

  // Legacy progress callback (fallback)
  coordinatorConfig.onProgress = (platform: string, count: number, total?: number) => {
    if (!coordinatorConfig.onProgressEnhanced) {
      const totalStr = total ? `/${total}` : '';
      spinner.text = `Importing from ${platform}... (${count}${totalStr} items)`;
    }
  };

  try {
    const coordinator = new ImportCoordinator(coordinatorConfig);
    const result = await coordinator.importAll();

    spinner.succeed(`Imported ${result.totalCount} items`);

    // Show breakdown by platform
    if (result.results.length > 0) {
      console.log('');
      result.results.forEach(platformResult => {
        console.log(chalk.gray(`   ✓ ${platformResult.platform}: ${platformResult.count} items`));
      });
    }

    // Show errors if any
    if (Object.keys(result.errors).length > 0) {
      console.log('');
      console.log(chalk.yellow('   ⚠️  Some imports failed:'));
      Object.entries(result.errors).forEach(([platform, errors]) => {
        console.log(chalk.gray(`   → ${platform}: ${errors.join(', ')}`));
      });
    }

    // Warn if many items detected
    if (result.totalCount > 100) {
      console.log('');
      console.log(chalk.yellow(`   ⚠️  Imported ${result.totalCount} items (large dataset)`));
      console.log(chalk.gray('   → Consider using time range filters for faster imports'));
    }

    // Convert imported items to living docs User Stories
    if (result.totalCount > 0) {
      await convertToLivingDocs(targetDir, result, spinner);
    }

    return result;
  } catch (error) {
    spinner.fail('Import failed');
    throw error;
  }
}

/**
 * Convert imported items to living docs
 */
async function convertToLivingDocs(
  targetDir: string,
  result: CoordinatorResult,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  spinner.start('Converting to living docs...');

  try {
    const specsDir = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs');

    // Track archived items count
    let archivedCount = 0;

    // Enable feature allocation for proper folder structure (FS-XXX/US-XXXE)
    const converter = new ItemConverter({
      specsDir,
      projectRoot: targetDir,
      enableFeatureAllocation: true,
      projectId: 'default',
      autoArchiveAfterDays: 30,  // Archive items older than 1 month
      onFeatureCreated: (featureId, featurePath) => {
        spinner.text = `Created feature folder: ${featureId}`;
      },
      onItemArchived: (usId, reason) => {
        archivedCount++;
        spinner.text = `Archived ${usId} (${reason})`;
      }
    });

    const convertedStories = await converter.convertItems(result.allItems);

    // Count unique features created
    const uniqueFeatures = new Set(convertedStories.map(s => s.featureId).filter(Boolean));

    spinner.succeed(`Converted ${convertedStories.length} User Stories to living docs`);
    console.log(chalk.gray('   → Living docs created with E suffix (US-001E, US-002E, ...)'));
    if (uniqueFeatures.size > 0) {
      console.log(chalk.gray(`   → Organized into ${uniqueFeatures.size} feature folder(s)`));
    }
    if (archivedCount > 0) {
      console.log(chalk.gray(`   → Auto-archived ${archivedCount} items older than 30 days`));
    }
    console.log(chalk.gray('   → Location: .specweave/docs/internal/specs/'));
    console.log('');

    // Validate that no increments were auto-created
    try {
      ItemConverter.validateNoIncrementsCreated(targetDir);
    } catch (validationError) {
      spinner.fail('Import validation failed');
      throw new Error(
        `CRITICAL ERROR: ${validationError instanceof Error ? validationError.message : String(validationError)}\n` +
        'This is a bug in the import system. Please report it.'
      );
    }

    console.log(chalk.blue('   💡 Next steps:'));
    console.log(chalk.gray('   → Review imported User Stories in living docs'));
    console.log(chalk.gray('   → Create increments manually when ready: /specweave:increment "feature"'));
    console.log('');
  } catch (conversionError) {
    spinner.fail('Conversion to living docs failed');
    throw conversionError;
  }
}

/**
 * Create empty result object
 */
function emptyResult(): CoordinatorResult {
  return {
    results: [],
    totalCount: 0,
    allItems: [],
    errors: {},
    platforms: []
  };
}
