import { SpecMetadataManager } from "../../../src/core/specs/spec-metadata-manager.js";
import { SpecParser } from "../../../src/core/specs/spec-parser.js";
import { execFileNoThrow } from "../../../src/utils/execFileNoThrow.js";
import { ProjectContextManager } from "../../../src/core/sync/project-context.js";
class GitHubSpecSync {
  constructor(projectRoot = process.cwd()) {
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
  async detectProjectFromSpecPath(specFilePath) {
    const specPathMatch = specFilePath.match(/\.specweave\/docs\/internal\/specs\/([^/]+)\//);
    if (specPathMatch) {
      const projectId = specPathMatch[1];
      const project = await this.projectContextManager.getProject(projectId);
      return project ? projectId : null;
    }
    return "default";
  }
  /**
   * Get GitHub configuration for a project
   */
  async getGitHubConfigForProject(projectId) {
    const config = await this.projectContextManager.load();
    const project = await this.projectContextManager.getProject(projectId);
    if (!project) {
      return null;
    }
    const profileId = project.defaultSyncProfile || config.activeProfile;
    if (!profileId) {
      return null;
    }
    const profile = config.profiles?.[profileId];
    if (!profile || profile.provider !== "github") {
      return null;
    }
    const githubConfig = profile.config;
    return {
      projectId,
      strategy: githubConfig.githubStrategy || "project-per-spec",
      owner: githubConfig.owner || "",
      repo: githubConfig.repo || githubConfig.repos && githubConfig.repos[0] || "",
      teamBoardId: githubConfig.teamBoardId
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
  async syncSpecToGitHub(specId) {
    console.log(`
\u{1F504} Syncing spec ${specId} to GitHub Project...`);
    try {
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: "github",
          error: `Spec ${specId} not found`
        };
      }
      const projectId = await this.detectProjectFromSpecPath(spec.filePath);
      if (!projectId) {
        return {
          success: false,
          specId,
          provider: "github",
          error: "Could not determine project for spec"
        };
      }
      console.log(`   \u{1F4E6} Detected project: ${projectId}`);
      const githubConfig = await this.getGitHubConfigForProject(projectId);
      if (!githubConfig) {
        const repoInfo = await this.detectRepo();
        if (!repoInfo) {
          return {
            success: false,
            specId,
            provider: "github",
            error: `No GitHub configuration found for project '${projectId}'`
          };
        }
        githubConfig.owner = repoInfo.owner;
        githubConfig.repo = repoInfo.repo;
        githubConfig.strategy = "project-per-spec";
      }
      console.log(`   \u{1F3AF} Strategy: ${githubConfig.strategy}`);
      console.log(`   \u{1F517} Repository: ${githubConfig.owner}/${githubConfig.repo}`);
      const { owner, repo, strategy } = githubConfig;
      return await this.syncWithStrategy(spec, owner, repo, strategy, githubConfig);
    } catch (error) {
      console.error("\u274C Error syncing to GitHub:", error);
      return {
        success: false,
        specId,
        provider: "github",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Sync spec using specified strategy
   */
  async syncWithStrategy(spec, owner, repo, strategy, config) {
    const specId = spec.metadata.id;
    switch (strategy) {
      case "project-per-spec":
        return await this.syncProjectPerSpec(spec, owner, repo);
      case "team-board":
        return await this.syncTeamBoard(spec, owner, repo, config.teamBoardId);
      case "centralized":
        return await this.syncCentralized(spec, owner, repo);
      case "distributed":
        return await this.syncDistributed(spec, config);
      default:
        return await this.syncProjectPerSpec(spec, owner, repo);
    }
  }
  /**
   * Strategy 1: Project-per-Spec (DEFAULT)
   * - One GitHub Project per spec
   * - Current behavior, no changes needed
   */
  async syncProjectPerSpec(spec, owner, repo) {
    const specId = spec.metadata.id;
    try {
      const existingLink = spec.metadata.externalLinks?.github;
      let project;
      if (existingLink?.projectId) {
        console.log(`   Found existing GitHub Project #${existingLink.projectId}`);
        project = await this.updateGitHubProject(
          owner,
          repo,
          existingLink.projectId,
          spec
        );
      } else {
        console.log("   Creating new GitHub Project...");
        project = await this.createGitHubProject(owner, repo, spec);
        await this.specManager.linkToExternal(specId, "github", {
          id: project.id,
          url: project.url,
          owner,
          repo
        });
      }
      const changes = await this.syncUserStories(owner, repo, project.number, spec);
      console.log("\u2705 Sync complete!");
      return {
        success: true,
        specId,
        provider: "github",
        externalId: project.id.toString(),
        url: project.url,
        changes
      };
    } catch (error) {
      console.error("\u274C Error syncing to GitHub:", error);
      return {
        success: false,
        specId,
        provider: "github",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Sync FROM GitHub Project to spec (full sync with all permissions)
   */
  async syncFromGitHub(specId) {
    console.log(`
\u{1F504} Syncing FROM GitHub to spec ${specId}...`);
    try {
      const spec = await this.specManager.loadSpec(specId);
      if (!spec) {
        return {
          success: false,
          specId,
          provider: "github",
          error: `Spec ${specId} not found`
        };
      }
      const githubLink = spec.metadata.externalLinks?.github;
      if (!githubLink?.projectId) {
        return {
          success: false,
          specId,
          provider: "github",
          error: "Spec not linked to GitHub Project"
        };
      }
      const { owner, repo } = await this.detectRepo() || { owner: "", repo: "" };
      const project = await this.fetchGitHubProject(owner, repo, githubLink.projectId);
      const conflicts = await this.detectConflicts(spec, project);
      if (conflicts.length === 0) {
        console.log("\u2705 No conflicts - spec and GitHub in sync");
        return {
          success: true,
          specId,
          provider: "github",
          externalId: project.id.toString(),
          url: project.url
        };
      }
      console.log(`\u26A0\uFE0F  Detected ${conflicts.length} conflict(s)`);
      await this.resolveConflicts(spec, conflicts);
      console.log("\u2705 Sync FROM GitHub complete!");
      return {
        success: true,
        specId,
        provider: "github",
        externalId: project.id.toString(),
        url: project.url,
        conflicts
      };
    } catch (error) {
      console.error("\u274C Error syncing FROM GitHub:", error);
      return {
        success: false,
        specId,
        provider: "github",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Create new GitHub Project for spec
   */
  async createGitHubProject(owner, repo, spec) {
    const projectTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const projectBody = this.generateProjectDescription(spec);
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
    const ownerId = await this.getOwnerId(owner);
    const result = await this.executeGraphQL(query, {
      ownerId,
      title: projectTitle,
      body: projectBody
    });
    const project = result.data.createProjectV2.projectV2;
    console.log(`   \u2705 Created GitHub Project #${project.number}: ${project.url}`);
    return {
      id: parseInt(project.id, 10),
      title: project.title,
      number: project.number,
      url: project.url,
      state: "open",
      owner,
      repo
    };
  }
  /**
   * Update existing GitHub Project
   */
  async updateGitHubProject(owner, repo, projectId, spec) {
    const projectTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const projectBody = this.generateProjectDescription(spec);
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
    console.log(`   \u2705 Updated GitHub Project #${project.number}`);
    return {
      id: projectId,
      title: project.title,
      number: project.number,
      url: project.url,
      state: "open",
      owner,
      repo
    };
  }
  /**
   * Generate project description from spec
   */
  generateProjectDescription(spec) {
    const progress = spec.metadata.progress;
    const progressText = progress ? `**Progress**: ${progress.percentComplete}% (${progress.completedUserStories}/${progress.totalUserStories} user stories)` : "**Progress**: N/A";
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

\u{1F916} **Auto-synced from SpecWeave**
Last updated: ${(/* @__PURE__ */ new Date()).toISOString()}
`.trim();
  }
  /**
   * Generate issue body from user story
   */
  generateIssueBody(us) {
    const acList = us.acceptanceCriteria.map((ac) => `- [${ac.status === "done" ? "x" : " "}] ${ac.description}`).join("\n");
    return `
## User Story

${us.title}

## Acceptance Criteria

${acList}

---

**Priority**: ${us.priority}
**Status**: ${us.status}

\u{1F916} **Auto-synced from SpecWeave**
`.trim();
  }
  /**
   * Detect conflicts between spec and GitHub
   */
  async detectConflicts(spec, project) {
    const conflicts = [];
    const expectedTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    if (project.title !== expectedTitle) {
      conflicts.push({
        type: "metadata",
        field: "title",
        localValue: spec.metadata.title,
        remoteValue: project.title,
        resolution: "remote-wins",
        description: "Project title differs from spec title"
      });
    }
    return conflicts;
  }
  /**
   * Resolve conflicts
   */
  async resolveConflicts(spec, conflicts) {
    for (const conflict of conflicts) {
      if (conflict.resolution === "remote-wins") {
        console.log(`   \u{1F504} Resolving: ${conflict.description} (GitHub wins)`);
        if (conflict.field === "title") {
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
  async executeGraphQL(query, variables) {
    const result = await execFileNoThrow("gh", [
      "api",
      "graphql",
      "-f",
      `query=${query}`,
      ...Object.entries(variables).flatMap(([key, value]) => ["-F", `${key}=${value}`])
    ]);
    if (result.error) {
      throw new Error(`GraphQL query failed: ${result.error}`);
    }
    return JSON.parse(result.stdout);
  }
  /**
   * Get owner ID (user or organization)
   */
  async getOwnerId(owner) {
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
  async fetchGitHubProject(owner, repo, projectId) {
    return {
      id: projectId,
      title: "Project Title",
      number: 1,
      url: "https://github.com/...",
      state: "open",
      owner,
      repo
    };
  }
  /**
   * Find issue by title pattern
   */
  async findIssueByTitle(owner, repo, usId) {
    const result = await execFileNoThrow("gh", [
      "issue",
      "list",
      "--repo",
      `${owner}/${repo}`,
      "--search",
      `"[${usId}]" in:title`,
      "--json",
      "number,title,body,state,labels",
      "--limit",
      "1"
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
  async createIssue(owner, repo, issue) {
    const result = await execFileNoThrow("gh", [
      "issue",
      "create",
      "--repo",
      `${owner}/${repo}`,
      "--title",
      issue.title,
      "--body",
      issue.body,
      "--label",
      issue.labels.join(","),
      "--json",
      "number,title,body,state"
    ]);
    if (result.error) {
      throw new Error(`Failed to create issue: ${result.error}`);
    }
    return JSON.parse(result.stdout);
  }
  /**
   * Update GitHub issue
   */
  async updateIssue(owner, repo, issueNumber, updates) {
    const args = ["issue", "edit", issueNumber.toString(), "--repo", `${owner}/${repo}`];
    if (updates.title) {
      args.push("--title", updates.title);
    }
    if (updates.body) {
      args.push("--body", updates.body);
    }
    if (updates.state === "closed") {
      args.push("--state", "closed");
    } else if (updates.state === "open") {
      args.push("--state", "open");
    }
    const result = await execFileNoThrow("gh", args);
    if (result.error) {
      throw new Error(`Failed to update issue #${issueNumber}: ${result.error}`);
    }
  }
  /**
   * Strategy 2: Team-Board
   * - One GitHub Project per team (aggregates multiple specs)
   * - All specs from the same team/project sync to same board
   */
  async syncTeamBoard(spec, owner, repo, teamBoardId) {
    const specId = spec.metadata.id;
    try {
      console.log("   \u{1F4CB} Using team-board strategy (aggregated)");
      if (!teamBoardId) {
        const projectId = await this.detectProjectFromSpecPath(spec.filePath);
        const project = await this.projectContextManager.getProject(projectId || "default");
        const teamName = project?.team || "Team";
        const teamProject = await this.createGitHubProject(owner, repo, {
          ...spec,
          metadata: {
            ...spec.metadata,
            title: `${teamName} Board`
          }
        });
        teamBoardId = teamProject.id;
        console.log(`   \u2705 Created team board: ${teamName} Board (#${teamBoardId})`);
      }
      const changes = await this.syncUserStories(owner, repo, teamBoardId, spec);
      return {
        success: true,
        specId,
        provider: "github",
        externalId: teamBoardId.toString(),
        url: `https://github.com/orgs/${owner}/projects/${teamBoardId}`,
        changes
      };
    } catch (error) {
      console.error("\u274C Error syncing to team board:", error);
      return {
        success: false,
        specId,
        provider: "github",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Strategy 3: Centralized
   * - Parent repo tracks all specs (multi-repo pattern)
   * - Issues created in parent repo with tags for child repos
   */
  async syncCentralized(spec, parentOwner, parentRepo) {
    const specId = spec.metadata.id;
    try {
      console.log("   \u{1F3E2} Using centralized strategy (parent repo tracks all)");
      const project = await this.createGitHubProject(parentOwner, parentRepo, spec);
      const projectId = await this.detectProjectFromSpecPath(spec.filePath);
      const projectContext = await this.projectContextManager.getProject(projectId || "default");
      const changes = await this.syncUserStories(
        parentOwner,
        parentRepo,
        project.number,
        spec,
        projectContext?.name ? [`project:${projectContext.name}`] : []
      );
      console.log(`   \u2705 Synced to parent repo: ${parentOwner}/${parentRepo}`);
      return {
        success: true,
        specId,
        provider: "github",
        externalId: project.id.toString(),
        url: project.url,
        changes
      };
    } catch (error) {
      console.error("\u274C Error syncing centralized:", error);
      return {
        success: false,
        specId,
        provider: "github",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Strategy 4: Distributed
   * - Each team syncs to their repo (microservices)
   * - Cross-team specs create issues in multiple repos
   */
  async syncDistributed(spec, config) {
    const specId = spec.metadata.id;
    try {
      console.log("   \u{1F310} Using distributed strategy (per-team repos)");
      const projectId = config.projectId;
      const projectContext = await this.projectContextManager.getProject(projectId);
      if (!projectContext) {
        throw new Error(`Project context not found for ${projectId}`);
      }
      const isCrossTeam = this.isCrossTeamSpec(spec);
      if (isCrossTeam) {
        console.log("   \u{1F517} Cross-team spec detected, syncing to multiple repos");
        return await this.syncCrossTeamSpec(spec, projectId);
      }
      return await this.syncProjectPerSpec(spec, config.owner, config.repo);
    } catch (error) {
      console.error("\u274C Error syncing distributed:", error);
      return {
        success: false,
        specId,
        provider: "github",
        error: error instanceof Error ? error.message : "Unknown error"
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
  isCrossTeamSpec(spec) {
    const crossTeamKeywords = [
      "integration",
      "cross-team",
      "cross-project",
      "shared",
      "common",
      "auth",
      // Auth often touches frontend + backend
      "api-contract",
      "sync"
    ];
    const title = spec.metadata.title.toLowerCase();
    const hasCrossTeamKeyword = crossTeamKeywords.some(
      (keyword) => title.includes(keyword)
    );
    const tags = spec.metadata.tags || [];
    const projectTags = tags.filter((tag) => tag.startsWith("project:"));
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
  async syncCrossTeamSpec(spec, projectId) {
    const specId = spec.metadata.id;
    try {
      const config = await this.projectContextManager.load();
      const relatedProfiles = await this.detectRelatedProfiles(spec, config);
      if (relatedProfiles.length === 0) {
        throw new Error("No related profiles found for cross-team spec");
      }
      console.log(`   \u{1F4C2} Syncing to ${relatedProfiles.length} repositories:`);
      const allChanges = {
        created: [],
        updated: [],
        deleted: []
      };
      for (const profile of relatedProfiles) {
        const githubConfig = profile.config;
        console.log(`      \u2192 ${githubConfig.owner}/${githubConfig.repo}`);
        const relevantStories = this.filterRelevantUserStories(
          spec,
          profile.projectContext?.name || ""
        );
        if (relevantStories.length === 0) {
          console.log(`        \u2139\uFE0F  No relevant stories, skipping`);
          continue;
        }
        const project = await this.createGitHubProject(
          githubConfig.owner || "",
          githubConfig.repo || "",
          {
            ...spec,
            metadata: {
              ...spec.metadata,
              userStories: relevantStories
            }
          }
        );
        const changes = await this.syncUserStories(
          githubConfig.owner || "",
          githubConfig.repo || "",
          project.number,
          { ...spec, metadata: { ...spec.metadata, userStories: relevantStories } }
        );
        allChanges.created.push(...changes.created);
        allChanges.updated.push(...changes.updated);
        allChanges.deleted.push(...changes.deleted);
      }
      console.log("   \u2705 Cross-team sync complete!");
      return {
        success: true,
        specId,
        provider: "github",
        externalId: "cross-team",
        url: "multiple-repos",
        changes: allChanges
      };
    } catch (error) {
      console.error("\u274C Error syncing cross-team spec:", error);
      return {
        success: false,
        specId,
        provider: "github",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Detect related profiles for cross-team spec
   */
  async detectRelatedProfiles(spec, config) {
    const profiles = [];
    const tags = spec.metadata.tags || [];
    const projectTags = tags.filter((tag) => tag.startsWith("project:")).map((tag) => tag.replace("project:", ""));
    for (const projectId of projectTags) {
      const project = await this.projectContextManager.getProject(projectId);
      if (project && project.defaultSyncProfile) {
        const profile = config.profiles?.[project.defaultSyncProfile];
        if (profile && profile.provider === "github") {
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
  filterRelevantUserStories(spec, projectName) {
    if (!spec.metadata.userStories) {
      return [];
    }
    const projectKeywords = projectName.toLowerCase().split(/[-_\s]/);
    return spec.metadata.userStories.filter((story) => {
      const storyText = `${story.title} ${story.description || ""}`.toLowerCase();
      const mentionsProject = projectKeywords.some(
        (keyword) => storyText.includes(keyword)
      );
      const isShared = !storyText.match(/\b(frontend|backend|mobile|infra|platform)\b/);
      return mentionsProject || isShared;
    });
  }
  /**
   * Enhanced syncUserStories with optional extra labels
   */
  async syncUserStories(owner, repo, projectNumber, spec, extraLabels = []) {
    const created = [];
    const updated = [];
    const deleted = [];
    if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
      console.log("   \u2139\uFE0F  No user stories to sync");
      return { created, updated, deleted };
    }
    console.log(`   Syncing ${spec.metadata.userStories.length} user stories...`);
    for (const us of spec.metadata.userStories) {
      const issueTitle = `[${us.id}] ${us.title}`;
      const issueBody = this.generateIssueBody(us);
      const existingIssue = await this.findIssueByTitle(owner, repo, us.id);
      const labels = [
        "user-story",
        `spec:${spec.metadata.id}`,
        `priority:${us.priority}`,
        ...extraLabels
      ];
      if (existingIssue) {
        await this.updateIssue(owner, repo, existingIssue.number, {
          title: issueTitle,
          body: issueBody,
          state: us.status === "done" ? "closed" : "open"
        });
        updated.push(us.id);
        console.log(`   \u2705 Updated ${us.id}`);
      } else {
        const newIssue = await this.createIssue(owner, repo, {
          title: issueTitle,
          body: issueBody,
          labels
        });
        created.push(us.id);
        console.log(`   \u2705 Created ${us.id} \u2192 Issue #${newIssue.number}`);
      }
    }
    return { created, updated, deleted };
  }
  /**
   * Detect GitHub repository from git remote
   */
  async detectRepo() {
    const result = await execFileNoThrow("git", ["remote", "get-url", "origin"]);
    if (result.error || !result.stdout) {
      return null;
    }
    const remoteUrl = result.stdout.trim();
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
export {
  GitHubSpecSync
};
