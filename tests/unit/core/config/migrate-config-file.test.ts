/**
 * On-disk 1.x → 2.0 config migration (src/core/config/migrate-config-file.ts).
 *
 * The migrator itself was correct; nothing that a user runs during an upgrade
 * ever reached it. These tests pin the file-level contract every command now
 * shares: rewrite once, record a note, then do nothing on a second pass.
 *
 * @module tests/unit/core/config/migrate-config-file
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrateConfigFile } from '../../../../src/core/config/migrate-config-file.js';

let dir: string;

const configPath = () => path.join(dir, '.specweave', 'config.json');
const notePath = () => path.join(dir, '.specweave', 'state', 'config-migration-2.json');

function writeConfig(config: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-migrate-config-file-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('migrateConfigFile', () => {
  it('rewrites a 1.x config and records the dropped keys', () => {
    writeConfig({
      version: '1.0',
      project: { name: 'legacy' },
      banner: { enabled: true },
      reflect: { enabled: true },
      contextBudget: { maxTokens: 1 },
      testing: { defaultTestMode: 'TDD' },
    });

    const result = migrateConfigFile(dir);

    expect(result.ran).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.removedKeys).toEqual(expect.arrayContaining(['banner', 'reflect', 'contextBudget']));
    expect(result.sectionsAdded).toEqual(['auto']);

    const written = JSON.parse(fs.readFileSync(configPath(), 'utf-8'));
    expect(written.version).toBe('2.0');
    expect(written.banner).toBeUndefined();
    expect(written.reflect).toBeUndefined();
    expect(written.testing).toEqual({ mode: 'TDD' });

    const note = JSON.parse(fs.readFileSync(notePath(), 'utf-8'));
    expect(note.from).toBe('1.0');
    expect(note.to).toBe('2.0');
    expect(note.removedKeys).toContain('banner');
  });

  it('is a no-op on a second run', () => {
    writeConfig({ version: '1.0', project: { name: 'legacy' }, quality: {} });
    migrateConfigFile(dir);
    const first = fs.readFileSync(configPath(), 'utf-8');

    const second = migrateConfigFile(dir);

    expect(second.changed).toBe(false);
    expect(second.removedKeys).toEqual([]);
    expect(fs.readFileSync(configPath(), 'utf-8')).toBe(first);
  });

  it('writes nothing in dry-run mode', () => {
    writeConfig({ version: '1.0', project: { name: 'legacy' }, cache: {} });
    const before = fs.readFileSync(configPath(), 'utf-8');

    const result = migrateConfigFile(dir, { dryRun: true });

    expect(result.changed).toBe(true);
    expect(result.removedKeys).toContain('cache');
    expect(fs.readFileSync(configPath(), 'utf-8')).toBe(before);
    expect(fs.existsSync(notePath())).toBe(false);
  });

  it('leaves an unparseable config alone', () => {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), '{ not json');

    const result = migrateConfigFile(dir);

    expect(result.ran).toBe(false);
    expect(result.changed).toBe(false);
    expect(fs.readFileSync(configPath(), 'utf-8')).toBe('{ not json');
  });

  it('reports ran:false when there is no config at all', () => {
    expect(migrateConfigFile(dir)).toMatchObject({ ran: false, changed: false });
  });
});
