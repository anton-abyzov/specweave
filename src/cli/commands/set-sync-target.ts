/**
 * Set Sync Target CLI Command (v1.0.31+ - ADR-0211)
 *
 * Sets the external tool sync target for an increment.
 * Called by post-increment-planning hook to ensure all increments
 * have explicit sync targets.
 *
 * Usage:
 *   specweave set-sync-target <increment-id> [--project <project-id>]
 *
 * @module cli/commands/set-sync-target
 */

import { Command } from 'commander';
import { ExternalToolResolver } from '../../core/sync/external-tool-resolver.js';
import { MetadataManager } from '../../core/increment/metadata-manager.js';
import { consoleLogger, Logger } from '../../utils/logger.js';
import * as fs from '../../utils/fs-native.js';
import * as path from 'path';

interface SetSyncTargetOptions {
  project?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Resolve and set the sync target for an increment
 */
async function setSyncTarget(
  incrementId: string,
  options: SetSyncTargetOptions,
  logger: Logger = consoleLogger
): Promise<{ success: boolean; message: string; syncTarget?: any }> {
  const projectRoot = process.cwd();
  const resolver = new ExternalToolResolver(projectRoot, { logger });

  // Check if increment exists
  const incrementPath = path.join(projectRoot, '.specweave', 'increments', incrementId);
  if (!fs.existsSync(incrementPath)) {
    return {
      success: false,
      message: `Increment not found: ${incrementId}`,
    };
  }

  // Resolve the sync target
  const resolution = await resolver.resolveForIncrement(incrementId, options.project);

  if (options.verbose) {
    logger.info('Resolution path:');
    resolution.resolutionPath.forEach(step => logger.info(`  → ${step}`));
    if (resolution.warnings.length > 0) {
      logger.warn('Warnings:');
      resolution.warnings.forEach(w => logger.warn(`  ⚠️  ${w}`));
    }
  }

  if (!resolution.syncTarget) {
    return {
      success: false,
      message: 'No external tool configured. Run `specweave init` to set up external integration.',
    };
  }

  // Set the sync target in metadata
  if (!options.dryRun) {
    MetadataManager.setSyncTarget(incrementId, resolution.syncTarget);
    logger.info(`✅ Sync target set for ${incrementId}:`);
    logger.info(`   Profile: ${resolution.syncTarget.profileId}`);
    logger.info(`   Provider: ${resolution.syncTarget.provider}`);
    logger.info(`   Derived from: ${resolution.syncTarget.derivedFrom}`);
  } else {
    logger.info(`[DRY-RUN] Would set sync target for ${incrementId}:`);
    logger.info(`   Profile: ${resolution.syncTarget.profileId}`);
    logger.info(`   Provider: ${resolution.syncTarget.provider}`);
    logger.info(`   Derived from: ${resolution.syncTarget.derivedFrom}`);
  }

  return {
    success: true,
    message: `Sync target set: ${resolution.syncTarget.profileId} (${resolution.syncTarget.provider})`,
    syncTarget: resolution.syncTarget,
  };
}

/**
 * Validate sync target configuration for an increment
 */
async function validateSyncTarget(
  incrementId: string,
  options: SetSyncTargetOptions,
  logger: Logger = consoleLogger
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const projectRoot = process.cwd();
  const resolver = new ExternalToolResolver(projectRoot, { logger });

  const validation = await resolver.validateIncrementConfig(incrementId, options.project);

  if (validation.valid) {
    logger.info(`✅ External tool configuration valid for ${incrementId}`);
    if (validation.syncTarget) {
      logger.info(`   Target: ${validation.syncTarget.profileId} (${validation.syncTarget.provider})`);
    }
  } else {
    logger.error(`❌ External tool configuration invalid for ${incrementId}`);
    validation.errors.forEach(e => logger.error(`   • ${e}`));
    if (validation.suggestions && validation.suggestions.length > 0) {
      logger.info('Suggestions:');
      validation.suggestions.forEach(s => logger.info(`   💡 ${s}`));
    }
  }

  if (validation.warnings.length > 0) {
    logger.warn('Warnings:');
    validation.warnings.forEach(w => logger.warn(`   ⚠️  ${w}`));
  }

  return {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

/**
 * Create the set-sync-target command
 */
export function createSetSyncTargetCommand(): Command {
  const command = new Command('set-sync-target')
    .description('Set external tool sync target for an increment (v1.0.31+)')
    .argument('<increment-id>', 'Increment ID (e.g., 0142-feature)')
    .option('-p, --project <project-id>', 'Project ID from spec.md (for project-based resolution)')
    .option('-v, --verbose', 'Show resolution path and details')
    .option('--dry-run', 'Show what would be set without making changes')
    .option('--validate-only', 'Only validate configuration, do not set')
    .action(async (incrementId: string, options: SetSyncTargetOptions & { validateOnly?: boolean }) => {
      const logger = consoleLogger;

      if (options.validateOnly) {
        const result = await validateSyncTarget(incrementId, options, logger);
        process.exit(result.valid ? 0 : 1);
      } else {
        const result = await setSyncTarget(incrementId, options, logger);
        process.exit(result.success ? 0 : 1);
      }
    });

  return command;
}

// Export for testing
export { setSyncTarget, validateSyncTarget };
