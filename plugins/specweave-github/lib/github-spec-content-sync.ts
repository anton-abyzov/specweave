/**
 * GitHub Spec Content Sync
 *
 * Syncs spec CONTENT (title, description, user stories) to GitHub Issues.
 * Does NOT sync STATUS - that's managed in GitHub.
 *
 * Sync Direction:
 * - Title/Description: SpecWeave → GitHub (we update)
 * - Status (open/closed): GitHub → SpecWeave (we read)
 */

import { GitHubClientV2 } from './github-client-v2.js';
import {
  parseSpecContent,
  detectContentChanges,
  buildExternalDescription,
  hasExternalLink,
  updateSpecWithExternalLink,
  wasSpecModifiedSinceSync,
  SpecContent,
  ContentSyncResult,
} from '../../../src/core/spec-content-sync.js';
import path from 'path';
import fs from 'fs/promises';

export interface GitHubContentSyncOptions {
  specPath: string;
  owner: string;
  repo: string;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Sync spec content to GitHub issue
 * Creates issue if it doesn't exist, updates if it does
 */
export async function syncSpecContentToGitHub(
  options: GitHubContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, owner, repo, dryRun = false, verbose = false } = options;

  try {
    // 1. Parse spec content
    const spec = await parseSpecContent(specPath);
    if (!spec) {
      return {
        success: false,
        action: 'error',
        error: 'Failed to parse spec content',
      };
    }

    if (verbose) {
      console.log(`📄 Parsed spec: ${spec.id}`);
      console.log(`   Title: ${spec.title}`);
      console.log(`   User Stories: ${spec.userStories.length}`);
    }

    // 2. Check if issue already exists
    const existingIssueNumber = await hasExternalLink(specPath, 'github');

    const client = GitHubClientV2.fromRepo(owner, repo);

    if (existingIssueNumber) {
      // UPDATE existing issue
      return await updateGitHubIssue(client, spec, parseInt(existingIssueNumber), options);
    } else {
      // CREATE new issue
      return await createGitHubIssue(client, spec, options);
    }
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: error.message,
    };
  }
}

/**
 * Create new GitHub issue from spec
 */
async function createGitHubIssue(
  client: GitHubClientV2,
  spec: SpecContent,
  options: GitHubContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, dryRun, verbose } = options;

  try {
    // Build issue title and body
    const title = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const body = buildExternalDescription(spec);

    if (verbose) {
      console.log(`\n📝 Creating GitHub issue:`);
      console.log(`   Title: ${title}`);
      console.log(`   Body length: ${body.length} chars`);
    }

    if (dryRun) {
      console.log('\n🔍 Dry run - would create issue:');
      console.log(`   Title: ${title}`);
      console.log(`   Body:\n${body}`);

      return {
        success: true,
        action: 'created',
        externalId: 'DRY-RUN',
        externalUrl: 'https://github.com/DRY-RUN',
      };
    }

    // Create issue
    const labels = ['specweave', 'spec', spec.metadata.priority || 'P2'].filter(Boolean);
    const issue = await client.createEpicIssue(title, body, undefined, labels);

    if (verbose) {
      console.log(`✅ Created issue #${issue.number}`);
      console.log(`   URL: ${issue.html_url}`);
    }

    // Update spec with GitHub link
    await updateSpecWithExternalLink(
      specPath,
      'github',
      issue.number.toString(),
      issue.html_url
    );

    return {
      success: true,
      action: 'created',
      externalId: issue.number.toString(),
      externalUrl: issue.html_url,
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Failed to create GitHub issue: ${error.message}`,
    };
  }
}

/**
 * Update existing GitHub issue with spec content
 */
async function updateGitHubIssue(
  client: GitHubClientV2,
  spec: SpecContent,
  issueNumber: number,
  options: GitHubContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, dryRun, verbose } = options;

  try {
    // Get current issue
    const issue = await client.getIssue(issueNumber);

    if (verbose) {
      console.log(`\n🔄 Checking for changes in issue #${issueNumber}`);
    }

    // Detect changes
    const changes = detectContentChanges(spec, {
      title: issue.title.replace(/^\[SPEC-\d+\]\s*/, ''),
      description: issue.body || '',
      userStoryCount: countUserStoriesInBody(issue.body || ''),
    });

    if (!changes.hasChanges) {
      if (verbose) {
        console.log('   ℹ️  No changes detected');
      }

      return {
        success: true,
        action: 'no-change',
        externalId: issueNumber.toString(),
        externalUrl: issue.html_url,
      };
    }

    if (verbose) {
      console.log('   📝 Changes detected:');
      for (const change of changes.changes) {
        console.log(`      - ${change}`);
      }
    }

    // Build updated content
    const newTitle = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const newBody = buildExternalDescription(spec);

    if (dryRun) {
      console.log('\n🔍 Dry run - would update issue:');
      console.log(`   Title: ${newTitle}`);
      console.log(`   Body:\n${newBody}`);

      return {
        success: true,
        action: 'updated',
        externalId: issueNumber.toString(),
        externalUrl: issue.html_url,
      };
    }

    // Update issue (ONLY title and description, NOT status!)
    await client.updateIssueBody(issueNumber, newBody);

    // Note: We do NOT update status/state - that's managed in GitHub
    // We also do NOT close/reopen issues - that's done by humans/automation in GitHub

    if (verbose) {
      console.log(`✅ Updated issue #${issueNumber}`);
    }

    return {
      success: true,
      action: 'updated',
      externalId: issueNumber.toString(),
      externalUrl: issue.html_url,
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Failed to update GitHub issue: ${error.message}`,
    };
  }
}

/**
 * Count user stories in issue body
 */
function countUserStoriesInBody(body: string): number {
  const matches = body.match(/###\s+US-\d+:/g);
  return matches ? matches.length : 0;
}

/**
 * Check if spec content sync is enabled
 */
export async function isContentSyncEnabled(projectRoot: string): Promise<boolean> {
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

    return config.sync?.settings?.syncSpecContent !== false;
  } catch {
    return true; // Default: enabled
  }
}
