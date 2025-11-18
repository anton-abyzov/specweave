#!/usr/bin/env node

import { MetadataManager } from '../../core/increment/metadata-manager.js';
import { SpecFrontmatterUpdater } from '../../core/increment/spec-frontmatter-updater.js';
import { IncrementStatus } from '../../core/types/increment-metadata.js';
import chalk from 'chalk';

/**
 * Severity levels for status desyncs
 */
export enum DesyncSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Desync detection result
 */
export interface DesyncResult {
  incrementId: string;
  metadataStatus: IncrementStatus;
  specStatus: IncrementStatus;
  severity: DesyncSeverity;
  impact: string;
  fix: string;
}

/**
 * Calculate severity of a status desync
 */
export function calculateSeverity(
  metadataStatus: IncrementStatus,
  specStatus: IncrementStatus
): { severity: DesyncSeverity; impact: string } {
  // CRITICAL: Status line will show wrong increment (completed marked as active in spec.md)
  if (
    (metadataStatus === IncrementStatus.COMPLETED ||
      metadataStatus === IncrementStatus.PAUSED ||
      metadataStatus === IncrementStatus.ABANDONED) &&
    specStatus === IncrementStatus.ACTIVE
  ) {
    return {
      severity: DesyncSeverity.CRITICAL,
      impact:
        'Status line shows completed/paused/abandoned increment as active. Developers see wrong current work.',
    };
  }

  // HIGH: Inverse desync - metadata says active but spec says completed
  if (
    metadataStatus === IncrementStatus.ACTIVE &&
    (specStatus === IncrementStatus.COMPLETED ||
      specStatus === IncrementStatus.PAUSED ||
      specStatus === IncrementStatus.ABANDONED)
  ) {
    return {
      severity: DesyncSeverity.HIGH,
      impact:
        'Active increment appears completed/paused in spec.md. External tools may close issue prematurely.',
    };
  }

  // MEDIUM: Paused/completed confusion
  if (
    metadataStatus === IncrementStatus.PAUSED &&
    (specStatus === IncrementStatus.COMPLETED || specStatus === IncrementStatus.ACTIVE)
  ) {
    return {
      severity: DesyncSeverity.MEDIUM,
      impact: 'Workflow state confusion. Increment may appear in wrong status.',
    };
  }

  // LOW: Other combinations (rare, minimal impact)
  return {
    severity: DesyncSeverity.LOW,
    impact: 'Minor status inconsistency. Limited user impact.',
  };
}

/**
 * Validate status sync across all increments
 */
export async function validateStatusSync(): Promise<{
  total: number;
  synced: number;
  desynced: number;
  desyncs: DesyncResult[];
}> {
  const allIncrements = MetadataManager.getAll();
  const desyncs: DesyncResult[] = [];
  let syncedCount = 0;

  for (const metadata of allIncrements) {
    try {
      const specStatus = await SpecFrontmatterUpdater.readStatus(metadata.id);

      // Skip if spec.md missing or status field missing (graceful degradation)
      if (!specStatus) {
        continue;
      }

      // Check for desync
      if (specStatus !== metadata.status) {
        const { severity, impact } = calculateSeverity(metadata.status, specStatus);

        desyncs.push({
          incrementId: metadata.id,
          metadataStatus: metadata.status,
          specStatus: specStatus,
          severity,
          impact,
          fix: `Run: npx specweave repair-status-desync ${metadata.id}`,
        });
      } else {
        syncedCount++; // Only count as synced if we validated AND they match
      }
    } catch (error) {
      // Skip increments with read errors (e.g., corrupted spec.md)
      console.warn(
        `Warning: Could not read spec.md for ${metadata.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }
  }

  return {
    total: allIncrements.length, // All increments scanned
    synced: syncedCount, // Only increments where spec.md exists AND matches
    desynced: desyncs.length,
    desyncs: desyncs.sort((a, b) => {
      // Sort by severity: CRITICAL > HIGH > MEDIUM > LOW
      const severityOrder = {
        [DesyncSeverity.CRITICAL]: 0,
        [DesyncSeverity.HIGH]: 1,
        [DesyncSeverity.MEDIUM]: 2,
        [DesyncSeverity.LOW]: 3,
      };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
  };
}

/**
 * Format and print validation report
 */
export function formatReport(result: {
  total: number;
  synced: number;
  desynced: number;
  desyncs: DesyncResult[];
}): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('Status Sync Validation Report');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`Total increments scanned: ${result.total}`);
  lines.push(`Synced (✅): ${result.synced}`);
  lines.push(`Desynced (❌): ${result.desynced}`);
  lines.push('');

  if (result.desynced === 0) {
    lines.push(chalk.green('✅ All increments in sync! No desyncs detected.'));
  } else {
    lines.push(chalk.red(`❌ ${result.desynced} desync(s) detected:`));
    lines.push('');

    for (const desync of result.desyncs) {
      const severityColor =
        desync.severity === DesyncSeverity.CRITICAL
          ? chalk.red
          : desync.severity === DesyncSeverity.HIGH
            ? chalk.yellow
            : desync.severity === DesyncSeverity.MEDIUM
              ? chalk.blue
              : chalk.gray;

      lines.push(`Increment: ${chalk.bold(desync.incrementId)}`);
      lines.push(`  Severity: ${severityColor(desync.severity)}`);
      lines.push(`  metadata.json: "${desync.metadataStatus}"`);
      lines.push(`  spec.md: "${desync.specStatus}"`);
      lines.push(`  Impact: ${desync.impact}`);
      lines.push(`  Fix: ${chalk.cyan(desync.fix)}`);
      lines.push('');
    }

    lines.push('To repair all desyncs:');
    lines.push(chalk.cyan('  npx specweave repair-status-desync --all'));
    lines.push('');
    lines.push('To preview changes without modifying files:');
    lines.push(chalk.cyan('  npx specweave repair-status-desync --all --dry-run'));
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main CLI entry point
 */
export async function main(): Promise<void> {
  try {
    console.log('🔍 Validating status sync across all increments...\n');

    const result = await validateStatusSync();
    const report = formatReport(result);

    console.log(report);

    // Exit with error code if desyncs found
    if (result.desynced > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error during validation:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
