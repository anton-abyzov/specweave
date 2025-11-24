/**
 * CLI Command: delete-feature
 * Increment: 0053-safe-feature-deletion
 * Tasks: T-034, T-035
 *
 * NOTE: This CLI command is primarily user-facing output (console.log/console.error).
 * All console.* calls are legitimate user-facing exceptions as defined in CONTRIBUTING.md.
 */

import { Command } from 'commander';
import { FeatureDeleter } from '../../core/feature-deleter/index.js';
import { DeletionOptions } from '../../core/feature-deleter/types.js';

/**
 * T-035: Validate feature ID format (FS-XXX)
 */
function validateFeatureId(featureId: string): void {
  const pattern = /^FS-\d{3}$/;

  if (!pattern.test(featureId)) {
    console.error(`❌ Invalid feature ID format: "${featureId}"`);
    console.error('   Expected: FS-XXX (e.g., FS-052)');
    console.error('   - Must start with "FS-"');
    console.error('   - Must have exactly 3 digits');
    console.error('');
    console.error('Examples:');
    console.error('  ✓ FS-001');
    console.error('  ✓ FS-052');
    console.error('  ✓ FS-999');
    console.error('  ✗ FS-52 (2 digits)');
    console.error('  ✗ FS-0520 (4 digits)');
    console.error('  ✗ feature-052 (wrong prefix)');

    process.exit(1);
  }
}

/**
 * T-034: Register delete-feature command
 */
export function registerDeleteFeatureCommand(program: Command): void {
  program
    .command('delete-feature <feature-id>')
    .description('Delete a feature and its associated files')
    .option('--force', 'Bypass active increment validation')
    .option('--dry-run', 'Preview deletion without executing')
    .option('--no-git', 'Skip git operations')
    .option('--no-github', 'Skip GitHub issue cleanup')
    .option('--yes', 'Skip confirmations (except elevated)')
    .action(async (featureId: string, options: DeletionOptions) => {
      try {
        // T-035: Validate feature ID
        validateFeatureId(featureId);

        // Create deleter and execute
        const deleter = new FeatureDeleter({
          projectRoot: process.cwd()
        });

        const result = await deleter.execute(featureId, options);

        // Display result
        if (result.success) {
          console.log('');
          console.log(`✓ Feature ${featureId} deleted successfully!`);
          console.log(`  Files deleted: ${result.filesDeleted}`);

          if (result.commitSha) {
            console.log(`  Git commit: ${result.commitSha.substring(0, 7)}`);
          }

          if (result.githubIssuesClosed) {
            console.log(`  GitHub issues closed: ${result.githubIssuesClosed}`);
          }

          if (result.orphanedIncrements && result.orphanedIncrements.length > 0) {
            console.log(`  Orphaned increments: ${result.orphanedIncrements.join(', ')}`);
          }

          console.log('');
          process.exit(0);
        } else {
          console.error('');
          console.error(`❌ Feature deletion failed:`);

          if (result.errors) {
            result.errors.forEach(error => console.error(`   ${error}`));
          }

          console.error('');
          process.exit(1);
        }
      } catch (error: any) {
        console.error('');
        console.error(`❌ Feature deletion failed: ${error.message || error}`);
        console.error('');
        process.exit(1);
      }
    });
}
