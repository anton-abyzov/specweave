/**
 * On-disk one-shot 1.x → 2.0 migration of `.specweave/config.json`.
 *
 * `ConfigManager.read()` migrates whatever it happens to load, but the two
 * commands the docs tell an upgrading user to run (`specweave update`, then
 * `specweave doctor`) never went through it, so a 1.x config survived the
 * documented upgrade untouched. This is the shared, command-facing entry point:
 * it rewrites config.json in place, records the dropped/renamed keys in
 * `.specweave/state/config-migration-2.json`, and is a no-op on a second run.
 *
 * @module core/config/migrate-config-file
 */

import * as fs from 'fs';
import * as path from 'path';
import { migrateTo2, buildMigrationNote } from './migrate-to-2.js';
import { CONFIG_SCHEMA_VERSION } from './schema-version.js';

/**
 * Default autonomous-run settings added to configs predating `auto` (1.0.131+).
 * Part of the 2.0 config shape, so it is added during the same single pass.
 */
export const DEFAULT_AUTO_CONFIG = {
  enabled: true,
  maxIterations: 2500,
  maxRetries: 20,
  requireTests: false,
  requireValidation: true,
  requireJudgeLLM: false,
};

export interface ConfigFileMigrationResult {
  /** False when there is no config.json, or it could not be parsed. */
  ran: boolean;
  /** True when config.json was rewritten by this call. */
  changed: boolean;
  /** Keys deleted outright. */
  removedKeys: string[];
  /** `old → new` rename descriptions. */
  renamedKeys: string[];
  /** Missing 2.0 sections filled in (currently only `auto`). */
  sectionsAdded: string[];
  /** Path of the note written, when one was written. */
  notePath?: string;
}

const EMPTY: ConfigFileMigrationResult = {
  ran: false,
  changed: false,
  removedKeys: [],
  renamedKeys: [],
  sectionsAdded: [],
};

/**
 * Migrate `<projectRoot>/.specweave/config.json` to the 2.0 shape.
 *
 * Idempotent: a second call on an already-migrated file reports
 * `changed: false` and rewrites nothing.
 *
 * @param projectRoot - Project root containing `.specweave/`
 * @param options.dryRun - Report what would change without writing
 */
export function migrateConfigFile(
  projectRoot: string,
  options: { dryRun?: boolean } = {}
): ConfigFileMigrationResult {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) return { ...EMPTY };

  let parsed: Record<string, unknown>;
  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf-8');
    const value = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ...EMPTY };
    parsed = value as Record<string, unknown>;
  } catch {
    // A config we cannot parse is left alone — `specweave doctor` reports it.
    return { ...EMPTY };
  }

  const fromVersion = typeof parsed.version === 'string' ? parsed.version : '';
  const migration = migrateTo2(parsed);

  const sectionsAdded: string[] = [];
  if (parsed.auto === undefined) {
    parsed.auto = { ...DEFAULT_AUTO_CONFIG };
    sectionsAdded.push('auto');
  }

  const changed = migration.changed || sectionsAdded.length > 0;
  const result: ConfigFileMigrationResult = {
    ran: true,
    changed,
    removedKeys: migration.removedKeys,
    renamedKeys: migration.renamedKeys,
    sectionsAdded,
  };

  if (!changed || options.dryRun) return result;

  if (parsed.version === undefined) parsed.version = CONFIG_SCHEMA_VERSION;
  fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');

  if (migration.removedKeys.length > 0 || migration.renamedKeys.length > 0) {
    const notePath = path.join(projectRoot, '.specweave', 'state', 'config-migration-2.json');
    try {
      fs.mkdirSync(path.dirname(notePath), { recursive: true });
      fs.writeFileSync(
        notePath,
        JSON.stringify(buildMigrationNote(migration, fromVersion), null, 2) + '\n',
        'utf-8'
      );
      result.notePath = notePath;
    } catch {
      // The note is informational — never fail the migration over it.
    }
  }

  return result;
}
