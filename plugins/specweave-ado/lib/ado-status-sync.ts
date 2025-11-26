/**
 * Azure DevOps Status Sync
 *
 * Synchronizes SpecWeave increment statuses with ADO work item states.
 *
 * ADO Work Item State Updates:
 * - Uses JSON Patch format for updates
 * - System.State field controls work item state
 * - Available states: New, Active, On Hold, Resolved, Closed, Removed
 *
 * @module ado-status-sync
 */

import axios, { AxiosInstance } from 'axios';

/**
 * External status representation (ADO-specific)
 */
export interface ExternalStatus {
  state: string; // e.g., "New", "Active", "Closed"
  tags?: string[]; // Status tags from config (e.g., ["Planning"], ["In Progress"])
}

/**
 * Azure DevOps Status Sync
 *
 * Handles status synchronization with ADO work items.
 */
export class AdoStatusSync {
  private client: AxiosInstance;
  private organization: string;
  private project: string;

  constructor(
    organization: string,
    project: string,
    personalAccessToken: string
  ) {
    this.organization = organization;
    this.project = project;

    // Create ADO API client
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${organization}/${project}/_apis`,
      auth: {
        username: '', // Empty for PAT auth
        password: personalAccessToken
      },
      headers: {
        'Content-Type': 'application/json-patch+json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Get current status from ADO work item
   *
   * @param workItemId - ADO work item ID (e.g., 123)
   * @returns Current work item state
   */
  async getStatus(workItemId: number): Promise<ExternalStatus> {
    const response = await this.client.get(
      `/wit/workitems/${workItemId}?api-version=7.0`
    );

    return {
      state: response.data.fields['System.State']
    };
  }

  /**
   * Update ADO work item state and tags
   *
   * Uses JSON Patch format to update System.State and System.Tags fields.
   * Tags are appended to existing tags, not replaced.
   *
   * @param workItemId - ADO work item ID (e.g., 123)
   * @param status - Desired status with state and optional tags
   */
  async updateStatus(workItemId: number, status: ExternalStatus): Promise<void> {
    // ADO uses JSON Patch format for updates
    const patch: Array<{ op: string; path: string; value: string }> = [
      {
        op: 'add',
        path: '/fields/System.State',
        value: status.state
      }
    ];

    // Add status tags if provided
    if (status.tags && status.tags.length > 0) {
      // Fetch current tags to preserve them
      const currentTags = await this.getCurrentTags(workItemId);

      // Remove old status tags (tags that match known status patterns)
      const statusTagPatterns = ['Planning', 'In Progress', 'Paused', 'Completed', 'Abandoned', 'On Hold'];
      const preservedTags = currentTags.filter(
        tag => !statusTagPatterns.some(pattern => tag.toLowerCase() === pattern.toLowerCase())
      );

      // Combine preserved tags with new status tags
      const allTags = [...new Set([...preservedTags, ...status.tags])];

      patch.push({
        op: 'add',
        path: '/fields/System.Tags',
        value: allTags.join('; ')
      });
    }

    await this.client.patch(
      `/wit/workitems/${workItemId}?api-version=7.0`,
      patch
    );
  }

  /**
   * Get current tags from ADO work item
   *
   * @param workItemId - ADO work item ID
   * @returns Array of current tags
   */
  private async getCurrentTags(workItemId: number): Promise<string[]> {
    try {
      const response = await this.client.get(
        `/wit/workitems/${workItemId}?api-version=7.0&$select=System.Tags`
      );

      const tagsString = response.data.fields?.['System.Tags'] || '';
      if (!tagsString) return [];

      return tagsString.split(';').map((tag: string) => tag.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Post comment about status change to ADO work item
   *
   * @param workItemId - ADO work item ID (e.g., 123)
   * @param oldStatus - Previous SpecWeave status
   * @param newStatus - New SpecWeave status
   */
  async postStatusComment(
    workItemId: number,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const text = `🔄 Status Update\n\n` +
      `SpecWeave status changed:\n` +
      `• From: ${oldStatus}\n` +
      `• To: ${newStatus}\n` +
      `• When: ${new Date().toISOString()}\n\n` +
      `Synced from SpecWeave`;

    await this.client.post(
      `/wit/workitems/${workItemId}/comments?api-version=7.0-preview.3`,
      {
        text
      }
    );
  }
}
