#!/usr/bin/env node

/**
 * CLI command to sync spec CONTENT to external tools
 *
 * Syncs title, description, and user stories from spec.md to:
 * - GitHub Issues
 * - JIRA Epics
 * - Azure DevOps Features
 *
 * Does NOT sync status - that's managed by external tool.
 */

import { program } from 'commander';
import { syncSpecContentToGitHub } from '../../../plugins/specweave-github/lib/github-spec-content-sync.js';
import { syncSpecContentToJira } from '../../../plugins/specweave-jira/lib/jira-spec-content-sync.js';
import { syncSpecContentToAdo } from '../../../plugins/specweave-ado/lib/ado-spec-content-sync.js';
import { AdoClientV2 } from '../../../plugins/specweave-ado/lib/ado-client-v2.js';
import { detectRepository } from '../../utils/git-utils.js';
import { SyncProfile } from '../../core/types/sync-profile.js';
import path from 'path';
import fs from 'fs/promises';

program
  .name('sync-spec-content')
  .description('Sync spec content (title, description, user stories) to external tools')
  .option('-s, --spec <path>', 'Path to spec.md file')
  .option('-p, --provider <provider>', 'Provider: github, jira, or ado')
  .option('--dry-run', 'Dry run (don\'t actually create/update)')
  .option('-v, --verbose', 'Verbose output')
  .parse(process.argv);

const options = program.opts();

async function main() {
  const specPath = options.spec || detectSpecPath();

  if (!specPath) {
    console.error('❌ No spec path specified and could not detect spec file');
    process.exit(1);
  }

  const provider = options.provider || await detectProvider(specPath);

  if (!provider) {
    console.error('❌ No provider specified and could not detect from spec');
    console.error('   Specify provider with --provider github|jira|ado');
    process.exit(1);
  }

  console.log(`🔄 Syncing ${path.basename(specPath)} to ${provider}...`);

  try {
    switch (provider) {
      case 'github':
        await syncGitHub(specPath, options);
        break;
      case 'jira':
        await syncJira(specPath, options);
        break;
      case 'ado':
        await syncAdo(specPath, options);
        break;
      default:
        console.error(`❌ Unknown provider: ${provider}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error syncing content: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function syncGitHub(specPath: string, options: any) {
  // Detect repository
  const repo = await detectRepository();

  if (!repo || repo.provider !== 'github') {
    console.error('❌ Not a GitHub repository or remote not found');
    process.exit(1);
  }

  const result = await syncSpecContentToGitHub({
    specPath,
    owner: repo.owner,
    repo: repo.repo,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  if (result.success) {
    const actionVerb = {
      created: 'Created',
      updated: 'Updated',
      'no-change': 'No changes',
    }[result.action];

    console.log(`✅ ${actionVerb} GitHub issue`);
    if (result.externalUrl) {
      console.log(`   URL: ${result.externalUrl}`);
    }
  } else {
    console.error(`❌ Sync failed: ${result.error}`);
    process.exit(1);
  }
}

async function syncJira(specPath: string, options: any) {
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

  const result = await syncSpecContentToJira({
    specPath,
    config,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  if (result.success) {
    const actionVerb = {
      created: 'Created',
      updated: 'Updated',
      'no-change': 'No changes',
    }[result.action];

    console.log(`✅ ${actionVerb} JIRA epic`);
    if (result.externalUrl) {
      console.log(`   URL: ${result.externalUrl}`);
    }
  } else {
    console.error(`❌ Sync failed: ${result.error}`);
    process.exit(1);
  }
}

async function syncAdo(specPath: string, options: any) {
  // Load ADO config from .specweave/config.json
  const projectRoot = process.cwd();
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

  const result = await syncSpecContentToAdo({
    specPath,
    client,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  if (result.success) {
    const actionVerb = {
      created: 'Created',
      updated: 'Updated',
      'no-change': 'No changes',
    }[result.action];

    console.log(`✅ ${actionVerb} ADO feature`);
    if (result.externalUrl) {
      console.log(`   URL: ${result.externalUrl}`);
    }
  } else {
    console.error(`❌ Sync failed: ${result.error}`);
    process.exit(1);
  }
}

function detectSpecPath(): string | null {
  // Try to find most recent spec in docs
  const specsDir = path.join(process.cwd(), '.specweave', 'docs', 'internal', 'specs');

  try {
    const files = require('fs').readdirSync(specsDir);
    const specs = files
      .filter((f: string) => f.match(/^spec-\d+-.+\.md$/))
      .sort()
      .reverse();

    if (specs.length > 0) {
      return path.join(specsDir, specs[0]);
    }
  } catch {
    // Directory doesn't exist or can't read
  }

  return null;
}

async function detectProvider(specPath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(specPath, 'utf-8');

    // Check for existing links
    if (content.includes('**GitHub Project**:')) return 'github';
    if (content.includes('**JIRA Epic**:')) return 'jira';
    if (content.includes('**ADO Feature**:')) return 'ado';

    // Try to detect from git remote
    const repo = await detectRepository();
    if (repo?.provider === 'github') return 'github';
    if (repo?.provider === 'azure') return 'ado';

  } catch {
    // Can't detect
  }

  return null;
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
