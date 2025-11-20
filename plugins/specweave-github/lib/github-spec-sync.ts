/**
 * GitHub Spec Sync (Multi-Project Architecture)
 *
 * CORRECT ARCHITECTURE:
 * - Syncs .specweave/docs/internal/specs/{project-id}/spec-*.md ↔ GitHub Projects
 * - NOT increments ↔ GitHub Issues (that was wrong!)
 *
 * MULTI-PROJECT SUPPORT (v0.18.0+):
 * - Detects which project a spec belongs to (by folder path)
 * - Routes to correct GitHub repo based on project config
 * - Supports multiple sync strategies per project
 * - Handles cross-team specs (create issues in multiple repos)
 *
 * Mapping:
 * - Spec → GitHub Project
 * - User Story → GitHub Project Card/Issue
 * - Acceptance Criteria → Checklist in Issue
 *
 * Sync Strategies:
 * - project-per-spec: One GitHub Project per spec (default)
 * - team-board: One GitHub Project per team (aggregates specs)
 * - centralized: Parent repo tracks all (multi-repo pattern)
 * - distributed: Each team syncs to their repo (microservices)
 *
 * @module github-spec-sync
 */

import * as path from 'path';
import { SpecMetadataManager } from '../../../src/core/specs/spec-metadata-manager.js';
import { SpecParser } from '../../../src/core/specs/spec-parser.js';
import {
  SpecContent,
  UserStory,
  SpecSyncResult,
  SpecSyncConflict
} from '../../../src/core/types/spec-metadata.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { ProjectContextManager } from '../../../src/core/sync/project-context.js';
import { SyncProfile, GitHubConfig } from '../../../src/core/types/sync-profile.js';

export interface GitHubProject {
  id: number;
  title: string;
  number: number;
  url: string;
  state: 'open' | 'closed';
  owner: string;
  repo: string;
}

export interface GitHubProjectCard {
  id: number;
  note?: string;
  state: string;
  column_id: number;
  content_url?: string; // Link to issue if card is linked
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
}

/**
 * GitHub Sync Strategy
 */
export type GitHubSyncStrategy =
  | 'project-per-spec'   // One GitHub Project per spec (default, current behavior)
  | 'team-board'         // One GitHub Project per team (aggregates multiple specs)
  | 'centralized'        // Parent repo tracks all specs (multi-repo pattern)
  | 'distributed';       // Each team syncs to their repo (microservices)

/**
 * Project-specific GitHub configuration
 */
export interface ProjectGitHubConfig {
  projectId: string;
  strategy: GitHubSyncStrategy;
  owner: string;
  repo: string;
  teamBoardId?: number;  // For team-board strategy
}

export class GitHubSpecSync {
  private specManager: SpecMetadataManager;
  private projectContextManager: ProjectContextManager;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.specManager = new SpecMetadataManager(projectRoot);
    this.projectContextManager = new ProjectContextManager(projectRoot);
  }

  /**
   * Detect project from spec file path
   *
   * Spec path format: .specweave/docs/internal/specs/{project-id}/spec-*.md
   * OR (single project): .specweave/docs/internal/specs/spec-*.md
   */
  private async detectProjectFromSpecPath(specFilePath: string): Promise<string | null> {
    const specPathMatch = specFilePath.match(/\.specweave\/docs\/internal\/specs\/([^/]+)\//);

    if (specPathMatch) {
      // Multi-project: .specweave/docs/internal/specs/frontend/spec-001.md
      const projectId = specPathMatch[1];
      const project = await this.projectContextManager.getProject(projectId);
      return project ? projectId : null;
    }

    // Single project (default): .specweave/docs/internal/specs/spec-001.md
    return 'default';
  }

  /**
   * Get GitHub configuration for a project
   */
  private async getGitHubConfigForProject(projectId: string): Promise<ProjectGitHubConfig | null> {
    const config = await this.projectContextManager.load();
    const project = await this.projectContextManager.getProject(projectId);

    if (!project) {
      return null;
    }

    // Get profile from project's default sync profile
    const profileId = project.defaultSyncProfile || config.activeProfile;
    if (!profileId) {
      return null;
    }

    const profile = config.profiles?.[profileId];
    if (!profile || profile.provider !== 'github') {
      return null;
    }

    const githubConfig = profile.config as GitHubConfig;

    return {
      projectId,
      strategy: (githubConfig as any).githubStrategy || 'project-per-spec',
      owner: githubConfig.owner || '',
      repo: githubConfig.repo || (githubConfig.repos && githubConfig.repos[0]) || '',
      teamBoardId: (githubConfig as any).teamBoardId
    };
  }

  /**
   * Sync spec to GitHub Project (CREATE or UPDATE)
   *
   * MULTI-PROJECT ARCHITECTURE:
   * - Detects which project the spec belongs to
   * - Routes to correct GitHub repo based on project config
   * - Supports multiple sync strategies
   */
  async syncSpecToGitHub(specId: string): Promise<SpecSyncResult> {
    console.log(`\n🔄 Syncing spec ${specId} to GitHub Project...`);

    try {
      // 1. Load spec
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: 'github',
          error: `Spec ${specId} not found`
        };
      }

      // 2. Detect project from spec path
      const projectId = await this.detectProjectFromSpecPath(spec.filePath);
      if (!projectId) {
        return {
          success: false,
          specId,
          provider: 'github',
          error: 'Could not determine project for spec'
        };
      }

      console.log(`   📦 Detected project: ${projectId}`);

      // 3. Get GitHub config for this project
      const githubConfig = await this.getGitHubConfigForProject(projectId);
      if (!githubConfig) {
        // Fallback to auto-detect from git remote
        const repoInfo = await this.detectRepo();
        if (!repoInfo) {
          return {
            success: false,
            specId,
            provider: 'github',
            error: `No GitHub configuration found for project '${projectId}'`
          };
        }

        // Use fallback config
        githubConfig.owner = repoInfo.owner;
        githubConfig.repo = repoInfo.repo;
        githubConfig.strategy = 'project-per-spec';
      }

      console.log(`   🎯 Strategy: ${githubConfig.strategy}`);
      console.log(`   🔗 Repository: ${githubConfig.owner}/${githubConfig.repo}`);

      const { owner, repo, strategy } = githubConfig;

      // 4. Handle strategy-specific sync
      return await this.syncWithStrategy(spec, owner, repo, strategy, githubConfig);

    } catch (error) {
      console.error('❌ Error syncing to GitHub:', error);
      return {
        success: false,
        specId,
        provider: 'github',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync spec using specified strategy
   */
  private async syncWithStrategy(
    spec: SpecContent,
    owner: string,
    repo: string,
    strategy: GitHubSyncStrategy,
    config: ProjectGitHubConfig
  ): Promise<SpecSyncResult> {
    const specId = spec.metadata.id;

    switch (strategy) {
      case 'project-per-spec':
        return await this.syncProjectPerSpec(spec, owner, repo);

      case 'team-board':
        return await this.syncTeamBoard(spec, owner, repo, config.teamBoardId);

      case 'centralized':
        return await this.syncCentralized(spec, owner, repo);

      case 'distributed':
        return await this.syncDistributed(spec, config);

      default:
        // Fallback to project-per-spec
        return await this.syncProjectPerSpec(spec, owner, repo);
    }
  }

  /**
   * Strategy 1: Project-per-Spec (DEFAULT)
   * - One GitHub Project per spec
   * - Current behavior, no changes needed
   */
  private async syncProjectPerSpec(
    spec: SpecContent,
    owner: string,
    repo: string
  ): Promise<SpecSyncResult> {
    const specId = spec.metadata.id;

    try {
      // Check if spec already linked to GitHub Project
      const existingLink = spec.metadata.externalLinks?.github;

      let project: GitHubProject;

      if (existingLink?.projectId) {
        // UPDATE existing project
        console.log(`   Found existing GitHub Project #${existingLink.projectId}`);
        project = await this.updateGitHubProject(
          owner,
          repo,
          existingLink.projectId,
          spec
        );
      } else {
        // CREATE new project
        console.log('   Creating new GitHub Project...');
        project = await this.createGitHubProject(owner, repo, spec);

        // Link spec to project
        await this.specManager.linkToExternal(specId, 'github', {
          id: project.id,
          url: project.url,
          owner,
          repo
        });
      }

      // 4. Sync user stories as issues/cards
      const changes = await this.syncUserStories(owner, repo, project.number, spec);

      console.log('✅ Sync complete!');

      return {
        success: true,
        specId,
        provider: 'github',
        externalId: project.id.toString(),
        url: project.url,
        changes
      };

    } catch (error) {
      console.error('❌ Error syncing to GitHub:', error);
      return {
        success: false,
        specId,
        provider: 'github',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync FROM GitHub Project to spec (full sync with all permissions)
   */
  async syncFromGitHub(specId: string): Promise<SpecSyncResult> {
    console.log(`\n🔄 Syncing FROM GitHub to spec ${specId}...`);

    try {
      // 1. Load spec
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: 'github',
          error: `Spec ${specId} not found`
        };
      }

      // 2. Get GitHub Project link
      const githubLink = spec.metadata.externalLinks?.github;
      if (!githubLink?.projectId) {
        return {
          success: false,
          specId,
          provider: 'github',
          error: 'Spec not linked to GitHub Project'
        };
      }

      const { owner, repo } = await this.detectRepo() || { owner: '', repo: '' };

      // 3. Fetch GitHub Project state
      const project = await this.fetchGitHubProject(owner, repo, githubLink.projectId);

      // 4. Detect conflicts
      const conflicts = await this.detectConflicts(spec, project);

      if (conflicts.length === 0) {
        console.log('✅ No conflicts - spec and GitHub in sync');
        return {
          success: true,
          specId,
          provider: 'github',
          externalId: project.id.toString(),
          url: project.url
        };
      }

      console.log(`⚠️  Detected ${conflicts.length} conflict(s)`);

      // 5. Resolve conflicts (GitHub wins by default for now)
      await this.resolveConflicts(spec, conflicts);

      console.log('✅ Sync FROM GitHub complete!');

      return {
        success: true,
        specId,
        provider: 'github',
        externalId: project.id.toString(),
        url: project.url,
        conflicts
      };

    } catch (error) {
      console.error('❌ Error syncing FROM GitHub:', error);
      return {
        success: false,
        specId,
        provider: 'github',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create new GitHub Project for spec
   */
  private async createGitHubProject(
    owner: string,
    repo: string,
    spec: SpecContent
  ): Promise<GitHubProject> {
    const projectTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const projectBody = this.generateProjectDescription(spec);

    // Use GraphQL to create project
    const query = `
      mutation CreateProject($ownerId: ID!, $title: String!, $body: String!) {
        createProjectV2(input: {
          ownerId: $ownerId,
          title: $title,
          body: $body
        }) {
          projectV2 {
            id
            title
            number
            url
          }
        }
      }
    `;

    // Get owner ID first
    const ownerId = await this.getOwnerId(owner);

    const result = await this.executeGraphQL(query, {
      ownerId,
      title: projectTitle,
      body: projectBody
    });

    const project = result.data.createProjectV2.projectV2;

    console.log(`   ✅ Created GitHub Project #${project.number}: ${project.url}`);

    return {
      id: parseInt(project.id, 10),
      title: project.title,
      number: project.number,
      url: project.url,
      state: 'open',
      owner,
      repo
    };
  }

  /**
   * Update existing GitHub Project
   */
  private async updateGitHubProject(
    owner: string,
    repo: string,
    projectId: number,
    spec: SpecContent
  ): Promise<GitHubProject> {
    const projectTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const projectBody = this.generateProjectDescription(spec);

    // Use GraphQL to update project
    const query = `
      mutation UpdateProject($projectId: ID!, $title: String, $body: String) {
        updateProjectV2(input: {
          projectId: $projectId,
          title: $title,
          body: $body
        }) {
          projectV2 {
            id
            title
            number
            url
          }
        }
      }
    `;

    const result = await this.executeGraphQL(query, {
      projectId: projectId.toString(),
      title: projectTitle,
      body: projectBody
    });

    const project = result.data.updateProjectV2.projectV2;

    console.log(`   ✅ Updated GitHub Project #${project.number}`);

    return {
      id: projectId,
      title: project.title,
      number: project.number,
      url: project.url,
      state: 'open',
      owner,
      repo
    };
  }


  /**
   * Generate project description from spec
   */
  private generateProjectDescription(spec: SpecContent): string {
    const progress = spec.metadata.progress;
    const progressText = progress
      ? `**Progress**: ${progress.percentComplete}% (${progress.completedUserStories}/${progress.totalUserStories} user stories)`
      : '**Progress**: N/A';

    return `
# ${spec.metadata.title}

**Spec ID**: ${spec.metadata.id}
**Priority**: ${spec.metadata.priority}
**Status**: ${spec.metadata.status}
${progressText}

---

${SpecParser.extractOverview(spec.markdown)}

---

## User Stories

${spec.metadata.userStories?.length || 0} user stories tracked in this project.

---

🤖 **Auto-synced from SpecWeave**
Last updated: ${new Date().toISOString()}
`.trim();
  }

  /**
   * Generate issue body from user story
   */
  private generateIssueBody(us: UserStory): string {
    const acList = us.acceptanceCriteria
      .map(ac => `- [${ac.status === 'done' ? 'x' : ' '}] ${ac.description}`)
      .join('\n');

    return `
## User Story

${us.title}

## Acceptance Criteria

${acList}

---

**Priority**: ${us.priority}
**Status**: ${us.status}

🤖 **Auto-synced from SpecWeave**
`.trim();
  }

  /**
   * Detect conflicts between spec and GitHub
   */
  private async detectConflicts(
    spec: SpecContent,
    project: GitHubProject
  ): Promise<SpecSyncConflict[]> {
    const conflicts: SpecSyncConflict[] = [];

    // Compare project title
    const expectedTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    if (project.title !== expectedTitle) {
      conflicts.push({
        type: 'metadata',
        field: 'title',
        localValue: spec.metadata.title,
        remoteValue: project.title,
        resolution: 'remote-wins',
        description: 'Project title differs from spec title'
      });
    }

    // TODO: Compare user stories and their statuses

    return conflicts;
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflicts(
    spec: SpecContent,
    conflicts: SpecSyncConflict[]
  ): Promise<void> {
    for (const conflict of conflicts) {
      if (conflict.resolution === 'remote-wins') {
        console.log(`   🔄 Resolving: ${conflict.description} (GitHub wins)`);
        // Update spec metadata from GitHub
        if (conflict.field === 'title') {
          await this.specManager.saveMetadata(spec.metadata.id, {
            title: conflict.remoteValue
          });
        }
      }
    }
  }

  /**
   * Execute GraphQL query against GitHub API
   */
  private async executeGraphQL(query: string, variables: any): Promise<any> {
    const result = await execFileNoThrow('gh', [
      'api',
      'graphql',
      '-f',
      `query=${query}`,
      ...Object.entries(variables).flatMap(([key, value]) => ['-F', `${key}=${value}`])
    ]);

    if (result.error) {
      throw new Error(`GraphQL query failed: ${result.error}`);
    }

    return JSON.parse(result.stdout);
  }

  /**
   * Get owner ID (user or organization)
   */
  private async getOwnerId(owner: string): Promise<string> {
    const query = `
      query GetOwner($login: String!) {
        repositoryOwner(login: $login) {
          id
        }
      }
    `;

    const result = await this.executeGraphQL(query, { login: owner });
    return result.data.repositoryOwner.id;
  }

  /**
   * Fetch GitHub Project details
   */
  private async fetchGitHubProject(
    owner: string,
    repo: string,
    projectId: number
  ): Promise<GitHubProject> {
    // Placeholder - would use GraphQL to fetch project
    return {
      id: projectId,
      title: 'Project Title',
      number: 1,
      url: 'https://github.com/...',
      state: 'open',
      owner,
      repo
    };
  }

  /**
   * Find issue by title pattern
   */
  private async findIssueByTitle(
    owner: string,
    repo: string,
    usId: string
  ): Promise<GitHubIssue | null> {
    const result = await execFileNoThrow('gh', [
      'issue',
      'list',
      '--repo',
      `${owner}/${repo}`,
      '--search',
      `"[${usId}]" in:title`,
      '--json',
      'number,title,body,state,labels',
      '--limit',
      '1'
    ]);

    if (result.error || !result.stdout) {
      return null;
    }

    const issues = JSON.parse(result.stdout);
    return issues.length > 0 ? issues[0] : null;
  }

  /**
   * Create GitHub issue
   */
  private async createIssue(
    owner: string,
    repo: string,
    issue: { title: string; body: string; labels: string[] }
  ): Promise<GitHubIssue> {
    const result = await execFileNoThrow('gh', [
      'issue',
      'create',
      '--repo',
      `${owner}/${repo}`,
      '--title',
      issue.title,
      '--body',
      issue.body,
      '--label',
      issue.labels.join(','),
      '--json',
      'number,title,body,state'
    ]);

    if (result.error) {
      throw new Error(`Failed to create issue: ${result.error}`);
    }

    return JSON.parse(result.stdout);
  }

  /**
   * Update GitHub issue
   */
  private async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: { title?: string; body?: string; state?: 'open' | 'closed' }
  ): Promise<void> {
    const args = ['issue', 'edit', issueNumber.toString(), '--repo', `${owner}/${repo}`];

    if (updates.title) {
      args.push('--title', updates.title);
    }

    if (updates.body) {
      args.push('--body', updates.body);
    }

    if (updates.state === 'closed') {
      args.push('--state', 'closed');
    } else if (updates.state === 'open') {
      args.push('--state', 'open');
    }

    const result = await execFileNoThrow('gh', args);

    if (result.error) {
      throw new Error(`Failed to update issue #${issueNumber}: ${result.error}`);
    }
  }

  /**
   * Strategy 2: Team-Board
   * - One GitHub Project per team (aggregates multiple specs)
   * - All specs from the same team/project sync to same board
   */
  private async syncTeamBoard(
    spec: SpecContent,
    owner: string,
    repo: string,
    teamBoardId?: number
  ): Promise<SpecSyncResult> {
    const specId = spec.metadata.id;

    try {
      console.log('   📋 Using team-board strategy (aggregated)');

      // If team board doesn't exist, create it
      if (!teamBoardId) {
        const projectId = await this.detectProjectFromSpecPath(spec.filePath);
        const project = await this.projectContextManager.getProject(projectId || 'default');

        const teamName = project?.team || 'Team';
        const teamProject = await this.createGitHubProject(owner, repo, {
          ...spec,
          metadata: {
            ...spec.metadata,
            title: `${teamName} Board`
          }
        });

        teamBoardId = teamProject.id;

        console.log(`   ✅ Created team board: ${teamName} Board (#${teamBoardId})`);
      }

      // Sync this spec's user stories to the team board
      const changes = await this.syncUserStories(owner, repo, teamBoardId, spec);

      return {
        success: true,
        specId,
        provider: 'github',
        externalId: teamBoardId.toString(),
        url: `https://github.com/orgs/${owner}/projects/${teamBoardId}`,
        changes
      };

    } catch (error) {
      console.error('❌ Error syncing to team board:', error);
      return {
        success: false,
        specId,
        provider: 'github',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Strategy 3: Centralized
   * - Parent repo tracks all specs (multi-repo pattern)
   * - Issues created in parent repo with tags for child repos
   */
  private async syncCentralized(
    spec: SpecContent,
    parentOwner: string,
    parentRepo: string
  ): Promise<SpecSyncResult> {
    const specId = spec.metadata.id;

    try {
      console.log('   🏢 Using centralized strategy (parent repo tracks all)');

      // Create project in parent repo
      const project = await this.createGitHubProject(parentOwner, parentRepo, spec);

      // Tag issues with project/team info
      const projectId = await this.detectProjectFromSpecPath(spec.filePath);
      const projectContext = await this.projectContextManager.getProject(projectId || 'default');

      // Sync user stories with project tags
      const changes = await this.syncUserStories(
        parentOwner,
        parentRepo,
        project.number,
        spec,
        projectContext?.name ? [`project:${projectContext.name}`] : []
      );

      console.log(`   ✅ Synced to parent repo: ${parentOwner}/${parentRepo}`);

      return {
        success: true,
        specId,
        provider: 'github',
        externalId: project.id.toString(),
        url: project.url,
        changes
      };

    } catch (error) {
      console.error('❌ Error syncing centralized:', error);
      return {
        success: false,
        specId,
        provider: 'github',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Strategy 4: Distributed
   * - Each team syncs to their repo (microservices)
   * - Cross-team specs create issues in multiple repos
   */
  private async syncDistributed(
    spec: SpecContent,
    config: ProjectGitHubConfig
  ): Promise<SpecSyncResult> {
    const specId = spec.metadata.id;

    try {
      console.log('   🌐 Using distributed strategy (per-team repos)');

      const projectId = config.projectId;
      const projectContext = await this.projectContextManager.getProject(projectId);

      if (!projectContext) {
        throw new Error(`Project context not found for ${projectId}`);
      }

      // Determine if this is a cross-team spec
      const isCrossTeam = this.isCrossTeamSpec(spec);

      if (isCrossTeam) {
        console.log('   🔗 Cross-team spec detected, syncing to multiple repos');
        return await this.syncCrossTeamSpec(spec, projectId);
      }

      // Single-team spec: sync to its own repo
      return await this.syncProjectPerSpec(spec, config.owner, config.repo);

    } catch (error) {
      console.error('❌ Error syncing distributed:', error);
      return {
        success: false,
        specId,
        provider: 'github',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if spec is cross-team (touches multiple projects)
   *
   * Detection heuristics:
   * - Spec title contains keywords like "integration", "cross-team", "shared"
   * - User stories reference multiple projects/teams
   * - Tags include multiple project names
   */
  private isCrossTeamSpec(spec: SpecContent): boolean {
    const crossTeamKeywords = [
      'integration',
      'cross-team',
      'cross-project',
      'shared',
      'common',
      'auth',  // Auth often touches frontend + backend
      'api-contract',
      'sync'
    ];

    const title = spec.metadata.title.toLowerCase();
    const hasCrossTeamKeyword = crossTeamKeywords.some(keyword =>
      title.includes(keyword)
    );

    // Check tags for multiple project references
    const tags = spec.metadata.tags || [];
    const projectTags = tags.filter(tag => tag.startsWith('project:'));
    const hasMultipleProjects = projectTags.length > 1;

    return hasCrossTeamKeyword || hasMultipleProjects;
  }

  /**
   * Sync cross-team spec to multiple repositories
   *
   * Creates issues in multiple repos:
   * - Frontend repo gets frontend-specific user stories
   * - Backend repo gets backend-specific user stories
   * - Shared stories get created in both with cross-links
   */
  private async syncCrossTeamSpec(
    spec: SpecContent,
    projectId: string
  ): Promise<SpecSyncResult> {
    const specId = spec.metadata.id;

    try {
      // Get all related project profiles
      const config = await this.projectContextManager.load();
      const relatedProfiles = await this.detectRelatedProfiles(spec, config);

      if (relatedProfiles.length === 0) {
        throw new Error('No related profiles found for cross-team spec');
      }

      console.log(`   📂 Syncing to ${relatedProfiles.length} repositories:`);

      const allChanges = {
        created: [] as string[],
        updated: [] as string[],
        deleted: [] as string[]
      };

      // Sync to each related repo
      for (const profile of relatedProfiles) {
        const githubConfig = profile.config as GitHubConfig;
        console.log(`      → ${githubConfig.owner}/${githubConfig.repo}`);

        // Filter user stories relevant to this project
        const relevantStories = this.filterRelevantUserStories(
          spec,
          profile.projectContext?.name || ''
        );

        if (relevantStories.length === 0) {
          console.log(`        ℹ️  No relevant stories, skipping`);
          continue;
        }

        // Create project in this repo
        const project = await this.createGitHubProject(
          githubConfig.owner || '',
          githubConfig.repo || '',
          {
            ...spec,
            metadata: {
              ...spec.metadata,
              userStories: relevantStories
            }
          }
        );

        // Sync user stories
        const changes = await this.syncUserStories(
          githubConfig.owner || '',
          githubConfig.repo || '',
          project.number,
          { ...spec, metadata: { ...spec.metadata, userStories: relevantStories } }
        );

        allChanges.created.push(...changes.created);
        allChanges.updated.push(...changes.updated);
        allChanges.deleted.push(...changes.deleted);
      }

      console.log('   ✅ Cross-team sync complete!');

      return {
        success: true,
        specId,
        provider: 'github',
        externalId: 'cross-team',
        url: 'multiple-repos',
        changes: allChanges
      };

    } catch (error) {
      console.error('❌ Error syncing cross-team spec:', error);
      return {
        success: false,
        specId,
        provider: 'github',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect related profiles for cross-team spec
   */
  private async detectRelatedProfiles(
    spec: SpecContent,
    config: any
  ): Promise<Array<any>> {
    const profiles: Array<any> = [];
    const tags = spec.metadata.tags || [];

    // Extract project tags (e.g., project:frontend, project:backend)
    const projectTags = tags
      .filter(tag => tag.startsWith('project:'))
      .map(tag => tag.replace('project:', ''));

    // Find profiles for these projects
    for (const projectId of projectTags) {
      const project = await this.projectContextManager.getProject(projectId);
      if (project && project.defaultSyncProfile) {
        const profile = config.profiles?.[project.defaultSyncProfile];
        if (profile && profile.provider === 'github') {
          profiles.push({
            ...profile,
            projectContext: project
          });
        }
      }
    }

    return profiles;
  }

  /**
   * Filter user stories relevant to a specific project
   *
   * Heuristics:
   * - Story title/description contains project keywords
   * - Story tags include project name
   * - Story implementation references project folder
   */
  private filterRelevantUserStories(
    spec: SpecContent,
    projectName: string
  ): UserStory[] {
    if (!spec.metadata.userStories) {
      return [];
    }

    const projectKeywords = projectName.toLowerCase().split(/[-_\s]/);

    return spec.metadata.userStories.filter(story => {
      const storyText = `${story.title} ${story.description || ''}`.toLowerCase();

      // Check if story mentions this project
      const mentionsProject = projectKeywords.some(keyword =>
        storyText.includes(keyword)
      );

      // If story doesn't mention any specific project, include it (shared story)
      const isShared = !storyText.match(/\b(frontend|backend|mobile|infra|platform)\b/);

      return mentionsProject || isShared;
    });
  }

  /**
   * Enhanced syncUserStories with optional extra labels
   */
  private async syncUserStories(
    owner: string,
    repo: string,
    projectNumber: number,
    spec: SpecContent,
    extraLabels: string[] = []
  ): Promise<{ created: string[]; updated: string[]; deleted: string[] }> {
    const created: string[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];

    if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
      console.log('   ℹ️  No user stories to sync');
      return { created, updated, deleted };
    }

    console.log(`   Syncing ${spec.metadata.userStories.length} user stories...`);

    for (const us of spec.metadata.userStories) {
      // Create or update issue for each user story
      const issueTitle = `[${us.id}] ${us.title}`;
      const issueBody = this.generateIssueBody(us);

      // Check if issue already exists (by title pattern)
      const existingIssue = await this.findIssueByTitle(owner, repo, us.id);

      const labels = [
        'user-story',
        `spec:${spec.metadata.id}`,
        `priority:${us.priority}`,
        ...extraLabels
      ];

      if (existingIssue) {
        // UPDATE existing issue
        await this.updateIssue(owner, repo, existingIssue.number, {
          title: issueTitle,
          body: issueBody,
          state: us.status === 'done' ? 'closed' : 'open'
        });

        updated.push(us.id);
        console.log(`   ✅ Updated ${us.id}`);
      } else {
        // CREATE new issue
        const newIssue = await this.createIssue(owner, repo, {
          title: issueTitle,
          body: issueBody,
          labels
        });

        created.push(us.id);
        console.log(`   ✅ Created ${us.id} → Issue #${newIssue.number}`);
      }
    }

    return { created, updated, deleted };
  }

  /**
   * Detect GitHub repository from git remote
   */
  private async detectRepo(): Promise<{ owner: string; repo: string } | null> {
    const result = await execFileNoThrow('git', ['remote', 'get-url', 'origin']);

    if (result.error || !result.stdout) {
      return null;
    }

    const remoteUrl = result.stdout.trim();

    // Parse GitHub URL
    // Examples:
    // - https://github.com/owner/repo.git
    // - git@github.com:owner/repo.git
    const httpsMatch = remoteUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/);
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2]
      };
    }

    return null;
  }
}
