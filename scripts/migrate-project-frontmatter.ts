#!/usr/bin/env npx tsx
/**
 * Migration Script: Remove Frontmatter Project Field
 *
 * This script migrates spec.md files to remove the deprecated `project:` field
 * from YAML frontmatter, as per ADR-0140 (v0.35.0+).
 *
 * Per-US `**Project**:` fields are now the PRIMARY source of truth.
 *
 * Usage:
 *   npx tsx scripts/migrate-project-frontmatter.ts [options]
 *
 * Options:
 *   --dry-run     Show changes without modifying files
 *   --verbose     Show detailed logging
 *   --path <dir>  Path to increments directory (default: .specweave/increments)
 *
 * @see ADR-0140: Remove Frontmatter Project Field
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationResult {
  file: string;
  status: 'migrated' | 'skipped' | 'error' | 'no-change';
  reason?: string;
  hadFrontmatterProject?: boolean;
  hasPerUsFields?: boolean;
  backupPath?: string;
}

interface MigrationReport {
  timestamp: string;
  dryRun: boolean;
  results: MigrationResult[];
  summary: {
    total: number;
    migrated: number;
    skipped: number;
    noChange: number;
    errors: number;
  };
}

function parseArgs(args: string[]): { dryRun: boolean; verbose: boolean; incrementsPath: string } {
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  const pathIndex = args.indexOf('--path');
  const incrementsPath =
    pathIndex !== -1 && args[pathIndex + 1]
      ? args[pathIndex + 1]
      : '.specweave/increments';

  return { dryRun, verbose, incrementsPath };
}

function findSpecFiles(basePath: string): string[] {
  const specFiles: string[] = [];

  function scanDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories (including _archive, _paused, _abandoned)
        scanDirectory(fullPath);
      } else if (entry.name === 'spec.md') {
        specFiles.push(fullPath);
      }
    }
  }

  scanDirectory(basePath);
  return specFiles;
}

function extractFrontmatter(content: string): { frontmatter: string; body: string } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

function hasFrontmatterProject(frontmatter: string): boolean {
  return /^project:\s*.+$/m.test(frontmatter);
}

function hasFrontmatterBoard(frontmatter: string): boolean {
  return /^board:\s*.+$/m.test(frontmatter);
}

function hasPerUsProjectFields(content: string): boolean {
  // Check for **Project**: field in user stories (not in frontmatter)
  return /\*\*Project\*\*:\s*\S+/.test(content);
}

function removeFrontmatterProjectField(frontmatter: string): string {
  // Remove project: line (and board: line if present)
  let updated = frontmatter
    .split('\n')
    .filter((line) => !line.match(/^project:\s*/))
    .filter((line) => !line.match(/^board:\s*/))
    .join('\n');

  return updated;
}

function createBackup(filePath: string): string {
  const backupPath = `${filePath}.backup.${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function migrateFile(
  filePath: string,
  dryRun: boolean,
  verbose: boolean
): MigrationResult {
  const result: MigrationResult = {
    file: filePath,
    status: 'no-change',
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = extractFrontmatter(content);

    if (!parsed) {
      result.status = 'skipped';
      result.reason = 'No valid frontmatter found';
      return result;
    }

    const { frontmatter, body } = parsed;
    result.hadFrontmatterProject = hasFrontmatterProject(frontmatter);
    result.hasPerUsFields = hasPerUsProjectFields(content);

    // Check if migration needed
    if (!result.hadFrontmatterProject && !hasFrontmatterBoard(frontmatter)) {
      result.status = 'no-change';
      result.reason = 'No frontmatter project/board field to remove';
      return result;
    }

    // Check if per-US fields exist (required for safe migration)
    if (!result.hasPerUsFields) {
      result.status = 'skipped';
      result.reason = 'No per-US **Project**: fields found - unsafe to remove frontmatter';
      if (verbose) {
        console.warn(`  WARNING: ${filePath} has frontmatter project but no per-US fields!`);
      }
      return result;
    }

    // Perform migration
    const newFrontmatter = removeFrontmatterProjectField(frontmatter);
    const newContent = `---\n${newFrontmatter}\n---\n${body}`;

    if (dryRun) {
      result.status = 'migrated';
      result.reason = 'Would remove frontmatter project/board (dry-run)';
      if (verbose) {
        console.log(`  [DRY-RUN] Would migrate: ${filePath}`);
        console.log(`    - Remove project: field`);
        if (hasFrontmatterBoard(frontmatter)) {
          console.log(`    - Remove board: field`);
        }
      }
    } else {
      // Create backup
      result.backupPath = createBackup(filePath);

      // Write migrated content
      fs.writeFileSync(filePath, newContent, 'utf-8');
      result.status = 'migrated';
      result.reason = 'Removed frontmatter project/board field';

      if (verbose) {
        console.log(`  [MIGRATED] ${filePath}`);
        console.log(`    - Backup: ${result.backupPath}`);
      }
    }

    return result;
  } catch (error) {
    result.status = 'error';
    result.reason = error instanceof Error ? error.message : String(error);
    return result;
  }
}

function generateReport(results: MigrationResult[], dryRun: boolean): MigrationReport {
  const summary = {
    total: results.length,
    migrated: results.filter((r) => r.status === 'migrated').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    noChange: results.filter((r) => r.status === 'no-change').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return {
    timestamp: new Date().toISOString(),
    dryRun,
    results,
    summary,
  };
}

function printSummary(report: MigrationReport): void {
  console.log('\n=== Migration Summary ===');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Mode: ${report.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log('');
  console.log(`Total files scanned: ${report.summary.total}`);
  console.log(`  Migrated: ${report.summary.migrated}`);
  console.log(`  No change needed: ${report.summary.noChange}`);
  console.log(`  Skipped (unsafe): ${report.summary.skipped}`);
  console.log(`  Errors: ${report.summary.errors}`);
  console.log('');

  if (report.summary.skipped > 0) {
    console.log('=== Skipped Files (Need Manual Review) ===');
    for (const result of report.results.filter((r) => r.status === 'skipped')) {
      console.log(`  ${result.file}`);
      console.log(`    Reason: ${result.reason}`);
    }
    console.log('');
  }

  if (report.summary.errors > 0) {
    console.log('=== Errors ===');
    for (const result of report.results.filter((r) => r.status === 'error')) {
      console.log(`  ${result.file}`);
      console.log(`    Error: ${result.reason}`);
    }
    console.log('');
  }

  if (report.dryRun && report.summary.migrated > 0) {
    console.log('=== Files That Would Be Migrated ===');
    for (const result of report.results.filter((r) => r.status === 'migrated')) {
      console.log(`  ${result.file}`);
    }
    console.log('');
    console.log('To apply changes, run without --dry-run flag.');
  }
}

async function main(): Promise<void> {
  const { dryRun, verbose, incrementsPath } = parseArgs(process.argv.slice(2));

  console.log('=== Frontmatter Project Migration Script ===');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Path: ${incrementsPath}`);
  console.log('');

  // Find all spec.md files
  const specFiles = findSpecFiles(incrementsPath);
  console.log(`Found ${specFiles.length} spec.md files`);
  console.log('');

  // Migrate each file
  const results: MigrationResult[] = [];
  for (const file of specFiles) {
    if (verbose) {
      console.log(`Processing: ${file}`);
    }
    const result = migrateFile(file, dryRun, verbose);
    results.push(result);
  }

  // Generate and print report
  const report = generateReport(results, dryRun);
  printSummary(report);

  // Save report to file
  const reportPath = '.specweave/migration-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Report saved to: ${reportPath}`);

  // Exit with error code if any errors
  if (report.summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
