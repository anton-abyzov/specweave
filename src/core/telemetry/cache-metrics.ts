/**
 * Cache hit/miss telemetry for SpecWeave prompt caching (0669 Wave 5 / AC-US3-06).
 *
 * Tracks per-skill cache hit rates. Data lives in memory (process lifetime).
 * Future: persist to .specweave/metrics/ or emit to analytics endpoint.
 */

interface SkillCacheMetrics {
  hits: number;
  misses: number;
  tokensFromCache: number;
}

const metricsStore = new Map<string, SkillCacheMetrics>();

function ensureEntry(skillName: string): SkillCacheMetrics {
  if (!metricsStore.has(skillName)) {
    metricsStore.set(skillName, { hits: 0, misses: 0, tokensFromCache: 0 });
  }
  return metricsStore.get(skillName)!;
}

/**
 * Record a cache hit for a skill invocation.
 * @param skillName  The skill's fully-qualified name (e.g. "sw/grill")
 * @param tokens     Number of tokens read from cache on this hit
 */
export function recordCacheHit(skillName: string, tokens = 0): void {
  const entry = ensureEntry(skillName);
  entry.hits += 1;
  entry.tokensFromCache += tokens;
}

/**
 * Record a cache miss for a skill invocation (cold start or invalidated cache).
 */
export function recordCacheMiss(skillName: string): void {
  const entry = ensureEntry(skillName);
  entry.misses += 1;
}

/**
 * Get the cache hit rate for a skill as a number between 0 and 1.
 * Returns 0 if no data exists for the skill.
 */
export function getCacheHitRate(skillName: string): number {
  const entry = metricsStore.get(skillName);
  if (!entry) return 0;
  const total = entry.hits + entry.misses;
  if (total === 0) return 0;
  return entry.hits / total;
}

/**
 * Get a snapshot of all metrics. Useful for `sw:analytics --cache-stats`.
 */
export function getAllMetrics(): Record<string, SkillCacheMetrics & { hitRate: number }> {
  const result: Record<string, SkillCacheMetrics & { hitRate: number }> = {};
  for (const [name, m] of metricsStore.entries()) {
    result[name] = { ...m, hitRate: getCacheHitRate(name) };
  }
  return result;
}

/**
 * Reset metrics for a skill. Primarily for testing.
 */
export function clearMetrics(skillName?: string): void {
  if (skillName) {
    metricsStore.delete(skillName);
  } else {
    metricsStore.clear();
  }
}
