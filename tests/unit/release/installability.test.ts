import { describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { packedManifest, validateManifest, waitForPublishedManifest } from '../../../scripts/release/verify-package-install.mjs';

const expected = { name: 'specweave', version: '2.2.3' };
const valid = { ...expected, bin: { specweave: 'bin/specweave.js' }, dist: { tarball: 'https://registry.npmjs.org/specweave/-/specweave-2.2.3.tgz', integrity: 'sha512-test' } };
function archive(name: string, body: string) {
  const header = Buffer.alloc(512);
  header.write(name);
  header.write(Buffer.byteLength(body).toString(8).padStart(11, '0') + '\0', 124);
  const data = Buffer.alloc(Math.ceil(Buffer.byteLength(body) / 512) * 512);
  data.write(body);
  return gzipSync(Buffer.concat([header, data, Buffer.alloc(1024)]));
}

describe('published package installability gate', () => {
  it('reads actual packed manifest, not the source manifest', () => {
    const packed = packedManifest(archive('package/package.json', JSON.stringify({ ...expected, bin: {} })));
    expect(() => validateManifest(packed, expected)).toThrow('must expose specweave');
  });
  it.each(['bin/specweave.js', './bin/specweave.js'])('accepts valid normalized bin %s', (entry) => {
    expect(() => validateManifest({ ...valid, bin: { specweave: entry } }, expected)).not.toThrow();
  });
  it('rejects wrong package identity', () => {
    expect(() => validateManifest({ ...valid, version: '2.2.2' }, expected)).toThrow('identity');
  });
  it('rejects archives without package.json', () => {
    expect(() => packedManifest(archive('package/readme.txt', 'hello'))).toThrow('missing');
  });
  it('waits through accepted-but-processing 404 before validating public metadata', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 404 })).mockResolvedValueOnce(new Response(JSON.stringify(valid)));
    const wait = vi.fn();
    expect(await waitForPublishedManifest(expected.version, { fetchImpl, wait, attempts: 2 })).toEqual(valid);
    expect(wait).toHaveBeenCalledOnce();
  });
  it('does not report success when registry processing never completes', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 404 }));
    await expect(waitForPublishedManifest(expected.version, { fetchImpl, wait: vi.fn(), attempts: 2 })).rejects.toThrow('not publicly available');
  });
  it('fails immediately for missing published bin mapping', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ...valid, bin: {} })));
    await expect(waitForPublishedManifest(expected.version, { fetchImpl, attempts: 1 })).rejects.toThrow('must expose');
  });
  it('rejects published metadata without integrity', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ...valid, dist: {} })));
    await expect(waitForPublishedManifest(expected.version, { fetchImpl, attempts: 1 })).rejects.toThrow('integrity');
  });
});
