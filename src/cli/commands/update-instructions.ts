/**
 * Update Instructions Command
 *
 * Smart merge for CLAUDE.md and AGENTS.md instruction files.
 * Preserves user customizations while updating SpecWeave sections.
 * Also migrates config.json to add missing sections (v1.0.131+).
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import {
  mergeInstructionFile,
  parseTemplateSections,
  getPackageVersion
} from '../helpers/init/instruction-file-merger.js';
import { findSourceDir } from '../helpers/init/path-utils.js';
import { getDirname } from '../../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

interface UpdateInstructionsOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Default auto configuration (v1.0.131+)
 * Added to old projects missing this section
 */
const DEFAULT_AUTO_CONFIG = {
  enabled: true,
  maxRetries: 20,
  requireTests: false,
  requireValidation: true,
  requireJudgeLLM: false,
  skipQualityGates: false,
};

/**
 * CLI command to update CLAUDE.md and AGENTS.md with smart merge
 */
export async function updateInstructionsCommand(
  options: UpdateInstructionsOptions = {}
): Promise<void> {
  const projectPath = process.cwd();
  const version = getPackageVersion();

  console.log(chalk.blue('\n📄 Updating Instruction Files'));
  console.log(chalk.gray('   Version: ' + version));
  console.log(chalk.gray('   Project: ' + projectPath + '\n'));

  // Migrate config.json (add missing sections)
  const configMigrated = await migrateConfig(projectPath, options);

  // Find templates directory
  const templatesDir = findSourceDir('templates', __dirname);
  if (!templatesDir || !fs.existsSync(templatesDir)) {
    console.error(chalk.red('✗ Templates directory not found'));
    process.exit(1);
  }

  // Update CLAUDE.md
  const claudeResult = await updateFile(
    projectPath,
    templatesDir,
    'CLAUDE.md',
    'claude',
    version,
    options
  );

  // Update AGENTS.md
  const agentsResult = await updateFile(
    projectPath,
    templatesDir,
    'AGENTS.md',
    'agents',
    version,
    options
  );

  // Summary
  console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue('  Summary'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (configMigrated.sectionsAdded > 0) {
    console.log('  config.json: ' + chalk.blue('migrated'));
    console.log(chalk.gray('    Added ' + configMigrated.sectionsAdded + ' missing section(s): ' + configMigrated.sections.join(', ')));
  }

  if (claudeResult.action !== 'skipped') {
    console.log('  CLAUDE.md: ' + formatAction(claudeResult.action));
    if (claudeResult.preserved > 0) {
      console.log(chalk.gray('    Preserved ' + claudeResult.preserved + ' user sections'));
    }
  }

  if (agentsResult.action !== 'skipped') {
    console.log('  AGENTS.md: ' + formatAction(agentsResult.action));
    if (agentsResult.preserved > 0) {
      console.log(chalk.gray('    Preserved ' + agentsResult.preserved + ' user sections'));
    }
  }

  if (options.dryRun) {
    console.log(chalk.yellow('\n  ⚠ Dry run - no files were modified'));
  }

  console.log('');
}

async function updateFile(
  projectPath: string,
  templatesDir: string,
  filename: string,
  type: 'claude' | 'agents',
  version: string,
  options: UpdateInstructionsOptions
): Promise<{ action: string; preserved: number }> {
  const filePath = path.join(projectPath, filename);
  const templatePath = path.join(templatesDir, filename + '.template');

  if (!fs.existsSync(templatePath)) {
    if (options.verbose) {
      console.log(chalk.gray('  ⊘ ' + filename + ': template not found, skipping'));
    }
    return { action: 'skipped', preserved: 0 };
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const sections = parseTemplateSections(templateContent);

  const existingContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8')
    : null;

  // Detect project name from existing content or directory
  const projectName = detectProjectName(existingContent, projectPath);

  const result = mergeInstructionFile(
    existingContent,
    sections,
    type,
    version,
    projectName
  );

  if (options.dryRun) {
    console.log(chalk.yellow('  ○ ' + filename + ': would ' + result.action));
    if (options.verbose && result.updated.length > 0) {
      console.log(chalk.gray('    Would update: ' + result.updated.join(', ')));
    }
    if (options.verbose && result.added.length > 0) {
      console.log(chalk.gray('    Would add: ' + result.added.join(', ')));
    }
  } else {
    // Create backup before overwriting (safety net for merge issues)
    if (existingContent) {
      try {
        fs.writeFileSync(filePath + '.bak', existingContent);
      } catch {
        // Non-fatal: proceed even if backup fails
      }
    }
    fs.writeFileSync(filePath, result.content);

    if (result.action === 'created') {
      console.log(chalk.green('  ✓ ' + filename + ': created'));
    } else if (result.action === 'merged') {
      console.log(chalk.blue('  ✓ ' + filename + ': merged'));
      if (options.verbose && result.updated.length > 0) {
        console.log(chalk.gray('    Updated: ' + result.updated.join(', ')));
      }
    } else if (result.action === 'preserved') {
      console.log(chalk.yellow('  ⚠ ' + filename + ': preserved (errors found)'));
      result.warnings.forEach(w => console.log(chalk.yellow('    ' + w)));
    }
  }

  return { action: result.action, preserved: result.preserved };
}

function detectProjectName(content: string | null, projectPath: string): string {
  // Try to extract from existing content
  if (content) {
    const match = content.match(/^#\s+(.+?)\s*[-–—]/m);
    if (match) {
      return match[1].trim();
    }
  }

  // Try config.json
  const configPath = path.join(projectPath, '.specweave', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.project?.name) {
        return config.project.name;
      }
    } catch {
      // ignore
    }
  }

  // Fallback to directory name
  return path.basename(projectPath);
}

function formatAction(action: string): string {
  switch (action) {
    case 'created':
      return chalk.green('created');
    case 'merged':
      return chalk.blue('merged');
    case 'preserved':
      return chalk.yellow('preserved (manual fix needed)');
    default:
      return action;
  }
}

/**
 * Migrate config.json to add missing sections
 *
 * v1.0.131+: Adds 'auto' section for stop hook circuit breaker config
 *
 * This is safe and idempotent:
 * - Only adds sections that don't exist
 * - Preserves all existing configuration
 * - Can be run multiple times
 */
async function migrateConfig(
  projectPath: string,
  options: UpdateInstructionsOptions
): Promise<{ sectionsAdded: number; sections: string[] }> {
  const configPath = path.join(projectPath, '.specweave', 'config.json');
  const sectionsAdded: string[] = [];

  if (!fs.existsSync(configPath)) {
    if (options.verbose) {
      console.log(chalk.gray('  ⊘ config.json: not found, skipping migration'));
    }
    return { sectionsAdded: 0, sections: [] };
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    let modified = false;

    // Add 'auto' section if missing (v1.0.131+)
    if (!config.auto) {
      config.auto = DEFAULT_AUTO_CONFIG;
      sectionsAdded.push('auto');
      modified = true;
    }

    // Future migrations can be added here:
    // if (!config.someOtherSection) { ... }

    if (modified) {
      if (options.dryRun) {
        console.log(chalk.yellow('  ○ config.json: would add missing sections: ' + sectionsAdded.join(', ')));
      } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(chalk.blue('  ✓ config.json: added missing sections'));
      }
    } else if (options.verbose) {
      console.log(chalk.gray('  ⊘ config.json: already up to date'));
    }

    return { sectionsAdded: sectionsAdded.length, sections: sectionsAdded };
  } catch (error) {
    if (options.verbose) {
      console.log(chalk.yellow('  ⚠ config.json: could not parse, skipping migration'));
    }
    return { sectionsAdded: 0, sections: [] };
  }
}
