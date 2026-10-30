import {describe, it, expect} from 'vitest';
import {archFromClientHints, detectVisitorPlatform, platformFromUserAgent} from '../../lib/visitorPlatform';
import {chooseInstaller, MAC_INSTALLER} from '../specwithcodeInstaller';
import {SPECWITHCODE_WINDOWS_LINUX as desktop} from '../specwithcodeRelease';

const UA = {
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  winFirefoxArm: 'Mozilla/5.0 (Windows NT 10.0; ARM64; rv:133.0) Gecko/20100101 Firefox/133.0',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  linuxArm: 'Mozilla/5.0 (X11; Linux aarch64; rv:133.0) Gecko/20100101 Firefox/133.0',
  linuxBare: 'Mozilla/5.0 (X11; Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  ubuntu: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  chromeOs: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  bot: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
};

describe('platformFromUserAgent', () => {
  it.each([
    [UA.macSafari, {os: 'mac', arch: null}],
    [UA.winChrome, {os: 'windows', arch: 'x64'}],
    [UA.winFirefoxArm, {os: 'windows', arch: 'arm64'}],
    [UA.linuxFirefox, {os: 'linux', arch: 'x64'}],
    [UA.ubuntu, {os: 'linux', arch: 'x64'}],
    [UA.linuxArm, {os: 'linux', arch: 'arm64'}],
    [UA.linuxBare, {os: 'linux', arch: null}],
    [UA.iphone, {os: 'mobile', arch: null}],
    [UA.android, {os: 'mobile', arch: null}],
    [UA.chromeOs, {os: 'unknown', arch: null}],
    [UA.bot, {os: 'unknown', arch: null}],
  ])('%s', (ua, expected) => {
    expect(platformFromUserAgent(ua)).toEqual(expected);
  });

  it('treats an iPad asking for the desktop site as mobile', () => {
    expect(platformFromUserAgent(UA.macSafari, 5)).toEqual({os: 'mobile', arch: null});
  });
});

describe('archFromClientHints', () => {
  it('maps 64-bit arm and x86', () => {
    expect(archFromClientHints({architecture: 'arm', bitness: '64'})).toBe('arm64');
    expect(archFromClientHints({architecture: 'x86', bitness: '64'})).toBe('x64');
  });
  it('ignores 32-bit and empty hints', () => {
    expect(archFromClientHints({architecture: 'x86', bitness: '32'})).toBeNull();
    expect(archFromClientHints({})).toBeNull();
  });
});

describe('detectVisitorPlatform', () => {
  const hints = (architecture: string) => ({getHighEntropyValues: async () => ({architecture, bitness: '64'})});

  it('uses client hints to find Windows on Arm behind a frozen x64 user agent', async () => {
    expect(await detectVisitorPlatform({userAgent: UA.winChrome, userAgentData: hints('arm')})).toEqual({os: 'windows', arch: 'arm64'});
  });
  it('spots an Intel Mac through client hints', async () => {
    expect(await detectVisitorPlatform({userAgent: UA.macSafari, userAgentData: hints('x86')})).toEqual({os: 'mac', arch: 'x64'});
  });
  it('falls back to the user agent when client hints fail', async () => {
    const userAgentData = {getHighEntropyValues: async () => { throw new Error('denied'); }};
    expect(await detectVisitorPlatform({userAgent: UA.linuxArm, userAgentData})).toEqual({os: 'linux', arch: 'arm64'});
  });
});

describe('chooseInstaller', () => {
  it('serves the Mac .dmg before detection, so the server render keeps a real link', () => {
    expect(chooseInstaller(null)).toEqual({installer: MAC_INSTALLER, detected: false});
  });
  it('leads Windows visitors with the installer for their CPU', () => {
    expect(chooseInstaller({os: 'windows', arch: 'x64'}).installer.url).toBe(desktop.exe.url);
    expect(chooseInstaller({os: 'windows', arch: 'arm64'}).installer.url).toBe(desktop.exeArm64.url);
    expect(chooseInstaller({os: 'windows', arch: null}).installer.url).toBe(desktop.exe.url);
  });
  it('leads Linux visitors with the AppImage and offers the .deb for the same CPU', () => {
    const x64 = chooseInstaller({os: 'linux', arch: 'x64'});
    expect(x64.installer.url).toBe(desktop.appImage.url);
    expect(x64.installer.alt?.url).toBe(desktop.deb.url);
    const arm = chooseInstaller({os: 'linux', arch: 'arm64'});
    expect(arm.installer.url).toBe(desktop.appImageArm64.url);
    expect(arm.installer.alt?.url).toBe(desktop.debArm64.url);
    expect(chooseInstaller({os: 'linux', arch: null}).archGuessed).toBe(true);
  });
  it('flags machines no build runs on', () => {
    expect(chooseInstaller({os: 'mac', arch: 'x64'}).unsupported).toBe('intel-mac');
    expect(chooseInstaller({os: 'mobile', arch: null}).unsupported).toBe('mobile');
    expect(chooseInstaller({os: 'mac', arch: null}).unsupported).toBeUndefined();
  });
});
