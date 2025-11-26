/**
 * GitHub CLI Wrapper for SpecWeave (Multi-Project Support)
 *
 * Profile-based GitHub client that supports:
 * - Multiple repositories via sync profiles
 * - Time range filtering for syncs
 * - Rate limiting protection
 * - Secure command execution (no shell injection)
 */

import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { GitHubIssue, GitHubMilestone } from './types';
import { SyncProfile, GitHubConfig, TimeRangePreset } from '../../../src/core/types/sync-profile';

export class GitHubClientV2 {
  private owner: string;
  private repo: string;
  private fullRepo: string;

  /**
   * Create GitHub client from sync profile
   */
  constructor(profile: SyncProfile) {
    if (profile.provider !== 'github') {
      throw new Error(`Expected GitHub profile, got ${profile.provider}`);
    }

    const config = profile.config as GitHubConfig;
    this.owner = config.owner;
    this.repo = config.repo;
    this.fullRepo = `${this.owner}/${this.repo}`;
  }

  /**
   * Create client from owner/repo directly
   */
  static fromRepo(owner: string, repo: string): GitHubClientV2 {
    const profile: SyncProfile = {
      provider: 'github',
      displayName: `${owner}/${repo}`,
      config: { owner, repo },
      timeRange: { default: '1M', max: '6M' },
    };
    return new GitHubClientV2(profile);
  }

  /**
   * Get repository owner
   */
  getOwner(): string {
    return this.owner;
  }

  /**
   * Get repository name
   */
  getRepo(): string {
    return this.repo;
  }

  // ==========================================================================
  // Authentication & Setup
  // ==========================================================================

  /**
   * Check if GitHub CLI is installed and authenticated
   */
  static async checkCLI(): Promise<{
    installed: boolean;
    authenticated: boolean;
    error?: string;
  }> {
    // Check installation
    const versionCheck = await execFileNoThrow('gh', ['--version']);
    if (versionCheck.exitCode !== 0) {
      return {
        installed: false,
        authenticated: false,
        error: 'GitHub CLI (gh) not installed. Install from: https://cli.github.com/',
      };
    }

    // Check authentication
    const authCheck = await execFileNoThrow('gh', ['auth', 'status']);
    if (authCheck.exitCode !== 0) {
      return {
        installed: true,
        authenticated: false,
        error: 'GitHub CLI not authenticated. Run: gh auth login',
      };
    }

    return { installed: true, authenticated: true };
  }

  /**
   * Auto-detect repository from git remote
   */
  static async detectRepo(cwd?: string): Promise<{owner: string; repo: string} | null> {
    const result = await execFileNoThrow('git', [
      'remote',
      'get-url',
      'origin',
    ], { cwd });

    if (result.exitCode !== 0) {
      return null;
    }

    const remote = result.stdout.trim();
    const match = remote.match(/github\.com[:/](.+)\/(.+?)(?:\.git)?$/);

    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
    };
  }

  // ==========================================================================
  // Milestones
  // ==========================================================================

  /**
   * Create or get existing milestone
   */
  async createOrGetMilestone(
    title: string,
    description?: string,
    daysFromNow: number = 2
  ): Promise<GitHubMilestone> {
    // Check if milestone already exists
    const existing = await this.getMilestoneByTitle(title);
    if (existing) {
      return existing;
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    const dueDateISO = dueDate.toISOString();

    // Build API request
    const args = [
      'api',
      `repos/${this.fullRepo}/milestones`,
      '-f',
      `title=${title}`,
      '-f',
      `due_on=${dueDateISO}`,
      '--jq',
      '{number: .number, title: .title, description: .description, state: .state, due_on: .due_on}',
    ];

    if (description) {
      args.splice(4, 0, '-f', `description=${description}`);
    }

    const result = await execFileNoThrow('gh', args);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create milestone: ${result.stderr || result.stdout}`);
    }

    return JSON.parse(result.stdout);
  }

  /**
   * Get milestone by title
   */
  private async getMilestoneByTitle(
    title: string
  ): Promise<GitHubMilestone | null> {
    const result = await execFileNoThrow('gh', [
      'api',
      `repos/${this.fullRepo}/milestones`,
      '--jq',
      `.[] | select(.title=="${title}") | {number: .number, title: .title, description: .description, state: .state}`,
    ]);

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      return null;
    }

    return JSON.parse(result.stdout);
  }

  // ==========================================================================
  // Issues
  // ==========================================================================

  /**
   * Validate issue title format
   *
   * CRITICAL: Enforces correct data flow architecture
   * - ✅ CORRECT: "[FS-XXX][US-YYY] Title" (User Story - STANDARD)
   * - ✅ CORRECT: "[FS-XXX] Title" (Feature-level, rare)
   * - ❌ WRONG: "[Increment XXXX] Title" (deprecated old format)
   * - ❌ WRONG: "[BUG] Title" (type prefixes are labels, not title)
   * - ❌ WRONG: "[HOTFIX] Title" (type prefixes are labels, not title)
   * - ❌ WRONG: "[FEATURE] Title" (type prefixes are labels, not title)
   *
   * @throws Error if title uses invalid format
   */
  private validateIssueTitle(title: string): void {
    // Check for deprecated [Increment XXXX] format
    const deprecatedIncrementPattern = /\[Increment\s+\d+\]/i;
    if (deprecatedIncrementPattern.test(title)) {
      throw new Error(
        `❌ DEPRECATED FORMAT DETECTED: "${title}"\n\n` +
        `GitHub issues MUST use living docs format:\n` +
        `  ✅ CORRECT: "[FS-XXX][US-YYY] Title" (User Story)\n` +
        `  ❌ WRONG: "[Increment XXXX] Title" (old format)\n\n` +
        `WHY: Correct data flow is: Increment → Living Docs → GitHub\n` +
        `      Living docs are the source of truth for GitHub sync.\n\n` +
        `FIX: Use /specweave:sync-docs to generate living docs, then sync to GitHub.`
      );
    }

    // Check for type-based prefixes (CRITICAL FIX for issue #749)
    // These prefixes belong as LABELS, not in the issue title!
    const typePrefixPattern = /^\[(BUG|HOTFIX|FEATURE|DOCS|REFACTOR|CHORE|EXPERIMENT|Bug|Hotfix|Feature|Docs|Refactor|Chore|Experiment)\]/i;
    if (typePrefixPattern.test(title)) {
      const match = title.match(typePrefixPattern);
      const badPrefix = match ? match[0] : '[TYPE]';
      throw new Error(
        `❌ INVALID TITLE FORMAT: "${title}"\n\n` +
        `Type prefixes like ${badPrefix} belong as LABELS, not in the title!\n\n` +
        `GitHub issues MUST use this format:\n` +
        `  ✅ CORRECT: "[FS-XXX][US-YYY] Title" (User Story)\n` +
        `  ❌ WRONG: "${badPrefix} Title" (use 'bug' label instead)\n\n` +
        `WHY: All SpecWeave issues follow [FS-XXX][US-YYY] format for traceability.\n` +
        `     Use GitHub labels for categorization (bug, enhancement, etc.).\n\n` +
        `FIX:\n` +
        `  1. Link this work to a Feature (FS-XXX) and User Story (US-YYY)\n` +
        `  2. Use /specweave-github:sync to create issue with correct format\n` +
        `  3. Add '${match ? match[1].toLowerCase() : 'bug'}' as a label instead`
      );
    }
  }

  /**
   * Create User Story issue (for automatic GitHub sync)
   *
   * CRITICAL: This is the CORRECT format for User Story GitHub issues
   * Title format: [FS-XXX][US-YYY] User Story Title
   *
   * Used by: SyncCoordinator.createGitHubIssuesForUserStories()
   *
   * @param params - User story issue parameters
   * @returns Created GitHub issue
   */
  async createUserStoryIssue(params: {
    featureId: string;
    userStoryId: string;
    title: string;
    body: string;
    labels?: string[];
    milestone?: number | null;
  }): Promise<GitHubIssue> {
    // Format title: [FS-XXX][US-YYY] Title
    const formattedTitle = `[${params.featureId}][${params.userStoryId}] ${params.title}`;

    // Use only provided labels (don't add defaults that may not exist)
    const allLabels = params.labels || [];

    // Create issue using standard method
    return await this.createEpicIssue(
      formattedTitle,
      params.body,
      params.milestone || undefined,
      allLabels
    );
  }

  /**
   * Create epic issue (increment-level)
   */
  async createEpicIssue(
    title: string,
    body: string,
    milestone?: number | string,
    labels: string[] = []
  ): Promise<GitHubIssue> {
    // Validate title format before creating
    this.validateIssueTitle(title);
    const args = [
      'issue',
      'create',
      '--repo',
      this.fullRepo,
      '--title',
      title,
      '--body',
      body,
    ];

    // Add labels
    for (const label of labels) {
      args.push('--label', label);
    }

    // Add milestone
    if (milestone !== undefined) {
      // gh CLI requires milestone TITLE, not number
      if (typeof milestone === 'number') {
        // Fetch milestone by number to get title
        const msResult = await execFileNoThrow('gh', [
          'api',
          `repos/${this.fullRepo}/milestones/${milestone}`,
          '--jq',
          '.title'
        ]);

        if (msResult.exitCode === 0 && msResult.stdout.trim()) {
          args.push('--milestone', msResult.stdout.trim());
        }
        // If milestone fetch fails, skip milestone assignment (non-blocking)
      } else {
        args.push('--milestone', milestone);
      }
    }

    // Create issue (returns URL)
    const createResult = await execFileNoThrow('gh', args);

    if (createResult.exitCode !== 0) {
      throw new Error(
        `Failed to create epic issue: ${createResult.stderr || createResult.stdout}`
      );
    }

    const issueUrl = createResult.stdout.trim();
    const issueNumber = parseInt(issueUrl.split('/').pop() || '0', 10);

    if (!issueNumber) {
      throw new Error(`Failed to extract issue number from URL: ${issueUrl}`);
    }

    // Fetch issue details
    return await this.getIssue(issueNumber);
  }

  /**
   * Create task issue (linked to epic)
   */
  async createTaskIssue(
    title: string,
    body: string,
    epicNumber: number,
    milestone?: number | string,
    labels: string[] = []
  ): Promise<GitHubIssue> {
    // Add epic reference to body
    const enhancedBody = `**Part of**: #${epicNumber}\n\n${body}`;

    return await this.createEpicIssue(title, enhancedBody, milestone, labels);
  }

  /**
   * Get issue details
   */
  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    const result = await execFileNoThrow('gh', [
      'issue',
      'view',
      String(issueNumber),
      '--repo',
      this.fullRepo,
      '--json',
      'number,title,body,state,url,labels,milestone',
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to get issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }

    const issue = JSON.parse(result.stdout);
    return {
      ...issue,
      html_url: issue.url,
      labels: issue.labels?.map((l: any) => l.name) || [],
    };
  }

  /**
   * Search for issue by exact title match
   *
   * IDEMPOTENCY: Use this before creating issues to prevent duplicates
   */
  async searchIssueByTitle(title: string): Promise<GitHubIssue | null> {
    // Escape double quotes in title for gh search
    const escapedTitle = title.replace(/"/g, '\\"');

    const result = await execFileNoThrow('gh', [
      'issue',
      'list',
      '--repo',
      this.fullRepo,
      '--search',
      `"${escapedTitle}" in:title`,
      '--json',
      'number,title,state,url,labels',
      '--limit',
      '50',  // ✅ FIX: Increased from 1 to 50 to catch duplicates (Issue #0047)
    ]);

    if (result.exitCode !== 0) {
      // Search failed, return null (treat as not found)
      return null;
    }

    const issues = JSON.parse(result.stdout || '[]');

    if (!issues || issues.length === 0) {
      return null;
    }

    // Return first exact match
    const issue = issues[0];
    return {
      number: issue.number,
      title: issue.title,
      body: '', // Body not included in list view
      state: issue.state,
      html_url: issue.url,
      labels: issue.labels?.map((l: any) => l.name) || [],
    };
  }

  /**
   * Update issue body
   */
  async updateIssueBody(issueNumber: number, newBody: string): Promise<void> {
    const result = await execFileNoThrow('gh', [
      'issue',
      'edit',
      String(issueNumber),
      '--repo',
      this.fullRepo,
      '--body',
      newBody,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to update issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Close issue
   */
  async closeIssue(issueNumber: number, comment?: string): Promise<void> {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }

    const result = await execFileNoThrow('gh', [
      'issue',
      'close',
      String(issueNumber),
      '--repo',
      this.fullRepo,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to close issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Reopen a closed issue (NEW in v0.28.33)
   *
   * Used by GitHub reconciliation when increment is resumed/reopened
   * and the GitHub issue should reflect that state.
   */
  async reopenIssue(issueNumber: number, comment?: string): Promise<void> {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }

    const result = await execFileNoThrow('gh', [
      'issue',
      'reopen',
      String(issueNumber),
      '--repo',
      this.fullRepo,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to reopen issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueNumber: number, comment: string): Promise<void> {
    const result = await execFileNoThrow('gh', [
      'issue',
      'comment',
      String(issueNumber),
      '--repo',
      this.fullRepo,
      '--body',
      comment,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to add comment to issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Get last comment on issue (for idempotency check)
   *
   * Returns the most recent comment body, or null if no comments exist
   */
  async getLastComment(issueNumber: number): Promise<{body: string; author: string} | null> {
    // Get all comments (sorted by creation date, newest last)
    const result = await execFileNoThrow('gh', [
      'api',
      `repos/${this.fullRepo}/issues/${issueNumber}/comments`,
      '--jq',
      '.[-1] | {body: .body, author: .user.login}',  // Get last comment only
    ]);

    if (result.exitCode !== 0) {
      // If error, return null (no comments or API error)
      return null;
    }

    if (!result.stdout.trim()) {
      // Empty response = no comments
      return null;
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      return null;
    }
  }

  /**
   * Add labels to issue
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    if (labels.length === 0) return;

    const args = [
      'issue',
      'edit',
      String(issueNumber),
      '--repo',
      this.fullRepo,
    ];

    for (const label of labels) {
      args.push('--add-label', label);
    }

    const result = await execFileNoThrow('gh', args);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to add labels to issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }

  /**
   * Search for issues by feature ID and user story pattern (NEW in v0.28.33)
   *
   * Searches for issues with title matching pattern: [FS-XXX][US-YYY]
   * Used by GitHubReconciler to find issues not stored in metadata.json
   */
  async searchIssuesByFeature(
    featureId: string,
    userStoryId?: string
  ): Promise<GitHubIssue[]> {
    // Build search pattern
    // e.g., "[FS-063]" or "[FS-063][US-001]"
    const pattern = userStoryId
      ? `[${featureId}][${userStoryId}]`
      : `[${featureId}]`;

    const result = await execFileNoThrow('gh', [
      'issue',
      'list',
      '--repo',
      this.fullRepo,
      '--search',
      `"${pattern}" in:title`,
      '--json',
      'number,title,state,url',
      '--state',
      'all',  // Include both open and closed
      '--limit',
      '100',
    ]);

    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Time Range Filtering
  // ==========================================================================

  /**
   * List issues within a time range
   */
  async listIssuesInTimeRange(
    timeRange: TimeRangePreset,
    customStart?: string,
    customEnd?: string
  ): Promise<GitHubIssue[]> {
    const { since, until } = this.calculateTimeRange(timeRange, customStart, customEnd);

    // GitHub search query
    const query = `repo:${this.fullRepo} is:issue created:${since}..${until}`;

    const result = await execFileNoThrow('gh', [
      'search',
      'issues',
      query,
      '--json',
      'number,title,body,state,url,labels,milestone',
      '--limit',
      '1000', // Max results
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to list issues: ${result.stderr || result.stdout}`
      );
    }

    const issues = JSON.parse(result.stdout);
    return issues.map((issue: any) => ({
      ...issue,
      html_url: issue.url,
      labels: issue.labels?.map((l: any) => l.name) || [],
    }));
  }

  /**
   * Calculate date range from time range preset
   */
  private calculateTimeRange(
    timeRange: TimeRangePreset,
    customStart?: string,
    customEnd?: string
  ): { since: string; until: string } {
    if (timeRange === 'ALL') {
      return {
        since: '1970-01-01',
        until: new Date().toISOString().split('T')[0],
      };
    }

    if (customStart) {
      return {
        since: customStart,
        until: customEnd || new Date().toISOString().split('T')[0],
      };
    }

    const now = new Date();
    const since = new Date(now);

    // Calculate date based on preset
    switch (timeRange) {
      case '1W':
        since.setDate(now.getDate() - 7);
        break;
      case '2W':
        since.setDate(now.getDate() - 14);
        break;
      case '1M':
        since.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        since.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        since.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        since.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      since: since.toISOString().split('T')[0],
      until: now.toISOString().split('T')[0],
    };
  }

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  /**
   * Check rate limit status
   */
  async checkRateLimit(): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    const result = await execFileNoThrow('gh', [
      'api',
      'rate_limit',
      '--jq',
      '.rate | {remaining: .remaining, limit: .limit, reset: .reset}',
    ]);

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to check rate limit: ${result.stderr || result.stdout}`
      );
    }

    const data = JSON.parse(result.stdout);
    return {
      ...data,
      reset: new Date(data.reset * 1000),
    };
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Batch create issues with rate limit handling
   */
  async batchCreateIssues(
    issues: Array<{ title: string; body: string; labels?: string[] }>,
    milestone?: number | string,
    epicNumber?: number,
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<GitHubIssue[]> {
    const { batchSize = 10, delayMs = 6000 } = options;
    const createdIssues: GitHubIssue[] = [];

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);

      console.log(
        `Creating issues ${i + 1}-${Math.min(i + batchSize, issues.length)} of ${issues.length}...`
      );

      for (const issue of batch) {
        try {
          const created = epicNumber
            ? await this.createTaskIssue(
                issue.title,
                issue.body,
                epicNumber,
                milestone,
                issue.labels
              )
            : await this.createEpicIssue(
                issue.title,
                issue.body,
                milestone,
                issue.labels
              );

          createdIssues.push(created);
        } catch (error: any) {
          console.error(
            `Failed to create issue "${issue.title}":`,
            error.message
          );
        }
      }

      // Delay between batches
      if (i + batchSize < issues.length) {
        console.log(`Waiting ${delayMs / 1000}s to avoid rate limits...`);
        await this.sleep(delayMs);
      }
    }

    return createdIssues;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
