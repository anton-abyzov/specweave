#!/usr/bin/env tsx
/**
 * Generate hierarchical GitHub issue body for Epic
 *
 * Called by post-increment-planning hook to generate issue body
 * with User Stories and Tasks grouped hierarchically.
 *
 * Usage:
 *   tsx scripts/generate-epic-issue-body.ts <epic-id> <increment-id>
 *
 * Example:
 *   tsx scripts/generate-epic-issue-body.ts FS-25-11-12 0031-external-tool-status-sync
 */

import * as path from 'path';
import { existsSync } from 'fs';
import { EpicContentBuilder } from '../plugins/specweave-github/lib/epic-content-builder.js';

/**
 * Find Epic folder by ID (supports both FS-XXX and date formats)
 */
async function findEpicFolder(epicId: string, specsDir: string): Promise<string | null> {
  const { readdir } = await import('fs/promises');

  const folders = await readdir(specsDir);

  // Try exact match first
  for (const folder of folders) {
    if (folder.startsWith(epicId)) {
      return path.join(specsDir, folder);
    }
  }

  // Try FS-* prefix match (e.g., FS-031 matches FS-031-feature-name)
  const normalizedId = epicId.startsWith('FS-') ? epicId : `FS-${epicId}`;
  for (const folder of folders) {
    if (folder.startsWith(normalizedId)) {
      return path.join(specsDir, folder);
    }
  }

  return null;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: tsx scripts/generate-epic-issue-body.ts <epic-id> <increment-id>');
    console.error('Example: tsx scripts/generate-epic-issue-body.ts FS-25-11-12 0031-external-tool-status-sync');
    process.exit(1);
  }

  const epicId = args[0];
  const incrementId = args[1];

  // Find project root (current directory)
  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', 'default');

  if (!existsSync(specsDir)) {
    console.error(`ERROR: Specs directory not found: ${specsDir}`);
    process.exit(1);
  }

  // Find Epic folder
  const epicFolder = await findEpicFolder(epicId, specsDir);

  if (!epicFolder || !existsSync(path.join(epicFolder, 'FEATURE.md'))) {
    // Epic folder doesn't exist yet (increment planning before living docs sync)
    // Output a placeholder message that indicates epic sync should be done later
    console.error(`⚠️  WARNING: Epic folder not found for ${epicId}`);
    console.error(`   This is expected during initial increment planning.`);
    console.error(`   Run /specweave:sync-docs to create Epic folder, then update issue.`);
    console.error('');
    console.error('FALLBACK_MODE');
    process.exit(2); // Exit code 2 = fallback to simple format
  }

  try {
    // Build issue body using EpicContentBuilder
    const contentBuilder = new EpicContentBuilder(epicFolder, projectRoot);
    const body = await contentBuilder.buildIssueBody();

    // Output the body (stdout for shell script consumption)
    console.log(body);

  } catch (error: any) {
    console.error(`ERROR: Failed to build issue body: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`FATAL ERROR: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
