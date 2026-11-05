import {useEffect, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop} from './specwithcodeRelease';
import {detectVisitorPlatform, type VisitorPlatform} from '../lib/visitorPlatform';

/**
 * The SpecWithCode installer a download button leads with. The server render and
 * no-JS visitors get the Mac .dmg; after hydration the button switches to the
 * visitor's own platform.
 */
export interface SpecWithCodeInstaller {
  /** Stable key for `data-os` analytics attributes. */
  key: 'mac' | 'windows-x64' | 'windows-arm64' | 'linux-x64' | 'linux-arm64';
  /** Button text, without the size. */
  label: string;
  /** Who it is for, as one phrase: "Windows on x64". */
  platformName: string;
  file: string;
  url: string;
  size: string;
  version: string;
  /** Second package for the same platform (the .deb next to a Linux AppImage). */
  alt?: {label: string; file: string; url: string; size: string};
}

/** Visible copy is a getter, so it renders in the active locale. */
export const MAC_INSTALLER: SpecWithCodeInstaller = {
  key: 'mac',
  get label() { return translate({id: 'installer.mac.label', message: 'Download for Mac', description: 'Download button for the macOS installer. Keep product names in English'}); },
  get platformName() { return translate({id: 'installer.mac.platformName', message: 'macOS on Apple silicon', description: 'Who the macOS installer is for. Keep product names in English'}); },
  file: 'SpecWithCode-arm64.dmg',
  url: release.dmgUrl,
  size: release.size,
  version: release.version,
};

export const ALL_DOWNLOADS_ANCHOR = '#windows-linux-title';

export interface InstallerChoice {
  installer: SpecWithCodeInstaller;
  /** False until the visitor's platform is known; the Mac default is showing. */
  detected: boolean;
  /** Set when no build runs on the visitor's computer: an Intel Mac or a phone. */
  unsupported?: 'intel-mac' | 'mobile';
  /** Linux with an unknown CPU: x64 is offered, but the visitor should check. */
  archGuessed?: boolean;
}

export function chooseInstaller(platform: VisitorPlatform | null): InstallerChoice {
  if (!platform) return {installer: MAC_INSTALLER, detected: false};
  const {os, arch} = platform;
  if (os === 'mac') return arch === 'x64'
    ? {installer: MAC_INSTALLER, detected: true, unsupported: 'intel-mac'}
    : {installer: MAC_INSTALLER, detected: true};
  if (os === 'windows') {
    const arm = arch === 'arm64';
    const a = arm ? desktop.exeArm64 : desktop.exe;
    return {detected: true, installer: {
      key: arm ? 'windows-arm64' : 'windows-x64',
      label: arm ? translate({id: 'installer.windowsArm64.label', message: 'Download for Windows on Arm', description: 'Download button for the Windows arm64 installer. Keep product names in English'}) : translate({id: 'installer.windowsX64.label', message: 'Download for Windows', description: 'Download button for the Windows x64 installer. Keep product names in English'}),
      platformName: arm ? translate({id: 'installer.windowsArm64.platformName', message: 'Windows 10 and 11 on arm64', description: 'Who the Windows arm64 installer is for. Keep product names in English'}) : translate({id: 'installer.windowsX64.platformName', message: 'Windows 10 and 11 on x64', description: 'Who the Windows x64 installer is for. Keep product names in English'}),
      file: a.name, url: a.url, size: a.size, version: desktop.version,
    }};
  }
  if (os === 'linux') {
    const arm = arch === 'arm64';
    const appImage = arm ? desktop.appImageArm64 : desktop.appImage;
    const deb = arm ? desktop.debArm64 : desktop.deb;
    return {detected: true, archGuessed: arch === null, installer: {
      key: arm ? 'linux-arm64' : 'linux-x64',
      label: arm ? translate({id: 'installer.linuxArm64.label', message: 'Download for Linux on Arm', description: 'Download button for the Linux arm64 AppImage. Keep product names in English'}) : translate({id: 'installer.linuxX64.label', message: 'Download for Linux', description: 'Download button for the Linux x64 AppImage. Keep product names in English'}),
      platformName: arm ? translate({id: 'installer.linuxArm64.platformName', message: 'Linux on arm64 (glibc)', description: 'Who the Linux arm64 installer is for. Keep product names in English'}) : translate({id: 'installer.linuxX64.platformName', message: 'Linux on x64 (glibc)', description: 'Who the Linux x64 installer is for. Keep product names in English'}),
      file: appImage.name, url: appImage.url, size: appImage.size, version: desktop.version,
      alt: {label: translate({id: 'installer.linux.debLabel', message: '.deb for Debian and Ubuntu', description: 'Button for the Linux .deb package. Keep product names in English'}), file: deb.name, url: deb.url, size: deb.size},
    }};
  }
  if (os === 'mobile') return {installer: MAC_INSTALLER, detected: true, unsupported: 'mobile'};
  return {installer: MAC_INSTALLER, detected: false};
}

/** The installer for this visitor; the Mac default until the browser has been asked. */
export function useSpecWithCodeInstaller(): InstallerChoice {
  const [platform, setPlatform] = useState<VisitorPlatform | null>(null);
  useEffect(() => {
    let live = true;
    detectVisitorPlatform(navigator).then(p => { if (live) setPlatform(p); });
    return () => { live = false; };
  }, []);
  return chooseInstaller(platform);
}
