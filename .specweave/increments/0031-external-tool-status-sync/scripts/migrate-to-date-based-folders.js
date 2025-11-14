import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration Script: Rename all feature folders to FS-{yy-mm-dd}-{name} format
 *
 * This script:
 * 1. Reads creation dates from each increment's spec.md
 * 2. Renames folders from "feature-name" to "FS-25-11-14-feature-name"
 * 3. Updates FEATURE.md id: field to match new folder name
 * 4. Updates all cross-references in user story files
 */

async function extractCreationDate(incrementId, projectRoot) {
  // Priority 1: spec.md frontmatter (created: field)
  const specPath = path.join(projectRoot, '.specweave', 'increments', incrementId, 'spec.md');

  if (fs.existsSync(specPath)) {
    const content = await fs.readFile(specPath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (frontmatterMatch) {
      try {
        const yaml = await import('yaml');
        const frontmatter = yaml.parse(frontmatterMatch[1]);

        if (frontmatter.created) {
          return formatDateShort(frontmatter.created);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to parse frontmatter for ${incrementId}`);
      }
    }
  }

  // Priority 2: metadata.json
  const metadataPath = path.join(projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      if (metadata.created) {
        return formatDateShort(metadata.created);
      }
    } catch (error) {
      // Fall through
    }
  }

  // Fallback: Use today's date
  return formatDateShort(new Date().toISOString());
}

function formatDateShort(dateString) {
  const date = new Date(dateString);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

async function findIncrementForFeature(featureName, incrementsDir) {
  // Find which increment created this feature
  const increments = (await fs.readdir(incrementsDir))
    .filter(name => name.match(/^\d{4}-/))
    .sort();

  for (const incrementId of increments) {
    const nameMatch = incrementId.match(/^\d+-(.+)/);
    if (!nameMatch) continue;

    const fullName = nameMatch[1];

    // Remove suffixes to get core feature name
    const suffixesToRemove = ['-enhancements', '-improvements', '-fixes', '-updates', '-v2', '-v3'];
    let coreName = fullName;

    for (const suffix of suffixesToRemove) {
      if (coreName.endsWith(suffix)) {
        coreName = coreName.slice(0, -suffix.length);
        break;
      }
    }

    // Check if this matches the feature name
    if (coreName === featureName || fullName === featureName) {
      return incrementId;
    }
  }

  return null;
}

async function migrateAll() {
  const projectRoot = path.resolve(__dirname, '../../../..');
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', 'default');
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

  console.log('🔄 Starting migration to date-based folder names...\n');

  // Get all existing feature folders
  const folders = (await fs.readdir(specsDir))
    .filter(name => {
      const fullPath = path.join(specsDir, name);
      const stats = fs.statSync(fullPath);
      return stats.isDirectory() && !name.startsWith('_') && name !== 'README.md';
    })
    .filter(name => !name.startsWith('FS-')) // Skip already migrated folders
    .sort();

  console.log(`📁 Found ${folders.length} folders to migrate:\n`);

  const migrations = [];

  // Phase 1: Analyze and prepare migrations
  for (const oldFolder of folders) {
    const incrementId = await findIncrementForFeature(oldFolder, incrementsDir);

    if (!incrementId) {
      console.log(`   ⚠️  ${oldFolder}: No matching increment found (will use today's date)`);
      const date = formatDateShort(new Date().toISOString());
      const newFolder = `FS-${date}-${oldFolder}`;
      migrations.push({ oldFolder, newFolder, incrementId: null, date });
      continue;
    }

    const date = await extractCreationDate(incrementId, projectRoot);
    const newFolder = `FS-${date}-${oldFolder}`;

    console.log(`   ✓ ${oldFolder} → ${newFolder} (from ${incrementId}, created: 20${date})`);
    migrations.push({ oldFolder, newFolder, incrementId, date });
  }

  console.log(`\n📦 Prepared ${migrations.length} migrations\n`);

  // Phase 2: Execute migrations
  let success = 0;
  let errors = 0;

  for (const { oldFolder, newFolder } of migrations) {
    try {
      const oldPath = path.join(specsDir, oldFolder);
      const newPath = path.join(specsDir, newFolder);

      // Rename folder
      await fs.rename(oldPath, newPath);

      // Update FEATURE.md id: field
      const featureFile = path.join(newPath, 'FEATURE.md');
      if (fs.existsSync(featureFile)) {
        let content = await fs.readFile(featureFile, 'utf-8');

        // Update frontmatter id
        content = content.replace(/^id: .+$/m, `id: ${newFolder}`);

        // Update main heading
        content = content.replace(/^# [^:]+:/m, `# ${newFolder}:`);

        await fs.writeFile(featureFile, content, 'utf-8');
      }

      // Update all user story files (us-*.md) - update epic: field
      const userStoryFiles = (await fs.readdir(newPath))
        .filter(name => name.startsWith('us-') && name.endsWith('.md'));

      for (const usFile of userStoryFiles) {
        const usPath = path.join(newPath, usFile);
        let content = await fs.readFile(usPath, 'utf-8');

        // Update epic: field in frontmatter
        content = content.replace(/^epic: .+$/m, `epic: ${newFolder}`);

        await fs.writeFile(usPath, content, 'utf-8');
      }

      console.log(`   ✅ Migrated: ${oldFolder} → ${newFolder} (${userStoryFiles.length} user stories updated)`);
      success++;
    } catch (error) {
      console.error(`   ❌ Failed to migrate ${oldFolder}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Migration complete!`);
  console.log(`   Success: ${success}/${migrations.length}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(80));

  if (errors === 0) {
    console.log('\n🎉 All folders successfully migrated to FS-{yy-mm-dd}-{name} format!');
    console.log('   Next: Run living docs sync to verify everything works');
  }
}

migrateAll().catch(console.error);
