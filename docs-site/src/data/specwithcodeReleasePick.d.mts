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

export interface PickedRelease<Name extends string> {
  version: string;
  /** When its files were ready, as an ISO time; null when GitHub gave none. */
  readyAt: string | null;
  bytes: Record<Name, number>;
}
export interface PickedReleases {
  mac: PickedRelease<'DMG_BYTES'> | null;
  desktop: PickedRelease<DesktopBytesName> | null;
}

export declare function parseVersion(text: string | null | undefined): number[] | null;
export declare function compareVersions(left: string, right: string): number;
export declare function pickReleases(releases: unknown): PickedReleases;
