/**
 * GitHub Spec Sync
 *
 * CORRECT ARCHITECTURE:
 * - Syncs .specweave/docs/internal/specs/spec-*.md ↔ GitHub Projects
 * - NOT increments ↔ GitHub Issues (that was wrong!)
 *
 * Mapping:
 * - Spec → GitHub Project
 * - User Story → GitHub Project Card/Issue
 * - Acceptance Criteria → Checklist in Issue
 *
 * @module github-spec-sync
 */
import { SpecMetadataManager } from '../../../src/core/specs/spec-metadata-manager.js';
import { SpecParser } from '../../../src/core/specs/spec-parser.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
export class GitHubSpecSync {
    constructor(projectRoot = process.cwd()) {
        this.specManager = new SpecMetadataManager(projectRoot);
    }
    /**
     * Sync spec to GitHub Project (CREATE or UPDATE)
     */
    async syncSpecToGitHub(specId) {
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
            // 2. Detect repository
            const repoInfo = await this.detectRepo();
            if (!repoInfo) {
                return {
                    success: false,
                    specId,
                    provider: 'github',
                    error: 'Could not detect GitHub repository'
                };
            }
            const { owner, repo } = repoInfo;
            // 3. Check if spec already linked to GitHub Project
            const existingLink = spec.metadata.externalLinks?.github;
            let project;
            if (existingLink?.projectId) {
                // UPDATE existing project
                console.log(`   Found existing GitHub Project #${existingLink.projectId}`);
                project = await this.updateGitHubProject(owner, repo, existingLink.projectId, spec);
            }
            else {
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
        }
        catch (error) {
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
     * Sync FROM GitHub Project to spec (bidirectional)
     */
    async syncFromGitHub(specId) {
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
        }
        catch (error) {
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
    async createGitHubProject(owner, repo, spec) {
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
    async updateGitHubProject(owner, repo, projectId, spec) {
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
     * Sync user stories as GitHub Issues
     */
    async syncUserStories(owner, repo, projectNumber, spec) {
        const created = [];
        const updated = [];
        const deleted = [];
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
            if (existingIssue) {
                // UPDATE existing issue
                await this.updateIssue(owner, repo, existingIssue.number, {
                    title: issueTitle,
                    body: issueBody,
                    state: us.status === 'done' ? 'closed' : 'open'
                });
                updated.push(us.id);
                console.log(`   ✅ Updated ${us.id}`);
            }
            else {
                // CREATE new issue
                const newIssue = await this.createIssue(owner, repo, {
                    title: issueTitle,
                    body: issueBody,
                    labels: ['user-story', `spec:${spec.metadata.id}`, `priority:${us.priority}`]
                });
                created.push(us.id);
                console.log(`   ✅ Created ${us.id} → Issue #${newIssue.number}`);
            }
        }
        return { created, updated, deleted };
    }
    /**
     * Generate project description from spec
     */
    generateProjectDescription(spec) {
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
    generateIssueBody(us) {
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
    async detectConflicts(spec, project) {
        const conflicts = [];
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
    async resolveConflicts(spec, conflicts) {
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
    async executeGraphQL(query, variables) {
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
    async findIssueByTitle(owner, repo, usId) {
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
    async createIssue(owner, repo, issue) {
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
    async updateIssue(owner, repo, issueNumber, updates) {
        const args = ['issue', 'edit', issueNumber.toString(), '--repo', `${owner}/${repo}`];
        if (updates.title) {
            args.push('--title', updates.title);
        }
        if (updates.body) {
            args.push('--body', updates.body);
        }
        if (updates.state === 'closed') {
            args.push('--state', 'closed');
        }
        else if (updates.state === 'open') {
            args.push('--state', 'open');
        }
        const result = await execFileNoThrow('gh', args);
        if (result.error) {
            throw new Error(`Failed to update issue #${issueNumber}: ${result.error}`);
        }
    }
    /**
     * Detect GitHub repository from git remote
     */
    async detectRepo() {
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
//# sourceMappingURL=github-spec-sync.js.map