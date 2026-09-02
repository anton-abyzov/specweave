/**
 * GitHub CLI Wrapper for SpecWeave (Multi-Project Support)
 *
 * Profile-based GitHub client that supports:
 * - Multiple repositories via sync profiles
 * - Time range filtering for syncs
 * - Rate limiting protection
 * - Secure command execution (no shell injection)
 */

import { execFileNoThrow } from '../../vendor/utils/execFileNoThrow.js';
import { explainGitHubAccessError, resolveGitHubAccessFacts } from './github-access-error.js';
import { GitHubIssue, GitHubMilestone, GitHubExternalChange } from './types';
import { SyncProfile, GitHubConfig, TimeRangePreset } from '../../../../../src/core/types/sync-profile';
import { checkAndDecrement } from '../../../../../src/sync/github-rate-limit-budget.js';
import { findProjectRoot } from '../../../../../src/utils/find-project-root.js';

export class GitHubClientV2 {
  private owner: string;
  private repo: string;
  private fullRepo: string;
  private token?: string;
  private projectRoot?: string;

  // Session cache: avoids redundant API calls for the same issue within 30s
  private static issueCache = new Map<string, { data: any; fetchedAt: number }>();
  private static searchCache = new Map<string, { data: GitHubIssue[]; fetchedAt: number }>();
  private static readonly CACHE_TTL_MS = 30_000;

  /**
   * Create GitHub client from sync profile
   */
  constructor(profile: SyncProfile, projectRoot?: string) {
    if (profile.provider !== 'github') {
      throw new Error(`Expected GitHub profile, got ${profile.provider}`);
    }

    const config = profile.config as GitHubConfig;
    if (!config.owner || !config.repo) {
      throw new Error('GitHub profile config missing required owner or repo');
    }
    this.owner = config.owner;
    this.repo = config.repo;
    this.fullRepo = `${this.owner}/${this.repo}`;
    this.token = config.token;
    this.projectRoot = projectRoot;
  }

  /**
   * Get environment object with GH_TOKEN for gh CLI commands.
   * This ensures the token from .env is passed to all gh operations,
   * regardless of `gh auth` status.
   *
   * @returns Environment object with GH_TOKEN set if token available
   */
  private getGhEnv(): NodeJS.ProcessEnv {
    return this.token
      ? { ...process.env, GH_TOKEN: this.token }
      : process.env;
  }

  /**
   * Turn a failed `gh` write (create/edit/close/comment/label) into a clear error.
   *
   * When the failure looks like an auth/access problem (notably a 404 masking a
   * wrong-account token), resolve the token's account + write access and
   * explain exactly what to fix ("token has no write access to owner/repo");
   * otherwise fall back to the raw gh error.
   */
  private async buildWriteError(action: string, rawError: string): Promise<Error> {
    try {
      const facts = await resolveGitHubAccessFacts(
        execFileNoThrow,
        this.getGhEnv(),
        this.owner,
        this.repo,
      );
      const explained = explainGitHubAccessError(rawError, { ...facts, owner: this.owner, repo: this.repo });
      if (explained) return new Error(`Failed to ${action}: ${explained}`);
    } catch {
      /* fall through to the raw error */
    }
    return new Error(`Failed to ${action}: ${rawError}`);
  }

  /**
   * Set the project root for rate-limit budget tracking.
   * When set, all API calls check the shared budget before executing.
   */
  setProjectRoot(root: string): void {
    this.projectRoot = root;
  }

  /**
   * Budget-gated wrapper around execFileNoThrow.
   * Checks shared rate-limit budget before making API calls.
   * Skips the call with a warning if budget is exhausted.
   */
  private async execWithBudget(
    command: string,
    args: string[],
    options?: { env?: NodeJS.ProcessEnv; cwd?: string },
  ): Promise<{ stdout: string; stderr: string; exitCode: number; success?: boolean }> {
    if (this.projectRoot) {
      const allowed = await checkAndDecrement(this.projectRoot);
      if (!allowed) {
        console.warn(`⚠️  GitHub API call skipped — rate limit budget exhausted (remaining < 200)`);
        return { stdout: '', stderr: 'Rate limit budget exhausted', exitCode: 1, success: false };
      }
    }
    return execFileNoThrow(command, args, options);
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
    const projectRoot = findProjectRoot() ?? undefined;
    return new GitHubClientV2(profile, projectRoot);
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
    daysFromNow?: number
  ): Promise<GitHubMilestone> {
    // Use configured value or default to 2 days
    const dueDays = daysFromNow ?? 2;

    // Check if milestone already exists
    const existing = await this.getMilestoneByTitle(title);
    if (existing) {
      return existing;
    }

    // Calculate due date from creation timestamp
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
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

    const result = await this.execWithBudget('gh', args, { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw await this.buildWriteError('create milestone', result.stderr || result.stdout);
    }

    return JSON.parse(result.stdout);
  }

  /**
   * Get milestone by title
   */
  private async getMilestoneByTitle(
    title: string
  ): Promise<GitHubMilestone | null> {
    const result = await this.execWithBudget('gh', [
      'api',
      `repos/${this.fullRepo}/milestones?per_page=100&state=all`,
      '--jq',
      `.[] | select(.title=="${title}") | {number: .number, title: .title, description: .description, state: .state}`,
    ], { env: this.getGhEnv() });

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
   * - ❌ WRONG: "[0001] Title" (plain increment ID without FS- prefix)
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
        `FIX: Use sw:sync-docs to generate living docs, then sync to GitHub.`
      );
    }

    // Check for plain increment ID format [0001] without FS- prefix (CRITICAL FIX v1.0.31)
    // This catches issues like "[0001] Basic layout MVP" that should be "[FS-001][US-001] Basic layout MVP"
    const plainIncrementPattern = /^\[\d{3,4}E?\]\s/;
    if (plainIncrementPattern.test(title)) {
      const match = title.match(/^\[(\d{3,4}E?)\]/);
      const incrementId = match ? match[1] : 'XXXX';
      // Derive proper FS-ID from the increment number
      const num = parseInt(incrementId.replace('E', ''), 10);
      const isExternal = incrementId.endsWith('E');
      const properFsId = `FS-${String(num).padStart(3, '0')}${isExternal ? 'E' : ''}`; // Legacy E suffix — error message only
      throw new Error(
        `❌ INVALID TITLE FORMAT: "${title}"\n\n` +
        `Plain increment IDs like [${incrementId}] are NOT allowed!\n\n` +
        `GitHub issues MUST use SpecWeave format:\n` +
        `  ✅ CORRECT: "[${properFsId}][US-001] Title" (User Story)\n` +
        `  ✅ CORRECT: "[${properFsId}] Title" (Feature-level)\n` +
        `  ❌ WRONG: "[${incrementId}] Title" (missing FS- prefix)\n\n` +
        `WHY: FS-XXX format ensures traceability to Feature folders in living docs.\n` +
        `     Plain increment IDs create duplicates and break the sync architecture.\n\n` +
        `FIX:\n` +
        `  1. Use sw:sync-progress to sync with proper format\n` +
        `  2. Or use sw-github:sync to create issues correctly\n` +
        `  3. Ensure increment has proper spec.md with User Stories`
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
   *
   * CRITICAL: Includes duplicate detection to prevent creating duplicate issues
   */
  async createEpicIssue(
    title: string,
    body: string,
    milestone?: number | string,
    labels: string[] = [],
    options?: { skipDuplicateCheck?: boolean }
  ): Promise<GitHubIssue> {
    // Validate title format before creating
    this.validateIssueTitle(title);

    // DUPLICATE PREVENTION (v1.0.31): Check for existing issue with same title pattern
    // FS-612: Allow callers to skip this check when they've already done their own
    // dedup (e.g., DuplicateDetector which has its own Phase 1 search).
    if (!options?.skipDuplicateCheck) {
      const titlePatternMatch = title.match(/^\[FS-\d{3,}E?\](?:\[US-\d{3,}E?\])?/);
      if (titlePatternMatch) {
        const titlePattern = titlePatternMatch[0];
        const existingIssue = await this.searchIssueByTitle(titlePattern, true);
        if (existingIssue) {
          // Return existing issue instead of creating duplicate
          console.log(`⚠️ Issue already exists: #${existingIssue.number} - "${existingIssue.title}"`);
          console.log(`   Returning existing issue instead of creating duplicate.`);
          return existingIssue;
        }
      }
    }

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
        const msResult = await this.execWithBudget('gh', [
          'api',
          `repos/${this.fullRepo}/milestones/${milestone}`,
          '--jq',
          '.title'
        ], { env: this.getGhEnv() });

        if (msResult.exitCode === 0 && msResult.stdout.trim()) {
          args.push('--milestone', msResult.stdout.trim());
        }
        // If milestone fetch fails, skip milestone assignment (non-blocking)
      } else {
        args.push('--milestone', milestone);
      }
    }

    // Create issue (returns URL)
    const createResult = await this.execWithBudget('gh', args, { env: this.getGhEnv() });

    if (createResult.exitCode !== 0) {
      throw await this.buildWriteError('create issue', createResult.stderr || createResult.stdout);
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
    // Check session cache first (30s TTL)
    const cacheKey = `${this.fullRepo}#${issueNumber}`;
    const cached = GitHubClientV2.issueCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < GitHubClientV2.CACHE_TTL_MS) {
      return cached.data;
    }

    const result = await this.execWithBudget('gh', [
      'issue',
      'view',
      String(issueNumber),
      '--repo',
      this.fullRepo,
      '--json',
      'number,title,body,state,url,labels,milestone',
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to get issue #${issueNumber}: ${result.stderr || result.stdout}`);
    }

    const issue = JSON.parse(result.stdout);
    const normalized = {
      ...issue,
      // gh CLI returns state as UPPERCASE ("OPEN"/"CLOSED"), normalize to lowercase
      // for consistency with GitHub REST API which uses lowercase
      state: issue.state?.toLowerCase() ?? issue.state,
      html_url: issue.url,
      labels: issue.labels?.map((l: any) => l.name) || [],
    };

    // Cache the result
    GitHubClientV2.issueCache.set(cacheKey, { data: normalized, fetchedAt: Date.now() });
    return normalized;
  }

  /**
   * Search for issue by exact title match
   *
   * IDEMPOTENCY: Use this before creating issues to prevent duplicates
   *
   * @param title - Title pattern to search for (e.g., "[FS-136][US-001]")
   * @param includeClosedIssues - If true, searches all issues (open+closed). Default: false (open only)
   */
  async searchIssueByTitle(title: string, includeClosedIssues: boolean = false): Promise<GitHubIssue | null> {
    // Escape double quotes in title for gh search
    const escapedTitle = title.replace(/"/g, '\\"');

    const args = [
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
    ];

    // v0.34.0: Add --state all to search closed issues too (for closure flow)
    // Without this, closeGitHubIssuesForUserStories() can't find already-closed issues
    // and reports "No GitHub issue found" instead of "already closed"
    if (includeClosedIssues) {
      args.push('--state', 'all');
    }

    const result = await this.execWithBudget('gh', args, { env: this.getGhEnv() });

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
   * Edit issue body directly without fetching current state first.
   * Use this for already-linked issues where we know the issue exists.
   * Saves 1 API call compared to the fetch-then-edit pattern.
   */
  async editIssueBody(issueNumber: number, newBody: string): Promise<void> {
    const result = await this.execWithBudget('gh', [
      'issue',
      'edit',
      String(issueNumber),
      '--repo',
      this.fullRepo,
      '--body',
      newBody,
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw await this.buildWriteError(`edit issue #${issueNumber}`, result.stderr || result.stdout);
    }
  }

  /**
   * Update issue body
   */
  async updateIssueBody(issueNumber: number, newBody: string): Promise<void> {
    const result = await this.execWithBudget('gh', [
      'issue',
      'edit',
      String(issueNumber),
      '--repo',
      this.fullRepo,
      '--body',
      newBody,
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw await this.buildWriteError(`update issue #${issueNumber}`, result.stderr || result.stdout);
    }
  }

  /**
   * Close issue
   */
  async closeIssue(issueNumber: number, comment?: string): Promise<void> {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }

    const result = await this.execWithBudget('gh', [
      'issue',
      'close',
      String(issueNumber),
      '--repo',
      this.fullRepo,
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw await this.buildWriteError(`close issue #${issueNumber}`, result.stderr || result.stdout);
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

    const result = await this.execWithBudget('gh', [
      'issue',
      'reopen',
      String(issueNumber),
      '--repo',
      this.fullRepo,
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw await this.buildWriteError(`reopen issue #${issueNumber}`, result.stderr || result.stdout);
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueNumber: number, comment: string): Promise<void> {
    const result = await this.execWithBudget('gh', [
      'issue',
      'comment',
      String(issueNumber),
      '--repo',
      this.fullRepo,
      '--body',
      comment,
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw await this.buildWriteError(`add comment to issue #${issueNumber}`, result.stderr || result.stdout);
    }
  }

  /**
   * Get last comment on issue (for idempotency check)
   *
   * Returns the most recent comment body, or null if no comments exist
   */
  async getLastComment(issueNumber: number): Promise<{body: string; author: string} | null> {
    // Query the last comment directly using per_page=1 + page from last page
    // sort=created&direction=desc gives newest first, per_page=1 returns just one
    const result = await this.execWithBudget('gh', [
      'api',
      `repos/${this.fullRepo}/issues/${issueNumber}/comments?sort=created&direction=desc&per_page=1`,
      '--jq',
      '.[0] | {body: .body, author: .user.login}',
    ], { env: this.getGhEnv() });

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
   * Get issue details AND last comment in a single GraphQL call.
   *
   * Replaces sequential getIssue() + getLastComment() to halve API usage.
   * Falls back to sequential REST calls if GraphQL fails.
   *
   * @param issueNumber - GitHub issue number
   * @returns Issue data + last comment (or null if no comments)
   */
  async getIssueWithLastComment(issueNumber: number): Promise<{
    issue: GitHubIssue;
    lastComment: { body: string; author: string } | null;
  }> {
    const query = `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){issue(number:$number){number title body url state labels(first:10){nodes{name}}comments(last:1){nodes{body author{login}}}}}}`;

    try {
      const result = await this.execWithBudget('gh', [
        'api', 'graphql',
        '-f', `query=${query}`,
        '-F', `owner=${this.owner}`,
        '-F', `repo=${this.repo}`,
        '-F', `number=${issueNumber}`,
      ], { env: this.getGhEnv() });

      if (result.exitCode !== 0) {
        throw new Error(result.stderr || 'GraphQL query failed');
      }

      const data = JSON.parse(result.stdout);
      const gqlIssue = data.data.repository.issue;

      const issue: GitHubIssue = {
        number: gqlIssue.number,
        title: gqlIssue.title,
        body: gqlIssue.body,
        state: gqlIssue.state?.toLowerCase() ?? gqlIssue.state,
        html_url: gqlIssue.url,
        labels: gqlIssue.labels?.nodes?.map((l: { name: string }) => l.name) || [],
      };

      const commentNodes = gqlIssue.comments?.nodes || [];
      const lastComment = commentNodes.length > 0
        ? { body: commentNodes[0].body, author: commentNodes[0].author?.login || '' }
        : null;

      // Cache the issue for subsequent getIssue() calls
      const cacheKey = `${this.fullRepo}#${issueNumber}`;
      GitHubClientV2.issueCache.set(cacheKey, { data: issue, fetchedAt: Date.now() });

      return { issue, lastComment };
    } catch {
      // Fallback: sequential REST calls
      const issue = await this.getIssue(issueNumber);
      const lastComment = await this.getLastComment(issueNumber);
      return { issue, lastComment };
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

    const result = await this.execWithBudget('gh', args, { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw await this.buildWriteError(`add labels to issue #${issueNumber}`, result.stderr || result.stdout);
    }
  }

  /**
   * Bulk-fetch issue states for all SpecWeave-managed issues in a single search call.
   * Returns a Map<issueNumber, 'open' | 'closed'> so the reconciler can skip
   * per-issue getIssue() API calls.
   *
   * @param limit Max results — 100 for default mode, 1000 for --full
   */
  async bulkFetchIssueStates(limit: number = 100): Promise<Map<number, 'open' | 'closed'>> {
    const result = await this.execWithBudget('gh', [
      'search', 'issues',
      `repo:${this.fullRepo} [FS- in:title`,
      '--json', 'number,state',
      '--limit', String(limit),
      '--state', 'all',
    ], { env: this.getGhEnv() });

    const map = new Map<number, 'open' | 'closed'>();
    if (result.exitCode !== 0) return map;

    try {
      const issues = JSON.parse(result.stdout);
      for (const issue of issues) {
        map.set(issue.number, (issue.state?.toLowerCase() ?? 'open') as 'open' | 'closed');
      }
    } catch {
      // Parse failure → empty map → all issues fall back to getIssue()
    }
    return map;
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
    // Check session cache first
    const cacheKey = `${this.fullRepo}#search:${featureId}${userStoryId ? ':' + userStoryId : ''}`;
    const cached = GitHubClientV2.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < GitHubClientV2.CACHE_TTL_MS) {
      return cached.data;
    }

    // Build search pattern
    // e.g., "[FS-063]" or "[FS-063][US-001]"
    const pattern = userStoryId
      ? `[${featureId}][${userStoryId}]`
      : `[${featureId}]`;

    const result = await this.execWithBudget('gh', [
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
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }

    try {
      const issues: GitHubIssue[] = JSON.parse(result.stdout);
      GitHubClientV2.searchCache.set(cacheKey, { data: issues, fetchedAt: Date.now() });
      return issues;
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

    const result = await this.execWithBudget('gh', [
      'search',
      'issues',
      query,
      '--json',
      'number,title,body,state,url,labels,milestone',
      '--limit',
      '1000', // Max results
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to list issues: ${result.stderr || result.stdout}`);
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
    const result = await this.execWithBudget('gh', [
      'api',
      'rate_limit',
      '--jq',
      '.rate | {remaining: .remaining, limit: .limit, reset: .reset}',
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to check rate limit: ${result.stderr || result.stdout}`);
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

  // ==========================================================================
  // Pull Sync - External Change Detection (Increment 0089)
  // ==========================================================================

  /**
   * Fetch recently changed issues for pull sync
   *
   * Uses GitHub Issues API with `since` parameter to find issues
   * that have been updated since a given timestamp.
   *
   * @param since - Timestamp to query changes from
   * @param linkedIssueNumbers - Optional list of issue numbers to filter (linked items only)
   * @returns Array of external changes with changedAt, changedBy, and current values
   */
  async fetchRecentChanges(
    since: Date,
    linkedIssueNumbers?: number[]
  ): Promise<GitHubExternalChange[]> {
    // Build JQ filter for issues updated since timestamp
    const sinceISO = since.toISOString();

    // Query parameters - MUST use .[] to iterate array from GitHub API
    const jqFilter = linkedIssueNumbers && linkedIssueNumbers.length > 0
      ? `.[] | select(.number | IN(${linkedIssueNumbers.join(',')})) | {number, title, state, updated_at, user: .user.login, assignee: .assignee.login, labels: [.labels[].name]}`
      : `.[] | {number, title, state, updated_at, user: .user.login, assignee: .assignee.login, labels: [.labels[].name]}`;

    // Use GitHub API to fetch issues updated since timestamp
    const result = await this.execWithBudget('gh', [
      'api',
      `repos/${this.fullRepo}/issues`,
      '--method', 'GET',
      '-f', `since=${sinceISO}`,
      '-f', 'state=all',
      '-f', 'sort=updated',
      '-f', 'direction=desc',
      '-f', 'per_page=100',
      '--jq', jqFilter,
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to fetch recent changes: ${result.stderr || result.stdout}`);
    }

    // Parse NDJSON output (one JSON object per line)
    const lines = result.stdout.trim().split('\n').filter(l => l.trim());
    const issues: any[] = [];

    for (const line of lines) {
      try {
        issues.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }

    // Map to GitHubExternalChange format
    const changes: GitHubExternalChange[] = issues.map(issue => ({
      platform: 'github' as const,
      externalId: `GH-${issue.number}`,
      issueNumber: issue.number,
      changedAt: issue.updated_at || new Date().toISOString(),
      changedBy: issue.user || 'unknown',
      changedFields: [] as Array<{ field: string; oldValue: unknown; newValue: unknown }>, // GitHub doesn't provide changelog in list API
      currentState: {
        status: issue.state as 'open' | 'closed',
        labels: issue.labels || [],
        assignee: issue.assignee || null,
      },
    }));

    return changes;
  }

  /**
   * Get issue events for detailed change tracking
   *
   * Use this for detailed changelog when needed.
   * GET /repos/{owner}/{repo}/issues/{issue_number}/events
   *
   * @param issueNumber - Issue number
   * @param perPage - Limit number of events
   * @returns Array of events with action details
   */
  async getIssueEvents(issueNumber: number, perPage = 30): Promise<any[]> {
    const result = await this.execWithBudget('gh', [
      'api',
      `repos/${this.fullRepo}/issues/${issueNumber}/events`,
      '-f', `per_page=${perPage}`,
      '--jq', '.[].{event, created_at, actor: .actor.login}',
    ], { env: this.getGhEnv() });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to get issue events: ${result.stderr || result.stdout}`);
    }

    // Parse NDJSON output
    const lines = result.stdout.trim().split('\n').filter(l => l.trim());
    const events: any[] = [];

    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }

    return events;
  }
}
