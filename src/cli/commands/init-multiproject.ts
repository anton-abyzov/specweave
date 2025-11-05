/**
 * CLI Command: /specweave:init-multiproject
 *
 * Initialize multi-project mode for SpecWeave
 */

import inquirer from 'inquirer';
import { ProjectManager, ProjectContext } from '../../core/project-manager';
import { ConfigManager } from '../../core/config-manager';
import { autoMigrateSingleToMulti } from './migrate-to-multiproject';
import { autoDetectProjectIdSync, formatProjectName } from '../../utils/project-detection';

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
    const { enableMulti } = await inquirer.prompt([{
      type: 'confirm',
      name: 'enableMulti',
      message: 'Enable multi-project mode? (supports multiple teams/repos)',
      default: false
    }]);

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
    if (!config.multiProject) {
      config.multiProject = {
        enabled: true,
        activeProject: projectId,
        projects: [{
          id: projectId,
          name: config.project?.name || formatProjectName(projectId),
          description: config.project?.description || `${formatProjectName(projectId)} project`,
          techStack: config.project?.techStack || [],
          team: config.project?.team || 'Engineering Team'
        }]
      };
    } else {
      config.multiProject.enabled = true;
    }

    await configManager.save(config);
    console.log('\n✅ Multi-project mode enabled!');

    // 4. Prompt: Create additional projects?
    const { createMore } = await inquirer.prompt([{
      type: 'confirm',
      name: 'createMore',
      message: `Create additional projects? (besides "${projectId}")`,
      default: false
    }]);

    if (createMore) {
      await createAdditionalProjects(projectRoot);
    }

    console.log('\n🎉 Multi-project setup complete!\n');
    console.log('📖 Next steps:');
    console.log('   - Use /specweave:switch-project <id> to change active project');
    console.log('   - Use /specweave:import-docs to import brownfield docs');
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
    const existingIds = existingProjects.map(p => p.id);

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'Project ID (kebab-case):',
        validate: (input: string) => {
          if (!input) return 'Project ID is required';
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Project ID must be kebab-case (lowercase, hyphens only)';
          }
          if (existingIds.includes(input)) {
            return `Project ID "${input}" already exists. Choose a different ID.`;
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        validate: (input: string) => input ? true : 'Project name is required'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: ''
      },
      {
        type: 'input',
        name: 'techStack',
        message: 'Tech stack (comma-separated):',
        default: '',
        filter: (input: string) => input.split(',').map(s => s.trim()).filter(Boolean)
      },
      {
        type: 'input',
        name: 'team',
        message: 'Team name:',
        default: 'Engineering Team'
      },
      {
        type: 'input',
        name: 'leadEmail',
        message: 'Tech lead email (optional):',
        default: ''
      },
      {
        type: 'input',
        name: 'pmEmail',
        message: 'Product manager email (optional):',
        default: ''
      }
    ]);

    // Create project context
    const project: ProjectContext = {
      id: answers.id,
      name: answers.name,
      description: answers.description || '',
      techStack: answers.techStack || [],
      team: answers.team,
      contacts: {
        ...(answers.leadEmail && { lead: answers.leadEmail }),
        ...(answers.pmEmail && { pm: answers.pmEmail })
      }
    };

    try {
      await projectManager.addProject(project);
      console.log(`\n✅ Created project: ${project.name} (${project.id})`);
    } catch (error) {
      console.error(`\n❌ Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    // Prompt to create another
    const { another } = await inquirer.prompt([{
      type: 'confirm',
      name: 'another',
      message: 'Create another project?',
      default: false
    }]);

    createAnother = another;
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
    const isActive = project.id === activeProject.id;
    const marker = isActive ? '→' : ' ';
    console.log(`${marker} ${project.id} - ${project.name}`);
    console.log(`    ${project.description}`);
    console.log(`    Team: ${project.team}`);
    if (project.techStack.length > 0) {
      console.log(`    Tech: ${project.techStack.join(', ')}`);
    }
    console.log('');
  });

  console.log(`Active project: ${activeProject.name} (${activeProject.id})\n`);
}
