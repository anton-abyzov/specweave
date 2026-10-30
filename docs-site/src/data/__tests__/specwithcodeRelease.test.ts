import {describe, it, expect} from 'vitest';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop} from '../specwithcodeRelease';

const REPO = 'https://github.com/anton-abyzov/specwithcode';
const ALL = [desktop.exe, desktop.exeArm64, desktop.appImage, desktop.appImageArm64, desktop.deb, desktop.debArm64];

describe('SpecWithCode download constant', () => {
  it('links the stable Latest installer and the release notes of the recorded version', () => {
    expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(release.dmgUrl).toBe(`${REPO}/releases/latest/download/SpecWithCode-arm64.dmg`);
    expect(release.notesUrl).toBe(`${REPO}/releases/tag/v${release.version}`);
    expect(release.releasesUrl).toBe(`${REPO}/releases`);
  });

  it('shows a plausible download size in decimal megabytes', () => {
    expect(release.dmgBytes).toBeGreaterThan(20_000_000);
    expect(release.dmgBytes).toBeLessThan(1_000_000_000);
    expect(release.size).toBe(`${Math.round(release.dmgBytes / 1_000_000)} MB`);
  });

  // Opt-in network check: CHECK_RELEASE_LINKS=1 npx vitest run specwithcodeRelease
  it.skipIf(!process.env.CHECK_RELEASE_LINKS)('the DMG exists on GitHub with the recorded size', async () => {
    const res = await fetch(release.dmgUrl, {method: 'HEAD', redirect: 'follow'});
    expect(res.status).toBe(200);
    expect(Number(res.headers.get('content-length'))).toBe(release.dmgBytes);
  }, 30_000);

  it('pins the Windows and Linux installers to one release', () => {
    expect(desktop.version).toMatch(/^\d+\.\d+\.\d+$/);
    const base = `${REPO}/releases/download/v${desktop.version}`;
    expect(desktop.exe.url).toBe(`${base}/SpecWithCode-${desktop.version}-x64.exe`);
    expect(desktop.appImage.url).toBe(`${base}/SpecWithCode-${desktop.version}-x86_64.AppImage`);
    expect(desktop.deb.url).toBe(`${base}/SpecWithCode-${desktop.version}-amd64.deb`);
    expect(desktop.exeArm64.url).toBe(`${base}/SpecWithCode-${desktop.version}-arm64.exe`);
    expect(desktop.appImageArm64.url).toBe(`${base}/SpecWithCode-${desktop.version}-arm64.AppImage`);
    expect(desktop.debArm64.url).toBe(`${base}/SpecWithCode-${desktop.version}-arm64.deb`);
    for (const asset of ALL) {
      expect(asset.bytes).toBeGreaterThan(20_000_000);
      expect(asset.size).toBe(`${Math.round(asset.bytes / 1_000_000)} MB`);
    }
  });

  it.skipIf(!process.env.CHECK_RELEASE_LINKS)('the Windows and Linux installers exist with the recorded sizes', async () => {
    for (const asset of ALL) {
      const res = await fetch(asset.url, {method: 'HEAD', redirect: 'follow'});
      expect(res.status, asset.name).toBe(200);
      expect(Number(res.headers.get('content-length')), asset.name).toBe(asset.bytes);
    }
  }, 60_000);
});
