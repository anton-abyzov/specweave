/**
 * The SpecWithCode desktop download linked from /studio, the homepage and the docs.
 * When a new release ships, update VERSION, DMG_NAME and DMG_BYTES from
 * `gh release view vX.Y.Z -R anton-abyzov/specwithcode --json assets`.
 * Releases are marked as pre-releases while SpecWithCode is in early access, so
 * GitHub's /releases/latest does not resolve; link the versioned asset and /releases instead.
 */
const VERSION = '0.2.11';
const DMG_NAME = `SpecWeave-Studio-${VERSION}-arm64.dmg`;
const DMG_BYTES = 152_775_292;

const REPO = 'https://github.com/anton-abyzov/specwithcode';

export const SPECWITHCODE_RELEASE = {
  version: VERSION,
  /** Size as macOS Finder shows it (decimal megabytes). */
  size: `${Math.round(DMG_BYTES / 1_000_000)} MB`,
  platform: 'macOS 13 or later',
  dmgUrl: `${REPO}/releases/download/v${VERSION}/${DMG_NAME}`,
  notesUrl: `${REPO}/releases/tag/v${VERSION}`,
  releasesUrl: `${REPO}/releases`,
  repoUrl: REPO,
} as const;
