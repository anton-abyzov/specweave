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

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
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

  // Cached default branch for the sync session (one API call per session)
  private defaultBranch: string | null = null;

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
   * Detect the default branch from the GitHub API.
   * Caches the result per sync session to avoid repeated API calls.
   * Falls back to 'main' if API call fails.
   */
  private async detectDefaultBranch(): Promise<string> {
    if (this.defaultBranch) {
      return this.defaultBranch;
    }

    const owner = this.client.getOwner();
    const repo = this.client.getRepo();

    const result = await execFileNoThrow('gh', [
      'api', `repos/${owner}/${repo}`, '--jq', '.default_branch'
    ], { env: this.getGhEnv() });

    if (result.exitCode === 0 && result.stdout.trim()) {
      this.defaultBranch = result.stdout.trim();
    } else {
      console.warn(`   ⚠️  Failed to detect default branch, falling back to 'main': ${result.stderr}`);
      this.defaultBranch = 'main';
    }

    return this.defaultBranch;
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
      console.log(`   ⚠️  Feature ${featureId} not found in ${this.specsDir} (no living docs and auto-create failed)`);
      console.log(`   💡 Run /sw:sync-docs or /sw:living-docs to generate living docs first`);
      return {
        milestoneNumber: 0,
        milestoneUrl: '',
        issuesCreated: 0,
        issuesUpdated: 0,
        userStoriesProcessed: 0,
      };
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

    // Detect default branch once per sync session
    const detectedBranch = await this.detectDefaultBranch();
    console.log(`   🌿 Default branch: ${detectedBranch}`);

    for (const userStory of userStories) {
      console.log(`\n   🔹 Processing ${userStory.id}: ${userStory.title}`);

      // Build issue content using UserStoryIssueBuilder
      const repoInfo = {
        owner: this.client.getOwner(),
        repo: this.client.getRepo(),
        branch: detectedBranch
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

      // v1.0.240 FIX: Backfill increment metadata.json for reconciler compatibility
      // Previously only US frontmatter was updated, leaving metadata.json empty.
      // This caused reconciler and closure flows to miss these issues.
      await this.backfillIncrementMetadata(featureId, userStory.id, issueNumber);

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
   * Find Feature folder in specs directory.
   * Falls back to auto-creating from increment spec.md if living docs don't exist.
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

    // FALLBACK (v1.0.302): Auto-create feature folder from increment spec.md
    // Most increments never get living docs created, so sync silently fails.
    // This makes sync self-healing by creating minimal living docs on-the-fly.
    console.log(`   ℹ️  Feature folder not found in living docs, attempting auto-create from spec.md...`);
    const created = await this.createFeatureFolderFromSpec(featureId, projectFolders);
    if (created) {
      return created;
    }

    return null;
  }

  /**
   * Find the increment folder for a given feature ID.
   * Converts FS-271 -> finds 0271-xxx-xxx/ in .specweave/increments/
   */
  private async findIncrementFolder(featureId: string): Promise<string | null> {
    const numMatch = featureId.match(/FS-0*(\d+)E?/i);
    if (!numMatch) return null;

    const num = parseInt(numMatch[1], 10);
    const paddedNum = String(num).padStart(4, '0');

    const incrementsDir = path.join(this.projectRoot, '.specweave/increments');
    if (!existsSync(incrementsDir)) return null;

    const entries = await readdir(incrementsDir);
    const match = entries.find(e => e.startsWith(paddedNum + '-'));
    if (!match) return null;

    return path.join(incrementsDir, match);
  }

  /**
   * Auto-create a feature folder (FEATURE.md + us-NNN.md files) from an
   * increment's spec.md. This enables GitHub sync even when the living docs
   * builder hasn't run yet.
   */
  private async createFeatureFolderFromSpec(
    featureId: string,
    projectFolders: string[]
  ): Promise<string | null> {
    try {
      const incrementFolder = await this.findIncrementFolder(featureId);
      if (!incrementFolder) {
        console.log(`   ⚠️  No increment folder found for ${featureId}`);
        return null;
      }

      const specPath = path.join(incrementFolder, 'spec.md');
      if (!existsSync(specPath)) {
        console.log(`   ⚠️  No spec.md found in ${path.basename(incrementFolder)}`);
        return null;
      }

      const specContent = await readFile(specPath, 'utf-8');

      // Parse frontmatter (optional — many specs don't have YAML frontmatter)
      const fmMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
      let frontmatter: Record<string, string> = {};
      if (fmMatch) {
        try {
          frontmatter = yaml.parse(fmMatch[1]) || {};
        } catch {
          // Invalid YAML — proceed without frontmatter
        }
      }

      const incrementBasename = path.basename(incrementFolder);
      const title = frontmatter.title
        || specContent.match(/^#\s+(.+)/m)?.[1]?.trim()
        || incrementBasename.replace(/^\d+-/, '').replace(/-/g, ' ');
      const status = frontmatter.status || 'active';
      const priority = frontmatter.priority || 'P2';
      const created = frontmatter.created || new Date().toISOString().split('T')[0];
      const incrementId = frontmatter.increment || incrementBasename;

      // Determine target project folder from spec.md user stories or first available
      let targetProjectFolder = projectFolders[0]; // Default: first project folder
      const projectMatch = specContent.match(/\*\*Project\*\*:\s*(\S+)/);
      if (projectMatch) {
        const projectName = projectMatch[1];
        const matchingFolder = projectFolders.find(f => path.basename(f) === projectName);
        if (matchingFolder) {
          targetProjectFolder = matchingFolder;
        }
      }

      if (!targetProjectFolder) {
        console.log(`   ⚠️  No project folder available for feature creation`);
        return null;
      }

      // Create feature folder
      const featureFolder = path.join(targetProjectFolder, featureId);
      await mkdir(featureFolder, { recursive: true });

      // Parse user stories from spec.md body
      const userStories = this.parseUserStoriesFromSpec(specContent, featureId);

      // Create FEATURE.md
      const featureMd = this.buildFeatureMd(featureId, title, status, priority, created, incrementId, userStories);
      await writeFile(path.join(featureFolder, 'FEATURE.md'), featureMd, 'utf-8');

      // Create us-NNN.md files
      for (const us of userStories) {
        const usFilename = `us-${us.id.replace('US-', '').padStart(3, '0')}-${this.slugify(us.title)}.md`;
        const usMd = this.buildUserStoryMd(us, featureId, incrementId);
        await writeFile(path.join(featureFolder, usFilename), usMd, 'utf-8');
      }

      console.log(`   ✅ Auto-created feature folder with ${userStories.length} user stories`);
      return featureFolder;
    } catch (error) {
      console.log(`   ⚠️  Failed to auto-create feature folder: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Parse user stories from spec.md markdown content.
   */
  private parseUserStoriesFromSpec(
    specContent: string,
    featureId: string
  ): Array<{
    id: string;
    title: string;
    priority: string;
    project: string;
    storyText: string;
    acceptanceCriteria: string[];
    status: string;
  }> {
    const stories: Array<{
      id: string;
      title: string;
      priority: string;
      project: string;
      storyText: string;
      acceptanceCriteria: string[];
      status: string;
    }> = [];

    // Match ### US-NNN: Title (Priority) sections
    const usRegex = /### (US-\d+):\s*(.+?)(?:\s*\((P\d)\))?\s*\n([\s\S]*?)(?=\n### US-|\n## |\n---\s*\n### US-|$)/g;
    let match;

    while ((match = usRegex.exec(specContent)) !== null) {
      const usId = match[1];
      const rawTitle = match[2].trim();
      const priority = match[3] || 'P2';
      const body = match[4];

      // Skip template placeholders
      if (rawTitle === '[Story Title]') continue;

      // Extract project
      const projectMatch = body.match(/\*\*Project\*\*:\s*(\S+)/);
      const project = projectMatch ? projectMatch[1] : 'specweave';

      // Extract story text (As a... I want... So that...)
      const storyMatch = body.match(/\*\*As a\*\*\s+([\s\S]*?)(?=\n\*\*Acceptance Criteria|$)/);
      const storyText = storyMatch ? storyMatch[1].trim() : '';

      // Extract acceptance criteria
      const acs: string[] = [];
      const acRegex = /- \[[ x]\] \*\*AC-[^*]+\*\*:\s*(.+)/g;
      let acMatch;
      while ((acMatch = acRegex.exec(body)) !== null) {
        acs.push(acMatch[0]);
      }

      // Determine status from ACs
      const totalAcs = acs.length;
      const completedAcs = acs.filter(ac => ac.startsWith('- [x]')).length;
      let status = 'not-started';
      if (totalAcs > 0 && completedAcs === totalAcs) status = 'complete';
      else if (completedAcs > 0) status = 'active';

      stories.push({
        id: usId,
        title: rawTitle,
        priority,
        project,
        storyText,
        acceptanceCriteria: acs,
        status,
      });
    }

    return stories;
  }

  /**
   * Build FEATURE.md content matching the living docs format.
   */
  private buildFeatureMd(
    featureId: string,
    title: string,
    status: string,
    priority: string,
    created: string,
    incrementId: string,
    userStories: Array<{ id: string; title: string }>
  ): string {
    const now = new Date().toISOString().split('T')[0];
    const mappedStatus = status === 'planned' ? 'planning'
      : status === 'completed' ? 'complete'
      : status === 'active' ? 'active'
      : 'planning';

    const fm: Record<string, unknown> = {
      id: featureId,
      title,
      type: 'feature',
      status: mappedStatus,
      priority,
      created,
      lastUpdated: now,
      tldr: title,
      complexity: 'medium',
      auto_created: true,
    };

    const yamlFm = yaml.stringify(fm);

    let body = `\n# ${title}\n\n## TL;DR\n\n**What**: ${title}\n**Status**: ${mappedStatus} | **Priority**: ${priority}\n**User Stories**: ${userStories.length}\n\n## Overview\n\n${title}\n\n## Implementation History\n\n| Increment | Status |\n|-----------|--------|\n| [${incrementId}](../../../../../increments/${incrementId}/spec.md) | ${mappedStatus} |\n\n## User Stories\n`;

    for (const us of userStories) {
      body += `\n- [${us.id}: ${us.title}](./${us.id.toLowerCase()}.md)`;
    }

    return `---\n${yamlFm}---${body}\n`;
  }

  /**
   * Build us-NNN.md content matching the living docs format.
   */
  private buildUserStoryMd(
    us: {
      id: string;
      title: string;
      priority: string;
      project: string;
      storyText: string;
      acceptanceCriteria: string[];
      status: string;
    },
    featureId: string,
    incrementId: string
  ): string {
    const now = new Date().toISOString().split('T')[0];

    const fm: Record<string, unknown> = {
      id: us.id,
      feature: featureId,
      title: us.title,
      status: us.status,
      priority: us.priority,
      created: now,
      project: us.project,
    };

    const yamlFm = yaml.stringify(fm);

    let body = `\n# ${us.id}: ${us.title}\n\n**Feature**: [${featureId}](./FEATURE.md)\n\n`;

    if (us.storyText) {
      body += `${us.storyText}\n\n`;
    }

    body += `---\n\n## Acceptance Criteria\n\n`;

    if (us.acceptanceCriteria.length > 0) {
      body += us.acceptanceCriteria.join('\n') + '\n';
    } else {
      body += `- [ ] **AC-${us.id.replace('US-', 'US')}-01**: Pending specification\n`;
    }

    body += `\n---\n\n## Implementation\n\n**Increment**: [${incrementId}](../../../../../increments/${incrementId}/spec.md)\n`;

    return `---\n${yamlFm}---${body}\n`;
  }

  /**
   * Convert a title to a URL-safe slug.
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  /**
   * Backfill increment metadata.json with GitHub issue reference (v1.0.240)
   *
   * Writes in the old format (metadata.github.issues[]) that the reconciler
   * and closure flows expect. Non-blocking — errors are logged but don't halt sync.
   */
  private async backfillIncrementMetadata(
    featureId: string,
    userStoryId: string,
    issueNumber: number
  ): Promise<void> {
    try {
      // Derive increment ID from feature ID (reverse of deriveFeatureId)
      const featureNumMatch = featureId.match(/FS-0*(\d+)E?/i);
      if (!featureNumMatch) return;

      const num = parseInt(featureNumMatch[1], 10);
      const paddedNum = String(num).padStart(4, '0');

      // Find the increment directory
      const incrementsDir = path.join(this.projectRoot, '.specweave/increments');
      if (!existsSync(incrementsDir)) return;

      const entries = await readdir(incrementsDir);
      const match = entries.find(e => e.startsWith(paddedNum + '-'));
      if (!match) return;

      const metadataPath = path.join(incrementsDir, match, 'metadata.json');
      if (!existsSync(metadataPath)) return;

      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

      // Write in OLD format for reconciler compatibility
      if (!metadata.github) metadata.github = {};
      if (!metadata.github.issues) metadata.github.issues = [];

      const exists = metadata.github.issues.some(
        (i: { userStory: string }) => i.userStory === userStoryId
      );

      if (!exists) {
        metadata.github.issues.push({
          userStory: userStoryId,
          number: issueNumber,
          url: `https://github.com/${this.client.getOwner()}/${this.client.getRepo()}/issues/${issueNumber}`,
          createdAt: new Date().toISOString(),
        });
        metadata.github.lastSync = new Date().toISOString();
        await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
        console.log(`      📝 Backfilled metadata.json for ${userStoryId}`);
      }
    } catch (error) {
      // Non-blocking
      console.warn(`      ⚠️ Metadata backfill failed: ${(error as Error).message}`);
    }
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
    // NOTE: Must use per_page=100 to handle repos with 30+ milestones (GitHub default is 30)
    // BUG FIX: Without pagination, milestone #31+ won't be found → false "not found" → HTTP 422 duplicate error
    // FIX (v1.0.302): Use explicit owner/repo from config, not :owner/:repo which resolves from git remote
    const owner = this.client.getOwner();
    const repo = this.client.getRepo();

    const existingResult = await execFileNoThrow('gh', [
      'api',
      `repos/${owner}/${repo}/milestones?per_page=100&state=all`,
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
      `repos/${owner}/${repo}/milestones`,
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
        // Idempotency check: skip completion comment if already posted by another sync path
        const lastComment = await this.client.getLastComment(issueNumber);
        const commentAlreadyPosted = lastComment && lastComment.body.includes('✅ User Story Complete');
        if (commentAlreadyPosted) {
          // Close without duplicate comment
          await execFileNoThrow('gh', [
            'issue',
            'close',
            issueNumber.toString(),
          ], { env: this.getGhEnv() });
          console.log(
            `      ✅ Verified complete (comment already posted): ${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks`
          );
        } else {
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
      acsCompleted?: number;
      tasksTotal?: number;
      tasksCompleted?: number;
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

      // Step 3: Auto-close issue when status:complete and issue still OPEN
      // This ensures closure happens atomically with the label update,
      // preventing issues like #1198 where label is applied but issue stays open
      if (newStatusLabel === 'status:complete' && issueData.state.toLowerCase() !== 'closed') {
        try {
          // Re-fetch issue state to avoid race with updateUserStoryIssue close
          const freshIssueData = await this.client.getIssue(issueNumber);
          if (freshIssueData.state.toLowerCase() === 'closed') {
            console.log(`      ⏭️  Issue #${issueNumber} already closed (skipping duplicate close)`);
          } else {
            // Idempotency check: skip completion comment if already posted
            const lastComment = await this.client.getLastComment(issueNumber);
            if (lastComment && lastComment.body.includes('✅ User Story Complete')) {
              // Comment already exists — close without posting duplicate
              await execFileNoThrow('gh', [
                'issue',
                'close',
                issueNumber.toString(),
              ], { env: this.getGhEnv() });
              console.log(`      ✅ Auto-closed issue #${issueNumber} (comment already posted)`);
            } else {
              const completionComment = this.calculator.buildCompletionComment(completion as any);
              await execFileNoThrow('gh', [
                'issue',
                'close',
                issueNumber.toString(),
                '--comment',
                completionComment,
              ], { env: this.getGhEnv() });
              console.log(`      ✅ Auto-closed issue #${issueNumber} (status:complete)`);
            }
          }
        } catch (closeError) {
          // Non-blocking: close failure shouldn't break sync
          console.warn(`      ⚠️  Failed to auto-close issue #${issueNumber}: ${(closeError as Error).message}`);
        }
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
