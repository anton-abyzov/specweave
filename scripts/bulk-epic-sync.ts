#!/usr/bin/env tsx
/**
 * Bulk Epic Sync to GitHub
 *
 * Syncs multiple Epics to GitHub in one go.
 * Useful for syncing last N increments or all Epics.
 *
 * Usage:
 *   npx tsx scripts/bulk-epic-sync.ts --all
 *   npx tsx scripts/bulk-epic-sync.ts --last-10
 *   npx tsx scripts/bulk-epic-sync.ts FS-001 FS-002 FS-003
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GitHubClientV2 } from '../plugins/specweave-github/lib/github-client-v2.js';
import { GitHubEpicSync } from '../plugins/specweave-github/lib/github-epic-sync.js';
import * as yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EpicClassification {
  epics: Array<{
    id: string;
    name: string;
    description: string;
    increments: string[];
    priority: string;
    status: string;
  }>;
  metadata: {
    total_epics: number;
    total_increments: number;
    avg_increments_per_epic: number;
    date_created: string;
  };
}

/**
 * Get Epics that contain the last N increments
 */
function getEpicsForLastIncrements(
  classification: EpicClassification,
  lastN: number
): string[] {
  // Get all increments, sorted by ID (descending)
  const allIncrements = classification.epics
    .flatMap((epic) => epic.increments.map((inc) => ({ epic: epic.id, increment: inc })))
    .sort((a, b) => {
      const numA = parseInt(a.increment.split('-')[0], 10);
      const numB = parseInt(b.increment.split('-')[0], 10);
      return numB - numA; // Descending
    });

  // Take last N increments
  const lastIncrements = allIncrements.slice(0, lastN);

  // Get unique Epic IDs
  const epicIds = [...new Set(lastIncrements.map((item) => item.epic))];

  console.log(`\n📊 Last ${lastN} increments span ${epicIds.length} Epics:`);
  epicIds.forEach((epicId) => {
    const count = lastIncrements.filter((item) => item.epic === epicId).length;
    const increments = lastIncrements
      .filter((item) => item.epic === epicId)
      .map((item) => item.increment)
      .join(', ');
    console.log(`   ${epicId}: ${count} increments (${increments})`);
  });

  return epicIds;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Usage:
  npx tsx scripts/bulk-epic-sync.ts --all               # Sync all Epics
  npx tsx scripts/bulk-epic-sync.ts --last-10           # Sync Epics with last 10 increments
  npx tsx scripts/bulk-epic-sync.ts FS-001 FS-002       # Sync specific Epics

Options:
  --all       Sync all Epics from epic-classification.json
  --last-10   Sync Epics containing last 10 increments
  --last-5    Sync Epics containing last 5 increments
  --dry-run   Show what would be synced without actually syncing
`);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');

  console.log(`\n🚀 Bulk Epic Sync to GitHub`);
  if (dryRun) {
    console.log('   (DRY RUN - no changes will be made)');
  }
  console.log();

  // 1. Check GitHub CLI
  const cliCheck = await GitHubClientV2.checkCLI();
  if (!cliCheck.installed || !cliCheck.authenticated) {
    console.error(`❌ GitHub CLI issue: ${cliCheck.error}`);
    process.exit(1);
  }
  console.log('✅ GitHub CLI authenticated');

  // 2. Detect repository
  const repo = await GitHubClientV2.detectRepo();
  if (!repo) {
    console.error('❌ Could not detect GitHub repository from git remote');
    process.exit(1);
  }
  console.log(`✅ Repository detected: ${repo.owner}/${repo.repo}\n`);

  // 3. Load Epic classification
  const projectRoot = path.resolve(__dirname, '..');
  const classificationPath = path.join(__dirname, 'epic-classification.json');
  const classification: EpicClassification = await fs.readJSON(classificationPath);

  // 4. Determine which Epics to sync
  let epicIds: string[] = [];

  if (args[0] === '--all') {
    epicIds = classification.epics.map((epic) => epic.id);
    console.log(`📦 Syncing ALL ${epicIds.length} Epics\n`);
  } else if (args[0].startsWith('--last-')) {
    const n = parseInt(args[0].replace('--last-', ''), 10);
    if (isNaN(n)) {
      console.error(`❌ Invalid number: ${args[0]}`);
      process.exit(1);
    }
    epicIds = getEpicsForLastIncrements(classification, n);
    console.log();
  } else {
    epicIds = args.filter((arg) => !arg.startsWith('--'));
    console.log(`📦 Syncing ${epicIds.length} specific Epics: ${epicIds.join(', ')}\n`);
  }

  if (epicIds.length === 0) {
    console.error('❌ No Epics to sync');
    process.exit(1);
  }

  if (dryRun) {
    console.log('✅ Dry run complete - these Epics would be synced:');
    epicIds.forEach((id) => console.log(`   - ${id}`));
    process.exit(0);
  }

  // 5. Create client and sync manager
  const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');
  const epicSync = new GitHubEpicSync(client, specsDir);

  // 6. Sync each Epic
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ epicId: string; error: string }> = [];

  for (const epicId of epicIds) {
    try {
      const result = await epicSync.syncEpicToGitHub(epicId);
      successCount++;
      console.log(`   ✅ ${epicId}: Milestone #${result.milestoneNumber}, ${result.issuesCreated} created, ${result.issuesUpdated} updated\n`);
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ epicId, error: errorMsg });
      console.error(`   ❌ ${epicId}: ${errorMsg}\n`);
    }
  }

  // 7. Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 Bulk Sync Summary:`);
  console.log(`   ✅ Successful: ${successCount}/${epicIds.length}`);
  console.log(`   ❌ Failed: ${errorCount}/${epicIds.length}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors:`);
    errors.forEach(({ epicId, error }) => {
      console.log(`   ${epicId}: ${error}`);
    });
  }

  console.log();

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
