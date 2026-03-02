/**
 * GitHub Multi-Project Sync
 *
 * Supports two patterns:
 * 1. **Multiple Repos**: Separate repos for each project (FE, BE, MOBILE)
 * 2. **Master + Nested**: Master repo (epics) + nested repos (detailed tasks)
 *
 * @module github-multi-project-sync
 */

import { Octokit } from '@octokit/rest';
import { UserStory, getPrimaryProject, ProjectMapping } from '../../../src/utils/project-mapper.js';
import { parseSpecFile } from '../../../src/utils/spec-splitter.js';

export interface GitHubMultiProjectConfig {
  owner: string;
  token: string;

  // Pattern 1: Multiple repos (simple)
  repos?: string[];  // ['frontend-web', 'backend-api', 'mobile-app']

  // Pattern 2: Master + nested repos (advanced)
  masterRepo?: string;  // 'master-project' (high-level epics)
  nestedRepos?: string[];  // ['frontend-web', 'backend-api', 'mobile-app'] (detailed tasks)

  // Settings
  masterRepoLevel?: 'epic';  // Master repo contains epics
  nestedRepoLevel?: 'story-task';  // Nested repos contain stories/tasks
  crossLinking?: boolean;  // Enable epic → issue links
  confidenceThreshold?: number;  // Minimum confidence for project classification (default: 0.3)
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  labels: Array<{ name: string }>;
}

export interface SyncResult {
  project: string;
  repo: string;
  issueNumber: number;
  url: string;
  action: 'created' | 'updated' | 'skipped';
}

/**
 * GitHub Multi-Project Sync Client
 */
export class GitHubMultiProjectSync {
  private octokit: Octokit;
  private config: GitHubMultiProjectConfig;

  constructor(config: GitHubMultiProjectConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
  }

  /**
   * Pre-flight validation: Verify all repos exist
   *
   * @throws Error if any repos are missing
   */
  async validateRepos(): Promise<void> {
    const reposToValidate: string[] = [];

    // Collect all repos to validate
    if (this.config.repos) {
      reposToValidate.push(...this.config.repos);
    }
    if (this.config.masterRepo) {
      reposToValidate.push(this.config.masterRepo);
    }
    if (this.config.nestedRepos) {
      reposToValidate.push(...this.config.nestedRepos);
    }

    if (reposToValidate.length === 0) {
      throw new Error('No repositories configured for validation');
    }

    // Validate repos exist
    const missing = await validateGitHubRepos(this.config, reposToValidate);

    if (missing.length > 0) {
      throw new Error(
        `❌ Pre-flight check failed: Missing GitHub repositories:\n` +
        missing.map(r => `  - ${this.config.owner}/${r}`).join('\n') +
        `\n\nPlease verify repository names and access permissions.`
      );
    }
  }

  /**
   * Sync spec to appropriate GitHub repos based on project mapping
   *
   * @param specPath Path to spec file
   * @returns Array of sync results
   */
  async syncSpec(specPath: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Pre-flight validation: Verify all repos exist
    await this.validateRepos();

    // Parse spec
    const parsedSpec = await parseSpecFile(specPath);

    // Determine sync pattern
    const isMasterNested = !!this.config.masterRepo && !!this.config.nestedRepos;

    if (isMasterNested) {
      // Pattern 2: Master + Nested
      results.push(...await this.syncMasterNested(parsedSpec));
    } else if (this.config.repos) {
      // Pattern 1: Multiple Repos
      results.push(...await this.syncMultipleRepos(parsedSpec));
    } else {
      throw new Error('Invalid config: Must specify repos[] or masterRepo+nestedRepos[]');
    }

    return results;
  }

  /**
   * Pattern 1: Sync to multiple repos (simple)
   *
   * Each project → separate repo
   * - FE user stories → company/frontend-web
   * - BE user stories → company/backend-api
   * - MOBILE user stories → company/mobile-app
   */
  private async syncMultipleRepos(parsedSpec: any): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Classify user stories by project
    const projectStories = new Map<string, UserStory[]>();

    const mapperConfig = {
      confidenceThreshold: this.config.confidenceThreshold
    };

    for (const userStory of parsedSpec.userStories) {
      const primaryProject = getPrimaryProject(userStory, undefined, mapperConfig);

      if (primaryProject) {
        const existing = projectStories.get(primaryProject.projectId) || [];
        existing.push(userStory);
        projectStories.set(primaryProject.projectId, existing);
      } else {
        // No confident match - skip or assign to default repo
        const threshold = this.config.confidenceThreshold ?? 0.3;
        console.warn(`⚠️  No confident project match for ${userStory.id} (< ${threshold * 100}% threshold) - skipping`);
      }
    }

    // Sync each project to its repo
    for (const [projectId, stories] of projectStories.entries()) {
      const repo = this.findRepoForProject(projectId);

      if (!repo) {
        console.warn(`⚠️  No GitHub repo configured for project ${projectId} - skipping`);
        continue;
      }

      // Create or update issue for each story
      for (const story of stories) {
        const result = await this.createOrUpdateIssue(repo, story, projectId);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Pattern 2: Sync to master + nested repos (advanced)
   *
   * - Master repo (epic-level): High-level overview
   * - Nested repos (task-level): Detailed implementation
   *
   * Example:
   * Master (company/master-project):
   *   Epic #10: User Authentication
   *     → Links to: frontend-web#42, backend-api#15, mobile-app#8
   *
   * Nested (company/frontend-web):
   *   Issue #42: Implement Login UI
   *     Task 1: Create login component
   *     Task 2: Add form validation
   */
  private async syncMasterNested(parsedSpec: any): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    if (!this.config.masterRepo || !this.config.nestedRepos) {
      throw new Error('Master+nested mode requires masterRepo and nestedRepos');
    }

    // Step 1: Create epic in master repo
    const epicResult = await this.createEpicInMasterRepo(parsedSpec);
    results.push(epicResult);

    // Step 2: Classify user stories by project
    const projectStories = new Map<string, UserStory[]>();

    const mapperConfig = {
      confidenceThreshold: this.config.confidenceThreshold
    };

    for (const userStory of parsedSpec.userStories) {
      const primaryProject = getPrimaryProject(userStory, undefined, mapperConfig);

      if (primaryProject) {
        const existing = projectStories.get(primaryProject.projectId) || [];
        existing.push(userStory);
        projectStories.set(primaryProject.projectId, existing);
      }
    }

    // Step 3: Create issues in nested repos + link to epic
    for (const [projectId, stories] of projectStories.entries()) {
      const repo = this.findNestedRepoForProject(projectId);

      if (!repo) {
        console.warn(`⚠️  No nested repo for project ${projectId} - skipping`);
        continue;
      }

      for (const story of stories) {
        const result = await this.createIssueInNestedRepo(repo, story, projectId, epicResult.issueNumber);
        results.push(result);
      }
    }

    // Step 4: Update epic with links to nested issues
    if (this.config.crossLinking) {
      await this.updateEpicWithLinks(epicResult.issueNumber, results.filter(r => r.repo !== this.config.masterRepo));
    }

    return results;
  }

  /**
   * Create epic issue in master repo
   */
  private async createEpicInMasterRepo(parsedSpec: any): Promise<SyncResult> {
    const title = `Epic: ${parsedSpec.metadata.title}`;

    const body = `# ${parsedSpec.metadata.title}

**Status**: ${parsedSpec.metadata.status}
**Priority**: ${parsedSpec.metadata.priority}
**Estimated Effort**: ${parsedSpec.metadata.estimatedEffort || 'TBD'}

## Executive Summary

${parsedSpec.executiveSummary}

## User Stories (${parsedSpec.userStories.length} total)

${parsedSpec.userStories.map((s: UserStory, i: number) => `${i + 1}. ${s.id}: ${s.title}`).join('\n')}

---

📊 **This is a high-level epic** - detailed implementation tracked in nested repos
🔗 **Links to implementation issues** (will be added automatically)

🤖 Auto-generated by SpecWeave
`;

    const response = await this.octokit.issues.create({
      owner: this.config.owner,
      repo: this.config.masterRepo!,
      title,
      body,
      labels: ['epic', 'specweave']
    });

    return {
      project: 'MASTER',
      repo: this.config.masterRepo!,
      issueNumber: response.data.number,
      url: response.data.html_url,
      action: 'created'
    };
  }

  /**
   * Create issue in nested repo + link to epic
   */
  private async createIssueInNestedRepo(
    repo: string,
    userStory: UserStory,
    projectId: string,
    epicNumber?: number
  ): Promise<SyncResult> {
    const title = `${userStory.id}: ${userStory.title}`;

    let body = `# ${userStory.title}

${userStory.description}

## Acceptance Criteria

${userStory.acceptanceCriteria.map((ac, i) => `- [ ] ${ac}`).join('\n')}
`;

    // Add technical context if present
    if (userStory.technicalContext) {
      body += `\n## Technical Context\n\n${userStory.technicalContext}\n`;
    }

    // Add link to epic if cross-linking enabled
    if (this.config.crossLinking && epicNumber) {
      body += `\n---\n\n📊 Part of Epic: ${this.config.owner}/${this.config.masterRepo}#${epicNumber}\n`;
    }

    body += `\n🤖 Auto-generated by SpecWeave\n`;

    const response = await this.octokit.issues.create({
      owner: this.config.owner,
      repo,
      title,
      body,
      labels: ['story', 'specweave', projectId.toLowerCase()]
    });

    return {
      project: projectId,
      repo,
      issueNumber: response.data.number,
      url: response.data.html_url,
      action: 'created'
    };
  }

  /**
   * Create or update issue (for simple multi-repo pattern)
   */
  private async createOrUpdateIssue(repo: string, userStory: UserStory, projectId: string): Promise<SyncResult> {
    const title = `${userStory.id}: ${userStory.title}`;

    const body = `# ${userStory.title}

${userStory.description}

## Acceptance Criteria

${userStory.acceptanceCriteria.map((ac, i) => `- [ ] ${ac}`).join('\n')}

${userStory.technicalContext ? `\n## Technical Context\n\n${userStory.technicalContext}\n` : ''}

🤖 Auto-generated by SpecWeave
`;

    // Check if issue already exists (search by title, paginated)
    let existing: { number: number; title: string } | undefined;
    const seenNumbers = new Set<number>();
    let page = 1;

    while (!existing) {
      const existingIssues = await this.octokit.issues.listForRepo({
        owner: this.config.owner,
        repo,
        labels: 'specweave',
        state: 'all',
        per_page: 100,
        page,
      });

      for (const issue of existingIssues.data) {
        if (seenNumbers.has(issue.number)) continue;
        seenNumbers.add(issue.number);
        if (issue.title === title) {
          existing = { number: issue.number, title: issue.title };
          break;
        }
      }

      if (existingIssues.data.length < 100) break;
      page++;
    }

    if (existing) {
      // Update existing issue
      const response = await this.octokit.issues.update({
        owner: this.config.owner,
        repo,
        issue_number: existing.number,
        body
      });

      return {
        project: projectId,
        repo,
        issueNumber: response.data.number,
        url: response.data.html_url,
        action: 'updated'
      };
    } else {
      // Create new issue
      const response = await this.octokit.issues.create({
        owner: this.config.owner,
        repo,
        title,
        body,
        labels: ['specweave', projectId.toLowerCase()]
      });

      return {
        project: projectId,
        repo,
        issueNumber: response.data.number,
        url: response.data.html_url,
        action: 'created'
      };
    }
  }

  /**
   * Update epic with links to nested issues
   */
  private async updateEpicWithLinks(epicNumber: number, nestedResults: SyncResult[]): Promise<void> {
    if (!this.config.masterRepo) return;

    const linksSection = `\n\n## Implementation Issues\n\n${nestedResults
      .map(r => `- ${r.project}: ${this.config.owner}/${r.repo}#${r.issueNumber} - ${r.url}`)
      .join('\n')}\n`;

    // Get current epic body
    const epic = await this.octokit.issues.get({
      owner: this.config.owner,
      repo: this.config.masterRepo,
      issue_number: epicNumber
    });

    // Append links section
    const updatedBody = epic.data.body + linksSection;

    // Update epic
    await this.octokit.issues.update({
      owner: this.config.owner,
      repo: this.config.masterRepo,
      issue_number: epicNumber,
      body: updatedBody
    });
  }

  /**
   * Find GitHub repo for project ID
   *
   * Maps project IDs to repo names:
   * - FE → frontend-web
   * - BE → backend-api
   * - MOBILE → mobile-app
   */
  private findRepoForProject(projectId: string): string | undefined {
    if (!this.config.repos) return undefined;

    // Try exact match first
    let match = this.config.repos.find(repo => repo.toLowerCase().includes(projectId.toLowerCase()));

    if (!match) {
      // Try fuzzy match (FE → frontend, BE → backend, MOBILE → mobile)
      const fuzzyMap: Record<string, string[]> = {
        FE: ['frontend', 'web', 'ui', 'client'],
        BE: ['backend', 'api', 'server'],
        MOBILE: ['mobile', 'app', 'ios', 'android'],
        INFRA: ['infra', 'infrastructure', 'devops', 'platform']
      };

      const keywords = fuzzyMap[projectId] || [];

      match = this.config.repos.find(repo =>
        keywords.some(keyword => repo.toLowerCase().includes(keyword))
      );
    }

    return match;
  }

  /**
   * Find nested repo for project ID (same logic as findRepoForProject)
   */
  private findNestedRepoForProject(projectId: string): string | undefined {
    if (!this.config.nestedRepos) return undefined;

    // Reuse same logic
    const tempConfig = { ...this.config, repos: this.config.nestedRepos };
    const tempSync = new GitHubMultiProjectSync(tempConfig);
    return tempSync.findRepoForProject(projectId);
  }
}

/**
 * Format sync results for display
 */
export function formatSyncResults(results: SyncResult[]): string {
  const lines: string[] = [];

  lines.push('📊 GitHub Multi-Project Sync Results:\n');

  const byProject = new Map<string, SyncResult[]>();

  for (const result of results) {
    const existing = byProject.get(result.project) || [];
    existing.push(result);
    byProject.set(result.project, existing);
  }

  for (const [project, projectResults] of byProject.entries()) {
    lines.push(`\n**${project}**:`);

    for (const result of projectResults) {
      const icon = result.action === 'created' ? '✅' : result.action === 'updated' ? '🔄' : '⏭️';
      lines.push(`  ${icon} ${result.repo}#${result.issueNumber} (${result.action})`);
      lines.push(`     ${result.url}`);
    }
  }

  lines.push(`\n✅ Total: ${results.length} issues synced\n`);

  return lines.join('\n');
}

/**
 * Validate GitHub repositories exist
 *
 * @param config GitHub configuration
 * @param repoNames Array of repo names to validate
 * @returns Validation results (missing repos)
 */
export async function validateGitHubRepos(
  config: GitHubMultiProjectConfig,
  repoNames: string[]
): Promise<string[]> {
  const missing: string[] = [];
  const octokit = new Octokit({ auth: config.token });

  for (const repo of repoNames) {
    try {
      await octokit.repos.get({
        owner: config.owner,
        repo
      });
    } catch (error) {
      missing.push(repo);
    }
  }

  return missing;
}
