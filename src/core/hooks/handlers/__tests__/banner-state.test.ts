import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  bannerStatePath,
  readBannerState,
  writeBannerStateAtomic,
  type BannerState,
} from '../banner-state.js';

let stateDir: string;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'sw-banner-state-'));
});

afterEach(() => {
  rmSync(stateDir, { recursive: true, force: true });
});

const sample: BannerState = {
  version: 1,
  lastCheckAt: '2026-04-27T20:00:00.000Z',
  lastResult: { pluginUpdates: 2, skillUpdates: 0, doctorStatus: 'warn' },
  lastBannerShownAt: '2026-04-27T20:00:00.000Z',
};

describe('banner-state', () => {
  it('returns null for missing file', () => {
    expect(readBannerState(stateDir)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    writeFileSync(bannerStatePath(stateDir), 'not json{');
    expect(readBannerState(stateDir)).toBeNull();
  });

  it('returns null for wrong schema version', () => {
    writeFileSync(bannerStatePath(stateDir), JSON.stringify({ ...sample, version: 2 }));
    expect(readBannerState(stateDir)).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    writeFileSync(bannerStatePath(stateDir), JSON.stringify({ version: 1 }));
    expect(readBannerState(stateDir)).toBeNull();
  });

  it('round-trips a valid state byte-for-byte', () => {
    writeBannerStateAtomic(stateDir, sample);
    const result = readBannerState(stateDir);
    expect(result).toEqual(sample);
  });

  it('atomic write removes the .tmp file', () => {
    writeBannerStateAtomic(stateDir, sample);
    const tmpPath = bannerStatePath(stateDir) + '.tmp';
    expect(existsSync(tmpPath)).toBe(false);
    expect(existsSync(bannerStatePath(stateDir))).toBe(true);
  });

  it('creates stateDir if missing', () => {
    const nestedDir = join(stateDir, 'nested', 'state');
    writeBannerStateAtomic(nestedDir, sample);
    expect(existsSync(bannerStatePath(nestedDir))).toBe(true);
    expect(JSON.parse(readFileSync(bannerStatePath(nestedDir), 'utf8'))).toEqual(sample);
  });

  it('accepts lastBannerShownAt of null', () => {
    const s: BannerState = { ...sample, lastBannerShownAt: null };
    writeBannerStateAtomic(stateDir, s);
    expect(readBannerState(stateDir)).toEqual(s);
  });

  it('rejects invalid doctorStatus values', () => {
    writeFileSync(
      bannerStatePath(stateDir),
      JSON.stringify({ ...sample, lastResult: { ...sample.lastResult, doctorStatus: 'broken' } }),
    );
    expect(readBannerState(stateDir)).toBeNull();
  });
});
