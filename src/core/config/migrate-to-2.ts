/**
 * One-shot 1.x → 2.0 config migration.
 *
 * Runs on every load, but only ever reports `changed: true` when it actually
 * rewrote something, so callers persist the file at most once. Composes the
 * `limits` migration (limits-migrator.ts) so a config makes exactly one pass.
 *
 * What it does:
 * - limits.maxActiveIncrements → limits.activeIncrements (advisory), legacy
 *   limit keys dropped                                    [limits-migrator]
 * - testing.defaultTestMode  → testing.mode
 *   testing.coverageTargets  → testing.coverage
 *   testing.{defaultCoverageTarget,tddEnforcement,playwright} dropped
 * - hooks.*.sync_living_docs → livingDocs: 'onDone' | false
 * - planning.deepInterview.{enabled,enforcement} → planning.deepInterview: 'off' | 'warn'
 * - sync.mode dropped (the queued event queue is gone)
 * - dead 1.x keys deleted outright (see DEAD_KEYS)
 *
 * Deleted keys are recorded in `.specweave/state/config-migration-2.json` so a
 * user can see what was dropped without digging through git history.
 *
 * @module core/config/migrate-to-2
 */

import { migrateLimits } from './limits-migrator.js';

/**
 * 1.x keys with no reader in 2.0. Removed without replacement.
 *
 * `banner` is a *hook* sub-key rather than a top-level one; it is handled
 * separately because the UserPromptSubmit banner hook no longer exists.
 */
export const DEAD_KEYS = [
  'contextBudget',
  'quality',
  'cache',
  'deduplication',
  'archiving',
  'apiDocs',
  'statusLine',
  'incrementAssist',
  'billing',
  'translation',
  'language',
  'documentation',
  'reflect',
  'pluginAutoLoad',
  'grill',
  'codeReview',
  'qualityGates',
  'skillGen',
] as const;

/** Sub-keys of `hooks` that 2.0 no longer honours. */
const DEAD_HOOK_KEYS = ['banner', 'post_increment_planning', 'post_task_completion'] as const;

/** Sub-keys of `testing` that 2.0 no longer honours (after the renames). */
const DEAD_TESTING_KEYS = ['defaultTestMode', 'defaultCoverageTarget', 'coverageTargets', 'tddEnforcement', 'playwright'] as const;

export interface MigrationNote {
  migratedAt: string;
  from: string;
  to: string;
  removedKeys: string[];
  renamedKeys: string[];
}

export interface MigrateResult {
  /** True when the raw config object was modified and should be rewritten. */
  changed: boolean;
  /** Top-level (or dotted) keys deleted by this pass. */
  removedKeys: string[];
  /** `old → new` descriptions of every rename this pass performed. */
  renamedKeys: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Migrate a raw parsed config object in place.
 *
 * Idempotent: running it twice on the same object reports `changed: false`
 * the second time.
 */
export function migrateTo2(config: Record<string, unknown>): MigrateResult {
  const removedKeys: string[] = [];
  const renamedKeys: string[] = [];
  let changed = false;

  // limits.* (advisory WIP) — shared with the standalone migrator so a config
  // is never rewritten twice for the same reason.
  if (migrateLimits(config)) {
    changed = true;
    renamedKeys.push('limits.maxActiveIncrements → limits.activeIncrements');
  }

  // testing.* renames
  if (isPlainObject(config.testing)) {
    const t = config.testing;
    if (t.mode === undefined && typeof t.defaultTestMode === 'string') {
      t.mode = t.defaultTestMode;
      renamedKeys.push('testing.defaultTestMode → testing.mode');
    }
    if (t.coverage === undefined && isPlainObject(t.coverageTargets)) {
      t.coverage = t.coverageTargets;
      renamedKeys.push('testing.coverageTargets → testing.coverage');
    }
    for (const key of DEAD_TESTING_KEYS) {
      if (key in t) {
        delete t[key];
        removedKeys.push(`testing.${key}`);
        changed = true;
      }
    }
  }

  // hooks.*.sync_living_docs → livingDocs
  if (isPlainObject(config.hooks)) {
    const hooks = config.hooks;
    const done = isPlainObject(hooks.post_increment_done) ? hooks.post_increment_done : undefined;
    const planned = isPlainObject(hooks.post_increment_planning) ? hooks.post_increment_planning : undefined;
    const wanted = done?.sync_living_docs === true || planned?.sync_living_docs === true;

    if (config.livingDocs === undefined && wanted) {
      config.livingDocs = 'onDone';
      renamedKeys.push('hooks.*.sync_living_docs → livingDocs: "onDone"');
      changed = true;
    }
    if (done && 'sync_living_docs' in done) {
      delete done.sync_living_docs;
      removedKeys.push('hooks.post_increment_done.sync_living_docs');
      changed = true;
    }
    for (const key of DEAD_HOOK_KEYS) {
      if (key in hooks) {
        delete hooks[key];
        removedKeys.push(`hooks.${key}`);
        changed = true;
      }
    }
    if (Object.keys(hooks).length === 0) {
      delete config.hooks;
      changed = true;
    }
  }

  // planning.deepInterview: object → 'off' | 'warn'
  if (isPlainObject(config.planning)) {
    const planning = config.planning;
    const di = planning.deepInterview;
    if (isPlainObject(di)) {
      planning.deepInterview = di.enabled === true ? 'warn' : 'off';
      renamedKeys.push('planning.deepInterview.{enabled,enforcement} → planning.deepInterview enum');
      changed = true;
    } else if (di !== undefined && di !== 'off' && di !== 'warn') {
      // 'strict' (or anything unrecognised) downgrades: 2.0 never blocks a write.
      planning.deepInterview = 'warn';
      renamedKeys.push(`planning.deepInterview "${String(di)}" → "warn"`);
      changed = true;
    }
  }

  // sync.mode — the queued event queue was removed in 2.0.
  if (isPlainObject(config.sync) && 'mode' in config.sync) {
    delete config.sync.mode;
    removedKeys.push('sync.mode');
    changed = true;
  }

  // Dead top-level keys.
  for (const key of DEAD_KEYS) {
    if (key in config) {
      delete config[key];
      removedKeys.push(key);
      changed = true;
    }
  }

  // Everything above may have produced renames without deletions.
  if (renamedKeys.length > 0) changed = true;

  if (changed && config.version !== '2.0') {
    config.version = '2.0';
  }

  return { changed, removedKeys, renamedKeys };
}

/** Build the note written to `.specweave/state/config-migration-2.json`. */
export function buildMigrationNote(result: MigrateResult, fromVersion: string): MigrationNote {
  return {
    migratedAt: new Date().toISOString(),
    from: fromVersion || 'unknown',
    to: '2.0',
    removedKeys: result.removedKeys,
    renamedKeys: result.renamedKeys,
  };
}

/**
 * Top-level keys present in `config` that 2.0 does not know about.
 * Used for the single warning line printed on load.
 */
export function unknownKeys(config: Record<string, unknown>, known: readonly string[]): string[] {
  return Object.keys(config).filter(
    (k) => !known.includes(k) && k !== 'umbrella' && k !== 'multiProject' && k !== 'projectMappings',
  );
}
