import { execSync } from "child_process";
import { DuplicateDetector } from "./duplicate-detector.js";
class GitHubClient {
  constructor(repo) {
    this.repo = repo || this.detectRepo();
  }
  /**
   * Auto-detect GitHub repository from git remote
   */
  detectRepo() {
    try {
      const remote = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
      const match = remote.match(/github\.com[:/](.+\/.+?)(?:\.git)?$/);
      if (!match) {
        throw new Error("Could not detect GitHub repository from git remote");
      }
      return match[1];
    } catch (error) {
      throw new Error("Not a git repository or no GitHub remote configured");
    }
  }
  /**
   * Check if GitHub CLI is installed and authenticated
   */
  static checkGitHubCLI() {
    try {
      execSync("gh --version", { encoding: "utf-8", stdio: "pipe" });
    } catch {
      return { installed: false, authenticated: false, error: "GitHub CLI (gh) not installed" };
    }
    try {
      execSync("gh auth status", { encoding: "utf-8", stdio: "pipe" });
      return { installed: true, authenticated: true };
    } catch {
      return { installed: true, authenticated: false, error: "GitHub CLI not authenticated. Run: gh auth login" };
    }
  }
  /**
   * Create or get existing milestone
   *
   * @param title Milestone title
   * @param description Milestone description
   * @param daysFromNow Days until milestone due (default: 2 days - SpecWeave AI velocity)
   */
  async createOrGetMilestone(title, description, daysFromNow = 2) {
    const existing = await this.getMilestoneByTitle(title);
    if (existing) {
      return existing;
    }
    const dueDate = /* @__PURE__ */ new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    const dueDateISO = dueDate.toISOString();
    const cmd = `gh api repos/${this.repo}/milestones -f title="${title}" ${description ? `-f description="${description}"` : ""} -f due_on="${dueDateISO}" --jq '{number: .number, title: .title, description: .description, state: .state, due_on: .due_on}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8" });
      return JSON.parse(output);
    } catch (error) {
      throw new Error(`Failed to create milestone: ${error.message}`);
    }
  }
  /**
   * Get milestone by title
   */
  async getMilestoneByTitle(title) {
    try {
      const cmd = `gh api repos/${this.repo}/milestones --jq '.[] | select(.title=="${title}") | {number: .number, title: .title, description: .description, state: .state}'`;
      const output = execSync(cmd, { encoding: "utf-8" }).trim();
      return output ? JSON.parse(output) : null;
    } catch {
      return null;
    }
  }
  /**
   * Create epic issue (increment-level) with FULL DUPLICATE PROTECTION
   */
  async createEpicIssue(title, body, milestone, labels = []) {
    const titlePattern = DuplicateDetector.extractTitlePattern(title);
    if (!titlePattern) {
      throw new Error(`Epic issue title must start with pattern like [FS-XXX] or [INC-XXXX]: ${title}`);
    }
    try {
      const result = await DuplicateDetector.createWithProtection({
        title,
        body,
        titlePattern,
        labels: labels.length > 0 ? labels : ["specweave", "increment"],
        milestone: milestone?.toString(),
        repo: this.repo
      });
      const viewCmd = `gh issue view ${result.issue.number} --repo ${this.repo} --json number,title,body,state,url,labels,milestone`;
      const output = execSync(viewCmd, { encoding: "utf-8" });
      const issue = JSON.parse(output);
      if (result.wasReused) {
        console.log(`   \u267B\uFE0F  Reused existing issue #${result.issue.number} (duplicate prevention)`);
      }
      if (result.duplicatesFound > 0) {
        console.log(`   \u{1F6E1}\uFE0F  Duplicates detected: ${result.duplicatesFound} (auto-closed: ${result.duplicatesClosed})`);
      }
      return {
        ...issue,
        html_url: issue.url,
        labels: issue.labels?.map((l) => l.name) || []
      };
    } catch (error) {
      throw new Error(`Failed to create epic issue: ${error.message}`);
    }
  }
  /**
   * Create task issue (linked to epic)
   */
  async createTaskIssue(title, body, epicNumber, milestone, labels = []) {
    const enhancedBody = `**Part of**: #${epicNumber}

${body}`;
    const labelArgs = labels.map((l) => `-l "${l}"`).join(" ");
    const milestoneArg = milestone ? `-m "${milestone}"` : "";
    const createCmd = `gh issue create --repo ${this.repo} --title "${this.escapeQuotes(title)}" --body "${this.escapeQuotes(enhancedBody)}" ${labelArgs} ${milestoneArg}`;
    try {
      const issueUrl = execSync(createCmd, { encoding: "utf-8" }).trim();
      const issueNumber = parseInt(issueUrl.split("/").pop() || "0", 10);
      if (!issueNumber) {
        throw new Error("Failed to extract issue number from URL: " + issueUrl);
      }
      const viewCmd = `gh issue view ${issueNumber} --repo ${this.repo} --json number,title,body,state,url,labels,milestone`;
      const output = execSync(viewCmd, { encoding: "utf-8" });
      const issue = JSON.parse(output);
      return {
        ...issue,
        html_url: issue.url,
        labels: issue.labels?.map((l) => l.name) || []
      };
    } catch (error) {
      throw new Error(`Failed to create task issue: ${error.message}`);
    }
  }
  /**
   * Update issue body
   */
  async updateIssueBody(issueNumber, newBody) {
    const cmd = `gh issue edit ${issueNumber} --repo ${this.repo} --body "${this.escapeQuotes(newBody)}"`;
    try {
      execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    } catch (error) {
      throw new Error(`Failed to update issue #${issueNumber}: ${error.message}`);
    }
  }
  /**
   * Get issue details
   */
  async getIssue(issueNumber) {
    const cmd = `gh issue view ${issueNumber} --repo ${this.repo} --json number,title,body,state,html_url,labels,milestone`;
    try {
      const output = execSync(cmd, { encoding: "utf-8" });
      const issue = JSON.parse(output);
      return {
        ...issue,
        labels: issue.labels?.map((l) => l.name) || []
      };
    } catch (error) {
      throw new Error(`Failed to get issue #${issueNumber}: ${error.message}`);
    }
  }
  /**
   * Close issue
   */
  async closeIssue(issueNumber, comment) {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }
    const cmd = `gh issue close ${issueNumber} --repo ${this.repo}`;
    try {
      execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    } catch (error) {
      throw new Error(`Failed to close issue #${issueNumber}: ${error.message}`);
    }
  }
  /**
   * Add comment to issue
   */
  async addComment(issueNumber, comment) {
    const cmd = `gh issue comment ${issueNumber} --repo ${this.repo} --body "${this.escapeQuotes(comment)}"`;
    try {
      execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    } catch (error) {
      throw new Error(`Failed to add comment to issue #${issueNumber}: ${error.message}`);
    }
  }
  /**
   * Add labels to issue
   */
  async addLabels(issueNumber, labels) {
    if (labels.length === 0) return;
    const labelArgs = labels.map((l) => `"${l}"`).join(",");
    const cmd = `gh issue edit ${issueNumber} --repo ${this.repo} --add-label ${labelArgs}`;
    try {
      execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    } catch (error) {
      throw new Error(`Failed to add labels to issue #${issueNumber}: ${error.message}`);
    }
  }
  /**
   * Check rate limit status
   */
  async checkRateLimit() {
    const cmd = `gh api rate_limit --jq '.rate | {remaining: .remaining, limit: .limit, reset: .reset}'`;
    try {
      const output = execSync(cmd, { encoding: "utf-8" });
      const data = JSON.parse(output);
      return {
        ...data,
        reset: new Date(data.reset * 1e3)
      };
    } catch (error) {
      throw new Error(`Failed to check rate limit: ${error.message}`);
    }
  }
  /**
   * Escape quotes in strings for shell commands
   */
  escapeQuotes(str) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$");
  }
  /**
   * Batch create issues with rate limit handling
   */
  async batchCreateIssues(issues, milestone, epicNumber, options = {}) {
    const { batchSize = 10, delayMs = 6e3 } = options;
    const createdIssues = [];
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      console.log(`Creating issues ${i + 1}-${Math.min(i + batchSize, issues.length)} of ${issues.length}...`);
      for (const issue of batch) {
        try {
          const created = epicNumber ? await this.createTaskIssue(issue.title, issue.body, epicNumber, milestone, issue.labels) : await this.createEpicIssue(issue.title, issue.body, milestone, issue.labels);
          createdIssues.push(created);
        } catch (error) {
          console.error(`Failed to create issue "${issue.title}":`, error.message);
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
  /**
   * Get all repositories accessible to the user
   * @param owner Optional: filter by specific owner/org (e.g., 'octocat', 'my-org')
   * @param limit Maximum number of repos to fetch (default: 100, max: 1000)
   */
  static async getRepositories(owner, limit = 100) {
    try {
      const ownerFilter = owner ? `${owner}/` : "";
      const cmd = `gh repo list ${ownerFilter} --limit ${limit} --json owner,name,nameWithOwner`;
      const output = execSync(cmd, { encoding: "utf-8" }).trim();
      if (!output) {
        return [];
      }
      const repos = JSON.parse(output);
      return repos.map((repo) => ({
        owner: repo.owner?.login || "",
        name: repo.name,
        fullName: repo.nameWithOwner
      }));
    } catch (error) {
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }
}
export {
  GitHubClient
};
