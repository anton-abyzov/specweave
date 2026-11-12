import {describe, it, expect, vi} from 'vitest';
import {SPECWITHCODE_RELEASE, SPECWITHCODE_WINDOWS_LINUX, buildDesktopRelease, buildMacRelease} from '../specwithcodeRelease';
import {
  BUILT_DOWNLOADS,
  LIVE_RELEASES_URL,
  LIVE_TTL_MS,
  applyPicked,
  createLiveReleaseStore,
  type SpecWithCodeDownloads,
} from '../specwithcodeLiveRelease';
import {chooseInstaller, MAC_INSTALLER} from '../specwithcodeInstaller';

const REPO = 'https://github.com/anton-abyzov/specwithcode';
const BIG = 150_000_000;
const desktopBytes = {
  EXE_X64_BYTES: BIG + 10,
  EXE_ARM64_BYTES: BIG + 11,
  APPIMAGE_X64_BYTES: BIG + 12,
  APPIMAGE_ARM64_BYTES: BIG + 13,
  DEB_X64_BYTES: BIG + 14,
  DEB_ARM64_BYTES: BIG + 15,
};
/** What a page built at 9.0.8 shows. */
const built: SpecWithCodeDownloads = {
  release: buildMacRelease('9.0.8', BIG),
  desktop: buildDesktopRelease('9.0.8', desktopBytes),
};

const macAssets = [
  {name: 'SpecWithCode-arm64.dmg', size: BIG + 1, state: 'uploaded'},
  {name: 'SHA256SUMS', size: 900, state: 'uploaded'},
];
const desktopAssets = (version: string) => [
  ...['x64.exe', 'arm64.exe', 'x86_64.AppImage', 'arm64.AppImage', 'amd64.deb', 'arm64.deb'].map((suffix, index) => ({
    name: `SpecWithCode-${version}-${suffix}`,
    size: BIG + 20 + index,
    state: 'uploaded',
  })),
  {name: 'SHA256SUMS-windows-linux', size: 900, state: 'uploaded'},
];
const ghRelease = (version: string, assets: object[]) => ({tag_name: `v${version}`, draft: false, prerelease: false, assets});
/** GitHub right after 9.0.10 shipped for Mac: its Windows and Linux files are not attached yet. */
const github = [
  ghRelease('9.0.10', macAssets),
  ghRelease('9.0.9', [...macAssets, ...desktopAssets('9.0.9')]),
  ghRelease('9.0.8', [...macAssets, ...desktopAssets('9.0.8')]),
];

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    items,
  };
};
const answering = (body: unknown, ok = true) =>
  vi.fn(async () => ({ok, json: async () => body}) as unknown as Response);

describe('SpecWithCode downloads while a page is open', () => {
  it('starts from what the build recorded', () => {
    expect(BUILT_DOWNLOADS).toEqual({release: SPECWITHCODE_RELEASE, desktop: SPECWITHCODE_WINDOWS_LINUX});
    expect(createLiveReleaseStore().get()).toBe(BUILT_DOWNLOADS);
  });

  it('moves Mac to the newest release and Windows and Linux to the newest that has every installer', async () => {
    const fetch = answering(github);
    const store = createLiveReleaseStore({built, fetch, storage: memoryStorage(), now: () => 1_000});
    const seen = vi.fn();
    store.subscribe(seen);
    await store.refresh();
    expect(fetch).toHaveBeenCalledWith(LIVE_RELEASES_URL, expect.anything());
    const {release, desktop} = store.get();
    expect(release.version).toBe('9.0.10');
    expect(release.size).toBe('150 MB');
    expect(release.dmgBytes).toBe(BIG + 1);
    expect(release.notesUrl).toBe(`${REPO}/releases/tag/v9.0.10`);
    // The Mac link never carried a version, so it was already serving 9.0.10.
    expect(release.dmgUrl).toBe(built.release.dmgUrl);
    expect(desktop.version).toBe('9.0.9');
    expect(desktop.exe.url).toBe(`${REPO}/releases/download/v9.0.9/SpecWithCode-9.0.9-x64.exe`);
    expect(desktop.debArm64.url).toBe(`${REPO}/releases/download/v9.0.9/SpecWithCode-9.0.9-arm64.deb`);
    expect(desktop.debArm64.bytes).toBe(BIG + 25);
    expect(desktop.sumsUrl).toBe(`${REPO}/releases/download/v9.0.9/SHA256SUMS-windows-linux`);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('hands the newest installers to the button picked for the visitor', async () => {
    const store = createLiveReleaseStore({built, fetch: answering(github), storage: null, now: () => 1_000});
    await store.refresh();
    const live = store.get();
    expect(chooseInstaller({os: 'windows', arch: 'arm64'}, live).installer.url).toBe(live.desktop.exeArm64.url);
    expect(chooseInstaller({os: 'linux', arch: 'x64'}, live).installer.alt?.url).toBe(live.desktop.deb.url);
    const mac = chooseInstaller({os: 'mac', arch: 'arm64'}, live).installer;
    expect(mac.version).toBe('9.0.10');
    expect(mac.url).toBe(MAC_INSTALLER.url);
  });

  it('never moves back, and keeps the same object when nothing is newer', () => {
    const older = {
      mac: {version: '9.0.7', readyAt: null, bytes: {DMG_BYTES: BIG}},
      desktop: {version: '9.0.8', readyAt: null, bytes: desktopBytes},
    };
    expect(applyPicked(built, older)).toBe(built);
    expect(applyPicked(built, {mac: null, desktop: null})).toBe(built);
    expect(applyPicked(built, null)).toBe(built);
  });

  it('ignores an answer it cannot trust', () => {
    const noSizes = {
      mac: {version: '9.9.9', readyAt: null, bytes: {DMG_BYTES: 12}},
      desktop: {version: '9.9.9', readyAt: null, bytes: {...desktopBytes, DEB_ARM64_BYTES: undefined as unknown as number}},
    };
    expect(applyPicked(built, noSizes)).toBe(built);
    const notAVersion = {mac: {version: 'nightly', readyAt: null, bytes: {DMG_BYTES: BIG}}, desktop: null};
    expect(applyPicked(built, notAVersion)).toBe(built);
  });

  it('keeps the built downloads when GitHub cannot be read, and waits before asking again', async () => {
    let clock = 1_000;
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    const storage = memoryStorage();
    const store = createLiveReleaseStore({built, fetch: failing as unknown as typeof fetch, storage, now: () => clock});
    await store.refresh();
    expect(store.get()).toBe(built);
    clock += LIVE_TTL_MS - 1;
    await store.refresh();
    expect(failing).toHaveBeenCalledTimes(1);

    const limited = answering({message: 'API rate limit exceeded'}, false);
    const second = createLiveReleaseStore({built, fetch: limited, storage: memoryStorage(), now: () => clock});
    await second.refresh();
    expect(second.get()).toBe(built);
    // A body that is not a release list changes nothing either.
    const odd = createLiveReleaseStore({built, fetch: answering({message: 'Not Found'}), storage: null, now: () => clock});
    await odd.refresh();
    expect(odd.get()).toBe(built);
  });

  it('asks GitHub once per page for a while, then again when a tab comes back later', async () => {
    let clock = 1_000;
    const fetch = answering(github);
    const storage = memoryStorage();
    const store = createLiveReleaseStore({built, fetch, storage, now: () => clock});
    await Promise.all([store.refresh(), store.refresh(), store.refresh()]);
    expect(fetch).toHaveBeenCalledTimes(1);

    // The next page in the same tab reads the stored answer and does not ask GitHub.
    clock += 60_000;
    const nextPage = createLiveReleaseStore({built, fetch, storage, now: () => clock});
    await nextPage.refresh();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(nextPage.get().release.version).toBe('9.0.10');

    // Long after, the tab comes back into view: 9.0.10 now has its Windows and Linux files.
    clock += LIVE_TTL_MS;
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ghRelease('9.0.10', [...macAssets, ...desktopAssets('9.0.10')]), ...github.slice(1)],
    } as unknown as Response);
    await store.refresh();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.get().desktop.version).toBe('9.0.10');
    expect(store.get().desktop.appImage.url).toBe(`${REPO}/releases/download/v9.0.10/SpecWithCode-9.0.10-x86_64.AppImage`);
  });

  it('reads again when the clock was set back', async () => {
    let clock = 10 * LIVE_TTL_MS;
    const fetch = answering(github);
    const store = createLiveReleaseStore({built, fetch, storage: null, now: () => clock});
    await store.refresh();
    clock -= 3 * LIVE_TTL_MS;
    await store.refresh();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('survives storage that throws or holds something else', async () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    const store = createLiveReleaseStore({built, fetch: answering(github), storage: throwing, now: () => 1_000});
    await store.refresh();
    expect(store.get().release.version).toBe('9.0.10');

    const junk = memoryStorage();
    junk.items.set('specwithcode:live-release:v1', '{"at":"yesterday","picked":42}');
    const fetch = answering(github);
    const fromJunk = createLiveReleaseStore({built, fetch, storage: junk, now: () => 1_000});
    await fromJunk.refresh();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fromJunk.get().desktop.version).toBe('9.0.9');
  });
});
