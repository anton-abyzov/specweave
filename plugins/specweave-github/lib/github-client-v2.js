import { execFileNoThrow } from "../../../src/utils/execFileNoThrow.js";
class GitHubClientV2 {
  /**
   * Create GitHub client from sync profile
   */
  constructor(profile) {
    if (profile.provider !== "github") {
      throw new Error(`Expected GitHub profile, got ${profile.provider}`);
    }
    const config = profile.config;
    this.owner = config.owner;
    this.repo = config.repo;
    this.fullRepo = `${this.owner}/${this.repo}`;
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
    return new GitHubClientV2(profile);
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
  async createOrGetMilestone(title, description, daysFromNow = 2) {
    const existing = await this.getMilestoneByTitle(title);
    if (existing) {
      return existing;
    }
    const dueDate = /* @__PURE__ */ new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
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
    const result = await execFileNoThrow("gh", args);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to create milestone: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(result.stdout);
  }
  /**
   * Get milestone by title
   */
  async getMilestoneByTitle(title) {
    const result = await execFileNoThrow("gh", [
      "api",
      `repos/${this.fullRepo}/milestones`,
      "--jq",
      `.[] | select(.title=="${title}") | {number: .number, title: .title, description: .description, state: .state}`
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
   * Create epic issue (increment-level)
   */
  async createEpicIssue(title, body, milestone, labels = []) {
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
      args.push("--milestone", String(milestone));
    }
    const createResult = await execFileNoThrow("gh", args);
    if (createResult.exitCode !== 0) {
      throw new Error(
        `Failed to create epic issue: ${createResult.stderr || createResult.stdout}`
      );
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
    const result = await execFileNoThrow("gh", [
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      this.fullRepo,
      "--json",
      "number,title,body,state,url,labels,milestone"
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
      labels: issue.labels?.map((l) => l.name) || []
    };
  }
  /**
   * Update issue body
   */
  async updateIssueBody(issueNumber, newBody) {
    const result = await execFileNoThrow("gh", [
      "issue",
      "edit",
      String(issueNumber),
      "--repo",
      this.fullRepo,
      "--body",
      newBody
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
  async closeIssue(issueNumber, comment) {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }
    const result = await execFileNoThrow("gh", [
      "issue",
      "close",
      String(issueNumber),
      "--repo",
      this.fullRepo
    ]);
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to close issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
    }
  }
  /**
   * Add comment to issue
   */
  async addComment(issueNumber, comment) {
    const result = await execFileNoThrow("gh", [
      "issue",
      "comment",
      String(issueNumber),
      "--repo",
      this.fullRepo,
      "--body",
      comment
    ]);
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to add comment to issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
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
    const result = await execFileNoThrow("gh", args);
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to add labels to issue #${issueNumber}: ${result.stderr || result.stdout}`
      );
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
    const result = await execFileNoThrow("gh", [
      "search",
      "issues",
      query,
      "--json",
      "number,title,body,state,url,labels,milestone",
      "--limit",
      "1000"
      // Max results
    ]);
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
    const result = await execFileNoThrow("gh", [
      "api",
      "rate_limit",
      "--jq",
      ".rate | {remaining: .remaining, limit: .limit, reset: .reset}"
    ]);
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
}
export {
  GitHubClientV2
};
