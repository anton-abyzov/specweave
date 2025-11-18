#!/usr/bin/env node

import { validateStatusSync, DesyncResult } from './validate-status-sync.js';
import { SpecFrontmatterUpdater } from '../../core/increment/spec-frontmatter-updater.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

/**
 * Repair options
 */
export interface RepairOptions {
  dryRun?: boolean;
  createBackup?: boolean;
  all?: boolean;
  incrementId?: string;
}

/**
 * Repair result for a single increment
 */
export interface RepairResult {
  incrementId: string;
  oldStatus: string;
  newStatus: string;
  success: boolean;
  error?: string;
  backupPath?: string;
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  timestamp: string;
  incrementId: string;
  oldStatus: string;
  newStatus: string;
  success: boolean;
  error?: string;
  backupPath?: string;
}

/**
 * Create backup of spec.md before repair
 */
export async function createBackup(incrementId: string): Promise<string> {
  const specPath = path.join(process.cwd(), '.specweave', 'increments', incrementId, 'spec.md');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${specPath}.backup-${timestamp}`;

  await fs.copyFile(specPath, backupPath);

  return backupPath;
}

/**
 * Repair a single desync
 */
export async function repairDesync(
  desync: DesyncResult,
  options: RepairOptions = {}
): Promise<RepairResult> {
  const { dryRun = false, createBackup: shouldBackup = true } = options;

  // Dry-run: preview only
  if (dryRun) {
    return {
      incrementId: desync.incrementId,
      oldStatus: desync.specStatus,
      newStatus: desync.metadataStatus,
      success: true,
    };
  }

  try {
    // Create backup if enabled
    let backupPath: string | undefined;
    if (shouldBackup) {
      backupPath = await createBackup(desync.incrementId);
    }

    // Update spec.md to match metadata.json
    await SpecFrontmatterUpdater.updateStatus(desync.incrementId, desync.metadataStatus);

    return {
      incrementId: desync.incrementId,
      oldStatus: desync.specStatus,
      newStatus: desync.metadataStatus,
      success: true,
      backupPath,
    };
  } catch (error) {
    return {
      incrementId: desync.incrementId,
      oldStatus: desync.specStatus,
      newStatus: desync.metadataStatus,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Repair all desyncs or a specific increment
 */
export async function repairStatusDesync(options: RepairOptions = {}): Promise<{
  total: number;
  repaired: number;
  failed: number;
  results: RepairResult[];
}> {
  const { all = false, incrementId, dryRun = false } = options;

  // Get desyncs from validation
  const validation = await validateStatusSync();

  let desyncsToRepair: DesyncResult[] = [];

  if (incrementId) {
    // Repair specific increment
    const desync = validation.desyncs.find((d) => d.incrementId === incrementId);
    if (!desync) {
      throw new Error(`No desync found for increment ${incrementId}`);
    }
    desyncsToRepair = [desync];
  } else if (all) {
    // Repair all desyncs
    desyncsToRepair = validation.desyncs;
  } else {
    throw new Error('Must specify either --all or <incrementId>');
  }

  const results: RepairResult[] = [];

  for (const desync of desyncsToRepair) {
    const result = await repairDesync(desync, options);
    results.push(result);
  }

  const repaired = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: results.length,
    repaired,
    failed,
    results,
  };
}

/**
 * Write audit log
 */
export async function writeAuditLog(results: RepairResult[]): Promise<string> {
  const logsDir = path.join(process.cwd(), '.specweave', 'logs');
  await fs.ensureDir(logsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(logsDir, `status-desync-repair-${timestamp}.json`);

  const entries: AuditEntry[] = results.map((result) => ({
    timestamp: new Date().toISOString(),
    incrementId: result.incrementId,
    oldStatus: result.oldStatus,
    newStatus: result.newStatus,
    success: result.success,
    error: result.error,
    backupPath: result.backupPath,
  }));

  await fs.writeFile(logPath, JSON.stringify(entries, null, 2), 'utf-8');

  return logPath;
}

/**
 * Format repair report
 */
export function formatRepairReport(result: {
  total: number;
  repaired: number;
  failed: number;
  results: RepairResult[];
}, dryRun: boolean = false): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (dryRun) {
    lines.push(chalk.cyan('DRY RUN: Status Desync Repair Preview'));
  } else {
    lines.push('Status Desync Repair Report');
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`Total desyncs: ${result.total}`);
  if (dryRun) {
    lines.push(chalk.cyan(`Would repair: ${result.repaired}`));
    if (result.failed > 0) {
      lines.push(chalk.yellow(`Would fail: ${result.failed}`));
    }
  } else {
    lines.push(chalk.green(`Repaired: ${result.repaired}`));
    if (result.failed > 0) {
      lines.push(chalk.red(`Failed: ${result.failed}`));
    }
  }
  lines.push('');

  for (const repair of result.results) {
    if (dryRun) {
      lines.push(
        chalk.cyan(
          `DRY RUN: Would update ${chalk.bold(repair.incrementId)} from "${repair.oldStatus}" to "${repair.newStatus}"`
        )
      );
    } else if (repair.success) {
      lines.push(
        chalk.green(
          `✅ Repaired ${chalk.bold(repair.incrementId)}: "${repair.oldStatus}" → "${repair.newStatus}"`
        )
      );
      if (repair.backupPath) {
        lines.push(`   Backup: ${repair.backupPath}`);
      }
    } else {
      lines.push(
        chalk.red(
          `❌ Failed ${chalk.bold(repair.incrementId)}: "${repair.oldStatus}" → "${repair.newStatus}"`
        )
      );
      if (repair.error) {
        lines.push(`   Error: ${repair.error}`);
      }
    }
  }

  lines.push('');

  if (!dryRun && result.repaired > 0) {
    lines.push(chalk.green(`✅ ${result.repaired} desync(s) repaired successfully!`));
    lines.push('');
    lines.push('To verify:');
    lines.push(chalk.cyan('  npx specweave validate-status-sync'));
  } else if (dryRun) {
    lines.push(chalk.cyan('To apply these changes:'));
    lines.push(chalk.cyan('  npx specweave repair-status-desync --all'));
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main CLI entry point
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  try {
    // Parse CLI arguments
    const args = argv.slice(2);
    const options: RepairOptions = {
      all: args.includes('--all'),
      dryRun: args.includes('--dry-run'),
      createBackup: !args.includes('--no-backup'),
    };

    // Check for increment ID (non-flag argument)
    const incrementIdArg = args.find((arg) => !arg.startsWith('--'));
    if (incrementIdArg) {
      options.incrementId = incrementIdArg;
    }

    if (options.dryRun) {
      console.log(chalk.cyan('🔍 DRY RUN MODE: No files will be modified\n'));
    } else {
      console.log('🔧 Repairing status desyncs...\n');
    }

    const result = await repairStatusDesync(options);
    const report = formatRepairReport(result, options.dryRun);

    console.log(report);

    // Write audit log (skip in dry-run mode)
    if (!options.dryRun && result.total > 0) {
      const logPath = await writeAuditLog(result.results);
      console.log(chalk.gray(`Audit log: ${logPath}\n`));
    }

    // Exit with error code if any repairs failed
    if (result.failed > 0 && !options.dryRun) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error during repair:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
