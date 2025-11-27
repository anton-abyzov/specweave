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
      teams: [],
      areaPaths: [],
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate Azure DevOps resources
 */
export async function validateAzureDevOpsResources(
  envPath: string = '.env'
): Promise<AzureDevOpsValidationResult> {
  const validator = new AzureDevOpsResourceValidator(envPath);
  return validator.validate();
}
