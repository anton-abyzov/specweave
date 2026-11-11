import {describe, expect, it, vi} from 'vitest';
import {SPECWITHCODE_RELEASE} from '@site/src/data/specwithcodeRelease';
import {SPECWITHCODE_WINDOWS_LINUX as desktop} from '@site/src/data/specwithcodeRelease';
import {assetFromHref, platformForAsset, sendSiteEvent, siteEventForElement, siteEventsEndpoint, startSiteEvents} from '../siteEvents';

function link(attrs: Record<string, string>, inner = '<span>label</span>'): HTMLElement {
  const a = document.createElement('a');
  for (const [name, value] of Object.entries(attrs)) a.setAttribute(name, value);
  a.innerHTML = inner;
  document.body.appendChild(a);
  return a;
}

function harness(doNotTrack: string | null = null) {
  const sendBeacon = vi.fn((_url: string, _body: Blob) => true);
  const env = {document, navigator: {sendBeacon, doNotTrack}, location: {pathname: '/code/download/'}};
  return {env, sendBeacon};
}

async function sent(mock: ReturnType<typeof harness>['sendBeacon'], call = 0) {
  const [url, blob] = mock.mock.calls[call];
  expect(blob.type).toBe('text/plain');
  return {url, body: JSON.parse(await blob.text())};
}

describe('siteEventsEndpoint', () => {
  it('defaults to the relay and keeps only the origin of an override', () => {
    expect(siteEventsEndpoint()).toBe('https://relay.spec-weave.com/v1/site-events');
    expect(siteEventsEndpoint('https://relay.example.com/x?y=1')).toBe('https://relay.example.com/v1/site-events');
    expect(siteEventsEndpoint('javascript:alert(1)')).toBe('https://relay.spec-weave.com/v1/site-events');
  });
});

describe('assets and platforms', () => {
  it('names every installer the site links to', () => {
    const cases: Array<[string, string, string]> = [
      [SPECWITHCODE_RELEASE.dmgUrl, 'arm64.dmg', 'mac'],
      [desktop.exe.url, 'x64.exe', 'windows'],
      [desktop.exeArm64.url, 'arm64.exe', 'windows'],
      [desktop.appImage.url, 'x86_64.AppImage', 'linux-appimage'],
      [desktop.appImageArm64.url, 'arm64.AppImage', 'linux-appimage'],
      [desktop.deb.url, 'amd64.deb', 'linux-deb'],
      [desktop.debArm64.url, 'arm64.deb', 'linux-deb'],
    ];
    for (const [url, asset, platform] of cases) {
      expect(assetFromHref(url)).toBe(asset);
      expect(platformForAsset(asset)).toBe(platform);
    }
  });

  it('gives pages and odd names no asset', () => {
    expect(assetFromHref('https://github.com/o/r/releases')).toBeUndefined();
    expect(assetFromHref('/code/download/')).toBeUndefined();
    expect(assetFromHref(null)).toBeUndefined();
    expect(platformForAsset('studio-1.0.0-linux-arm64-abc.tar.gz')).toBe('linux-server');
    expect(platformForAsset('notes.txt')).toBe('other');
  });
});

describe('siteEventForElement', () => {
  it('builds a download event from the link', () => {
    const a = link({'data-track': 'download_click', 'data-placement': 'download-page-deb', href: desktop.deb.url});
    expect(siteEventForElement(a, '/code/download/')).toEqual({
      v: 1, event: 'download_click', platform: 'linux-deb', asset: 'amd64.deb', placement: 'download-page-deb', page: '/code/download/',
    });
  });

  it('labels other counted controls and drops unsafe values', () => {
    const store = link({'data-track': 'mobile_store_click', 'data-store': 'ios', 'data-placement': 'a b', href: 'https://apps.apple.com/app/x'});
    expect(siteEventForElement(store, '/code/?utm=x')).toEqual({v: 1, event: 'mobile_store_click', platform: 'other', asset: 'ios'});
    expect(siteEventForElement(link({'data-track': 'feedback_click', 'data-kind': 'bug'}), '/code/')).toMatchObject({asset: 'bug', page: '/code/'});
    expect(siteEventForElement(link({'data-track': 'something_else'}), '/code/')).toBeNull();
  });
});

describe('startSiteEvents', () => {
  it('beacons one event for a click inside a download link, and none after stop', async () => {
    const {env, sendBeacon} = harness();
    const stop = startSiteEvents(env);
    const a = link({'data-track': 'download_click', 'data-placement': 'hero', 'data-os': 'mac', href: SPECWITHCODE_RELEASE.dmgUrl});
    a.addEventListener('click', e => e.preventDefault());
    a.querySelector('span')!.click();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const {url, body} = await sent(sendBeacon);
    expect(url).toBe('https://relay.spec-weave.com/v1/site-events');
    expect(body).toEqual({v: 1, event: 'download_click', platform: 'mac', asset: 'arm64.dmg', placement: 'hero', page: '/code/download/'});
    stop();
    a.click();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('counts middle clicks, ignores right clicks and unmarked links', () => {
    const {env, sendBeacon} = harness();
    const stop = startSiteEvents(env, 'https://relay.example.com');
    const a = link({'data-track': 'download_click', href: desktop.exe.url});
    const plain = link({href: desktop.exe.url});
    plain.addEventListener('click', e => e.preventDefault());
    plain.click();
    a.dispatchEvent(new MouseEvent('auxclick', {bubbles: true, button: 2}));
    a.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, button: 1}));
    expect(sendBeacon).not.toHaveBeenCalled();
    a.dispatchEvent(new MouseEvent('auxclick', {bubbles: true, button: 1}));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('https://relay.example.com/v1/site-events');
    stop();
  });

  it('sends nothing when Do Not Track is on', () => {
    const {env, sendBeacon} = harness('1');
    const stop = startSiteEvents(env);
    const a = link({'data-track': 'download_click', href: desktop.exe.url});
    a.addEventListener('click', e => e.preventDefault());
    a.click();
    expect(sendBeacon).not.toHaveBeenCalled();
    stop();
  });
});

describe('sendSiteEvent', () => {
  it('never throws when the beacon fails', () => {
    const navigator = {sendBeacon: () => { throw new Error('blocked'); }};
    expect(() => sendSiteEvent({navigator}, 'https://x/v1/site-events', {v: 1, event: 'download_click', platform: 'other'})).not.toThrow();
  });
});
