export declare const SPECWITHCODE_REPO: string;
export declare const MIN_BYTES: number;
export declare const MAC_DMG: string;
export declare const MAC_SUMS: string;
export declare const DESKTOP_SUMS: string;

export type DesktopBytesName =
  | 'EXE_X64_BYTES'
  | 'EXE_ARM64_BYTES'
  | 'APPIMAGE_X64_BYTES'
  | 'APPIMAGE_ARM64_BYTES'
  | 'DEB_X64_BYTES'
  | 'DEB_ARM64_BYTES';
export declare const DESKTOP_ASSETS: ReadonlyArray<readonly [DesktopBytesName, (version: string) => string]>;
export declare const DESKTOP_LATEST_ASSETS: ReadonlyArray<string>;
export declare const INSIDERS_FILES: ReadonlyArray<readonly [string, (version: string) => string]>;

export interface PickedRelease<Name extends string> {
  version: string;
  /** When its files were ready, as an ISO time; null when GitHub gave none. */
  readyAt: string | null;
  bytes: Record<Name, number>;
}
export interface PickedDesktopRelease extends PickedRelease<DesktopBytesName> {
  /** The newest stable release, carrying the version-free installers; absent in older caches. */
  latest?: boolean;
}
export interface PickedInsiders {
  version: string;
  /** Installer keys (specwithcodeInstaller.ts) whose file the build carries. */
  files: string[];
}
export interface PickedReleases {
  mac: PickedRelease<'DMG_BYTES'> | null;
  desktop: PickedDesktopRelease | null;
  /** Absent in answers cached before Insiders were read. */
  insiders?: PickedInsiders | null;
}

export declare function parseVersion(text: string | null | undefined): number[] | null;
export declare function compareVersions(left: string, right: string): number;
export declare function pickReleases(releases: unknown): PickedReleases;
