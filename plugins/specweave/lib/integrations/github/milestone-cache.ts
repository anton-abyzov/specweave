/**
 * Session-level milestone cache for GitHub sync.
 *
 * Avoids redundant milestone lookup/creation API calls within a single
 * sync session. Keyed by `owner/repo:title` to prevent cross-repo
 * contamination.
 *
 * @module milestone-cache
 */

import { execFileNoThrow } from '../../vendor/utils/execFileNoThrow.js';

interface CachedMilestone {
  number: number;
  url: string;
}

/** Map<"owner/repo:title", CachedMilestone> */
const milestoneCache = new Map<string, CachedMilestone>();

export class MilestoneCache {
  /**
   * Get an existing milestone or create a new one, with session caching.
   *
   * @param owner - Repo owner
   * @param repo - Repo name
   * @param title - Milestone title
   * @param description - Milestone description (used only for creation)
   * @param env - Environment object (should include GH_TOKEN)
   * @returns Milestone number and URL
   */
  static async getOrCreate(
    owner: string,
    repo: string,
    title: string,
    description: string,
    env: NodeJS.ProcessEnv,
  ): Promise<CachedMilestone> {
    const cacheKey = `${owner}/${repo}:${title}`;

    const cached = milestoneCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Lookup existing milestone
    const existingResult = await execFileNoThrow('gh', [
      'api',
      `repos/${owner}/${repo}/milestones?per_page=100&state=all`,
      '--paginate',
      '--jq',
      `.[] | select(.title == "${title}") | {number, html_url}`,
    ], { env });

    if (existingResult.exitCode === 0 && existingResult.stdout.trim()) {
      const existing = JSON.parse(existingResult.stdout);
      const result: CachedMilestone = {
        number: existing.number,
        url: existing.html_url,
      };
      milestoneCache.set(cacheKey, result);
      return result;
    }

    // Create new milestone
    const createResult = await execFileNoThrow('gh', [
      'api',
      `repos/${owner}/${repo}/milestones`,
      '-X', 'POST',
      '-f', `title=${title}`,
      '-f', `description=${description}`,
      '-f', 'state=open',
    ], { env });

    if (createResult.exitCode !== 0) {
      throw new Error(`Failed to create Milestone: ${createResult.stderr || createResult.stdout}`);
    }

    const milestone = JSON.parse(createResult.stdout);
    const result: CachedMilestone = {
      number: milestone.number,
      url: milestone.html_url,
    };
    milestoneCache.set(cacheKey, result);
    return result;
  }
}

/**
 * Clear the milestone cache (for testing or between sync sessions).
 */
export function clearMilestoneCache(): void {
  milestoneCache.clear();
}
