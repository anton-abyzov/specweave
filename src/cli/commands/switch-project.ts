import { ConfigManager } from '../../core/config/config-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import prompts from 'prompts';
import chalk from 'chalk';

interface SwitchProjectOptions {
  logger?: Logger;
  projectRoot?: string;
  projectId?: string; // For non-interactive mode
}

export async function switchProject(
  options: SwitchProjectOptions = {}
): Promise<{ success: boolean; message: string }> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();
  const configManager = new ConfigManager({ projectRoot, logger });

  try {
    // Load current config
    const config = await configManager.read();

    // Check if multi-project mode is enabled
    if (config.multiProject?.enabled !== true) {
      logger.log(chalk.yellow('\n⚠️  Multi-project mode is not enabled.\n'));
      logger.log('This repository is in single-project mode.');
      logger.log('To enable multi-project mode, run:\n');
      logger.log(chalk.cyan('  /specweave:enable-multiproject\n'));
      return {
        success: false,
        message: 'Multi-project mode not enabled. Run /specweave:enable-multiproject first.'
      };
    }

    const projects = config.multiProject.projects || {};
    const projectIds = Object.keys(projects);

    // Validate projects exist
    if (projectIds.length === 0) {
      return {
        success: false,
        message: 'No projects found in configuration.'
      };
    }

    // If project ID provided, validate and switch directly
    if (options.projectId) {
      const targetProjectId = options.projectId;

      if (!projects[targetProjectId]) {
        logger.log(chalk.red(`\n❌ Project "${targetProjectId}" not found.\n`));
        logger.log('Available projects:');
        projectIds.forEach(id => {
          logger.log(`  • ${id}`);
        });
        return {
          success: false,
          message: `Project "${targetProjectId}" not found.`
        };
      }

      // Update active project
      config.multiProject.activeProject = targetProjectId;
      await configManager.write(config);

      logger.log(chalk.green(`\n✅ Switched to: ${targetProjectId}\n`));
      return {
        success: true,
        message: `Switched to project: ${targetProjectId}`
      };
    }

    // Interactive mode - show current and list available
    const currentProject = config.multiProject.activeProject;

    logger.log(chalk.cyan('\n📂 Switch Project\n'));
    logger.log(`Current project: ${chalk.bold(currentProject || '(none)')}\n`);

    // Build choices for prompts
    const choices = projectIds.map(id => ({
      title: id === currentProject ? `${id} ${chalk.gray('(current)')}` : id,
      value: id,
      description: projects[id].description || projects[id].name
    }));

    const response = await prompts({
      type: 'select',
      name: 'projectId',
      message: 'Select project:',
      choices,
      initial: currentProject ? projectIds.indexOf(currentProject) : 0
    });

    // User cancelled
    if (!response.projectId) {
      return {
        success: false,
        message: 'Operation cancelled by user.'
      };
    }

    // Same project selected
    if (response.projectId === currentProject) {
      logger.log(chalk.gray('\nAlready using this project.\n'));
      return {
        success: true,
        message: 'No change - already using selected project.'
      };
    }

    // Update active project
    config.multiProject.activeProject = response.projectId;
    await configManager.write(config);

    logger.log(chalk.green(`\n✅ Switched to: ${response.projectId}\n`));
    logger.log('New increments will now target this project.');
    logger.log(chalk.gray('Existing increments remain in their original projects.\n'));

    return {
      success: true,
      message: `Switched to project: ${response.projectId}`
    };
  } catch (error) {
    logger.error('Failed to switch project:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
