/**
 * The SpecWithCode desktop download linked from /studio, the homepage and the docs.
 * Keep the installer URL, release notes, checksum and displayed size on the
 * same release. `scripts/sync-specwithcode-release.mjs` rewrites the constants
 * below from the newest published release before every deploy build
 * (deploy-docs.yml), and the SpecWithCode release script starts that deploy,
 * so the values committed here are only the fallback for when GitHub cannot
 * be read. Keep each constant on its own `const NAME = value;` line.
 * To refresh the fallback, run `node scripts/sync-specwithcode-release.mjs`, then
 * `CHECK_RELEASE_LINKS=1 npx vitest run specwithcodeRelease` to confirm the files exist.
 */
const VERSION = '1.0.248';
const DMG_NAME = 'SpecWithCode-arm64.dmg';
const DMG_BYTES = 163_324_953;

const REPO = 'https://github.com/anton-abyzov/specwithcode';

export const SPECWITHCODE_RELEASE = {
  version: VERSION,
  /** Exact asset size in bytes, as GitHub reports it. */
  dmgBytes: DMG_BYTES,
  /** Size as macOS Finder shows it (decimal megabytes). */
  size: `${Math.round(DMG_BYTES / 1_000_000)} MB`,
  platform: 'macOS 13 or later',
  dmgUrl: `${REPO}/releases/download/v${VERSION}/${DMG_NAME}`,
  sumsUrl: `${REPO}/releases/download/v${VERSION}/SHA256SUMS`,
  notesUrl: `${REPO}/releases/tag/v${VERSION}`,
  releasesUrl: `${REPO}/releases`,
  repoUrl: REPO,
} as const;

/** Platform list for schema.org `operatingSystem`, shared by /code/ and /code/download/. */
export const SPECWITHCODE_OPERATING_SYSTEMS =
  'macOS 13 or later (Apple silicon), Windows 10 and 11 (x64 and arm64), Linux (x64 and arm64, glibc)';

/*
 * Windows and Linux builds are added to a release by release-windows-linux.yml
 * after its macOS assets, so they are pinned to the newest release that carries
 * them rather than to GitHub's Latest. Their file names carry the version and
 * there is no version-free alias, so a /releases/latest/download/ link would
 * break on the next release. The sync script moves DESKTOP_VERSION and the
 * byte sizes to the newest release that has all six installers.
 */
const DESKTOP_VERSION = '1.0.248';
const EXE_X64_BYTES = 154_732_560;
const EXE_ARM64_BYTES = 145_112_208;
const APPIMAGE_X64_BYTES = 169_939_599;
const APPIMAGE_ARM64_BYTES = 168_537_442;
const DEB_X64_BYTES = 142_985_492;
const DEB_ARM64_BYTES = 136_777_388;

const desktopAsset = (name: string, bytes: number) => ({
  name,
  bytes,
  size: `${Math.round(bytes / 1_000_000)} MB`,
  url: `${REPO}/releases/download/v${DESKTOP_VERSION}/${name}`,
});

export const SPECWITHCODE_WINDOWS_LINUX = {
  version: DESKTOP_VERSION,
  exe: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-x64.exe`, EXE_X64_BYTES),
  exeArm64: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-arm64.exe`, EXE_ARM64_BYTES),
  appImage: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-x86_64.AppImage`, APPIMAGE_X64_BYTES),
  appImageArm64: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-arm64.AppImage`, APPIMAGE_ARM64_BYTES),
  deb: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-amd64.deb`, DEB_X64_BYTES),
  debArm64: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-arm64.deb`, DEB_ARM64_BYTES),
  sumsUrl: `${REPO}/releases/download/v${DESKTOP_VERSION}/SHA256SUMS-windows-linux`,
  notesUrl: `${REPO}/releases/tag/v${DESKTOP_VERSION}`,
} as const;
