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
      return {
        id: board.id,
        name: board.name,
        type: board.type,
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

          // Update .env (handle both single and multiple projects)
          if (strategy === 'project-per-team') {
            // Replace this project key in JIRA_PROJECTS
            const updatedKeys = projectKeys.map(k => k === projectKey ? selectedProject : k);
            await this.updateEnv({ JIRA_PROJECTS: updatedKeys.join(',') });
          } else {
            await this.updateEnv({ JIRA_PROJECT: selectedProject });
          }
          result.project = { exists: true, key: selectedProject };
          result.envUpdated = true;
          console.log(chalk.green(`✅ Project "${selectedProject}" selected\n`));
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
          result.project = {
            exists: true,
            key: newProject.key,
            id: newProject.id,
            name: newProject.name,
          };
        }
      } else {
        console.log(chalk.green(`✅ Validated: Project "${projectKey}" exists in Jira`));
        result.project = {
          exists: true,
          key: project.key,
          id: project.id,
          name: project.name,
        };
      }
    }

    console.log(); // Empty line after project validation

    // 2. Validate boards (smart per-board detection)
    // Boards only apply to board-based strategy
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
