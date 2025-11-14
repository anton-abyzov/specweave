#!/usr/bin/env tsx
/**
 * Create GitHub Issue for Feature Spec (Living Docs)
 *
 * Properly maps SpecWeave hierarchy to GitHub:
 * - FS-* (Epic/Feature) → GitHub Issue (Type: Feature)
 * - US-* (User Story) → Checkbox in issue body
 * - T-* (Task) → Not synced (temporary, in increments)
 *
 * NOTE: GitHub Milestones represent Epics in hierarchical sync.
 * This script creates standalone Feature issues for living docs tracking.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { DuplicateDetector } from '../plugins/specweave-github/lib/duplicate-detector.js';

interface FeatureFrontmatter {
  id: string;
  title: string;
  type: 'epic' | 'feature'; // Internal type (will be mapped to GitHub)
  status: string;
  created: string;
  last_updated: string;
  external_tools?: {
    github?: {
      type?: 'issue' | 'project' | 'milestone';
      id?: number | null;
      url?: string | null;
    };
  };
}

const GITHUB_REPO_OWNER = 'anton-abyzov';
const GITHUB_REPO_NAME = 'specweave';
const GITHUB_BRANCH = 'develop';

/**
 * Map SpecWeave type to GitHub Issue Type
 *
 * According to Universal Hierarchy:
 * - FS-* (Epic) in SpecWeave → GitHub Milestone (hierarchical) OR Issue Type: Feature (flat)
 * - GitHub doesn't have "Epic" as an issue type
 * - Use "Feature" for all FS-* when creating Issues
 */
function mapTypeToGitHub(specweaveType: string): string {
  // Always use "Feature" for GitHub Issues representing FS-* specs
  // "Epic" is only valid for JIRA/ADO, not GitHub
  if (specweaveType === 'epic' || specweaveType === 'feature') {
    return 'Feature';
  }
  return specweaveType;
}

/**
 * Convert local file path to GitHub URL
 */
function toGitHubUrl(localPath: string): string {
  // Keep .specweave folder name (don't remove the dot)
  // Remove leading ./ but keep .specweave
  let cleanPath = localPath.replace(/^\.\//, '');

  // If path doesn't start with .specweave, add it
  if (!cleanPath.startsWith('.specweave')) {
    cleanPath = `.specweave/${cleanPath}`;
  }

  return `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/blob/${GITHUB_BRANCH}/${cleanPath}`;
}

/**
 * Parse FEATURE.md and extract metadata
 */
async function parseFeature(featurePath: string): Promise<{
  frontmatter: FeatureFrontmatter;
  content: string;
  overview: string;
}> {
  const featureFile = path.join(featurePath, 'FEATURE.md');
  const content = await fs.readFile(featureFile, 'utf-8');

  // Extract frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('FEATURE.md missing YAML frontmatter');
  }

  const frontmatter = yaml.parse(match[1]) as FeatureFrontmatter;
  const bodyContent = content.slice(match[0].length).trim();

  // Extract overview (first paragraph after heading)
  const overviewMatch = bodyContent.match(/^#[^\n]+\n+([^\n]+)/);
  const overview = overviewMatch ? overviewMatch[1].trim() : 'No overview available';

  return {
    frontmatter,
    content: bodyContent,
    overview
  };
}

/**
 * Build GitHub Issue body with correct Type mapping and GitHub URLs
 */
function buildIssueBody(
  featureId: string,
  featureFrontmatter: FeatureFrontmatter,
  overview: string,
  featureFolder: string
): string {
  const sections: string[] = [];

  // Header with correct Type mapping
  sections.push(`# ${featureFrontmatter.title}\n`);
  sections.push(`**Feature ID**: \`${featureId}\``);
  sections.push(`**Status**: \`${featureFrontmatter.status}\``);
  sections.push(`**Type**: ${mapTypeToGitHub(featureFrontmatter.type)}`); // ← FIX: Maps epic → Feature
  sections.push('');
  sections.push('---');
  sections.push('');

  // Overview
  sections.push(`This is a **living docs feature** tracking the implementation of this feature.\n`);
  sections.push(`**Overview**: ${overview}\n`);

  sections.push('---');
  sections.push('');

  // Spec Location section with GitHub URL
  const featureMdPath = `.specweave/docs/internal/specs/default/${featureFolder}/FEATURE.md`;
  const featureMdGithubUrl = toGitHubUrl(featureMdPath); // ← GitHub URL conversion
  sections.push('## Spec Location\n');
  sections.push(`**Full specification**: [${featureMdPath}](${featureMdGithubUrl})\n`);

  sections.push('---');
  sections.push('');
  sections.push('_This issue was auto-generated from living docs. See the FEATURE.md file for complete details._');

  return sections.join('\n');
}

// Note: All duplicate detection logic moved to DuplicateDetector module
// This keeps code DRY and ensures consistent behavior across all sync paths

/**
 * Update FEATURE.md with GitHub link
 */
async function updateFeatureWithGitHubLink(
  featurePath: string,
  issueNumber: number,
  issueUrl: string
): Promise<void> {
  const featureFile = path.join(featurePath, 'FEATURE.md');
  let content = await fs.readFile(featureFile, 'utf-8');

  // Parse frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('FEATURE.md missing YAML frontmatter');
  }

  const frontmatter = yaml.parse(match[1]) as FeatureFrontmatter;

  // Update external_tools.github
  if (!frontmatter.external_tools) {
    frontmatter.external_tools = {};
  }

  frontmatter.external_tools.github = {
    type: 'issue',
    id: issueNumber,
    url: issueUrl
  };

  // Replace frontmatter
  const newFrontmatter = yaml.stringify(frontmatter);
  const newContent = content.replace(
    /^---\n[\s\S]*?\n---/,
    `---\n${newFrontmatter}---`
  );

  await fs.writeFile(featureFile, newContent, 'utf-8');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  npx tsx scripts/create-feature-github-issue.ts <feature-folder>

Example:
  npx tsx scripts/create-feature-github-issue.ts FS-25-11-12-multi-project-github-sync

This script:
  1. Reads FEATURE.md from .specweave/docs/internal/specs/default/<feature-folder>/
  2. Creates GitHub Issue with correct Type mapping (epic → Feature)
  3. Converts local paths to GitHub URLs
  4. Updates FEATURE.md frontmatter with GitHub link
`);
    process.exit(0);
  }

  const featureFolder = args[0];
  const specsDir = path.join(process.cwd(), '.specweave', 'docs', 'internal', 'specs', 'default');
  const featurePath = path.join(specsDir, featureFolder);

  console.log(`\n🚀 Creating GitHub Issue for ${featureFolder}\n`);

  // 1. Check feature exists
  if (!await fs.pathExists(featurePath)) {
    console.error(`❌ Feature folder not found: ${featurePath}`);
    process.exit(1);
  }

  // 2. Parse FEATURE.md
  console.log('📄 Parsing FEATURE.md...');
  const { frontmatter, overview } = await parseFeature(featurePath);
  console.log(`   ✓ Feature: ${frontmatter.title}`);
  console.log(`   ✓ Type (SpecWeave): ${frontmatter.type}`);
  console.log(`   ✓ Type (GitHub): ${mapTypeToGitHub(frontmatter.type)}`);
  console.log(`   ✓ Status: ${frontmatter.status}`);

  // 3. Build issue title and body
  console.log('\n📝 Building issue content...');
  const issueTitle = `[${frontmatter.id}] ${frontmatter.title}`;
  const issueBody = buildIssueBody(frontmatter.id, frontmatter, overview, featureFolder);

  console.log(`   ✓ Title: ${issueTitle}`);
  console.log(`   ✓ Body length: ${issueBody.length} chars`);
  console.log(`   ✓ GitHub URLs: Yes (all links converted)`);

  // 4. Create GitHub Issue with FULL PROTECTION (using global DuplicateDetector)
  console.log('\n🛡️  Creating GitHub issue with global duplicate protection...');

  const result = await DuplicateDetector.createWithProtection({
    title: issueTitle,
    body: issueBody,
    titlePattern: `[${frontmatter.id}]`,
    labels: ['specweave', 'feature']
  });

  // 5. Update FEATURE.md
  console.log('\n💾 Updating FEATURE.md with GitHub link...');
  await updateFeatureWithGitHubLink(featurePath, result.issue.number, result.issue.url);
  console.log('   ✓ Frontmatter updated');

  console.log('\n✅ Done!\n');
  console.log(`View issue: ${result.issue.url}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Issue: #${result.issue.number}`);
  console.log(`   Reused existing: ${result.wasReused ? 'Yes' : 'No'}`);
  console.log(`   Duplicates found: ${result.duplicatesFound}`);
  console.log(`   Duplicates closed: ${result.duplicatesClosed}`);
}

main().catch((error) => {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
});
