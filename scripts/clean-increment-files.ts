#!/usr/bin/env tsx
/**
 * Clean Increment Files - Remove clutter from Epic folder increment files
 *
 * Problems to fix:
 * 1. Too much frontmatter with null values
 * 2. Implementation History sections
 * 3. Empty User Stories sections
 * 4. External Tool Integration sections with N/A
 *
 * Goal: Keep ONLY the main feature description
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface IncrementFrontmatter {
  id: string;
  epic: string;
  title?: string;
  status?: string;
  type?: string;
  [key: string]: any;
}

async function cleanIncrementFile(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    console.log(`   ⚠️  No frontmatter: ${path.basename(filePath)}`);
    return;
  }

  const frontmatter = yaml.parse(match[1]) as IncrementFrontmatter;
  const bodyContent = content.slice(match[0].length).trim();

  // Extract main feature description (everything before "## Implementation History")
  const mainContent = bodyContent.split(/^##\s+Implementation History/m)[0].trim();

  // Remove other unwanted sections
  const cleanedContent = mainContent
    .replace(/^##\s+External Tool Integration[\s\S]*$/m, '')
    .replace(/^##\s+User Stories\s*\n+---/m, '')
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .trim();

  // Create minimal frontmatter (ONLY essential fields)
  const minimalFrontmatter: IncrementFrontmatter = {
    id: frontmatter.id,
    epic: frontmatter.epic,
  };

  // Add optional fields if they exist and are not null/empty
  if (frontmatter.title) {
    minimalFrontmatter.title = frontmatter.title;
  }
  if (frontmatter.status && frontmatter.status !== 'null') {
    minimalFrontmatter.status = frontmatter.status;
  }
  if (frontmatter.type && frontmatter.type !== 'epic') {
    minimalFrontmatter.type = frontmatter.type;
  }

  // External tool mapping (if exists and has values)
  if (frontmatter.external) {
    const hasValues =
      (frontmatter.external.github && frontmatter.external.github.issue) ||
      (frontmatter.external.jira && frontmatter.external.jira.story) ||
      (frontmatter.external.ado && frontmatter.external.ado.user_story);

    if (hasValues) {
      minimalFrontmatter.external = {};
      if (frontmatter.external.github?.issue) {
        minimalFrontmatter.external.github = {
          issue: frontmatter.external.github.issue,
          url: frontmatter.external.github.url,
        };
      }
      if (frontmatter.external.jira?.story) {
        minimalFrontmatter.external.jira = {
          story: frontmatter.external.jira.story,
          url: frontmatter.external.jira.url,
        };
      }
      if (frontmatter.external.ado?.user_story) {
        minimalFrontmatter.external.ado = {
          user_story: frontmatter.external.ado.user_story,
          url: frontmatter.external.ado.url,
        };
      }
    }
  }

  // Build new file content
  const newFrontmatter = yaml.stringify(minimalFrontmatter);
  const newContent = `---\n${newFrontmatter}---\n\n${cleanedContent}\n`;

  // Write cleaned content
  await fs.writeFile(filePath, newContent, 'utf-8');
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

  console.log(`\n🧹 Cleaning increment files in Epic folders...\n`);

  // Get all Epic folders (FS-*)
  const folders = await fs.readdir(specsDir);
  const epicFolders = (folders as string[]).filter((f) => f.startsWith('FS-'));

  let totalFiles = 0;
  let cleanedFiles = 0;
  let errorCount = 0;

  for (const epicFolder of epicFolders) {
    const epicPath = path.join(specsDir, epicFolder);
    const stat = await fs.stat(epicPath);

    if (!stat.isDirectory()) continue;

    console.log(`📁 ${epicFolder}`);

    // Get all increment files (####-*.md, but not README.md)
    const files = await fs.readdir(epicPath);
    const incrementFiles = (files as string[]).filter(
      (f) => f.match(/^\d{4}-.*\.md$/) && f !== 'README.md'
    );

    for (const file of incrementFiles) {
      const filePath = path.join(epicPath, file);
      totalFiles++;

      try {
        await cleanIncrementFile(filePath);
        cleanedFiles++;
        console.log(`   ✅ Cleaned: ${file}`);
      } catch (error) {
        errorCount++;
        console.error(
          `   ❌ Error cleaning ${file}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log();
  }

  console.log(`${'='.repeat(60)}`);
  console.log(`\n📊 Cleanup Summary:`);
  console.log(`   ✅ Cleaned: ${cleanedFiles}/${totalFiles}`);
  console.log(`   ❌ Errors: ${errorCount}/${totalFiles}`);
  console.log();

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
