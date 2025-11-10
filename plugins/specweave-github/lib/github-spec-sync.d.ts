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
import { SpecSyncResult } from '../../../src/core/types/spec-metadata.js';
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
    content_url?: string;
}
export interface GitHubIssue {
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    labels: string[];
    assignees: string[];
}
export declare class GitHubSpecSync {
    private specManager;
    constructor(projectRoot?: string);
    /**
     * Sync spec to GitHub Project (CREATE or UPDATE)
     */
    syncSpecToGitHub(specId: string): Promise<SpecSyncResult>;
    /**
     * Sync FROM GitHub Project to spec (bidirectional)
     */
    syncFromGitHub(specId: string): Promise<SpecSyncResult>;
    /**
     * Create new GitHub Project for spec
     */
    private createGitHubProject;
    /**
     * Update existing GitHub Project
     */
    private updateGitHubProject;
    /**
     * Sync user stories as GitHub Issues
     */
    private syncUserStories;
    /**
     * Generate project description from spec
     */
    private generateProjectDescription;
    /**
     * Generate issue body from user story
     */
    private generateIssueBody;
    /**
     * Detect conflicts between spec and GitHub
     */
    private detectConflicts;
    /**
     * Resolve conflicts
     */
    private resolveConflicts;
    /**
     * Execute GraphQL query against GitHub API
     */
    private executeGraphQL;
    /**
     * Get owner ID (user or organization)
     */
    private getOwnerId;
    /**
     * Fetch GitHub Project details
     */
    private fetchGitHubProject;
    /**
     * Find issue by title pattern
     */
    private findIssueByTitle;
    /**
     * Create GitHub issue
     */
    private createIssue;
    /**
     * Update GitHub issue
     */
    private updateIssue;
    /**
     * Detect GitHub repository from git remote
     */
    private detectRepo;
}
//# sourceMappingURL=github-spec-sync.d.ts.map