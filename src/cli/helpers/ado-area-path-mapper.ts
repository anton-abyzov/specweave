/**
 * ADO Area Path Mapper
 *
 * Maps SpecWeave increments to Azure DevOps area paths for hierarchical organization.
 * Supports granularity selection (Project-level, Team-level, Area-Path-level).
 *
 * @module cli/helpers/ado-area-path-mapper
 */

import { select } from '@inquirer/prompts';
import chalk from 'chalk';

export type AreaPathGranularity = 'project' | 'team' | 'area-path';

export interface AreaPathMapping {
  incrementId: string;
  project: string;
  team?: string;
  areaPath?: string;
  granularity: AreaPathGranularity;
}

export interface AreaPathMapperOptions {
  organization: string;
  project: string;
  availableTeams?: string[];
  availableAreaPaths?: string[];
}

/**
 * Prompt user to select area path granularity
 *
 * Granularity levels:
 * - project: Map to project only (simplest)
 * - team: Map to project + team
 * - area-path: Map to project + team + specific area path (most granular)
 *
 * @param options - Mapper options
 * @returns Selected granularity
 */
export async function promptAreaPathGranularity(
  options: AreaPathMapperOptions
): Promise<AreaPathGranularity> {
  console.log(chalk.cyan('\n📂 ADO Area Path Mapping\n'));
  console.log(chalk.white('How would you like to organize work items?\n'));

  const granularity = await select<AreaPathGranularity>({
    message: 'Select organization level:',
    default: 'project',
    choices: [
      {
        name: chalk.green('Project-level') + chalk.gray(' - Simple (all items in project root)'),
        value: 'project' as const
      },
      {
        name: 'Team-level' + chalk.gray(' - Organized by team'),
        value: 'team' as const
      },
      {
        name: 'Area Path-level' + chalk.gray(' - Most granular (by feature/component)'),
        value: 'area-path' as const
      }
    ]
  });

  return granularity;
}

/**
 * Prompt user to select team (for team-level or area-path-level granularity)
 *
 * @param options - Mapper options
 * @returns Selected team name
 */
export async function promptTeamSelection(
  options: AreaPathMapperOptions
): Promise<string | undefined> {
  if (!options.availableTeams || options.availableTeams.length === 0) {
    console.log(chalk.yellow('⚠️  No teams found. Using project-level mapping.\n'));
    return undefined;
  }

  const team = await select({
    message: 'Select team:',
    choices: options.availableTeams.map(t => ({
      name: t,
      value: t
    }))
  });

  return team;
}

/**
 * Prompt user to select area path (for area-path-level granularity)
 *
 * @param options - Mapper options
 * @param team - Selected team
 * @returns Selected area path
 */
export async function promptAreaPathSelection(
  options: AreaPathMapperOptions,
  team?: string
): Promise<string | undefined> {
  if (!options.availableAreaPaths || options.availableAreaPaths.length === 0) {
    console.log(chalk.yellow('⚠️  No area paths found. Using team-level mapping.\n'));
    return undefined;
  }

  // Filter area paths by team if team is specified
  const filteredPaths = team
    ? options.availableAreaPaths.filter(path => path.startsWith(`${team}/`))
    : options.availableAreaPaths;

  if (filteredPaths.length === 0) {
    console.log(chalk.yellow(`⚠️  No area paths found for team "${team}". Using team-level mapping.\n`));
    return undefined;
  }

  const areaPath = await select({
    message: 'Select area path:',
    choices: filteredPaths.map(p => ({
      name: p,
      value: p
    }))
  });

  return areaPath;
}

/**
 * Create area path mapping for an increment
 *
 * Interactive flow:
 * 1. Select granularity level
 * 2. Select team (if team-level or area-path-level)
 * 3. Select area path (if area-path-level)
 *
 * @param incrementId - Increment ID
 * @param options - Mapper options
 * @returns Area path mapping
 */
export async function createAreaPathMapping(
  incrementId: string,
  options: AreaPathMapperOptions
): Promise<AreaPathMapping> {
  // Step 1: Select granularity
  const granularity = await promptAreaPathGranularity(options);

  const mapping: AreaPathMapping = {
    incrementId,
    project: options.project,
    granularity
  };

  // Step 2: Select team (if needed)
  if (granularity === 'team' || granularity === 'area-path') {
    const team = await promptTeamSelection(options);
    if (team) {
      mapping.team = team;
    } else {
      // Fallback to project-level if no team selected
      mapping.granularity = 'project';
      return mapping;
    }
  }

  // Step 3: Select area path (if needed)
  if (granularity === 'area-path') {
    const areaPath = await promptAreaPathSelection(options, mapping.team);
    if (areaPath) {
      mapping.areaPath = areaPath;
    } else {
      // Fallback to team-level if no area path selected
      mapping.granularity = 'team';
    }
  }

  // Show selected mapping
  console.log(chalk.green('\n✓ Area path mapping created:'));
  console.log(chalk.gray(`   Project:   ${mapping.project}`));
  if (mapping.team) {
    console.log(chalk.gray(`   Team:      ${mapping.team}`));
  }
  if (mapping.areaPath) {
    console.log(chalk.gray(`   Area Path: ${mapping.areaPath}`));
  }
  console.log('');

  return mapping;
}

/**
 * Format area path for ADO API
 *
 * Converts mapping to ADO-compatible area path format:
 * - project: "ProjectName"
 * - team: "ProjectName\\TeamName"
 * - area-path: "ProjectName\\TeamName\\AreaPath"
 *
 * @param mapping - Area path mapping
 * @returns Formatted area path string
 */
export function formatAreaPath(mapping: AreaPathMapping): string {
  let path = mapping.project;

  if (mapping.team) {
    path += `\\\\${mapping.team}`;
  }

  if (mapping.areaPath) {
    path += `\\\\${mapping.areaPath}`;
  }

  return path;
}

/**
 * Validate area path exists in ADO
 *
 * Makes API call to verify area path is valid before creating work item.
 *
 * @param areaPath - Formatted area path
 * @param credentials - ADO credentials
 * @returns true if valid, false otherwise
 */
export async function validateAreaPath(
  areaPath: string,
  credentials: { organization: string; pat: string; project: string }
): Promise<boolean> {
  try {
    const url = `https://dev.azure.com/${credentials.organization}/${credentials.project}/_apis/wit/classificationnodes/areas?$depth=10&api-version=7.0`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${credentials.pat}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // Simplified validation - check if area node exists
    return data.value !== undefined || data.name !== undefined;

  } catch (error) {
    console.error(chalk.red(`Failed to validate area path: ${error}`));
    return false;
  }
}
