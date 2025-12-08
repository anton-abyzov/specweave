/**
 * Archive Command - Archive completed increments and sync living docs
 *
 * Archives increments to .specweave/increments/_archive/ and automatically
 * archives corresponding features in:
 * - .specweave/docs/internal/specs/{project}/_archive/
 *
 * v0.33.0: Added --external flag for archiving external living docs (FS-XXXE)
 */

import chalk from 'chalk';
import { IncrementArchiver } from '../../core/increment/increment-archiver.js';
import { FeatureArchiver } from '../../core/living-docs/feature-archiver.js';

export async function archiveCommand(incrementIds: string[], options: any): Promise<void> {
  try {
    // ================================================================
    // EXTERNAL MODE: Archive external living docs (FS-XXXE features)
    // ================================================================
    if (options.external) {
      console.log(chalk.blue('📦 External living docs archive mode\n'));

      const featureArchiver = new FeatureArchiver(process.cwd());

      // Filter feature IDs (FS-*E pattern only)
      const featureIds = incrementIds.filter(id =>
        /^FS-\d+E$/.test(id)
      );

      const externalOptions = {
        featureIds: featureIds.length > 0 ? featureIds : undefined,
        olderThanDays: options.olderThan ? parseInt(options.olderThan) : undefined,
        keepLast: options.keepLast ? parseInt(options.keepLast) : undefined,
        dryRun: options.dryRun,
        updateLinks: true
      };

      const result = await featureArchiver.archiveExternalFeatures(externalOptions);

      console.log(chalk.green(`\n✅ External archive complete:`));
      console.log(`   Archived: ${result.archivedFeatures.length} features`);
      if (result.archivedFeatures.length > 0) {
        result.archivedFeatures.forEach(f => console.log(`   - ${f}`));
      }
      if (result.errors.length > 0) {
        console.log(chalk.red(`   Errors: ${result.errors.length}`));
        result.errors.forEach(e => console.log(`   - ${e}`));
      }
      return;
    }

    // ================================================================
    // INCREMENT MODE: Archive completed increments (default)
    // ================================================================
    console.log(chalk.blue('📦 Archiving increments...\n'));

    const archiver = new IncrementArchiver(process.cwd());

    // Parse options
    const archiveOptions = {
      increments: incrementIds.length > 0 ? incrementIds : undefined,
      keepLast: options.keepLast ? parseInt(options.keepLast) : 5,
      strictLast: options.last ? parseInt(options.last) : undefined,
      olderThanDays: options.olderThan ? parseInt(options.olderThan) : undefined,
      pattern: options.pattern,
      archiveCompleted: options.archiveCompleted,
      preserveActive: options.preserveActive,
      dryRun: options.dryRun
    };

    // Execute archiving
    const result = await archiver.archive(archiveOptions);

    // Display results
    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 DRY RUN - No files will be moved\n'));
    }

    console.log(chalk.green(`✅ Archived: ${result.archived.length} increments`));
    if (result.archived.length > 0) {
      result.archived.forEach(inc => console.log(`   - ${inc}`));
    }

    if (result.skipped.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Skipped: ${result.skipped.length} increments`));
      result.skipped.forEach(inc => console.log(`   - ${inc}`));
    }

    if (result.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors: ${result.errors.length} increments`));
      result.errors.forEach(inc => console.log(`   - ${inc}`));
    }

    // The IncrementArchiver already calls FeatureArchiver in updateReferences()
    // so feature archiving happens automatically! Just show completion message.
    if (result.archived.length > 0 && !options.dryRun) {
      console.log(chalk.blue('\n✅ Living docs synchronization complete!'));
      console.log('   Features archived in: .specweave/docs/internal/specs/{project}/_archive/');
    }

    // Show statistics
    const stats = await archiver.getStats();
    console.log(chalk.blue('\n📊 Archive Statistics:'));
    console.log(`   Active: ${stats.active} increments`);
    console.log(`   Archived: ${stats.archived} increments`);
    if (stats.abandoned > 0) {
      console.log(`   Abandoned: ${stats.abandoned} increments`);
    }
    console.log(`   Total archive size: ${formatSize(stats.totalSize)}`);

    if (!options.dryRun && result.archived.length > 0) {
      console.log(chalk.green('\n✅ Archive operation complete!'));
      console.log(chalk.dim('   To restore: specweave restore <increment-id>'));
    }

  } catch (error) {
    const err = error as Error;
    console.error(chalk.red(`\n❌ Archive operation failed: ${err.message}`));
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${Math.round(mb)} MB`;
}
