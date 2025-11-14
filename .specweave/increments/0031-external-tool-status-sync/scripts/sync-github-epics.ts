#!/usr/bin/env tsx
/**
 * Re-sync GitHub epics after task migration
 *
 * This script updates GitHub issues for increments that were migrated
 * from OLD format (no AC fields) to NEW format (with AC fields and User Story links).
 *
 * After migration:
 * 1. tasks.md has **AC**: fields
 * 2. tasks.md has **User Story**: links
 * 3. Living docs synced (user story files have task links)
 * 4. This script updates GitHub issues to show tasks
 */

import { GitHubEpicSync } from '../../../../plugins/specweave-github/lib/github-epic-sync.js';
import { GitHubClientV2 } from '../../../../plugins/specweave-github/lib/github-client-v2.js';
import path from 'path';

async function main() {
  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', 'default');

  // Initialize GitHub client (anton-abyzov/specweave)
  const client = GitHubClientV2.fromRepo('anton-abyzov', 'specweave');

  // Initialize epic sync
  const epicSync = new GitHubEpicSync(client, specsDir);

  // List of epics to sync (migrated increments)
  const epics = [
    { id: 'FS-25-10-29-intelligent-model-selection', incrementId: '0003' },
    { id: 'FS-25-11-03-plugin-architecture', incrementId: '0004' },
    { id: 'FS-25-11-03-llm-native-i18n', incrementId: '0006' },
  ];

  console.log('🚀 GitHub Epic Re-Sync Script');
  console.log(`   Mode: Update existing issues with task data`);
  console.log(`   Epics: ${epics.length}`);
  console.log('');

  for (const epic of epics) {
    try {
      console.log(`\n════════════════════════════════════════`);
      console.log(`📦 Epic: ${epic.id}`);
      console.log(`   Increment: ${epic.incrementId}`);
      console.log(`════════════════════════════════════════`);

      const result = await epicSync.syncEpicToGitHub(epic.id);

      console.log(`\n✅ Epic ${epic.id} synced successfully`);
      console.log(`   📊 Milestone: #${result.milestoneNumber}`);
      console.log(`   🔗 URL: ${result.milestoneUrl}`);
      console.log(`   ➕ Issues created: ${result.issuesCreated}`);
      console.log(`   🔄 Issues updated: ${result.issuesUpdated}`);
      console.log(`   🛡️  Duplicates detected: ${result.duplicatesDetected}`);

    } catch (error: any) {
      console.error(`\n❌ Error syncing ${epic.id}: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }

  console.log('\n\n════════════════════════════════════════');
  console.log('✅ GitHub Epic Re-Sync Complete!');
  console.log('════════════════════════════════════════');
  console.log('\nNext steps:');
  console.log('  1. Check GitHub issues:');
  console.log('     - https://github.com/anton-abyzov/specweave/issues/22 (0003)');
  console.log('     - https://github.com/anton-abyzov/specweave/issues/23 (0004)');
  console.log('     - https://github.com/anton-abyzov/specweave/issues/25 (0006)');
  console.log('  2. Verify task sections show task counts');
  console.log('  3. Verify user story checkboxes are present');
  console.log('');
}

main().catch(console.error);
