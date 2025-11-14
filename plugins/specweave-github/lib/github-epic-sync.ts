/**
 * GitHub Epic Sync - Hierarchical synchronization for Epic folder structure
 *
 * Architecture:
 * - Epic (FS-001) → GitHub Milestone
 * - Increment (0001-core-framework) → GitHub Issue (linked to Milestone)
 *
 * This implements the Universal Hierarchy architecture for GitHub.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { GitHubClientV2 } from './github-client-v2.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { DuplicateDetector } from './duplicate-detector.js';

interface EpicFrontmatter {
  id: string;
  title: string;
  type: 'epic';
  status: 'complete' | 'active' | 'planning' | 'archived';
  priority: string;
  created: string;
  last_updated: string;
  external_tools: {
    github: {
      type: 'milestone';
      id: number | null;
      url: string | null;
    };
    jira: {
      type: 'epic';
      key: string | null;
      url: string | null;
    };
    ado: {
      type: 'feature';
      id: number | null;
      url: string | null;
    };
  };
  increments: Array<{
    id: string;
    status: string;
    external: {
      github: number | null;
      jira: string | null;
      ado: number | null;
    };
  }>;
  total_increments: number;
  completed_increments: number;
  progress: string;
}

interface IncrementFrontmatter {
  id: string;
  epic: string;
  type?: string;
  status?: string;
  external?: {
    github?: {
      issue: number | null;
      url: string | null;
    };
    jira?: {
      story: string | null;
      url: string | null;
    };
    ado?: {
      user_story: number | null;
      url: string | null;
    };
  };
}

export class GitHubEpicSync {
  private client: GitHubClientV2;
  private specsDir: string;

  constructor(client: GitHubClientV2, specsDir: string) {
    this.client = client;
    this.specsDir = specsDir;
  }

  /**
   * Sync Epic folder to GitHub (Milestone + Issues)
   */
  async syncEpicToGitHub(epicId: string): Promise<{
    milestoneNumber: number;
    milestoneUrl: string;
    issuesCreated: number;
    issuesUpdated: number;
    duplicatesDetected: number;
  }> {
    console.log(`\n🔄 Syncing Epic ${epicId} to GitHub...`);

    // 1. Load Epic FEATURE.md
    const epicFolder = await this.findEpicFolder(epicId);
    if (!epicFolder) {
      throw new Error(`Epic ${epicId} not found in ${this.specsDir}`);
    }

    const readmePath = path.join(epicFolder, 'FEATURE.md');
    const epicData = await this.parseEpicReadme(readmePath);

    console.log(`   📦 Epic: ${epicData.title}`);
    console.log(`   📊 Increments: ${epicData.total_increments}`);

    // 2. Create or update GitHub Milestone
    let milestoneNumber = epicData.external_tools.github.id;
    let milestoneUrl = epicData.external_tools.github.url;

    if (!milestoneNumber) {
      console.log(`   🚀 Creating GitHub Milestone...`);
      const milestone = await this.createMilestone(epicData);
      milestoneNumber = milestone.number;
      milestoneUrl = milestone.url;
      console.log(`   ✅ Created Milestone #${milestoneNumber}`);

      // Update Epic README with Milestone ID
      await this.updateEpicReadme(readmePath, {
        type: 'milestone',
        id: milestoneNumber,
        url: milestoneUrl,
      });
    } else {
      console.log(`   ♻️  Updating existing Milestone #${milestoneNumber}...`);
      await this.updateMilestone(milestoneNumber, epicData);
      console.log(`   ✅ Updated Milestone #${milestoneNumber}`);
    }

    // 3. Sync each increment as GitHub Issue (WITH DUPLICATE DETECTION!)
    let issuesCreated = 0;
    let issuesUpdated = 0;
    let duplicatesDetected = 0;

    console.log(`\n   📝 Syncing ${epicData.increments.length} increments...`);

    for (const increment of epicData.increments) {
      const incrementFile = path.join(epicFolder, `${increment.id}.md`);
      if (!existsSync(incrementFile)) {
        console.log(`   ⚠️  Increment file not found: ${increment.id}.md`);
        continue;
      }

      const incrementData = await this.parseIncrementFile(incrementFile);
      const existingIssue = increment.external.github;

      if (!existingIssue) {
        // NEW: Check GitHub FIRST before creating (duplicate detection!)
        console.log(`   🔍 Checking GitHub for existing issue: ${increment.id}...`);
        const githubIssue = await this.findExistingIssue(epicData.id, increment.id);

        if (githubIssue) {
          // Found existing issue! Re-link it instead of creating duplicate
          console.log(`   ♻️  Found existing Issue #${githubIssue} for ${increment.id} (self-healing)`);
          await this.updateIncrementExternalLink(
            readmePath,
            incrementFile,
            increment.id,
            githubIssue
          );
          issuesUpdated++;
          duplicatesDetected++;
        } else {
          // Truly new issue - create it
          const issueNumber = await this.createIssue(
            epicData.id,
            incrementData,
            milestoneNumber!
          );
          issuesCreated++;
          console.log(`   ✅ Created Issue #${issueNumber} for ${increment.id}`);

          // Update Epic README and Increment file
          await this.updateIncrementExternalLink(
            readmePath,
            incrementFile,
            increment.id,
            issueNumber
          );
        }
      } else {
        // Update existing issue
        await this.updateIssue(
          epicData.id,
          existingIssue,
          incrementData,
          milestoneNumber!
        );
        issuesUpdated++;
        console.log(`   ♻️  Updated Issue #${existingIssue} for ${increment.id}`);
      }
    }

    console.log(`\n✅ Epic sync complete!`);
    console.log(`   Milestone: ${milestoneUrl}`);
    console.log(`   Issues created: ${issuesCreated}`);
    console.log(`   Issues updated: ${issuesUpdated}`);
    if (duplicatesDetected > 0) {
      console.log(`   🔗 Self-healed: ${duplicatesDetected} (found existing issues)`);
    }

    // 4. Post-sync validation: Check for duplicates
    console.log(`\n🔍 Post-sync validation...`);
    const validation = await this.validateSync(epicData.id);

    if (validation.duplicatesFound > 0) {
      console.warn(`\n⚠️  WARNING: ${validation.duplicatesFound} duplicate(s) detected!`);
      console.warn(`   This may indicate a previous sync created duplicates.`);
      console.warn(`   Run cleanup command to resolve:`);
      console.warn(`   /specweave-github:cleanup-duplicates ${epicData.id}`);
      console.warn(`\n   Duplicate groups:`);
      for (const [title, numbers] of validation.duplicateGroups) {
        console.warn(`   - "${title}": Issues #${numbers.join(', #')}`);
      }
    } else {
      console.log(`   ✅ No duplicates found`);
    }

    return {
      milestoneNumber: milestoneNumber!,
      milestoneUrl: milestoneUrl!,
      issuesCreated,
      issuesUpdated,
      duplicatesDetected,
    };
  }

  /**
   * Validate sync results - check for duplicate issues
   *
   * Searches GitHub for all issues with the Epic ID and detects duplicates
   * (multiple issues with the same title).
   *
   * @param epicId - Epic ID (e.g., FS-031)
   * @returns Validation result with duplicate count and groups
   */
  private async validateSync(epicId: string): Promise<{
    totalIssues: number;
    duplicatesFound: number;
    duplicateGroups: Array<[string, number[]]>;
  }> {
    try {
      // Search for all issues with Epic ID in title
      const titlePattern = `[${epicId}]`;

      const result = await execFileNoThrow('gh', [
        'issue',
        'list',
        '--search',
        `"${titlePattern}" in:title`,
        '--json',
        'number,title,state',
        '--limit',
        '100', // Check up to 100 issues
        '--state',
        'all', // Include both open and closed
      ]);

      if (result.exitCode !== 0 || !result.stdout) {
        console.warn(`   ⚠️  Validation failed: ${result.stderr || 'unknown error'}`);
        return { totalIssues: 0, duplicatesFound: 0, duplicateGroups: [] };
      }

      const issues = JSON.parse(result.stdout) as Array<{
        number: number;
        title: string;
        state: string;
      }>;

      // Group issues by title
      const titleGroups = new Map<string, number[]>();
      for (const issue of issues) {
        const title = issue.title;
        if (!titleGroups.has(title)) {
          titleGroups.set(title, []);
        }
        titleGroups.get(title)!.push(issue.number);
      }

      // Find duplicates (titles with more than one issue)
      const duplicateGroups: Array<[string, number[]]> = [];
      for (const [title, numbers] of titleGroups.entries()) {
        if (numbers.length > 1) {
          duplicateGroups.push([title, numbers]);
        }
      }

      return {
        totalIssues: issues.length,
        duplicatesFound: duplicateGroups.length,
        duplicateGroups,
      };
    } catch (error) {
      console.warn(`   ⚠️  Validation error: ${error}`);
      return { totalIssues: 0, duplicatesFound: 0, duplicateGroups: [] };
    }
  }

  /**
   * Find existing GitHub issue for increment (duplicate detection!)
   *
   * Searches GitHub for issues matching the Epic ID and Increment ID.
   * This prevents creating duplicates when frontmatter is lost/corrupted.
   *
   * @param epicId - Epic ID (e.g., FS-031)
   * @param incrementId - Increment ID (e.g., 0031-feature-name)
   * @returns GitHub issue number if found, null otherwise
   */
  private async findExistingIssue(
    epicId: string,
    incrementId: string
  ): Promise<number | null> {
    try {
      // Search GitHub for issues with Epic ID in title
      // Pattern: "[FS-031] Title" or "[INC-0031] Title"
      const titlePattern = `[${epicId}]`;

      const result = await execFileNoThrow('gh', [
        'issue',
        'list',
        '--search',
        `"${titlePattern}" in:title`,
        '--json',
        'number,title,body',
        '--limit',
        '50', // Check up to 50 issues (should cover most Epics)
      ]);

      if (result.exitCode !== 0 || !result.stdout) {
        console.warn(`   ⚠️  GitHub search failed: ${result.stderr || 'unknown error'}`);
        return null;
      }

      const issues = JSON.parse(result.stdout) as Array<{
        number: number;
        title: string;
        body: string;
      }>;

      if (issues.length === 0) {
        return null; // No issues found for this Epic
      }

      // Find issue that mentions this increment ID in body
      // Look for patterns like "**Increment**: 0031-feature-name"
      for (const issue of issues) {
        if (issue.body && issue.body.includes(`**Increment**: ${incrementId}`)) {
          console.log(
            `   🔗 Found existing issue #${issue.number} for ${incrementId}`
          );
          return issue.number;
        }
      }

      // Fallback: Check if increment ID is in title
      // Pattern: "[INC-0031-feature-name] Title"
      for (const issue of issues) {
        if (issue.title.toLowerCase().includes(incrementId.toLowerCase())) {
          console.log(
            `   🔗 Found existing issue #${issue.number} for ${incrementId} (title match)`
          );
          return issue.number;
        }
      }

      return null; // No matching issue found
    } catch (error) {
      console.warn(`   ⚠️  Error searching for existing issue: ${error}`);
      return null; // Fail gracefully - continue with sync
    }
  }

  /**
   * Find Epic folder by ID (FS-001 or just 001)
   */
  private async findEpicFolder(epicId: string): Promise<string | null> {
    const normalizedId = epicId.startsWith('FS-')
      ? epicId
      : `FS-${epicId.padStart(3, '0')}`;

    const folders = await readdir(this.specsDir);
    for (const folder of folders) {
      if (folder.startsWith(normalizedId)) {
        return path.join(this.specsDir, folder);
      }
    }

    return null;
  }

  /**
   * Parse Epic FEATURE.md to extract frontmatter
   */
  private async parseEpicReadme(
    readmePath: string
  ): Promise<EpicFrontmatter> {
    const content = await readFile(readmePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error('Epic FEATURE.md missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(match[1]) as EpicFrontmatter;
    return frontmatter;
  }

  /**
   * Parse increment file to extract title and overview
   */
  private async parseIncrementFile(
    filePath: string
  ): Promise<{
    id: string;
    title: string;
    overview: string;
    content: string;
    frontmatter: IncrementFrontmatter;
  }> {
    const content = await readFile(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    let frontmatter: IncrementFrontmatter = { id: '', epic: '' };
    let bodyContent = content;

    if (match) {
      frontmatter = yaml.parse(match[1]) as IncrementFrontmatter;
      bodyContent = content.slice(match[0].length).trim();
    }

    // Extract title
    const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
    const title = titleMatch
      ? titleMatch[1].trim()
      : frontmatter.id || path.basename(filePath, '.md');

    // Extract overview (first paragraph after title)
    const overviewMatch = bodyContent.match(/^#[^\n]+\n+([^\n]+)/);
    const overview = overviewMatch
      ? overviewMatch[1].trim()
      : 'No overview available';

    return {
      id: frontmatter.id,
      title,
      overview,
      content: bodyContent,
      frontmatter,
    };
  }

  /**
   * Create GitHub Milestone
   */
  private async createMilestone(epic: EpicFrontmatter): Promise<{
    number: number;
    url: string;
  }> {
    const title = `[${epic.id}] ${epic.title}`;
    const description = `Epic: ${epic.title}\n\nProgress: ${epic.completed_increments}/${epic.total_increments} increments (${epic.progress})\n\nPriority: ${epic.priority}\nStatus: ${epic.status}`;

    // Determine milestone state
    const state = epic.status === 'complete' ? 'closed' : 'open';

    // Use GitHub CLI to create milestone
    const result = await execFileNoThrow('gh', [
      'api',
      '/repos/{owner}/{repo}/milestones',
      '-X',
      'POST',
      '-f',
      `title=${title}`,
      '-f',
      `description=${description}`,
      '-f',
      `state=${state}`,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to create GitHub Milestone: ${result.stderr || result.stdout}`
      );
    }

    const milestone = JSON.parse(result.stdout);
    return {
      number: milestone.number,
      url: milestone.html_url,
    };
  }

  /**
   * Update GitHub Milestone
   */
  private async updateMilestone(
    milestoneNumber: number,
    epic: EpicFrontmatter
  ): Promise<void> {
    const title = `[${epic.id}] ${epic.title}`;
    const description = `Epic: ${epic.title}\n\nProgress: ${epic.completed_increments}/${epic.total_increments} increments (${epic.progress})\n\nPriority: ${epic.priority}\nStatus: ${epic.status}`;
    const state = epic.status === 'complete' ? 'closed' : 'open';

    const result = await execFileNoThrow('gh', [
      'api',
      `/repos/{owner}/{repo}/milestones/${milestoneNumber}`,
      '-X',
      'PATCH',
      '-f',
      `title=${title}`,
      '-f',
      `description=${description}`,
      '-f',
      `state=${state}`,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to update GitHub Milestone: ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Create GitHub Issue for increment with FULL DUPLICATE PROTECTION
   */
  private async createIssue(
    epicId: string,
    increment: {
      id: string;
      title: string;
      overview: string;
      content: string;
    },
    milestoneNumber: number
  ): Promise<number> {
    const title = `[${epicId}] ${increment.title}`;
    const body = `# ${increment.title}\n\n${increment.overview}\n\n---\n\n**Increment**: ${increment.id}\n**Epic**: ${epicId}\n**Milestone**: See milestone for Epic progress\n\n🤖 Auto-created by SpecWeave Epic Sync`;

    try {
      // Use DuplicateDetector for full 3-phase protection
      const result = await DuplicateDetector.createWithProtection({
        title,
        body,
        titlePattern: `[${epicId}]`,
        incrementId: increment.id, // For body matching
        labels: ['increment', 'epic-sync'],
        milestone: milestoneNumber.toString()
      });

      // Log duplicate detection results
      if (result.wasReused) {
        console.log(`      ♻️  Reused existing issue #${result.issue.number} (duplicate prevention)`);
      }
      if (result.duplicatesFound > 0) {
        console.log(`      🛡️  Duplicates: ${result.duplicatesFound} found, ${result.duplicatesClosed} closed`);
      }

      return result.issue.number;

    } catch (error: any) {
      throw new Error(`Failed to create GitHub Issue: ${error.message}`);
    }
  }

  /**
   * Update GitHub Issue for increment
   */
  private async updateIssue(
    epicId: string,
    issueNumber: number,
    increment: {
      id: string;
      title: string;
      overview: string;
      content: string;
    },
    milestoneNumber: number
  ): Promise<void> {
    const title = `[${epicId}] ${increment.title}`;
    const body = `# ${increment.title}\n\n${increment.overview}\n\n---\n\n**Increment**: ${increment.id}\n**Epic**: ${epicId}\n**Milestone**: See milestone for Epic progress\n\n🤖 Auto-updated by SpecWeave Epic Sync`;

    const result = await execFileNoThrow('gh', [
      'issue',
      'edit',
      issueNumber.toString(),
      '--title',
      title,
      '--body',
      body,
      '--milestone',
      milestoneNumber.toString(),
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to update GitHub Issue: ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Update Epic FEATURE.md with GitHub Milestone ID
   */
  private async updateEpicReadme(
    readmePath: string,
    github: { type: 'milestone'; id: number; url: string }
  ): Promise<void> {
    const content = await readFile(readmePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error('Epic FEATURE.md missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(match[1]) as EpicFrontmatter;
    frontmatter.external_tools.github = github;

    const newFrontmatter = yaml.stringify(frontmatter);
    const newContent = content.replace(
      /^---\n[\s\S]*?\n---/,
      `---\n${newFrontmatter}---`
    );

    await writeFile(readmePath, newContent, 'utf-8');
  }

  /**
   * Update increment external link in both Epic README and increment file
   */
  private async updateIncrementExternalLink(
    readmePath: string,
    incrementFile: string,
    incrementId: string,
    issueNumber: number
  ): Promise<void> {
    const issueUrl = `https://github.com/{owner}/{repo}/issues/${issueNumber}`;

    // 1. Update Epic FEATURE.md
    const readmeContent = await readFile(readmePath, 'utf-8');
    const readmeMatch = readmeContent.match(/^---\n([\s\S]*?)\n---/);

    if (readmeMatch) {
      const frontmatter = yaml.parse(readmeMatch[1]) as EpicFrontmatter;
      const increment = frontmatter.increments.find(
        (inc) => inc.id === incrementId
      );

      if (increment) {
        increment.external.github = issueNumber;
        const newFrontmatter = yaml.stringify(frontmatter);
        const newContent = readmeContent.replace(
          /^---\n[\s\S]*?\n---/,
          `---\n${newFrontmatter}---`
        );
        await writeFile(readmePath, newContent, 'utf-8');
      }
    }

    // 2. Update increment file frontmatter
    const incrementContent = await readFile(incrementFile, 'utf-8');
    const incrementMatch = incrementContent.match(/^---\n([\s\S]*?)\n---/);

    if (incrementMatch) {
      const frontmatter = yaml.parse(
        incrementMatch[1]
      ) as IncrementFrontmatter;

      if (!frontmatter.external) {
        frontmatter.external = {};
      }

      frontmatter.external.github = {
        issue: issueNumber,
        url: issueUrl,
      };

      const newFrontmatter = yaml.stringify(frontmatter);
      const newContent = incrementContent.replace(
        /^---\n[\s\S]*?\n---/,
        `---\n${newFrontmatter}---`
      );
      await writeFile(incrementFile, newContent, 'utf-8');
    }
  }
}
