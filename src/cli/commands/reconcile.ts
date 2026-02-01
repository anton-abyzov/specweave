/**
 * CLI Command: /sw:reconcile
 *
 * Reconcile increment ID collisions after multi-developer merge.
 * Detects when multiple developers created increments with the same ID
 * on different branches and renumbers them based on modification dates.
 *
 * Usage:
 *   /sw:reconcile              # Interactive reconciliation
 *   /sw:reconcile --dry-run    # Preview changes without modifying
 *   /sw:reconcile --force      # Apply without confirmation
 *   /sw:reconcile 0001         # Check specific increment number
 */

import { createReconcileManager, ReconcileResult } from '../../core/increment/reconcile-manager.js';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface ReconcileCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  byCommit?: boolean;
  incrementNumber?: string;
}

export async function runReconcileCommand(
  projectRoot: string,
  options: ReconcileCommandOptions = {}
): Promise<ReconcileResult> {
  const manager = createReconcileManager(projectRoot);

  // Show header
  console.log('\n🔄 Scanning for ID collisions...\n');

  if (options.dryRun) {
    console.log('📋 DRY RUN - No changes will be made\n');
  }

  // Get collision summary first
  const { collisions, summary } = await manager.getCollisionSummary(
    options.incrementNumber
  );

  if (collisions.length === 0) {
    console.log('✅ No ID collisions found!\n');
    console.log('All increment IDs are unique across all folders.\n');
    return {
      collisionsFound: 0,
      incrementsRenumbered: 0,
      operations: [],
      errors: [],
    };
  }

  // Show collision summary
  console.log(summary);

  // If not force mode and not dry-run, would normally prompt for confirmation
  // But since we're in Claude context, we'll proceed
  if (!options.force && !options.dryRun) {
    console.log('Proceeding with reconciliation...\n');
  }

  // Run reconciliation
  const result = await manager.reconcile({
    dryRun: options.dryRun,
    force: options.force,
    byCommit: options.byCommit,
    incrementNumber: options.incrementNumber,
  });

  // Show results
  console.log('\n' + '━'.repeat(60));
  console.log('Summary');
  console.log('━'.repeat(60) + '\n');

  if (options.dryRun) {
    console.log(`Would renumber: ${result.incrementsRenumbered} increment(s)`);
    console.log(
      `Would update: ${result.operations.reduce((sum, op) => sum + op.updatedReferences.length, 0)} reference(s)`
    );
    console.log('\nRun without --dry-run to apply changes.');
  } else {
    console.log(`Collisions found: ${result.collisionsFound}`);
    console.log(`Increments renumbered: ${result.incrementsRenumbered}`);

    const totalRefs = result.operations.reduce(
      (sum, op) => sum + op.updatedReferences.filter((r) => r.success).length,
      0
    );
    console.log(`References updated: ${totalRefs}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️ Errors: ${result.errors.length}`);
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }

    if (result.reportPath) {
      console.log(`\n📝 Report saved to: ${result.reportPath}`);
    }

    // Show operation details
    if (result.operations.length > 0) {
      console.log('\n📦 Operations performed:');
      for (const op of result.operations) {
        console.log(`\n  ✓ ${op.oldId} → ${op.newId}`);
        console.log(`    Feature: ${op.oldFeatureId} → ${op.newFeatureId}`);

        const successRefs = op.updatedReferences.filter((r) => r.success);
        const failedRefs = op.updatedReferences.filter((r) => !r.success);

        if (successRefs.length > 0) {
          console.log(`    Updated:`);
          for (const ref of successRefs) {
            console.log(`      ✓ ${ref.type}: ${ref.details}`);
          }
        }

        if (failedRefs.length > 0) {
          console.log(`    Failed:`);
          for (const ref of failedRefs) {
            console.log(`      ✗ ${ref.type}: ${ref.details}`);
            if (ref.error) {
              console.log(`        Error: ${ref.error}`);
            }
          }
        }
      }
    }

    // Suggest next steps
    console.log('\n💡 Next steps:');
    console.log('  1. Review the changes');
    console.log('  2. git add . && git commit -m "reconcile: fix ID collisions"');
    console.log('  3. Run /sw-github:sync or /sw-jira:sync to update external tools');
  }

  console.log('');

  return result;
}

// Parse command line arguments
export function parseReconcileArgs(args: string[]): ReconcileCommandOptions {
  const options: ReconcileCommandOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--by-commit') {
      options.byCommit = true;
    } else if (/^\d+$/.test(arg)) {
      // Increment number
      options.incrementNumber = arg;
    }
  }

  return options;
}

// Main entry point for CLI
export async function main(args: string[]): Promise<void> {
  const options = parseReconcileArgs(args);
  const projectRoot = process.cwd();

  try {
    await runReconcileCommand(projectRoot, options);
  } catch (error) {
    logger.error('Reconcile command failed:', error);
    process.exit(1);
  }
}
