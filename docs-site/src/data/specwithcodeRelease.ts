/**
 * The SpecWithCode desktop download linked from /studio, the homepage and the docs.
 * The Mac installer and its checksums are GitHub's version-free "latest" links,
 * so the button serves the newest release the moment it is published, also from
 * a page that was built or opened before it. The version, size and release
 * notes shown next to it are the release recorded here; in the browser
 * `useSpecWithCodeRelease` replaces them with the newest release on GitHub.
 * `scripts/sync-specwithcode-release.mjs` rewrites the constants
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
/** The public source repository; the same for every release. */
export const SPECWITHCODE_REPO_URL = REPO;

/** The Mac download of one release, as the pages show it. */
export const buildMacRelease = (version: string, dmgBytes: number) => ({
  version,
  /** Exact asset size in bytes, as GitHub reports it. */
  dmgBytes,
  /** Size as macOS Finder shows it (decimal megabytes). */
  size: `${Math.round(dmgBytes / 1_000_000)} MB`,
  platform: 'macOS 13 or later',
  /** Version-free: GitHub redirects it to the newest release's installer. */
  dmgUrl: `${REPO}/releases/latest/download/${DMG_NAME}`,
  /** Version-free, so it always describes the file `dmgUrl` serves. */
  sumsUrl: `${REPO}/releases/latest/download/SHA256SUMS`,
  notesUrl: `${REPO}/releases/tag/v${version}`,
  releasesUrl: `${REPO}/releases`,
  repoUrl: REPO,
} as const);
export type SpecWithCodeMacRelease = ReturnType<typeof buildMacRelease>;

export const SPECWITHCODE_RELEASE: SpecWithCodeMacRelease = buildMacRelease(VERSION, DMG_BYTES);

/** Platform list for schema.org `operatingSystem`, shared by /code/ and /code/download/. */
export const SPECWITHCODE_OPERATING_SYSTEMS =
  'macOS 13 or later (Apple silicon), Windows 10 and 11 (x64 and arm64), Linux (x64 and arm64, glibc)';

/*
 * Windows and Linux builds are added to a release by release-windows-linux.yml
 * about twenty minutes after its macOS assets, so GitHub's Latest release often
 * has none yet and a /releases/latest/download/ link would answer 404. They are
 * linked from the newest release that carries all six instead: the one recorded
 * here at build time, replaced in the browser by `useSpecWithCodeRelease` with
 * the newest one on GitHub. `scripts/sync-specwithcode-release.mjs` keeps
 * DESKTOP_VERSION and the byte sizes current before every deploy build.
 */
const DESKTOP_VERSION = '1.0.248';
const EXE_X64_BYTES = 154_732_560;
const EXE_ARM64_BYTES = 145_112_208;
const APPIMAGE_X64_BYTES = 169_939_599;
const APPIMAGE_ARM64_BYTES = 168_537_442;
const DEB_X64_BYTES = 142_985_492;
const DEB_ARM64_BYTES = 136_777_388;

export interface SpecWithCodeDesktopBytes {
  EXE_X64_BYTES: number;
  EXE_ARM64_BYTES: number;
  APPIMAGE_X64_BYTES: number;
  APPIMAGE_ARM64_BYTES: number;
  DEB_X64_BYTES: number;
  DEB_ARM64_BYTES: number;
}

/** The Windows and Linux installers of one release, as the pages show them. */
export const buildDesktopRelease = (version: string, bytes: SpecWithCodeDesktopBytes) => {
  const asset = (name: string, size: number) => ({
    name,
    bytes: size,
    size: `${Math.round(size / 1_000_000)} MB`,
    url: `${REPO}/releases/download/v${version}/${name}`,
  });
  return {
    version,
    exe: asset(`SpecWithCode-${version}-x64.exe`, bytes.EXE_X64_BYTES),
    exeArm64: asset(`SpecWithCode-${version}-arm64.exe`, bytes.EXE_ARM64_BYTES),
    appImage: asset(`SpecWithCode-${version}-x86_64.AppImage`, bytes.APPIMAGE_X64_BYTES),
    appImageArm64: asset(`SpecWithCode-${version}-arm64.AppImage`, bytes.APPIMAGE_ARM64_BYTES),
    deb: asset(`SpecWithCode-${version}-amd64.deb`, bytes.DEB_X64_BYTES),
    debArm64: asset(`SpecWithCode-${version}-arm64.deb`, bytes.DEB_ARM64_BYTES),
    sumsUrl: `${REPO}/releases/download/v${version}/SHA256SUMS-windows-linux`,
    notesUrl: `${REPO}/releases/tag/v${version}`,
  } as const;
};
export type SpecWithCodeDesktopRelease = ReturnType<typeof buildDesktopRelease>;

export const SPECWITHCODE_WINDOWS_LINUX: SpecWithCodeDesktopRelease = buildDesktopRelease(DESKTOP_VERSION, {
  EXE_X64_BYTES,
  EXE_ARM64_BYTES,
  APPIMAGE_X64_BYTES,
  APPIMAGE_ARM64_BYTES,
  DEB_X64_BYTES,
  DEB_ARM64_BYTES,
});
