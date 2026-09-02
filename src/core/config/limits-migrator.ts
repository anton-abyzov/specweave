/**
 * One-shot migration of the 1.x `limits` block to the 2.0 advisory shape.
 *
 * 1.x: { maxActiveIncrements, hardCap, allowEmergencyInterrupt, typeBehaviors, staleness,
 *        originalHardCap, wipAdjustedAt }
 * 2.0: { activeIncrements }   (advisory; 0 = off)
 *
 * Pure: returns whether anything changed so callers only rewrite the file when needed.
 */

const LEGACY_LIMIT_KEYS = [
  'maxActiveIncrements',
  'hardCap',
  'allowEmergencyInterrupt',
  'typeBehaviors',
  'staleness',
  'originalHardCap',
  'wipAdjustedAt',
] as const;

export function migrateLimits(config: Record<string, unknown>): boolean {
  const limits = config.limits;
  if (!limits || typeof limits !== 'object' || Array.isArray(limits)) {
    return false;
  }
  const raw = limits as Record<string, unknown>;
  let changed = false;

  if (raw.activeIncrements === undefined && typeof raw.maxActiveIncrements === 'number') {
    raw.activeIncrements = raw.maxActiveIncrements;
    changed = true;
  }

  for (const key of LEGACY_LIMIT_KEYS) {
    if (key in raw) {
      delete raw[key];
      changed = true;
    }
  }

  return changed;
}
