/**
 * JIRA Board Selection Helper (v0.29.0+)
 *
 * Provides UI prompts for selecting JIRA boards and mapping them to SpecWeave projects.
 * Used during `specweave init` when user selects board-based team organization.
 *
 * @module cli/helpers/issue-tracker/jira-board-selection
 */

import chalk from 'chalk';
import { select, checkbox, input, confirm } from '@inquirer/prompts';
import ora from 'ora';
import type { JiraBoardMapping, JiraBoardMappingConfig } from '../../../core/types/sync-profile.js';
import { JiraClient } from '../../../integrations/jira/jira-client.js';
import { fetchBoardsForProject, type JiraBoard } from '../../../../plugins/specweave-jira/lib/jira-board-resolver.js';
import {
  generateProjectId,
  getExistingProjectIds,
  normalizeToProjectId,
} from '../../../utils/project-id-generator.js';

/**
 * JIRA organization strategy
 */
export type JiraOrganizationStrategy =
  | 'single-project'    // All work in one JIRA project (default for small teams)
  | 'board-based'       // Single project, multiple boards → SpecWeave projects
  | 'multi-project';    // Multiple JIRA projects (existing behavior)

/**
 * Board selection result
 */
export interface BoardSelectionResult {
  /** Selected organization strategy */
  strategy: JiraOrganizationStrategy;

  /** Board mapping config (only for board-based strategy) */
  boardMapping?: JiraBoardMappingConfig;

  /** Selected project keys (for multi-project strategy) */
  projectKeys?: string[];

  /** Single project key (for single-project strategy) */
  projectKey?: string;
}

/**
 * Prompt user to select JIRA organization strategy
 *
 * @param projectCount Number of projects user has access to
 * @returns Selected strategy
 */
export async function promptOrganizationStrategy(
  projectCount: number
): Promise<JiraOrganizationStrategy> {
  console.log(chalk.cyan('\n📋 JIRA Project Organization\n'));

  // Determine default based on project count
  const defaultStrategy: JiraOrganizationStrategy =
    projectCount === 1 ? 'single-project' :
    projectCount <= 3 ? 'board-based' :
    'multi-project';

  const strategy = await select<JiraOrganizationStrategy>({
    message: 'How do you want to organize work items?',
    choices: [
      {
        name: 'Single project (all work in one JIRA project)',
        value: 'single-project',
        description: 'Best for small teams or single-product companies',
      },
      {
        name: 'Board-based teams (one project, multiple boards → SpecWeave projects)',
        value: 'board-based',
        description: 'Best for enterprise teams sharing a JIRA project',
      },
      {
        name: 'Multiple projects (each JIRA project → SpecWeave project)',
        value: 'multi-project',
        description: 'Best for organizations with separate JIRA projects per team',
      },
    ],
    default: defaultStrategy,
  });

  return strategy;
}

/**
 * Fetch and display boards for a JIRA project
 * Prompts user to select boards and map them to SpecWeave projects
 *
 * @param client JIRA client for API calls
 * @param projectKey JIRA project key (e.g., "CORE")
 * @param projectRoot Path to SpecWeave project root (for existing project IDs)
 * @returns Board mapping configuration
 */
export async function promptBoardSelection(
  client: JiraClient,
  projectKey: string,
  projectRoot: string
): Promise<JiraBoardMappingConfig | null> {
  const spinner = ora(`Fetching boards from project ${projectKey}...`).start();

  try {
    // Fetch available boards
    const boards = await fetchBoardsForProject(client, projectKey);
    spinner.succeed(`Found ${boards.length} board(s) in project ${projectKey}`);

    if (boards.length === 0) {
      console.log(chalk.yellow('\n⚠️  No boards found in this project.'));
      console.log(chalk.gray('   You can create boards in JIRA and run this setup again.\n'));
      return null;
    }

    // Show boards and let user select
    console.log(chalk.cyan('\n📋 Select boards to map to SpecWeave projects:\n'));

    // Filter out archive/inactive boards by default (uncheck them)
    const isArchiveBoard = (board: JiraBoard) =>
      board.name.toLowerCase().includes('archive') ||
      board.name.toLowerCase().includes('inactive') ||
      board.name.toLowerCase().includes('deprecated');

    const selectedBoardIds = await checkbox({
      message: 'Select boards (Space to toggle, Enter to confirm):',
      choices: boards.map((board) => ({
        name: `${board.name} (${board.type}, ID: ${board.id})`,
        value: board.id,
        checked: !isArchiveBoard(board), // Pre-select non-archive boards
      })),
    });

    if (selectedBoardIds.length === 0) {
      console.log(chalk.yellow('\n⚠️  No boards selected. Falling back to single-project mode.\n'));
      return null;
    }

    // Get existing project IDs to prevent collisions
    const existingIds = getExistingProjectIds(projectRoot);

    // Map selected boards to SpecWeave projects
    console.log(chalk.cyan('\n🏷️  Mapping boards to SpecWeave projects:\n'));

    const boardMappings: JiraBoardMapping[] = [];

    for (const boardId of selectedBoardIds) {
      const board = boards.find((b) => b.id === boardId);
      if (!board) continue;

      // Suggest a project ID based on board name
      const suggestedId = generateProjectId({
        externalContainer: projectKey,
        localName: board.name,
        provider: 'jira',
        existingIds: [...existingIds, ...boardMappings.map((m) => m.specweaveProject)],
      });

      // Allow user to customize the project ID
      const projectId = await input({
        message: `SpecWeave project ID for "${board.name}":`,
        default: suggestedId.id,
        validate: (val) => {
          if (!val || val.trim() === '') {
            return 'Project ID cannot be empty';
          }
          const normalized = normalizeToProjectId(val);
          if (normalized !== val) {
            return `Invalid format. Suggested: "${normalized}"`;
          }
          if (existingIds.includes(val) || boardMappings.some((m) => m.specweaveProject === val)) {
            return `Project ID "${val}" already exists. Choose a different name.`;
          }
          return true;
        },
      });

      // Optional: Add keywords for auto-classification
      const addKeywords = await confirm({
        message: `Add keywords for auto-classification of user stories to ${projectId}?`,
        default: false,
      });

      let keywords: string[] | undefined;
      if (addKeywords) {
        const keywordsInput = await input({
          message: 'Keywords (comma-separated, e.g., "frontend, UI, react"):',
          default: '',
        });
        keywords = keywordsInput
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
      }

      boardMappings.push({
        boardId: board.id,
        boardName: board.name,
        specweaveProject: projectId,
        boardType: board.type,
        keywords,
      });

      console.log(chalk.green(`   ✓ ${board.name} → ${projectId}`));
    }

    console.log('');

    return {
      projectKey,
      boards: boardMappings,
    };
  } catch (error: any) {
    spinner.fail('Failed to fetch boards');
    console.error(chalk.red(`   Error: ${error.message}\n`));
    return null;
  }
}

/**
 * Complete board selection flow
 * Orchestrates strategy selection and board mapping
 *
 * @param credentials JIRA credentials (partial)
 * @param selectedProjects Already selected JIRA projects
 * @param projectRoot Path to SpecWeave project root
 * @returns Board selection result
 */
export async function completeBoardSelectionFlow(
  credentials: {
    domain: string;
    email: string;
    token: string;
    instanceType: 'cloud' | 'server';
  },
  selectedProjects: string[],
  projectRoot: string
): Promise<BoardSelectionResult> {
  // If only one project selected, ask about organization strategy
  if (selectedProjects.length === 1) {
    const strategy = await promptOrganizationStrategy(1);

    if (strategy === 'single-project') {
      return {
        strategy: 'single-project',
        projectKey: selectedProjects[0],
      };
    }

    if (strategy === 'board-based') {
      // Create JIRA client for API calls (uses credentialsManager internally)
      const client = new JiraClient();

      const boardMapping = await promptBoardSelection(
        client,
        selectedProjects[0],
        projectRoot
      );

      if (boardMapping && boardMapping.boards.length > 0) {
        return {
          strategy: 'board-based',
          boardMapping,
        };
      }

      // Fall back to single-project if no boards selected
      return {
        strategy: 'single-project',
        projectKey: selectedProjects[0],
      };
    }

    // multi-project with 1 project doesn't make sense, treat as single
    return {
      strategy: 'single-project',
      projectKey: selectedProjects[0],
    };
  }

  // Multiple projects selected - determine strategy
  const wantBoardBased = await confirm({
    message: `You selected ${selectedProjects.length} projects. Do any have multiple boards you want to map to SpecWeave projects?`,
    default: false,
  });

  if (!wantBoardBased) {
    // Standard multi-project mode
    return {
      strategy: 'multi-project',
      projectKeys: selectedProjects,
    };
  }

  // Ask which project to configure with board mapping
  const projectForBoards = await select({
    message: 'Which project has multiple boards to map?',
    choices: selectedProjects.map((p) => ({ name: p, value: p })),
  });

  // Create JIRA client (uses credentialsManager internally)
  const client = new JiraClient();

  const boardMapping = await promptBoardSelection(
    client,
    projectForBoards,
    projectRoot
  );

  if (boardMapping && boardMapping.boards.length > 0) {
    // Remove the board-mapped project from the multi-project list
    const remainingProjects = selectedProjects.filter((p) => p !== projectForBoards);

    return {
      strategy: 'board-based',
      boardMapping,
      projectKeys: remainingProjects.length > 0 ? remainingProjects : undefined,
    };
  }

  // Fall back to multi-project
  return {
    strategy: 'multi-project',
    projectKeys: selectedProjects,
  };
}

/**
 * Display summary of board mapping
 */
export function displayBoardMappingSummary(mapping: JiraBoardMappingConfig): void {
  console.log(chalk.cyan.bold('\n📋 JIRA Board Mapping Summary\n'));
  console.log(chalk.gray(`   Project: ${mapping.projectKey}`));
  console.log(chalk.gray(`   Boards mapped: ${mapping.boards.length}\n`));

  for (const board of mapping.boards) {
    console.log(chalk.green(`   ✓ ${board.boardName} (${board.boardType || 'unknown'})`));
    console.log(chalk.gray(`     → SpecWeave project: ${board.specweaveProject}`));
    if (board.keywords && board.keywords.length > 0) {
      console.log(chalk.gray(`     → Keywords: ${board.keywords.join(', ')}`));
    }
  }
  console.log('');
}
