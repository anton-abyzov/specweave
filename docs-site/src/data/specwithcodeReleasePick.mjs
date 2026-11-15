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

/**
 * The same installers without the version, attached to every release from the
 * version-free change in release-windows-linux.yml on. A release that has all
 * six can be linked through GitHub's `releases/latest/download/<name>`.
 */
export const DESKTOP_LATEST_ASSETS = [
  'SpecWithCode-x64.exe',
  'SpecWithCode-arm64.exe',
  'SpecWithCode-x86_64.AppImage',
  'SpecWithCode-arm64.AppImage',
  'SpecWithCode-amd64.deb',
  'SpecWithCode-arm64.deb',
];

/**
 * The file an Insiders download takes on each platform, by installer key
 * (specwithcodeInstaller.ts), from the prerelease's versioned names.
 */
export const INSIDERS_FILES = [
  ['mac', (v) => `SpecWithCode-${v}-arm64.dmg`],
  ['windows-x64', (v) => `SpecWithCode-${v}-x64.exe`],
  ['windows-arm64', (v) => `SpecWithCode-${v}-arm64.exe`],
  ['linux-x64', (v) => `SpecWithCode-${v}-x86_64.AppImage`],
  ['linux-arm64', (v) => `SpecWithCode-${v}-arm64.AppImage`],
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

const published = (releases, prerelease) =>
  (Array.isArray(releases) ? releases : [])
    .filter((release) => release && !release.draft && Boolean(release.prerelease) === prerelease && parseVersion(release.tag_name))
    .map((release) => ({
      version: release.tag_name.replace(/^v/, ''),
      sizes: assetSizes(release),
      readyAt: readyAt(release),
    }))
    .sort((a, b) => compareVersions(b.version, a.version));

/**
 * The newest stable release that carries the Mac download, and the newest
 * that carries every Windows and Linux installer (they are attached later, so
 * it can be an older one). Either is null when no release qualifies.
 *
 * `desktop.latest` is true when that release is also the newest stable one and
 * carries the version-free installers: only then does GitHub's
 * `releases/latest/download/<name>` serve them. Before 1.1 a new release gets
 * its Windows and Linux files about twenty minutes after the Mac ones, and in
 * that window the links stay on the versioned files of the release before.
 *
 * `insiders` is the newest Insiders build: a published prerelease with a plain
 * X.Y.Z version (the daily train's builds from 1.1.0) newer than the stable Mac
 * release, with the installer keys whose file it carries. Null when none is.
 */
export function pickReleases(releases) {
  const stable = published(releases, false);
  let mac = null;
  let desktop = null;
  for (const {version, sizes, readyAt: ready} of stable) {
    if (mac === null && sizes.get(MAC_DMG) > MIN_BYTES && sizes.has(MAC_SUMS)) {
      mac = {version, readyAt: ready, bytes: {DMG_BYTES: sizes.get(MAC_DMG)}};
    }
    if (desktop === null && sizes.has(DESKTOP_SUMS)) {
      const bytes = Object.fromEntries(DESKTOP_ASSETS.map(([name, file]) => [name, sizes.get(file(version))]));
      if (Object.values(bytes).every((size) => size > MIN_BYTES)) {
        const latest = version === stable[0].version && DESKTOP_LATEST_ASSETS.every((name) => sizes.get(name) > MIN_BYTES);
        desktop = {version, readyAt: ready, bytes, latest};
      }
    }
    if (mac && desktop) break;
  }
  let insiders = null;
  for (const {version, sizes} of published(releases, true)) {
    if (mac && compareVersions(version, mac.version) <= 0) break;
    const files = INSIDERS_FILES.filter(([, file]) => sizes.get(file(version)) > MIN_BYTES).map(([key]) => key);
    if (files.length > 0) {
      insiders = {version, files};
      break;
    }
  }
  return {mac, desktop, insiders};
}
