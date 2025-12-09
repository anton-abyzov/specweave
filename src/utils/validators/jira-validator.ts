/**
 * Jira Resource Validator
 *
 * Validates and creates Jira resources (projects, boards).
 * Split from external-resource-validator.ts for maintainability.
 *
 * NEW (v0.33.0): Reads configuration from config.json (ADR-0050 compliant)
 * - Secrets (API token, email) from .env
 * - Configuration (domain, strategy, projects, boards) from config.json
 *
 * @module utils/validators/jira-validator
 */

import * as fs from '../fs-native.js';
import * as path from 'path';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { JiraProject, JiraBoard, JiraValidationResult } from './types.js';

const execAsync = promisify(exec);

// Re-export types for convenience
export type { JiraProject, JiraBoard, JiraValidationResult };

/**
 * Configuration structure from config.json
 */
interface JiraConfigFromFile {
  issueTracker?: {
    provider?: string;
    domain?: string;
    instanceType?: string;
    strategy?: string;
    projects?: Array<{ key: string; id?: string; name?: string; boards?: Array<{ id: string; name?: string }> }>;
    project?: string;
    components?: string[];
    boards?: Array<{ id: string; name?: string }>;
  };
  sync?: {
    profiles?: Record<string, {
      config?: {
        domain?: string;
        projectKey?: string;
        projects?: string[];
      };
    }>;
  };
}

export class JiraResourceValidator {
  private apiToken: string;
  private email: string;
  private domain: string;
  private envPath: string;
  private projectRoot: string;

  constructor(envPath: string = '.env') {
    this.envPath = envPath;
    // Derive project root from envPath (e.g., '/path/to/project/.env' -> '/path/to/project')
    this.projectRoot = path.dirname(path.resolve(envPath));

    // Load secrets from .env (API token, email)
    const env = this.loadEnv();
    this.apiToken = env.JIRA_API_TOKEN || '';
    this.email = env.JIRA_EMAIL || '';

    // Load domain from config.json (ADR-0050: non-secrets in config.json)
    const config = this.loadConfig();
    this.domain = config.issueTracker?.domain || env.JIRA_DOMAIN || '';
  }

  /**
   * Load .env file (secrets only)
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
   * Load config.json (ADR-0050: non-secrets configuration)
   *
   * NEW (v0.33.0): Configuration is read from config.json, NOT .env
   * This aligns JIRA with ADO init pattern.
   */
  private loadConfig(): JiraConfigFromFile {
    try {
      const configPath = path.join(this.projectRoot, '.specweave', 'config.json');
      if (!fs.existsSync(configPath)) {
        return {};
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as JiraConfigFromFile;
    } catch (error) {
      return {};
    }
  }

  /**
   * Update config.json with new values (for project/board IDs after validation)
   */
  private async updateConfig(updates: Partial<JiraConfigFromFile>): Promise<void> {
    try {
      const configPath = path.join(this.projectRoot, '.specweave', 'config.json');
      let config: JiraConfigFromFile = {};

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(content);
      }

      // Deep merge updates
      if (updates.issueTracker) {
        config.issueTracker = { ...config.issueTracker, ...updates.issueTracker };
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`✅ Updated .specweave/config.json`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to update config.json: ${error.message}`));
      throw error;
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
   *
   * @param endpoint - API endpoint (relative path)
   * @param method - HTTP method (GET, POST, PUT, etc.)
   * @param body - Request body (for POST/PUT)
   * @param apiType - API type: 'rest' for /rest/api/3, 'agile' for /rest/agile/1.0
   */
  private async callJiraApi(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    apiType: 'rest' | 'agile' = 'rest'
  ): Promise<any> {
    // Choose base path based on API type
    const basePath = apiType === 'agile' ? '/rest/agile/1.0' : '/rest/api/3';
    const url = `https://${this.domain}${basePath}/${endpoint}`;
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
   *
   * Uses Agile API: GET /rest/agile/1.0/board?projectKeyOrId={projectKey}
   */
  async fetchBoards(projectKey: string): Promise<JiraBoard[]> {
    try {
      const response = await this.callJiraApi(`board?projectKeyOrId=${projectKey}`, 'GET', undefined, 'agile');
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
   *
   * Uses Agile API: GET /rest/agile/1.0/board/{boardId}
   * Also fetches board configuration to get project information.
   */
  async checkBoard(boardId: number): Promise<JiraBoard | null> {
    try {
      const board = await this.callJiraApi(`board/${boardId}`, 'GET', undefined, 'agile');

      // Fetch board configuration to get project information
      let location: { projectKey?: string; projectId?: string } | undefined;
      try {
        const config = await this.callJiraApi(`board/${boardId}/configuration`, 'GET', undefined, 'agile');
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
   *
   * Uses Agile API: POST /rest/agile/1.0/board
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
      const board = await this.callJiraApi('board', 'POST', body, 'agile');
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
   *
   * NEW (v0.33.0): Reads configuration from config.json (ADR-0050 compliant)
   * - Secrets (API token, email) from .env
   * - Configuration (domain, strategy, projects, boards) from config.json
   *
   * Structure levels:
   * - 1-level: project only (issueTracker.projects[].key)
   * - 2-level: project + boards (issueTracker.projects[].boards[])
   */
  async validate(): Promise<JiraValidationResult> {
    console.log(chalk.blue('\n🔍 Validating Jira configuration...\n'));

    const result: JiraValidationResult = {
      valid: true,
      project: { exists: false },
      boards: { valid: true, existing: [], missing: [], created: [] },
      envUpdated: false,
    };

    // Load configuration from config.json (ADR-0050)
    const config = this.loadConfig();
    const issueTracker = config.issueTracker;

    if (!issueTracker || issueTracker.provider !== 'jira') {
      console.log(chalk.red('❌ Jira not configured in .specweave/config.json'));
      console.log(chalk.gray('   Expected: issueTracker.provider = "jira"'));
      console.log(chalk.gray('   Run: specweave init to configure Jira'));
      result.valid = false;
      return result;
    }

    const strategy = issueTracker.strategy || 'project-per-team';

    // Determine project key(s) from config.json (NOT .env!)
    let projectKeys: string[] = [];

    if (issueTracker.projects && issueTracker.projects.length > 0) {
      // NEW: Read from config.json issueTracker.projects array
      projectKeys = issueTracker.projects.map(p => p.key);
    } else if (issueTracker.project) {
      // Single project (component-based or board-based strategy)
      projectKeys = [issueTracker.project];
    } else {
      // Fallback: Try to read from sync profiles
      const syncProfiles = config.sync?.profiles;
      if (syncProfiles) {
        for (const profile of Object.values(syncProfiles)) {
          if (profile.config?.projects) {
            projectKeys = profile.config.projects;
            break;
          } else if (profile.config?.projectKey) {
            projectKeys = [profile.config.projectKey];
            break;
          }
        }
      }
    }

    if (projectKeys.length === 0) {
      console.log(chalk.red('❌ No Jira projects configured in .specweave/config.json'));
      console.log(chalk.gray('   Expected: issueTracker.projects[].key or issueTracker.project'));
      console.log(chalk.gray('   Run: specweave init to configure Jira projects'));
      result.valid = false;
      return result;
    }

    // 1. Validate project(s)
    console.log(chalk.gray(`Strategy: ${strategy}`));
    console.log(chalk.gray(`Checking project(s): ${projectKeys.join(', ')}...\n`));

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

          // Update config.json (handle both single and multiple projects)
          // ADR-0050: Non-secrets (project keys) go in config.json, not .env
          if (strategy === 'project-per-team') {
            // Replace this project in issueTracker.projects array
            const config = this.loadConfig();
            const existingProjectsList = config.issueTracker?.projects || [];
            const updatedProjects = existingProjectsList.map(p =>
              p.key === projectKey
                ? { ...p, key: selectedProject, id: selectedProjectDetails.id, name: selectedProjectDetails.name }
                : p
            );
            await this.updateConfig({
              issueTracker: { projects: updatedProjects }
            });
          } else {
            // Single project mode - update issueTracker.project
            await this.updateConfig({
              issueTracker: { project: selectedProject }
            });
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

    // Update config.json with project IDs (for multi-project strategy)
    // NOTE: In v0.33.0+, we update config.json, NOT .env (ADR-0050)
    if (allProjects.length > 0) {
      // Update issueTracker.projects with validated IDs
      const updatedProjects = allProjects.map(p => ({
        key: p.key,
        id: p.id,
        name: p.name
      }));

      await this.updateConfig({
        issueTracker: {
          ...issueTracker,
          projects: updatedProjects as any
        }
      });
      result.envUpdated = true; // Renamed but still indicates config was updated
      console.log(chalk.green(`✅ Updated config.json with project IDs\n`));
    }

    // 2. Validate boards (from config.json issueTracker.projects[].boards)
    result.boards = { valid: true, existing: [], missing: [], created: [] };

    // Check if any project has boards configured in config.json
    const projectsWithBoards = issueTracker.projects?.filter(p => p.boards && p.boards.length > 0) || [];
    const hasPerProjectBoards = projectsWithBoards.length > 0;

    // Also check legacy board-based strategy (issueTracker.boards)
    const legacyBoards = issueTracker.boards || [];

    if (hasPerProjectBoards) {
      // Per-project boards from config.json (2-level structure)
      console.log(chalk.gray(`Checking per-project boards...\n`));

      // Track board names to detect conflicts across projects
      const boardNamesSeen = new Map<string, string>(); // name -> project

      for (const projectConfig of issueTracker.projects || []) {
        const projectKey = projectConfig.key;
        const boards = projectConfig.boards || [];

        if (boards.length > 0) {
          console.log(chalk.gray(`  Project: ${projectKey} (${boards.length} boards)`));

          const finalBoardIds: Array<{ id: string; name?: string }> = [];

          for (const boardConfig of boards) {
            const boardIdStr = boardConfig.id;
            const isNumeric = /^\d+$/.test(boardIdStr);

            if (isNumeric) {
              // Entry is a board ID - validate it exists AND belongs to this project
              const boardId = parseInt(boardIdStr, 10);
              const board = await this.checkBoard(boardId);

              if (board) {
                // Validate board belongs to the correct project
                if (board.location?.projectKey && board.location.projectKey !== projectKey) {
                  console.log(chalk.yellow(`    ⚠️  Board ${boardId}: ${board.name} belongs to project ${board.location.projectKey}, not ${projectKey}`));
                  console.log(chalk.gray(`       Expected: ${projectKey}, Found: ${board.location.projectKey}`));
                  result.boards.missing.push(boardIdStr);
                  result.boards.valid = false;
                } else {
                  // Board exists and belongs to correct project
                  if (board.location?.projectKey) {
                    console.log(chalk.green(`    ✅ Board ${boardId}: ${board.name} (project: ${board.location.projectKey})`));
                  } else {
                    console.log(chalk.green(`    ✅ Board ${boardId}: ${board.name} (project verification skipped)`));
                  }
                  result.boards.existing.push(board.id);
                  finalBoardIds.push({ id: String(board.id), name: board.name });
                }
              } else {
                console.log(chalk.yellow(`    ⚠️  Board ${boardId}: Not found`));
                result.boards.missing.push(boardIdStr);
                result.boards.valid = false;
              }
            } else {
              // Entry is a board name - check for conflicts, then create it
              const boardName = boardConfig.name || boardIdStr;

              if (boardNamesSeen.has(boardName)) {
                const existingProject = boardNamesSeen.get(boardName);
                console.log(chalk.yellow(`    ⚠️  Board name conflict: "${boardName}" already used in project ${existingProject}`));
                console.log(chalk.gray(`       Tip: Use unique board names or append project suffix (e.g., "${boardName}-${projectKey}")`));
                result.boards.missing.push(boardName);
                result.boards.valid = false;
              } else {
                console.log(chalk.blue(`    📦 Creating board: ${boardName}...`));

                try {
                  const board = await this.createBoard(boardName, projectKey);
                  console.log(chalk.green(`    ✅ Created: ${boardName} (ID: ${board.id})`));
                  result.boards.created.push({ name: boardName, id: board.id });
                  finalBoardIds.push({ id: String(board.id), name: board.name });
                  boardNamesSeen.set(boardName, projectKey);
                } catch (error: any) {
                  console.log(chalk.red(`    ❌ Failed to create ${boardName}: ${error.message}`));
                  result.boards.missing.push(boardName);
                  result.boards.valid = false;
                }
              }
            }
          }

          // Update config.json with validated board IDs
          if (finalBoardIds.length > 0) {
            const currentConfig = this.loadConfig();
            const updatedProjects = (currentConfig.issueTracker?.projects || []).map(p => {
              if (p.key === projectKey) {
                return { ...p, boards: finalBoardIds };
              }
              return p;
            });

            await this.updateConfig({
              issueTracker: {
                ...currentConfig.issueTracker,
                projects: updatedProjects as any
              }
            });
            result.envUpdated = true;
            console.log(chalk.green(`    ✅ Updated config.json with board IDs for ${projectKey}`));
          }
        }
      }

      console.log();
    } else if (legacyBoards.length > 0 && strategy === 'board-based') {
      // Legacy: Global boards from config.json (backward compatibility)
      console.log(chalk.gray(`Checking boards: ${legacyBoards.map(b => b.id).join(', ')}...`));

      // For board-based strategy, use the single project key
      const projectKeyForBoards = projectKeys[0];

      const finalBoardIds: Array<{ id: string; name?: string }> = [];

      for (const boardConfig of legacyBoards) {
        const boardIdStr = boardConfig.id;
        const isNumeric = /^\d+$/.test(boardIdStr);

        if (isNumeric) {
          // Entry is a board ID - validate it exists
          const boardId = parseInt(boardIdStr, 10);
          const board = await this.checkBoard(boardId);

          if (board) {
            console.log(chalk.green(`  ✅ Board ${boardId}: ${board.name} (exists)`));
            result.boards.existing.push(board.id);
            finalBoardIds.push({ id: String(board.id), name: board.name });
          } else {
            console.log(chalk.yellow(`  ⚠️  Board ${boardId}: Not found`));
            result.boards.missing.push(boardIdStr);
            result.boards.valid = false;
          }
        } else {
          // Entry is a board name - create it
          const boardName = boardConfig.name || boardIdStr;
          console.log(chalk.blue(`  📦 Creating board: ${boardName}...`));

          try {
            const board = await this.createBoard(boardName, projectKeyForBoards);
            console.log(chalk.green(`  ✅ Created: ${boardName} (ID: ${board.id})`));
            result.boards.created.push({ name: boardName, id: board.id });
            finalBoardIds.push({ id: String(board.id), name: board.name });
          } catch (error: any) {
            console.log(chalk.red(`  ❌ Failed to create ${boardName}: ${error.message}`));
            result.boards.missing.push(boardName);
            result.boards.valid = false;
          }
        }
      }

      // Update config.json if any boards were validated/created
      if (finalBoardIds.length > 0) {
        console.log(chalk.blue('\n📝 Updating config.json with board IDs...'));
        await this.updateConfig({
          issueTracker: {
            ...issueTracker,
            boards: finalBoardIds
          }
        });
        result.boards.existing = finalBoardIds.map(b => parseInt(b.id, 10));
        result.envUpdated = true;
        console.log(chalk.green(`✅ Updated issueTracker.boards in config.json`));
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
