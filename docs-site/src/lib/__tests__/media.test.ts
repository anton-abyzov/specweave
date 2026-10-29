import {describe, expect, it} from 'vitest';
import {MEDIA_ORIGIN, mediaUrl} from '../media';
// @ts-expect-error plain ESM helper shared with the Node verifiers
import * as node from '../../../scripts/media.mjs';

describe('mediaUrl', () => {
  it('serves rendered videos from R2 and leaves everything else on the site', () => {
    expect(mediaUrl('/video/tutorials/join-a-mac.mp4')).toBe('https://media.spec-weave.com/video/tutorials/join-a-mac.mp4');
    expect(mediaUrl('/video/tutorials/join-a-mac.vtt')).toBe('/video/tutorials/join-a-mac.vtt');
    expect(mediaUrl('/video/tutorials/join-a-mac.jpg')).toBe('/video/tutorials/join-a-mac.jpg');
    expect(mediaUrl('https://example.com/a.mp4')).toBe('https://example.com/a.mp4');
  });

  it('matches the Node helper the verifiers and publish script use', () => {
    expect(node.MEDIA_ORIGIN).toBe(MEDIA_ORIGIN);
    for (const p of ['/video/a.mp4', '/video/a.webm', '/img/a.png', '/video/a.vtt']) expect(node.mediaUrl(p)).toBe(mediaUrl(p));
  });
});
