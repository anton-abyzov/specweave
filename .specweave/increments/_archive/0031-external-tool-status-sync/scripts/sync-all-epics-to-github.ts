#!/usr/bin/env tsx

/**
 * Sync ALL Epic folders to GitHub with new duplicate detection system
 *
 * This script:
 * 1. Finds all Epic folders (FS-*) in specs directory
 * 2. Syncs each Epic to GitHub using GitHubEpicSync
 * 3. Reports results and any duplicates detected
 * 4. Validates that no duplicates were created
 *
 * Note: Uses tsx for TypeScript execution.
 *       Imports from plugins/ source (not dist/) for live code during development.
 */

import { readdir } from 'fs/promises';
import * as path from 'path';
import { GitHubClientV2 } from '../../../../plugins/specweave-github/lib/github-client-v2.js';
import { GitHubEpicSync } from '../../../../plugins/specweave-github/lib/github-epic-sync.js';

const PROJECT_ROOT = process.cwd();
const SPECS_DIR = path.join(PROJECT_ROOT, '.specweave', 'docs', 'internal', 'specs', 'default');

interface SyncResult {
  epicId: string;
  success: boolean;
  milestoneNumber?: number;
  milestoneUrl?: string;
  issuesCreated: number;
  issuesUpdated: number;
  duplicatesDetected: number;
  error?: string;
}

async function main() {
  console.log('\n🔄 Syncing ALL Epics to GitHub');
  console.log('=' .repeat(60));
  console.log('');

  // 1. Find all Epic folders
  console.log('📁 Finding Epic folders...');
  const folders = await readdir(SPECS_DIR);
  const epicFolders = folders.filter(f => f.startsWith('FS-'));

  console.log(`   Found ${epicFolders.length} Epic folders`);
  console.log('');

  // 2. Initialize GitHub client
  console.log('🔧 Initializing GitHub client...');
  const client = GitHubClientV2.fromRepo('anton-abyzov', 'specweave');
  const epicSync = new GitHubEpicSync(client, SPECS_DIR);
  console.log('   ✅ GitHub client ready');
  console.log('');

  // 3. Sync each Epic
  const results: SyncResult[] = [];
  let totalIssuesCreated = 0;
  let totalIssuesUpdated = 0;
  let totalDuplicatesDetected = 0;
  let totalErrors = 0;

  for (const folder of epicFolders) {
    // Extract Epic ID from folder name (e.g., FS-25-11-12-feature-name → FS-25-11-12)
    const epicIdMatch = folder.match(/^(FS-\d{2}-\d{2}-\d{2})/);
    if (!epicIdMatch) {
      console.warn(`   ⚠️  Skipping ${folder} (invalid format)`);
      continue;
    }

    const epicId = epicIdMatch[1];

    console.log(`📦 Syncing ${epicId}...`);

    try {
      const result = await epicSync.syncEpicToGitHub(epicId);

      results.push({
        epicId,
        success: true,
        milestoneNumber: result.milestoneNumber,
        milestoneUrl: result.milestoneUrl,
        issuesCreated: result.issuesCreated,
        issuesUpdated: result.issuesUpdated,
        duplicatesDetected: result.duplicatesDetected,
      });

      totalIssuesCreated += result.issuesCreated;
      totalIssuesUpdated += result.issuesUpdated;
      totalDuplicatesDetected += result.duplicatesDetected;

      console.log(`   ✅ Success: ${result.issuesCreated} created, ${result.issuesUpdated} updated`);
      if (result.duplicatesDetected > 0) {
        console.log(`   🔗 Self-healed: ${result.duplicatesDetected} issues`);
      }
      console.log('');

    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      console.error('');

      results.push({
        epicId,
        success: false,
        issuesCreated: 0,
        issuesUpdated: 0,
        duplicatesDetected: 0,
        error: String(error),
      });

      totalErrors++;
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 4. Print summary
  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ Sync Complete!');
  console.log('=' .repeat(60));
  console.log('');
  console.log(`📊 Summary:`);
  console.log(`   Epics synced: ${results.length}`);
  console.log(`   Issues created: ${totalIssuesCreated}`);
  console.log(`   Issues updated: ${totalIssuesUpdated}`);
  console.log(`   Duplicates self-healed: ${totalDuplicatesDetected}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log('');

  // 5. Print errors if any
  if (totalErrors > 0) {
    console.log('❌ Errors:');
    for (const result of results) {
      if (!result.success) {
        console.log(`   ${result.epicId}: ${result.error}`);
      }
    }
    console.log('');
  }

  // 6. Verify no duplicates in GitHub
  console.log('🔍 Verifying no duplicates in GitHub...');
  const { execSync } = await import('child_process');

  const issuesJson = execSync('gh issue list --state all --limit 300 --json number,title', {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
  });

  const issues = JSON.parse(issuesJson) as Array<{ number: number; title: string }>;

  // Group by title
  const titleGroups = new Map<string, number[]>();
  for (const issue of issues) {
    if (!titleGroups.has(issue.title)) {
      titleGroups.set(issue.title, []);
    }
    titleGroups.get(issue.title)!.push(issue.number);
  }

  // Find duplicates
  const duplicates = Array.from(titleGroups.entries()).filter(([_, numbers]) => numbers.length > 1);

  if (duplicates.length > 0) {
    console.warn(`   ⚠️  WARNING: ${duplicates.length} duplicate title(s) found!`);
    for (const [title, numbers] of duplicates) {
      console.warn(`   - "${title}": Issues #${numbers.join(', #')}`);
    }
  } else {
    console.log(`   ✅ No duplicates found!`);
  }

  console.log('');
  console.log('🎉 All done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
