/**
 * GitHub Status Sync
 *
 * Synchronizes SpecWeave increment statuses with GitHub issues.
 *
 * Responsibilities:
 * - Get current status from GitHub issue
 * - Update GitHub issue state and labels
 * - Post status change comments
 */

import { Octokit } from '@octokit/rest';

export interface ExternalStatus {
  state: string;
  labels?: string[];
}

export class GitHubStatusSync {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Get current status from GitHub issue
   *
   * @param issueNumber - GitHub issue number
   * @returns External status with state and labels
   */
  public async getStatus(issueNumber: number): Promise<ExternalStatus> {
    const response = await this.octokit.rest.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber
    });

    const labels = response.data.labels
      .map((label: any) => (typeof label === 'string' ? label : label.name))
      .filter(Boolean);

    return {
      state: response.data.state,
      labels
    };
  }

  /**
   * Update GitHub issue status
   *
   * Preserves existing labels that are not status-related.
   * Only replaces labels that start with "status:" prefix.
   *
   * @param issueNumber - GitHub issue number
   * @param status - New status (state and labels)
   */
  public async updateStatus(
    issueNumber: number,
    status: ExternalStatus
  ): Promise<void> {
    const updateData: {
      owner: string;
      repo: string;
      issue_number: number;
      state: 'open' | 'closed';
      labels?: string[];
    } = {
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      state: status.state as 'open' | 'closed'
    };

    // Merge labels - preserve non-status labels, replace status labels
    if (status.labels && status.labels.length > 0) {
      // Fetch current labels to preserve non-status ones
      const currentLabels = await this.getCurrentLabels(issueNumber);

      // Filter out status-related labels (start with "status:")
      const preservedLabels = currentLabels.filter(
        label => !label.startsWith('status:')
      );

      // Get new status labels from the provided status
      const newStatusLabels = status.labels.filter(
        label => label.startsWith('status:')
      );

      // Get non-status labels from the provided status (e.g., priority, type)
      const newOtherLabels = status.labels.filter(
        label => !label.startsWith('status:')
      );

      // Combine: preserved non-status + new status + new other labels
      const mergedLabels = [...new Set([
        ...preservedLabels,
        ...newStatusLabels,
        ...newOtherLabels
      ])];

      updateData.labels = mergedLabels;
    }

    await this.octokit.rest.issues.update(updateData);
  }

  /**
   * Get current labels from GitHub issue
   *
   * @param issueNumber - GitHub issue number
   * @returns Array of current label names
   */
  private async getCurrentLabels(issueNumber: number): Promise<string[]> {
    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      return response.data.labels
        .map((label: any) => (typeof label === 'string' ? label : label.name))
        .filter(Boolean) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Post status change comment to GitHub issue
   *
   * @param issueNumber - GitHub issue number
   * @param oldStatus - Previous SpecWeave status
   * @param newStatus - New SpecWeave status
   */
  public async postStatusComment(
    issueNumber: number,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const body = `🔄 **Status Update**

SpecWeave increment status changed:
- **From**: ${oldStatus}
- **To**: ${newStatus}
- **When**: ${timestamp}

This update was automatically synchronized by SpecWeave.`;

    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body
    });
  }
}
