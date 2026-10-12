import {describe, it, expect} from 'vitest';
import {SPECWITHCODE_RELEASE as release} from '../specwithcodeRelease';

describe('SpecWithCode download constant', () => {
  it('points every link at the same public release', () => {
    expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(release.dmgUrl).toBe(`https://github.com/anton-abyzov/specwithcode/releases/download/v${release.version}/SpecWeave-Studio-${release.version}-arm64.dmg`);
    expect(release.notesUrl).toBe(`https://github.com/anton-abyzov/specwithcode/releases/tag/v${release.version}`);
    expect(release.releasesUrl).toBe('https://github.com/anton-abyzov/specwithcode/releases');
  });

  it('shows the download size in megabytes', () => {
    expect(release.size).toMatch(/^\d+ MB$/);
  });
});
