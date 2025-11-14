#!/usr/bin/env node
/**
 * Sync All Epic Specs to GitHub (Simple Format)
 *
 * This script syncs all Epic folders from .specweave/docs/internal/specs/default/
 * to GitHub Issues (not Milestones, since we're using simpler format).
 *
 * For each Epic:
 * - Creates/updates a GitHub Issue with [FS-XXX] prefix
 * - Links all user stories as checkboxes
 * - Updates FEATURE.md with GitHub issue number
 *
 * Usage:
 *   npx tsx .specweave/increments/0032-prevent-increment-number-gaps/scripts/sync-all-epics-simple.ts
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as yaml from 'yaml';
import { execFileNoThrow } from '../../../../src/utils/execFileNoThrow.js';

interface SyncResult {
  epicId: string;
  epicTitle: string;
  success: boolean;
  issueNumber?: number;
  issueUrl?: string;
  error?: string;
  status?: 'created' | 'updated' | 'existing';
}

async function getAllEpicFolders(specsDir: string): Promise<string[]> {
  const entries = await readdir(specsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('FS-'))
    .map((entry) => entry.name)
    .sort();
}

async function parseEpicFeature(
  featurePath: string
): Promise<{
  id: string;
  title: string;
  status: string;
  githubIssue: number | null;
  githubUrl: string | null;
  userStories: string[];
}> {
  const content = await readFile(featurePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    throw new Error('FEATURE.md missing YAML frontmatter');
  }

  const frontmatter = yaml.parse(match[1]);

  // Extract user stories from content
  const userStoryMatches = content.match(/- \[.*?\] \[US-\d+:.*?\]\(.*?\)/g) || [];
  const userStories = userStoryMatches.map((match) => {
    const titleMatch = match.match(/\[US-\d+: (.*?)\]/);
    return titleMatch ? titleMatch[1] : '';
  }).filter(Boolean);

  return {
    id: frontmatter.id || '',
    title: frontmatter.title || '',
    status: frontmatter.status || 'unknown',
    githubIssue: frontmatter.external_tools?.github?.id || null,
    githubUrl: frontmatter.external_tools?.github?.url || null,
    userStories,
  };
}

async function searchExistingIssue(epicId: string): Promise<number | null> {
  // Search for existing issue with [FS-XXX] prefix
  const searchQuery = `repo:anton-abyzov/specweave is:issue in:title "[${epicId}]"`;

  const result = await execFileNoThrow('gh', [
    'issue',
    'list',
    '--search',
    searchQuery,
    '--json',
    'number',
    '--limit',
    '1',
  ]);

  if (result.exitCode !== 0 || !result.stdout) {
    return null;
  }

  try {
    const issues = JSON.parse(result.stdout);
    return issues.length > 0 ? issues[0].number : null;
  } catch {
    return null;
  }
}

async function createGitHubIssue(
  epicId: string,
  title: string,
  status: string,
  userStories: string[]
): Promise<{ number: number; url: string }> {
  const issueTitle = `[${epicId}] ${title}`;

  const body = `# Epic: ${title}

**Epic ID**: ${epicId}
**Status**: ${status}

## User Stories

${userStories.length > 0
  ? userStories.map((story) => `- [ ] ${story}`).join('\n')
  : '- No user stories defined yet'}

---

🤖 Auto-synced from SpecWeave Living Docs
📁 Location: \`.specweave/docs/internal/specs/default/${epicId}/\`
`;

  const result = await execFileNoThrow('gh', [
    'issue',
    'create',
    '--title',
    issueTitle,
    '--body',
    body,
    '--label',
    'specweave',
    '--repo',
    'anton-abyzov/specweave',
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to create issue: ${result.stderr || result.stdout}`);
  }

  // Parse the issue URL from output
  const urlMatch = result.stdout.match(/https:\/\/github\.com\/[^\s]+/);
  const issueUrl = urlMatch ? urlMatch[0] : '';
  const numberMatch = issueUrl.match(/\/issues\/(\d+)/);
  const issueNumber = numberMatch ? parseInt(numberMatch[1], 10) : 0;

  return {
    number: issueNumber,
    url: issueUrl,
  };
}

async function updateGitHubIssue(
  issueNumber: number,
  epicId: string,
  title: string,
  status: string,
  userStories: string[]
): Promise<void> {
  const body = `# Epic: ${title}

**Epic ID**: ${epicId}
**Status**: ${status}

## User Stories

${userStories.length > 0
  ? userStories.map((story) => `- [ ] ${story}`).join('\n')
  : '- No user stories defined yet'}

---

🤖 Auto-synced from SpecWeave Living Docs
📁 Location: \`.specweave/docs/internal/specs/default/${epicId}/\`
`;

  await execFileNoThrow('gh', [
    'issue',
    'edit',
    String(issueNumber),
    '--body',
    body,
    '--repo',
    'anton-abyzov/specweave',
  ]);
}

async function updateFeatureFile(
  featurePath: string,
  issueNumber: number,
  issueUrl: string
): Promise<void> {
  const content = await readFile(featurePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    return; // Can't update without frontmatter
  }

  const frontmatter = yaml.parse(match[1]);

  // Update GitHub external link
  if (!frontmatter.external_tools) {
    frontmatter.external_tools = {};
  }
  if (!frontmatter.external_tools.github) {
    frontmatter.external_tools.github = {};
  }

  frontmatter.external_tools.github = {
    type: 'issue',
    id: issueNumber,
    url: issueUrl,
  };

  // Reconstruct file
  const newFrontmatter = yaml.stringify(frontmatter);
  const bodyContent = content.slice(match[0].length);
  const newContent = `---\n${newFrontmatter}---${bodyContent}`;

  await writeFile(featurePath, newContent, 'utf-8');
}

async function syncEpic(epicId: string, specsDir: string): Promise<SyncResult> {
  const epicFolder = path.join(specsDir, epicId);
  const featurePath = path.join(epicFolder, 'FEATURE.md');

  if (!existsSync(featurePath)) {
    throw new Error(`FEATURE.md not found in ${epicFolder}`);
  }

  // Parse Epic
  const epic = await parseEpicFeature(featurePath);

  console.log(`   📦 Epic: ${epic.title}`);
  console.log(`   📊 User Stories: ${epic.userStories.length}`);
  console.log(`   📍 Status: ${epic.status}`);

  // Check if Epic already has GitHub issue
  if (epic.githubIssue) {
    console.log(`   ♻️  Updating existing Issue #${epic.githubIssue}...`);
    await updateGitHubIssue(
      epic.githubIssue,
      epic.id,
      epic.title,
      epic.status,
      epic.userStories
    );
    return {
      epicId,
      epicTitle: epic.title,
      success: true,
      issueNumber: epic.githubIssue,
      issueUrl: epic.githubUrl || undefined,
      status: 'updated',
    };
  }

  // Search GitHub for existing issue
  console.log(`   🔍 Searching GitHub for existing issue...`);
  const existingIssue = await searchExistingIssue(epic.id);

  if (existingIssue) {
    console.log(`   ♻️  Found existing Issue #${existingIssue} (self-healing)...`);
    const issueUrl = `https://github.com/anton-abyzov/specweave/issues/${existingIssue}`;
    await updateFeatureFile(featurePath, existingIssue, issueUrl);
    await updateGitHubIssue(
      existingIssue,
      epic.id,
      epic.title,
      epic.status,
      epic.userStories
    );
    return {
      epicId,
      epicTitle: epic.title,
      success: true,
      issueNumber: existingIssue,
      issueUrl,
      status: 'existing',
    };
  }

  // Create new issue
  console.log(`   🚀 Creating new GitHub Issue...`);
  const { number, url } = await createGitHubIssue(
    epic.id,
    epic.title,
    epic.status,
    epic.userStories
  );

  // Update FEATURE.md
  await updateFeatureFile(featurePath, number, url);

  return {
    epicId,
    epicTitle: epic.title,
    success: true,
    issueNumber: number,
    issueUrl: url,
    status: 'created',
  };
}

async function syncAllEpics(): Promise<void> {
  console.log('🚀 Syncing All Epic Specs to GitHub\n');
  console.log('═'.repeat(80));

  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave/docs/internal/specs/default');

  // Get all Epic folders
  const epicFolders = await getAllEpicFolders(specsDir);
  console.log(`\n📦 Found ${epicFolders.length} Epic specs to sync\n`);

  // Sync each Epic
  const results: SyncResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let existingCount = 0;

  for (let i = 0; i < epicFolders.length; i++) {
    const epicId = epicFolders[i];
    console.log(`\n[${i + 1}/${epicFolders.length}] Syncing ${epicId}...`);
    console.log('─'.repeat(80));

    try {
      const result = await syncEpic(epicId, specsDir);
      results.push(result);
      successCount++;

      if (result.status === 'created') {
        createdCount++;
        console.log(`   ✅ Created Issue #${result.issueNumber}`);
      } else if (result.status === 'updated') {
        updatedCount++;
        console.log(`   ✅ Updated Issue #${result.issueNumber}`);
      } else if (result.status === 'existing') {
        existingCount++;
        console.log(`   ✅ Self-healed (linked existing Issue #${result.issueNumber})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        epicId,
        epicTitle: epicId.replace(/^FS-\d{2}-\d{2}-\d{2}-/, ''),
        success: false,
        error: errorMessage,
      });

      failureCount++;
      console.error(`   ❌ Failed: ${errorMessage}`);
    }

    // Rate limiting: wait 2 seconds between syncs
    if (i < epicFolders.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 SYNC SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\n✅ Successful: ${successCount}/${epicFolders.length}`);
  console.log(`❌ Failed: ${failureCount}/${epicFolders.length}`);
  console.log(`\n   🆕 Created: ${createdCount}`);
  console.log(`   ♻️  Updated: ${updatedCount}`);
  console.log(`   🔗 Self-healed: ${existingCount}`);

  // Print detailed results
  if (failureCount > 0) {
    console.log('\n\n❌ FAILED SYNCS:');
    console.log('─'.repeat(80));
    const failedResults = results.filter((r) => !r.success);
    for (const result of failedResults) {
      console.log(`\n${result.epicId}`);
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('\n✨ All done!\n');
}

// Run the sync
syncAllEpics().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
