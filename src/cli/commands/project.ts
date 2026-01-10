/**
 * Project CLI Commands
 *
 * Commands for managing the project registry:
 * - list: List all projects with sync status
 * - add: Add a new project
 * - remove: Remove a project
 * - sync: Force sync to external tools
 * - show: Show project details
 * - discover: Discover projects from external tools
 * - import: Import a discovered project
 */

import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { ProjectRegistry } from '../../core/project/project-registry.js';
import { Project, ProjectSyncStatus } from '../../core/project/types/project-types.js';
import { GitHubProjectAdapter } from '../../core/project/adapters/github-project-adapter.js';
import { ADOProjectAdapter } from '../../core/project/adapters/ado-project-adapter.js';
import { JiraProjectAdapter } from '../../core/project/adapters/jira-project-adapter.js';

// NOTE: This CLI command is primarily user-facing output (console.log).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md.

export interface ProjectCommandOptions {
  logger?: Logger;
  projectRoot?: string;
}

/**
 * List all projects with their sync status
 */
export async function projectListCommand(options: ProjectCommandOptions = {}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();

  try {
    const registry = new ProjectRegistry(projectRoot, { logger });
    const projects = await registry.listProjects();
    const defaultProject = await registry.getDefaultProject();

    if (projects.length === 0) {
      console.log(chalk.yellow('\n⚠ No projects in registry'));
      console.log(chalk.gray('  Run: specweave project add <id> --name "Project Name"'));
      return;
    }

    console.log(chalk.blue.bold('\n📦 Project Registry\n'));

    // Table header
    console.log(
      chalk.gray(
        '  ' +
          'ID'.padEnd(25) +
          'Name'.padEnd(25) +
          'Tech Stack'.padEnd(20) +
          'Sync Status'
      )
    );
    console.log(chalk.gray('  ' + '─'.repeat(90)));

    for (const project of projects) {
      const syncStatus = await registry.getSyncStatus(project.id);
      const isDefault = defaultProject?.id === project.id;

      const idColumn = (isDefault ? '★ ' : '  ') + project.id;
      const nameColumn = project.name.substring(0, 22);
      const techColumn = (project.techStack || []).slice(0, 2).join(', ').substring(0, 17);
      const statusColumn = formatSyncStatus(syncStatus);

      console.log(
        '  ' +
          chalk.cyan(idColumn.padEnd(25)) +
          chalk.white(nameColumn.padEnd(25)) +
          chalk.gray(techColumn.padEnd(20)) +
          statusColumn
      );
    }

    console.log(chalk.gray('\n  ' + '─'.repeat(90)));
    console.log(chalk.gray(`  Total: ${projects.length} project(s)`));
    if (defaultProject) {
      console.log(chalk.gray(`  Default: ${defaultProject.id}`));
    }
    console.log('');
  } catch (error) {
    logger.error(`Failed to list projects: ${error}`);
    console.log(chalk.red(`\n✗ Error: ${error}`));
  }
}

/**
 * Add a new project to the registry
 */
export async function projectAddCommand(
  id: string,
  commandOptions: {
    name?: string;
    description?: string;
    techStack?: string;
    team?: string;
    github?: boolean;
    ado?: boolean;
    jira?: boolean;
    default?: boolean;
  },
  options: ProjectCommandOptions = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();

  try {
    const registry = new ProjectRegistry(projectRoot, { logger });

    // Check if project already exists
    if (await registry.hasProject(id)) {
      console.log(chalk.red(`\n✗ Project '${id}' already exists`));
      return;
    }

    const project: Project = {
      id,
      name: commandOptions.name || id,
      description: commandOptions.description,
      techStack: commandOptions.techStack?.split(',').map((s) => s.trim()),
      team: commandOptions.team,
      created: new Date().toISOString(),
    };

    await registry.addProject(project, {
      setAsDefault: commandOptions.default,
    });

    console.log(chalk.green(`\n✓ Added project: ${id}`));

    if (commandOptions.name) {
      console.log(chalk.gray(`  Name: ${commandOptions.name}`));
    }
    if (commandOptions.techStack) {
      console.log(chalk.gray(`  Tech Stack: ${commandOptions.techStack}`));
    }
    if (commandOptions.default) {
      console.log(chalk.gray(`  Set as default project`));
    }

    // Note about sync
    if (commandOptions.github || commandOptions.ado || commandOptions.jira) {
      console.log(chalk.yellow('\n  Note: Sync adapters need to be configured separately'));
      console.log(chalk.gray('  Run: specweave project sync ' + id));
    }

    console.log('');
  } catch (error) {
    logger.error(`Failed to add project: ${error}`);
    console.log(chalk.red(`\n✗ Error: ${error}`));
  }
}

/**
 * Remove a project from the registry
 */
export async function projectRemoveCommand(
  id: string,
  commandOptions: {
    force?: boolean;
    yes?: boolean;
  },
  options: ProjectCommandOptions = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();

  try {
    const registry = new ProjectRegistry(projectRoot, { logger });

    const project = await registry.getProject(id);
    if (!project) {
      console.log(chalk.red(`\n✗ Project '${id}' not found`));
      return;
    }

    // Confirmation warning
    if (!commandOptions.yes) {
      console.log(chalk.yellow(`\n⚠ About to remove project: ${id}`));
      console.log(chalk.gray(`  Name: ${project.name}`));
      if (project.external) {
        console.log(chalk.gray('  External mappings will be archived, not deleted'));
      }
      console.log(chalk.yellow('\n  Run with --yes to confirm'));
      return;
    }

    await registry.removeProject(id, { force: commandOptions.force });

    console.log(chalk.green(`\n✓ Removed project: ${id}`));
    console.log('');
  } catch (error) {
    logger.error(`Failed to remove project: ${error}`);
    console.log(chalk.red(`\n✗ Error: ${error}`));
  }
}

/**
 * Force sync project(s) to external tools
 */
export async function projectSyncCommand(
  id?: string,
  commandOptions: {
    github?: boolean;
    ado?: boolean;
    jira?: boolean;
  } = {},
  options: ProjectCommandOptions = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();

  try {
    const registry = new ProjectRegistry(projectRoot, { logger });

    // Determine targets
    const targets: ('github' | 'ado' | 'jira')[] = [];
    if (commandOptions.github) targets.push('github');
    if (commandOptions.ado) targets.push('ado');
    if (commandOptions.jira) targets.push('jira');

    // If no targets specified, sync all
    if (targets.length === 0) {
      targets.push('github', 'ado', 'jira');
    }

    if (id) {
      const project = await registry.getProject(id);
      if (!project) {
        console.log(chalk.red(`\n✗ Project '${id}' not found`));
        return;
      }
      console.log(chalk.blue(`\n🔄 Syncing project: ${id}`));
    } else {
      console.log(chalk.blue('\n🔄 Syncing all projects'));
    }

    console.log(chalk.gray(`  Targets: ${targets.join(', ')}`));

    await registry.requestSync(id, targets);

    console.log(chalk.green('\n✓ Sync requested'));
    console.log(chalk.gray('  Note: Adapters must be subscribed to process sync events'));
    console.log('');
  } catch (error) {
    logger.error(`Failed to sync project: ${error}`);
    console.log(chalk.red(`\n✗ Error: ${error}`));
  }
}

/**
 * Show project details
 */
export async function projectShowCommand(
  id: string,
  options: ProjectCommandOptions = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();

  try {
    const registry = new ProjectRegistry(projectRoot, { logger });

    const project = await registry.getProject(id);
    if (!project) {
      console.log(chalk.red(`\n✗ Project '${id}' not found`));
      return;
    }

    const defaultProject = await registry.getDefaultProject();
    const isDefault = defaultProject?.id === id;
    const syncStatus = await registry.getSyncStatus(id);

    console.log(chalk.blue.bold(`\n📦 Project: ${project.name}`));
    console.log('');

    // Basic info
    console.log(chalk.cyan('  Basic Information'));
    console.log(chalk.gray('  ─────────────────'));
    console.log(`  ID:          ${chalk.white(project.id)}${isDefault ? chalk.yellow(' (default)') : ''}`);
    console.log(`  Name:        ${chalk.white(project.name)}`);
    if (project.description) {
      console.log(`  Description: ${chalk.gray(project.description)}`);
    }
    if (project.team) {
      console.log(`  Team:        ${chalk.white(project.team)}`);
    }
    if (project.techStack && project.techStack.length > 0) {
      console.log(`  Tech Stack:  ${chalk.white(project.techStack.join(', '))}`);
    }
    if (project.keywords && project.keywords.length > 0) {
      console.log(`  Keywords:    ${chalk.gray(project.keywords.join(', '))}`);
    }
    console.log(`  Created:     ${chalk.gray(formatDate(project.created))}`);
    if (project.updated) {
      console.log(`  Updated:     ${chalk.gray(formatDate(project.updated))}`);
    }

    // External mappings
    if (project.external) {
      console.log('');
      console.log(chalk.cyan('  External Mappings'));
      console.log(chalk.gray('  ─────────────────'));

      if (project.external.github) {
        const gh = project.external.github;
        const status = gh.syncError ? chalk.red('✗ Error') : chalk.green('✓ Synced');
        console.log(`  GitHub:      ${chalk.white(gh.labelName)} ${status}`);
        if (gh.lastSynced) {
          console.log(`               Last sync: ${chalk.gray(formatDate(gh.lastSynced))}`);
        }
        if (gh.syncError) {
          console.log(`               ${chalk.red(gh.syncError)}`);
        }
      }

      if (project.external.ado) {
        const ado = project.external.ado;
        const status = ado.syncError ? chalk.red('✗ Error') : chalk.green('✓ Synced');
        console.log(`  ADO:         ${chalk.white(ado.areaPath)} ${status}`);
        if (ado.lastSynced) {
          console.log(`               Last sync: ${chalk.gray(formatDate(ado.lastSynced))}`);
        }
        if (ado.syncError) {
          console.log(`               ${chalk.red(ado.syncError)}`);
        }
      }

      if (project.external.jira) {
        const jira = project.external.jira;
        const status = jira.syncError ? chalk.red('✗ Error') : chalk.green('✓ Synced');
        console.log(`  JIRA:        ${chalk.white(jira.projectKey)} ${status}`);
        if (jira.lastSynced) {
          console.log(`               Last sync: ${chalk.gray(formatDate(jira.lastSynced))}`);
        }
        if (jira.syncError) {
          console.log(`               ${chalk.red(jira.syncError)}`);
        }
      }
    }

    // Sync status summary
    if (syncStatus && syncStatus.tools.length > 0) {
      console.log('');
      console.log(chalk.cyan('  Sync Status'));
      console.log(chalk.gray('  ─────────────────'));
      console.log(`  Overall:     ${formatOverallStatus(syncStatus.overallStatus)}`);
    }

    console.log('');
  } catch (error) {
    logger.error(`Failed to show project: ${error}`);
    console.log(chalk.red(`\n✗ Error: ${error}`));
  }
}

// ============================================
// Helper Functions
// ============================================

function formatSyncStatus(status: ProjectSyncStatus | null): string {
  if (!status || status.tools.length === 0) {
    return chalk.gray('No sync');
  }

  const icons: string[] = [];

  for (const tool of status.tools) {
    if (tool.status === 'synced') {
      icons.push(chalk.green('✓'));
    } else if (tool.status === 'error') {
      icons.push(chalk.red('✗'));
    } else {
      icons.push(chalk.gray('○'));
    }
  }

  return icons.join(' ');
}

function formatOverallStatus(status: ProjectSyncStatus['overallStatus']): string {
  const statusMap: Record<string, string> = {
    synced: chalk.green('All synced'),
    partial: chalk.yellow('Partially synced'),
    error: chalk.red('Sync errors'),
  };
  return statusMap[status] || chalk.gray('Never synced');
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString();
  } catch {
    return isoDate;
  }
}

// ============================================
// Discovery Commands
// ============================================

/**
 * Discover projects from external tools
 *
 * Scans GitHub labels, ADO area paths, or JIRA projects
 * to find existing project mappings.
 */
export async function projectDiscoverCommand(
  commandOptions: {
    github?: boolean;
    ado?: boolean;
    jira?: boolean;
  } = {},
  options: ProjectCommandOptions = {}
): Promise<Partial<Project>[]> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();

  const discovered: Partial<Project>[] = [];

  try {
    // Determine which tools to discover from
    const discoverGitHub = commandOptions.github || (!commandOptions.ado && !commandOptions.jira);
    const discoverADO = commandOptions.ado || (!commandOptions.github && !commandOptions.jira);
    const discoverJira = commandOptions.jira || (!commandOptions.github && !commandOptions.ado);

    console.log(chalk.blue.bold('\n🔍 Discovering Projects\n'));

    // GitHub discovery
    if (discoverGitHub) {
      console.log(chalk.cyan('  Scanning GitHub labels...'));
      try {
        const ghAdapter = new GitHubProjectAdapter({ logger });
        const ghProjects = await ghAdapter.discoverProjects();

        if (ghProjects.length > 0) {
          console.log(chalk.green(`  ✓ Found ${ghProjects.length} GitHub project label(s)`));
          for (const p of ghProjects) {
            console.log(chalk.gray(`    - ${p.id} (label: project:${p.id})`));
            discovered.push(p);
          }
        } else {
          console.log(chalk.gray('  No GitHub project labels found'));
        }
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ GitHub discovery failed: ${error}`));
      }
    }

    // ADO discovery
    if (discoverADO) {
      console.log(chalk.cyan('  Scanning ADO area paths...'));
      try {
        const adoAdapter = new ADOProjectAdapter({
          logger,
          organization: process.env.AZURE_DEVOPS_ORG || '',
          project: process.env.AZURE_DEVOPS_PROJECT || '',
        });
        const adoProjects = await adoAdapter.discoverProjects();

        if (adoProjects.length > 0) {
          console.log(chalk.green(`  ✓ Found ${adoProjects.length} ADO area path(s)`));
          for (const p of adoProjects) {
            console.log(chalk.gray(`    - ${p.id} (area: ${p.external?.ado?.areaPath})`));
            // Avoid duplicates
            if (!discovered.find((d) => d.id === p.id)) {
              discovered.push(p);
            }
          }
        } else {
          console.log(chalk.gray('  No ADO area paths found'));
        }
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ ADO discovery failed: ${error}`));
      }
    }

    // JIRA discovery
    if (discoverJira) {
      console.log(chalk.cyan('  Scanning JIRA projects...'));
      try {
        const jiraAdapter = new JiraProjectAdapter({
          logger,
          domain: process.env.JIRA_DOMAIN || '',
        });
        const jiraProjects = await jiraAdapter.discoverProjects();

        if (jiraProjects.length > 0) {
          console.log(chalk.green(`  ✓ Found ${jiraProjects.length} JIRA project(s)`));
          for (const p of jiraProjects) {
            console.log(chalk.gray(`    - ${p.id} (key: ${p.external?.jira?.projectKey})`));
            // Avoid duplicates
            if (!discovered.find((d) => d.id === p.id)) {
              discovered.push(p);
            }
          }
        } else {
          console.log(chalk.gray('  No JIRA projects found'));
        }
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ JIRA discovery failed: ${error}`));
      }
    }

    // Summary
    console.log('');
    console.log(chalk.gray('  ─'.repeat(40)));

    if (discovered.length === 0) {
      console.log(chalk.yellow('\n  No projects discovered'));
      console.log(chalk.gray('  Make sure external tool credentials are configured'));
    } else {
      console.log(chalk.green(`\n  Total discovered: ${discovered.length} project(s)`));
      console.log(chalk.gray('  Run: specweave project import <id> to add to registry'));
    }

    console.log('');
    return discovered;
  } catch (error) {
    logger.error(`Failed to discover projects: ${error}`);
    console.log(chalk.red(`\n✗ Error: ${error}`));
    return [];
  }
}

/**
 * Import a discovered project into the registry
 *
 * Takes project ID and optional source (github/ado/jira)
 * to import with correct external mappings.
 */
export async function projectImportCommand(
  id: string,
  commandOptions: {
    name?: string;
    source?: 'github' | 'ado' | 'jira';
    default?: boolean;
  } = {},
  options: ProjectCommandOptions = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();

  try {
    const registry = new ProjectRegistry(projectRoot, { logger });

    // Check if project already exists
    if (await registry.hasProject(id)) {
      console.log(chalk.yellow(`\n⚠ Project '${id}' already exists in registry`));
      console.log(chalk.gray('  Use: specweave project show ' + id));
      return;
    }

    // Try to get project data from external tool
    let externalData: Partial<Project> | null = null;

    if (commandOptions.source === 'github' || !commandOptions.source) {
      try {
        const ghAdapter = new GitHubProjectAdapter({ logger });
        const ghProjects = await ghAdapter.discoverProjects();
        externalData = ghProjects.find((p) => p.id === id) || null;
      } catch {
        // GitHub discovery failed, continue
      }
    }

    if (!externalData && (commandOptions.source === 'jira' || !commandOptions.source)) {
      try {
        const jiraAdapter = new JiraProjectAdapter({
          logger,
          domain: process.env.JIRA_DOMAIN || '',
        });
        const jiraProjects = await jiraAdapter.discoverProjects();
        externalData = jiraProjects.find((p) => p.id === id) || null;
      } catch {
        // JIRA discovery failed, continue
      }
    }

    if (!externalData && (commandOptions.source === 'ado' || !commandOptions.source)) {
      try {
        const adoAdapter = new ADOProjectAdapter({
          logger,
          organization: process.env.AZURE_DEVOPS_ORG || '',
          project: process.env.AZURE_DEVOPS_PROJECT || '',
        });
        const adoProjects = await adoAdapter.discoverProjects();
        externalData = adoProjects.find((p) => p.id === id) || null;
      } catch {
        // ADO discovery failed, continue
      }
    }

    // Create project with discovered or default data
    const project: Project = {
      id,
      name: commandOptions.name || externalData?.name || id,
      description: externalData?.description,
      techStack: externalData?.techStack,
      external: externalData?.external,
      created: new Date().toISOString(),
    };

    await registry.addProject(project, {
      setAsDefault: commandOptions.default,
    });

    console.log(chalk.green(`\n✓ Imported project: ${id}`));
    console.log(chalk.gray(`  Name: ${project.name}`));

    if (project.external?.github) {
      console.log(chalk.gray(`  GitHub: project:${id}`));
    }
    if (project.external?.ado) {
      console.log(chalk.gray(`  ADO: ${project.external.ado.areaPath}`));
    }
    if (project.external?.jira) {
      console.log(chalk.gray(`  JIRA: ${project.external.jira.projectKey}`));
    }

    if (commandOptions.default) {
      console.log(chalk.gray('  Set as default project'));
    }

    console.log('');
  } catch (error) {
    logger.error(`Failed to import project: ${error}`);
    console.log(chalk.red(`\n✗ Error: ${error}`));
  }
}
