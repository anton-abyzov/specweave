#!/usr/bin/env node
/**
 * GitHub Increment Sync CLI
 *
 * For brownfield projects without living docs structure.
 * Creates GitHub issues directly from increment spec.md with proper format.
 *
 * CORRECT FORMAT:
 *   - Single issue per increment: [FS-XXX] Increment Title
 *   - With User Stories and ACs as sections
 *
 * Usage:
 *   node github-increment-sync-cli.js <increment-id>
 *   node github-increment-sync-cli.js 0063-fix-external-import
 *
 * @see ADR-0143 (GitHub Issue Format)
 */

import { existsSync, readFileSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IncrementIssueBuilder } from './increment-issue-builder.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

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
      // Method 3: sync.profiles[activeProfile]
      else if (config.sync?.activeProfile && config.sync?.profiles) {
        const profile = config.sync.profiles[config.sync.activeProfile];
        if (profile?.config?.owner && profile?.config?.repo) {
          owner = profile.config.owner;
          repo = profile.config.repo;
        }
      }
    } catch (error) {
      console.error('⚠️  Failed to parse config.json:', error);
    }
  }

  // Fallback: detect from git remote
  if (!owner || !repo) {
    const result = await execFileNoThrow('git', ['remote', 'get-url', 'origin']);
    if (result.exitCode === 0 && result.stdout) {
      const remoteUrl = result.stdout.trim();
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        owner = owner || match[1];
        repo = repo || match[2];
      }
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

/**
 * Find increment folder by ID (supports partial matching)
 */
async function findIncrementFolder(incrementId: string): Promise<string | null> {
  const projectRoot = process.cwd();
  const incrementsDir = path.join(projectRoot, '.specweave/increments');

  if (!existsSync(incrementsDir)) {
    return null;
  }

  const entries = await fs.readdir(incrementsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue; // Skip _archive, _backlog

    // Exact match
    if (entry.name === incrementId) {
      return path.join(incrementsDir, entry.name);
    }

    // Partial match (e.g., "0063" matches "0063-fix-external-import")
    if (entry.name.startsWith(incrementId + '-')) {
      return path.join(incrementsDir, entry.name);
    }
  }

  return null;
}

/**
 * Check if GitHub issue already exists for this increment
 */
async function findExistingIssue(
  owner: string,
  repo: string,
  featureId: string
): Promise<number | null> {
  // Search for issues with this feature ID in title
  const result = await execFileNoThrow('gh', [
    'search', 'issues',
    `repo:${owner}/${repo}`,
    `"[${featureId}]" in:title`,
    'is:open',
    '--json', 'number,title',
    '--limit', '5'
  ]);

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return null;
  }

  try {
    const issues = JSON.parse(result.stdout);
    if (issues.length > 0) {
      return issues[0].number;
    }
  } catch {
    // Parse error, no existing issue
  }

  return null;
}

/**
 * Create GitHub issue via gh CLI
 */
async function createGitHubIssue(
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[]
): Promise<{ number: number; url: string }> {
  const args = [
    'issue', 'create',
    '--repo', `${owner}/${repo}`,
    '--title', title,
    '--body', body
  ];

  // Add labels
  if (labels.length > 0) {
    args.push('--label', labels.join(','));
  }

  const result = await execFileNoThrow('gh', args);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to create issue: ${result.stderr || result.stdout}`);
  }

  // Parse issue URL from output
  const urlMatch = result.stdout.match(/https:\/\/github\.com\/[^\s]+\/issues\/(\d+)/);
  if (!urlMatch) {
    throw new Error('Could not parse issue URL from gh output');
  }

  return {
    number: parseInt(urlMatch[1], 10),
    url: urlMatch[0]
  };
}

/**
 * Update existing GitHub issue
 */
async function updateGitHubIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const result = await execFileNoThrow('gh', [
    'issue', 'edit',
    String(issueNumber),
    '--repo', `${owner}/${repo}`,
    '--body', body
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to update issue: ${result.stderr || result.stdout}`);
  }
}

/**
 * Load existing GitHub issue link from metadata.json
 * This is the PRIMARY source for existing issue detection
 */
function loadExistingGitHubLink(incrementPath: string): { issue: number; url?: string } | null {
  const metadataPath = path.join(incrementPath, 'metadata.json');

  if (!existsSync(metadataPath)) {
    return null;
  }

  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

    // Check for github.issue (new format)
    if (metadata.github?.issue) {
      return {
        issue: metadata.github.issue,
        url: metadata.github.url
      };
    }

    // Check for sync.issueNumber (alternative format)
    if (metadata.sync?.issueNumber) {
      return {
        issue: metadata.sync.issueNumber,
        url: metadata.sync.issueUrl
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Update increment metadata with GitHub issue link
 */
async function updateIncrementMetadata(
  incrementPath: string,
  issueNumber: number,
  issueUrl: string
): Promise<void> {
  const metadataPath = path.join(incrementPath, 'metadata.json');

  let metadata: Record<string, unknown> = {};

  if (existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    } catch {
      // Start fresh
    }
  }

  // Update github section
  metadata.github = {
    issue: issueNumber,
    url: issueUrl,
    lastSync: new Date().toISOString()
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node github-increment-sync-cli.js <increment-id> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  increment-id   Increment ID (e.g., 0063 or 0063-fix-external-import)');
    console.log('');
    console.log('Options:');
    console.log('  --force        Force create even if issue exists');
    console.log('  --dry-run      Preview issue without creating');
    console.log('');
    console.log('Environment:');
    console.log('  GITHUB_TOKEN   Required - GitHub personal access token');
    console.log('');
    console.log('Example:');
    console.log('  GITHUB_TOKEN=ghp_xxx node github-increment-sync-cli.js 0063');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const incrementId = args[0];
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');

  console.log(`\n🐙 GitHub Increment Sync CLI`);
  console.log(`   Increment: ${incrementId}`);

  // Find increment folder
  const incrementPath = await findIncrementFolder(incrementId);
  if (!incrementPath) {
    console.error(`❌ Increment not found: ${incrementId}`);
    console.error('   Check: ls .specweave/increments/');
    process.exit(1);
  }

  const fullIncrementId = path.basename(incrementPath);
  console.log(`   Found: ${fullIncrementId}`);

  // For dry-run, we can skip config validation
  let config: GitHubConfig | null = null;
  if (!dryRun) {
    config = await loadGitHubConfig();
    if (!config) {
      process.exit(1);
    }
    console.log(`   Repository: ${config.owner}/${config.repo}`);
  } else {
    // Try to detect repo for dry-run preview (non-fatal)
    config = await loadGitHubConfig().catch((): null => null);
    if (config) {
      console.log(`   Repository: ${config.owner}/${config.repo}`);
    } else {
      console.log(`   Repository: (not detected - dry run mode)`);
    }
  }

  // Parse increment and build issue
  const projectRoot = process.cwd();
  const builder = new IncrementIssueBuilder(incrementPath, projectRoot);

  try {
    console.log(`\n🔄 Parsing increment spec.md...`);
    const incrementData = await builder.parse();

    console.log(`   📦 Title: ${incrementData.title}`);
    console.log(`   📝 User Stories: ${incrementData.userStories.length}`);

    const totalACs = incrementData.userStories.reduce(
      (sum, us) => sum + us.acceptanceCriteria.length, 0
    );
    console.log(`   ✓ Acceptance Criteria: ${totalACs}`);

    // Build issue content
    const githubRepo = config ? `${config.owner}/${config.repo}` : undefined;
    const issue = builder.buildIncrementIssue(incrementData, githubRepo);

    console.log(`\n📋 Issue Preview:`);
    console.log(`   Title: ${issue.title}`);
    console.log(`   Labels: ${issue.labels.join(', ')}`);

    if (dryRun) {
      console.log(`\n📄 Issue Body Preview:\n`);
      console.log(issue.body);
      console.log(`\n✅ Dry run complete (no issue created)`);
      process.exit(0);
    }

    // After dry-run check, config is guaranteed to be non-null
    if (!config) {
      console.error('❌ GitHub config not available');
      process.exit(1);
    }

    // STEP 1: Check metadata.json for existing issue link (PRIMARY detection)
    const metadataLink = loadExistingGitHubLink(incrementPath);

    if (metadataLink) {
      console.log(`\n📎 Found existing issue link in metadata: #${metadataLink.issue}`);

      // Update existing issue with new format
      console.log(`🔄 Updating issue #${metadataLink.issue} with new format...`);

      // Update body
      await updateGitHubIssue(config.owner, config.repo, metadataLink.issue, issue.body);
      console.log(`   ✅ Body updated with User Stories and ACs`);

      // Update title to new format (fix the [0002] → [FS-XXX] issue)
      const updateTitleResult = await execFileNoThrow('gh', [
        'issue', 'edit',
        String(metadataLink.issue),
        '--repo', `${config.owner}/${config.repo}`,
        '--title', issue.title
      ]);

      if (updateTitleResult.exitCode === 0) {
        console.log(`   ✅ Title updated to: ${issue.title}`);
      } else {
        console.log(`   ⚠️  Could not update title (may need permissions)`);
      }

      // Update metadata with lastSync
      await updateIncrementMetadata(
        incrementPath,
        metadataLink.issue,
        `https://github.com/${config.owner}/${config.repo}/issues/${metadataLink.issue}`
      );

      console.log(`\n✅ Sync complete!`);
      console.log(`   🔗 https://github.com/${config.owner}/${config.repo}/issues/${metadataLink.issue}`);
      process.exit(0);
    }

    // STEP 2: Search GitHub by feature ID (fallback)
    const featureId = incrementData.frontmatter.feature_id ||
      `FS-${fullIncrementId.match(/^(\d+)/)?.[1]?.padStart(3, '0') || 'UNKNOWN'}`;

    console.log(`\n🔍 Searching GitHub for existing issue [${featureId}]...`);
    const existingIssue = await findExistingIssue(config.owner, config.repo, featureId);

    if (existingIssue) {
      console.log(`   Found existing issue: #${existingIssue}`);

      // Update existing issue
      console.log(`🔄 Updating issue #${existingIssue}...`);
      await updateGitHubIssue(config.owner, config.repo, existingIssue, issue.body);
      console.log(`   ✅ Issue #${existingIssue} updated`);

      await updateIncrementMetadata(
        incrementPath,
        existingIssue,
        `https://github.com/${config.owner}/${config.repo}/issues/${existingIssue}`
      );

      console.log(`\n✅ Sync complete!`);
      console.log(`   🔗 https://github.com/${config.owner}/${config.repo}/issues/${existingIssue}`);
      process.exit(0);
    }

    // STEP 3: Create new issue (no existing found)
    console.log(`   No existing issue found`);
    console.log(`\n🚀 Creating GitHub issue...`);
    const created = await createGitHubIssue(
      config.owner,
      config.repo,
      issue.title,
      issue.body,
      issue.labels
    );

    console.log(`   ✅ Issue #${created.number} created`);

    // Update metadata
    await updateIncrementMetadata(incrementPath, created.number, created.url);
    console.log(`   📝 Metadata updated`);

    console.log(`\n✅ Sync complete!`);
    console.log(`   🔗 ${created.url}`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Sync failed:`, error);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
