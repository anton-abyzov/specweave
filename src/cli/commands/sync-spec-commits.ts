#!/usr/bin/env node

/**
 * CLI command to sync spec commits to external tools
 *
 * Called by post-task-completion hooks to post commit/PR comments
 * to GitHub issues, JIRA epics, and ADO work items.
 */

import { program } from 'commander';
import { syncSpecCommitsToGitHub } from '../../../plugins/specweave-github/lib/github-spec-commit-sync.js';
import { syncSpecCommitsToJira } from '../../../plugins/specweave-jira/lib/jira-spec-commit-sync.js';
import { syncSpecCommitsToAdo } from '../../../plugins/specweave-ado/lib/ado-spec-commit-sync.js';
import { AdoClientV2 } from '../../../plugins/specweave-ado/lib/ado-client-v2.js';
import { SyncProfile } from '../../core/types/sync-profile.js';
import path from 'path';
import fs from 'fs/promises';

program
  .name('sync-spec-commits')
  .description('Sync spec commits to external tools (GitHub, JIRA, ADO)')
  .option('-i, --increment <path>', 'Path to increment directory')
  .option('-p, --provider <provider>', 'Provider: github, jira, or ado')
  .option('--dry-run', 'Dry run (don\'t actually post comments)')
  .option('-v, --verbose', 'Verbose output')
  .parse(process.argv);

const options = program.opts();

async function main() {
  const incrementPath = options.increment || detectIncrementPath();

  if (!incrementPath) {
    console.error('❌ No increment path specified and could not detect current increment');
    process.exit(1);
  }

  const provider = options.provider || detectProvider(incrementPath);

  if (!provider) {
    console.error('❌ No provider specified and could not detect from metadata');
    process.exit(1);
  }

  console.log(`🔗 Syncing commits for ${path.basename(incrementPath)} to ${provider}...`);

  try {
    switch (provider) {
      case 'github':
        await syncGitHub(incrementPath, options);
        break;
      case 'jira':
        await syncJira(incrementPath, options);
        break;
      case 'ado':
        await syncAdo(incrementPath, options);
        break;
      default:
        console.error(`❌ Unknown provider: ${provider}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error syncing commits: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function syncGitHub(incrementPath: string, options: any) {
  const result = await syncSpecCommitsToGitHub({
    incrementPath,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  if (result.success) {
    console.log(`✅ Posted ${result.commentsPosted} comment(s) to GitHub`);
    if (options.verbose) {
      console.log(`   Commits: ${result.commits.length}`);
      console.log(`   User stories: ${result.userStories.length}`);
    }
  } else {
    console.error(`❌ Sync failed: ${result.errors.join(', ')}`);
    process.exit(1);
  }
}

async function syncJira(incrementPath: string, options: any) {
  // Load JIRA config from environment
  const config = {
    domain: process.env.JIRA_DOMAIN || '',
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || '',
    projectKey: process.env.JIRA_PROJECT_KEY || '',
  };

  if (!config.domain || !config.email || !config.apiToken || !config.projectKey) {
    console.error('❌ JIRA credentials not found in environment');
    console.error('   Required: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY');
    process.exit(1);
  }

  const result = await syncSpecCommitsToJira(config, {
    incrementPath,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  if (result.success) {
    console.log(`✅ Posted ${result.commentsPosted} comment(s) to JIRA`);
    if (options.verbose) {
      console.log(`   Commits: ${result.commits.length}`);
      console.log(`   User stories: ${result.userStories.length}`);
    }
  } else {
    console.error(`❌ Sync failed: ${result.errors.join(', ')}`);
    process.exit(1);
  }
}

async function syncAdo(incrementPath: string, options: any) {
  // Load ADO config from .specweave/config.json
  const projectRoot = incrementPath.split('.specweave')[0];
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  let config: any;
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  } catch {
    console.error('❌ Could not load .specweave/config.json');
    process.exit(1);
  }

  const adoProfile = config.sync?.profiles?.[config.sync?.activeProfile];
  if (!adoProfile || adoProfile.provider !== 'ado') {
    console.error('❌ No ADO sync profile found in config');
    process.exit(1);
  }

  const personalAccessToken = process.env.AZURE_DEVOPS_PAT || '';
  if (!personalAccessToken) {
    console.error('❌ AZURE_DEVOPS_PAT environment variable not set');
    process.exit(1);
  }

  const client = new AdoClientV2(adoProfile as SyncProfile, personalAccessToken);

  const result = await syncSpecCommitsToAdo(client, {
    incrementPath,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  if (result.success) {
    console.log(`✅ Posted ${result.commentsPosted} comment(s) to ADO`);
    if (options.verbose) {
      console.log(`   Commits: ${result.commits.length}`);
      console.log(`   User stories: ${result.userStories.length}`);
    }
  } else {
    console.error(`❌ Sync failed: ${result.errors.join(', ')}`);
    process.exit(1);
  }
}

function detectIncrementPath(): string | null {
  // Try to find most recent increment
  const incrementsDir = path.join(process.cwd(), '.specweave', 'increments');

  try {
    const files = require('fs').readdirSync(incrementsDir);
    const increments = files
      .filter((f: string) => f.match(/^\d{4}-/))
      .sort()
      .reverse();

    if (increments.length > 0) {
      return path.join(incrementsDir, increments[0]);
    }
  } catch {
    // Directory doesn't exist or can't read
  }

  return null;
}

function detectProvider(incrementPath: string): string | null {
  try {
    const metadataPath = path.join(incrementPath, 'metadata.json');
    const metadata = JSON.parse(require('fs').readFileSync(metadataPath, 'utf-8'));

    if (metadata.github?.issue) return 'github';
    if (metadata.jira?.issueKey) return 'jira';
    if (metadata.ado?.workItemId) return 'ado';
  } catch {
    // Metadata not found or invalid
  }

  return null;
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
