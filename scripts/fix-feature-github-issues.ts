#!/usr/bin/env tsx
/**
 * Fix Existing Feature GitHub Issues
 *
 * Updates existing GitHub issues to fix:
 * 1. Type: Epic → Type: Feature (correct GitHub mapping)
 * 2. Local file paths → GitHub URLs
 *
 * According to Universal Hierarchy:
 * - FS-* (Epic) → GitHub: Milestone OR Issue (Type: Feature)
 * - GitHub doesn't have "Epic" as issue type
 * - Use "Feature" for all FS-* Issues
 */

import { execFileSync } from 'child_process';

const GITHUB_REPO_OWNER = 'anton-abyzov';
const GITHUB_REPO_NAME = 'specweave';
const GITHUB_BRANCH = 'develop';

/**
 * Convert local file path to GitHub URL
 */
function toGitHubUrl(localPath: string): string {
  // Keep .specweave folder name (don't remove the dot)
  // Remove leading ./ but keep .specweave
  const cleanPath = localPath.replace(/^\.\//, '');
  return `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/blob/${GITHUB_BRANCH}/${cleanPath}`;
}

/**
 * Fix issue body by replacing Type and converting paths to URLs
 */
function fixIssueBody(body: string): string {
  let fixed = body;

  // Fix 1: Replace "Type: Epic" with "Type: Feature"
  fixed = fixed.replace(/\*\*Type\*\*:\s*Epic/g, '**Type**: Feature');

  // Fix 2: Convert local file paths to GitHub URLs
  // Pattern: **Full spec**: `.specweave/docs/...`
  fixed = fixed.replace(
    /\*\*Full spec\*\*:\s*`(.specweave\/[^`]+)`/g,
    (match, localPath) => {
      const githubUrl = toGitHubUrl(localPath);
      return `**Full spec**: [FEATURE.md](${githubUrl})`;
    }
  );

  // Fix 3: Convert any other local .specweave paths to GitHub URLs
  fixed = fixed.replace(
    /`(\.specweave\/[^`]+)`/g,
    (match, localPath) => {
      const githubUrl = toGitHubUrl(localPath);
      const fileName = localPath.split('/').pop();
      return `[${fileName}](${githubUrl})`;
    }
  );

  return fixed;
}

/**
 * Get issue body using gh CLI
 */
function getIssueBody(issueNumber: number): string {
  try {
    const output = execFileSync(
      'gh',
      ['issue', 'view', issueNumber.toString(), '--json', 'body', '-q', '.body'],
      { encoding: 'utf-8' }
    );
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to fetch issue #${issueNumber}: ${error.message}`);
  }
}

/**
 * Update issue body using gh CLI
 */
function updateIssueBody(issueNumber: number, newBody: string): void {
  try {
    execFileSync(
      'gh',
      ['issue', 'edit', issueNumber.toString(), '--body', newBody],
      { encoding: 'utf-8' }
    );
  } catch (error: any) {
    throw new Error(`Failed to update issue #${issueNumber}: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  npx tsx scripts/fix-feature-github-issues.ts <issue-number> [issue-number...]

Example:
  npx tsx scripts/fix-feature-github-issues.ts 293
  npx tsx scripts/fix-feature-github-issues.ts 293 294 295

This script fixes:
  1. Type: Epic → Type: Feature (correct GitHub mapping)
  2. Local paths → GitHub URLs
`);
    process.exit(0);
  }

  const issueNumbers = args.map(arg => parseInt(arg, 10)).filter(n => !isNaN(n));

  if (issueNumbers.length === 0) {
    console.error('❌ No valid issue numbers provided');
    process.exit(1);
  }

  console.log(`\n🔧 Fixing ${issueNumbers.length} GitHub issue(s)...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const issueNumber of issueNumbers) {
    try {
      console.log(`📝 Issue #${issueNumber}:`);

      // 1. Get current body
      console.log('   ⏳ Fetching issue...');
      const originalBody = getIssueBody(issueNumber);

      // 2. Fix body
      console.log('   🔧 Fixing content...');
      const fixedBody = fixIssueBody(originalBody);

      // 3. Check if changes were made
      if (originalBody === fixedBody) {
        console.log('   ℹ️  No changes needed (already correct)');
        successCount++;
        continue;
      }

      // 4. Show changes
      const hasTypeFixed = originalBody.includes('Type**: Epic') && fixedBody.includes('Type**: Feature');
      const hasPathsFixed = originalBody.match(/`\.specweave\//) && !fixedBody.match(/`\.specweave\//);

      console.log('   ✓ Changes detected:');
      if (hasTypeFixed) {
        console.log('     - Type: Epic → Type: Feature');
      }
      if (hasPathsFixed) {
        console.log('     - Local paths → GitHub URLs');
      }

      // 5. Update issue
      console.log('   ⏳ Updating issue...');
      updateIssueBody(issueNumber, fixedBody);

      console.log('   ✅ Issue #${issueNumber} fixed!');
      console.log(`   🔗 https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues/${issueNumber}\n`);

      successCount++;
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${successCount}/${issueNumbers.length}`);
  console.log(`   ❌ Failed: ${errorCount}/${issueNumbers.length}`);
  console.log();

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
});
