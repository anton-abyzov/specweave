/**
 * Jira Resource Validator
 * 
 * Validates and creates Jira resources (projects, boards).
 * Split from external-resource-validator.ts for maintainability.
 * 
 * @module utils/validators/jira-validator
 */

import * as fs from '../fs-native.js';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { JiraProject, JiraBoard, JiraValidationResult } from './types.js';

const execAsync = promisify(exec);

// Re-export types for convenience
export type { JiraProject, JiraBoard, JiraValidationResult };

export class JiraResourceValidator {
  private apiToken: string;
  private email: string;
  private domain: string;
  private envPath: string;

  constructor(envPath: string = '.env') {
    this.envPath = envPath;
    // Load from .env
    const env = this.loadEnv();
    this.apiToken = env.JIRA_API_TOKEN || '';
    this.email = env.JIRA_EMAIL || '';
    this.domain = env.JIRA_DOMAIN || '';
  }

  /**
   * Load .env file
   */
  private loadEnv(): Record<string, string> {
    try {
      if (!fs.existsSync(this.envPath)) {
        return {};
      }

      const content = fs.readFileSync(this.envPath, 'utf-8');
      const env: Record<string, string> = {};

      content.split('\n').forEach((line) => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          env[key] = value;
        }
      });

      return env;
    } catch (error) {
      return {};
    }
  }

  /**
   * Update .env file with new values
   */
  private async updateEnv(updates: Record<string, string>): Promise<void> {
    try {
      let content = '';
      if (fs.existsSync(this.envPath)) {
        content = fs.readFileSync(this.envPath, 'utf-8');
      }

      // Update existing or append new
      Object.entries(updates).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${value}`);
        } else {
          content += `\n${key}=${value}`;
        }
      });

      fs.writeFileSync(this.envPath, content.trim() + '\n');
      console.log(chalk.green(`✅ Updated ${this.envPath}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to update ${this.envPath}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Call Jira API
   */
  private async callJiraApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const url = `https://${this.domain}/rest/api/3/${endpoint}`;
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

    const curlCommand = `curl -s -f -X ${method} \
      -H "Authorization: Basic ${auth}" \
      -H "Content-Type: application/json" \
      ${body ? `-d '${JSON.stringify(body)}'` : ''} \
      "${url}"`;

    try {
      const { stdout } = await execAsync(curlCommand);
      const response = JSON.parse(stdout);

      // Double-check for error response (defense in depth)
      if (response.errorMessages || response.errors) {
        const errorMsg = response.errorMessages?.join(', ') || JSON.stringify(response.errors);
        throw new Error(errorMsg);
      }

      return response;
    } catch (error: any) {
      // Improve error message for common cases
      if (error.message.includes('curl: (22)')) {
        throw new Error('Resource not found (HTTP 404)');
      }
      throw error;
    }
  }

  /**
   * Fetch all Jira projects
   */
  async fetchProjects(): Promise<JiraProject[]> {
    try {
      const response = await this.callJiraApi('project');
      return response.map((p: any) => ({
        id: p.id,
        key: p.key,
        name: p.name,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if project exists
   */
  async checkProject(projectKey: string): Promise<JiraProject | null> {
    try {
      const project = await this.callJiraApi(`project/${projectKey}`);
      return {
        id: project.id,
        key: project.key,
        name: project.name,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create new Jira project
   */
  async createProject(projectKey: string, projectName: string): Promise<JiraProject> {
    console.log(chalk.blue(`📦 Creating Jira project: ${projectKey} (${projectName})...`));

    const body = {
      key: projectKey,
      name: projectName,
      projectTypeKey: 'software',
      leadAccountId: await this.getCurrentUserId(),
    };

    try {
      const project = await this.callJiraApi('project', 'POST', body);
      console.log(chalk.green(`✅ Project created: ${projectKey}`));
      return {
        id: project.id,
        key: project.key,
        name: project.name,
      };
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to create project: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get current user ID (for project lead)
   */
  private async getCurrentUserId(): Promise<string> {
    try {
      const user = await this.callJiraApi('myself');
      return user.accountId;
    } catch (error) {
      throw new Error('Failed to get current user ID');
    }
  }

  /**
   * Fetch all boards for a project
   */
  async fetchBoards(projectKey: string): Promise<JiraBoard[]> {
    try {
      const response = await this.callJiraApi(`board?projectKeyOrId=${projectKey}`);
      return response.values.map((b: any) => ({
        id: b.id,
        name: b.name,
        type: b.type,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if board exists by ID
   */
  async checkBoard(boardId: number): Promise<JiraBoard | null> {
    try {
      const board = await this.callJiraApi(`board/${boardId}`);

      // Fetch board configuration to get project information
      let location: { projectKey?: string; projectId?: string } | undefined;
      try {
        const config = await this.callJiraApi(`board/${boardId}/configuration`);
        if (config.location) {
          location = {
            projectKey: config.location.projectKey,
            projectId: config.location.projectId,
          };
        }
      } catch (error) {
        // Configuration fetch failed, board exists but we don't know which project
        // This is OK for backward compatibility
      }

      return {
        id: board.id,
        name: board.name,
        type: board.type,
        location,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create new Jira board
   */
  async createBoard(boardName: string, projectKey: string): Promise<JiraBoard> {
    console.log(chalk.blue(`📦 Creating Jira board: ${boardName} in project ${projectKey}...`));

    const body = {
      name: boardName,
      type: 'scrum',
      filterId: await this.getOrCreateFilter(projectKey),
      location: {
        type: 'project',
        projectKeyOrId: projectKey,
      },
    };

    try {
      const board = await this.callJiraApi('board', 'POST', body);
      console.log(chalk.green(`✅ Board created: ${boardName} (ID: ${board.id})`));
      return {
        id: board.id,
        name: board.name,
        type: board.type,
      };
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to create board: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get or create filter for board
   */
  private async getOrCreateFilter(projectKey: string): Promise<number> {
    // For simplicity, create a basic filter
    // In production, you might want to check for existing filters first
    const body = {
      name: `${projectKey} Issues`,
      jql: `project = ${projectKey}`,
    };

    try {
      const filter = await this.callJiraApi('filter', 'POST', body);
      return filter.id;
    } catch (error: any) {
      throw new Error(`Failed to create filter: ${error.message}`);
    }
  }

  /**
   * Validate and fix Jira configuration
   */
  async validate(): Promise<JiraValidationResult> {
    console.log(chalk.blue('\n🔍 Validating Jira configuration...\n'));

    const result: JiraValidationResult = {
      valid: true,
      project: { exists: false },
      boards: { valid: true, existing: [], missing: [], created: [] },
      envUpdated: false,
    };

    const env = this.loadEnv();
    const strategy = env.JIRA_STRATEGY || 'project-per-team';

    // Determine project key(s) based on strategy
    let projectKeys: string[] = [];

    if (strategy === 'project-per-team') {
      // Multiple projects (JIRA_PROJECTS is comma-separated)
      const projectsEnv = env.JIRA_PROJECTS || '';
      if (!projectsEnv) {
        console.log(chalk.red('❌ JIRA_PROJECTS not found in .env'));
        result.valid = false;
        return result;
      }
      projectKeys = projectsEnv.split(',').map(p => p.trim()).filter(p => p);
    } else {
      // Single project (component-based or board-based)
      const projectKey = env.JIRA_PROJECT;
      if (!projectKey) {
        console.log(chalk.red('❌ JIRA_PROJECT not found in .env'));
        result.valid = false;
        return result;
      }
      projectKeys = [projectKey];
    }

    // 1. Validate project(s)
    console.log(chalk.gray(`Strategy: ${strategy}`));
    console.log(chalk.gray(`Checking project(s): ${projectKeys.join(', ')}...\n`));

    // NEW: Validate per-project var naming (detect orphaned configs)
    const perProjectBoardVars = Object.keys(env).filter(
      key => key.startsWith('JIRA_BOARDS_')
    );

    for (const varName of perProjectBoardVars) {
      const projectFromVar = varName.split('JIRA_BOARDS_')[1];

      if (!projectKeys.includes(projectFromVar)) {
        console.log(chalk.yellow(`⚠️  Configuration warning: ${varName}`));
        console.log(chalk.gray(`    Project "${projectFromVar}" not found in JIRA_PROJECTS`));
        console.log(chalk.gray(`    Expected projects: ${projectKeys.join(', ')}`));
        console.log(chalk.gray(`    This configuration will be ignored.\n`));
      }
    }

    // Track all validated/created projects (for multi-project IDs)
    const allProjects: Array<{ key: string; id: string; name: string }> = [];

    for (const projectKey of projectKeys) {
      const project = await this.checkProject(projectKey);

      if (!project) {
        console.log(chalk.yellow(`⚠️  Project "${projectKey}" not found\n`));

        // Fetch existing projects
        const existingProjects = await this.fetchProjects();

        // Prompt user
        const action = await select({
          message: `What would you like to do for project "${projectKey}"?`,
          choices: [
            { name: 'Select an existing project', value: 'select' },
            { name: 'Create a new project', value: 'create' },
            { name: 'Skip this project', value: 'skip' },
            { name: 'Cancel validation', value: 'cancel' },
          ],
        });

        if (action === 'cancel') {
          result.valid = false;
          return result;
        }

        if (action === 'skip') {
          console.log(chalk.yellow(`⏭️  Skipped project "${projectKey}"\n`));
          continue;
        }

        if (action === 'select') {
          const selectedProject = await select({
            message: 'Select a project:',
            choices: existingProjects.map((p) => ({
              name: `${p.key} - ${p.name}`,
              value: p.key,
            })),
          });

          // Fetch full project details to get ID
          const selectedProjectDetails = await this.checkProject(selectedProject);
          if (!selectedProjectDetails) {
            console.log(chalk.red(`❌ Failed to fetch details for project "${selectedProject}"\n`));
            continue;
          }

          // Update .env (handle both single and multiple projects)
          if (strategy === 'project-per-team') {
            // Replace this project key in JIRA_PROJECTS
            const updatedKeys = projectKeys.map(k => k === projectKey ? selectedProject : k);
            await this.updateEnv({ JIRA_PROJECTS: updatedKeys.join(',') });
          } else {
            await this.updateEnv({ JIRA_PROJECT: selectedProject });
          }

          // Print link to selected project
          const projectUrl = `https://${this.domain}/jira/software/c/projects/${selectedProject}`;
          console.log(chalk.cyan(`🔗 View in Jira: ${projectUrl}`));

          result.project = {
            exists: true,
            key: selectedProject,
            id: selectedProjectDetails.id,
            name: selectedProjectDetails.name,
          };
          result.envUpdated = true;
          console.log(chalk.green(`✅ Project "${selectedProject}" selected\n`));

          // Track for multi-project ID collection
          allProjects.push({
            key: selectedProject,
            id: selectedProjectDetails.id,
            name: selectedProjectDetails.name,
          });
        } else if (action === 'create') {
          const projectName = await input({
            message: 'Enter project name:',
            default: projectKey,
          });

          const newProject = await this.createProject(projectKey, projectName);

          // Print link to created project
          const projectUrl = `https://${this.domain}/jira/software/c/projects/${newProject.key}`;
          console.log(chalk.cyan(`🔗 View in Jira: ${projectUrl}\n`));

          result.project = {
            exists: true,
            key: newProject.key,
            id: newProject.id,
            name: newProject.name,
          };

          // Track for multi-project ID collection
          allProjects.push({
            key: newProject.key,
            id: newProject.id,
            name: newProject.name,
          });
        }
      } else {
        console.log(chalk.green(`✅ Validated: Project "${projectKey}" exists in Jira`));

        // Print link to validated project
        const projectUrl = `https://${this.domain}/jira/software/c/projects/${project.key}`;
        console.log(chalk.cyan(`🔗 View in Jira: ${projectUrl}`));

        result.project = {
          exists: true,
          key: project.key,
          id: project.id,
          name: project.name,
        };

        // Track for multi-project ID collection
        allProjects.push({
          key: project.key,
          id: project.id,
          name: project.name,
        });
      }
    }

    console.log(); // Empty line after project validation

    // Update .env with project IDs (for multi-project strategy)
    if (strategy === 'project-per-team' && allProjects.length > 0) {
      const projectIds = allProjects.map(p => p.id).join(',');
      await this.updateEnv({ JIRA_PROJECT_IDS: projectIds });
      result.envUpdated = true;
      console.log(chalk.green(`✅ Updated .env with project IDs: ${projectIds}\n`));
    } else if (allProjects.length === 1) {
      // Single project - store both key and ID
      await this.updateEnv({ JIRA_PROJECT_ID: allProjects[0].id });
      result.envUpdated = true;
      console.log(chalk.green(`✅ Updated .env with project ID: ${allProjects[0].id}\n`));
    }

    // 2. Validate boards (per-project OR legacy board-based strategy)
    result.boards = { valid: true, existing: [], missing: [], created: [] };

    // NEW: Check for per-project boards (JIRA_BOARDS_{ProjectKey})
    let hasPerProjectBoards = false;
    for (const projectKey of projectKeys) {
      const perProjectKey = `JIRA_BOARDS_${projectKey}`;
      if (env[perProjectKey]) {
        hasPerProjectBoards = true;
        break;
      }
    }

    if (hasPerProjectBoards) {
      // Per-project boards (NEW!)
      console.log(chalk.gray(`Checking per-project boards...\n`));

      // Track board names to detect conflicts across projects
      const boardNamesSeen = new Map<string, string>(); // name -> project

      for (const projectKey of projectKeys) {
        const perProjectKey = `JIRA_BOARDS_${projectKey}`;
        const boardsConfig = env[perProjectKey];

        if (boardsConfig) {
          const boardEntries = boardsConfig.split(',').map((b) => b.trim()).filter(b => b);

          if (boardEntries.length > 0) {
            console.log(chalk.gray(`  Project: ${projectKey} (${boardEntries.length} boards)`));

            const finalBoardIds: number[] = [];

            for (const entry of boardEntries) {
              const isNumeric = /^\d+$/.test(entry);

              if (isNumeric) {
                // Entry is a board ID - validate it exists AND belongs to this project
                const boardId = parseInt(entry, 10);
                const board = await this.checkBoard(boardId);

                if (board) {
                  // NEW: Validate board belongs to the correct project
                  if (board.location?.projectKey && board.location.projectKey !== projectKey) {
                    console.log(chalk.yellow(`    ⚠️  Board ${boardId}: ${board.name} belongs to project ${board.location.projectKey}, not ${projectKey}`));
                    console.log(chalk.gray(`       Expected: ${projectKey}, Found: ${board.location.projectKey}`));
                    result.boards.missing.push(entry);
                    result.boards.valid = false;
                  } else {
                    // Board exists and belongs to correct project (or project unknown - backward compat)
                    if (board.location?.projectKey) {
                      console.log(chalk.green(`    ✅ Board ${boardId}: ${board.name} (project: ${board.location.projectKey})`));
                    } else {
                      console.log(chalk.green(`    ✅ Board ${boardId}: ${board.name} (project verification skipped)`));
                    }
                    result.boards.existing.push(board.id);
                    finalBoardIds.push(board.id);
                  }
                } else {
                  console.log(chalk.yellow(`    ⚠️  Board ${boardId}: Not found`));
                  result.boards.missing.push(entry);
                  result.boards.valid = false;
                }
              } else {
                // Entry is a board name - check for conflicts, then create it

                // NEW: Detect board name conflicts across projects
                if (boardNamesSeen.has(entry)) {
                  const existingProject = boardNamesSeen.get(entry);
                  console.log(chalk.yellow(`    ⚠️  Board name conflict: "${entry}" already used in project ${existingProject}`));
                  console.log(chalk.gray(`       Tip: Use unique board names or append project suffix (e.g., "${entry}-${projectKey}")`));
                  result.boards.missing.push(entry);
                  result.boards.valid = false;
                } else {
                  console.log(chalk.blue(`    📦 Creating board: ${entry}...`));

                  try {
                    const board = await this.createBoard(entry, projectKey);
                    console.log(chalk.green(`    ✅ Created: ${entry} (ID: ${board.id})`));
                    result.boards.created.push({ name: entry, id: board.id });
                    finalBoardIds.push(board.id);
                    boardNamesSeen.set(entry, projectKey); // Track this board name
                  } catch (error: any) {
                    console.log(chalk.red(`    ❌ Failed to create ${entry}: ${error.message}`));
                    result.boards.missing.push(entry);
                    result.boards.valid = false;
                  }
                }
              }
            }

            // Update .env with final board IDs for this project
            if (finalBoardIds.length > 0) {
              await this.updateEnv({ [perProjectKey]: finalBoardIds.join(',') });
              result.envUpdated = true;
              console.log(chalk.green(`    ✅ Updated ${perProjectKey}: ${finalBoardIds.join(',')}`));
            }
          }
        }
      }

      console.log();
    } else {
      // Legacy: Global boards (backward compatibility)
      const boardsConfig = env.JIRA_BOARDS || '';
      if (boardsConfig && strategy === 'board-based') {
        console.log(chalk.gray(`Checking boards: ${boardsConfig}...`));

        // For board-based strategy, use the single project key
        const projectKeyForBoards = projectKeys[0];

        const boardEntries = boardsConfig.split(',').map((b) => b.trim());
        const finalBoardIds: number[] = [];

        for (const entry of boardEntries) {
          const isNumeric = /^\d+$/.test(entry);

          if (isNumeric) {
            // Entry is a board ID - validate it exists
            const boardId = parseInt(entry, 10);
            const board = await this.checkBoard(boardId);

            if (board) {
              console.log(chalk.green(`  ✅ Board ${boardId}: ${board.name} (exists)`));
              result.boards.existing.push(board.id);
              finalBoardIds.push(board.id);
            } else {
              console.log(chalk.yellow(`  ⚠️  Board ${boardId}: Not found`));
              result.boards.missing.push(entry);
              result.boards.valid = false;
            }
          } else {
            // Entry is a board name - create it
            console.log(chalk.blue(`  📦 Creating board: ${entry}...`));

            try {
              const board = await this.createBoard(entry, projectKeyForBoards);
              console.log(chalk.green(`  ✅ Created: ${entry} (ID: ${board.id})`));
              result.boards.created.push({ name: entry, id: board.id });
              finalBoardIds.push(board.id);
            } catch (error: any) {
              console.log(chalk.red(`  ❌ Failed to create ${entry}: ${error.message}`));
              result.boards.missing.push(entry);
              result.boards.valid = false;
            }
          }
        }

        // Update .env if any boards were created
        if (result.boards.created.length > 0) {
          console.log(chalk.blue('\n📝 Updating .env with board IDs...'));
          await this.updateEnv({ JIRA_BOARDS: finalBoardIds.join(',') });
          result.boards.existing = finalBoardIds;
          result.envUpdated = true;
          console.log(chalk.green(`✅ Updated JIRA_BOARDS: ${finalBoardIds.join(',')}`));
        }

        // Summary
        console.log();
        if (result.boards.missing.length > 0) {
          console.log(
            chalk.yellow(
              `⚠️  Issues found: ${result.boards.missing.length} board(s)\n`
            )
          );
        } else {
          console.log(chalk.green(`✅ All boards validated/created successfully\n`));
        }
      }
    }

    return result;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate Jira resources
 */
export async function validateJiraResources(
  envPath: string = '.env'
): Promise<JiraValidationResult> {
  const validator = new JiraResourceValidator(envPath);
  return validator.validate();
}
