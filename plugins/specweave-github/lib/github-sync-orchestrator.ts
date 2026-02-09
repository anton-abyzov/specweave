/**
 * GitHub Sync Orchestrator — Wires push sync, Projects V2, and frontmatter updates
 *
 * Composes all sync sub-components into a single flow:
 * 1. Push user stories → GitHub issues
 * 2. (Optional) Add issues to Projects V2 board
 * 3. (Optional) Set Status/Priority fields on V2 items
 * 4. Update spec frontmatter with sync results
 *
 * @module github-sync-orchestrator
 */

import { pushSyncUserStories } from './github-push-sync.js';
import { GitHubBoardResolverV2 } from './github-board-resolver-v2.js';
import { GitHubFieldSync } from './github-field-sync.js';
import { updateSpecFrontmatter } from './github-spec-frontmatter-updater.js';
import { GitHubGraphQLClient } from './github-graphql-client.js';
import type { UserStoryForSync, PushSyncResult } from './github-push-sync.js';
import type { FieldSyncResult } from './github-field-sync.js';
import type { GitHubSyncMetadata } from '../../../src/core/types/sync-profile.js';

export interface SyncOrchestratorConfig {
  owner: string;
  repo: string;
  token?: string;
  dryRun?: boolean;
  projectV2Enabled?: boolean;
  projectV2Number?: number;
  projectV2Id?: string;
  statusFieldMapping?: Record<string, string>;
  priorityFieldMapping?: Record<string, string>;
}

export interface ProjectV2Result {
  projectId: string;
  projectNumber: number;
  itemIds: string[];
  fieldSyncResult: FieldSyncResult;
}

export interface SyncOrchestratorResult {
  pushResult: PushSyncResult;
  projectV2Result?: ProjectV2Result;
  frontmatterResult: GitHubSyncMetadata;
}

export class GitHubSyncOrchestrator {
  private config: SyncOrchestratorConfig;

  constructor(config: SyncOrchestratorConfig) {
    this.config = config;
  }

  /**
   * Run the full sync flow for a spec.
   */
  async syncSpec(
    specPath: string,
    userStories: UserStoryForSync[],
  ): Promise<SyncOrchestratorResult> {
    // Step 1: Push sync — create/update GitHub issues
    const pushResult = await pushSyncUserStories(userStories, {
      owner: this.config.owner,
      repo: this.config.repo,
      token: this.config.token,
      dryRun: this.config.dryRun,
    });

    // Step 2: Projects V2 (optional, skip in dry run)
    let projectV2Result: ProjectV2Result | undefined;

    if (this.config.projectV2Enabled && !this.config.dryRun) {
      projectV2Result = await this.syncProjectV2(pushResult, userStories);
    }

    // Step 3: Update spec frontmatter
    const frontmatterOptions: { projectV2Id?: string; projectV2Number?: number } = {};
    if (projectV2Result) {
      frontmatterOptions.projectV2Id = projectV2Result.projectId;
      frontmatterOptions.projectV2Number = projectV2Result.projectNumber;
    }

    const frontmatterResult = await updateSpecFrontmatter(
      specPath,
      pushResult,
      frontmatterOptions,
    );

    return {
      pushResult,
      projectV2Result,
      frontmatterResult,
    };
  }

  private async syncProjectV2(
    pushResult: PushSyncResult,
    userStories: UserStoryForSync[],
  ): Promise<ProjectV2Result> {
    const graphqlClient = new GitHubGraphQLClient(this.config.token);

    // Find or create the Projects V2 board
    const boardResolver = new GitHubBoardResolverV2(graphqlClient, {
      owner: this.config.owner,
      projectV2Number: this.config.projectV2Number,
      projectV2Id: this.config.projectV2Id,
    });

    const project = await boardResolver.findOrCreateProject('SpecWeave Sync Board');

    // Collect issue node IDs from created issues
    const nodeIds = pushResult.created
      .filter(item => item.issueNodeId)
      .map(item => item.issueNodeId);

    // Add issues to project
    const itemIds = await boardResolver.addIssuesToProject(project.id, nodeIds);

    // Build a map from nodeId → user story for field sync
    const nodeIdToStory = new Map<string, UserStoryForSync>();
    for (const created of pushResult.created) {
      if (created.issueNodeId) {
        const story = userStories.find(s => s.id === created.userStoryId);
        if (story) {
          nodeIdToStory.set(created.issueNodeId, story);
        }
      }
    }

    // Sync Status and Priority fields
    const fieldSync = new GitHubFieldSync(graphqlClient, {
      projectId: project.id,
      statusFieldMapping: this.config.statusFieldMapping,
      priorityFieldMapping: this.config.priorityFieldMapping,
    });

    const fieldSyncItems = itemIds.map((itemId, idx) => {
      const nodeId = nodeIds[idx];
      const story = nodeId ? nodeIdToStory.get(nodeId) : undefined;
      return {
        itemId,
        status: story?.status,
        priority: story?.priority,
      };
    });

    const fieldSyncResult = await fieldSync.syncItemFields(fieldSyncItems);

    return {
      projectId: project.id,
      projectNumber: project.number,
      itemIds,
      fieldSyncResult,
    };
  }
}
