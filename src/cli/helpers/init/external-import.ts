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
import { ImportCoordinator, CoordinatorConfig, CoordinatorResult } from '../../../importers/import-coordinator.js';
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
    parallel: true
  };

  // Add GitHub config if available
  if (github) {
    coordinatorConfig.github = {
      owner: github.owner,
      repo: github.repo,
      token: process.env.GITHUB_TOKEN
    };
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

  coordinatorConfig.onProgress = (platform: string, count: number) => {
    spinner.text = `Importing from ${platform}... (${count} items)`;
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
    const converter = new ItemConverter({ specsDir });

    const convertedStories = await converter.convertItems(result.allItems);

    spinner.succeed(`Converted ${convertedStories.length} User Stories to living docs`);
    console.log(chalk.gray('   → Living docs created with E suffix (US-001E, US-002E, ...)'));
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
