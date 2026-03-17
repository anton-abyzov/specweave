class GitHubBoardResolverV2 {
  constructor(client, config) {
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
  async findOrCreateProject(title) {
    if (this.config.projectV2Id) {
      return {
        id: this.config.projectV2Id,
        number: this.config.projectV2Number || 0
      };
    }
    if (this.config.projectV2Number) {
      const ownerId2 = await this.client.getOwnerNodeId(this.config.owner);
      return {
        id: ownerId2,
        // Will be resolved to actual project ID during operations
        number: this.config.projectV2Number
      };
    }
    const ownerId = await this.client.getOwnerNodeId(this.config.owner);
    return this.client.createProjectV2(ownerId, title);
  }
  /**
   * Add issues (by node ID) to a Projects V2 board.
   * Returns the project item IDs for each added issue.
   */
  async addIssuesToProject(projectId, issueNodeIds) {
    const itemIds = [];
    for (const nodeId of issueNodeIds) {
      const itemId = await this.client.addProjectV2Item(projectId, nodeId);
      itemIds.push(itemId);
    }
    return itemIds;
  }
}
export {
  GitHubBoardResolverV2
};
