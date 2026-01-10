/**
 * GitHub Service for Feature Deletion
 * Increment: 0053-safe-feature-deletion
 * Tasks: T-024, T-025, T-026, T-027, T-028, T-029
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { GitHubServiceOptions, GitHubIssue } from './types.js';
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';

/**
 * Feature Deletion GitHub Service
 * Handles GitHub issue cleanup via gh CLI
 */
export class FeatureDeletionGitHubService {
  private owner: string;
  private repo: string;
  private logger: Logger;

  constructor(options: GitHubServiceOptions) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.logger = options.logger || consoleLogger;
  }

  /**
   * T-024: Find all GitHub issues matching feature pattern
   */
  async findFeatureIssues(featureId: string): Promise<GitHubIssue[]> {
    try {
      // Search for issues with [FS-XXX] in title
      const query = `repo:${this.owner}/${this.repo} is:issue "[${featureId}]" in:title`;

      const result = await execFileNoThrow('gh', [
        'issue',
        'list',
        '--search', query,
        '--json', 'number,title,url',
        '--limit', '50'
      ]);

      const issues = JSON.parse(result.stdout);

      // Filter to exact pattern: [FS-XXX][US-YYY] (3+ digits)
      const pattern = new RegExp(`\\[${featureId}\\]\\[US-\\d{3,}\\]`);
      const filteredIssues = issues.filter((issue: any) => pattern.test(issue.title));

      this.logger.log(`Found ${filteredIssues.length} GitHub issues for ${featureId}`);
      return filteredIssues.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        url: issue.url
      }));
    } catch (error) {
      this.logger.warn(`GitHub issue search failed: ${error}`);
      return [];
    }
  }

  /**
   * T-025, T-028, T-029: Close GitHub issues with retry logic
   */
  async deleteIssues(issues: GitHubIssue[]): Promise<{ closed: number; failed: number }> {
    const results = await Promise.all(issues.map(issue => this.closeIssueWithRetry(issue)));
    const closed = results.filter(Boolean).length;
    const failed = results.length - closed;

    this.logger.log(`GitHub cleanup: ${closed} closed, ${failed} failed`);
    return { closed, failed };
  }

  /**
   * T-029: Close single issue with exponential backoff retry
   */
  private async closeIssueWithRetry(issue: GitHubIssue, attempt = 1): Promise<boolean> {
    try {
      await execFileNoThrow('gh', [
        'issue',
        'close',
        issue.number.toString(),
        '--comment',
        'Closed by feature deletion automation'
      ]);

      this.logger.log(`Closed issue #${issue.number}: ${issue.title}`);
      return true;
    } catch (error: any) {
      const errorMsg = error.toString();

      // T-028: Handle rate limit with retry
      if (errorMsg.includes('rate limit') && attempt <= 3) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        this.logger.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/3)`);
        await this.sleep(delay);
        return this.closeIssueWithRetry(issue, attempt + 1);
      }

      // T-028: Handle other errors (non-blocking)
      this.logger.warn(`Failed to close issue #${issue.number}: ${error}`);
      return false;
    }
  }

  /**
   * Sleep helper for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
