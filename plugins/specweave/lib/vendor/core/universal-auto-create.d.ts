/**
 * Universal Auto-Create for External Tools
 *
 * Creates per-user-story items in ALL enabled providers (JIRA, ADO).
 * GitHub is handled separately by the existing github-auto-create-handler.sh.
 *
 * Called by universal-auto-create-dispatcher.sh when spec.md is written.
 *
 * @module universal-auto-create
 */
export interface UniversalAutoCreateConfig {
    sync: {
        jira?: {
            enabled?: boolean;
        };
        ado?: {
            enabled?: boolean;
        };
    };
    jira?: {
        domain?: string;
        projectKey?: string;
    };
    ado?: {
        organization?: string;
        project?: string;
    };
}
export interface UserStoryInfo {
    id: string;
    title: string;
}
export interface ProviderCreateResult {
    created: Array<{
        usId: string;
        ref: string;
        url: string;
    }>;
    skipped: Array<{
        usId: string;
        reason: string;
    }>;
    errors: Array<{
        usId: string;
        error: string;
    }>;
}
export type UniversalAutoCreateResult = {
    jira?: ProviderCreateResult;
    ado?: ProviderCreateResult;
};
/**
 * Parse user stories (ID + title) from spec.md content.
 * Matches patterns like "### US-001: User story title"
 */
export declare function parseUserStories(content: string): UserStoryInfo[];
/**
 * Create per-user-story items in JIRA and/or ADO for an increment.
 *
 * GitHub is NOT handled here (delegated to existing bash handler).
 * This function is called by the universal-auto-create-dispatcher.sh.
 */
export declare function createExternalIssuesForIncrement(incrementId: string, specPath: string, metadataPath: string, config: UniversalAutoCreateConfig): Promise<UniversalAutoCreateResult>;
//# sourceMappingURL=universal-auto-create.d.ts.map