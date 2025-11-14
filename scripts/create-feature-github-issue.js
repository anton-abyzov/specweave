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
import { execFileSync } from 'child_process';
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
function mapTypeToGitHub(specweaveType) {
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
function toGitHubUrl(localPath) {
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
async function parseFeature(featurePath) {
    const featureFile = path.join(featurePath, 'FEATURE.md');
    const content = await fs.readFile(featureFile, 'utf-8');
    // Extract frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
        throw new Error('FEATURE.md missing YAML frontmatter');
    }
    const frontmatter = yaml.parse(match[1]);
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
function buildIssueBody(featureId, featureFrontmatter, overview, featureFolder) {
    const sections = [];
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
/**
 * Check if GitHub Issue already exists for this feature (DUPLICATE DETECTION)
 */
async function findExistingIssue(featureId) {
    console.log(`🔍 Checking for existing issue with ID: ${featureId}...`);
    try {
        const titlePattern = `[${featureId}]`;
        const output = execFileSync('gh', [
            'issue',
            'list',
            '--search', `"${titlePattern}" in:title`,
            '--json', 'number,title,url',
            '--limit', '10'
        ], { encoding: 'utf-8' });
        const issues = JSON.parse(output);
        if (issues.length === 0) {
            console.log('   ✓ No existing issue found (safe to create)');
            return null;
        }
        // Check for exact title match
        const exactMatch = issues.find(issue => issue.title.includes(`[${featureId}]`));
        if (exactMatch) {
            console.log(`   ⚠️  DUPLICATE DETECTED: Issue #${exactMatch.number} already exists`);
            console.log(`   📎 URL: ${exactMatch.url}`);
            return exactMatch;
        }
        console.log('   ✓ No exact match found (safe to create)');
        return null;
    }
    catch (error) {
        console.warn(`   ⚠️  Could not search GitHub (continuing anyway): ${error.message}`);
        return null;
    }
}
/**
 * Verify sync result - Count check for duplicates (VERIFICATION)
 */
async function verifySyncResult(featureId, expectedCount = 1) {
    console.log(`\n🔍 VERIFICATION: Checking for duplicate issues...`);
    try {
        const titlePattern = `[${featureId}]`;
        const output = execFileSync('gh', [
            'issue',
            'list',
            '--search', `"${titlePattern}" in:title`,
            '--json', 'number,title,url,createdAt',
            '--limit', '20',
            '--state', 'all' // Check both open and closed
        ], { encoding: 'utf-8' });
        const issues = JSON.parse(output);
        // Filter exact matches
        const exactMatches = issues.filter(issue => issue.title.includes(`[${featureId}]`));
        console.log(`   Expected: ${expectedCount} issue(s)`);
        console.log(`   Actual: ${exactMatches.length} issue(s)`);
        if (exactMatches.length === expectedCount) {
            console.log(`   ✅ VERIFICATION PASSED: Count matches!`);
            return { success: true, actualCount: exactMatches.length, duplicates: [] };
        }
        else if (exactMatches.length > expectedCount) {
            console.warn(`   ⚠️  VERIFICATION FAILED: ${exactMatches.length - expectedCount} duplicate(s) detected!`);
            // Sort by creation date (oldest first) to identify duplicates
            const sorted = exactMatches.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            // Keep first, mark rest as duplicates
            const duplicates = sorted.slice(1);
            console.warn(`   📋 Duplicate issues:`);
            duplicates.forEach(dup => {
                console.warn(`      - #${dup.number}: ${dup.title} (${dup.url})`);
            });
            return { success: false, actualCount: exactMatches.length, duplicates };
        }
        else {
            console.warn(`   ⚠️  VERIFICATION WARNING: Expected ${expectedCount} but found ${exactMatches.length}`);
            return { success: false, actualCount: exactMatches.length, duplicates: [] };
        }
    }
    catch (error) {
        console.error(`   ❌ Verification failed: ${error.message}`);
        return { success: false, actualCount: -1, duplicates: [] };
    }
}
/**
 * Auto-correct duplicates by closing them (REFLECTION-BASED CORRECTION)
 */
async function correctDuplicates(featureId, duplicates, keepIssueNumber) {
    console.log(`\n🔧 REFLECTION: Auto-correcting ${duplicates.length} duplicate(s)...`);
    for (const duplicate of duplicates) {
        try {
            console.log(`   🗑️  Closing duplicate #${duplicate.number}...`);
            const comment = `Duplicate of #${keepIssueNumber}\n\nThis issue was automatically closed by SpecWeave because it is a duplicate.\n\nThe original issue (#${keepIssueNumber}) should be used for tracking instead.\n\n🤖 Auto-closed by SpecWeave Duplicate Detection & Reflection`;
            // Add comment
            execFileSync('gh', [
                'issue',
                'comment',
                duplicate.number.toString(),
                '--body', comment
            ], { encoding: 'utf-8' });
            // Close issue
            execFileSync('gh', [
                'issue',
                'close',
                duplicate.number.toString()
            ], { encoding: 'utf-8' });
            console.log(`      ✅ Closed #${duplicate.number}`);
        }
        catch (error) {
            console.error(`      ❌ Failed to close #${duplicate.number}: ${error.message}`);
        }
    }
    console.log(`\n   ✅ REFLECTION COMPLETE: Kept #${keepIssueNumber}, closed ${duplicates.length} duplicate(s)`);
}
/**
 * Create GitHub Issue using gh CLI (with duplicate detection)
 */
async function createGitHubIssue(title, body, featureId, labels = ['specweave', 'feature']) {
    const args = [
        'issue',
        'create',
        '--title', title,
        '--body', body,
        ...labels.flatMap(label => ['--label', label])
    ];
    try {
        const output = execFileSync('gh', args, { encoding: 'utf-8' });
        // Extract issue number from URL
        const match = output.match(/\/issues\/(\d+)/);
        if (!match) {
            throw new Error('Could not extract issue number from gh CLI output');
        }
        const number = parseInt(match[1], 10);
        const url = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues/${number}`;
        return { number, url };
    }
    catch (error) {
        throw new Error(`Failed to create GitHub issue: ${error.message}`);
    }
}
/**
 * Update FEATURE.md with GitHub link
 */
async function updateFeatureWithGitHubLink(featurePath, issueNumber, issueUrl) {
    const featureFile = path.join(featurePath, 'FEATURE.md');
    let content = await fs.readFile(featureFile, 'utf-8');
    // Parse frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
        throw new Error('FEATURE.md missing YAML frontmatter');
    }
    const frontmatter = yaml.parse(match[1]);
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
    const newContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}---`);
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
    // 4. DUPLICATE DETECTION: Check if issue already exists
    console.log('\n🔍 STEP 1: Checking for duplicates...');
    const existing = await findExistingIssue(frontmatter.id);
    let issueNumber;
    let issueUrl;
    if (existing) {
        console.log(`\n♻️  Using existing issue #${existing.number} (skipping creation)`);
        issueNumber = existing.number;
        issueUrl = existing.url;
    }
    else {
        // 5. Create GitHub Issue (only if no duplicate found)
        console.log('\n🌐 STEP 2: Creating GitHub Issue...');
        const result = await createGitHubIssue(issueTitle, issueBody, frontmatter.id);
        issueNumber = result.number;
        issueUrl = result.url;
        console.log(`   ✓ Issue created: #${issueNumber}`);
        console.log(`   ✓ URL: ${issueUrl}`);
    }
    // 6. VERIFICATION: Count check for duplicates
    console.log('\n🔍 STEP 3: VERIFICATION...');
    const verification = await verifySyncResult(frontmatter.id, 1);
    if (!verification.success && verification.duplicates.length > 0) {
        // 7. REFLECTION: Auto-correct duplicates
        console.log(`\n⚠️  VERIFICATION FAILED: ${verification.duplicates.length} duplicate(s) found!`);
        console.log(`\n🔧 STEP 4: REFLECTION - Auto-correcting duplicates...`);
        await correctDuplicates(frontmatter.id, verification.duplicates, issueNumber);
        console.log(`\n✅ REFLECTION COMPLETE: Repository cleaned up!`);
    }
    else if (verification.success) {
        console.log(`\n✅ VERIFICATION PASSED: No duplicates detected!`);
    }
    // 8. Update FEATURE.md
    console.log('\n💾 STEP 5: Updating FEATURE.md with GitHub link...');
    await updateFeatureWithGitHubLink(featurePath, issueNumber, issueUrl);
    console.log('   ✓ Frontmatter updated');
    console.log('\n✅ Done!\n');
    console.log(`View issue: ${issueUrl}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Issue: #${issueNumber}`);
    console.log(`   Duplicates found: ${verification.actualCount - 1}`);
    console.log(`   Duplicates closed: ${verification.duplicates.length}`);
}
main().catch((error) => {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
});
