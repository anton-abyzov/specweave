/**
 * Migrate Config Command
 *
 * Migrates old .env-only configuration to split secrets/config format
 *
 * @module cli/commands/migrate-config
 */

import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import { ConfigMigrator } from '../../core/config/config-migrator.js';
import type { MigrationResult } from '../../core/config/config-migrator.js';

/**
 * Command options
 */
export interface MigrateConfigOptions {
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
}

/**
 * Migrate configuration from .env-only to split format
 *
 * @param options - Command options
 */
export async function migrateConfig(options: MigrateConfigOptions = {}): Promise<void> {
  const { dryRun = false, force = false, yes = false } = options;

  console.log(chalk.bold.cyan('\n🔄 SpecWeave Configuration Migration\n'));
  console.log(chalk.gray('Migrating from .env-only to split secrets/config format\n'));

  const migrator = new ConfigMigrator(process.cwd());

  // Check if migration is needed
  if (!force) {
    const spinner = ora('Checking if migration is needed...').start();
    const needed = await migrator.needsMigration();

    if (!needed) {
      spinner.succeed('Migration not needed');
      console.log(chalk.green('\n✅ Your project already uses the split format!'));
      console.log(chalk.gray('   Secrets are in .env, config is in .specweave/config.json\n'));
      return;
    }

    spinner.succeed('Migration needed - old format detected');
  }

  // Preview migration
  console.log(chalk.bold('\n📋 Migration Preview\n'));
  const spinner = ora('Analyzing .env file...').start();

  let preview: MigrationResult;
  try {
    preview = await migrator.preview();
    spinner.succeed('Analysis complete');
  } catch (error: any) {
    spinner.fail('Analysis failed');
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    return;
  }

  // Display classification results
  console.log(chalk.bold('\nClassification Results:'));
  console.log(chalk.green(`  Secrets: ${preview.secretsCount} variables`));
  console.log(chalk.blue(`  Config:  ${preview.configCount} variables`));

  if (preview.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    preview.warnings.forEach(w => console.log(chalk.yellow(`  - ${w}`)));
  }

  // Show detailed breakdown
  console.log(chalk.bold('\n📊 Detailed Breakdown:\n'));

  const secretVars = preview.classified.filter(c => c.type === 'secret');
  const configVars = preview.classified.filter(c => c.type === 'config');

  if (secretVars.length > 0) {
    console.log(chalk.green.bold('  Secrets (will stay in .env):'));
    secretVars.forEach(v => {
      const maskedValue = maskSecret(v.value);
      console.log(chalk.gray(`    ${v.key}=${maskedValue}`));
      console.log(chalk.gray(`    └─ ${v.reason}\n`));
    });
  }

  if (configVars.length > 0) {
    console.log(chalk.blue.bold('  Configuration (will move to config.json):'));
    configVars.forEach(v => {
      console.log(chalk.gray(`    ${v.key}=${v.value}`));
      console.log(chalk.gray(`    └─ ${v.reason}\n`));
    });
  }

  // Dry run mode - stop here
  if (dryRun) {
    console.log(chalk.yellow('\n🔍 Dry run mode - no changes made\n'));
    console.log(chalk.gray('Run without --dry-run to perform migration\n'));
    return;
  }

  // Confirm migration
  if (!yes) {
    console.log(chalk.bold('\n❓ Migration Actions:\n'));
    console.log(chalk.gray('  1. Backup .env → .env.backup.TIMESTAMP'));
    console.log(chalk.gray('  2. Update .env (keep only secrets)'));
    console.log(chalk.gray('  3. Create/update .specweave/config.json (add config)'));
    console.log(chalk.gray('  4. Generate .env.example (team template)\n'));

    const confirmResult = await confirm({
      message: 'Proceed with migration?',
      default: false
    });

    if (!confirmResult) {
      console.log(chalk.yellow('\n⚠️  Migration cancelled\n'));
      return;
    }
  }

  // Perform migration
  console.log(chalk.bold('\n🚀 Performing Migration...\n'));
  const migrationSpinner = ora('Migrating configuration...').start();

  let result: MigrationResult;
  try {
    result = await migrator.migrate({ backup: true, force });
    migrationSpinner.succeed('Migration complete');
  } catch (error: any) {
    migrationSpinner.fail('Migration failed');
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    return;
  }

  // Display results
  console.log(chalk.bold.green('\n✅ Migration Successful!\n'));

  console.log(chalk.bold('Summary:'));
  console.log(chalk.green(`  ✓ ${result.secretsCount} secrets kept in .env`));
  console.log(chalk.blue(`  ✓ ${result.configCount} config items moved to config.json`));

  if (result.backupPath) {
    console.log(chalk.gray(`  ✓ Backup created: ${result.backupPath}`));
  }

  console.log(chalk.gray(`  ✓ .env.example generated\n`));

  // Show next steps
  console.log(chalk.bold('📝 Next Steps:\n'));
  console.log(chalk.cyan('  1. Review .specweave/config.json (commit to git)'));
  console.log(chalk.cyan('  2. Share .env.example with team (commit to git)'));
  console.log(chalk.cyan('  3. Team members: cp .env.example .env (fill in tokens)'));
  console.log(chalk.cyan('  4. Verify: specweave init . (should detect existing config)\n'));

  console.log(chalk.bold('🎯 Benefits:\n'));
  console.log(chalk.green('  ✓ Team shares configuration via git'));
  console.log(chalk.green('  ✓ Secrets stay local (never committed)'));
  console.log(chalk.green('  ✓ Type-safe configuration with validation'));
  console.log(chalk.green('  ✓ Easy onboarding for new team members\n'));
}

/**
 * Mask secret value for display
 *
 * @param value - Secret value
 * @returns Masked value
 */
function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '***';
  }

  const visible = 4;
  const start = value.substring(0, visible);
  const end = value.substring(value.length - visible);

  return `${start}${'*'.repeat(value.length - visible * 2)}${end}`;
}
