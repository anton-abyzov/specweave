import { ConfigManager } from '../../core/config/config-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import prompts from 'prompts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import matter from 'gray-matter';

interface EnableMultiProjectOptions {
  logger?: Logger;
  projectRoot?: string;
  skipConfirmation?: boolean;
}

/**
 * Update existing increments with project field in spec.md frontmatter
 */
async function updateExistingIncrements(
  projectRoot: string,
  projectId: string,
  logger: Logger
): Promise<{ updated: number; skipped: number; errors: number }> {
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const entries = await fs.readdir(incrementsDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip non-directories and special folders
      if (!entry.isDirectory() || entry.name.startsWith('_')) {
        continue;
      }

      const specPath = path.join(incrementsDir, entry.name, 'spec.md');

      try {
        // Check if spec.md exists
        await fs.access(specPath);
      } catch {
        // No spec.md, skip
        skipped++;
        continue;
      }

      try {
        // Read spec.md
        const content = await fs.readFile(specPath, 'utf-8');

        // Parse frontmatter
        const parsed = matter(content);

        // Skip if project field already exists
        if (parsed.data.project) {
          skipped++;
          continue;
        }

        // Add project field
        parsed.data.project = projectId;

        // Regenerate content with updated frontmatter
        const updatedContent = matter.stringify(parsed.content, parsed.data);

        // Write back to file
        await fs.writeFile(specPath, updatedContent, 'utf-8');

        updated++;
        logger.debug(`  ✓ Updated ${entry.name}/spec.md`);
      } catch (error) {
        errors++;
        logger.error(`  ✗ Failed to update ${entry.name}/spec.md:`, error);
      }
    }
  } catch (error) {
    logger.error('Failed to scan increments directory:', error);
  }

  return { updated, skipped, errors };
}

export async function enableMultiProject(
  options: EnableMultiProjectOptions = {}
): Promise<{ success: boolean; message: string }> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();
  const configManager = new ConfigManager({ projectRoot, logger });

  try {
    // Load current config
    const config = await configManager.read();

    // Check if already in multi-project mode
    if (config.multiProject?.enabled === true) {
      return {
        success: false,
        message: 'Multi-project mode is already enabled.'
      };
    }

    // Get current project data
    const currentProject = config.project;
    if (!currentProject?.name) {
      return {
        success: false,
        message: 'No project found in config. Run specweave init first.'
      };
    }

    // Show confirmation prompt unless skipped
    if (!options.skipConfirmation) {
      logger.log(chalk.yellow('\n⚠️  Multi-Project Mode\n'));
      logger.log('You are about to enable multi-project mode. This is a significant change:\n');
      logger.log(chalk.cyan('Current setup (single-project):'));
      logger.log(`  • One project: "${currentProject.name}"`);
      logger.log('  • All increments go to same folder');
      logger.log('  • Simple, focused workflow\n');
      logger.log(chalk.cyan('After enabling (multi-project):'));
      logger.log('  • Multiple projects supported');
      logger.log('  • Increments require project: field');
      logger.log('  • More complex, but scales better\n');

      const response = await prompts({
        type: 'confirm',
        name: 'continue',
        message: 'Continue?',
        initial: false
      });

      if (!response.continue) {
        return {
          success: false,
          message: 'Operation cancelled by user.'
        };
      }
    }

    // Migrate project data to multiProject.projects structure
    const projectId = currentProject.name;
    const migratedConfig = {
      ...config,
      multiProject: {
        enabled: true,
        activeProject: projectId,
        projects: {
          [projectId]: {
            id: projectId,
            name: currentProject.name,
            description: currentProject.description,
            techStack: currentProject.techStack || [],
            externalTools: currentProject.externalTools || {}
          }
        }
      }
    };

    // Save migrated config
    await configManager.write(migratedConfig);

    // Create project folder in living docs structure
    const projectFolderPath = path.join(
      projectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      projectId
    );

    try {
      await fs.mkdir(projectFolderPath, { recursive: true });
      logger.log(chalk.gray(`📁 Created project folder: specs/${projectId}/`));
    } catch (error) {
      // Folder might already exist - that's okay
      logger.debug(`Project folder already exists or error creating: ${error}`);
    }

    // Update existing increments with project field
    logger.log(chalk.gray('\n📝 Updating existing increments...'));
    const updateResults = await updateExistingIncrements(projectRoot, projectId, logger);

    if (updateResults.updated > 0) {
      logger.log(chalk.gray(`  ✓ Updated ${updateResults.updated} increment(s)`));
    }
    if (updateResults.skipped > 0) {
      logger.log(chalk.gray(`  ℹ Skipped ${updateResults.skipped} increment(s) (already have project field)`));
    }
    if (updateResults.errors > 0) {
      logger.log(chalk.yellow(`  ⚠ Failed to update ${updateResults.errors} increment(s)`));
    }

    logger.log(chalk.green('\n✅ Multi-project mode enabled successfully!\n'));
    logger.log(`Active project: ${projectId}`);
    logger.log('\nNext steps:');
    logger.log('  • Add more projects: specweave config set multiProject.projects.{project-id}');
    logger.log('  • Switch projects: /specweave:switch-project');
    logger.log('  • Create increments with project: field in spec.md\n');

    return {
      success: true,
      message: 'Multi-project mode enabled successfully.'
    };
  } catch (error) {
    logger.error('Failed to enable multi-project mode:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
