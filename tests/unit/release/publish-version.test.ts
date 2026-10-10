import { describe, expect, it, vi } from 'vitest';
import { assertPublishVersion, checkPublishVersion } from '../../../scripts/release/guard-publish-version.mjs';

describe('concurrent stable release protection', () => {
  it.each([['3.0.4', '3.0.5'], ['2.99.99', '3.0.5'], ['3.0.99', '3.1.0']])('rejects %s below npm latest %s', (version, latest) => {
    expect(() => assertPublishVersion(version, latest)).toThrow('Refusing stable release');
  });
  it.each(['3.0.5', '3.0.6', '3.0.10', '3.1.0', '4.0.0', '3.0.5+build-1'])('permits current or newer version %s', (version) => {
    expect(assertPublishVersion(version, '3.0.5').tag).toBe('latest');
  });
  it.each(['3.1.0-rc.1', '3.0.4-beta.2', '4.0.0-preview.1'])('keeps prerelease %s off latest', (version) => {
    expect(assertPublishVersion(version, '3.0.5').tag).toBe('next');
  });
  it.each(['v3.0.5', '3.0', '3.00.5', '3.0.5-01', '', undefined])('rejects invalid version %s', (version) => {
    expect(() => assertPublishVersion(version, '3.0.5')).toThrow();
  });
  it('fails closed when registry latest is not stable', () => {
    expect(() => assertPublishVersion('3.0.5', '3.0.6-rc.1')).toThrow('unexpectedly');
  });
  it('verifies fixed public registry identity before allowing publication', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ name: 'specweave', version: '3.0.5' })));
    await expect(checkPublishVersion('3.0.6', { fetchImpl })).resolves.toEqual({ version: '3.0.6', latest: '3.0.5', tag: 'latest' });
    expect(new URL(fetchImpl.mock.calls[0][0]).origin).toBe('https://registry.npmjs.org');
  });
  it.each([404, 429, 503])('fails closed on registry HTTP %i', async (status) => {
    await expect(checkPublishVersion('3.0.6', { fetchImpl: async () => new Response('{}', { status }) })).rejects.toThrow(`HTTP ${status}`);
  });
  it('fails closed on malformed or wrong package metadata', async () => {
    await expect(checkPublishVersion('3.0.6', { fetchImpl: async () => new Response('{') })).rejects.toThrow();
    await expect(checkPublishVersion('3.0.6', { fetchImpl: async () => new Response('{"name":"other","version":"3.0.5"}') })).rejects.toThrow('identity');
  });
});
