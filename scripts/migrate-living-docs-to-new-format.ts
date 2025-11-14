#!/usr/bin/env node

/**
 * Migration Script: Living Docs to New Format
 *
 * Migrates existing living docs specs to new format with NO duplication.
 *
 * Usage:
 *   npx ts-node scripts/migrate-living-docs-to-new-format.ts
 *   npx ts-node scripts/migrate-living-docs-to-new-format.ts --file FS-001
 *   npx ts-node scripts/migrate-living-docs-to-new-format.ts --dry-run
 */

import fs from 'fs-extra';
import path from 'path';

export interface MigrationOptions {
  dryRun?: boolean;
  file?: string;
  backupDir?: string;
}

export interface MigrationResult {
  file: string;
  success: boolean;
  changes: string[];
  errors: string[];
  backupPath?: string;
}

/**
 * Main migration function
 */
export async function migrateSpecs(options: MigrationOptions = {}): Promise<MigrationResult[]> {
  // Dynamic import of parser utilities
  const { parseLivingDocsSpec, writeLivingDocsSpec, generateRelatedDocsLinks } =
    await import('../dist/spec-parser.js');

  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', 'default');
  const backupDir = options.backupDir || path.join(specsDir, '_backup-before-migration');

  console.log('🔄 Living Docs Migration Tool\n');
  console.log(`📂 Specs directory: ${specsDir}`);
  console.log(`💾 Backup directory: ${backupDir}`);
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }
  console.log('');

  // Ensure backup directory exists (if not dry-run)
  if (!options.dryRun) {
    await fs.ensureDir(backupDir);
  }

  // Get list of spec files to migrate
  let specFiles: string[];

  if (options.file) {
    // Migrate specific file
    const targetFile = options.file.endsWith('.md') ? options.file : `${options.file}.md`;
    const targetPath = path.join(specsDir, targetFile);

    if (!fs.existsSync(targetPath)) {
      // Try with different prefixes
      const prefixes = ['FS-', 'SPEC-', 'spec-'];
      let found = false;

      for (const prefix of prefixes) {
        const tryPath = path.join(specsDir, `${prefix}${options.file}.md`);
        if (fs.existsSync(tryPath)) {
          specFiles = [path.basename(tryPath)];
          found = true;
          break;
        }
      }

      if (!found) {
        console.error(`❌ File not found: ${options.file}`);
        console.error(`   Tried: ${targetPath}`);
        process.exit(1);
      }
    } else {
      specFiles = [targetFile];
    }
  } else {
    // Migrate all specs
    if (!fs.existsSync(specsDir)) {
      console.error(`❌ Specs directory not found: ${specsDir}`);
      process.exit(1);
    }

    const allFiles = await fs.readdir(specsDir);
    specFiles = allFiles.filter(f =>
      f.endsWith('.md') &&
      !f.startsWith('_') &&
      (f.startsWith('FS-') || f.startsWith('SPEC-') || f.startsWith('spec-'))
    );
  }

  if (specFiles.length === 0) {
    console.log('ℹ️  No spec files found to migrate');
    return [];
  }

  console.log(`📋 Found ${specFiles.length} spec file(s) to migrate:\n`);
  specFiles.forEach(f => console.log(`   • ${f}`));
  console.log('');

  // Migrate each spec
  const results: MigrationResult[] = [];

  for (const specFile of specFiles) {
    const result = await migrateSpec(
      path.join(specsDir, specFile),
      backupDir,
      options.dryRun || false,
      projectRoot,
      { parseLivingDocsSpec, writeLivingDocsSpec, generateRelatedDocsLinks }
    );
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Migration Summary\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total: ${results.length}\n`);

  if (failed > 0) {
    console.log('❌ Failed migrations:\n');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   • ${r.file}`);
        r.errors.forEach(e => console.log(`     - ${e}`));
      });
    console.log('');
  }

  if (options.dryRun) {
    console.log('🔍 DRY RUN COMPLETE - No files were modified');
  } else {
    console.log(`💾 Backups saved to: ${backupDir}`);
  }

  return results;
}

/**
 * Migrate a single spec file
 */
export async function migrateSpec(
  specPath: string,
  backupDir: string,
  dryRun: boolean,
  projectRoot: string,
  parserUtils: any
): Promise<MigrationResult> {
  const { parseLivingDocsSpec, writeLivingDocsSpec, generateRelatedDocsLinks } = parserUtils;

  const fileName = path.basename(specPath);
  const result: MigrationResult = {
    file: fileName,
    success: false,
    changes: [],
    errors: [],
  };

  console.log(`📄 Migrating: ${fileName}`);

  try {
    // 1. Parse existing spec
    console.log('   📖 Parsing existing spec...');
    const existingSpec = await parseLivingDocsSpec(specPath);

    // 2. Detect what needs to be removed
    const content = await fs.readFile(specPath, 'utf-8');
    const changes: string[] = [];

    // Check for architecture content (should be links only)
    if (content.includes('## Architecture') || content.includes('## Technical Architecture')) {
      const hasContent = !content.match(/## Architecture[^#]*\[.*?\]\(.*?\)/);
      if (hasContent) {
        changes.push('Remove architecture content (replace with links)');
      }
    }

    // Check for ADR content
    if (content.includes('## Architecture Decision Records') || content.includes('## ADRs')) {
      const hasContent = !content.match(/## (Architecture Decision Records|ADRs)[^#]*\[.*?\]\(.*?\)/);
      if (hasContent) {
        changes.push('Remove ADR content (replace with links)');
      }
    }

    // Check for success metrics
    if (content.includes('## Success Metrics') || content.includes('## Metrics')) {
      changes.push('Remove success metrics (belongs in increment reports)');
    }

    // Check for future enhancements
    if (content.includes('## Future Enhancements') || content.includes('## Roadmap')) {
      changes.push('Remove future enhancements (belongs in roadmap)');
    }

    // Check for implementation details
    if (content.includes('## Implementation Details') || content.includes('## Technical Details')) {
      changes.push('Remove implementation details (belongs in increment specs)');
    }

    if (changes.length === 0) {
      console.log('   ✅ Already in new format (no changes needed)');
      result.success = true;
      result.changes = ['Already in new format'];
      return result;
    }

    console.log(`   🔍 Detected ${changes.length} change(s):`);
    changes.forEach(c => console.log(`      • ${c}`));

    // 3. Create backup
    if (!dryRun) {
      const backupPath = path.join(backupDir, fileName);
      await fs.copy(specPath, backupPath);
      result.backupPath = backupPath;
      console.log(`   💾 Backup created: ${path.basename(backupPath)}`);
    }

    // 4. Generate related docs links
    console.log('   🔗 Generating architecture links...');
    const relatedDocs = generateRelatedDocsLinks(
      {
        id: existingSpec.id,
        title: existingSpec.title,
        overview: existingSpec.overview || '',
        userStories: existingSpec.userStories,
        priority: existingSpec.priority,
        status: existingSpec.status,
        created: existingSpec.created,
        lastUpdated: existingSpec.lastUpdated,
      } as any,
      projectRoot
    );

    // 5. Create new spec with user stories + links only
    const newSpec = {
      ...existingSpec,
      relatedDocs,
    };

    // 6. Write new spec
    if (!dryRun) {
      await writeLivingDocsSpec(specPath, newSpec);
      console.log('   ✅ Migrated successfully');
    } else {
      console.log('   🔍 Would migrate (dry-run)');
    }

    result.success = true;
    result.changes = changes;

  } catch (error) {
    console.error(`   ❌ Migration failed: ${error}`);
    result.errors.push(String(error));
  }

  console.log('');
  return result;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    file: undefined,
    backupDir: undefined,
  };

  // Parse --file argument
  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    options.file = args[fileIndex + 1];
  }

  // Parse --backup-dir argument
  const backupIndex = args.indexOf('--backup-dir');
  if (backupIndex !== -1 && args[backupIndex + 1]) {
    options.backupDir = args[backupIndex + 1];
  }

  try {
    const results = await migrateSpecs(options);

    // Exit with error code if any migration failed
    const failed = results.filter(r => !r.success).length;
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
