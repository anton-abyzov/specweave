import { pushSyncUserStories } from "./github-push-sync.js";
import { GitHubBoardResolverV2 } from "./github-board-resolver-v2.js";
import { GitHubFieldSync } from "./github-field-sync.js";
import { updateSpecFrontmatter } from "./github-spec-frontmatter-updater.js";
import { GitHubGraphQLClient } from "./github-graphql-client.js";
class GitHubSyncOrchestrator {
  constructor(config) {
    this.config = config;
  }
  /**
   * Run the full sync flow for a spec.
   */
  async syncSpec(specPath, userStories) {
    const pushResult = await pushSyncUserStories(userStories, {
      owner: this.config.owner,
      repo: this.config.repo,
      token: this.config.token,
      dryRun: this.config.dryRun
    });
    let projectV2Result;
    if (this.config.projectV2Enabled && !this.config.dryRun) {
      projectV2Result = await this.syncProjectV2(pushResult, userStories);
    }
    const frontmatterOptions = {};
    if (projectV2Result) {
      frontmatterOptions.projectV2Id = projectV2Result.projectId;
      frontmatterOptions.projectV2Number = projectV2Result.projectNumber;
    }
    const frontmatterResult = await updateSpecFrontmatter(
      specPath,
      pushResult,
      frontmatterOptions
    );
    return {
      pushResult,
      projectV2Result,
      frontmatterResult
    };
  }
  async syncProjectV2(pushResult, userStories) {
    const graphqlClient = new GitHubGraphQLClient(this.config.token);
    const boardResolver = new GitHubBoardResolverV2(graphqlClient, {
      owner: this.config.owner,
      projectV2Number: this.config.projectV2Number,
      projectV2Id: this.config.projectV2Id
    });
    const boardName = this.config.boardName || "SpecWeave Sync Board";
    const project = await boardResolver.findOrCreateProject(boardName);
    const nodeIds = pushResult.created.filter((item) => item.issueNodeId).map((item) => item.issueNodeId);
    const itemIds = await boardResolver.addIssuesToProject(project.id, nodeIds);
    const nodeIdToStory = /* @__PURE__ */ new Map();
    for (const created of pushResult.created) {
      if (created.issueNodeId) {
        const story = userStories.find((s) => s.id === created.userStoryId);
        if (story) {
          nodeIdToStory.set(created.issueNodeId, story);
        }
      }
    }
    const fieldSync = new GitHubFieldSync(graphqlClient, {
      projectId: project.id,
      statusFieldMapping: this.config.statusFieldMapping,
      priorityFieldMapping: this.config.priorityFieldMapping
    });
    const fieldSyncItems = itemIds.map((itemId, idx) => {
      const nodeId = nodeIds[idx];
      const story = nodeId ? nodeIdToStory.get(nodeId) : void 0;
      return {
        itemId,
        status: story?.status,
        priority: story?.priority
      };
    });
    const fieldSyncResult = await fieldSync.syncItemFields(fieldSyncItems);
    return {
      projectId: project.id,
      projectNumber: project.number,
      itemIds,
      fieldSyncResult
    };
  }
}
export {
  GitHubSyncOrchestrator
};
