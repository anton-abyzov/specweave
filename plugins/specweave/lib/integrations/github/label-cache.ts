/**
 * Persistent label cache for GitHub sync.
 *
 * Avoids redundant `gh label create --force` calls across CLI invocations.
 * Keyed by `owner/repo` to prevent cross-repo contamination.
 *
 * Persistence: When setLabelCacheDir() is called, labels are loaded from
 * and saved to `.specweave/state/github-label-cache.json`. Cache entries
 * older than 24h are ignored on load.
 *
 * @module label-cache
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { execFileNoThrow } from '../../vendor/utils/execFileNoThrow.js';

/** Map<repoSlug, Set<labelName>> */
const labelCache = new Map<string, Set<string>>();

/** Disk persistence state */
let diskCachePath: string | null = null;
let diskLoaded = false;

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DiskCacheEntry {
  labels: string[];
  cachedAt: string;
}

type DiskCache = Record<string, DiskCacheEntry>;

/**
 * Configure disk persistence directory.
 * Call this before ensureLabels() to enable cross-session caching.
 *
 * @param stateDir - Path to .specweave/state/ directory
 */
export function setLabelCacheDir(stateDir: string): void {
  diskCachePath = path.join(stateDir, 'github-label-cache.json');
  diskLoaded = false;
}

/**
 * Load labels from disk cache into memory.
 * Only loads once per session; skips entries older than 24h.
 */
function loadFromDisk(): void {
  if (diskLoaded || !diskCachePath) return;
  diskLoaded = true;

  if (!existsSync(diskCachePath)) return;

  try {
    const raw = readFileSync(diskCachePath, 'utf-8');
    const data: DiskCache = JSON.parse(raw);

    for (const [repo, entry] of Object.entries(data)) {
      const age = Date.now() - new Date(entry.cachedAt).getTime();
      if (age >= CACHE_MAX_AGE_MS) continue; // Stale — skip

      if (!labelCache.has(repo)) {
        labelCache.set(repo, new Set());
      }
      const cached = labelCache.get(repo)!;
      for (const label of entry.labels) {
        cached.add(label);
      }
    }
  } catch {
    // Corrupted cache file — ignore and start fresh
  }
}

/**
 * Persist current in-memory cache to disk.
 * Non-blocking — write failures are silently ignored.
 */
function saveToDisk(): void {
  if (!diskCachePath) return;

  try {
    const dir = path.dirname(diskCachePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data: DiskCache = {};
    for (const [repo, labels] of labelCache) {
      data[repo] = {
        labels: [...labels],
        cachedAt: new Date().toISOString(),
      };
    }

    writeFileSync(diskCachePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Non-blocking — disk save failure shouldn't break sync
  }
}

/**
 * Ensure labels exist in the target repo, skipping those already created
 * in this session or found in disk cache.
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
  // Load from disk on first access
  loadFromDisk();

  if (!labelCache.has(repo)) {
    labelCache.set(repo, new Set());
  }
  const cached = labelCache.get(repo)!;

  let created = false;
  for (const label of labels) {
    if (cached.has(label)) {
      continue;
    }
    // Mark as cached before the call — we cache on attempt, not on success,
    // because `--force` is idempotent and a failed create shouldn't cause
    // infinite retries.
    cached.add(label);
    created = true;

    await execFileNoThrow('gh', [
      'label', 'create', label,
      '--repo', repo,
      '--color', 'ededed',
      '--description', 'SpecWeave auto-label',
      '--force',
    ], { env });
  }

  // Persist to disk after creating new labels
  if (created) {
    saveToDisk();
  }
}

/**
 * Clear the label cache (for testing or between sync sessions).
 */
export function clearLabelCache(): void {
  labelCache.clear();
  diskCachePath = null;
  diskLoaded = false;
}
