#!/usr/bin/env tsx
/**
 * Update existing GitHub issues with tasks from user story files
 */

import { UserStoryIssueBuilder } from '../../../../plugins/specweave-github/lib/user-story-issue-builder.js';
import fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const projectRoot = process.cwd();

const userStories = [
  { id: 'US-001', issue: 617, file: 'us-001-status-line-shows-correct-active-increment.md' },
  { id: 'US-002', issue: 618, file: 'us-002-spec-md-and-metadata-json-stay-in-sync.md' },
  { id: 'US-003', issue: 619, file: 'us-003-hooks-read-correct-increment-status.md' },
  { id: 'US-004', issue: 620, file: 'us-004-existing-desyncs-detected-and-repaired.md' },
  { id: 'US-005', issue: 621, file: 'us-005-living-docs-sync-triggers-external-tool-updates.md' }
];

async function updateGitHubIssues() {
  console.log('🔄 Updating GitHub issues with tasks...\n');

  const owner = process.env.GITHUB_OWNER || 'anton-abyzov';
  const repo = process.env.GITHUB_REPO || 'specweave';
  const basePath = path.join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-043');

  for (const story of userStories) {
    try {
      console.log(`📝 Updating issue #${story.issue} (${story.id})...`);

      // Read user story file
      const filePath = path.join(basePath, story.file);
      if (!fs.existsSync(filePath)) {
        console.log(`   ❌ File not found: ${filePath}\n`);
        continue;
      }

      // Build issue body using UserStoryIssueBuilder
      const builder = new UserStoryIssueBuilder(
        filePath,
        projectRoot,
        'FS-043',
        {
          owner: owner,
          repo: repo,
          branch: 'develop'
        }
      );

      const issueData = await builder.buildIssueBody();

      console.log(`   - Issue body length: ${issueData.body.length} chars`);

      // Check if issue body contains tasks
      const hasTasksSection = issueData.body.includes('## Tasks');
      console.log(`   - Has tasks section: ${hasTasksSection}`);

      if (!hasTasksSection) {
        console.log(`   ⚠️  No tasks section in issue body\n`);
        continue;
      }

      const issueBody = issueData.body;

      // Update GitHub issue using gh CLI
      // Create temp file for issue body
      const tempFile = path.join(projectRoot, `.temp-issue-${story.issue}.md`);
      await fs.writeFile(tempFile, issueBody, 'utf-8');

      console.log(`   - Updating GitHub issue...`);

      const cmd = `gh issue edit ${story.issue} --body-file "${tempFile}" --repo ${owner}/${repo}`;
      const { stdout, stderr } = await execAsync(cmd);

      if (stderr && !stderr.includes('https://')) {
        console.log(`   ⚠️  Warning: ${stderr}`);
      }

      // Clean up temp file
      await fs.remove(tempFile);

      console.log(`   ✅ Updated issue #${story.issue}\n`);

    } catch (error) {
      console.error(`   ❌ Error updating issue #${story.issue}:`, error);
      if (error instanceof Error) {
        console.error(`      ${error.message}\n`);
      }
    }
  }

  console.log('✅ GitHub issues updated!');
  console.log(`\n📋 View milestone: https://github.com/${owner}/${repo}/milestone/12\n`);
}

updateGitHubIssues();
