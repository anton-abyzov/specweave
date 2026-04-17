#!/usr/bin/env node
/**
 * Config migration for Opus 4.7 alignment (increment 0669).
 *
 * Adds the four new config knobs introduced in Wave 2 to an existing
 * `.specweave/config.json` without overwriting user-customized values.
 * Creates a `.bak-0669` backup before mutating so users can revert.
 *
 * Usage:
 *   node scripts/migrate-config-0669.ts path/to/.specweave/config.json
 *
 * Idempotent — running twice produces the same result.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

type Primitive = string | number | boolean;
type DefaultValue = Primitive | unknown[] | Record<string, unknown>;

interface DefaultEntry {
  section: string;
  key: string;
  value: DefaultValue;
}

const DEFAULTS: DefaultEntry[] = [
  { section: 'quality', key: 'thinkingBudget', value: 'xhigh' },
  { section: 'quality', key: 'grillConfidenceThreshold', value: 50 },
  {
    section: 'quality',
    key: 'tokenBudgets',
    value: { 'pm.interview': 1500, 'brainstorm.idea': 1800 },
  },
  {
    section: 'cache',
    key: 'staticContextFiles',
    value: [
      'CLAUDE.md',
      '.specweave/config.json',
      '.specweave/increments/<active>/spec.md',
      '.specweave/increments/<active>/rubric.md',
    ],
  },
];

export interface MigrateResult {
  changed: boolean;
  keysAdded: string[];
}

export function migrateConfig(configPath: string): MigrateResult {
  if (!existsSync(configPath)) {
    return { changed: false, keysAdded: [] };
  }

  const backupPath = `${configPath}.bak-0669`;
  if (!existsSync(backupPath)) {
    copyFileSync(configPath, backupPath);
  }

  const raw = readFileSync(configPath, 'utf-8');
  const config: Record<string, Record<string, unknown>> = JSON.parse(raw);
  const keysAdded: string[] = [];

  for (const entry of DEFAULTS) {
    if (!config[entry.section] || typeof config[entry.section] !== 'object') {
      config[entry.section] = {};
    }
    const section = config[entry.section];
    if (section[entry.key] === undefined) {
      section[entry.key] = entry.value;
      keysAdded.push(`${entry.section}.${entry.key}`);
    }
  }

  if (keysAdded.length > 0) {
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  }

  return { changed: keysAdded.length > 0, keysAdded };
}

const invokedPath = process.argv[1] ?? '';
if (invokedPath.endsWith('migrate-config-0669.ts') || invokedPath.endsWith('migrate-config-0669.js')) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: migrate-config-0669 <path-to-config.json>');
    process.exit(1);
  }
  const result = migrateConfig(resolve(target));
  console.log(
    result.changed ? `Added keys: ${result.keysAdded.join(', ')}` : 'No changes needed'
  );
}
