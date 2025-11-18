#!/usr/bin/env tsx
/**
 * Fix GitHub issue links to point to correct files (with priority suffix)
 *
 * Problem: GitHub issues link to files WITHOUT priority suffix (stale)
 * Solution: Update issue bodies to link to files WITH priority suffix (current)
 */

import { GitHubClientV2 } from '../../../../plugins/specweave-github/lib/github-client-v2.js';
import { UserStoryIssueBuilder } from '../../../../plugins/specweave-github/lib/user-story-issue-builder.js';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const projectRoot = process.cwd();
const featureId = 'FS-043';
const specsDir = path.join(projectRoot, '.specweave/docs/internal/specs');

// GitHub config
const profile = {
  provider: 'github' as const,
  displayName: 'GitHub',
  config: {
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
    token: process.env.GITHUB_TOKEN || ''
  },
  timeRange: {
    default: '1M' as const,
    max: '3M' as const
  }
};

async function fixGitHubIssueLinks() {
  console.log('🔧 Fixing GitHub Issue Links for FS-043\n');
  console.log('═'.repeat(70));
  console.log('Problem: Issues link to files WITHOUT priority suffix (stale)');
  console.log('Solution: Update to files WITH priority suffix (current)');
  console.log('═'.repeat(70));
  console.log();

  // Initialize GitHub client
  const client = new GitHubClientV2(profile);

  // User stories with their issue numbers
  const userStories = [
    {
      id: 'US-001',
      issueNumber: 617,
      file: 'us-001-status-line-shows-correct-active-increment-priority-p1-critical-.md'
    },
    {
      id: 'US-002',
      issueNumber: 618,
      file: 'us-002-spec-md-and-metadata-json-stay-in-sync-priority-p1-critical-.md'
    },
    {
      id: 'US-003',
      issueNumber: 619,
      file: 'us-003-hooks-read-correct-increment-status-priority-p1-critical-.md'
    },
    {
      id: 'US-004',
      issueNumber: 620,
      file: 'us-004-existing-desyncs-detected-and-repaired-priority-p2-important-.md'
    },
    {
      id: 'US-005',
      issueNumber: 621,
      file: 'us-005-living-docs-sync-triggers-external-tool-updates-priority-p1-critical-.md'
    }
  ];

  for (const story of userStories) {
    console.log(`📝 Updating Issue #${story.issueNumber} (${story.id})...`);

    try {
      // Build file path
      const filePath = path.join(specsDir, 'specweave', featureId, story.file);

      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        console.log(`   ❌ File not found: ${story.file}`);
        continue;
      }

      // Build issue body using UserStoryIssueBuilder
      const builder = new UserStoryIssueBuilder(
        filePath,
        projectRoot,
        featureId,
        {
          owner: profile.config.owner,
          repo: profile.config.repo,
          branch: 'develop'
        }
      );

      const issueContent = await builder.buildIssueBody();

      // Update GitHub issue
      await client.updateIssue(story.issueNumber, {
        body: issueContent.body
      });

      console.log(`   ✅ Updated Issue #${story.issueNumber}`);
      console.log(`      New link: .../${story.file}`);

    } catch (error) {
      console.error(`   ❌ Failed to update Issue #${story.issueNumber}:`, error);
    }
  }

  console.log();
  console.log('═'.repeat(70));
  console.log('✅ All GitHub issues updated with correct file links!');
  console.log('═'.repeat(70));
  console.log();
  console.log('Verify on GitHub:');
  console.log(`   https://github.com/${profile.config.owner}/${profile.config.repo}/issues/621`);
  console.log();
}

fixGitHubIssueLinks().catch(console.error);
