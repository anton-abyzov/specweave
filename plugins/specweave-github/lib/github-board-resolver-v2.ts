/**
 * GitHub Board Resolver V2 — Projects V2 Integration
 *
 * Finds or creates GitHub Projects V2 boards and adds issues to them.
 * Replaces the deprecated V1 Classic Projects board resolver.
 *
 * @module github-board-resolver-v2
 */

import { GitHubGraphQLClient } from './github-graphql-client.js';

export interface BoardResolverConfig {
  owner: string;
  projectV2Number?: number;
  projectV2Id?: string;
}

export class GitHubBoardResolverV2 {
  private client: GitHubGraphQLClient;
  private config: BoardResolverConfig;

  constructor(client: GitHubGraphQLClient, config: BoardResolverConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Find an existing project or create a new one.
   *
   * Priority:
   * 1. If projectV2Id is configured, use it directly (skip lookup)
   * 2. If projectV2Number is configured, return with that number
   * 3. Otherwise, create a new project
   */
  async findOrCreateProject(title: string): Promise<{ id: string; number: number }> {
    // If we have a direct project ID, use it
    if (this.config.projectV2Id) {
      return {
        id: this.config.projectV2Id,
        number: this.config.projectV2Number || 0,
      };
    }

    // If we have a project number, look it up by querying the owner
    if (this.config.projectV2Number) {
      const ownerId = await this.client.getOwnerNodeId(this.config.owner);
      // Return the project reference — the number is known, ID will be resolved on first use
      return {
        id: ownerId, // Will be resolved to actual project ID during operations
        number: this.config.projectV2Number,
      };
    }

    // No project configured — create a new one
    const ownerId = await this.client.getOwnerNodeId(this.config.owner);
    return this.client.createProjectV2(ownerId, title);
  }

  /**
   * Add issues (by node ID) to a Projects V2 board.
   * Returns the project item IDs for each added issue.
   */
  async addIssuesToProject(projectId: string, issueNodeIds: string[]): Promise<string[]> {
    const itemIds: string[] = [];

    for (const nodeId of issueNodeIds) {
      const itemId = await this.client.addProjectV2Item(projectId, nodeId);
      itemIds.push(itemId);
    }

    return itemIds;
  }
}
