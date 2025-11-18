#!/usr/bin/env tsx
/**
 * Sync updated user stories (with tasks) to GitHub issues
 */

import { GitHubClientV2 } from '../../../../plugins/specweave-github/lib/github-client-v2.js';
import { GitHubFeatureSync } from '../../../../plugins/specweave-github/lib/github-feature-sync.js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const projectRoot = process.cwd();
const featureId = 'FS-043';

async function syncToGitHub() {
  console.log('🔄 Syncing FS-043 to GitHub...\n');

  // Create sync profile
  const profile = {
    provider: 'github' as const,
    displayName: 'GitHub (anton-abyzov/specweave)',
    config: {
      owner: process.env.GITHUB_OWNER || 'anton-abyzov',
      repo: process.env.GITHUB_REPO || 'specweave',
      token: process.env.GITHUB_TOKEN!
    },
    timeRange: {
      default: 'last-30-days' as const,
      max: 'last-90-days' as const
    }
  };

  console.log(`📊 Profile:`);
  console.log(`   - Owner: ${profile.config.owner}`);
  console.log(`   - Repo: ${profile.config.repo}`);
  console.log(`   - Token: ${profile.config.token ? '✅ Set' : '❌ Missing'}\n`);

  if (!profile.config.token) {
    console.error('❌ GITHUB_TOKEN not set in .env');
    process.exit(1);
  }

  try {
    // Initialize GitHub client and sync
    const client = new GitHubClientV2(profile);
    const sync = new GitHubFeatureSync(
      client,
      path.join(projectRoot, '.specweave/docs/internal/specs'),
      projectRoot
    );

    console.log('🚀 Starting GitHub sync...\n');

    // Sync feature to GitHub (will update existing issues)
    await sync.syncFeatureToGitHub(featureId);

    console.log('\n✅ GitHub sync completed successfully!');
    console.log('\n📋 Check your GitHub issues:');
    console.log(`   https://github.com/${profile.config.owner}/${profile.config.repo}/milestone/12`);

  } catch (error) {
    console.error('\n❌ GitHub sync failed:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
      if (error.stack) {
        console.error('\n   Stack trace:');
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

syncToGitHub();
