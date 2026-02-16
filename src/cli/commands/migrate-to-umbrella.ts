/**
 * migrate-to-umbrella CLI Command
 *
 * Converts a single-repo SpecWeave project into an umbrella/multi-repo
 * workspace. Creates a sibling umbrella directory and moves SpecWeave-managed
 * files to it while leaving the original project untouched.
 *
 * Usage:
 *   specweave migrate-to-umbrella                  # Dry-run (shows plan)
 *   specweave migrate-to-umbrella --execute        # Execute migration
 *   specweave migrate-to-umbrella --rollback       # Rollback last migration
 *   specweave migrate-to-umbrella --add-repo <url> # Add repo to umbrella
 */

import chalk from 'chalk';
import { confirm, input } from '@inquirer/prompts';
import {
  detectSingleRepoProject,
  generateMigrationPlan,
  executeMigration,
  guardUncommittedChanges,
  rollbackMigration,
  addRepoToUmbrella,
} from '../../core/migration/umbrella-migrator.js';
import type { MigrationOptions, MigrationPlan } from '../../core/migration/types.js';

/**
 * CLI handler for migrate-to-umbrella command.
 */
export async function migrateToUmbrellaCommand(
  options: MigrationOptions = {},
): Promise<void> {
  const projectRoot = process.cwd();

  // Handle rollback
  if (options.rollback) {
    await handleRollback(projectRoot);
    return;
  }

  // Handle add-repo
  if (options.addRepo) {
    await handleAddRepo(projectRoot, options.addRepo, options);
    return;
  }

  // Main migration flow
  console.log(chalk.blue('\n  Umbrella Migration Tool\n'));

  // Step 1: Detect single-repo project
  const candidate = await detectSingleRepoProject(projectRoot);
  if (!candidate) {
    console.log(chalk.red('  This is not a single-repo SpecWeave project, or it is already an umbrella.'));
    process.exit(1);
  }

  console.log(chalk.green('  Detected single-repo project:'));
  console.log(chalk.dim(`   Project: ${candidate.repoName}`));
  console.log(chalk.dim(`   Org: ${candidate.orgName}`));
  console.log(chalk.dim(`   CLAUDE.md: ${candidate.hasClaudeMd ? 'yes' : 'no'}`));
  console.log(chalk.dim(`   AGENTS.md: ${candidate.hasAgentsMd ? 'yes' : 'no'}`));
  console.log(chalk.dim(`   docs-site/: ${candidate.hasDocsSite ? 'yes' : 'no'}`));

  // Step 2: Get umbrella name (prompt if not provided)
  let umbrellaName = options.umbrellaName;
  if (!umbrellaName && !options.yes) {
    const defaultName = `${candidate.repoName}-umb`;
    umbrellaName = await input({
      message: 'Umbrella directory name:',
      default: defaultName,
    });
  }
  if (!umbrellaName) {
    umbrellaName = `${candidate.repoName}-umb`;
  }

  // Step 3: Generate plan
  const plan = generateMigrationPlan(candidate, {
    ...options,
    umbrellaName,
  });

  // Step 4: Display plan
  displayPlan(plan);

  // Step 5: Execute or exit
  if (!options.execute) {
    console.log(chalk.yellow('\n  Dry-run complete. Run with --execute to apply changes.\n'));
    return;
  }

  // Guard: uncommitted changes
  try {
    await guardUncommittedChanges(projectRoot);
  } catch (err) {
    console.log(chalk.red(`\n  ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
  }

  // Confirm execution
  if (!options.yes) {
    const proceed = await confirm({
      message: 'Execute migration? (a backup will be created first)',
      default: false,
    });
    if (!proceed) {
      console.log(chalk.dim('  Aborted.'));
      return;
    }
  }

  // Execute
  console.log(chalk.blue('\n  Executing migration...\n'));
  const result = await executeMigration(plan);

  if (result.success) {
    console.log(chalk.green(`\n  Migration complete!`));
    console.log(chalk.dim(`   Umbrella: ${result.umbrellaPath}`));
    console.log(chalk.dim(`   Backup: ${result.backupPath}`));
    console.log(chalk.dim(`\n   Next steps:`));
    console.log(chalk.dim(`   cd ${plan.umbrellaName} && specweave docs preview`));
  } else {
    console.log(chalk.red(`\n  Migration failed (${result.stepsCompleted}/${result.stepsTotal} steps):`));
    for (const err of result.errors) {
      console.log(chalk.red(`   ${err}`));
    }
    console.log(chalk.dim('\n  Run --rollback to restore from backup.'));
    process.exit(1);
  }
}

/**
 * Display migration plan with colored output.
 */
function displayPlan(plan: MigrationPlan): void {
  console.log(chalk.blue(`\n  Migration Plan: ${plan.umbrellaName}\n`));
  console.log(chalk.dim(`  Target: ${plan.umbrellaPath}\n`));

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const num = `${i + 1}.`.padEnd(4);
    switch (step.type) {
      case 'create-dir':
        console.log(chalk.green(`  ${num}[CREATE] ${step.description}`));
        break;
      case 'move':
        console.log(chalk.yellow(`  ${num}[MOVE]   ${step.description}`));
        break;
      case 'copy':
        console.log(chalk.cyan(`  ${num}[COPY]   ${step.description}`));
        break;
      case 'update-config':
        console.log(chalk.blue(`  ${num}[CONFIG] ${step.description}`));
        break;
      case 'create-file':
        console.log(chalk.green(`  ${num}[FILE]   ${step.description}`));
        break;
    }
  }
}

/**
 * Handle rollback subcommand.
 */
async function handleRollback(projectRoot: string): Promise<void> {
  console.log(chalk.blue('\n  Rolling back migration...\n'));

  const result = await rollbackMigration(projectRoot);

  if (result.success) {
    console.log(chalk.green('  Rollback completed successfully.'));
    console.log(chalk.dim(`  Restored from: ${result.backupPath}`));
  } else {
    console.log(chalk.red('  Rollback failed:'));
    for (const err of result.errors) {
      console.log(chalk.red(`   ${err}`));
    }
    process.exit(1);
  }
}

/**
 * Handle add-repo subcommand.
 */
async function handleAddRepo(
  projectRoot: string,
  repoArg: string,
  options: MigrationOptions,
): Promise<void> {
  console.log(chalk.blue('\n  Adding repository to umbrella...\n'));

  // Parse repo argument (can be "name" or "org/name")
  let orgName = options.orgName || '';
  let repoName = repoArg;
  if (repoArg.includes('/')) {
    const parts = repoArg.split('/');
    orgName = parts[0];
    repoName = parts[1];
  }

  if (!orgName) {
    if (!options.yes) {
      orgName = await input({
        message: 'GitHub organization/user:',
      });
    }
    if (!orgName) {
      console.log(chalk.red('  Organization name required. Use --org or provide as org/name.'));
      process.exit(1);
    }
  }

  let prefix: string | undefined;
  if (!options.yes) {
    prefix = await input({
      message: `Prefix for ${repoName}:`,
      default: repoName.substring(0, 3).toUpperCase(),
    });
  }

  const result = await addRepoToUmbrella(projectRoot, repoName, orgName, {
    prefix,
  });

  if (result.success) {
    console.log(chalk.green(`\n  Repository added: ${repoName}`));
    console.log(chalk.dim(`   Path: ${result.repoPath}`));
    console.log(chalk.dim(`   GitHub: ${result.usedGhCli ? 'created via gh CLI' : 'local only'}`));
  } else {
    console.log(chalk.red(`\n  Failed to add repo: ${result.error}`));
    process.exit(1);
  }
}

