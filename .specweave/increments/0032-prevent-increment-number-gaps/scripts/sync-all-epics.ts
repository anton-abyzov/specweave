#!/usr/bin/env node
/**
 * Sync All Epic Specs to GitHub
 *
 * This script syncs all Epic folders from .specweave/docs/internal/specs/default/
 * to GitHub Milestones and Issues.
 *
 * Usage:
 *   npx tsx .specweave/increments/0032-prevent-increment-number-gaps/scripts/sync-all-epics.ts
 */

import { readdir } from 'fs/promises';
import * as path from 'path';
import { GitHubClientV2 } from '../../../../plugins/specweave-github/lib/github-client-v2.js';
import { GitHubEpicSync } from '../../../../plugins/specweave-github/lib/github-epic-sync.js';

interface SyncResult {
  epicId: string;
  epicTitle: string;
  success: boolean;
  milestoneNumber?: number;
  milestoneUrl?: string;
  issuesCreated?: number;
  issuesUpdated?: number;
  duplicatesDetected?: number;
  error?: string;
}

async function getAllEpicFolders(specsDir: string): Promise<string[]> {
  const entries = await readdir(specsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('FS-'))
    .map((entry) => entry.name)
    .sort();
}

async function syncAllEpics(): Promise<void> {
  console.log('🚀 Syncing All Epic Specs to GitHub\n');
  console.log('═'.repeat(80));

  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave/docs/internal/specs/default');

  // Get all Epic folders
  const epicFolders = await getAllEpicFolders(specsDir);
  console.log(`\n📦 Found ${epicFolders.length} Epic specs to sync\n`);

  // Initialize GitHub client
  const owner = 'anton-abyzov';
  const repo = 'specweave';

  const client = GitHubClientV2.fromRepo(owner, repo);
  const epicSync = new GitHubEpicSync(client, specsDir);

  // Sync each Epic
  const results: SyncResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < epicFolders.length; i++) {
    const epicId = epicFolders[i];
    console.log(`\n[${ i + 1 }/${epicFolders.length}] Syncing ${epicId}...`);
    console.log('─'.repeat(80));

    try {
      const result = await epicSync.syncEpicToGitHub(epicId);

      results.push({
        epicId,
        epicTitle: epicId.replace(/^FS-\d{2}-\d{2}-\d{2}-/, ''),
        success: true,
        milestoneNumber: result.milestoneNumber,
        milestoneUrl: result.milestoneUrl,
        issuesCreated: result.issuesCreated,
        issuesUpdated: result.issuesUpdated,
        duplicatesDetected: result.duplicatesDetected,
      });

      successCount++;
      console.log(`✅ Success: ${epicId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        epicId,
        epicTitle: epicId.replace(/^FS-\d{2}-\d{2}-\d{2}-/, ''),
        success: false,
        error: errorMessage,
      });

      failureCount++;
      console.error(`❌ Failed: ${epicId}`);
      console.error(`   Error: ${errorMessage}`);
    }

    // Rate limiting: wait 1 second between syncs to avoid GitHub API limits
    if (i < epicFolders.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 SYNC SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\n✅ Successful: ${successCount}/${epicFolders.length}`);
  console.log(`❌ Failed: ${failureCount}/${epicFolders.length}`);

  // Print detailed results
  console.log('\n📋 Detailed Results:\n');

  const successfulResults = results.filter((r) => r.success);
  const failedResults = results.filter((r) => !r.success);

  if (successfulResults.length > 0) {
    console.log('✅ SUCCESSFUL SYNCS:');
    console.log('─'.repeat(80));
    for (const result of successfulResults) {
      console.log(`\n${result.epicId}`);
      console.log(`   Milestone: #${result.milestoneNumber}`);
      console.log(`   URL: ${result.milestoneUrl}`);
      console.log(`   Issues created: ${result.issuesCreated}`);
      console.log(`   Issues updated: ${result.issuesUpdated}`);
      if (result.duplicatesDetected && result.duplicatesDetected > 0) {
        console.log(`   🔗 Self-healed: ${result.duplicatesDetected}`);
      }
    }
  }

  if (failedResults.length > 0) {
    console.log('\n\n❌ FAILED SYNCS:');
    console.log('─'.repeat(80));
    for (const result of failedResults) {
      console.log(`\n${result.epicId}`);
      console.log(`   Error: ${result.error}`);
    }
  }

  // Print totals
  const totalIssuesCreated = successfulResults.reduce(
    (sum, r) => sum + (r.issuesCreated || 0),
    0
  );
  const totalIssuesUpdated = successfulResults.reduce(
    (sum, r) => sum + (r.issuesUpdated || 0),
    0
  );
  const totalSelfHealed = successfulResults.reduce(
    (sum, r) => sum + (r.duplicatesDetected || 0),
    0
  );

  console.log('\n\n📈 TOTALS:');
  console.log('─'.repeat(80));
  console.log(`   Epics synced: ${successCount}`);
  console.log(`   Milestones created/updated: ${successCount}`);
  console.log(`   Issues created: ${totalIssuesCreated}`);
  console.log(`   Issues updated: ${totalIssuesUpdated}`);
  if (totalSelfHealed > 0) {
    console.log(`   🔗 Self-healed (re-linked): ${totalSelfHealed}`);
  }

  console.log('\n✨ All done!\n');
}

// Run the sync
syncAllEpics().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
