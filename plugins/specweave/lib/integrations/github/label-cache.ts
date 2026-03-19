/**
 * Session-level label cache for GitHub sync.
 *
 * Avoids redundant `gh label create --force` calls within a single sync session.
 * Keyed by `owner/repo` to prevent cross-repo contamination.
 *
 * @module label-cache
 */

import { execFileNoThrow } from '../../vendor/utils/execFileNoThrow.js';

/** Map<repoSlug, Set<labelName>> */
const labelCache = new Map<string, Set<string>>();

/**
 * Ensure labels exist in the target repo, skipping those already created
 * in this session.
 *
 * @param repo - Repo slug in "owner/repo" format
 * @param labels - Label names to ensure
 * @param env - Environment object (should include GH_TOKEN)
 */
export async function ensureLabels(
  repo: string,
  labels: string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  if (!labelCache.has(repo)) {
    labelCache.set(repo, new Set());
  }
  const cached = labelCache.get(repo)!;

  for (const label of labels) {
    if (cached.has(label)) {
      continue;
    }
    // Mark as cached before the call — we cache on attempt, not on success,
    // because `--force` is idempotent and a failed create shouldn't cause
    // infinite retries.
    cached.add(label);

    await execFileNoThrow('gh', [
      'label', 'create', label,
      '--repo', repo,
      '--color', 'ededed',
      '--description', 'SpecWeave auto-label',
      '--force',
    ], { env });
  }
}

/**
 * Clear the label cache (for testing or between sync sessions).
 */
export function clearLabelCache(): void {
  labelCache.clear();
}
