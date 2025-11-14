#!/usr/bin/env tsx
/**
 * Migrate flat SPEC files to Epic folder structure
 *
 * OLD Structure:
 *   .specweave/docs/internal/specs/default/SPEC-0001-*.md
 *   .specweave/docs/internal/specs/default/SPEC-0002-*.md
 *
 * NEW Structure:
 *   .specweave/docs/internal/specs/FS-001-core-framework-architecture/
 *     ├── README.md
 *     ├── 0001-core-framework.md
 *     ├── 0002-core-enhancements.md
 *     └── ...
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Epic {
  id: string;
  name: string;
  description: string;
  increments: string[];
  priority: string;
  status: string;
}

interface EpicClassification {
  epics: Epic[];
  metadata: {
    total_epics: number;
    total_increments: number;
    avg_increments_per_epic: number;
    date_created: string;
  };
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const classificationPath = path.join(__dirname, 'epic-classification.json');
  const oldSpecsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', 'default');
  const newSpecsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

  console.log('🔍 Loading Epic classification...');
  const classification: EpicClassification = await fs.readJSON(classificationPath);

  console.log(`\n📊 Migration Plan:`);
  console.log(`   Epics: ${classification.metadata.total_epics}`);
  console.log(`   Increments: ${classification.metadata.total_increments}`);
  console.log(`   Avg per Epic: ${classification.metadata.avg_increments_per_epic.toFixed(2)}`);
  console.log();

  let successCount = 0;
  let errorCount = 0;

  for (const epic of classification.epics) {
    try {
      console.log(`\n📁 Creating Epic: ${epic.id} - ${epic.name}`);

      // Create Epic folder
      const epicFolder = path.join(
        newSpecsDir,
        `${epic.id}-${epic.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`
      );
      await fs.ensureDir(epicFolder);
      console.log(`   ✅ Created folder: ${path.basename(epicFolder)}`);

      // Generate Epic README.md
      const readme = await generateEpicReadme(epic, epicFolder, projectRoot);
      const readmePath = path.join(epicFolder, 'README.md');
      await fs.writeFile(readmePath, readme, 'utf-8');
      console.log(`   ✅ Generated README.md`);

      // Move increment files to Epic folder
      for (const incrementId of epic.increments) {
        const incrementNum = incrementId.split('-')[0]; // Extract "0001" from "0001-core-framework"

        // Find matching SPEC file
        const files = await fs.readdir(oldSpecsDir);
        const matchingFile = files.find((f) => f.startsWith(`SPEC-${incrementNum}-`));

        if (matchingFile) {
          const oldPath = path.join(oldSpecsDir, matchingFile);
          const newPath = path.join(epicFolder, `${incrementId}.md`);

          // Read old file content
          let content = await fs.readFile(oldPath, 'utf-8');

          // Update frontmatter to add epic reference
          content = updateFrontmatter(content, epic.id, incrementId);

          // Write to new location
          await fs.writeFile(newPath, content, 'utf-8');
          console.log(`   ✅ Moved ${matchingFile} → ${incrementId}.md`);

          // Remove old file
          await fs.remove(oldPath);
        } else {
          console.log(`   ⚠️  No file found for increment ${incrementId}`);
        }
      }

      // Move user-stories folder if it exists (for FS-031)
      if (epic.id === 'FS-031') {
        const oldUserStoriesDir = path.join(oldSpecsDir, 'user-stories');
        const newUserStoriesDir = path.join(epicFolder, 'user-stories');

        if (await fs.pathExists(oldUserStoriesDir)) {
          await fs.move(oldUserStoriesDir, newUserStoriesDir);
          console.log(`   ✅ Moved user-stories/ folder`);
        }
      }

      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to migrate Epic ${epic.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n============================================================`);
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📋 Total: ${classification.epics.length}`);
  console.log();

  if (successCount > 0) {
    console.log(`✅ Migration complete!`);
    console.log(`\n📁 New Epic folder structure created in:`);
    console.log(`   ${newSpecsDir}`);
  }
}

async function generateEpicReadme(epic: Epic, epicFolder: string, projectRoot: string): Promise<string> {
  // Extract overview from first increment's spec.md
  let overview = epic.description;

  try {
    const firstIncrementId = epic.increments[0];
    const incrementSpecPath = path.join(
      projectRoot,
      '.specweave',
      'increments',
      firstIncrementId,
      'spec.md'
    );

    if (await fs.pathExists(incrementSpecPath)) {
      const content = await fs.readFile(incrementSpecPath, 'utf-8');

      // Try to extract overview from spec.md
      const overviewMatch = content.match(
        /##\s+(?:Quick\s+)?(?:Overview|Executive\s+Summary)\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i
      );

      if (overviewMatch) {
        overview = overviewMatch[1].trim();
      }
    }
  } catch (error) {
    // Use default description if extraction fails
  }

  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`id: ${epic.id}`);
  lines.push(`title: "${epic.name}"`);
  lines.push(`type: epic`);
  lines.push(`status: ${epic.status}`);
  lines.push(`priority: ${epic.priority}`);
  lines.push(`created: 2025-01-15`);
  lines.push(`last_updated: 2025-11-13`);
  lines.push();
  lines.push(`# External Tool Mapping`);
  lines.push(`external_tools:`);
  lines.push(`  github:`);
  lines.push(`    type: milestone`);
  lines.push(`    id: null`);
  lines.push(`    url: null`);
  lines.push(`  jira:`);
  lines.push(`    type: epic`);
  lines.push(`    key: null`);
  lines.push(`    url: null`);
  lines.push(`  ado:`);
  lines.push(`    type: feature`);
  lines.push(`    id: null`);
  lines.push(`    url: null`);
  lines.push();
  lines.push(`# Increments`);
  lines.push(`increments:`);

  for (const incrementId of epic.increments) {
    lines.push(`  - id: ${incrementId}`);
    lines.push(`    status: complete`);
    lines.push(`    external:`);
    lines.push(`      github: null`);
    lines.push(`      jira: null`);
    lines.push(`      ado: null`);
  }

  lines.push();
  lines.push(`# Progress`);
  lines.push(`total_increments: ${epic.increments.length}`);
  lines.push(`completed_increments: ${epic.increments.length}`);
  lines.push(`progress: 100%`);
  lines.push('---');
  lines.push();

  // Title
  lines.push(`# ${epic.id}: ${epic.name}`);
  lines.push();

  // Overview
  lines.push(overview);
  lines.push();

  // Increments table
  lines.push('---');
  lines.push();
  lines.push('## Increments');
  lines.push();
  lines.push('| Increment | Title | Status | External Links |');
  lines.push('|-----------|-------|--------|----------------|');

  for (const incrementId of epic.increments) {
    const title = incrementId
      .replace(/^\d+-/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    lines.push(
      `| [${incrementId}](${incrementId}.md) | ${title} | ✅ Complete | GitHub • JIRA • ADO |`
    );
  }

  lines.push();

  // External Tool Integration
  lines.push('---');
  lines.push();
  lines.push('## External Tool Integration');
  lines.push();
  lines.push('### GitHub');
  lines.push('- **Milestone**: Not yet synced');
  lines.push(`- **Issues**: ${epic.increments.length} increments`);
  lines.push();
  lines.push('### JIRA');
  lines.push('- **Epic**: Not yet synced');
  lines.push(`- **Stories**: ${epic.increments.length} increments`);
  lines.push();
  lines.push('### Azure DevOps');
  lines.push('- **Feature**: Not yet synced');
  lines.push(`- **User Stories**: ${epic.increments.length} increments`);
  lines.push();

  // Business Value
  lines.push('---');
  lines.push();
  lines.push('## Business Value');
  lines.push();
  lines.push('*To be filled from increment specs*');
  lines.push();

  // Status
  lines.push('---');
  lines.push();
  lines.push(
    `**Status**: ✅ COMPLETE (${epic.increments.length}/${epic.increments.length} increments)`
  );
  lines.push();

  return lines.join('\n');
}

function updateFrontmatter(content: string, epicId: string, incrementId: string): string {
  // Check if frontmatter exists
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    // No frontmatter, add it
    return `---
id: ${incrementId}
epic: ${epicId}
type: feature
status: complete
---

${content}`;
  }

  // Update existing frontmatter
  let frontmatter = frontmatterMatch[1];

  // Add epic field if not present
  if (!frontmatter.includes('epic:')) {
    frontmatter += `\nepic: ${epicId}`;
  }

  // Add external tool mapping if not present
  if (!frontmatter.includes('external:')) {
    frontmatter += `\n\n# External Tool Mapping
external:
  github:
    issue: null
    url: null
  jira:
    story: null
    url: null
  ado:
    user_story: null
    url: null`;
  }

  // Replace frontmatter in content
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
}

main().catch(console.error);
