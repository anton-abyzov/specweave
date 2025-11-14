#!/usr/bin/env tsx
/**
 * Test Epic Sync to GitHub
 *
 * This script tests the GitHubEpicSync class by syncing a single Epic
 * to GitHub Milestone + Issues.
 *
 * Usage:
 *   npx tsx scripts/test-epic-sync.ts FS-001
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GitHubClientV2 } from '../plugins/specweave-github/lib/github-client-v2.js';
import { GitHubEpicSync } from '../plugins/specweave-github/lib/github-epic-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const epicId = process.argv[2];

  if (!epicId) {
    console.error('Usage: npx tsx scripts/test-epic-sync.ts <epic-id>');
    console.error('Example: npx tsx scripts/test-epic-sync.ts FS-001');
    process.exit(1);
  }

  console.log(`\n🧪 Testing Epic Sync for ${epicId}...\n`);

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
  console.log(`✅ Repository detected: ${repo.owner}/${repo.repo}`);

  // 3. Create client
  const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);

  // 4. Create sync manager
  const projectRoot = path.resolve(__dirname, '..');
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');
  const epicSync = new GitHubEpicSync(client, specsDir);

  // 5. Sync Epic
  try {
    const result = await epicSync.syncEpicToGitHub(epicId);
    console.log(`\n✅ Test successful!`);
    console.log(`   Milestone: ${result.milestoneUrl}`);
    console.log(`   Issues created: ${result.issuesCreated}`);
    console.log(`   Issues updated: ${result.issuesUpdated}`);
  } catch (error) {
    console.error(`\n❌ Test failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main().catch(console.error);
