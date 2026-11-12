import {describe, it, expect} from 'vitest';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop} from '../specwithcodeRelease';
import {compareVersions} from '../specwithcodeReleasePick.mjs';

const REPO = 'https://github.com/anton-abyzov/specwithcode';
const ALL = [desktop.exe, desktop.exeArm64, desktop.appImage, desktop.appImageArm64, desktop.deb, desktop.debArm64];

describe('SpecWithCode download constant', () => {
  it('links the Mac installer and its checksums through the version-free latest link', () => {
    expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
    // No version in these two: a page built or opened before a release still serves that release.
    expect(release.dmgUrl).toBe(`${REPO}/releases/latest/download/SpecWithCode-arm64.dmg`);
    expect(release.sumsUrl).toBe(`${REPO}/releases/latest/download/SHA256SUMS`);
    expect(release.notesUrl).toBe(`${REPO}/releases/tag/v${release.version}`);
    expect(release.releasesUrl).toBe(`${REPO}/releases`);
  });

  it('shows a plausible download size in decimal megabytes', () => {
    expect(release.dmgBytes).toBeGreaterThan(20_000_000);
    expect(release.dmgBytes).toBeLessThan(1_000_000_000);
    expect(release.size).toBe(`${Math.round(release.dmgBytes / 1_000_000)} MB`);
  });

  // Opt-in network check: CHECK_RELEASE_LINKS=1 npx vitest run specwithcodeRelease
  it.skipIf(!process.env.CHECK_RELEASE_LINKS)('the DMG and checksum exist on GitHub and the size matches', async () => {
    const recorded = await fetch(`${REPO}/releases/download/v${release.version}/SpecWithCode-arm64.dmg`, {method: 'HEAD', redirect: 'follow'});
    expect(recorded.status).toBe(200);
    expect(Number(recorded.headers.get('content-length'))).toBe(release.dmgBytes);
    // The button itself: GitHub must redirect it to a release at least as new as the recorded one.
    const latest = await fetch(release.dmgUrl, {method: 'HEAD', redirect: 'manual'});
    expect(latest.status).toBe(302);
    const served = /\/releases\/download\/v(\d+\.\d+\.\d+)\/SpecWithCode-arm64\.dmg$/.exec(latest.headers.get('location') ?? '')?.[1];
    expect(served, latest.headers.get('location') ?? 'no location').toBeDefined();
    expect(compareVersions(served!, release.version)).toBeGreaterThanOrEqual(0);
    const sums = await fetch(release.sumsUrl);
    expect(sums.status).toBe(200);
    expect(await sums.text()).toMatch(/^[a-f0-9]{64}\s+\*?SpecWithCode-arm64\.dmg$/m);
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
