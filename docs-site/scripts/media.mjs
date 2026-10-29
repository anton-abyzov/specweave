// Node side of src/lib/media.ts: rendered videos live in R2, not git. Keep the two in sync.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

export const MEDIA_BUCKET = 'specweave-docs-media';
export const MEDIA_ORIGIN = 'https://media.spec-weave.com';

export const isHostedMedia = path => /^\/video\/.+\.(mp4|webm|mov)$/.test(path);

export const mediaUrl = path => (isHostedMedia(path) ? `${MEDIA_ORIGIN}${path}` : path);

/** The published copy of a site video: its URL, after checking R2 serves it as video. */
export function publishedVideo(sitePath) {
  const url = mediaUrl(sitePath);
  const result = spawnSync('curl', ['-sfI', '-o', '/dev/null', '-w', '%{content_type}', url], {encoding: 'utf8'});
  assert(result.status === 0 && result.stdout.startsWith('video/'), `video is not published at ${url} (run npm run videos:publish)`);
  return url;
}

/** The bytes of a published site video, for hash checks when no local render exists. */
export function publishedBytes(sitePath) {
  const url = publishedVideo(sitePath);
  const result = spawnSync('curl', ['-sfL', url], {maxBuffer: 512 * 1024 * 1024});
  assert.equal(result.status, 0, `could not download ${url}`);
  return result.stdout;
}
