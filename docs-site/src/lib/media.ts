/**
 * Rendered videos are served from R2 (bucket specweave-docs-media at media.spec-weave.com), not
 * from git, so clones stay small. Content keeps site paths such as /video/tutorials/x.mp4; players
 * and structured data turn them into media URLs here. Posters and captions stay in static/.
 * Keep in sync with scripts/media.mjs.
 */
export const MEDIA_ORIGIN = 'https://media.spec-weave.com';

export const isHostedMedia = (path: string): boolean => /^\/video\/.+\.(mp4|webm|mov)$/.test(path);

export const mediaUrl = (path: string): string => (isHostedMedia(path) ? `${MEDIA_ORIGIN}${path}` : path);
