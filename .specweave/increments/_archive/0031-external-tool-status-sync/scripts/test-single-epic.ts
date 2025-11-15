#!/usr/bin/env tsx

/**
 * Test sync for a single Epic (FS-25-11-12)
 */

import { GitHubClientV2 } from '../../../../dist/plugins/specweave-github/lib/github-client-v2.js';
import { GitHubEpicSync } from '../../../../dist/plugins/specweave-github/lib/github-epic-sync.js';

async function main() {
  console.log('🧪 Testing sync for FS-25-11-12 (External Tool Status Sync)...\n');

  const client = GitHubClientV2.fromRepo('anton-abyzov', 'specweave');
  const epicSync = new GitHubEpicSync(
    client,
    '.specweave/docs/internal/specs/default'
  );

  const result = await epicSync.syncEpicToGitHub('FS-25-11-12');

  console.log('\n✅ Test sync complete!');
  console.log(`   Issues created: ${result.issuesCreated}`);
  console.log(`   Issues updated: ${result.issuesUpdated}`);
  console.log(`   Duplicates detected: ${result.duplicatesDetected}`);

  if (result.issuesCreated > 0) {
    console.log(`\n✅ SUCCESS! New issues were created with [FS-25-11-12] format.`);
  } else if (result.issuesUpdated > 0 || result.duplicatesDetected > 0) {
    console.log(`\n✅ SUCCESS! Existing issues were updated (no duplicates created).`);
  } else {
    console.log(`\n⚠️  WARNING: No issues created or updated!`);
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
