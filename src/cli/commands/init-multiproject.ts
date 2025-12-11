/**
 * CLI Command: /sw:init-multiproject
 *
 * Initialize multi-project mode for SpecWeave
 */

import { confirm, input } from '@inquirer/prompts';
import path from 'path';
import { ProjectManager, ProjectContext } from '../../core/project/project-manager.js';
import { ConfigManager } from '../../core/config-manager.js';
import { autoMigrateSingleToMulti } from './migrate-to-multiproject.js';
import { autoDetectProjectIdSync, formatProjectName } from '../../utils/project-detection.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CLI multi-project initialization command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (migration progress, project setup, user prompts).
// Logger infrastructure available for future internal debug logs if needed.

export async function initMultiProject(projectRoot: string): Promise<void> {
  console.log('\n🚀 Initialize Multi-Project Mode\n');

  try {
    // 1. Auto-migrate to new structure (idempotent - safe to run multiple times)
    console.log('📁 Step 1: Auto-migrating to multi-project structure...\n');
    const migrationResult = await autoMigrateSingleToMulti(projectRoot);

    if (migrationResult.errors.length > 0) {
      console.error('\n❌ Migration errors:');
      migrationResult.errors.forEach(error => console.error(`  - ${error}`));
      return;
    }

    if (migrationResult.warnings.length > 0) {
      console.warn('\n⚠️  Migration warnings:');
      migrationResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    console.log('');

    // 2. Prompt: Enable multi-project mode?
    const enableMulti = await confirm({
      message: 'Enable multi-project mode? (supports multiple teams/repos)',
      default: false
    });

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.load();

    // Auto-detect project ID
    const projectId = autoDetectProjectIdSync(projectRoot);

    if (!enableMulti) {
      console.log('\n✅ Staying in single-project mode');
      console.log(`   Using projects/${projectId}/ structure (transparent to you)`);
      console.log('   All operations work the same way\n');
      return;
    }

    // 3. Enable multi-project mode
    // NOTE (v0.33.0): activeProject REMOVED - per-US project targeting replaces it
    if (!config.multiProject) {
      config.multiProject = {
        enabled: true,
        projects: {
          [projectId]: {
            id: projectId,
            name: config.project?.name || formatProjectName(projectId),
            description: config.project?.description || `${formatProjectName(projectId)} project`,
            techStack: config.project?.techStack || [],
            team: config.project?.team || 'Engineering Team'
          }
        }
      };
    } else {
      config.multiProject.enabled = true;
    }

    await configManager.save(config);
    console.log('\n✅ Multi-project mode enabled!');

    // 4. Prompt: Create additional projects?
    const createMore = await confirm({
      message: `Create additional projects? (besides "${projectId}")`,
      default: false
    });

    if (createMore) {
      await createAdditionalProjects(projectRoot);
    }

    console.log('\n🎉 Multi-project setup complete!\n');
    console.log('📖 Next steps:');
    console.log('   - Use /sw:switch-project <id> to change active project');
    console.log('   - Use /sw:import-docs to import brownfield docs');
    console.log('   - Create increments as usual - they\'ll use the active project\n');

  } catch (error) {
    console.error(`\n❌ Failed to initialize multi-project mode: ${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}

/**
 * Create additional projects interactively
 */
async function createAdditionalProjects(projectRoot: string): Promise<void> {
  const projectManager = new ProjectManager(projectRoot);
  const configManager = new ConfigManager(projectRoot);

  let createAnother = true;

  while (createAnother) {
    console.log('\n📝 Create New Project\n');

    // Get existing project IDs to prevent duplicates
    const existingProjects = projectManager.getAllProjects();
    const existingIds = existingProjects.map(p => p.projectId);

    const projectIdAnswer = await input({
      message: 'Project ID (kebab-case):',
      validate: (val: string) => {
        if (!val) return 'Project ID is required';
        if (!/^[a-z0-9-]+$/.test(val)) {
          return 'Project ID must be kebab-case (lowercase, hyphens only)';
        }
        if (existingIds.includes(val)) {
          return `Project ID "${val}" already exists. Choose a different ID.`;
        }
        return true;
      }
    });

    const projectNameAnswer = await input({
      message: 'Project name:',
      validate: (val: string) => val ? true : 'Project name is required'
    });

    const descriptionAnswer = await input({
      message: 'Description:',
      default: ''
    });

    const techStackAnswer = await input({
      message: 'Tech stack (comma-separated):',
      default: ''
    });

    const teamAnswer = await input({
      message: 'Team name:',
      default: 'Engineering Team'
    });

    const leadEmailAnswer = await input({
      message: 'Tech lead email (optional):',
      default: ''
    });

    const pmEmailAnswer = await input({
      message: 'Product manager email (optional):',
      default: ''
    });

    const answers = {
      id: projectIdAnswer,
      name: projectNameAnswer,
      description: descriptionAnswer,
      techStack: techStackAnswer.split(',').map(s => s.trim()).filter(Boolean),
      team: teamAnswer,
      leadEmail: leadEmailAnswer,
      pmEmail: pmEmailAnswer
    };

    // Create project context
    const project: ProjectContext = {
      projectId: answers.id,
      projectName: answers.name,
      projectPath: path.join(projectRoot, '.specweave/docs/internal/specs', answers.id),
      keywords: [],
      techStack: answers.techStack || []
    };

    try {
      await projectManager.addProject(project);
      console.log(`\n✅ Created project: ${project.projectName} (${project.projectId})`);
    } catch (error) {
      console.error(`\n❌ Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    // Prompt to create another
    createAnother = await confirm({
      message: 'Create another project?',
      default: false
    });
  }
}

/**
 * List all projects
 */
export async function listProjects(projectRoot: string): Promise<void> {
  const projectManager = new ProjectManager(projectRoot);
  const projects = projectManager.getAllProjects();
  const activeProject = projectManager.getActiveProject();

  console.log('\n📋 Projects:\n');

  projects.forEach(project => {
    const isActive = project.projectId === activeProject.projectId;
    const marker = isActive ? '→' : ' ';
    console.log(`${marker} ${project.projectId} - ${project.projectName}`);
    console.log(`    ${project.projectName} project`);
    console.log(`    Team: Engineering Team`);
    if (project.techStack.length > 0) {
      console.log(`    Tech: ${project.techStack.join(', ')}`);
    }
    console.log('');
  });

  console.log(`Active project: ${activeProject.projectName} (${activeProject.projectId})\n`);
}
