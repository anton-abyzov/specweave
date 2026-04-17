/**
 * Tests for scripts/migrate-config-0669.ts (0669 Wave 2c, T-039/T-040)
 *
 * Behavior under test:
 * - Adds missing Opus 4.7 keys (quality.thinkingBudget, cache.staticContextFiles,
 *   quality.grillConfidenceThreshold, quality.tokenBudgets) with defaults.
 * - Idempotent: running twice produces the same config.
 * - Creates `.bak-0669` backup before mutating so users can revert.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { migrateConfig } from '../../../scripts/migrate-config-0669.js';

let sandboxDir: string;
let configPath: string;

beforeEach(() => {
  sandboxDir = mkdtempSync(join(tmpdir(), 'migrate-config-0669-'));
  configPath = join(sandboxDir, 'config.json');
});

afterEach(() => {
  rmSync(sandboxDir, { recursive: true, force: true });
});

describe('migrate-config-0669', () => {
  it('adds missing keys with defaults to an existing config', () => {
    writeFileSync(configPath, JSON.stringify({ version: '2.0' }, null, 2));

    const result = migrateConfig(configPath);

    expect(result.changed).toBe(true);
    expect(result.keysAdded).toContain('quality.thinkingBudget');
    expect(result.keysAdded).toContain('cache.staticContextFiles');

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(config.quality.thinkingBudget).toBe('xhigh');
    expect(config.quality.grillConfidenceThreshold).toBe(50);
    expect(Array.isArray(config.cache.staticContextFiles)).toBe(true);
  });

  it('is idempotent — running twice produces same result', () => {
    writeFileSync(configPath, JSON.stringify({ version: '2.0' }, null, 2));

    const firstRun = migrateConfig(configPath);
    const afterFirst = readFileSync(configPath, 'utf-8');

    const secondRun = migrateConfig(configPath);
    const afterSecond = readFileSync(configPath, 'utf-8');

    expect(firstRun.changed).toBe(true);
    expect(secondRun.changed).toBe(false);
    expect(secondRun.keysAdded).toEqual([]);
    expect(afterFirst).toBe(afterSecond);
  });

  it('creates a .bak-0669 backup before mutating', () => {
    writeFileSync(configPath, JSON.stringify({ version: '2.0' }, null, 2));
    const originalContent = readFileSync(configPath, 'utf-8');

    migrateConfig(configPath);

    const backupPath = `${configPath}.bak-0669`;
    expect(existsSync(backupPath)).toBe(true);
    expect(readFileSync(backupPath, 'utf-8')).toBe(originalContent);
  });

  it('preserves user-customized values for existing keys', () => {
    writeFileSync(
      configPath,
      JSON.stringify(
        { version: '2.0', quality: { thinkingBudget: 'low' } },
        null,
        2
      )
    );

    migrateConfig(configPath);

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(config.quality.thinkingBudget).toBe('low');
    expect(config.quality.grillConfidenceThreshold).toBe(50);
  });

  it('returns no changes and no backup when config file is missing', () => {
    const missingPath = join(sandboxDir, 'does-not-exist.json');
    const result = migrateConfig(missingPath);
    expect(result.changed).toBe(false);
    expect(existsSync(`${missingPath}.bak-0669`)).toBe(false);
  });
});
