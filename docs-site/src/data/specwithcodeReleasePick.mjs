/**
 * Picks which SpecWithCode release each download leads to, from the list the
 * GitHub releases API returns. One copy for both sides: the deploy build
 * (scripts/sync-specwithcode-release.mjs) and the browser
 * (specwithcodeLiveRelease.ts), so the page a visitor has open and the page
 * the next deploy builds agree. No imports: it runs in Node and in a browser.
 */
export const SPECWITHCODE_REPO = 'anton-abyzov/specwithcode';
export const MIN_BYTES = 20_000_000;

export const MAC_DMG = 'SpecWithCode-arm64.dmg';
export const MAC_SUMS = 'SHA256SUMS';
export const DESKTOP_SUMS = 'SHA256SUMS-windows-linux';
/** Constant in specwithcodeRelease.ts, then the asset it sizes. */
export const DESKTOP_ASSETS = [
  ['EXE_X64_BYTES', (v) => `SpecWithCode-${v}-x64.exe`],
  ['EXE_ARM64_BYTES', (v) => `SpecWithCode-${v}-arm64.exe`],
  ['APPIMAGE_X64_BYTES', (v) => `SpecWithCode-${v}-x86_64.AppImage`],
  ['APPIMAGE_ARM64_BYTES', (v) => `SpecWithCode-${v}-arm64.AppImage`],
  ['DEB_X64_BYTES', (v) => `SpecWithCode-${v}-amd64.deb`],
  ['DEB_ARM64_BYTES', (v) => `SpecWithCode-${v}-arm64.deb`],
];

export const parseVersion = (text) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(text ?? '');
  return match ? match.slice(1).map(Number) : null;
};

export const compareVersions = (left, right) => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) throw new Error(`Not a release version: ${a ? right : left}`);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/** Sizes of a release's fully uploaded files, by name. */
const uploaded = (release) =>
  (release.assets ?? []).filter((asset) => asset.state === undefined || asset.state === 'uploaded');

const assetSizes = (release) => new Map(uploaded(release).map((asset) => [asset.name, asset.size]));

/** When the last of a release's files finished uploading, else when it was published. */
const readyAt = (release) =>
  uploaded(release)
    .map((asset) => asset.updated_at)
    .concat(release.published_at)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

/**
 * The newest stable release that carries the Mac download, and the newest
 * that carries every Windows and Linux installer (they are attached later, so
 * it can be an older one). Either is null when no release qualifies.
 */
export function pickReleases(releases) {
  const stable = (Array.isArray(releases) ? releases : [])
    .filter((release) => release && !release.draft && !release.prerelease && parseVersion(release.tag_name))
    .map((release) => ({
      version: release.tag_name.replace(/^v/, ''),
      sizes: assetSizes(release),
      readyAt: readyAt(release),
    }))
    .sort((a, b) => compareVersions(b.version, a.version));
  let mac = null;
  let desktop = null;
  for (const {version, sizes, readyAt: ready} of stable) {
    if (mac === null && sizes.get(MAC_DMG) > MIN_BYTES && sizes.has(MAC_SUMS)) {
      mac = {version, readyAt: ready, bytes: {DMG_BYTES: sizes.get(MAC_DMG)}};
    }
    if (desktop === null && sizes.has(DESKTOP_SUMS)) {
      const bytes = Object.fromEntries(DESKTOP_ASSETS.map(([name, file]) => [name, sizes.get(file(version))]));
      if (Object.values(bytes).every((size) => size > MIN_BYTES)) desktop = {version, readyAt: ready, bytes};
    }
    if (mac && desktop) break;
  }
  return {mac, desktop};
}
