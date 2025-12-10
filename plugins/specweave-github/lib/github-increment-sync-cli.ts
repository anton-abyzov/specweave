#!/usr/bin/env node
/**
 * GitHub Increment Sync CLI
 *
 * For brownfield projects without living docs structure.
 * Creates GitHub issues directly from increment spec.md with CORRECT format.
 *
 * CORRECT FORMAT (SpecWeave Universal Hierarchy):
 *   - Feature (FS-XXX) → GitHub Milestone
 *   - User Story (US-XXX) → GitHub Issue with [FS-XXX][US-YYY] Title
 *   - Tasks (T-XXX) → Checkboxes in User Story issue
 *   - ACs → Checkboxes in User Story issue
 *
 * Usage:
 *   node github-increment-sync-cli.js <increment-id>
 *   node github-increment-sync-cli.js 0002-thumbnail-optimizer-mvp
 *
 * @see CLAUDE.md (GitHub Issue Format rules)
 */

import { existsSync, readFileSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IncrementIssueBuilder, UserStory, Task, IncrementData } from './increment-issue-builder.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

interface SyncResult {
  milestoneNumber: number;
  milestoneUrl: string;
  issues: Array<{
    userStoryId: string;
    issueNumber: number;
    issueUrl: string;
    title: string;
  }>;
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
 * Load existing GitHub links from metadata.json
 */
function loadExistingGitHubLinks(incrementPath: string): {
  milestone?: number;
  userStoryIssues: Record<string, number>;
} {
  const metadataPath = path.join(incrementPath, 'metadata.json');

  if (!existsSync(metadataPath)) {
    return { userStoryIssues: {} };
  }

  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

    return {
      milestone: metadata.github?.milestone,
      userStoryIssues: metadata.github?.userStoryIssues || {}
    };
  } catch {
    return { userStoryIssues: {} };
  }
}

/**
 * Update increment metadata with GitHub links
 */
async function updateIncrementMetadata(
  incrementPath: string,
  milestoneNumber: number,
  userStoryIssues: Record<string, number>
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
    milestone: milestoneNumber,
    userStoryIssues,
    lastSync: new Date().toISOString()
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}

/**
 * Create or get GitHub milestone for the feature
 */
async function createOrGetMilestone(
  owner: string,
  repo: string,
  featureId: string,
  title: string,
  existingMilestone?: number
): Promise<{ number: number; url: string }> {
  // If we have an existing milestone, verify it exists
  if (existingMilestone) {
    const verifyResult = await execFileNoThrow('gh', [
      'api', `repos/${owner}/${repo}/milestones/${existingMilestone}`,
      '--jq', '.number'
    ]);
    if (verifyResult.exitCode === 0) {
      return {
        number: existingMilestone,
        url: `https://github.com/${owner}/${repo}/milestone/${existingMilestone}`
      };
    }
  }

  // Search for existing milestone by title
  const searchResult = await execFileNoThrow('gh', [
    'api', `repos/${owner}/${repo}/milestones`,
    '--jq', `.[] | select(.title | contains("${featureId}")) | .number`
  ]);

  if (searchResult.exitCode === 0 && searchResult.stdout.trim()) {
    const milestoneNumber = parseInt(searchResult.stdout.trim().split('\n')[0], 10);
    return {
      number: milestoneNumber,
      url: `https://github.com/${owner}/${repo}/milestone/${milestoneNumber}`
    };
  }

  // Create new milestone
  const milestoneTitle = `[${featureId}] ${title}`;
  const createResult = await execFileNoThrow('gh', [
    'api', `repos/${owner}/${repo}/milestones`,
    '-X', 'POST',
    '-f', `title=${milestoneTitle}`,
    '-f', `description=Feature milestone for ${featureId}`,
    '--jq', '.number'
  ]);

  if (createResult.exitCode !== 0) {
    throw new Error(`Failed to create milestone: ${createResult.stderr || createResult.stdout}`);
  }

  const milestoneNumber = parseInt(createResult.stdout.trim(), 10);
  return {
    number: milestoneNumber,
    url: `https://github.com/${owner}/${repo}/milestone/${milestoneNumber}`
  };
}

/**
 * Build issue body for a single user story
 */
function buildUserStoryIssueBody(
  story: UserStory,
  tasks: Task[],
  incrementData: IncrementData,
  githubRepo: string
): string {
  const incrementId = incrementData.frontmatter.increment;
  let body = '';

  // ❌ REMOVED: Metadata header (Feature, Status, Priority)
  // WHY: GitHub has NATIVE fields for this (labels, milestones)
  // Body should contain ONLY actual work content (ACs, tasks, user story)
  // See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md

  // Progress section (consistency with user-story-issue-builder.ts)
  const completedACs = story.acceptanceCriteria.filter(ac => ac.completed).length;
  const totalACs = story.acceptanceCriteria.length;
  const storyTasks = tasks.filter(t =>
    t.userStories.includes(story.id) ||
    t.userStories.some(us => us.includes(story.id.replace('US-', '')))
  );
  const completedTasks = storyTasks.filter(t => t.completed).length;
  const totalTasks = storyTasks.length;
  const overallPercentage = (totalACs + totalTasks) > 0
    ? Math.round(((completedACs + completedTasks) / (totalACs + totalTasks)) * 100)
    : 0;

  body += `## Progress\n\n`;
  body += `**Acceptance Criteria**: ${completedACs}/${totalACs} (${totalACs > 0 ? Math.round((completedACs / totalACs) * 100) : 0}%)\n`;
  body += `**Tasks**: ${completedTasks}/${totalTasks} (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)\n`;
  body += `**Overall**: ${overallPercentage}%\n\n`;

  // Progress bar
  const filledBlocks = Math.floor(overallPercentage / 5);
  const emptyBlocks = 20 - filledBlocks;
  body += `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)} ${overallPercentage}%\n\n`;
  body += `---\n\n`;

  // User Story description
  body += `## User Story\n\n`;
  if (story.asA && story.iWant && story.soThat) {
    body += `**As a** ${story.asA}\n`;
    body += `**I want** ${story.iWant}\n`;
    body += `**So that** ${story.soThat}\n\n`;
  } else {
    body += `${story.title}\n\n`;
  }

  body += `---\n\n`;

  // Acceptance Criteria
  body += `## Acceptance Criteria\n\n`;
  if (story.acceptanceCriteria.length > 0) {
    const completed = story.acceptanceCriteria.filter(ac => ac.completed).length;
    const total = story.acceptanceCriteria.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    body += `Progress: ${completed}/${total} criteria met (${percentage}%)\n\n`;

    for (const ac of story.acceptanceCriteria) {
      const checkbox = ac.completed ? '[x]' : '[ ]';
      body += `- ${checkbox} **${ac.id}**: ${ac.description}\n`;
    }
    body += '\n';
  } else {
    body += `*No acceptance criteria defined*\n\n`;
  }

  body += `---\n\n`;

  // Tasks for this user story (already calculated above for Progress section)
  if (storyTasks.length > 0) {
    body += `## Implementation Tasks\n\n`;
    const completedTasks = storyTasks.filter(t => t.completed).length;
    const totalTasks = storyTasks.length;
    const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    body += `Progress: ${completedTasks}/${totalTasks} tasks (${taskPercentage}%)\n\n`;

    for (const task of storyTasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      body += `- ${checkbox} **${task.id}**: ${task.title}\n`;
    }
    body += '\n';

    body += `---\n\n`;
  }

  // Link to increment
  body += `## SpecWeave Increment\n\n`;
  body += `**Increment**: [${incrementId}](https://github.com/${githubRepo}/tree/develop/.specweave/increments/${incrementId})\n\n`;

  body += `---\n\n`;
  body += `🤖 Auto-synced by SpecWeave`;

  return body;
}

/**
 * Create or update GitHub issue for a user story
 */
async function syncUserStoryIssue(
  owner: string,
  repo: string,
  featureId: string,
  story: UserStory,
  tasks: Task[],
  incrementData: IncrementData,
  milestoneNumber: number,
  existingIssueNumber?: number
): Promise<{ number: number; url: string }> {
  // CORRECT FORMAT: [FS-XXX][US-YYY] User Story Title
  const title = `[${featureId}][${story.id}] ${story.title}`;
  const body = buildUserStoryIssueBody(story, tasks, incrementData, `${owner}/${repo}`);

  // Labels
  const labels = ['specweave', 'user-story'];
  const priority = story.priority?.toLowerCase() || incrementData.frontmatter.priority?.toLowerCase() || 'p2';
  labels.push(priority);

  if (existingIssueNumber) {
    // Update existing issue
    const updateResult = await execFileNoThrow('gh', [
      'issue', 'edit',
      String(existingIssueNumber),
      '--repo', `${owner}/${repo}`,
      '--title', title,
      '--body', body
    ]);

    if (updateResult.exitCode !== 0) {
      throw new Error(`Failed to update issue #${existingIssueNumber}: ${updateResult.stderr}`);
    }

    return {
      number: existingIssueNumber,
      url: `https://github.com/${owner}/${repo}/issues/${existingIssueNumber}`
    };
  }

  // Create new issue
  const createArgs = [
    'issue', 'create',
    '--repo', `${owner}/${repo}`,
    '--title', title,
    '--body', body,
    '--milestone', String(milestoneNumber)
  ];

  if (labels.length > 0) {
    createArgs.push('--label', labels.join(','));
  }

  const createResult = await execFileNoThrow('gh', createArgs);

  if (createResult.exitCode !== 0) {
    throw new Error(`Failed to create issue: ${createResult.stderr || createResult.stdout}`);
  }

  // Parse issue URL from output
  const urlMatch = createResult.stdout.match(/https:\/\/github\.com\/[^\s]+\/issues\/(\d+)/);
  if (!urlMatch) {
    throw new Error('Could not parse issue URL from gh output');
  }

  return {
    number: parseInt(urlMatch[1], 10),
    url: urlMatch[0]
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node github-increment-sync-cli.js <increment-id> [options]');
    console.log('');
    console.log('Creates GitHub issues with CORRECT format:');
    console.log('  - Milestone: [FS-XXX] Feature Title');
    console.log('  - Issues: [FS-XXX][US-YYY] User Story Title  (one per US)');
    console.log('');
    console.log('Arguments:');
    console.log('  increment-id   Increment ID (e.g., 0002 or 0002-thumbnail-mvp)');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run      Preview issues without creating');
    console.log('');
    console.log('Environment:');
    console.log('  GITHUB_TOKEN   Required - GitHub personal access token');
    console.log('');
    console.log('Example:');
    console.log('  GITHUB_TOKEN=ghp_xxx node github-increment-sync-cli.js 0002');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const incrementId = args[0];
  const dryRun = args.includes('--dry-run');

  console.log(`\n🐙 GitHub Increment Sync CLI (Per-User-Story Mode)`);
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
    config = await loadGitHubConfig().catch((): null => null);
    if (config) {
      console.log(`   Repository: ${config.owner}/${config.repo}`);
    } else {
      console.log(`   Repository: (not detected - dry run mode)`);
    }
  }

  // Parse increment
  const projectRoot = process.cwd();
  const builder = new IncrementIssueBuilder(incrementPath, projectRoot);

  try {
    console.log(`\n🔄 Parsing increment spec.md...`);
    const incrementData = await builder.parse();

    const featureId = incrementData.frontmatter.feature_id ||
      `FS-${fullIncrementId.match(/^(\d+)/)?.[1]?.padStart(3, '0') || 'UNKNOWN'}`;

    console.log(`   📦 Feature: ${featureId}`);
    console.log(`   📦 Title: ${incrementData.title}`);
    console.log(`   📝 User Stories: ${incrementData.userStories.length}`);

    const totalACs = incrementData.userStories.reduce(
      (sum, us) => sum + us.acceptanceCriteria.length, 0
    );
    console.log(`   ✓ Acceptance Criteria: ${totalACs}`);
    console.log(`   🔧 Tasks: ${incrementData.tasks.length}`);

    if (incrementData.userStories.length === 0) {
      console.error(`\n❌ No user stories found in spec.md`);
      console.error('   Ensure spec.md has ### US-XXX: Title sections');
      process.exit(1);
    }

    // Preview issues
    console.log(`\n📋 Issues to Create/Update:`);
    console.log(`   🎯 Milestone: [${featureId}] ${incrementData.title}`);
    for (const story of incrementData.userStories) {
      const storyTasks = incrementData.tasks.filter(t =>
        t.userStories.includes(story.id) ||
        t.userStories.some(us => us.includes(story.id.replace('US-', '')))
      );
      console.log(`   📝 [${featureId}][${story.id}] ${story.title}`);
      console.log(`      └─ ${story.acceptanceCriteria.length} ACs, ${storyTasks.length} tasks`);
    }

    if (dryRun) {
      console.log(`\n📄 Sample Issue Body (${incrementData.userStories[0].id}):\n`);
      const sampleBody = buildUserStoryIssueBody(
        incrementData.userStories[0],
        incrementData.tasks,
        incrementData,
        config ? `${config.owner}/${config.repo}` : 'owner/repo'
      );
      console.log(sampleBody);
      console.log(`\n✅ Dry run complete (no issues created)`);
      process.exit(0);
    }

    // After dry-run check, config is guaranteed to be non-null
    if (!config) {
      console.error('❌ GitHub config not available');
      process.exit(1);
    }

    // Load existing links
    const existingLinks = loadExistingGitHubLinks(incrementPath);

    // Create or get milestone
    console.log(`\n🎯 Creating/updating milestone...`);
    const milestone = await createOrGetMilestone(
      config.owner,
      config.repo,
      featureId,
      incrementData.title,
      existingLinks.milestone
    );
    console.log(`   ✅ Milestone #${milestone.number}: [${featureId}] ${incrementData.title}`);

    // Create/update issues for each user story
    console.log(`\n📝 Creating/updating user story issues...`);
    const userStoryIssues: Record<string, number> = {};

    for (const story of incrementData.userStories) {
      const existingIssue = existingLinks.userStoryIssues[story.id];

      const issue = await syncUserStoryIssue(
        config.owner,
        config.repo,
        featureId,
        story,
        incrementData.tasks,
        incrementData,
        milestone.number,
        existingIssue
      );

      userStoryIssues[story.id] = issue.number;

      const action = existingIssue ? '♻️  Updated' : '✅ Created';
      console.log(`   ${action} #${issue.number}: [${featureId}][${story.id}] ${story.title}`);
    }

    // Update metadata
    await updateIncrementMetadata(incrementPath, milestone.number, userStoryIssues);
    console.log(`\n📝 Metadata updated`);

    console.log(`\n✅ Sync complete!`);
    console.log(`   🎯 Milestone: ${milestone.url}`);
    console.log(`   📝 Issues: ${Object.keys(userStoryIssues).length} user stories synced`);

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
