/**
 * The SpecWithCode desktop download linked from /studio, the homepage and the docs.
 * From 1.0.0 every plain release is GitHub's Latest release and carries a
 * version-free `SpecWithCode-arm64.dmg`, so DMG_URL always fetches the newest
 * stable installer. When a release ships, update VERSION and DMG_BYTES from
 * `gh release view vX.Y.Z -R anton-abyzov/specwithcode --json assets`.
 * No release script writes this file; bump it by hand in a docs-site PR.
 * After editing, run `CHECK_RELEASE_LINKS=1 npx vitest run specwithcodeRelease` to confirm the DMG exists.
 */
const VERSION = '1.0.132';
const DMG_NAME = 'SpecWithCode-arm64.dmg';
const DMG_BYTES = 161_477_993;

const REPO = 'https://github.com/anton-abyzov/specwithcode';

export const SPECWITHCODE_RELEASE = {
  version: VERSION,
  /** Exact asset size in bytes, as GitHub reports it. */
  dmgBytes: DMG_BYTES,
  /** Size as macOS Finder shows it (decimal megabytes). */
  size: `${Math.round(DMG_BYTES / 1_000_000)} MB`,
  platform: 'macOS 13 or later',
  dmgUrl: `${REPO}/releases/latest/download/${DMG_NAME}`,
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
 * break on the next release. When a release adds them, update DESKTOP_VERSION
 * and the byte sizes from
 * `gh release view vX.Y.Z -R anton-abyzov/specwithcode --json assets`.
 */
const DESKTOP_VERSION = '1.0.132';
const EXE_X64_BYTES = 151_429_865;
const EXE_ARM64_BYTES = 141_889_893;
const APPIMAGE_X64_BYTES = 165_994_983;
const APPIMAGE_ARM64_BYTES = 164_671_496;
const DEB_X64_BYTES = 139_729_292;
const DEB_ARM64_BYTES = 132_879_484;

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
