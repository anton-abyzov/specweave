import {describe, it, expect} from 'vitest';
import {SPECWITHCODE_RELEASE as release} from '../specwithcodeRelease';

const REPO = 'https://github.com/anton-abyzov/specwithcode';

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
});
