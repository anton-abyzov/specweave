/**
 * Azure DevOps Resource Validator
 * 
 * Validates and creates Azure DevOps resources (projects, teams, area paths).
 * Split from external-resource-validator.ts for maintainability.
 * 
 * @module utils/validators/ado-validator
 */

import * as fs from '../fs-native.js';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { 
  AzureDevOpsProject, 
  AzureDevOpsTeam, 
  AzureDevOpsAreaPath, 
  AzureDevOpsValidationResult 
} from './types.js';

const execAsync = promisify(exec);

// Re-export types for convenience
export type { AzureDevOpsProject, AzureDevOpsTeam, AzureDevOpsAreaPath, AzureDevOpsValidationResult };

export class AzureDevOpsResourceValidator {
  private pat: string;
  private organization: string;
  private project: string;
  private projects: string[]; // Multi-project support
  private strategy: string;
  private teams: string[];
  private areaPaths: string[];
  private envPath: string;
  private configPath: string;

  // NOTE: readOnly option removed - validation is ALWAYS read-only now (no create operations)
  constructor(envPath: string = '.env', _options: { readOnly?: boolean } = {}) {
    this.envPath = envPath;
    // Derive config.json path from .env path
    const envDir = envPath.replace(/\.env$/, '');
    this.configPath = envDir ? `${envDir}.specweave/config.json` : '.specweave/config.json';

    // Load PAT from .env (secret)
    const env = this.loadEnv();
    this.pat = env.AZURE_DEVOPS_PAT || env.ADO_PAT || '';

    // Load config from config.json (non-secrets)
    const config = this.loadConfig();
    this.organization = config.organization || env.AZURE_DEVOPS_ORG || '';
    this.project = config.project || '';
    this.projects = config.projects || []; // Multi-project support
    this.strategy = config.strategy || 'area-path-based';
    this.teams = config.teams || [];
    this.areaPaths = config.areaPaths || [];
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
   * Load config from .specweave/config.json
   */
  private loadConfig(): { organization?: string; project?: string; projects?: string[]; strategy?: string; teams?: string[]; areaPaths?: string[] } {
    try {
      if (!fs.existsSync(this.configPath)) {
        return {};
      }

      const content = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(content);

      // Find ADO profile in sync.profiles
      const profiles = config.sync?.profiles || {};
      const adoProfile = Object.values(profiles).find(
        (p: any) => p.provider === 'ado'
      ) as any;

      if (adoProfile?.config) {
        return {
          organization: adoProfile.config.organization,
          project: adoProfile.config.project,
          projects: adoProfile.config.projects, // Multi-project support
          strategy: adoProfile.config.strategy,
          teams: adoProfile.config.teams,
          areaPaths: adoProfile.config.areaPaths
        };
      }

      return {};
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
   * Check if area path exists in project (GET-only, no create)
   *
   * @param projectName - Project name
   * @param areaPath - Full area path (e.g., "MyProject\\Platform-Engineering") or leaf name
   * @returns Area path info if exists, null otherwise
   */
  async checkAreaPathExists(projectName: string, areaPath: string): Promise<AzureDevOpsAreaPath | null> {
    // Extract leaf name if full path is provided (handles "MyProject\Platform-Engineering" -> "Platform-Engineering")
    const leafName = areaPath.includes('\\') ? areaPath.split('\\').pop()! : areaPath;

    try {
      // Fetch all area paths for the project
      const response = await this.callAzureDevOpsApi(
        `wit/classificationnodes/areas/${encodeURIComponent(projectName)}?$depth=10&api-version=7.0`
      );

      // Search for matching area path in the tree
      const findAreaPath = (node: any, searchName: string): any => {
        if (node.name === searchName) {
          return node;
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findAreaPath(child, searchName);
            if (found) return found;
          }
        }
        return null;
      };

      const found = findAreaPath(response, leafName);
      if (found) {
        return {
          id: found.id,
          name: found.name,
          path: found.path,
        };
      }

      return null;
    } catch (error: any) {
      // API error - treat as not found
      return null;
    }
  }

  /**
   * Create area path in project (kept for backwards compatibility, but not used in validation)
   * @deprecated Use checkAreaPathExists() for validation instead
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

    // Use class properties loaded from config.json (constructor already loaded them)
    const strategy = this.strategy as any;

    const result: AzureDevOpsValidationResult = {
      valid: true,
      strategy,
      projects: [],
      teams: [],
      areaPaths: [],
      envUpdated: false,
    };

    // Validate PAT is present (only secret in .env)
    if (!this.pat) {
      console.log(chalk.red('❌ AZURE_DEVOPS_PAT not found in .env'));
      result.valid = false;
      return result;
    }

    // Validate organization is present (from config.json)
    if (!this.organization) {
      console.log(chalk.red('❌ Azure DevOps organization not found in config.json'));
      console.log(chalk.gray('   Expected in: .specweave/config.json → sync.profiles.*.config.organization'));
      result.valid = false;
      return result;
    }

    // Determine project names based on strategy (from config.json)
    let projectNames: string[] = [];

    // Multi-project support: use projects array if available
    if (this.projects && this.projects.length > 0) {
      projectNames = this.projects;
    } else if (this.project) {
      // Fallback to single project
      projectNames = [this.project];
    } else {
      console.log(chalk.red('❌ Azure DevOps project not found in config.json'));
      console.log(chalk.gray('   Expected in: .specweave/config.json → sync.profiles.*.config.project or projects'));
      result.valid = false;
      return result;
    }

    console.log(chalk.gray(`Strategy: ${strategy}`));
    console.log(chalk.gray(`Checking project(s): ${projectNames.join(', ')}...\n`));

    // 1. Validate projects
    for (const projectName of projectNames) {
      const project = await this.checkProject(projectName);

      if (!project) {
        console.log(chalk.yellow(`⚠️  Project "${projectName}" not found\n`));

        // Fetch existing projects
        const existingProjects = await this.fetchProjects();

        // Prompt user
        const action = await select({
          message: `What would you like to do for project "${projectName}"?`,
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
          console.log(chalk.yellow(`⏭️  Skipped project "${projectName}"\n`));
          result.projects.push({ name: projectName, exists: false, created: false });
          continue;
        }

        if (action === 'select') {
          const selectedProject = await select({
            message: 'Select a project:',
            choices: existingProjects.map((p) => ({
              name: `${p.name}${p.description ? ` - ${p.description}` : ''}`,
              value: p.name,
            })),
          });

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
          const description = await input({
            message: 'Enter project description (optional):',
            default: `${projectName} project`,
          });

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

    // 2. Validate area paths (from config.json) - ALWAYS read-only, never create
    result.areaPaths = [];

    if (this.areaPaths.length > 0) {
      console.log(chalk.gray(`Validating area paths...`));

      // For multi-project, validate area paths against their respective projects
      for (const projectName of projectNames) {
        for (const areaPath of this.areaPaths) {
          // Extract leaf name for display (handles full paths like "MyProject\Platform-Engineering")
          const leafName = areaPath.includes('\\') ? areaPath.split('\\').pop()! : areaPath;

          // Skip area paths that don't belong to this project
          // (full path starts with different project name)
          if (areaPath.includes('\\') && !areaPath.startsWith(projectName)) {
            continue;
          }

          const existingArea = await this.checkAreaPathExists(projectName, areaPath);

          // Display path: don't show "Project\Project" for root area paths
          const displayPath = leafName === projectName ? projectName : `${projectName}\\${leafName}`;

          if (existingArea) {
            console.log(chalk.green(`  ✅ Area path exists: ${displayPath}`));
            result.areaPaths.push({ name: leafName, exists: true, created: false });
          } else {
            // For root area paths (leafName === projectName), the root always exists
            // This is a validation edge case - root area path = project name
            if (leafName === projectName) {
              console.log(chalk.green(`  ✅ Area path exists: ${displayPath} (root)`));
              result.areaPaths.push({ name: leafName, exists: true, created: false });
            } else {
              console.log(chalk.yellow(`  ⚠️  Area path not found: ${displayPath}`));
              console.log(chalk.gray(`      This area path was selected but doesn't exist in ADO.`));
              console.log(chalk.gray(`      Items may be imported to _default folder instead.`));
              // Don't mark as invalid - just warn. User may have selected incorrectly.
              result.areaPaths.push({ name: leafName, exists: false, created: false });
            }
          }
        }
      }

      console.log();
    }

    // 3. Validate teams (from config.json) - read-only validation only
    // NOTE: Teams are being deprecated from init flow. This section kept for backwards compatibility.
    result.teams = [];

    if (this.teams.length > 0) {
      console.log(chalk.gray(`Validating teams...`));

      const projectName = projectNames[0]; // Single project for now
      const existingTeams = await this.fetchTeams(projectName);

      for (const teamName of this.teams) {
        const team = existingTeams.find(t => t.name === teamName);

        if (team) {
          console.log(chalk.green(`  ✅ Team exists: ${teamName}`));
          result.teams.push({ name: teamName, id: team.id, exists: true, created: false });
        } else {
          console.log(chalk.yellow(`  ⚠️  Team not found: ${teamName}`));
          result.teams.push({ name: teamName, exists: false, created: false });
        }
      }

      console.log();
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate Azure DevOps resources
 *
 * @param envPath - Path to .env file
 * @param options - Validation options
 * @param options.readOnly - If true, skip all create operations (for read-only permissions)
 */
export async function validateAzureDevOpsResources(
  envPath: string = '.env',
  options?: { readOnly?: boolean }
): Promise<AzureDevOpsValidationResult> {
  const validator = new AzureDevOpsResourceValidator(envPath, options);
  return validator.validate();
}
