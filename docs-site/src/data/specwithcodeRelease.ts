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
 * about twenty minutes after its macOS assets (until the 1.1 release train,
 * which promotes only releases that already have them). Each one is also
 * attached under a version-free name (`SpecWithCode-x64.exe`). When the newest
 * stable release carries those (DESKTOP_LATEST), the buttons use GitHub's
 * version-free `releases/latest/download/` links, like the Mac one; otherwise
 * they link the versioned files of the newest release that has all six, so no
 * button answers 404 in the gap. The release recorded here at build time is
 * replaced in the browser by `useSpecWithCodeRelease` with the newest one on
 * GitHub. `scripts/sync-specwithcode-release.mjs` keeps DESKTOP_VERSION,
 * DESKTOP_LATEST and the byte sizes current before every deploy build.
 */
const DESKTOP_VERSION = '1.0.248';
const DESKTOP_LATEST = false;
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

/**
 * The Windows and Linux installers of one release, as the pages show them.
 * With `latest`, through the version-free `releases/latest/download/` names;
 * otherwise the versioned files of that release.
 */
export const buildDesktopRelease = (version: string, bytes: SpecWithCodeDesktopBytes, latest = false) => {
  const asset = (suffix: string, size: number) => {
    const name = latest ? `SpecWithCode-${suffix}` : `SpecWithCode-${version}-${suffix}`;
    return {
      name,
      bytes: size,
      size: `${Math.round(size / 1_000_000)} MB`,
      url: latest ? `${REPO}/releases/latest/download/${name}` : `${REPO}/releases/download/v${version}/${name}`,
    };
  };
  return {
    version,
    latest,
    exe: asset('x64.exe', bytes.EXE_X64_BYTES),
    exeArm64: asset('arm64.exe', bytes.EXE_ARM64_BYTES),
    appImage: asset('x86_64.AppImage', bytes.APPIMAGE_X64_BYTES),
    appImageArm64: asset('arm64.AppImage', bytes.APPIMAGE_ARM64_BYTES),
    deb: asset('amd64.deb', bytes.DEB_X64_BYTES),
    debArm64: asset('arm64.deb', bytes.DEB_ARM64_BYTES),
    sumsUrl: latest
      ? `${REPO}/releases/latest/download/SHA256SUMS-windows-linux`
      : `${REPO}/releases/download/v${version}/SHA256SUMS-windows-linux`,
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
}, DESKTOP_LATEST);

/*
 * The newest Insiders build: from 1.1.0 every release starts as a GitHub
 * prerelease and the daily train promotes one to stable after a day. The
 * download page offers it beside the Stable button only while it is newer than
 * the stable release and carries the visitor's file; INSIDERS_VERSION is empty
 * when there is none. INSIDERS_FILES lists the installer keys it carries,
 * comma separated. Written by `scripts/sync-specwithcode-release.mjs`.
 */
const INSIDERS_VERSION = '';
const INSIDERS_FILES = '';

/** An installer key of specwithcodeInstaller.ts. */
export type SpecWithCodeInstallerKey = 'mac' | 'windows-x64' | 'windows-arm64' | 'linux-x64' | 'linux-arm64';

const INSIDERS_FILE_NAME: Record<SpecWithCodeInstallerKey, (version: string) => string> = {
  mac: (v) => `SpecWithCode-${v}-arm64.dmg`,
  'windows-x64': (v) => `SpecWithCode-${v}-x64.exe`,
  'windows-arm64': (v) => `SpecWithCode-${v}-arm64.exe`,
  'linux-x64': (v) => `SpecWithCode-${v}-x86_64.AppImage`,
  'linux-arm64': (v) => `SpecWithCode-${v}-arm64.AppImage`,
};

/** One Insiders build's downloads, by installer key; only the files it carries. */
export const buildInsidersRelease = (version: string, files: readonly string[]) => {
  const downloads: Partial<Record<SpecWithCodeInstallerKey, {file: string; url: string}>> = {};
  for (const key of files) {
    const name = INSIDERS_FILE_NAME[key as SpecWithCodeInstallerKey];
    if (!name) continue;
    downloads[key as SpecWithCodeInstallerKey] = {file: name(version), url: `${REPO}/releases/download/v${version}/${name(version)}`};
  }
  return {version, downloads, notesUrl: `${REPO}/releases/tag/v${version}`} as const;
};
export type SpecWithCodeInsidersRelease = ReturnType<typeof buildInsidersRelease>;

export const SPECWITHCODE_INSIDERS: SpecWithCodeInsidersRelease | null = INSIDERS_VERSION
  ? buildInsidersRelease(INSIDERS_VERSION, INSIDERS_FILES.split(',').filter(Boolean))
  : null;
