/**
 * CLI Context Command
 *
 * Provides project/board context for increment planning.
 * Used by Claude Code agents to get valid project/board values
 * before generating spec.md files.
 *
 * @module cli/commands/context
 */

import {
  detectStructureLevel,
  StructureLevelConfig,
  ProjectInfo,
  BoardInfo
} from '../../utils/structure-level-detector.js';

/**
 * Output format for projects subcommand
 */
interface ProjectsOutput {
  /** Structure level (1 or 2) */
  level: 1 | 2;
  /** Available projects */
  projects: ProjectInfo[];
  /** Available boards organized by project (only for 2-level) */
  boardsByProject?: Record<string, BoardInfo[]>;
  /** Detection reason for debugging */
  detectionReason: string;
  /** Source of configuration */
  source: string;
}

/**
 * Output format for boards subcommand
 */
interface BoardsOutput {
  /** Project ID that boards belong to */
  project: string;
  /** Available boards for the project */
  boards: BoardInfo[];
  /** Warning if 1-level structure (no boards) */
  warning?: string;
}

/**
 * Output format for select subcommand
 */
interface SelectOutput {
  /** Selected project and board */
  selected: {
    project: string;
    board?: string;
  };
  /** Whether selection was automatic (single option) */
  autoSelected: boolean;
  /** Structure level */
  level: 1 | 2;
}

/**
 * Get all available projects and structure level
 * Used by Claude before generating spec.md
 *
 * @param projectRoot - Path to project root
 * @returns JSON-serializable projects context
 */
export function getProjectsContext(projectRoot: string = process.cwd()): ProjectsOutput {
  const config = detectStructureLevel(projectRoot);

  const output: ProjectsOutput = {
    level: config.level,
    projects: config.projects,
    detectionReason: config.detectionReason,
    source: config.source
  };

  // Include boards only for 2-level structures
  if (config.level === 2 && config.boardsByProject) {
    output.boardsByProject = config.boardsByProject;
  }

  return output;
}

/**
 * Get boards for a specific project
 *
 * @param projectId - Project ID to get boards for
 * @param projectRoot - Path to project root
 * @returns JSON-serializable boards context
 */
export function getBoardsContext(
  projectId: string,
  projectRoot: string = process.cwd()
): BoardsOutput {
  const config = detectStructureLevel(projectRoot);

  // 1-level structure has no boards
  if (config.level === 1) {
    return {
      project: projectId,
      boards: [],
      warning: '1-level structure detected - boards are not applicable'
    };
  }

  // Normalize project ID for lookup
  const normalizedId = projectId.toLowerCase().replace(/\s+/g, '-');

  // Find boards for the project
  const boards = config.boardsByProject?.[normalizedId] || [];

  // Try original ID if normalized doesn't match
  if (boards.length === 0 && config.boardsByProject?.[projectId]) {
    return {
      project: projectId,
      boards: config.boardsByProject[projectId]
    };
  }

  return {
    project: projectId,
    boards
  };
}

/**
 * Auto-select or prompt for project/board selection
 *
 * @param config - Structure level config
 * @returns Selection result with auto-select flag
 */
export function autoSelectProjectBoard(
  config: StructureLevelConfig
): SelectOutput {
  // Single project in 1-level = auto-select
  if (config.level === 1 && config.projects.length === 1) {
    return {
      selected: {
        project: config.projects[0].id
      },
      autoSelected: true,
      level: 1
    };
  }

  // Single project + single board in 2-level = auto-select
  if (config.level === 2 && config.projects.length === 1 && config.boardsByProject) {
    const projectId = config.projects[0].id;
    const boards = config.boardsByProject[projectId] || [];

    if (boards.length === 1) {
      return {
        selected: {
          project: projectId,
          board: boards[0].id
        },
        autoSelected: true,
        level: 2
      };
    }
  }

  // Multiple options - cannot auto-select
  // Return first project as default (caller should prompt user)
  if (config.level === 2 && config.projects.length > 0 && config.boardsByProject) {
    const projectId = config.projects[0].id;
    const boards = config.boardsByProject[projectId] || [];

    return {
      selected: {
        project: projectId,
        board: boards.length > 0 ? boards[0].id : undefined
      },
      autoSelected: false,
      level: 2
    };
  }

  return {
    selected: {
      project: config.projects.length > 0 ? config.projects[0].id : 'default'
    },
    autoSelected: false,
    level: config.level
  };
}

/**
 * CLI handler for 'specweave context projects' command
 */
export async function contextProjectsCommand(): Promise<void> {
  const output = getProjectsContext(process.cwd());
  console.log(JSON.stringify(output, null, 2));
}

/**
 * CLI handler for 'specweave context boards' command
 *
 * @param options - Command options with project ID
 */
export async function contextBoardsCommand(options: { project?: string }): Promise<void> {
  if (!options.project) {
    // If no project specified, show all boards for all projects
    const config = detectStructureLevel(process.cwd());

    if (config.level === 1) {
      console.log(JSON.stringify({
        warning: '1-level structure detected - boards are not applicable',
        boards: []
      }, null, 2));
      return;
    }

    console.log(JSON.stringify({
      boardsByProject: config.boardsByProject || {}
    }, null, 2));
    return;
  }

  const output = getBoardsContext(options.project, process.cwd());
  console.log(JSON.stringify(output, null, 2));
}

/**
 * CLI handler for 'specweave context select' command
 * Returns auto-selected values or prompts interactively
 */
export async function contextSelectCommand(): Promise<void> {
  const config = detectStructureLevel(process.cwd());
  const output = autoSelectProjectBoard(config);

  // If auto-selected, just output
  if (output.autoSelected) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Multiple options - need to prompt interactively
  // Use @inquirer/prompts for interactive selection
  try {
    const { select } = await import('@inquirer/prompts');

    // Prompt for project
    const projectChoices = config.projects.map(p => ({
      name: p.name || p.id,
      value: p.id
    }));

    const selectedProject = await select({
      message: 'Select project:',
      choices: projectChoices
    });

    let selectedBoard: string | undefined;

    // Prompt for board if 2-level
    if (config.level === 2 && config.boardsByProject) {
      const boards = config.boardsByProject[selectedProject] || [];

      if (boards.length > 0) {
        const boardChoices = boards.map(b => ({
          name: b.name || b.id,
          value: b.id
        }));

        selectedBoard = await select({
          message: 'Select board:',
          choices: boardChoices
        });
      }
    }

    const result: SelectOutput = {
      selected: {
        project: selectedProject,
        board: selectedBoard
      },
      autoSelected: false,
      level: config.level
    };

    console.log(JSON.stringify(result, null, 2));
  } catch {
    // Fallback if prompts fail (non-interactive mode)
    console.log(JSON.stringify(output, null, 2));
  }
}
