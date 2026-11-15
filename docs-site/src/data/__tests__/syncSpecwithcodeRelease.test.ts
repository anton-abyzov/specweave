import fs from 'node:fs';
import path from 'node:path';
import {describe, it, expect} from 'vitest';
// @ts-expect-error -- plain .mjs build script without types
import {applyReleases, linkedReleases, pickReleases, releasesAhead} from '../../../scripts/sync-specwithcode-release.mjs';

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
    expect(picked.mac).toEqual({version: '9.0.10', readyAt: null, bytes: {DMG_BYTES: BIG + 1}});
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
    expect(pickReleases([])).toEqual({mac: null, desktop: null, insiders: null});
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
    expect(applyReleases(source, {mac: null, desktop: null, insiders: null})).toBe(source);
  });

  it('uses the latest links only when the newest stable release carries the version-free installers', () => {
    const versionFree = ['x64.exe', 'arm64.exe', 'x86_64.AppImage', 'arm64.AppImage', 'amd64.deb', 'arm64.deb'].map((suffix) => ({
      name: `SpecWithCode-${suffix}`,
      size: BIG,
      state: 'uploaded',
    }));
    const full = (version: string) => [...macAssets, ...desktopAssets(version), ...versionFree];
    expect(pickReleases([release('9.0.10', full('9.0.10'))]).desktop?.latest).toBe(true);
    // Older releases have no version-free files.
    expect(pickReleases([release('9.0.10', [...macAssets, ...desktopAssets('9.0.10')])]).desktop?.latest).toBe(false);
    // A newer stable release whose Windows and Linux files are not attached yet: latest would 404.
    const gap = pickReleases([release('9.0.11', macAssets), release('9.0.10', full('9.0.10'))]);
    expect(gap.desktop).toMatchObject({version: '9.0.10', latest: false});
    const next = applyReleases(source, pickReleases([release('9.0.10', full('9.0.10'))]));
    expect(next).toContain('const DESKTOP_LATEST = true;');
    expect(applyReleases(next, gap)).toContain('const DESKTOP_LATEST = false;');
  });

  it('picks the newest Insiders prerelease newer than Stable, with the files it carries', () => {
    const insidersAssets = (version: string, suffixes: string[]) =>
      suffixes.map((suffix) => ({name: `SpecWithCode-${version}-${suffix}`, size: BIG, state: 'uploaded'}));
    const picked = pickReleases([
      release('9.1.2', insidersAssets('9.1.2', ['arm64.dmg']), {prerelease: true}),
      release('9.1.1', insidersAssets('9.1.1', ['arm64.dmg', 'x64.exe', 'arm64.exe', 'x86_64.AppImage', 'arm64.AppImage']), {prerelease: true}),
      release('9.1.3-nightly.20261114.1', insidersAssets('9.1.3-nightly.20261114.1', ['arm64.dmg']), {prerelease: true}),
      release('9.1.0', macAssets),
    ]);
    expect(picked.insiders).toEqual({version: '9.1.2', files: ['mac']});
    // A build still uploading is skipped for the one before it.
    const uploading = pickReleases([
      release('9.1.2', insidersAssets('9.1.2', ['arm64.dmg']).map((a) => ({...a, state: 'starter'})), {prerelease: true}),
      release('9.1.1', insidersAssets('9.1.1', ['arm64.dmg', 'x64.exe']), {prerelease: true}),
      release('9.1.0', macAssets),
    ]);
    expect(uploading.insiders).toEqual({version: '9.1.1', files: ['mac', 'windows-x64']});
    // None newer than Stable, or none at all (before 1.1.0): no Insiders download.
    expect(pickReleases([release('9.1.0', macAssets), release('9.0.9', insidersAssets('9.0.9', ['arm64.dmg']), {prerelease: true})]).insiders).toBeNull();
    expect(pickReleases([release('9.1.0', macAssets)]).insiders).toBeNull();
    const next = applyReleases(source, picked);
    expect(next).toContain("const INSIDERS_VERSION = '9.1.2';");
    expect(next).toContain("const INSIDERS_FILES = 'mac';");
    // Never back to an older build.
    expect(applyReleases(next, uploading)).toBe(next);
  });

  it('tells when a deployed page links an older release, and since when the newer one was ready', () => {
    // The Mac button has no version in it, so the page's schema.org softwareVersion says which release it shows.
    const page = (mac: string, desktop: string) =>
      `<script type="application/ld+json">{"@type":"SoftwareApplication","softwareVersion":"${mac}","fileSize":"163 MB"}</script>` +
      `<a href="https://github.com/anton-abyzov/specwithcode/releases/latest/download/SpecWithCode-arm64.dmg">Mac</a>` +
      `<a href="https://github.com/anton-abyzov/specwithcode/releases/download/v${desktop}/SpecWithCode-${desktop}-x64.exe">Windows</a>`;
    expect(linkedReleases(page('9.0.10', '9.0.8'))).toEqual({mac: '9.0.10', desktop: '9.0.8'});
    // A page built before the latest link still names the Mac release in the installer link.
    const pinnedPage =
      '<a href="https://github.com/anton-abyzov/specwithcode/releases/download/v9.0.7/SpecWithCode-arm64.dmg">Mac</a>' +
      '<a href="https://github.com/anton-abyzov/specwithcode/releases/download/v9.0.7/SpecWithCode-9.0.7-x64.exe">Windows</a>';
    expect(linkedReleases(pinnedPage)).toEqual({mac: '9.0.7', desktop: '9.0.7'});
    // With version-free latest links the Windows and Linux section names its release.
    const latestPage =
      '<script type="application/ld+json">{"softwareVersion":"9.0.10"}</script>' +
      '<section aria-labelledby="windows-linux-title" data-desktop-version="9.0.9">' +
      '<a href="https://github.com/anton-abyzov/specwithcode/releases/latest/download/SpecWithCode-x64.exe">Windows</a></section>';
    expect(linkedReleases(latestPage)).toEqual({mac: '9.0.10', desktop: '9.0.9'});
    const picked = pickReleases([
      release('9.0.10', macAssets.map((asset) => ({...asset, updated_at: '2026-11-12T06:20:00Z'})), {
        published_at: '2026-11-12T06:26:30Z',
      }),
      release('9.0.8', [...macAssets, ...desktopAssets('9.0.8')], {published_at: '2026-11-11T01:00:00Z'}),
    ]);
    expect(releasesAhead(picked, linkedReleases(page('9.0.10', '9.0.8')))).toEqual([]);
    const ahead = releasesAhead(picked, linkedReleases(page('9.0.9', '9.0.8')));
    expect(ahead.map((entry: {version: string}) => entry.version)).toEqual(['9.0.10']);
    expect(ahead[0].readyAt).toBe('2026-11-12T06:26:30Z');
    // A page that cannot be parsed, or one already ahead, never asks for a deploy.
    expect(releasesAhead(picked, linkedReleases('<html></html>'))).toEqual([]);
    expect(releasesAhead(picked, linkedReleases(page('9.0.11', '9.0.9')))).toEqual([]);
  });
});
