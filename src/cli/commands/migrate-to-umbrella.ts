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
import { confirm, input, select } from '@inquirer/prompts';
import {
  detectSingleRepoProject,
  generateMigrationPlan,
  executeMigration,
  guardUncommittedChanges,
  rollbackMigration,
  addRepoToUmbrella,
  classifyExistingUmbrella,
} from '../../core/migration/umbrella-migrator.js';
import {
  buildFeatureProjectMap,
  generateReorganizationPlan,
  reorganizeSpecs,
} from '../../core/migration/spec-project-mapper.js';
import {
  scanForOrphans,
  executeConsolidation,
} from '../../core/migration/consolidation-engine.js';
import * as fs from 'fs';
import * as path from 'path';
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

  // Handle reorganize-specs
  if (options.reorganizeSpecs) {
    await handleReorganizeSpecs(projectRoot, options);
    return;
  }

  // Handle consolidate
  if (options.consolidate) {
    await handleConsolidate(projectRoot, options);
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

  // Step 5a: Collision check
  const collision = await classifyExistingUmbrella(plan.umbrellaPath, projectRoot);
  if (collision && !options.yes) {
    const handled = await handleCollision(collision, plan, projectRoot);
    if (handled === 'abort') {
      console.log(chalk.dim('  Aborted.'));
      return;
    }
    if (handled === 'rename') {
      // Recursive call with new name — user already picked it
      return;
    }
    // handled === 'wipe' — continue with execution
  } else if (collision && options.yes) {
    // --yes mode: wipe previous migrations, abort on unrelated
    if (collision === 'unrelated') {
      console.log(chalk.red(`\n  Target directory exists and is unrelated: ${plan.umbrellaPath}`));
      console.log(chalk.red('  Cannot proceed with --yes. Use a different name.\n'));
      process.exit(1);
    }
    console.log(chalk.yellow(`  Removing existing ${plan.umbrellaName}/ (${collision})...`));
    await fs.promises.rm(plan.umbrellaPath, { recursive: true });
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
 * Handle collision with existing umbrella directory.
 * Returns 'wipe' to continue, 'rename' if user picked a new name, or 'abort'.
 */
async function handleCollision(
  collision: 'previous-migration' | 'partial-migration' | 'unrelated',
  plan: MigrationPlan,
  projectRoot: string,
): Promise<'wipe' | 'rename' | 'abort'> {
  console.log(chalk.yellow(`\n  Target '${plan.umbrellaName}/' already exists.`));
  console.log(chalk.dim(`  Detected: ${collision}\n`));

  if (collision === 'previous-migration') {
    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { value: 'wipe', name: 'Wipe and redo (remove existing, migrate fresh)' },
        { value: 'rename', name: 'Choose a different name' },
        { value: 'abort', name: 'Abort' },
      ],
    });

    if (action === 'wipe') {
      console.log(chalk.yellow(`  Removing existing ${plan.umbrellaName}/...`));
      await fs.promises.rm(plan.umbrellaPath, { recursive: true });
      return 'wipe';
    }
    if (action === 'rename') {
      const newName = await input({ message: 'New umbrella directory name:' });
      if (!newName) return 'abort';
      console.log(chalk.dim(`  Re-run with: specweave migrate-to-umbrella --execute --umbrella-name ${newName}`));
      return 'rename';
    }
    return 'abort';
  }

  if (collision === 'partial-migration') {
    const action = await select({
      message: 'A partial migration was detected. What would you like to do?',
      choices: [
        { value: 'rollback', name: 'Rollback first, then retry' },
        { value: 'abort', name: 'Abort' },
      ],
    });

    if (action === 'rollback') {
      console.log(chalk.blue('  Rolling back previous migration first...\n'));
      const rollResult = await rollbackMigration(projectRoot);
      if (!rollResult.success) {
        console.log(chalk.red('  Rollback failed:'));
        for (const err of rollResult.errors) {
          console.log(chalk.red(`   ${err}`));
        }
        return 'abort';
      }
      console.log(chalk.green('  Rollback complete. Proceeding with fresh migration.\n'));
      return 'wipe';
    }
    return 'abort';
  }

  // unrelated
  const action = await select({
    message: 'Directory exists but is not a SpecWeave umbrella. What would you like to do?',
    choices: [
      { value: 'rename', name: 'Choose a different name' },
      { value: 'abort', name: 'Abort' },
    ],
  });

  if (action === 'rename') {
    const newName = await input({ message: 'New umbrella directory name:' });
    if (!newName) return 'abort';
    console.log(chalk.dim(`  Re-run with: specweave migrate-to-umbrella --execute --umbrella-name ${newName}`));
    return 'rename';
  }
  return 'abort';
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

/**
 * Handle --reorganize-specs: redistribute FS-XXX spec folders by project.
 */
async function handleReorganizeSpecs(
  projectRoot: string,
  options: MigrationOptions,
): Promise<void> {
  console.log(chalk.blue('\n  Reorganize Specs by Project\n'));

  // Validate umbrella project
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('  No .specweave/config.json found.'));
    process.exit(1);
  }

  let config: Record<string, any>;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    console.log(chalk.red('  Could not parse .specweave/config.json'));
    process.exit(1);
    return;
  }

  if (!config.umbrella?.enabled) {
    console.log(chalk.red('  This is not an umbrella project. --reorganize-specs requires umbrella.enabled=true.'));
    process.exit(1);
  }

  // Detect current project folder
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');
  if (!fs.existsSync(specsDir)) {
    console.log(chalk.red('  No specs directory found at .specweave/docs/internal/specs/'));
    process.exit(1);
  }

  // Find current project folder (first non-archive directory)
  const projectDirs = fs.readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'));
  if (projectDirs.length === 0) {
    console.log(chalk.yellow('  No project folders found under specs/'));
    return;
  }
  const currentProject = projectDirs[0].name;
  console.log(chalk.dim(`  Current project folder: ${currentProject}`));

  // Build feature → project mapping
  console.log(chalk.dim('  Scanning increments for project mappings...\n'));
  const featureMap = await buildFeatureProjectMap(projectRoot);

  if (featureMap.size === 0) {
    console.log(chalk.yellow('  No feature specs found to reorganize.'));
    return;
  }

  // Generate reorganization plan
  const plan = await generateReorganizationPlan(featureMap, specsDir, currentProject);

  if (plan.length === 0) {
    console.log(chalk.green('  All specs are already in the correct project folders. Nothing to do.'));
    if (!config.multiProject?.enabled) {
      console.log(chalk.dim('  Config: will set multiProject.enabled=true'));
      if (options.execute) {
        await reorganizeSpecs([], configPath, { execute: true });
        console.log(chalk.green('  Config updated: multiProject.enabled=true'));
      }
    }
    return;
  }

  // Display plan
  console.log(chalk.blue(`  Reorganization Plan (${plan.length} operations):\n`));
  for (const op of plan) {
    const sourceProject = path.basename(path.dirname(op.source));
    const destProject = path.basename(path.dirname(op.destination));
    const tag = op.type === 'move' ? chalk.yellow('[MOVE]') : chalk.cyan('[COPY]');
    console.log(`  ${tag} ${op.featureId}: ${sourceProject}/ → ${destProject}/`);
  }

  if (!config.multiProject?.enabled) {
    console.log(chalk.blue(`\n  [CONFIG] multiProject.enabled: false → true`));
  }

  if (!options.execute) {
    console.log(chalk.yellow('\n  Dry-run complete. Run with --execute --reorganize-specs to apply.\n'));
    return;
  }

  // Execute
  console.log(chalk.blue('\n  Executing reorganization...\n'));
  await reorganizeSpecs(plan, configPath, { execute: true });

  console.log(chalk.green(`\n  Reorganization complete!`));
  console.log(chalk.dim(`  ${plan.length} specs moved/copied to per-project folders.`));
  if (!config.multiProject?.enabled) {
    console.log(chalk.dim('  multiProject.enabled set to true.'));
  }
}

/**
 * Handle --consolidate: move orphaned increments/docs from nested repos to umbrella root.
 */
async function handleConsolidate(
  projectRoot: string,
  options: MigrationOptions,
): Promise<void> {
  console.log(chalk.blue('\n  Consolidate Nested Increments\n'));

  const plan = await scanForOrphans(projectRoot);

  if (plan.moves.length === 0 && plan.deletions.length === 0) {
    console.log(chalk.green('  No orphaned increments or docs found. Nothing to consolidate.'));
    return;
  }

  // Display plan
  console.log(chalk.blue(`  Consolidation Plan (${plan.moves.length} moves, ${plan.deletions.length} deletions):\n`));

  for (const move of plan.moves) {
    const label = move.type === 'increment' ? '[MOVE INCREMENT]' : '[MOVE DOC]';
    console.log(chalk.yellow(`  ${label} ${path.basename(move.from)}`));
    console.log(chalk.dim(`    from: ${move.from}`));
    console.log(chalk.dim(`    to:   ${move.to}`));
  }

  for (const deletion of plan.deletions) {
    console.log(chalk.red(`  [DELETE] ${path.basename(deletion.path)} (${deletion.reason})`));
    console.log(chalk.dim(`    path: ${deletion.path}`));
  }

  if (!options.execute) {
    console.log(chalk.yellow('\n  Dry-run complete. Run with --consolidate --execute to apply changes.\n'));
    return;
  }

  // Execute
  console.log(chalk.blue('\n  Executing consolidation...\n'));
  await executeConsolidation(plan, projectRoot);

  console.log(chalk.green(`\n  Consolidation complete!`));
  console.log(chalk.dim(`  ${plan.moves.length} items moved, ${plan.deletions.length} duplicates removed.`));
}

