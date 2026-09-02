import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { migrateLimits } from '../../../../src/core/config/limits-migrator.js';
import { ConfigManager } from '../../../../src/core/config/config-manager.js';

describe('migrateLimits', () => {
  it('returns false and leaves config untouched when no limits block', () => {
    const cfg: Record<string, unknown> = { version: '2.0' };
    expect(migrateLimits(cfg)).toBe(false);
    expect(cfg).toEqual({ version: '2.0' });
  });

  it('returns false for already-migrated limits', () => {
    const cfg: Record<string, unknown> = { limits: { activeIncrements: 2 } };
    expect(migrateLimits(cfg)).toBe(false);
    expect(cfg.limits).toEqual({ activeIncrements: 2 });
  });

  it('maps maxActiveIncrements to activeIncrements and drops 1.x keys', () => {
    const cfg: Record<string, unknown> = {
      limits: {
        maxActiveIncrements: 4,
        hardCap: 6,
        allowEmergencyInterrupt: true,
        typeBehaviors: { canInterrupt: ['hotfix'] },
        staleness: { paused: 7 },
        originalHardCap: 2,
        wipAdjustedAt: '2026-01-01',
      },
    };
    expect(migrateLimits(cfg)).toBe(true);
    expect(cfg.limits).toEqual({ activeIncrements: 4 });
  });

  it('keeps an explicit activeIncrements over legacy maxActiveIncrements', () => {
    const cfg: Record<string, unknown> = { limits: { activeIncrements: 1, maxActiveIncrements: 9, hardCap: 3 } };
    expect(migrateLimits(cfg)).toBe(true);
    expect(cfg.limits).toEqual({ activeIncrements: 1 });
  });
});

describe('ConfigManager limits migration (one-shot)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'limits-migration-'));
    mkdirSync(join(root, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('rewrites the file once, preserving other keys and not injecting defaults', () => {
    const configPath = join(root, '.specweave', 'config.json');
    writeFileSync(configPath, JSON.stringify({
      version: '2.0',
      project: { name: 'x' },
      limits: { maxActiveIncrements: 2, hardCap: 4 },
    }, null, 2));

    const cfg = new ConfigManager(root).readSync();
    expect(cfg.limits).toEqual({ activeIncrements: 2 });

    const written = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(written).toEqual({ version: '2.0', project: { name: 'x' }, limits: { activeIncrements: 2 } });

    // Second read: already migrated → file must not be rewritten
    const before = statSync(configPath).mtimeMs;
    const again = new ConfigManager(root).readSync();
    expect(again.limits).toEqual({ activeIncrements: 2 });
    expect(statSync(configPath).mtimeMs).toBe(before);
    expect(readFileSync(configPath, 'utf-8')).toBe(JSON.stringify(written, null, 2));
  });

  it('does not touch a file with no legacy keys', () => {
    const configPath = join(root, '.specweave', 'config.json');
    const raw = JSON.stringify({ version: '2.0', limits: { activeIncrements: 5 } });
    writeFileSync(configPath, raw);
    new ConfigManager(root).readSync();
    expect(readFileSync(configPath, 'utf-8')).toBe(raw);
  });
});
