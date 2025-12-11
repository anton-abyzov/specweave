/**
 * GitHub Feature Sync - Universal Hierarchy Implementation
 *
 * Architecture:
 * - Feature (FS-XXX) → GitHub Milestone (Container)
 * - User Story (US-XXX) → GitHub Issue with format [FS-XXX][US-YYY] Title
 * - Tasks (T-XXX) → Checkboxes in User Story issue body
 *
 * This implements the Universal Hierarchy architecture for GitHub sync.
 * Creates ONE issue PER user story file from specs/{project}/FS-XXX/us-*.md
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { GitHubClientV2 } from './github-client-v2.js';
import { UserStoryIssueBuilder } from './user-story-issue-builder.js';
import { CompletionCalculator } from './completion-calculator.js';
import { DuplicateDetector } from './duplicate-detector.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { getGitHubAuthFromProject } from '../../../src/utils/auth-helpers.js';

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
  private token?: string;

  // SYNC LOCK: Prevent concurrent syncs of the same feature
  // Maps featureId → last sync timestamp
  private static syncLocks: Map<string, number> = new Map();
  private static readonly LOCK_DURATION_MS = 30000; // 30 seconds

  constructor(client: GitHubClientV2, specsDir: string, projectRoot: string) {
    this.client = client;
    this.specsDir = specsDir;
    this.projectRoot = projectRoot;
    this.calculator = new CompletionCalculator(projectRoot);
    // Get token from .env for gh CLI passthrough
    this.token = getGitHubAuthFromProject(projectRoot).token;
  }

  /**
   * Get environment object with GH_TOKEN for gh CLI commands.
   * This ensures the token from .env is passed to all gh operations,
   * regardless of `gh auth` status.
   */
  private getGhEnv(): NodeJS.ProcessEnv {
    return this.token
      ? { ...process.env, GH_TOKEN: this.token }
      : process.env;
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
    // SYNC LOCK CHECK: Prevent concurrent/rapid syncs of the same feature
    // Root cause: Two sync paths (task completion + status change) can fire simultaneously
    // Result: Duplicate GitHub comments due to race condition
    const now = Date.now();
    const lastSync = GitHubFeatureSync.syncLocks.get(featureId);

    if (lastSync && (now - lastSync) < GitHubFeatureSync.LOCK_DURATION_MS) {
      const secondsRemaining = Math.ceil((GitHubFeatureSync.LOCK_DURATION_MS - (now - lastSync)) / 1000);
      console.log(`\n⏭️  Sync already in progress for ${featureId} (or completed ${Math.floor((now - lastSync) / 1000)}s ago)`);
      console.log(`   ℹ️  Sync will be available in ${secondsRemaining}s to prevent duplicates`);
      console.log(`   💡 This prevents race conditions between task completion and status change syncs`);

      // Return placeholder result (sync was skipped, not failed)
      return {
        milestoneNumber: 0,
        milestoneUrl: '',
        issuesCreated: 0,
        issuesUpdated: 0,
        userStoriesProcessed: 0
      };
    }

    // Acquire lock
    GitHubFeatureSync.syncLocks.set(featureId, now);
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

      // ✅ DUPLICATE PROTECTION WITH GLOBAL DETECTOR
      // Uses proven 3-phase protection: Detection → Verification → Reflection
      //
      // WHY THIS MATTERS:
      // - Previous implementation had race conditions (--limit 1, eventual consistency)
      // - DuplicateDetector handles all edge cases automatically
      // - Auto-closes duplicates if they slip through
      //
      // @see .specweave/increments/0047-us-task-linkage/reports/DUPLICATE-GITHUB-ISSUES-ROOT-CAUSE.md

      let issueNumber: number;
      let wasUpdated = false;

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

      // Check 2 & 3: Use DuplicateDetector for robust duplicate prevention
      // This handles:
      // - Search with proper limits (not --limit 1)
      // - Post-create verification
      // - Auto-close duplicates
      // - Eventual consistency race conditions
      const titlePattern = `[${featureId}][${userStory.id}]`;
      const milestoneTitle = `${featureData.id}: ${featureData.title}`;

      console.log(`      🛡️  Using DuplicateDetector (pattern: ${titlePattern})`);

      const result = await DuplicateDetector.createWithProtection({
        title: issueContent.title,
        body: issueContent.body,
        titlePattern,
        incrementId: userStory.id,
        labels: issueContent.labels,
        milestone: milestoneTitle,
        repo: `${this.client.getOwner()}/${this.client.getRepo()}`
      });

      issueNumber = result.issue.number;

      // Log duplicate protection results
      if (result.wasReused) {
        console.log(`      ♻️  Reused existing issue #${issueNumber} (duplicate prevented!)`);
        wasUpdated = true;
      } else {
        console.log(`      ✅ Created issue #${issueNumber}`);
      }

      if (result.duplicatesFound > 0) {
        console.log(`      🛡️  Duplicates detected: ${result.duplicatesFound}, auto-closed: ${result.duplicatesClosed}`);
      }

      // Update User Story frontmatter with issue link
      await this.updateUserStoryFrontmatter(userStory.filePath, issueNumber);

      // ✅ CRITICAL FIX (2025-11-24): Check completion for ALL issues (new AND reused)
      // BUG: Previously only checked completion for reused issues, not new ones
      // RESULT: New issues stayed OPEN even if status:complete
      //
      // Now we always call updateUserStoryIssue() which:
      // 1. Calculates ACTUAL completion from [x] checkboxes
      // 2. Closes issue if all ACs and tasks verified complete
      // 3. Updates status labels automatically
      await this.updateUserStoryIssue(issueNumber, issueContent, userStory.filePath);

      // Update completion tracking
      if (result.wasReused) {
        issuesUpdated++;
      } else {
        issuesCreated++;
      }
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
    // v5.0.0+: NO _features folder - features live in project folders
    // Search all project folders for the feature
    const projectFolders = await this.findProjectFolders();

    for (const projectFolder of projectFolders) {
      const featureFolder = path.join(projectFolder, featureId);
      if (existsSync(featureFolder) && existsSync(path.join(featureFolder, 'FEATURE.md'))) {
        return featureFolder;
      }
    }

    // Legacy fallback: Check _features folder (for brownfield migration)
    const legacyFolder = path.join(this.specsDir, '_features', featureId);
    if (existsSync(legacyFolder)) {
      console.log(`   ⚠️  Found feature in legacy _features folder - consider migrating to project folder`);
      return legacyFolder;
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
   * Create GitHub Milestone for Feature (with duplicate detection)
   */
  private async createMilestone(featureData: FeatureFrontmatter): Promise<{
    number: number;
    url: string;
  }> {
    const title = `${featureData.id}: ${featureData.title}`;

    // CRITICAL: Check if milestone already exists before creating
    const existingResult = await execFileNoThrow('gh', [
      'api',
      'repos/:owner/:repo/milestones',
      '--jq',
      `.[] | select(.title == "${title}") | {number, html_url}`,
    ], { env: this.getGhEnv() });

    // DEBUG: Log detection result
    console.log(`   🔍 Milestone detection: exitCode=${existingResult.exitCode}, stdout length=${existingResult.stdout.length}`);
    if (existingResult.exitCode !== 0) {
      console.log(`   ⚠️  Detection failed: ${existingResult.stderr}`);
    }

    if (existingResult.exitCode === 0 && existingResult.stdout.trim()) {
      const existing = JSON.parse(existingResult.stdout);
      console.log(`   ♻️  Reusing existing Milestone #${existing.number}`);
      return {
        number: existing.number,
        url: existing.html_url,
      };
    }

    console.log(`   ℹ️  No existing milestone found, creating new one...`);

    // Milestone doesn't exist, create new one
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
    ], { env: this.getGhEnv() });

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
    ], { env: this.getGhEnv() });

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
      ], { env: this.getGhEnv() });
      console.log(
        `      ✅ Created and verified complete: ${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks`
      );
    } else {
      // ⚠️ INCOMPLETE - Leave open with progress comment (with deduplication)
      // Note: For newly created issues, this is the first comment so deduplication
      // will likely pass through, but the logic is here for consistency
      await this.postProgressCommentIfChanged(issueNumber, completion);
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
    ], { env: this.getGhEnv() });

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
        ], { env: this.getGhEnv() });
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
        ], { env: this.getGhEnv() });
        console.log(
          `      ⚠️ Reopened: ${completion.blockingAcs.length + completion.blockingTasks.length} items incomplete`
        );
      } else {
        // Update progress comment (with deduplication)
        await this.postProgressCommentIfChanged(issueNumber, completion);
      }
    }

    // **NEW (2025-11-24)**: Update status labels based on completion
    await this.updateStatusLabels(issueNumber, completion);
  }

  /**
   * Update status labels on GitHub issue based on completion state
   *
   * SMART LABEL MANAGEMENT:
   * - Only manages status:* labels (status:not_started, status:in-progress, status:completed)
   * - Preserves all other labels (priority, type, custom labels)
   * - Ensures exactly one status label is present
   */
  private async updateStatusLabels(
    issueNumber: number,
    completion: {
      overallComplete: boolean;
      acsPercentage: number;
      tasksPercentage: number;
      acsTotal?: number;
      tasksTotal?: number;
      frontmatterStatus?: string;
    }
  ): Promise<void> {
    try {
      // Get current issue labels
      const issueData = await this.client.getIssue(issueNumber);
      const currentLabels = issueData.labels || [];

      // Separate status labels from other labels
      const statusLabels = currentLabels.filter((label: string) => label.startsWith('status:'));
      const otherLabels = currentLabels.filter((label: string) => !label.startsWith('status:'));

      // Determine correct status label based on completion
      // NOTE: Label names must match repository labels exactly
      let newStatusLabel: string;
      if (completion.overallComplete) {
        newStatusLabel = 'status:complete'; // Repository uses "complete" not "completed"
      } else if (completion.acsPercentage > 0 || completion.tasksPercentage > 0) {
        newStatusLabel = 'status:active'; // Repository uses "active" not "in-progress"
      } else if (
        // v0.35.1 FIX: For external-origin USs without ACs/tasks, use frontmatter status
        // This fixes issue #889 where external USs always showed "not_started"
        (completion.acsTotal === 0 || completion.acsTotal === undefined) &&
        (completion.tasksTotal === 0 || completion.tasksTotal === undefined) &&
        completion.frontmatterStatus
      ) {
        // Map frontmatter status to GitHub label
        switch (completion.frontmatterStatus) {
          case 'complete':
          case 'completed':
            newStatusLabel = 'status:complete';
            break;
          case 'active':
          case 'in-progress':
            newStatusLabel = 'status:active';
            break;
          case 'planning':
          case 'not-started':
          default:
            newStatusLabel = 'status:not_started';
        }
        console.log(`      ℹ️  Using frontmatter status (no ACs/tasks): ${completion.frontmatterStatus} → ${newStatusLabel}`);
      } else {
        newStatusLabel = 'status:not_started';
      }

      // Check if update needed
      const needsUpdate = statusLabels.length !== 1 || !statusLabels.includes(newStatusLabel);

      if (!needsUpdate) {
        return; // Status label already correct
      }

      // Update labels using gh CLI
      // Strategy: Remove old status labels first (if any), then add new one

      // Step 1: Remove old status labels (only if they exist)
      if (statusLabels.length > 0) {
        await execFileNoThrow('gh', [
          'issue',
          'edit',
          issueNumber.toString(),
          '--remove-label',
          ...statusLabels,
        ], { env: this.getGhEnv() });
      }

      // Step 2: Add new status label
      const result = await execFileNoThrow('gh', [
        'issue',
        'edit',
        issueNumber.toString(),
        '--add-label',
        newStatusLabel,
      ], { env: this.getGhEnv() });

      if (result.exitCode === 0) {
        console.log(`      🏷️  Updated label: ${newStatusLabel}`);
      } else {
        console.warn(`      ⚠️  Failed to add label ${newStatusLabel}: ${result.stderr}`);
      }
    } catch (error) {
      // Non-blocking: Label update failure shouldn't break sync
      console.warn(`      ⚠️  Failed to update status labels: ${(error as Error).message}`);
    }
  }

  /**
   * Post progress comment only if it differs from the last comment
   *
   * DEDUPLICATION FIX (2025-11-24):
   * - Prevents posting identical consecutive comments
   * - Fetches last comment from issue
   * - Compares content (ignoring timestamps)
   * - Only posts if progress has changed
   *
   * Root Cause: updateUserStoryIssue() was posting progress comments on EVERY sync,
   * even when progress hadn't changed, causing 4+ duplicate comments.
   *
   * @param issueNumber - GitHub issue number
   * @param completion - Completion status with AC/task metrics
   */
  private async postProgressCommentIfChanged(
    issueNumber: number,
    completion: any
  ): Promise<void> {
    try {
      // 1. Fetch last comment from the issue
      const commentsResult = await execFileNoThrow('gh', [
        'api',
        'repos/:owner/:repo/issues/' + issueNumber + '/comments',
        '--jq',
        '.[-1] | {body: .body, created_at: .created_at}',  // Get last comment only
      ], { env: this.getGhEnv() });

      let lastCommentBody = '';
      if (commentsResult.exitCode === 0 && commentsResult.stdout.trim()) {
        try {
          const lastComment = JSON.parse(commentsResult.stdout);
          lastCommentBody = lastComment.body || '';
        } catch {
          // No valid last comment, proceed with posting
        }
      }

      // 2. Build new progress comment
      const newCommentBody = this.calculator.buildProgressComment(completion);

      // 3. Normalize both comments for comparison (remove timestamps, whitespace differences)
      const normalizeComment = (text: string): string => {
        return text
          .replace(/🤖 Auto-updated by SpecWeave AC Completion Gate/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const normalizedLast = normalizeComment(lastCommentBody);
      const normalizedNew = normalizeComment(newCommentBody);

      // 4. Check if comments are identical (ignoring formatting differences)
      if (normalizedLast === normalizedNew) {
        console.log(
          `      ⏭️  Progress unchanged (${completion.acsPercentage.toFixed(0)}% ACs, ${completion.tasksPercentage.toFixed(0)}% tasks) - skipping duplicate comment`
        );
        return;
      }

      // 5. Post new comment only if progress has changed
      await execFileNoThrow('gh', [
        'issue',
        'comment',
        issueNumber.toString(),
        '--body',
        newCommentBody,
      ], { env: this.getGhEnv() });
      console.log(
        `      📊 Progress: ${completion.acsPercentage.toFixed(0)}% ACs, ${completion.tasksPercentage.toFixed(0)}% tasks (updated)`
      );

    } catch (error) {
      // Non-blocking: Log error but don't break sync
      console.error(`      ⚠️  Failed to check/post progress comment: ${(error as Error).message}`);
    }
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
