#!/usr/bin/env tsx
/**
 * Populate Epic Increment Files with Rich Content
 *
 * Problem: Epic folder increment files are truncated and missing user stories
 * Solution: Copy full content from source increments (.specweave/increments/####-name/spec.md)
 *
 * This script:
 * 1. Reads each Epic folder's README.md to get increment list
 * 2. For each increment, finds source spec.md in .specweave/increments/
 * 3. Extracts key sections: Problem Statement, Solution Overview, User Stories, etc.
 * 4. Writes enriched content to Epic folder increment file
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EpicFrontmatter {
  increments: Array<{
    id: string;
    status: string;
  }>;
}

async function extractUserStories(content: string): Promise<string> {
  // Try to find User Stories section
  const userStoriesMatch = content.match(/##\s+User\s+Stories\s*\n+([\s\S]*?)(?=\n##|\Z)/i);

  if (userStoriesMatch) {
    return userStoriesMatch[1].trim();
  }

  return '';
}

async function populateIncrementFile(
  epicId: string,
  incrementId: string,
  epicFolder: string,
  projectRoot: string
): Promise<void> {
  const incrementFolder = path.join(projectRoot, '.specweave', 'increments', incrementId);
  const sourceSpecPath = path.join(incrementFolder, 'spec.md');
  const targetPath = path.join(epicFolder, `${incrementId}.md`);

  // Check if source spec exists
  if (!(await fs.pathExists(sourceSpecPath))) {
    console.log(`   ⚠️  Source spec not found: ${sourceSpecPath}`);
    return;
  }

  // Read source content
  const sourceContent = await fs.readFile(sourceSpecPath, 'utf-8');

  // Extract frontmatter from source
  const frontmatterMatch = sourceContent.match(/^---\n([\s\S]*?)\n---/);
  let title = incrementId;

  if (frontmatterMatch) {
    try {
      const sourceFrontmatter = yaml.parse(frontmatterMatch[1]);
      title = sourceFrontmatter.title || incrementId;
    } catch (e) {
      // Use default title if parsing fails
    }
  }

  // Create minimal frontmatter for Epic folder file
  const targetFrontmatter = {
    id: incrementId,
    epic: epicId,
    title,
    status: 'complete'
  };

  // Extract main content sections (everything after frontmatter)
  let mainContent = sourceContent;
  if (frontmatterMatch) {
    mainContent = sourceContent.slice(frontmatterMatch[0].length).trim();
  }

  // Remove any existing Implementation History or External sections
  mainContent = mainContent
    .replace(/^##\s+Implementation History[\s\S]*?(?=\n##|\Z)/im, '')
    .replace(/^##\s+External\s+Tool\s+Integration[\s\S]*?(?=\n##|\Z)/im, '')
    .trim();

  // Build new file content
  const newFrontmatter = yaml.stringify(targetFrontmatter);
  const newContent = `---\n${newFrontmatter}---\n\n${mainContent}\n`;

  // Write to Epic folder
  await fs.writeFile(targetPath, newContent, 'utf-8');
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

  console.log(`\n📝 Populating Epic increment files with rich content...\n`);

  // Get all Epic folders (FS-*)
  const folders = await fs.readdir(specsDir);
  const epicFolders = folders.filter((f) => f.startsWith('FS-'));

  let totalFiles = 0;
  let populatedFiles = 0;
  let errorCount = 0;

  for (const epicFolder of epicFolders) {
    const epicPath = path.join(specsDir, epicFolder);
    const stat = await fs.stat(epicPath);

    if (!stat.isDirectory()) continue;

    const epicId = epicFolder.match(/^(FS-\d+)/)?.[1];
    if (!epicId) continue;

    console.log(`📁 ${epicFolder}`);

    // Read Epic README to get increment list
    const readmePath = path.join(epicPath, 'README.md');
    if (!(await fs.pathExists(readmePath))) {
      console.log(`   ⚠️  No README.md found`);
      continue;
    }

    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    const readmeFrontmatterMatch = readmeContent.match(/^---\n([\s\S]*?)\n---/);

    if (!readmeFrontmatterMatch) {
      console.log(`   ⚠️  No frontmatter in README.md`);
      continue;
    }

    const epicFrontmatter = yaml.parse(readmeFrontmatterMatch[1]) as EpicFrontmatter;
    const increments = epicFrontmatter.increments || [];

    for (const increment of increments) {
      const incrementId = increment.id;
      totalFiles++;

      try {
        await populateIncrementFile(epicId, incrementId, epicPath, projectRoot);
        populatedFiles++;
        console.log(`   ✅ Populated: ${incrementId}.md`);
      } catch (error) {
        errorCount++;
        console.error(
          `   ❌ Error populating ${incrementId}.md:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log();
  }

  console.log(`${'='.repeat(60)}`);
  console.log(`\n📊 Population Summary:`);
  console.log(`   ✅ Populated: ${populatedFiles}/${totalFiles}`);
  console.log(`   ❌ Errors: ${errorCount}/${totalFiles}`);
  console.log();

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
