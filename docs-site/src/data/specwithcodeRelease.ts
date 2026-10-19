/**
 * The SpecWithCode desktop download linked from /studio, the homepage and the docs.
 * From 1.0.0 every plain release is GitHub's Latest release and carries a
 * version-free `SpecWithCode-arm64.dmg`, so DMG_URL always fetches the newest
 * stable installer. When a release ships, update VERSION and DMG_BYTES from
 * `gh release view vX.Y.Z -R anton-abyzov/specwithcode --json assets`.
 * After editing, run `CHECK_RELEASE_LINKS=1 npx vitest run specwithcodeRelease` to confirm the DMG exists.
 */
const VERSION = '1.0.53';
const DMG_NAME = 'SpecWithCode-arm64.dmg';
const DMG_BYTES = 154_814_505;

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
