/**
 * Story Router
 *
 * Routes user stories to repos by prefix matching.
 * Format: US-{PREFIX}-{NUM} → matches repo with that prefix.
 * Falls back to first repo (or custom default) when no match.
 */

import type { ChildRepoConfig } from '../core/config/types.js';

export interface StoryRoutingResult {
  /** Matched repo ID, or null if no repos available */
  repoId: string | null;
  /** Whether routing was an explicit prefix match */
  matched: boolean;
  /** Reason for routing decision (useful for debugging) */
  reason: string;
}

/**
 * Extract prefix from a user story ID.
 *
 * Supports: US-FE-001, US-SHARED-042, us-be-007 (case-insensitive)
 * Returns null for: US-001 (no prefix), STORY-123 (wrong format)
 *
 * @param storyId - The story identifier (e.g., "US-FE-001")
 * @returns Extracted prefix in uppercase, or null
 */
export function extractPrefix(storyId: string): string | null {
  if (!storyId) return null;

  // Match US-{PREFIX}-{NUM} where PREFIX is 2-6 letters
  const match = storyId.match(/^US-([A-Za-z]{2,6})-\d+/i);
  if (!match) return null;

  return match[1].toUpperCase();
}

/**
 * Route a user story to a repo by prefix matching.
 *
 * @param storyId - Story identifier (e.g., "US-FE-001")
 * @param childRepos - Available repos with prefix config
 * @param defaultRepoId - Optional explicit default repo ID
 * @returns Routing result with repoId, matched flag, and reason
 */
export function routeByPrefix(
  storyId: string,
  childRepos: ChildRepoConfig[],
  defaultRepoId?: string,
): StoryRoutingResult {
  if (childRepos.length === 0) {
    return { repoId: null, matched: false, reason: 'No repos configured' };
  }

  const fallbackId = defaultRepoId
    ? (childRepos.find(r => r.id === defaultRepoId)?.id ?? childRepos[0].id)
    : childRepos[0].id;

  const prefix = extractPrefix(storyId);

  if (!prefix) {
    return { repoId: fallbackId, matched: false, reason: 'No prefix in story ID' };
  }

  // Try exact prefix match
  const matched = childRepos.find(r => r.prefix && r.prefix.toUpperCase() === prefix);
  if (matched) {
    return { repoId: matched.id, matched: true, reason: `Matched prefix ${prefix}` };
  }

  return {
    repoId: fallbackId,
    matched: false,
    reason: `Unknown prefix "${prefix}" — using default`,
  };
}
