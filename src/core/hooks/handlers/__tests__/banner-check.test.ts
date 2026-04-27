import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Hoisted mock so banner-check imports `runDoctor` from this fake module.
// Must be declared BEFORE the import of banner-check.
const { runDoctor } = vi.hoisted(() => ({ runDoctor: vi.fn() }));
vi.mock('../../../doctor/doctor.js', () => ({ runDoctor }));

import {
  isThrottleExpired,
  formatBanner,
  checkBanner,
} from '../banner-check.js';
import type { BannerState } from '../banner-state.js';
import { writeBannerStateAtomic } from '../banner-state.js';
import type { HookContext } from '../types.js';

let projectRoot: string;
let stateDir: string;
let configPath: string;
let context: HookContext;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'sw-banner-proj-'));
  stateDir = join(projectRoot, '.specweave', 'state');
  configPath = join(projectRoot, '.specweave', 'config.json');
  mkdirSync(join(projectRoot, '.specweave'), { recursive: true });
  writeFileSync(configPath, '{}');
  // Backdate config mtime so it's not newer than test states (which use past timestamps)
  const farPast = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  utimesSync(configPath, farPast, farPast);
  context = {
    projectRoot,
    stateDir,
    logsDir: join(projectRoot, '.specweave', 'logs'),
    configPath,
    timestamp: new Date().toISOString(),
  };
  runDoctor.mockReset();
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

const sampleState = (lastCheckMsAgo: number): BannerState => ({
  version: 1,
  lastCheckAt: new Date(Date.now() - lastCheckMsAgo).toISOString(),
  lastResult: { pluginUpdates: 1, skillUpdates: 0, doctorStatus: 'warn' },
  lastBannerShownAt: new Date(Date.now() - lastCheckMsAgo).toISOString(),
});

describe('isThrottleExpired', () => {
  it('returns true for null state', () => {
    expect(isThrottleExpired(null, context)).toBe(true);
  });

  it('returns true for state with wrong schema version', () => {
    const s = sampleState(60_000) as unknown as BannerState;
    (s as unknown as { version: number }).version = 2;
    expect(isThrottleExpired(s, context)).toBe(true);
  });

  it('returns true when lastCheckAt is older than throttleHours', () => {
    expect(isThrottleExpired(sampleState(25 * 3600 * 1000), context)).toBe(true);
  });

  it('returns false when lastCheckAt is within throttle window and no mtime changes', () => {
    expect(isThrottleExpired(sampleState(60_000), context)).toBe(false);
  });

  it('returns true when configPath mtime is newer than lastCheckAt', () => {
    const s = sampleState(60_000);
    // configPath already exists from beforeEach; bump mtime to now
    const future = new Date();
    utimesSync(configPath, future, future);
    expect(isThrottleExpired(s, context)).toBe(true);
  });

  it('returns true when vskill.lock mtime is newer than lastCheckAt', () => {
    const lockPath = join(projectRoot, 'vskill.lock');
    writeFileSync(lockPath, '{}');
    const future = new Date();
    utimesSync(lockPath, future, future);
    expect(isThrottleExpired(sampleState(60_000), context)).toBe(true);
  });

  it('respects custom throttleHours from config', () => {
    // 2-hour state, throttleHours=1 → expired
    expect(isThrottleExpired(sampleState(2 * 3600 * 1000), context, { throttleHours: 1 })).toBe(true);
    // 30-minute state, throttleHours=1 → not expired
    expect(isThrottleExpired(sampleState(30 * 60 * 1000), context, { throttleHours: 1 })).toBe(false);
  });

  it('treats clock skew (negative elapsed via Math.abs) as expired', () => {
    const s = sampleState(-25 * 3600 * 1000); // future timestamp
    expect(isThrottleExpired(s, context)).toBe(true);
  });
});

describe('formatBanner', () => {
  it('returns null when both counts are zero', () => {
    expect(formatBanner({ pluginUpdates: 0, skillUpdates: 0, doctorStatus: 'pass' })).toBeNull();
  });

  it('uses singular for one plugin update, no skill mention', () => {
    const out = formatBanner({ pluginUpdates: 1, skillUpdates: 0, doctorStatus: 'warn' })!;
    expect(out).toContain('1 plugin');
    expect(out).not.toMatch(/\d skill/);
    expect(out).toContain('specweave refresh-plugins');
  });

  it('uses plural for multiple skill updates, no plugin mention', () => {
    const out = formatBanner({ pluginUpdates: 0, skillUpdates: 3, doctorStatus: 'warn' })!;
    expect(out).toContain('3 skills');
    expect(out).not.toMatch(/\d plugin/);
    expect(out).toContain('vskill update');
  });

  it('combines both counts when nonzero', () => {
    const out = formatBanner({ pluginUpdates: 2, skillUpdates: 1, doctorStatus: 'warn' })!;
    expect(out).toContain('2 plugins');
    expect(out).toContain('1 skill');
    expect(out).toContain('refresh-plugins');
    expect(out).toContain('vskill update');
  });

  it('includes the disable hint', () => {
    const out = formatBanner({ pluginUpdates: 1, skillUpdates: 0, doctorStatus: 'warn' })!;
    expect(out).toMatch(/hooks\.banner\.disabled/);
  });
});

describe('checkBanner', () => {
  it('returns null and skips doctor when config.disabled === true', async () => {
    const result = await checkBanner(context, { disabled: true });
    expect(result).toBeNull();
    expect(runDoctor).not.toHaveBeenCalled();
  });

  it('returns cached banner when throttle is not expired (warm path)', async () => {
    writeBannerStateAtomic(stateDir, {
      version: 1,
      lastCheckAt: new Date(Date.now() - 60_000).toISOString(),
      lastResult: { pluginUpdates: 1, skillUpdates: 0, doctorStatus: 'warn' },
      lastBannerShownAt: null,
    });
    const result = await checkBanner(context);
    expect(result).toContain('1 plugin');
    expect(runDoctor).not.toHaveBeenCalled();
  });

  it('runs doctor on cold path and writes new state', async () => {
    runDoctor.mockResolvedValue({
      timestamp: new Date().toISOString(),
      projectRoot,
      categories: [
        {
          category: 'Plugin Currency',
          status: 'warn',
          checks: [{ name: 'Plugin currency', status: 'warn', message: '2 plugin install(s) outdated' }],
        },
        {
          category: 'Skill Currency',
          status: 'skip',
          checks: [{ name: 'Skill currency', status: 'skip', message: 'no vskill.lock' }],
        },
      ],
      summary: { total: 2, passed: 0, warnings: 1, failures: 0, skipped: 1 },
    });
    const result = await checkBanner(context);
    expect(result).toContain('2 plugins');
    expect(runDoctor).toHaveBeenCalledOnce();
    // State file written
    const stateFile = join(stateDir, 'banner-last-check.json');
    expect(existsSync(stateFile)).toBe(true);
  });

  it('returns null silently when runDoctor throws', async () => {
    runDoctor.mockRejectedValue(new Error('boom'));
    const result = await checkBanner(context);
    expect(result).toBeNull();
  });

  it('returns null when runDoctor exceeds 800ms timeout', async () => {
    runDoctor.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as never), 2000)),
    );
    const start = Date.now();
    const result = await checkBanner(context);
    const elapsed = Date.now() - start;
    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(1500); // timeout fired before runDoctor resolved
  });

  it('returns null when doctor reports zero updates (banner not warranted)', async () => {
    runDoctor.mockResolvedValue({
      timestamp: new Date().toISOString(),
      projectRoot,
      categories: [
        { category: 'Plugin Currency', status: 'pass', checks: [{ name: 'Plugin currency', status: 'pass', message: 'all up to date' }] },
        { category: 'Skill Currency', status: 'skip', checks: [{ name: 'Skill currency', status: 'skip', message: 'no vskill.lock' }] },
      ],
      summary: { total: 2, passed: 1, warnings: 0, failures: 0, skipped: 1 },
    });
    const result = await checkBanner(context);
    expect(result).toBeNull();
  });
});

describe('checkBanner — performance budget', () => {
  it('warm path returns in under 50ms', async () => {
    writeBannerStateAtomic(stateDir, {
      version: 1,
      lastCheckAt: new Date(Date.now() - 60_000).toISOString(),
      lastResult: { pluginUpdates: 1, skillUpdates: 0, doctorStatus: 'warn' },
      lastBannerShownAt: null,
    });
    const start = Date.now();
    await checkBanner(context);
    expect(Date.now() - start).toBeLessThan(50);
  });
});
