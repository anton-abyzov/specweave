/**
 * The SpecWithCode desktop download linked from /studio, the homepage and the docs.
 * From 1.0.0 every plain release is GitHub's Latest release and carries a
 * version-free `SpecWithCode-arm64.dmg`, so DMG_URL always fetches the newest
 * stable installer. When a release ships, update VERSION and DMG_BYTES from
 * `gh release view vX.Y.Z -R anton-abyzov/specwithcode --json assets`.
 * After editing, run `CHECK_RELEASE_LINKS=1 npx vitest run specwithcodeRelease` to confirm the DMG exists.
 */
const VERSION = '1.0.76';
const DMG_NAME = 'SpecWithCode-arm64.dmg';
const DMG_BYTES = 161_282_848;

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

/*
 * Windows and Linux builds are added to a release by release-windows-linux.yml
 * after its macOS assets, so they are pinned to the newest release that carries
 * them rather than to GitHub's Latest. When a release adds them, update
 * DESKTOP_VERSION and the byte sizes from
 * `gh release view vX.Y.Z -R anton-abyzov/specwithcode --json assets`.
 */
const DESKTOP_VERSION = '1.0.76';
const EXE_BYTES = 150_673_866;
const APPIMAGE_BYTES = 165_060_577;
const DEB_BYTES = 139_629_700;

const desktopAsset = (name: string, bytes: number) => ({
  name,
  bytes,
  size: `${Math.round(bytes / 1_000_000)} MB`,
  url: `${REPO}/releases/download/v${DESKTOP_VERSION}/${name}`,
});

export const SPECWITHCODE_WINDOWS_LINUX = {
  version: DESKTOP_VERSION,
  exe: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-x64.exe`, EXE_BYTES),
  appImage: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-x86_64.AppImage`, APPIMAGE_BYTES),
  deb: desktopAsset(`SpecWithCode-${DESKTOP_VERSION}-amd64.deb`, DEB_BYTES),
  sumsUrl: `${REPO}/releases/download/v${DESKTOP_VERSION}/SHA256SUMS-windows-linux`,
  notesUrl: `${REPO}/releases/tag/v${DESKTOP_VERSION}`,
} as const;
