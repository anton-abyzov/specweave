/**
 * External Resource Validator
 *
 * Validates and creates external resources (Jira projects, boards, etc.)
 * Smart enough to:
 * - Check if resources exist
 * - Prompt user to select existing or create new
 * - Create missing resources automatically
 * - Update .env with actual IDs after creation
 *
 * @module utils/external-resource-validator
 * @since 0.9.5
 */

import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: {
    projectKey?: string;
    projectId?: string;
  };
}

export interface JiraValidationResult {
  valid: boolean;
  project: {
    exists: boolean;
    key?: string;
    id?: string;
    name?: string;
  };
  boards: {
    valid: boolean;
    existing: number[];
    missing: string[];
    created: Array<{ name: string; id: number }>;
  };
  envUpdated: boolean;
}

// ============================================================================
// Jira Resource Validator
// ============================================================================

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
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: `What would you like to do for project "${projectKey}"?`,
            choices: [
              { name: 'Select an existing project', value: 'select' },
              { name: 'Create a new project', value: 'create' },
              { name: 'Skip this project', value: 'skip' },
              { name: 'Cancel validation', value: 'cancel' },
            ],
          },
        ]);

        if (action === 'cancel') {
          result.valid = false;
          return result;
        }

        if (action === 'skip') {
          console.log(chalk.yellow(`⏭️  Skipped project "${projectKey}"\n`));
          continue;
        }

        if (action === 'select') {
          const { selectedProject } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProject',
              message: 'Select a project:',
              choices: existingProjects.map((p) => ({
                name: `${p.key} - ${p.name}`,
                value: p.key,
              })),
            },
          ]);

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
          const { projectName } = await inquirer.prompt([
            {
              type: 'input',
              name: 'projectName',
              message: 'Enter project name:',
              default: projectKey,
            },
          ]);

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
// Azure DevOps Resource Validator
// ============================================================================

export interface AzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
}

export interface AzureDevOpsTeam {
  id: string;
  name: string;
  description?: string;
}

export interface AzureDevOpsAreaPath {
  id: number;
  name: string;
  path: string;
}

export interface AzureDevOpsValidationResult {
  valid: boolean;
  strategy: 'project-per-team' | 'area-path-based' | 'team-based';
  projects: Array<{
    name: string;
    id?: string;
    exists: boolean;
    created: boolean;
  }>;
  areaPaths?: Array<{
    name: string;
    id?: number;
    project?: string; // NEW: Per-project area paths
    exists: boolean;
    created: boolean;
  }>;
  teams?: Array<{
    name: string;
    id?: string;
    project?: string; // NEW: Per-project teams
    exists: boolean;
    created: boolean;
  }>;
  envUpdated: boolean;
}

export class AzureDevOpsResourceValidator {
  private pat: string;
  private organization: string;
  private envPath: string;

  constructor(envPath: string = '.env') {
    this.envPath = envPath;
    // Load from .env
    const env = this.loadEnv();
    this.pat = env.AZURE_DEVOPS_PAT || '';
    this.organization = env.AZURE_DEVOPS_ORG || '';
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
   * Call Azure DevOps API
   */
  private async callAzureDevOpsApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const url = `https://dev.azure.com/${this.organization}/_apis/${endpoint}`;
    const auth = Buffer.from(`:${this.pat}`).toString('base64');

    const curlCommand = `curl -s -f -X ${method} \
      -H "Authorization: Basic ${auth}" \
      -H "Content-Type: application/json" \
      ${body ? `-d '${JSON.stringify(body)}'` : ''} \
      "${url}"`;

    try {
      const { stdout } = await execAsync(curlCommand);
      const response = JSON.parse(stdout);

      // Check for error response
      if (response.message || response.errorMessage) {
        throw new Error(response.message || response.errorMessage);
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
   * Fetch all Azure DevOps projects
   */
  async fetchProjects(): Promise<AzureDevOpsProject[]> {
    try {
      const response = await this.callAzureDevOpsApi('projects?api-version=7.0');
      return response.value.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if project exists
   */
  async checkProject(projectName: string): Promise<AzureDevOpsProject | null> {
    try {
      const project = await this.callAzureDevOpsApi(`projects/${encodeURIComponent(projectName)}?api-version=7.0`);
      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create new Azure DevOps project
   */
  async createProject(projectName: string, description: string = ''): Promise<AzureDevOpsProject> {
    console.log(chalk.blue(`📦 Creating Azure DevOps project: ${projectName}...`));

    const body = {
      name: projectName,
      description: description || `${projectName} project`,
      capabilities: {
        versioncontrol: {
          sourceControlType: 'Git'
        },
        processTemplate: {
          templateTypeId: 'adcc42ab-9882-485e-a3ed-7678f01f66bc' // Agile process template
        }
      }
    };

    try {
      const project = await this.callAzureDevOpsApi('projects?api-version=7.0', 'POST', body);

      // Wait for project creation to complete (ADO creates projects asynchronously)
      await this.waitForProjectCreation(project.id);

      console.log(chalk.green(`✅ Project created: ${projectName} (ID: ${project.id})`));
      return {
        id: project.id,
        name: projectName,
        description: description,
      };
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to create project: ${error.message}`));
      throw error;
    }
  }

  /**
   * Wait for project creation to complete
   */
  private async waitForProjectCreation(projectId: string, maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const operation = await this.callAzureDevOpsApi(`operations/${projectId}?api-version=7.0`);
        if (operation.status === 'succeeded') {
          return;
        }
        if (operation.status === 'failed') {
          throw new Error('Project creation failed');
        }
        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Operation might not exist yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    // Project creation timeout is not fatal - it might still succeed
    console.log(chalk.yellow('⚠️  Project creation may still be in progress'));
  }

  /**
   * Create area path in project
   */
  async createAreaPath(projectName: string, areaName: string): Promise<AzureDevOpsAreaPath> {
    console.log(chalk.blue(`  📦 Creating area path: ${projectName}\\${areaName}...`));

    const body = {
      name: areaName
    };

    try {
      const area = await this.callAzureDevOpsApi(
        `wit/classificationnodes/areas?projectId=${encodeURIComponent(projectName)}&api-version=7.0`,
        'POST',
        body
      );
      console.log(chalk.green(`  ✅ Area path created: ${projectName}\\${areaName}`));
      return {
        id: area.id,
        name: area.name,
        path: area.path,
      };
    } catch (error: any) {
      console.error(chalk.red(`  ❌ Failed to create area path: ${error.message}`));
      throw error;
    }
  }

  /**
   * Fetch teams in project
   */
  async fetchTeams(projectName: string): Promise<AzureDevOpsTeam[]> {
    try {
      const response = await this.callAzureDevOpsApi(
        `projects/${encodeURIComponent(projectName)}/teams?api-version=7.0`
      );
      return response.value.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Create team in project
   */
  async createTeam(projectName: string, teamName: string): Promise<AzureDevOpsTeam> {
    console.log(chalk.blue(`  📦 Creating team: ${teamName}...`));

    const body = {
      name: teamName,
      description: `${teamName} development team`
    };

    try {
      const team = await this.callAzureDevOpsApi(
        `projects/${encodeURIComponent(projectName)}/teams?api-version=7.0`,
        'POST',
        body
      );
      console.log(chalk.green(`  ✅ Team created: ${teamName}`));
      return {
        id: team.id,
        name: team.name,
        description: team.description || '',
      };
    } catch (error: any) {
      console.error(chalk.red(`  ❌ Failed to create team: ${error.message}`));
      throw error;
    }
  }

  /**
   * Validate and fix Azure DevOps configuration
   */
  async validate(): Promise<AzureDevOpsValidationResult> {
    console.log(chalk.blue('\n🔍 Validating Azure DevOps configuration...\n'));

    const env = this.loadEnv();
    const strategy = (env.AZURE_DEVOPS_STRATEGY || 'project-per-team') as any;

    const result: AzureDevOpsValidationResult = {
      valid: true,
      strategy,
      projects: [],
      envUpdated: false,
    };

    // Determine project names based on strategy
    let projectNames: string[] = [];

    if (strategy === 'project-per-team') {
      // Multiple projects
      const projectsEnv = env.AZURE_DEVOPS_PROJECTS || '';
      if (!projectsEnv) {
        console.log(chalk.red('❌ AZURE_DEVOPS_PROJECTS not found in .env'));
        result.valid = false;
        return result;
      }
      projectNames = projectsEnv.split(',').map(p => p.trim()).filter(p => p);
    } else {
      // Single project (area-path-based or team-based)
      const projectName = env.AZURE_DEVOPS_PROJECT;
      if (!projectName) {
        console.log(chalk.red('❌ AZURE_DEVOPS_PROJECT not found in .env'));
        result.valid = false;
        return result;
      }
      projectNames = [projectName];
    }

    console.log(chalk.gray(`Strategy: ${strategy}`));
    console.log(chalk.gray(`Checking project(s): ${projectNames.join(', ')}...\n`));

    // NEW: Validate per-project var naming (detect orphaned configs)
    const perProjectVars = Object.keys(env).filter(
      key => key.startsWith('AZURE_DEVOPS_AREA_PATHS_') || key.startsWith('AZURE_DEVOPS_TEAMS_')
    );

    for (const varName of perProjectVars) {
      const projectFromVar = varName.includes('_AREA_PATHS_')
        ? varName.split('_AREA_PATHS_')[1]
        : varName.split('_TEAMS_')[1];

      if (!projectNames.includes(projectFromVar)) {
        console.log(chalk.yellow(`⚠️  Configuration warning: ${varName}`));
        console.log(chalk.gray(`    Project "${projectFromVar}" not found in AZURE_DEVOPS_PROJECTS`));
        console.log(chalk.gray(`    Expected projects: ${projectNames.join(', ')}`));
        console.log(chalk.gray(`    This configuration will be ignored.\n`));
      }
    }

    // 1. Validate projects
    for (const projectName of projectNames) {
      const project = await this.checkProject(projectName);

      if (!project) {
        console.log(chalk.yellow(`⚠️  Project "${projectName}" not found\n`));

        // Fetch existing projects
        const existingProjects = await this.fetchProjects();

        // Prompt user
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: `What would you like to do for project "${projectName}"?`,
            choices: [
              { name: 'Select an existing project', value: 'select' },
              { name: 'Create a new project', value: 'create' },
              { name: 'Skip this project', value: 'skip' },
              { name: 'Cancel validation', value: 'cancel' },
            ],
          },
        ]);

        if (action === 'cancel') {
          result.valid = false;
          return result;
        }

        if (action === 'skip') {
          console.log(chalk.yellow(`⏭️  Skipped project "${projectName}"\n`));
          result.projects.push({ name: projectName, exists: false, created: false });
          continue;
        }

        if (action === 'select') {
          const { selectedProject } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProject',
              message: 'Select a project:',
              choices: existingProjects.map((p) => ({
                name: `${p.name}${p.description ? ` - ${p.description}` : ''}`,
                value: p.name,
              })),
            },
          ]);

          // Fetch full project details
          const selectedProjectDetails = await this.checkProject(selectedProject);
          if (!selectedProjectDetails) {
            console.log(chalk.red(`❌ Failed to fetch details for project "${selectedProject}"\n`));
            continue;
          }

          // Update .env
          if (strategy === 'project-per-team') {
            const updatedNames = projectNames.map(n => n === projectName ? selectedProject : n);
            await this.updateEnv({ AZURE_DEVOPS_PROJECTS: updatedNames.join(',') });
          } else {
            await this.updateEnv({ AZURE_DEVOPS_PROJECT: selectedProject });
          }

          const projectUrl = `https://dev.azure.com/${this.organization}/${encodeURIComponent(selectedProject)}`;
          console.log(chalk.cyan(`🔗 View in Azure DevOps: ${projectUrl}`));
          console.log(chalk.green(`✅ Project "${selectedProject}" selected\n`));

          result.projects.push({
            name: selectedProject,
            id: selectedProjectDetails.id,
            exists: true,
            created: false,
          });
          result.envUpdated = true;
        } else if (action === 'create') {
          const { description } = await inquirer.prompt([
            {
              type: 'input',
              name: 'description',
              message: 'Enter project description (optional):',
              default: `${projectName} project`,
            },
          ]);

          const newProject = await this.createProject(projectName, description);

          const projectUrl = `https://dev.azure.com/${this.organization}/${encodeURIComponent(newProject.name)}`;
          console.log(chalk.cyan(`🔗 View in Azure DevOps: ${projectUrl}\n`));

          result.projects.push({
            name: newProject.name,
            id: newProject.id,
            exists: true,
            created: true,
          });
        }
      } else {
        console.log(chalk.green(`✅ Validated: Project "${projectName}" exists`));

        const projectUrl = `https://dev.azure.com/${this.organization}/${encodeURIComponent(project.name)}`;
        console.log(chalk.cyan(`🔗 View in Azure DevOps: ${projectUrl}`));

        result.projects.push({
          name: project.name,
          id: project.id,
          exists: true,
          created: false,
        });
      }
    }

    console.log(); // Empty line after project validation

    // 2. Validate area paths (per-project OR legacy area-path-based strategy)
    result.areaPaths = [];

    // NEW: Check for per-project area paths (AZURE_DEVOPS_AREA_PATHS_{ProjectName})
    let hasPerProjectAreaPaths = false;
    for (const projectName of projectNames) {
      const perProjectKey = `AZURE_DEVOPS_AREA_PATHS_${projectName}`;
      if (env[perProjectKey]) {
        hasPerProjectAreaPaths = true;
        break;
      }
    }

    if (hasPerProjectAreaPaths) {
      // Per-project area paths (NEW!)
      console.log(chalk.gray(`Checking per-project area paths...\n`));

      for (const projectName of projectNames) {
        const perProjectKey = `AZURE_DEVOPS_AREA_PATHS_${projectName}`;
        const areaPathsConfig = env[perProjectKey];

        if (areaPathsConfig) {
          const areaNames = areaPathsConfig.split(',').map(a => a.trim()).filter(a => a);

          if (areaNames.length > 0) {
            console.log(chalk.gray(`  Project: ${projectName} (${areaNames.length} area paths)`));

            for (const areaName of areaNames) {
              try {
                await this.createAreaPath(projectName, areaName);
                result.areaPaths.push({
                  name: areaName,
                  project: projectName,
                  exists: false,
                  created: true
                });
              } catch (error: any) {
                if (error.message.includes('already exists')) {
                  console.log(chalk.green(`    ✅ Area path exists: ${projectName}\\${areaName}`));
                  result.areaPaths.push({
                    name: areaName,
                    project: projectName,
                    exists: true,
                    created: false
                  });
                } else {
                  console.log(chalk.red(`    ❌ Failed to create/validate area path: ${areaName}`));
                  result.valid = false;
                }
              }
            }
          }
        }
      }

      console.log();
    } else if (strategy === 'area-path-based') {
      // Legacy: Global area paths (backward compatibility)
      const areaPathsConfig = env.AZURE_DEVOPS_AREA_PATHS || '';
      if (areaPathsConfig) {
        console.log(chalk.gray(`Checking area paths...`));

        const projectName = projectNames[0]; // Single project for area-path-based
        const areaNames = areaPathsConfig.split(',').map(a => a.trim());

        for (const areaName of areaNames) {
          // Check if area path exists (simplified - would need proper API call)
          // For now, we'll create them if they don't exist
          try {
            await this.createAreaPath(projectName, areaName);
            result.areaPaths.push({ name: areaName, exists: false, created: true });
          } catch (error: any) {
            if (error.message.includes('already exists')) {
              console.log(chalk.green(`  ✅ Area path exists: ${projectName}\\${areaName}`));
              result.areaPaths.push({ name: areaName, exists: true, created: false });
            } else {
              console.log(chalk.red(`  ❌ Failed to create/validate area path: ${areaName}`));
              result.valid = false;
            }
          }
        }

        console.log();
      }
    }

    // 3. Validate teams (per-project OR legacy team-based strategy)
    result.teams = [];

    // NEW: Check for per-project teams (AZURE_DEVOPS_TEAMS_{ProjectName})
    let hasPerProjectTeams = false;
    for (const projectName of projectNames) {
      const perProjectKey = `AZURE_DEVOPS_TEAMS_${projectName}`;
      if (env[perProjectKey]) {
        hasPerProjectTeams = true;
        break;
      }
    }

    if (hasPerProjectTeams) {
      // Per-project teams (NEW!)
      console.log(chalk.gray(`Checking per-project teams...\n`));

      for (const projectName of projectNames) {
        const perProjectKey = `AZURE_DEVOPS_TEAMS_${projectName}`;
        const teamsConfig = env[perProjectKey];

        if (teamsConfig) {
          const teamNames = teamsConfig.split(',').map(t => t.trim()).filter(t => t);

          if (teamNames.length > 0) {
            console.log(chalk.gray(`  Project: ${projectName} (${teamNames.length} teams)`));

            const existingTeams = await this.fetchTeams(projectName);

            for (const teamName of teamNames) {
              const team = existingTeams.find(t => t.name === teamName);

              if (team) {
                console.log(chalk.green(`    ✅ Team exists: ${teamName}`));
                result.teams.push({
                  name: teamName,
                  id: team.id,
                  project: projectName,
                  exists: true,
                  created: false
                });
              } else {
                try {
                  const newTeam = await this.createTeam(projectName, teamName);
                  result.teams.push({
                    name: teamName,
                    id: newTeam.id,
                    project: projectName,
                    exists: false,
                    created: true
                  });
                } catch (error: any) {
                  console.log(chalk.red(`    ❌ Failed to create team: ${teamName}`));
                  result.valid = false;
                }
              }
            }
          }
        }
      }

      console.log();
    } else if (strategy === 'team-based') {
      // Legacy: Global teams (backward compatibility)
      const teamsConfig = env.AZURE_DEVOPS_TEAMS || '';
      if (teamsConfig) {
        console.log(chalk.gray(`Checking teams...`));

        const projectName = projectNames[0]; // Single project for team-based
        const teamNames = teamsConfig.split(',').map(t => t.trim());
        const existingTeams = await this.fetchTeams(projectName);

        for (const teamName of teamNames) {
          const team = existingTeams.find(t => t.name === teamName);

          if (team) {
            console.log(chalk.green(`  ✅ Team exists: ${teamName}`));
            result.teams.push({ name: teamName, id: team.id, exists: true, created: false });
          } else {
            try {
              const newTeam = await this.createTeam(projectName, teamName);
              result.teams.push({ name: teamName, id: newTeam.id, exists: false, created: true });
            } catch (error: any) {
              console.log(chalk.red(`  ❌ Failed to create team: ${teamName}`));
              result.valid = false;
            }
          }
        }

        console.log();
      }
    }

    // Summary
    if (result.valid) {
      console.log(chalk.green(`✅ Azure DevOps configuration validated successfully\n`));
    } else {
      console.log(chalk.yellow(`⚠️  Some resources could not be validated\n`));
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

/**
 * Validate Azure DevOps resources
 */
export async function validateAzureDevOpsResources(
  envPath: string = '.env'
): Promise<AzureDevOpsValidationResult> {
  const validator = new AzureDevOpsResourceValidator(envPath);
  return validator.validate();
}
