// This exact private prerelease is verified through authenticated release
// readback. GitHub deliberately returns 404 to the anonymous public-site crawl.
// Do not exempt the repository, other releases, or arbitrary GitHub URLs.
export const authenticatedOnlyLinks = [
  'https://github.com/anton-abyzov/specweave-studio/releases/tag/v0.2.0',
];
export const authenticatedReleaseEvidence = {
  releaseId: 408293452,
  verifiedAt: '2026-10-09',
  receiptSha256: 'a285d2988025fbc7dcf923afd5d045b5e2a12c142dd6f33eb07ce46e48da139a',
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const skippedLinkPattern = [
  'github.com/anton-abyzov/specweave/edit',
  ...authenticatedOnlyLinks.map(url => `^${escapeRegex(url)}$`),
].join('|');
