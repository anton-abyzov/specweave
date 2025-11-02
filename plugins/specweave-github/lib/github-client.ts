/**
 * GitHub CLI wrapper for SpecWeave
 * Uses `gh` command for GitHub API operations
 */

import { execSync } from 'child_process';
import { GitHubIssue, GitHubMilestone } from './types';

export class GitHubClient {
  private repo: string;

  constructor(repo?: string) {
    // Auto-detect repo from git remote if not provided
    this.repo = repo || this.detectRepo();
  }

  /**
   * Auto-detect GitHub repository from git remote
   */
  private detectRepo(): string {
    try {
      const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      const match = remote.match(/github\.com[:/](.+\/.+?)(?:\.git)?$/);
      if (!match) {
        throw new Error('Could not detect GitHub repository from git remote');
      }
      return match[1];
    } catch (error) {
      throw new Error('Not a git repository or no GitHub remote configured');
    }
  }

  /**
   * Check if GitHub CLI is installed and authenticated
   */
  static checkGitHubCLI(): { installed: boolean; authenticated: boolean; error?: string } {
    try {
      execSync('gh --version', { encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      return { installed: false, authenticated: false, error: 'GitHub CLI (gh) not installed' };
    }

    try {
      execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' });
      return { installed: true, authenticated: true };
    } catch {
      return { installed: true, authenticated: false, error: 'GitHub CLI not authenticated. Run: gh auth login' };
    }
  }

  /**
   * Create or get existing milestone
   *
   * @param title Milestone title
   * @param description Milestone description
   * @param daysFromNow Days until milestone due (default: 2 days - SpecWeave AI velocity)
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

    // Calculate due date (SpecWeave default: 1-2 days with AI assistance)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    const dueDateISO = dueDate.toISOString();

    // Create new milestone with due date
    const cmd = `gh api repos/${this.repo}/milestones -f title="${title}" ${description ? `-f description="${description}"` : ''} -f due_on="${dueDateISO}" --jq '{number: .number, title: .title, description: .description, state: .state, due_on: .due_on}'`;

    try {
      const output = execSync(cmd, { encoding: 'utf-8' });
      return JSON.parse(output);
    } catch (error: any) {
      throw new Error(`Failed to create milestone: ${error.message}`);
    }
  }

  /**
   * Get milestone by title
   */
  private async getMilestoneByTitle(title: string): Promise<GitHubMilestone | null> {
    try {
      const cmd = `gh api repos/${this.repo}/milestones --jq '.[] | select(.title=="${title}") | {number: .number, title: .title, description: .description, state: .state}'`;
      const output = execSync(cmd, { encoding: 'utf-8' }).trim();
      return output ? JSON.parse(output) : null;
    } catch {
      return null;
    }
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
    const labelArgs = labels.map(l => `-l "${l}"`).join(' ');
    const milestoneArg = milestone ? `-m "${milestone}"` : '';

    // Create issue (returns URL)
    const createCmd = `gh issue create --repo ${this.repo} --title "${this.escapeQuotes(title)}" --body "${this.escapeQuotes(body)}" ${labelArgs} ${milestoneArg}`;

    try {
      const issueUrl = execSync(createCmd, { encoding: 'utf-8' }).trim();

      // Extract issue number from URL (e.g., https://github.com/owner/repo/issues/123)
      const issueNumber = parseInt(issueUrl.split('/').pop() || '0', 10);

      if (!issueNumber) {
        throw new Error('Failed to extract issue number from URL: ' + issueUrl);
      }

      // Fetch issue details
      const viewCmd = `gh issue view ${issueNumber} --repo ${this.repo} --json number,title,body,state,url,labels,milestone`;
      const output = execSync(viewCmd, { encoding: 'utf-8' });
      const issue = JSON.parse(output);

      return {
        ...issue,
        html_url: issue.url,
        labels: issue.labels?.map((l: any) => l.name) || []
      };
    } catch (error: any) {
      throw new Error(`Failed to create epic issue: ${error.message}`);
    }
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

    const labelArgs = labels.map(l => `-l "${l}"`).join(' ');
    const milestoneArg = milestone ? `-m "${milestone}"` : '';

    // Create issue (returns URL)
    const createCmd = `gh issue create --repo ${this.repo} --title "${this.escapeQuotes(title)}" --body "${this.escapeQuotes(enhancedBody)}" ${labelArgs} ${milestoneArg}`;

    try {
      const issueUrl = execSync(createCmd, { encoding: 'utf-8' }).trim();

      // Extract issue number from URL
      const issueNumber = parseInt(issueUrl.split('/').pop() || '0', 10);

      if (!issueNumber) {
        throw new Error('Failed to extract issue number from URL: ' + issueUrl);
      }

      // Fetch issue details
      const viewCmd = `gh issue view ${issueNumber} --repo ${this.repo} --json number,title,body,state,url,labels,milestone`;
      const output = execSync(viewCmd, { encoding: 'utf-8' });
      const issue = JSON.parse(output);

      return {
        ...issue,
        html_url: issue.url,
        labels: issue.labels?.map((l: any) => l.name) || []
      };
    } catch (error: any) {
      throw new Error(`Failed to create task issue: ${error.message}`);
    }
  }

  /**
   * Update issue body
   */
  async updateIssueBody(issueNumber: number, newBody: string): Promise<void> {
    const cmd = `gh issue edit ${issueNumber} --repo ${this.repo} --body "${this.escapeQuotes(newBody)}"`;

    try {
      execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: any) {
      throw new Error(`Failed to update issue #${issueNumber}: ${error.message}`);
    }
  }

  /**
   * Get issue details
   */
  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    const cmd = `gh issue view ${issueNumber} --repo ${this.repo} --json number,title,body,state,html_url,labels,milestone`;

    try {
      const output = execSync(cmd, { encoding: 'utf-8' });
      const issue = JSON.parse(output);
      return {
        ...issue,
        labels: issue.labels?.map((l: any) => l.name) || []
      };
    } catch (error: any) {
      throw new Error(`Failed to get issue #${issueNumber}: ${error.message}`);
    }
  }

  /**
   * Close issue
   */
  async closeIssue(issueNumber: number, comment?: string): Promise<void> {
    if (comment) {
      await this.addComment(issueNumber, comment);
    }

    const cmd = `gh issue close ${issueNumber} --repo ${this.repo}`;

    try {
      execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: any) {
      throw new Error(`Failed to close issue #${issueNumber}: ${error.message}`);
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueNumber: number, comment: string): Promise<void> {
    const cmd = `gh issue comment ${issueNumber} --repo ${this.repo} --body "${this.escapeQuotes(comment)}"`;

    try {
      execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: any) {
      throw new Error(`Failed to add comment to issue #${issueNumber}: ${error.message}`);
    }
  }

  /**
   * Add labels to issue
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    if (labels.length === 0) return;

    const labelArgs = labels.map(l => `"${l}"`).join(',');
    const cmd = `gh issue edit ${issueNumber} --repo ${this.repo} --add-label ${labelArgs}`;

    try {
      execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: any) {
      throw new Error(`Failed to add labels to issue #${issueNumber}: ${error.message}`);
    }
  }

  /**
   * Check rate limit status
   */
  async checkRateLimit(): Promise<{ remaining: number; limit: number; reset: Date }> {
    const cmd = `gh api rate_limit --jq '.rate | {remaining: .remaining, limit: .limit, reset: .reset}'`;

    try {
      const output = execSync(cmd, { encoding: 'utf-8' });
      const data = JSON.parse(output);
      return {
        ...data,
        reset: new Date(data.reset * 1000)
      };
    } catch (error: any) {
      throw new Error(`Failed to check rate limit: ${error.message}`);
    }
  }

  /**
   * Escape quotes in strings for shell commands
   */
  private escapeQuotes(str: string): string {
    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape double quotes
      .replace(/`/g, '\\`')    // Escape backticks
      .replace(/\$/g, '\\$');  // Escape dollar signs
  }

  /**
   * Batch create issues with rate limit handling
   */
  async batchCreateIssues(
    issues: Array<{ title: string; body: string; labels?: string[] }>,
    milestone?: number | string,
    epicNumber?: number,
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<GitHubIssue[]> {
    const { batchSize = 10, delayMs = 6000 } = options; // 10 issues per minute by default
    const createdIssues: GitHubIssue[] = [];

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);

      console.log(`Creating issues ${i + 1}-${Math.min(i + batchSize, issues.length)} of ${issues.length}...`);

      for (const issue of batch) {
        try {
          const created = epicNumber
            ? await this.createTaskIssue(issue.title, issue.body, epicNumber, milestone, issue.labels)
            : await this.createEpicIssue(issue.title, issue.body, milestone, issue.labels);

          createdIssues.push(created);
        } catch (error: any) {
          console.error(`Failed to create issue "${issue.title}":`, error.message);
        }
      }

      // Delay between batches (except after last batch)
      if (i + batchSize < issues.length) {
        console.log(`Waiting ${delayMs / 1000}s to avoid rate limits...`);
        await this.sleep(delayMs);
      }
    }

    return createdIssues;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
