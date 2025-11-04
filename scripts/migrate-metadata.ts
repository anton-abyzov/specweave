#!/usr/bin/env node

/**
 * Metadata Migration Script
 *
 * Creates metadata.json files for all existing increments
 * following the IncrementMetadata schema defined in increment-metadata.ts
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalents
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

interface IncrementMetadata {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  type: 'feature' | 'hotfix' | 'bug' | 'change-request' | 'refactor' | 'experiment';
  created: string;
  lastActivity: string;
}

/**
 * Parse tasks.md to determine completion status
 */
function getCompletionStatus(tasksPath: string): { completed: boolean; progress: number } {
  if (!fs.existsSync(tasksPath)) {
    return { completed: false, progress: 0 };
  }

  const content = fs.readFileSync(tasksPath, 'utf-8');

  // Count total tasks (#### T-XXX headers)
  const totalMatches = content.match(/^####\s+T-\d+/gm);
  const total = totalMatches ? totalMatches.length : 0;

  if (total === 0) {
    return { completed: false, progress: 0 };
  }

  // Count completed tasks (**Status**: [x] completed)
  const completedMatches = content.match(/\*\*Status\*\*:\s*\[x\]\s*completed/gi);
  const completed = completedMatches ? completedMatches.length : 0;

  const progress = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  return { completed: isComplete, progress };
}

/**
 * Determine increment type from spec.md or default to 'feature'
 */
function getIncrementType(specPath: string): IncrementMetadata['type'] {
  if (!fs.existsSync(specPath)) {
    return 'feature';
  }

  const content = fs.readFileSync(specPath, 'utf-8');

  // Check frontmatter for type
  const typeMatch = content.match(/^type:\s*(\S+)/m);
  if (typeMatch) {
    const type = typeMatch[1].toLowerCase();
    if (['feature', 'hotfix', 'bug', 'change-request', 'refactor', 'experiment'].includes(type)) {
      return type as IncrementMetadata['type'];
    }
  }

  // Default to feature
  return 'feature';
}

/**
 * Get creation date from spec.md or use current date
 */
function getCreationDate(specPath: string): string {
  if (!fs.existsSync(specPath)) {
    return new Date().toISOString();
  }

  const content = fs.readFileSync(specPath, 'utf-8');

  // Check frontmatter for created date
  const createdMatch = content.match(/^created:\s*(\S+)/m);
  if (createdMatch) {
    try {
      return new Date(createdMatch[1]).toISOString();
    } catch {
      // Invalid date format, use current
    }
  }

  // Fallback: use file creation time
  const stats = fs.statSync(specPath);
  return stats.birthtime.toISOString();
}

/**
 * Main migration logic
 */
async function migrate() {
  console.log('🔄 Migrating increment metadata...\n');

  // Find all increment directories
  const entries = fs.readdirSync(incrementsDir, { withFileTypes: true });
  const incrementDirs = entries
    .filter(entry => entry.isDirectory() && /^[0-9]/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  let migrated = 0;
  let skipped = 0;

  for (const dir of incrementDirs) {
    const incrementId = dir.name;
    const incrementPath = path.join(incrementsDir, incrementId);
    const metadataPath = path.join(incrementPath, 'metadata.json');
    const tasksPath = path.join(incrementPath, 'tasks.md');
    const specPath = path.join(incrementPath, 'spec.md');

    // Check if metadata already exists (NEW schema check)
    if (fs.existsSync(metadataPath)) {
      const existing = fs.readJSONSync(metadataPath);
      // If it has the new schema (status, type fields), skip
      if (existing.status && existing.type) {
        console.log(`⏭️  Skipped: ${incrementId} (metadata already exists)`);
        skipped++;
        continue;
      }
      // Otherwise, it's old GitHub sync metadata - will overwrite
    }

    // Determine status from tasks.md
    const { completed, progress } = getCompletionStatus(tasksPath);
    const type = getIncrementType(specPath);
    const created = getCreationDate(specPath);

    const metadata: IncrementMetadata = {
      id: incrementId,
      status: completed ? 'completed' : 'active',
      type,
      created,
      lastActivity: new Date().toISOString()
    };

    // Write metadata
    fs.writeJSONSync(metadataPath, metadata, { spaces: 2 });
    console.log(`✅ Created: ${incrementId} (${metadata.status}, ${progress}% complete)`);
    migrated++;
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   📁 Total:    ${incrementDirs.length}\n`);

  console.log('✨ Migration complete!\n');
}

// Run migration
migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
