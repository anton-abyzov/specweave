#!/usr/bin/env ts-node
/**
 * Migration Script: FS-YY-MM-DD-name → FS-NNN-name
 *
 * Converts date-based feature spec folders to sequential numbering.
 * Preserves creation dates in README.md frontmatter.
 *
 * Usage:
 *   npx ts-node scripts/migrate-specs-to-sequential.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const SPECS_DIR = '.specweave/docs/internal/specs';
const DRY_RUN = process.argv.includes('--dry-run');

interface SpecFolder {
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
  creationDate: string;
  featureName: string;
  sequenceNumber: number;
}

/**
 * Extract date from FS-YY-MM-DD-feature-name format
 */
function extractDateFromFolderName(folderName: string): string | null {
  const match = folderName.match(/^FS-(\d{2})-(\d{2})-(\d{2})-/);
  if (!match) return null;

  const [, year, month, day] = match;
  return `20${year}-${month}-${day}`;
}

/**
 * Extract feature name from FS-YY-MM-DD-feature-name format
 */
function extractFeatureName(folderName: string): string | null {
  const match = folderName.match(/^FS-\d{2}-\d{2}-\d{2}-(.+)$/);
  return match ? match[1] : null;
}

/**
 * Scan all project directories for FS-* folders
 */
function scanSpecFolders(projectId: string): SpecFolder[] {
  const projectPath = path.join(SPECS_DIR, projectId);

  if (!fs.existsSync(projectPath)) {
    return [];
  }

  const entries = fs.readdirSync(projectPath, { withFileTypes: true });
  const specFolders: SpecFolder[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('FS-')) continue;

    const creationDate = extractDateFromFolderName(entry.name);
    const featureName = extractFeatureName(entry.name);

    if (!creationDate || !featureName) {
      console.warn(`⚠️  Skipping invalid folder: ${entry.name}`);
      continue;
    }

    specFolders.push({
      oldPath: path.join(projectPath, entry.name),
      newPath: '', // Will be filled after sorting
      oldName: entry.name,
      newName: '', // Will be filled after sorting
      creationDate,
      featureName,
      sequenceNumber: 0, // Will be filled after sorting
    });
  }

  // Sort by creation date (chronological)
  specFolders.sort((a, b) => a.creationDate.localeCompare(b.creationDate));

  // Assign sequential numbers
  specFolders.forEach((folder, index) => {
    folder.sequenceNumber = index + 1;
    folder.newName = `FS-${String(folder.sequenceNumber).padStart(3, '0')}-${folder.featureName}`;
    folder.newPath = path.join(path.dirname(folder.oldPath), folder.newName);
  });

  return specFolders;
}

/**
 * Update README.md frontmatter to include creation date
 */
function updateReadmeFrontmatter(folderPath: string, creationDate: string) {
  const readmePath = path.join(folderPath, 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.warn(`⚠️  No README.md found in ${folderPath}`);
    return;
  }

  let content = fs.readFileSync(readmePath, 'utf-8');

  // Check if frontmatter exists
  if (!content.startsWith('---\n')) {
    // Add frontmatter
    const id = path.basename(folderPath);
    const title = id.replace(/^FS-\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const frontmatter = `---
id: ${id}
title: ${title}
type: epic
created: ${creationDate}
last_updated: ${new Date().toISOString().split('T')[0]}
status: planning
priority: P1
---

`;
    content = frontmatter + content;
  } else {
    // Update existing frontmatter
    const endOfFrontmatter = content.indexOf('---\n', 4);
    if (endOfFrontmatter === -1) {
      console.warn(`⚠️  Invalid frontmatter in ${readmePath}`);
      return;
    }

    let frontmatter = content.substring(4, endOfFrontmatter);

    // Add/update created field
    if (!frontmatter.includes('created:')) {
      frontmatter += `created: ${creationDate}\n`;
    } else {
      frontmatter = frontmatter.replace(/created:.*/, `created: ${creationDate}`);
    }

    content = `---\n${frontmatter}---\n` + content.substring(endOfFrontmatter + 4);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(readmePath, content, 'utf-8');
  }
}

/**
 * Migrate a single project
 */
function migrateProject(projectId: string) {
  console.log(`\n📁 Processing project: ${projectId}`);

  const specFolders = scanSpecFolders(projectId);

  if (specFolders.length === 0) {
    console.log(`   ℹ️  No FS-* folders found`);
    return;
  }

  console.log(`   Found ${specFolders.length} feature spec folders\n`);

  // Show migration plan
  console.log('   Migration Plan:');
  for (const folder of specFolders) {
    console.log(`   ${folder.oldName} → ${folder.newName}`);
    console.log(`      Date: ${folder.creationDate}`);
  }

  if (DRY_RUN) {
    console.log('\n   ℹ️  DRY RUN - No changes made');
    return;
  }

  // Execute migration
  console.log('\n   Executing migration...');
  for (const folder of specFolders) {
    try {
      // 1. Update README.md frontmatter
      updateReadmeFrontmatter(folder.oldPath, folder.creationDate);

      // 2. Rename folder
      fs.renameSync(folder.oldPath, folder.newPath);

      console.log(`   ✅ ${folder.oldName} → ${folder.newName}`);
    } catch (error) {
      console.error(`   ❌ Failed to migrate ${folder.oldName}:`, error);
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 SpecWeave Feature Spec Migration');
  console.log('   FS-YY-MM-DD-name → FS-NNN-name\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Find all projects
  if (!fs.existsSync(SPECS_DIR)) {
    console.error(`❌ Specs directory not found: ${SPECS_DIR}`);
    process.exit(1);
  }

  const projects = fs.readdirSync(SPECS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  if (projects.length === 0) {
    console.log('ℹ️  No projects found');
    return;
  }

  // Migrate each project
  for (const project of projects) {
    migrateProject(project);
  }

  console.log('\n✅ Migration complete!');

  if (DRY_RUN) {
    console.log('\nℹ️  This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n⚠️  Next steps:');
    console.log('   1. Update any references to old folder names in increments');
    console.log('   2. Update living docs sync logic if needed');
    console.log('   3. Commit changes');
  }
}

main();
