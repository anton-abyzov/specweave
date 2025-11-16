/**
 * GitHub Feature Sync - Universal Hierarchy Implementation
 *
 * Architecture (CORRECT):
 * - Feature (FS-033) → GitHub Milestone (Container)
 * - User Story (US-001, US-002, etc.) → GitHub Issue (Trackable item)
 * - Tasks (T-001, T-002, etc.) → Checkboxes in User Story issue body
 *
 * This implements the TRUE Universal Hierarchy architecture for GitHub.
 *
 * Key Differences from old github-epic-sync.ts:
 * - ❌ OLD: Feature/Increment → GitHub Issue (WRONG!)
 * - ✅ NEW: User Story → GitHub Issue (CORRECT!)
 * - ✅ Creates ONE issue PER user story file (not one per increment)
 * - ✅ Reads us-*.md files from specs/{project}/FS-XXX/
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { GitHubClientV2 } from './github-client-v2.js';
import { UserStoryIssueBuilder } from './user-story-issue-builder.js';
import { CompletionCalculator } from './completion-calculator.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

interface FeatureFrontmatter {
  id: string;
  title: string;
  type: 'feature' | 'epic';
  status: 'complete' | 'active' | 'planning' | 'archived';
  projects?: string[];
  created: string;
  last_updated: string;
  external_tools?: {
    github?: {
      type: 'milestone';
      id: number | null;
      url: string | null;
    };
  };
}

interface UserStoryInfo {
  id: string; // e.g., "US-001"
  title: string;
  filePath: string;
  project: string;
  status: string;
  existingIssue?: number | null;
}

export class GitHubFeatureSync {
  private client: GitHubClientV2;
  private specsDir: string;
  private projectRoot: string;
  private calculator: CompletionCalculator;

  constructor(client: GitHubClientV2, specsDir: string, projectRoot: string) {
    this.client = client;
    this.specsDir = specsDir;
    this.projectRoot = projectRoot;
    this.calculator = new CompletionCalculator(projectRoot);
  }

  /**
   * Sync Feature folder to GitHub (Milestone + User Story Issues)
   *
   * Process:
   * 1. Create/update GitHub Milestone for Feature
   * 2. Find all us-*.md files across all projects
   * 3. Create/update GitHub Issue for EACH user story
   * 4. Update frontmatter with GitHub issue links
   */
  async syncFeatureToGitHub(featureId: string): Promise<{
    milestoneNumber: number;
    milestoneUrl: string;
    issuesCreated: number;
    issuesUpdated: number;
    userStoriesProcessed: number;
  }> {
    console.log(`\n🔄 Syncing Feature ${featureId} to GitHub...`);

    // 1. Load Feature FEATURE.md
    const featureFolder = await this.findFeatureFolder(featureId);
    if (!featureFolder) {
      throw new Error(`Feature ${featureId} not found in ${this.specsDir}`);
    }

    const featurePath = path.join(featureFolder, 'FEATURE.md');
    const featureData = await this.parseFeatureMd(featurePath);

    console.log(`   📦 Feature: ${featureData.title}`);
    console.log(`   📊 Status: ${featureData.status}`);

    // 2. Create or update GitHub Milestone
    let milestoneNumber = featureData.external_tools?.github?.id;
    let milestoneUrl = featureData.external_tools?.github?.url;

    if (!milestoneNumber) {
      console.log(`   🚀 Creating GitHub Milestone...`);
      const milestone = await this.createMilestone(featureData);
      milestoneNumber = milestone.number;
      milestoneUrl = milestone.url;
      console.log(`   ✅ Created Milestone #${milestoneNumber}`);

      // Update FEATURE.md with Milestone ID
      await this.updateFeatureMd(featurePath, {
        type: 'milestone',
        id: milestoneNumber,
        url: milestoneUrl,
      });
    } else {
      console.log(`   ♻️  Using existing Milestone #${milestoneNumber}`);
      milestoneUrl = featureData.external_tools?.github?.url || milestoneUrl;
    }

    // 3. Find all User Story files across all projects
    const userStories = await this.findUserStories(featureId);
    console.log(`\n   📝 Found ${userStories.length} User Stories to sync...`);

    // 4. Sync each User Story as GitHub Issue
    let issuesCreated = 0;
    let issuesUpdated = 0;

    for (const userStory of userStories) {
      console.log(`\n   🔹 Processing ${userStory.id}: ${userStory.title}`);

      // Build issue content using UserStoryIssueBuilder
      const repoInfo = {
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        branch: 'develop'  // TODO: detect from git
      };

      const builder = new UserStoryIssueBuilder(
        userStory.filePath,
        this.projectRoot,
        featureId,
        repoInfo
      );

      const issueContent = await builder.buildIssueBody();

      // ✅ FIX: Add status to issue content for sync
      issueContent.status = userStory.status;

      // ✅ TRIPLE IDEMPOTENCY CHECK
      // This ensures 100% safety when running sync multiple times

      // Check 1: User Story frontmatter has issue number
      if (userStory.existingIssue) {
        console.log(`      ♻️  Issue #${userStory.existingIssue} exists in frontmatter`);

        try {
          // Verify issue still exists on GitHub
          await this.client.getIssue(userStory.existingIssue);

          // Issue exists, update it with verification
          await this.updateUserStoryIssue(userStory.existingIssue, issueContent, userStory.filePath);
          issuesUpdated++;
          console.log(`      ✅ Updated Issue #${userStory.existingIssue}`);
          continue;
        } catch (err) {
          // Issue deleted on GitHub, fall through to create new
          console.log(`      ⚠️  Issue #${userStory.existingIssue} deleted on GitHub, creating new`);
        }
      }

      // Check 2: Search GitHub for issue by title
      const existingByTitle = await this.client.searchIssueByTitle(issueContent.title);
      if (existingByTitle) {
        console.log(`      ♻️  Found existing issue by title: #${existingByTitle.number}`);

        // Link it in frontmatter
        await this.updateUserStoryFrontmatter(userStory.filePath, existingByTitle.number);

        // Update content with verification
        await this.updateUserStoryIssue(existingByTitle.number, issueContent, userStory.filePath);
        issuesUpdated++;
        console.log(`      ✅ Linked and updated Issue #${existingByTitle.number}`);
        continue;
      }

      // Check 3: No existing issue found, create new
      console.log(`      🚀 Creating new issue: ${issueContent.title}`);
      const milestoneTitle = `${featureData.id}: ${featureData.title}`;
      const issueNumber = await this.createUserStoryIssue(
        issueContent,
        milestoneTitle,
        userStory.filePath
      );
      issuesCreated++;
      console.log(`      ✅ Created Issue #${issueNumber}`);

      // Update User Story frontmatter
      await this.updateUserStoryFrontmatter(userStory.filePath, issueNumber);
    }

    console.log(`\n✅ Feature sync complete!`);
    console.log(`   Milestone: ${milestoneUrl}`);
    console.log(`   User Stories: ${userStories.length}`);
    console.log(`   Issues created: ${issuesCreated}`);
    console.log(`   Issues updated: ${issuesUpdated}`);

    return {
      milestoneNumber: milestoneNumber!,
      milestoneUrl: milestoneUrl!,
      issuesCreated,
      issuesUpdated,
      userStoriesProcessed: userStories.length,
    };
  }

  /**
   * Find Feature folder in specs directory
   */
  private async findFeatureFolder(featureId: string): Promise<string | null> {
    // Check _features folder first
    const featuresFolder = path.join(this.specsDir, '_features', featureId);
    if (existsSync(featuresFolder)) {
      return featuresFolder;
    }

    return null;
  }

  /**
   * Parse FEATURE.md frontmatter
   */
  private async parseFeatureMd(featurePath: string): Promise<FeatureFrontmatter> {
    const content = await readFile(featurePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error(`${featurePath}: Missing YAML frontmatter`);
    }

    return yaml.parse(match[1]) as FeatureFrontmatter;
  }

  /**
   * Find all User Story files for this feature across all projects
   */
  private async findUserStories(featureId: string): Promise<UserStoryInfo[]> {
    const userStories: UserStoryInfo[] = [];

    // Find all project folders
    const projectFolders = await this.findProjectFolders();

    for (const projectFolder of projectFolders) {
      const featureSpecsFolder = path.join(projectFolder, featureId);

      if (!existsSync(featureSpecsFolder)) {
        continue; // Feature not present in this project
      }

      // Read all us-*.md files
      const files = await readdir(featureSpecsFolder);
      const usFiles = files.filter((f) => f.startsWith('us-') && f.endsWith('.md'));

      for (const file of usFiles.sort()) {
        const filePath = path.join(featureSpecsFolder, file);
        const content = await readFile(filePath, 'utf-8');
        const match = content.match(/^---\n([\s\S]*?)\n---/);

        if (!match) {
          console.warn(`   ⚠️  ${file}: Missing frontmatter, skipping`);
          continue;
        }

        const frontmatter = yaml.parse(match[1]);
        const projectName = path.basename(projectFolder);

        userStories.push({
          id: frontmatter.id || file.match(/us-(\d+)/)?.[0]?.toUpperCase() || 'UNKNOWN',
          title: frontmatter.title || 'Untitled User Story',
          filePath,
          project: projectName,
          status: frontmatter.status || 'not-started',
          existingIssue: frontmatter.external?.github?.issue || null,
        });
      }
    }

    return userStories;
  }

  /**
   * Find all project folders (default, backend, frontend, etc.)
   */
  private async findProjectFolders(): Promise<string[]> {
    const folders: string[] = [];
    const specsRoot = this.specsDir;

    // Read all directories in specs root
    const entries = await readdir(specsRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_')) {
        folders.push(path.join(specsRoot, entry.name));
      }
    }

    return folders;
  }

  /**
   * Create GitHub Milestone for Feature
   */
  private async createMilestone(featureData: FeatureFrontmatter): Promise<{
    number: number;
    url: string;
  }> {
    const title = `${featureData.id}: ${featureData.title}`;
    const description = `Feature ${featureData.id}\n\nStatus: ${featureData.status}\nCreated: ${featureData.created}`;

    const result = await execFileNoThrow('gh', [
      'api',
      'repos/:owner/:repo/milestones',
      '-X',
      'POST',
      '-f',
      `title=${title}`,
      '-f',
      `description=${description}`,
      '-f',
      'state=open',
    ]);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create Milestone: ${result.stderr || result.stdout}`);
    }

    const milestone = JSON.parse(result.stdout);
    return {
      number: milestone.number,
      url: milestone.html_url,
    };
  }

  /**
   * Create GitHub Issue for User Story with AC/Task Verification
   *
   * ✅ VERIFICATION GATE FIX:
   * - Verifies actual completion before closing
   * - Prevents premature closure on creation
   */
  private async createUserStoryIssue(
    issueContent: {
      title: string;
      body: string;
      labels: string[];
      status?: string;
    },
    milestoneTitle: string,
    userStoryPath: string
  ): Promise<number> {
    // Step 1: Create issue (always open initially - gh CLI limitation)
    const result = await execFileNoThrow('gh', [
      'issue',
      'create',
      '--title',
      issueContent.title,
      '--body',
      issueContent.body,
      '--milestone',
      milestoneTitle,
      ...issueContent.labels.flatMap((label) => ['--label', label]),
    ]);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create GitHub Issue: ${result.stderr || result.stdout}`);
    }

    // Parse issue number from output
    // Format: "https://github.com/owner/repo/issues/123"
    const match = result.stdout.match(/issues\/(\d+)/);
    if (!match) {
      throw new Error(`Failed to parse issue number from: ${result.stdout}`);
    }

    const issueNumber = parseInt(match[1], 10);

    // Step 2: VERIFICATION GATE - Close only if ACs/tasks verified
    const completion = await this.calculator.calculateCompletion(userStoryPath);

    if (completion.overallComplete) {
      // ✅ SAFE TO CLOSE - All ACs and tasks verified [x]
      await execFileNoThrow('gh', [
        'issue',
        'close',
        issueNumber.toString(),
        '--comment',
        this.calculator.buildCompletionComment(completion),
      ]);
      console.log(
        `      ✅ Created and verified complete: ${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks`
      );
    } else {
      // ⚠️ INCOMPLETE - Leave open with progress comment
      await execFileNoThrow('gh', [
        'issue',
        'comment',
        issueNumber.toString(),
        '--body',
        this.calculator.buildProgressComment(completion),
      ]);
      console.log(
        `      📊 Created: ${completion.acsPercentage.toFixed(0)}% ACs, ${completion.tasksPercentage.toFixed(0)}% tasks`
      );
    }

    return issueNumber;
  }

  /**
   * Update existing GitHub Issue for User Story with AC/Task Verification
   *
   * ✅ VERIFICATION GATE FIX:
   * - OLD: Closed based on frontmatter `status: complete`
   * - NEW: Closes ONLY if all ACs and tasks are [x]
   *
   * This prevents Issue #574 type bugs (premature closure)
   */
  private async updateUserStoryIssue(
    issueNumber: number,
    issueContent: {
      title: string;
      body: string;
      labels: string[];
      status?: string;
    },
    userStoryPath: string
  ): Promise<void> {
    // Update issue body
    await execFileNoThrow('gh', [
      'issue',
      'edit',
      issueNumber.toString(),
      '--title',
      issueContent.title,
      '--body',
      issueContent.body,
    ]);

    // ✅ VERIFICATION GATE: Calculate ACTUAL completion from checkboxes
    const completion = await this.calculator.calculateCompletion(userStoryPath);

    // Get current issue state
    const issueData = await this.client.getIssue(issueNumber);
    const currentlyClosed = issueData.state === 'closed';

    // DECISION LOGIC: Close/Reopen/Update based on VERIFIED completion
    if (completion.overallComplete) {
      // ✅ SAFE TO CLOSE - All ACs and tasks verified [x]
      if (!currentlyClosed) {
        await execFileNoThrow('gh', [
          'issue',
          'close',
          issueNumber.toString(),
          '--comment',
          this.calculator.buildCompletionComment(completion),
        ]);
        console.log(
          `      ✅ Verified complete: ${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks`
        );
      }
    } else {
      // ⚠️ INCOMPLETE - Keep open or reopen if needed
      if (currentlyClosed) {
        // Issue was closed prematurely - REOPEN
        await execFileNoThrow('gh', [
          'issue',
          'reopen',
          issueNumber.toString(),
          '--comment',
          this.calculator.buildReopenComment(completion, 'Work verification failed'),
        ]);
        console.log(
          `      ⚠️ Reopened: ${completion.blockingAcs.length + completion.blockingTasks.length} items incomplete`
        );
      } else {
        // Update progress comment
        await execFileNoThrow('gh', [
          'issue',
          'comment',
          issueNumber.toString(),
          '--body',
          this.calculator.buildProgressComment(completion),
        ]);
        console.log(
          `      📊 Progress: ${completion.acsPercentage.toFixed(0)}% ACs, ${completion.tasksPercentage.toFixed(0)}% tasks`
        );
      }
    }

    // Note: Labels are not updated to avoid overwriting manually added labels
  }

  /**
   * Update FEATURE.md with GitHub Milestone link
   */
  private async updateFeatureMd(
    featurePath: string,
    milestone: {
      type: 'milestone';
      id: number;
      url: string;
    }
  ): Promise<void> {
    const content = await readFile(featurePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error(`${featurePath}: Missing YAML frontmatter`);
    }

    const frontmatter = yaml.parse(match[1]);

    // Update external_tools.github
    if (!frontmatter.external_tools) {
      frontmatter.external_tools = {};
    }
    frontmatter.external_tools.github = milestone;

    // Rebuild content
    const newFrontmatter = yaml.stringify(frontmatter);
    const bodyContent = content.slice(match[0].length);
    const newContent = `---\n${newFrontmatter}---${bodyContent}`;

    await writeFile(featurePath, newContent, 'utf-8');
  }

  /**
   * Update User Story frontmatter with GitHub issue link
   */
  private async updateUserStoryFrontmatter(
    userStoryPath: string,
    issueNumber: number
  ): Promise<void> {
    const content = await readFile(userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error(`${userStoryPath}: Missing YAML frontmatter`);
    }

    const frontmatter = yaml.parse(match[1]);

    // Update external.github
    if (!frontmatter.external) {
      frontmatter.external = {};
    }
    if (!frontmatter.external.github) {
      frontmatter.external.github = {};
    }
    frontmatter.external.github.issue = issueNumber;
    frontmatter.external.github.url = `https://github.com/anton-abyzov/specweave/issues/${issueNumber}`;

    // Rebuild content
    const newFrontmatter = yaml.stringify(frontmatter);
    const bodyContent = content.slice(match[0].length);
    const newContent = `---\n${newFrontmatter}---${bodyContent}`;

    await writeFile(userStoryPath, newContent, 'utf-8');
  }
}
