/**
 * GitHub Hierarchical Sync Implementation
 *
 * Supports three sync strategies:
 * 1. Simple: One repository, all issues (backward compatible)
 * 2. Filtered: Multiple repositories + project boards + filters
 * 3. Custom: Raw GitHub search query
 */
import { SyncProfile, SyncContainer } from '../../../src/core/types/sync-profile.js';
import { GitHubIssue } from './types.js';
/**
 * Build hierarchical GitHub search query from containers
 *
 * Example output:
 * repo:owner/repo-a repo:owner/repo-b is:issue label:feature milestone:"v2.0" created:2024-01-01..2024-12-31
 *
 * @param containers Array of containers (repos) with filters
 * @returns GitHub search query string
 */
export declare function buildHierarchicalSearchQuery(containers: SyncContainer[]): Promise<string>;
/**
 * Fetch issues hierarchically based on sync strategy
 *
 * @param profile Sync profile with strategy
 * @param timeRange Time range preset
 * @returns Array of GitHub issues
 */
export declare function fetchIssuesHierarchical(profile: SyncProfile, timeRange?: string): Promise<GitHubIssue[]>;
//# sourceMappingURL=github-hierarchical-sync.d.ts.map