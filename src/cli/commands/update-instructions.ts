/**
 * Update Instructions Command
 *
 * Smart merge for CLAUDE.md and AGENTS.md instruction files (both are always
 * generated: Claude Code reads CLAUDE.md, every other tool reads AGENTS.md).
 * Preserves user customizations while updating SpecWeave sections.
 * Also runs the one-shot 1.x → 2.0 config.json migration (shared with
 * `specweave update`, idempotent, so running both is a single pass).
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
import { ensureGitattributes } from '../helpers/init/directory-structure.js';
import { ensureSpecweaveGitignoreEntries } from '../helpers/init/gitignore-generator.js';
import { migrateConfigFile } from '../../core/config/migrate-config-file.js';

const __dirname = getDirname(import.meta.url);

interface UpdateInstructionsOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

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
  const configMigrated = migrateConfig(projectPath, options);

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

  // Repo hygiene: ledger merge=union + the runtime-state ignores (idempotent).
  const hygiene: string[] = [];
  if (!options.dryRun) {
    ensureGitattributes(projectPath, path.join(templatesDir, '.gitattributes.template'));
    hygiene.push('.gitattributes: ledger merge=union');
    const { added } = ensureSpecweaveGitignoreEntries(projectPath);
    if (added.length) hygiene.push(`.gitignore: added ${added.length} entr${added.length === 1 ? 'y' : 'ies'}`);
  }

  // Summary
  console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue('  Summary'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (configMigrated.changed) {
    console.log('  config.json: ' + chalk.blue(options.dryRun ? 'would migrate' : 'migrated'));
    if (configMigrated.removedKeys.length > 0) {
      console.log(chalk.gray('    Removed ' + configMigrated.removedKeys.length + ' dead 1.x key(s): ' + configMigrated.removedKeys.join(', ')));
    }
    if (configMigrated.renamedKeys.length > 0) {
      console.log(chalk.gray('    Renamed: ' + configMigrated.renamedKeys.join('; ')));
    }
    if (configMigrated.sectionsAdded.length > 0) {
      console.log(chalk.gray('    Added ' + configMigrated.sectionsAdded.length + ' missing section(s): ' + configMigrated.sectionsAdded.join(', ')));
    }
  }

  results.forEach((r, i) => {
    if (r.action === 'skipped') return;
    console.log('  ' + INSTRUCTION_FILES[i] + ': ' + formatAction(r.action));
    if (r.preserved > 0) {
      console.log(chalk.gray('    Preserved ' + r.preserved + ' user section(s)'));
    }
  });

  for (const line of hygiene) console.log('  ' + line);

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
 * Run the one-shot 1.x → 2.0 config.json migration.
 *
 * Delegates to the shared on-disk migrator so `specweave update`,
 * `specweave update-instructions` and `ConfigManager` all produce exactly the
 * same result. Safe and idempotent: a migrated config is left untouched.
 */
function migrateConfig(
  projectPath: string,
  options: UpdateInstructionsOptions
): ReturnType<typeof migrateConfigFile> {
  const result = migrateConfigFile(projectPath, { dryRun: options.dryRun });

  if (!result.ran) {
    if (options.verbose) console.log(chalk.gray('  ⊘ config.json: not found or unreadable, skipping migration'));
    return result;
  }
  if (!result.changed) {
    if (options.verbose) console.log(chalk.gray('  ⊘ config.json: already 2.0 shape'));
    return result;
  }
  if (options.dryRun) {
    console.log(chalk.yellow('  ○ config.json: would migrate to the 2.0 shape'));
  } else {
    console.log(chalk.blue('  ✓ config.json: migrated to the 2.0 shape'));
  }
  return result;
}
