/**
 * JIRA Status Sync
 *
 * Synchronizes SpecWeave increment statuses with JIRA issue statuses.
 *
 * JIRA Status Transitions:
 * - Uses JIRA transitions API to change issue status
 * - Available transitions depend on workflow configuration
 * - Must fetch available transitions before applying
 *
 * @module jira-status-sync
 */

import axios, { AxiosInstance } from 'axios';

/**
 * External status representation (JIRA-specific)
 */
export interface ExternalStatus {
  state: string; // e.g., "To Do", "In Progress", "Done"
  labels?: string[]; // Optional labels (JIRA supports labels)
}

/**
 * JIRA transition representation
 */
interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
  };
}

/**
 * JIRA Status Sync
 *
 * Handles status synchronization with JIRA issues.
 */
export class JiraStatusSync {
  private client: AxiosInstance;
  private domain: string;
  private projectKey: string;

  constructor(
    domain: string,
    email: string,
    apiToken: string,
    projectKey: string
  ) {
    this.domain = domain;
    this.projectKey = projectKey;

    // Create JIRA API client
    this.client = axios.create({
      baseURL: `https://${domain}/rest/api/3`,
      auth: {
        username: email,
        password: apiToken
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get current status from JIRA issue
   *
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   * @returns Current issue status
   */
  async getStatus(issueKey: string): Promise<ExternalStatus> {
    const response = await this.client.get(`/issue/${issueKey}`);

    return {
      state: response.data.fields.status.name
    };
  }

  /**
   * Update JIRA issue status via transitions
   *
   * JIRA requires using transitions to change status.
   * Cannot directly set status field.
   *
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   * @param status - Desired status
   */
  async updateStatus(issueKey: string, status: ExternalStatus): Promise<void> {
    // 1. Get available transitions for this issue
    const transitionsResponse = await this.client.get(`/issue/${issueKey}/transitions`);
    const transitions: JiraTransition[] = transitionsResponse.data.transitions;

    // 2. Find transition that leads to desired status
    const targetTransition = transitions.find(
      (t) => t.to.name === status.state
    );

    if (!targetTransition) {
      throw new Error(
        `Transition to ${status.state} not available for ${issueKey}. ` +
        `Available transitions: ${transitions.map(t => t.to.name).join(', ')}`
      );
    }

    // 3. Execute transition
    await this.client.post(`/issue/${issueKey}/transitions`, {
      transition: {
        id: targetTransition.id
      }
    });
  }

  /**
   * Post comment about status change to JIRA issue
   *
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   * @param oldStatus - Previous SpecWeave status
   * @param newStatus - New SpecWeave status
   */
  async postStatusComment(
    issueKey: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const body = `🔄 *Status Update*\n\n` +
      `SpecWeave status changed:\n` +
      `• *From*: ${oldStatus}\n` +
      `• *To*: ${newStatus}\n` +
      `• *When*: ${new Date().toISOString()}\n\n` +
      `_Synced from SpecWeave_`;

    await this.client.post(`/issue/${issueKey}/comment`, {
      body
    });
  }
}
