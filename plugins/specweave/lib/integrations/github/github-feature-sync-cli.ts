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

/**
 * Resolve GitHub config (owner/repo) with a single canonical precedence order.
 *
 * Resolution order (documented for both CLI and hooks):
 * 1. CLI flags / env vars: GITHUB_OWNER, GITHUB_REPO
 * 2. .specweave/config.json — sync.github.owner/repo
 * 3. .specweave/config.json — multiProject.projects[active].externalTools.github
 * 4. .specweave/config.json — sync.profiles[defaultProfile].config
 * 5. .specweave/config.json — first GitHub profile (fallback)
 * 6. Git remote detection (git remote get-url origin)
 *
 * This is the SINGLE source of truth for owner/repo config.
 * Shell hooks should read the same config.json paths in the same order.
 */
export async function resolveGitHubConfig(options?: {
  cliOwner?: string;
  cliRepo?: string;
  cliToken?: string;
  projectRoot?: string;
}): Promise<{ owner: string; repo: string; token: string } | null> {
  const projectRoot = options?.projectRoot || process.cwd();
  const configPath = path.join(projectRoot, '.specweave/config.json');

  // Step 1: CLI flags / env vars (highest precedence)
  let owner = options?.cliOwner || process.env.GITHUB_OWNER || '';
  let repo = options?.cliRepo || process.env.GITHUB_REPO || '';
  const token = options?.cliToken || process.env.GITHUB_TOKEN || '';

  // Step 2-5: config.json methods (only if not already resolved)
  if ((!owner || !repo) && existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Method 2: sync.github
      if (!owner && !repo && config.sync?.github?.owner && config.sync?.github?.repo) {
        owner = config.sync.github.owner;
        repo = config.sync.github.repo;
      }
      // Method 3: multiProject.projects[activeProject].externalTools.github
      if (!owner && !repo && config.multiProject?.enabled && config.multiProject?.activeProject) {
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
      // Method 4: sync.profiles[defaultProfile]
      if (!owner && !repo && config.sync?.defaultProfile && config.sync?.profiles) {
        const profile = config.sync.profiles[config.sync.defaultProfile];
        if (profile?.config?.owner && profile?.config?.repo) {
          owner = profile.config.owner;
          repo = profile.config.repo;
        }
      }
      // Method 5: First GitHub profile if no defaultProfile is set
      if (!owner && !repo && config.sync?.profiles) {
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

  // Step 6: Git remote detection (lowest precedence)
  if (!owner || !repo) {
    try {
      const { execSync } = await import('child_process');
      const remoteUrl = execSync('git remote get-url origin 2>/dev/null', {
        encoding: 'utf-8',
        cwd: projectRoot
      }).trim();

      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        owner = owner || match[1];
        repo = repo || match[2];
      }
    } catch {
      // Git detection failed
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

async function loadGitHubConfig(): Promise<GitHubConfig | null> {
  return resolveGitHubConfig();
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
    console.log('  GITHUB_TOKEN  Required - GitHub PAT with repo scope');
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
