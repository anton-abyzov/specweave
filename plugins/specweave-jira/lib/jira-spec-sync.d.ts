/**
 * Jira Spec Sync
 *
 * CORRECT ARCHITECTURE:
 * - Syncs .specweave/docs/internal/specs/spec-*.md ↔ Jira Epics
 * - NOT increments ↔ Jira Issues (that was wrong!)
 *
 * Mapping:
 * - Spec → Jira Epic
 * - User Story → Jira Story (subtask of epic)
 * - Acceptance Criteria → Checklist in Story description
 *
 * @module jira-spec-sync
 */
import { SpecSyncResult } from '../../../src/core/types/spec-metadata.js';
export interface JiraEpic {
    id: string;
    key: string;
    summary: string;
    description: string;
    status: {
        name: string;
    };
    url: string;
}
export interface JiraStory {
    id: string;
    key: string;
    summary: string;
    description: string;
    status: {
        name: string;
    };
    epicLink?: string;
    labels: string[];
}
export interface JiraConfig {
    domain: string;
    email: string;
    apiToken: string;
    projectKey: string;
}
export declare class JiraSpecSync {
    private specManager;
    private client;
    private config;
    constructor(config: JiraConfig, projectRoot?: string);
    /**
     * Sync spec to Jira Epic (CREATE or UPDATE)
     */
    syncSpecToJira(specId: string): Promise<SpecSyncResult>;
    /**
     * Sync FROM Jira Epic to spec (bidirectional)
     */
    syncFromJira(specId: string): Promise<SpecSyncResult>;
    /**
     * Create new Jira Epic for spec
     */
    private createJiraEpic;
    /**
     * Update existing Jira Epic
     */
    private updateJiraEpic;
    /**
     * Sync user stories as Jira Stories
     */
    private syncUserStories;
    /**
     * Generate epic description from spec
     */
    private generateEpicDescription;
    /**
     * Generate story description from user story
     */
    private generateStoryDescription;
    /**
     * Detect conflicts between spec and Jira
     */
    private detectConflicts;
    /**
     * Resolve conflicts
     */
    private resolveConflicts;
    /**
     * Fetch Jira Epic details
     */
    private fetchJiraEpic;
    /**
     * Find story by title pattern
     */
    private findStoryByTitle;
    /**
     * Create Jira Story
     */
    private createStory;
    /**
     * Update Jira Story
     */
    private updateStory;
    /**
     * Transition issue to new status
     */
    private transitionIssue;
}
//# sourceMappingURL=jira-spec-sync.d.ts.map