/**
 * Update Instructions Command
 *
 * Smart merge for CLAUDE.md and AGENTS.md instruction files (both are always
 * generated: Claude Code reads CLAUDE.md, every other tool reads AGENTS.md).
 * Preserves user customizations while updating SpecWeave sections.
 * Also migrates config.json to add missing sections (v1.0.131+).
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { getPackageVersion } from '../helpers/init/instruction-file-merger.js';
import {
  applyInstructionTemplate,
  type ApplyInstructionResult,
  type InstructionFileName,
} from '../helpers/init/instruction-file-writer.js';
import { detectStackCommands } from '../helpers/init/stack-detector.js';
import { findSourceDir } from '../helpers/init/path-utils.js';
import { getDirname } from '../../utils/esm-helpers.js';
import { ensureSkillCreator } from '../helpers/init/skill-creator-installer.js';

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

const INSTRUCTION_FILES: InstructionFileName[] = ['CLAUDE.md', 'AGENTS.md'];

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

  const projectName = detectProjectName(projectPath);
  const commands = detectStackCommands(projectPath);

  const results = INSTRUCTION_FILES.map(filename =>
    reportFile(
      applyInstructionTemplate({ projectPath, templatesDir, filename, projectName, version, commands, dryRun: options.dryRun }),
      filename,
      options
    )
  );

  // Summary
  console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue('  Summary'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (configMigrated.sectionsAdded > 0) {
    console.log('  config.json: ' + chalk.blue('migrated'));
    console.log(chalk.gray('    Added ' + configMigrated.sectionsAdded + ' missing section(s): ' + configMigrated.sections.join(', ')));
  }

  results.forEach((r, i) => {
    if (r.action === 'skipped') return;
    console.log('  ' + INSTRUCTION_FILES[i] + ': ' + formatAction(r.action));
    if (r.preserved > 0) {
      console.log(chalk.gray('    Preserved ' + r.preserved + ' user section(s)'));
    }
  });

  if (options.dryRun) {
    console.log(chalk.yellow('\n  ⚠ Dry run - no files were modified'));
  }

  // Auto-install Anthropic's skill-creator if missing (non-blocking)
  if (!options.dryRun) {
    // Fire-and-forget — non-blocking, never throws
    ensureSkillCreator(projectPath).catch(() => {});
  }

  console.log('');
}

function reportFile(
  result: ApplyInstructionResult,
  filename: string,
  options: UpdateInstructionsOptions
): ApplyInstructionResult {
  if (result.action === 'skipped') {
    if (options.verbose) console.log(chalk.gray('  ⊘ ' + filename + ': template not found, skipping'));
    return result;
  }

  const prefix = options.dryRun ? '  ○ ' + filename + ': would ' : '  ✓ ' + filename + ': ';
  if (result.action === 'unchanged') {
    console.log(chalk.gray('  ⊘ ' + filename + ': already up to date'));
  } else if (result.action === 'created') {
    console.log(chalk.green(prefix + (options.dryRun ? 'create' : 'created')));
  } else {
    console.log(chalk.blue(prefix + (options.dryRun ? 'merge' : 'merged')));
  }

  if (options.verbose && result.updated.length > 0) console.log(chalk.gray('    Updated: ' + result.updated.join(', ')));
  if (options.verbose && result.added.length > 0) console.log(chalk.gray('    Added: ' + result.added.join(', ')));
  if (result.removed.length > 0) console.log(chalk.gray('    Removed: ' + result.removed.join(', ')));
  // Migration notes and marker repairs are shown without --verbose: they are one-time and actionable.
  result.warnings.forEach(w => console.log(chalk.yellow('    ⚠ ' + w)));
  return result;
}

function detectProjectName(projectPath: string): string {
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
  return path.basename(projectPath);
}

function formatAction(action: string): string {
  switch (action) {
    case 'created':
      return chalk.green('created');
    case 'merged':
      return chalk.blue('merged');
    case 'unchanged':
      return chalk.gray('up to date');
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
