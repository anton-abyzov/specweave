#!/usr/bin/env node
/**
 * GitHub Feature Sync CLI
 *
 * CLI wrapper for GitHubFeatureSync.syncFeatureToGitHub()
 * Called by post-increment-planning.sh hook to create GitHub issues
 * after increment creation.
 *
 * Usage:
 *   node github-feature-sync-cli.js <feature-id>
 *   node github-feature-sync-cli.js FS-062
 *
 * Environment:
 *   GITHUB_TOKEN - Required
 *   GITHUB_OWNER - Optional (detected from config.json or git remote)
 *   GITHUB_REPO  - Optional (detected from config.json or git remote)
 *
 * @see ADR-0139 (Unified Post-Increment Sync)
 */

import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { GitHubFeatureSync } from './github-feature-sync.js';
import { GitHubClientV2 } from './github-client-v2.js';

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

async function loadGitHubConfig(): Promise<GitHubConfig | null> {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, '.specweave/config.json');

  let owner = process.env.GITHUB_OWNER || '';
  let repo = process.env.GITHUB_REPO || '';
  const token = process.env.GITHUB_TOKEN || '';

  // Try to load from config.json
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Method 1: sync.github
      if (config.sync?.github?.owner && config.sync?.github?.repo) {
        owner = config.sync.github.owner;
        repo = config.sync.github.repo;
      }
      // Method 2: multiProject.projects[activeProject].externalTools.github
      else if (config.multiProject?.enabled && config.multiProject?.activeProject) {
        const activeProject = config.multiProject.activeProject;
        const projectConfig = config.multiProject.projects?.[activeProject];
        if (projectConfig?.externalTools?.github?.repository) {
          const parts = projectConfig.externalTools.github.repository.split('/');
          if (parts.length === 2) {
            owner = parts[0];
            repo = parts[1];
          }
        }
      }
      // Method 3: sync.profiles[defaultProfile]
      else if (config.sync?.defaultProfile && config.sync?.profiles) {
        const profile = config.sync.profiles[config.sync.defaultProfile];
        if (profile?.config?.owner && profile?.config?.repo) {
          owner = profile.config.owner;
          repo = profile.config.repo;
        }
      }
      // Method 4 (v1.0.46): First GitHub profile if no defaultProfile is set
      // This handles the common case where user has profiles but forgot to set defaultProfile
      else if (config.sync?.profiles) {
        const profileNames = Object.keys(config.sync.profiles);
        for (const name of profileNames) {
          const profile = config.sync.profiles[name];
          if (profile?.provider === 'github' && profile?.config?.owner && profile?.config?.repo) {
            owner = profile.config.owner;
            repo = profile.config.repo;
            console.log(`ℹ️  Using first GitHub profile: ${name}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error('⚠️  Failed to parse config.json:', error);
    }
  }

  // Fallback: detect from git remote
  if (!owner || !repo) {
    try {
      const { execSync } = await import('child_process');
      const remoteUrl = execSync('git remote get-url origin 2>/dev/null', {
        encoding: 'utf-8',
        cwd: projectRoot
      }).trim();

      // Parse GitHub URL (HTTPS or SSH)
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        owner = owner || match[1];
        repo = repo || match[2];
      }
    } catch {
      // Git detection failed, continue with what we have
    }
  }

  if (!token) {
    console.error('❌ GITHUB_TOKEN not set');
    console.error('   Set it in .env file or export GITHUB_TOKEN=ghp_xxx');
    return null;
  }

  if (!owner || !repo) {
    console.error('❌ Could not detect GitHub owner/repo');
    console.error('   Set sync.github.owner and sync.github.repo in .specweave/config.json');
    return null;
  }

  return { owner, repo, token };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node github-feature-sync-cli.js <feature-id>');
    console.log('');
    console.log('Arguments:');
    console.log('  feature-id   Feature ID (e.g., FS-062)');
    console.log('');
    console.log('Environment:');
    console.log('  GITHUB_TOKEN  Required - GitHub personal access token');
    console.log('');
    console.log('Example:');
    console.log('  GITHUB_TOKEN=ghp_xxx node github-feature-sync-cli.js FS-062');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const featureId = args[0];

  // Validate feature ID format
  if (!featureId.match(/^FS-\d+$/i)) {
    console.error(`❌ Invalid feature ID: ${featureId}`);
    console.error('   Expected format: FS-XXX (e.g., FS-062)');
    process.exit(1);
  }

  console.log(`\n🐙 GitHub Feature Sync CLI`);
  console.log(`   Feature: ${featureId}`);

  // Load config
  const config = await loadGitHubConfig();
  if (!config) {
    process.exit(1);
  }

  console.log(`   Repository: ${config.owner}/${config.repo}`);

  // Create client and sync
  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave/docs/internal/specs');

  const profile = {
    provider: 'github' as const,
    displayName: 'GitHub',
    config: {
      owner: config.owner,
      repo: config.repo,
      token: config.token
    },
    timeRange: {
      default: '1M' as const,
      max: '3M' as const
    }
  };

  const client = new GitHubClientV2(profile);
  const sync = new GitHubFeatureSync(client, specsDir, projectRoot);

  try {
    console.log(`\n🔄 Syncing ${featureId} to GitHub...`);

    const result = await sync.syncFeatureToGitHub(featureId);

    console.log(`\n✅ Sync complete!`);
    console.log(`   🎯 Milestone: #${result.milestoneNumber}`);
    console.log(`   📝 Issues created: ${result.issuesCreated}`);
    console.log(`   🔄 Issues updated: ${result.issuesUpdated}`);
    console.log(`   📚 User stories processed: ${result.userStoriesProcessed}`);

    if (result.milestoneUrl) {
      console.log(`   🔗 ${result.milestoneUrl}`);
    }

    process.exit(0);
  } catch (error: unknown) {
    // FIXED (v1.0.302): Write errors to stdout too, since stderr may be suppressed
    // by run_with_timeout() in shell handlers. This ensures errors appear in throttle.log.
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`\n[ERROR] Sync failed for ${featureId}: ${msg}`);
    console.error(`\n❌ Sync failed:`, error);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  const msg = error instanceof Error ? error.message : String(error);
  console.log(`[FATAL] ${msg}`);
  console.error('Fatal error:', error);
  process.exit(1);
});
