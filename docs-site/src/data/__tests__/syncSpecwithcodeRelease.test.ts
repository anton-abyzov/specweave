import fs from 'node:fs';
import path from 'node:path';
import {describe, it, expect} from 'vitest';
// @ts-expect-error -- plain .mjs build script without types
import {applyReleases, pickReleases} from '../../../scripts/sync-specwithcode-release.mjs';

const source = fs.readFileSync(path.resolve(__dirname, '../specwithcodeRelease.ts'), 'utf8');

const BIG = 150_000_000;
const macAssets = [
  {name: 'SpecWithCode-arm64.dmg', size: BIG + 1, state: 'uploaded'},
  {name: 'SHA256SUMS', size: 900, state: 'uploaded'},
];
const desktopAssets = (version: string) => [
  ...['x64.exe', 'arm64.exe', 'x86_64.AppImage', 'arm64.AppImage', 'amd64.deb', 'arm64.deb'].map((suffix, index) => ({
    name: `SpecWithCode-${version}-${suffix}`,
    size: BIG + 10 + index,
    state: 'uploaded',
  })),
  {name: 'SHA256SUMS-windows-linux', size: 900, state: 'uploaded'},
];
const release = (version: string, assets: object[], extra: object = {}) => ({
  tag_name: `v${version}`,
  draft: false,
  prerelease: false,
  assets,
  ...extra,
});

describe('SpecWithCode download sync', () => {
  it('takes the newest stable release for Mac and the newest with every installer for Windows and Linux', () => {
    const picked = pickReleases([
      release('9.0.9', macAssets),
      release('9.0.10', macAssets),
      release('9.0.8', [...macAssets, ...desktopAssets('9.0.8')]),
      release('9.0.11', macAssets, {draft: true}),
      release('9.1.0-beta.1', macAssets, {prerelease: true}),
    ]);
    expect(picked.mac).toEqual({version: '9.0.10', bytes: {DMG_BYTES: BIG + 1}});
    expect(picked.desktop?.version).toBe('9.0.8');
    expect(picked.desktop?.bytes.DEB_ARM64_BYTES).toBe(BIG + 15);
  });

  it('skips a release whose files are missing or still uploading', () => {
    const partial = desktopAssets('9.0.9').filter((asset) => !asset.name.endsWith('arm64.deb'));
    const uploading = macAssets.map((asset) => ({...asset, state: 'starter'}));
    const picked = pickReleases([
      release('9.0.9', [...uploading, ...partial]),
      release('9.0.8', [...macAssets, ...desktopAssets('9.0.8')]),
    ]);
    expect(picked.mac?.version).toBe('9.0.8');
    expect(picked.desktop?.version).toBe('9.0.8');
    expect(pickReleases([])).toEqual({mac: null, desktop: null});
  });

  it('writes versions and sizes into the data file and nothing else', () => {
    const picked = pickReleases([
      release('9.0.10', macAssets),
      release('9.0.8', [...macAssets, ...desktopAssets('9.0.8')]),
    ]);
    const next = applyReleases(source, picked);
    expect(next).toContain("const VERSION = '9.0.10';");
    expect(next).toContain('const DMG_BYTES = 150_000_001;');
    expect(next).toContain("const DESKTOP_VERSION = '9.0.8';");
    expect(next).toContain('const EXE_X64_BYTES = 150_000_010;');
    expect(next).toContain('const DEB_ARM64_BYTES = 150_000_015;');
    const changed = next.split('\n').filter((line, index) => line !== source.split('\n')[index]);
    expect(changed).toHaveLength(9);
    expect(applyReleases(next, picked)).toBe(next);
  });

  it('keeps the recorded release when GitHub offers only an older one, or none', () => {
    const older = pickReleases([release('0.0.1', [...macAssets, ...desktopAssets('0.0.1')])]);
    expect(applyReleases(source, older)).toBe(source);
    expect(applyReleases(source, {mac: null, desktop: null})).toBe(source);
  });
});
