/**
 * CLI Command: /specweave:switch-project
 *
 * Switch active project for increment planning
 */

import inquirer from 'inquirer';
import { ProjectManager } from '../../core/project-manager';
import { ConfigManager } from '../../core/config-manager';
import { listProjects } from './init-multiproject';

export async function switchProject(
  projectRoot: string,
  projectId?: string
): Promise<void> {
  const projectManager = new ProjectManager(projectRoot);
  const configManager = new ConfigManager(projectRoot);
  const config = configManager.load();

  // Check if multi-project mode is enabled
  if (!config.multiProject?.enabled) {
    console.error('\n❌ Multi-project mode not enabled');
    console.error('   Run /specweave:init-multiproject first\n');
    return;
  }

  // If no project ID provided, list projects and prompt
  if (!projectId) {
    await listProjects(projectRoot);
    console.log('Usage: /specweave:switch-project <project-id>\n');
    return;
  }

  try {
    // Validate project exists
    const project = projectManager.getProjectById(projectId);
    if (!project) {
      const allProjects = projectManager.getAllProjects();
      const availableIds = allProjects.map(p => p.projectId).join(', ');

      console.error(`\n❌ Project '${projectId}' not found`);
      console.error(`   Available projects: ${availableIds}\n`);
      return;
    }

    // Check if already active
    const currentActive = projectManager.getActiveProject();
    if (currentActive.projectId === projectId) {
      console.log(`\nℹ️  Project '${project.projectName}' is already active\n`);
      return;
    }

    // Switch project
    await projectManager.switchProject(projectId);

    console.log(`\n✅ Switched to project: ${project.projectName} (${projectId})`);
    console.log('\nℹ️  Future increments will use:');
    console.log(`   - ${projectManager.getSpecsPath(projectId).replace(projectRoot, '')}`);
    console.log(`   - ${projectManager.getModulesPath(projectId).replace(projectRoot, '')}`);
    console.log(`   - ${projectManager.getTeamPath(projectId).replace(projectRoot, '')}\n`);

  } catch (error) {
    console.error(`\n❌ Failed to switch project: ${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}

/**
 * Get current active project
 *
 * @param projectRoot - Project root directory
 */
export async function getCurrentProject(projectRoot: string): Promise<void> {
  const projectManager = new ProjectManager(projectRoot);
  const project = projectManager.getActiveProject();

  console.log('\n📋 Current Active Project:\n');
  console.log(`  ID: ${project.projectId}`);
  console.log(`  Name: ${project.projectName}`);
  console.log(`  Path: ${project.projectPath}`);

  if (project.techStack.length > 0) {
    console.log(`  Tech Stack: ${project.techStack.join(', ')}`);
  }

  if (project.keywords.length > 0) {
    console.log(`  Keywords: ${project.keywords.join(', ')}`);
  }

  console.log('');
}
