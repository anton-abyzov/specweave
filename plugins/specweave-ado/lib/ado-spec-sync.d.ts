/**
 * Azure DevOps Spec Sync
 *
 * CORRECT ARCHITECTURE:
 * - Syncs .specweave/docs/internal/specs/spec-*.md ↔ ADO Features
 * - NOT increments ↔ ADO Work Items (that was wrong!)
 *
 * Mapping:
 * - Spec → ADO Feature
 * - User Story → ADO User Story (child of feature)
 * - Acceptance Criteria → Checklist in User Story description
 *
 * @module ado-spec-sync
 */
import { SpecSyncResult } from '../../../src/core/types/spec-metadata.js';
export interface AdoFeature {
    id: number;
    url: string;
    fields: {
        'System.Title': string;
        'System.Description': string;
        'System.State': string;
        'System.Tags': string;
    };
}
export interface AdoUserStory {
    id: number;
    url: string;
    fields: {
        'System.Title': string;
        'System.Description': string;
        'System.State': string;
        'System.Parent': number;
        'System.Tags': string;
    };
}
export interface AdoConfig {
    organization: string;
    project: string;
    personalAccessToken: string;
}
export declare class AdoSpecSync {
    private specManager;
    private client;
    private config;
    constructor(config: AdoConfig, projectRoot?: string);
    /**
     * Sync spec to ADO Feature (CREATE or UPDATE)
     */
    syncSpecToAdo(specId: string): Promise<SpecSyncResult>;
    /**
     * Sync FROM ADO Feature to spec (bidirectional)
     */
    syncFromAdo(specId: string): Promise<SpecSyncResult>;
    /**
     * Create new ADO Feature for spec
     */
    private createAdoFeature;
    /**
     * Update existing ADO Feature
     */
    private updateAdoFeature;
    /**
     * Sync user stories as ADO User Stories
     */
    private syncUserStories;
    /**
     * Generate feature description from spec
     */
    private generateFeatureDescription;
    /**
     * Generate story description from user story
     */
    private generateStoryDescription;
    /**
     * Detect conflicts between spec and ADO
     */
    private detectConflicts;
    /**
     * Resolve conflicts
     */
    private resolveConflicts;
    /**
     * Fetch ADO Feature details
     */
    private fetchAdoFeature;
    /**
     * Find story by title pattern
     */
    private findStoryByTitle;
    /**
     * Create ADO User Story
     */
    private createStory;
    /**
     * Update ADO User Story
     */
    private updateStory;
}
//# sourceMappingURL=ado-spec-sync.d.ts.map