/**
 * ADO Area Path Selection Helper
 *
 * Provides UI prompts for selecting ADO area paths and mapping them to SpecWeave projects.
 * Used during `specweave init` when user selects area path-based team organization.
 *
 * @module cli/helpers/issue-tracker/ado-area-selection
 */

import chalk from 'chalk';
import { select, checkbox, input, confirm } from '@inquirer/prompts';
import ora from 'ora';
import type { AdoAreaPathMapping, AdoAreaPathMappingConfig } from '../../../core/types/sync-profile.js';
import {
  fetchAreaPathsForProject,
  type AdoAreaPath,
} from '../../../../plugins/specweave-ado/lib/ado-board-resolver.js';
import {
  generateProjectId,
  getExistingProjectIds,
  normalizeToProjectId,
} from '../../../utils/project-id-generator.js';

/**
 * ADO organization strategy
 */
export type AdoOrganizationStrategy =
  | 'single-project'    // All work at project root level (default for small teams)
  | 'area-path-based'   // Single project, area paths → SpecWeave projects
  | 'multi-project';    // Multiple ADO projects (rare, separate projects per team)

/**
 * Area path selection result
 */
export interface AreaPathSelectionResult {
  /** Selected organization strategy */
  strategy: AdoOrganizationStrategy;

  /** Area path mapping config (only for area-path-based strategy) */
  areaPathMapping?: AdoAreaPathMappingConfig;

  /** Selected project names (for multi-project strategy) */
  projectNames?: string[];

  /** Single project name (for single-project strategy) */
  projectName?: string;
}

/**
 * Prompt user to select ADO organization strategy
 *
 * @param hasMultipleAreaPaths Whether the project has multiple area paths
 * @returns Selected strategy
 */
export async function promptAdoOrganizationStrategy(
  hasMultipleAreaPaths: boolean
): Promise<AdoOrganizationStrategy> {
  console.log(chalk.cyan('\n🔷 Azure DevOps Project Organization\n'));

  const defaultStrategy: AdoOrganizationStrategy =
    hasMultipleAreaPaths ? 'area-path-based' : 'single-project';

  const strategy = await select<AdoOrganizationStrategy>({
    message: 'How do you want to organize work items?',
    choices: [
      {
        name: 'Single project (all work at root level)',
        value: 'single-project',
        description: 'Best for small teams or single-product companies',
      },
      {
        name: 'Area path-based teams (area paths → SpecWeave projects)',
        value: 'area-path-based',
        description: 'Best for enterprise teams using area paths for organization',
      },
    ],
    default: defaultStrategy,
  });

  return strategy;
}

/**
 * Fetch and display area paths for an ADO project
 * Prompts user to select area paths and map them to SpecWeave projects
 *
 * @param organization ADO organization name
 * @param project ADO project name
 * @param pat Personal Access Token
 * @param projectRoot Path to SpecWeave project root (for existing project IDs)
 * @returns Area path mapping configuration
 */
export async function promptAreaPathSelection(
  organization: string,
  project: string,
  pat: string,
  projectRoot: string
): Promise<AdoAreaPathMappingConfig | null> {
  const spinner = ora(`Fetching area paths from project ${project}...`).start();

  try {
    // Fetch available area paths
    const areaPaths = await fetchAreaPathsForProject(organization, project, pat);
    spinner.succeed(`Found ${areaPaths.length} area path(s) in project ${project}`);

    if (areaPaths.length === 0) {
      console.log(chalk.yellow('\n⚠️  No area paths found in this project.'));
      console.log(chalk.gray('   Using root level organization.\n'));
      return null;
    }

    // Filter to show only top-level area paths (direct children of project root)
    // Exclude the root itself
    const topLevelPaths = areaPaths.filter((ap) => {
      // Path format: "ProjectName" (root) or "ProjectName\\ChildArea"
      const parts = ap.path.split('\\');
      return parts.length === 2; // Direct child of root
    });

    if (topLevelPaths.length === 0) {
      console.log(chalk.yellow('\n⚠️  No child area paths found (only root area exists).'));
      console.log(chalk.gray('   You can create area paths in ADO and run this setup again.\n'));
      return null;
    }

    // Show area paths and let user select
    console.log(chalk.cyan('\n📋 Select area paths to map to SpecWeave projects:\n'));

    // Filter out archive/inactive paths by default (uncheck them)
    const isArchivePath = (areaPath: AdoAreaPath) =>
      areaPath.name.toLowerCase().includes('archive') ||
      areaPath.name.toLowerCase().includes('inactive') ||
      areaPath.name.toLowerCase().includes('deprecated') ||
      areaPath.name.toLowerCase().includes('legacy');

    const selectedPaths = await checkbox({
      message: 'Select area paths (Space to toggle, Enter to confirm):',
      choices: topLevelPaths.map((ap) => ({
        name: `${ap.name}${ap.hasChildren ? ' (has sub-areas)' : ''}`,
        value: ap.path,
        checked: !isArchivePath(ap), // Pre-select non-archive paths
      })),
    });

    if (selectedPaths.length === 0) {
      console.log(chalk.yellow('\n⚠️  No area paths selected. Falling back to single-project mode.\n'));
      return null;
    }

    // Get existing project IDs to prevent collisions
    const existingIds = getExistingProjectIds(projectRoot);

    // Map selected area paths to SpecWeave projects
    console.log(chalk.cyan('\n🏷️  Mapping area paths to SpecWeave projects:\n'));

    const areaPathMappings: AdoAreaPathMapping[] = [];

    for (const pathStr of selectedPaths) {
      const areaPath = areaPaths.find((ap) => ap.path === pathStr);
      if (!areaPath) continue;

      // Suggest a project ID based on area path name
      const suggestedId = generateProjectId({
        externalContainer: project,
        localName: areaPath.name,
        provider: 'ado',
        existingIds: [...existingIds, ...areaPathMappings.map((m) => m.specweaveProject)],
      });

      // Allow user to customize the project ID
      const projectId = await input({
        message: `SpecWeave project ID for "${areaPath.name}":`,
        default: suggestedId.id,
        validate: (val) => {
          if (!val || val.trim() === '') {
            return 'Project ID cannot be empty';
          }
          const normalized = normalizeToProjectId(val);
          if (normalized !== val) {
            return `Invalid format. Suggested: "${normalized}"`;
          }
          if (existingIds.includes(val) || areaPathMappings.some((m) => m.specweaveProject === val)) {
            return `Project ID "${val}" already exists. Choose a different name.`;
          }
          return true;
        },
      });

      // Ask about including child area paths
      let includeChildren = true;
      if (areaPath.hasChildren) {
        includeChildren = await confirm({
          message: `Include child area paths under "${areaPath.name}"?`,
          default: true,
        });
      }

      // Optional: Add keywords for auto-classification
      const addKeywords = await confirm({
        message: `Add keywords for auto-classification of user stories to ${projectId}?`,
        default: false,
      });

      let keywords: string[] | undefined;
      if (addKeywords) {
        const keywordsInput = await input({
          message: 'Keywords (comma-separated, e.g., "backend, api, database"):',
          default: '',
        });
        keywords = keywordsInput
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
      }

      areaPathMappings.push({
        areaPath: areaPath.path,
        specweaveProject: projectId,
        includeChildren,
        keywords,
      });

      console.log(chalk.green(`   ✓ ${areaPath.path} → ${projectId}`));
    }

    console.log('');

    return {
      project,
      mappings: areaPathMappings,
    };
  } catch (error: any) {
    spinner.fail('Failed to fetch area paths');
    console.error(chalk.red(`   Error: ${error.message}\n`));
    return null;
  }
}

/**
 * Complete area path selection flow
 * Orchestrates strategy selection and area path mapping
 *
 * @param credentials ADO credentials (partial)
 * @param projectRoot Path to SpecWeave project root
 * @returns Area path selection result
 */
export async function completeAreaPathSelectionFlow(
  credentials: {
    organization: string;
    project: string;
    pat: string;
  },
  projectRoot: string
): Promise<AreaPathSelectionResult> {
  // Check if there are area paths in the project
  const spinner = ora('Checking project structure...').start();

  try {
    const areaPaths = await fetchAreaPathsForProject(
      credentials.organization,
      credentials.project,
      credentials.pat
    );

    const hasMultipleAreaPaths = areaPaths.filter((ap) => {
      const parts = ap.path.split('\\');
      return parts.length === 2; // Direct children
    }).length > 0;

    spinner.stop();

    // Ask about organization strategy
    const strategy = await promptAdoOrganizationStrategy(hasMultipleAreaPaths);

    if (strategy === 'single-project') {
      return {
        strategy: 'single-project',
        projectName: credentials.project,
      };
    }

    if (strategy === 'area-path-based') {
      const areaPathMapping = await promptAreaPathSelection(
        credentials.organization,
        credentials.project,
        credentials.pat,
        projectRoot
      );

      if (areaPathMapping && areaPathMapping.mappings.length > 0) {
        return {
          strategy: 'area-path-based',
          areaPathMapping,
        };
      }

      // Fall back to single-project if no area paths selected
      return {
        strategy: 'single-project',
        projectName: credentials.project,
      };
    }

    // multi-project (rare for ADO)
    return {
      strategy: 'single-project',
      projectName: credentials.project,
    };
  } catch (error: any) {
    spinner.stop();
    console.error(chalk.yellow(`\n⚠️  Could not analyze project structure: ${error.message}`));
    console.log(chalk.gray('   Proceeding with single-project mode.\n'));

    return {
      strategy: 'single-project',
      projectName: credentials.project,
    };
  }
}

/**
 * Display summary of area path mapping
 */
export function displayAreaPathMappingSummary(mapping: AdoAreaPathMappingConfig): void {
  console.log(chalk.cyan.bold('\n🔷 ADO Area Path Mapping Summary\n'));
  console.log(chalk.gray(`   Project: ${mapping.project}`));
  console.log(chalk.gray(`   Area paths mapped: ${mapping.mappings.length}\n`));

  for (const area of mapping.mappings) {
    console.log(chalk.green(`   ✓ ${area.areaPath}`));
    console.log(chalk.gray(`     → SpecWeave project: ${area.specweaveProject}`));
    if (area.includeChildren) {
      console.log(chalk.gray(`     → Includes child areas: yes`));
    }
    if (area.keywords && area.keywords.length > 0) {
      console.log(chalk.gray(`     → Keywords: ${area.keywords.join(', ')}`));
    }
  }
  console.log('');
}
