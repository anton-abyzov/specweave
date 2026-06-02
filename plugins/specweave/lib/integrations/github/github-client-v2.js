import { execFileNoThrow } from "../../vendor/utils/execFileNoThrow.js";
import { explainGitHubAccessError, resolveGitHubAccessFacts } from "./github-access-error.js";
import { checkAndDecrement } from "../../../../../src/sync/github-rate-limit-budget.js";
import { findProjectRoot } from "../../../../../src/utils/find-project-root.js";
const _GitHubClientV2 = class _GitHubClientV2 {
  /**
   * Create GitHub client from sync profile
   */
  constructor(profile, projectRoot) {
    if (profile.provider !== "github") {
      throw new Error(`Expected GitHub profile, got ${profile.provider}`);
    }
    const config = profile.config;
    if (!config.owner || !config.repo) {
      throw new Error("GitHub profile config missing required owner or repo");
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
  getGhEnv() {
    return this.token ? { ...process.env, GH_TOKEN: this.token } : process.env;
  }
  /**
   * Turn a failed `gh` create result into a clear error.
   *
   * When the failure looks like an auth/access problem (notably a 404 masking a
   * wrong-account token in .env), resolve the token's account + write access and
   * explain exactly what to fix; otherwise fall back to the raw gh error.
   */
  async buildCreateError(action, rawError) {
    try {
      const facts = await resolveGitHubAccessFacts(
        execFileNoThrow,
        this.getGhEnv(),
        this.owner,
        this.repo
      );
      const explained = explainGitHubAccessError(rawError, { ...facts, owner: this.owner, repo: this.repo });
      if (explained) return new Error(`Failed to ${action}: ${explained}`);
    } catch {
    }
    return new Error(`Failed to ${action}: ${rawError}`);
  }
  /**
   * Set the project root for rate-limit budget tracking.
   * When set, all API calls check the shared budget before executing.
   */
  setProjectRoot(root) {
    this.projectRoot = root;
  }
  /**
   * Budget-gated wrapper around execFileNoThrow.
   * Checks shared rate-limit budget before making API calls.
   * Skips the call with a warning if budget is exhausted.
   */
  async execWithBudget(command, args, options) {
    if (this.projectRoot) {
      const allowed = await checkAndDecrement(this.projectRoot);
      if (!allowed) {
        console.warn(`\u26A0\uFE0F  GitHub API call skipped \u2014 rate limit budget exhausted (remaining < 200)`);
        return { stdout: "", stderr: "Rate limit budget exhausted", exitCode: 1, success: false };
      }
    }
    return execFileNoThrow(command, args, options);
  }
  /**
   * Create client from owner/repo directly
   */
  static fromRepo(owner, repo) {
    const profile = {
      provider: "github",
      displayName: `${owner}/${repo}`,
      config: { owner, repo },
      timeRange: { default: "1M", max: "6M" }
    };
    const projectRoot = findProjectRoot() ?? void 0;
    return new _GitHubClientV2(profile, projectRoot);
  }
  /**
   * Get repository owner
   */
  getOwner() {
    return this.owner;
  }
  /**
   * Get repository name
   */
  getRepo() {
    return this.repo;
  }
  // ==========================================================================
  // Authentication & Setup
  // ==========================================================================
  /**
   * Check if GitHub CLI is installed and authenticated
   */
  static async checkCLI() {
    const versionCheck = await execFileNoThrow("gh", ["--version"]);
    if (versionCheck.exitCode !== 0) {
      return {
        installed: false,
        authenticated: false,
        error: "GitHub CLI (gh) not installed. Install from: https://cli.github.com/"
      };
    }
    const authCheck = await execFileNoThrow("gh", ["auth", "status"]);
    if (authCheck.exitCode !== 0) {
      return {
        installed: true,
        authenticated: false,
        error: "GitHub CLI not authenticated. Run: gh auth login"
      };
    }
    return { installed: true, authenticated: true };
  }
  /**
   * Auto-detect repository from git remote
   */
  static async detectRepo(cwd) {
    const result = await execFileNoThrow("git", [
      "remote",
      "get-url",
      "origin"
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
      repo: match[2]
    };
  }
  // ==========================================================================
  // Milestones
  // ==========================================================================
  /**
   * Create or get existing milestone
   */
  async createOrGetMilestone(title, description, daysFromNow) {
    const dueDays = daysFromNow ?? 2;
    const existing = await this.getMilestoneByTitle(title);
    if (existing) {
      return existing;
    }
    const dueDate = /* @__PURE__ */ new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const dueDateISO = dueDate.toISOString();
    const args = [
      "api",
      `repos/${this.fullRepo}/milestones`,
      "-f",
      `title=${title}`,
      "-f",
      `due_on=${dueDateISO}`,
      "--jq",
      "{number: .number, title: .title, description: .description, state: .state, due_on: .due_on}"
    ];
    if (description) {
      args.splice(4, 0, "-f", `description=${description}`);
    }
    const result = await this.execWithBudget("gh", args, { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw await this.buildCreateError("create milestone", result.stderr || result.stdout);
    }
    return JSON.parse(result.stdout);
  }
  /**
   * Get milestone by title
   */
  async getMilestoneByTitle(title) {
    const result = await this.execWithBudget("gh", [
      "api",
      `repos/${this.fullRepo}/milestones?per_page=100&state=all`,
      "--jq",
      `.[] | select(.title=="${title}") | {number: .number, title: .title, description: .description, state: .state}`
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
  validateIssueTitle(title) {
    const deprecatedIncrementPattern = /\[Increment\s+\d+\]/i;
    if (deprecatedIncrementPattern.test(title)) {
      throw new Error(
        `\u274C DEPRECATED FORMAT DETECTED: "${title}"

GitHub issues MUST use living docs format:
  \u2705 CORRECT: "[FS-XXX][US-YYY] Title" (User Story)
  \u274C WRONG: "[Increment XXXX] Title" (old format)

WHY: Correct data flow is: Increment \u2192 Living Docs \u2192 GitHub
      Living docs are the source of truth for GitHub sync.

FIX: Use sw:sync-docs to generate living docs, then sync to GitHub.`
      );
    }
    const plainIncrementPattern = /^\[\d{3,4}E?\]\s/;
    if (plainIncrementPattern.test(title)) {
      const match = title.match(/^\[(\d{3,4}E?)\]/);
      const incrementId = match ? match[1] : "XXXX";
      const num = parseInt(incrementId.replace("E", ""), 10);
      const isExternal = incrementId.endsWith("E");
      const properFsId = `FS-${String(num).padStart(3, "0")}${isExternal ? "E" : ""}`;
      throw new Error(
        `\u274C INVALID TITLE FORMAT: "${title}"

Plain increment IDs like [${incrementId}] are NOT allowed!

GitHub issues MUST use SpecWeave format:
  \u2705 CORRECT: "[${properFsId}][US-001] Title" (User Story)
  \u2705 CORRECT: "[${properFsId}] Title" (Feature-level)
  \u274C WRONG: "[${incrementId}] Title" (missing FS- prefix)

WHY: FS-XXX format ensures traceability to Feature folders in living docs.
     Plain increment IDs create duplicates and break the sync architecture.

FIX:
  1. Use sw:sync-progress to sync with proper format
  2. Or use sw-github:sync to create issues correctly
  3. Ensure increment has proper spec.md with User Stories`
      );
    }
    const typePrefixPattern = /^\[(BUG|HOTFIX|FEATURE|DOCS|REFACTOR|CHORE|EXPERIMENT|Bug|Hotfix|Feature|Docs|Refactor|Chore|Experiment)\]/i;
    if (typePrefixPattern.test(title)) {
      const match = title.match(typePrefixPattern);
      const badPrefix = match ? match[0] : "[TYPE]";
      throw new Error(
        `\u274C INVALID TITLE FORMAT: "${title}"

Type prefixes like ${badPrefix} belong as LABELS, not in the title!

GitHub issues MUST use this format:
  \u2705 CORRECT: "[FS-XXX][US-YYY] Title" (User Story)
  \u274C WRONG: "${badPrefix} Title" (use 'bug' label instead)

WHY: All SpecWeave issues follow [FS-XXX][US-YYY] format for traceability.
     Use GitHub labels for categorization (bug, enhancement, etc.).

FIX:
  1. Link this work to a Feature (FS-XXX) and User Story (US-YYY)
  2. Use /specweave-github:sync to create issue with correct format
  3. Add '${match ? match[1].toLowerCase() : "bug"}' as a label instead`
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
  async createUserStoryIssue(params) {
    const formattedTitle = `[${params.featureId}][${params.userStoryId}] ${params.title}`;
    const allLabels = params.labels || [];
    return await this.createEpicIssue(
      formattedTitle,
      params.body,
      params.milestone || void 0,
      allLabels
    );
  }
  /**
   * Create epic issue (increment-level)
   *
   * CRITICAL: Includes duplicate detection to prevent creating duplicate issues
   */
  async createEpicIssue(title, body, milestone, labels = [], options) {
    this.validateIssueTitle(title);
    if (!options?.skipDuplicateCheck) {
      const titlePatternMatch = title.match(/^\[FS-\d{3,}E?\](?:\[US-\d{3,}E?\])?/);
      if (titlePatternMatch) {
        const titlePattern = titlePatternMatch[0];
        const existingIssue = await this.searchIssueByTitle(titlePattern, true);
        if (existingIssue) {
          console.log(`\u26A0\uFE0F Issue already exists: #${existingIssue.number} - "${existingIssue.title}"`);
          console.log(`   Returning existing issue instead of creating duplicate.`);
          return existingIssue;
        }
      }
    }
    const args = [
      "issue",
      "create",
      "--repo",
      this.fullRepo,
      "--title",
      title,
      "--body",
      body
    ];
    for (const label of labels) {
      args.push("--label", label);
    }
    if (milestone !== void 0) {
      if (typeof milestone === "number") {
        const msResult = await this.execWithBudget("gh", [
          "api",
          `repos/${this.fullRepo}/milestones/${milestone}`,
          "--jq",
          ".title"
        ], { env: this.getGhEnv() });
        if (msResult.exitCode === 0 && msResult.stdout.trim()) {
          args.push("--milestone", msResult.stdout.trim());
        }
      } else {
        args.push("--milestone", milestone);
      }
    }
    const createResult = await this.execWithBudget("gh", args, { env: this.getGhEnv() });
    if (createResult.exitCode !== 0) {
      throw await this.buildCreateError("create issue", createResult.stderr || createResult.stdout);
    }
    const issueUrl = createResult.stdout.trim();
    const issueNumber = parseInt(issueUrl.split("/").pop() || "0", 10);
    if (!issueNumber) {
      throw new Error(`Failed to extract issue number from URL: ${issueUrl}`);
    }
    return await this.getIssue(issueNumber);
  }
  /**
   * Create task issue (linked to epic)
   */
  async createTaskIssue(title, body, epicNumber, milestone, labels = []) {
    const enhancedBody = `**Part of**: #${epicNumber}

${body}`;
    return await this.createEpicIssue(title, enhancedBody, milestone, labels);
  }
  /**
   * Get issue details
   */
  async getIssue(issueNumber) {
    const cacheKey = `${this.fullRepo}#${issueNumber}`;
    const cached = _GitHubClientV2.issueCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < _GitHubClientV2.CACHE_TTL_MS) {
      return cached.data;
    }
    const result = await this.execWithBudget("gh", [
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      this.fullRepo,
      "--json",
      "number,title,body,state,url,labels,milestone"
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to get issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
    const issue = JSON.parse(result.stdout);
    const normalized = {
      ...issue,
      // gh CLI returns state as UPPERCASE ("OPEN"/"CLOSED"), normalize to lowercase
      // for consistency with GitHub REST API which uses lowercase
      state: issue.state?.toLowerCase() ?? issue.state,
      html_url: issue.url,
      labels: issue.labels?.map((l) => l.name) || []
    };
    _GitHubClientV2.issueCache.set(cacheKey, { data: normalized, fetchedAt: Date.now() });
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
  async searchIssueByTitle(title, includeClosedIssues = false) {
    const escapedTitle = title.replace(/"/g, '\\"');
    const args = [
      "issue",
      "list",
      "--repo",
      this.fullRepo,
      "--search",
      `"${escapedTitle}" in:title`,
      "--json",
      "number,title,state,url,labels",
      "--limit",
      "50"
      // ✅ FIX: Increased from 1 to 50 to catch duplicates (Issue #0047)
    ];
    if (includeClosedIssues) {
      args.push("--state", "all");
    }
    const result = await this.execWithBudget("gh", args, { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      return null;
    }
    const issues = JSON.parse(result.stdout || "[]");
    if (!issues || issues.length === 0) {
      return null;
    }
    const issue = issues[0];
    return {
      number: issue.number,
      title: issue.title,
      body: "",
      // Body not included in list view
      state: issue.state,
      html_url: issue.url,
      labels: issue.labels?.map((l) => l.name) || []
    };
  }
  /**
   * Edit issue body directly without fetching current state first.
   * Use this for already-linked issues where we know the issue exists.
   * Saves 1 API call compared to the fetch-then-edit pattern.
   */
  async editIssueBody(issueNumber, newBody) {
    const result = await this.execWithBudget("gh", [
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      this.fullRepo,
      "--body",
      newBody
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to edit issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }
  /**
   * Update issue body
   */
  async updateIssueBody(issueNumber, newBody) {
    const result = await this.execWithBudget("gh", [
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      this.fullRepo,
      "--body",
      newBody
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to update issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }
  /**
   * Close issue
   */
  async closeIssue(issueNumber, comment) {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }
    const result = await this.execWithBudget("gh", [
      "issue",
      "close",
      String(issueNumber),
      "--repo",
      this.fullRepo
    ], { env: this.getGhEnv() });
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
  async reopenIssue(issueNumber, comment) {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }
    const result = await this.execWithBudget("gh", [
      "issue",
      "reopen",
      String(issueNumber),
      "--repo",
      this.fullRepo
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to reopen issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }
  /**
   * Add comment to issue
   */
  async addComment(issueNumber, comment) {
    const result = await this.execWithBudget("gh", [
      "issue",
      "comment",
      String(issueNumber),
      "--repo",
      this.fullRepo,
      "--body",
      comment
    ], { env: this.getGhEnv() });
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
  async getLastComment(issueNumber) {
    const result = await this.execWithBudget("gh", [
      "api",
      `repos/${this.fullRepo}/issues/${issueNumber}/comments?sort=created&direction=desc&per_page=1`,
      "--jq",
      ".[0] | {body: .body, author: .user.login}"
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      return null;
    }
    if (!result.stdout.trim()) {
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
  async getIssueWithLastComment(issueNumber) {
    const query = `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){issue(number:$number){number title body url state labels(first:10){nodes{name}}comments(last:1){nodes{body author{login}}}}}}`;
    try {
      const result = await this.execWithBudget("gh", [
        "api",
        "graphql",
        "-f",
        `query=${query}`,
        "-F",
        `owner=${this.owner}`,
        "-F",
        `repo=${this.repo}`,
        "-F",
        `number=${issueNumber}`
      ], { env: this.getGhEnv() });
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || "GraphQL query failed");
      }
      const data = JSON.parse(result.stdout);
      const gqlIssue = data.data.repository.issue;
      const issue = {
        number: gqlIssue.number,
        title: gqlIssue.title,
        body: gqlIssue.body,
        state: gqlIssue.state?.toLowerCase() ?? gqlIssue.state,
        html_url: gqlIssue.url,
        labels: gqlIssue.labels?.nodes?.map((l) => l.name) || []
      };
      const commentNodes = gqlIssue.comments?.nodes || [];
      const lastComment = commentNodes.length > 0 ? { body: commentNodes[0].body, author: commentNodes[0].author?.login || "" } : null;
      const cacheKey = `${this.fullRepo}#${issueNumber}`;
      _GitHubClientV2.issueCache.set(cacheKey, { data: issue, fetchedAt: Date.now() });
      return { issue, lastComment };
    } catch {
      const issue = await this.getIssue(issueNumber);
      const lastComment = await this.getLastComment(issueNumber);
      return { issue, lastComment };
    }
  }
  /**
   * Add labels to issue
   */
  async addLabels(issueNumber, labels) {
    if (labels.length === 0) return;
    const args = [
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      this.fullRepo
    ];
    for (const label of labels) {
      args.push("--add-label", label);
    }
    const result = await this.execWithBudget("gh", args, { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to add labels to issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }
  /**
   * Bulk-fetch issue states for all SpecWeave-managed issues in a single search call.
   * Returns a Map<issueNumber, 'open' | 'closed'> so the reconciler can skip
   * per-issue getIssue() API calls.
   *
   * @param limit Max results — 100 for default mode, 1000 for --full
   */
  async bulkFetchIssueStates(limit = 100) {
    const result = await this.execWithBudget("gh", [
      "search",
      "issues",
      `repo:${this.fullRepo} [FS- in:title`,
      "--json",
      "number,state",
      "--limit",
      String(limit),
      "--state",
      "all"
    ], { env: this.getGhEnv() });
    const map = /* @__PURE__ */ new Map();
    if (result.exitCode !== 0) return map;
    try {
      const issues = JSON.parse(result.stdout);
      for (const issue of issues) {
        map.set(issue.number, issue.state?.toLowerCase() ?? "open");
      }
    } catch {
    }
    return map;
  }
  /**
   * Search for issues by feature ID and user story pattern (NEW in v0.28.33)
   *
   * Searches for issues with title matching pattern: [FS-XXX][US-YYY]
   * Used by GitHubReconciler to find issues not stored in metadata.json
   */
  async searchIssuesByFeature(featureId, userStoryId) {
    const cacheKey = `${this.fullRepo}#search:${featureId}${userStoryId ? ":" + userStoryId : ""}`;
    const cached = _GitHubClientV2.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < _GitHubClientV2.CACHE_TTL_MS) {
      return cached.data;
    }
    const pattern = userStoryId ? `[${featureId}][${userStoryId}]` : `[${featureId}]`;
    const result = await this.execWithBudget("gh", [
      "issue",
      "list",
      "--repo",
      this.fullRepo,
      "--search",
      `"${pattern}" in:title`,
      "--json",
      "number,title,state,url",
      "--state",
      "all",
      // Include both open and closed
      "--limit",
      "100"
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }
    try {
      const issues = JSON.parse(result.stdout);
      _GitHubClientV2.searchCache.set(cacheKey, { data: issues, fetchedAt: Date.now() });
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
  async listIssuesInTimeRange(timeRange, customStart, customEnd) {
    const { since, until } = this.calculateTimeRange(timeRange, customStart, customEnd);
    const query = `repo:${this.fullRepo} is:issue created:${since}..${until}`;
    const result = await this.execWithBudget("gh", [
      "search",
      "issues",
      query,
      "--json",
      "number,title,body,state,url,labels,milestone",
      "--limit",
      "1000"
      // Max results
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to list issues: ${result.stderr || result.stdout}`
      );
    }
    const issues = JSON.parse(result.stdout);
    return issues.map((issue) => ({
      ...issue,
      html_url: issue.url,
      labels: issue.labels?.map((l) => l.name) || []
    }));
  }
  /**
   * Calculate date range from time range preset
   */
  calculateTimeRange(timeRange, customStart, customEnd) {
    if (timeRange === "ALL") {
      return {
        since: "1970-01-01",
        until: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
    }
    if (customStart) {
      return {
        since: customStart,
        until: customEnd || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
    }
    const now = /* @__PURE__ */ new Date();
    const since = new Date(now);
    switch (timeRange) {
      case "1W":
        since.setDate(now.getDate() - 7);
        break;
      case "2W":
        since.setDate(now.getDate() - 14);
        break;
      case "1M":
        since.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        since.setMonth(now.getMonth() - 3);
        break;
      case "6M":
        since.setMonth(now.getMonth() - 6);
        break;
      case "1Y":
        since.setFullYear(now.getFullYear() - 1);
        break;
    }
    return {
      since: since.toISOString().split("T")[0],
      until: now.toISOString().split("T")[0]
    };
  }
  // ==========================================================================
  // Rate Limiting
  // ==========================================================================
  /**
   * Check rate limit status
   */
  async checkRateLimit() {
    const result = await this.execWithBudget("gh", [
      "api",
      "rate_limit",
      "--jq",
      ".rate | {remaining: .remaining, limit: .limit, reset: .reset}"
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to check rate limit: ${result.stderr || result.stdout}`
      );
    }
    const data = JSON.parse(result.stdout);
    return {
      ...data,
      reset: new Date(data.reset * 1e3)
    };
  }
  // ==========================================================================
  // Batch Operations
  // ==========================================================================
  /**
   * Batch create issues with rate limit handling
   */
  async batchCreateIssues(issues, milestone, epicNumber, options = {}) {
    const { batchSize = 10, delayMs = 6e3 } = options;
    const createdIssues = [];
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      console.log(
        `Creating issues ${i + 1}-${Math.min(i + batchSize, issues.length)} of ${issues.length}...`
      );
      for (const issue of batch) {
        try {
          const created = epicNumber ? await this.createTaskIssue(
            issue.title,
            issue.body,
            epicNumber,
            milestone,
            issue.labels
          ) : await this.createEpicIssue(
            issue.title,
            issue.body,
            milestone,
            issue.labels
          );
          createdIssues.push(created);
        } catch (error) {
          console.error(
            `Failed to create issue "${issue.title}":`,
            error.message
          );
        }
      }
      if (i + batchSize < issues.length) {
        console.log(`Waiting ${delayMs / 1e3}s to avoid rate limits...`);
        await this.sleep(delayMs);
      }
    }
    return createdIssues;
  }
  sleep(ms) {
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
  async fetchRecentChanges(since, linkedIssueNumbers) {
    const sinceISO = since.toISOString();
    const jqFilter = linkedIssueNumbers && linkedIssueNumbers.length > 0 ? `.[] | select(.number | IN(${linkedIssueNumbers.join(",")})) | {number, title, state, updated_at, user: .user.login, assignee: .assignee.login, labels: [.labels[].name]}` : `.[] | {number, title, state, updated_at, user: .user.login, assignee: .assignee.login, labels: [.labels[].name]}`;
    const result = await this.execWithBudget("gh", [
      "api",
      `repos/${this.fullRepo}/issues`,
      "--method",
      "GET",
      "-f",
      `since=${sinceISO}`,
      "-f",
      "state=all",
      "-f",
      "sort=updated",
      "-f",
      "direction=desc",
      "-f",
      "per_page=100",
      "--jq",
      jqFilter
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to fetch recent changes: ${result.stderr || result.stdout}`
      );
    }
    const lines = result.stdout.trim().split("\n").filter((l) => l.trim());
    const issues = [];
    for (const line of lines) {
      try {
        issues.push(JSON.parse(line));
      } catch {
      }
    }
    const changes = issues.map((issue) => ({
      platform: "github",
      externalId: `GH-${issue.number}`,
      issueNumber: issue.number,
      changedAt: issue.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
      changedBy: issue.user || "unknown",
      changedFields: [],
      // GitHub doesn't provide changelog in list API
      currentState: {
        status: issue.state,
        labels: issue.labels || [],
        assignee: issue.assignee || null
      }
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
  async getIssueEvents(issueNumber, perPage = 30) {
    const result = await this.execWithBudget("gh", [
      "api",
      `repos/${this.fullRepo}/issues/${issueNumber}/events`,
      "-f",
      `per_page=${perPage}`,
      "--jq",
      ".[].{event, created_at, actor: .actor.login}"
    ], { env: this.getGhEnv() });
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to get issue events: ${result.stderr || result.stdout}`
      );
    }
    const lines = result.stdout.trim().split("\n").filter((l) => l.trim());
    const events = [];
    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch {
      }
    }
    return events;
  }
};
// Session cache: avoids redundant API calls for the same issue within 30s
_GitHubClientV2.issueCache = /* @__PURE__ */ new Map();
_GitHubClientV2.searchCache = /* @__PURE__ */ new Map();
_GitHubClientV2.CACHE_TTL_MS = 3e4;
let GitHubClientV2 = _GitHubClientV2;
export {
  GitHubClientV2
};
