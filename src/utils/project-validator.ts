/**
 * Project Configuration Validator
 *
 * Validates that project contexts are properly configured
 * before GitHub sync setup.
 */

import * as fs from '../utils/fs-native.js';
import path from 'path';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';

export interface ProjectValidationResult {
  valid: boolean;
  hasProjects: boolean;
  projectCount: number;
  projects: string[];
}

/**
 * Validate project configuration exists
 *
 * @param projectPath - Path to project directory
 * @returns Validation result
 */
export async function validateProjectConfiguration(
  projectPath: string
): Promise<ProjectValidationResult> {
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  // Check config file exists
  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      hasProjects: false,
      projectCount: 0,
      projects: []
    };
  }

  try {
    const config = await fs.readJson(configPath);

    // Check if projects are configured
    const hasProjects = !!(config.sync?.projects && Object.keys(config.sync.projects).length > 0);
    const projects = hasProjects ? Object.keys(config.sync.projects) : [];

    return {
      valid: hasProjects,
      hasProjects,
      projectCount: projects.length,
      projects
    };
  } catch (error) {
    // Invalid JSON or read error
    return {
      valid: false,
      hasProjects: false,
      projectCount: 0,
      projects: []
    };
  }
}

/**
 * Prompt user to create project context if missing
 *
 * @param projectPath - Path to project directory
 * @returns True if user wants to create project now
 */
export async function promptCreateProject(projectPath: string): Promise<boolean> {
  console.log(chalk.yellow('\n⚠️  No projects configured!'));
  console.log(chalk.gray('   Project contexts organize specs and increments by team/service'));
  console.log(chalk.gray('   GitHub sync requires at least one project context\n'));

  const createProject = await confirm({
    message: 'Create a project context now?',
    default: true
  });

  return createProject;
}
