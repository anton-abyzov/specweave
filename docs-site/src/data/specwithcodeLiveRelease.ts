import {useEffect, useSyncExternalStore} from 'react';
import {
  SPECWITHCODE_RELEASE,
  SPECWITHCODE_WINDOWS_LINUX,
  buildDesktopRelease,
  buildMacRelease,
  type SpecWithCodeDesktopRelease,
  type SpecWithCodeMacRelease,
} from './specwithcodeRelease';
import {
  DESKTOP_ASSETS,
  MIN_BYTES,
  SPECWITHCODE_REPO,
  compareVersions,
  parseVersion,
  pickReleases,
  type PickedReleases,
} from './specwithcodeReleasePick.mjs';

/**
 * The SpecWithCode downloads a page shows, kept on the newest release while
 * the page is open.
 *
 * The site is static, so what a build wrote is as old as that build: a tab
 * left open, a cached page or a deploy still running would hand out an older
 * installer. In the browser the newest releases are read from GitHub and the
 * buttons, versions and sizes follow them. Mac moves to the newest release;
 * Windows and Linux move to the newest release that already carries all six
 * installers, which is published about twenty minutes after the Mac files.
 * Nothing ever moves back, and when GitHub cannot be read the built values stay.
 */
export interface SpecWithCodeDownloads {
  readonly release: SpecWithCodeMacRelease;
  readonly desktop: SpecWithCodeDesktopRelease;
}

/** What the deploy build recorded: the server render and the fallback. */
export const BUILT_DOWNLOADS: SpecWithCodeDownloads = {
  release: SPECWITHCODE_RELEASE,
  desktop: SPECWITHCODE_WINDOWS_LINUX,
};

/** Thirty releases back: from 1.1 most releases are Insiders pre-releases, which the page skips, and a stable one can sit a day of them back. */
export const LIVE_RELEASES_URL = `https://api.github.com/repos/${SPECWITHCODE_REPO}/releases?per_page=30`;
/** One read per visitor in this time, also after a failed one (GitHub allows 60 an hour per address). */
export const LIVE_TTL_MS = 5 * 60_000;
const CACHE_KEY = 'specwithcode:live-release:v1';

const newer = (candidate: string, shown: string) =>
  parseVersion(candidate) !== null && parseVersion(shown) !== null && compareVersions(candidate, shown) > 0;

const validBytes = (bytes: unknown, names: readonly string[]): boolean =>
  typeof bytes === 'object' &&
  bytes !== null &&
  names.every((name) => {
    const size = (bytes as Record<string, unknown>)[name];
    return typeof size === 'number' && Number.isFinite(size) && size > MIN_BYTES;
  });

/**
 * `shown` with every newer picked release applied. Returns `shown` itself when
 * nothing is newer, so callers can compare by identity.
 */
export function applyPicked(shown: SpecWithCodeDownloads, picked: PickedReleases | null | undefined): SpecWithCodeDownloads {
  if (!picked) return shown;
  let {release, desktop} = shown;
  const {mac, desktop: desktopPick} = picked;
  if (mac && newer(mac.version, release.version) && validBytes(mac.bytes, ['DMG_BYTES'])) {
    release = buildMacRelease(mac.version, mac.bytes.DMG_BYTES);
  }
  if (desktopPick && newer(desktopPick.version, desktop.version) && validBytes(desktopPick.bytes, DESKTOP_ASSETS.map(([name]) => name))) {
    desktop = buildDesktopRelease(desktopPick.version, desktopPick.bytes);
  }
  return release === shown.release && desktop === shown.desktop ? shown : {release, desktop};
}

interface CachedRead {
  /** When GitHub was last asked, in epoch milliseconds. */
  at: number;
  /** What it answered; null when the read failed. */
  picked: PickedReleases | null;
}

function readCache(storage: Pick<Storage, 'getItem'> | null, now: number): CachedRead | null {
  try {
    const parsed = JSON.parse(storage?.getItem(CACHE_KEY) ?? 'null') as CachedRead | null;
    if (!parsed || typeof parsed.at !== 'number' || parsed.at > now || now - parsed.at >= LIVE_TTL_MS) return null;
    return {at: parsed.at, picked: parsed.picked ?? null};
  } catch {
    return null;
  }
}

function writeCache(storage: Pick<Storage, 'setItem'> | null, value: CachedRead): void {
  try {
    storage?.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Private windows and full storage: the next page asks GitHub again.
  }
}

export interface LiveReleaseStore {
  get(): SpecWithCodeDownloads;
  subscribe(listener: () => void): () => void;
  /** Reads GitHub unless it was read within LIVE_TTL_MS. Never rejects. */
  refresh(): Promise<void>;
}

export interface LiveReleaseStoreOptions {
  built?: SpecWithCodeDownloads;
  fetch?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  now?: () => number;
}

export function createLiveReleaseStore(options: LiveReleaseStoreOptions = {}): LiveReleaseStore {
  const now = options.now ?? (() => Date.now());
  let shown = options.built ?? BUILT_DOWNLOADS;
  let lastRead = Number.NEGATIVE_INFINITY;
  let reading: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const apply = (picked: PickedReleases | null) => {
    const next = applyPicked(shown, picked);
    if (next === shown) return;
    shown = next;
    for (const listener of listeners) listener();
  };

  const read = async () => {
    const storage = options.storage === undefined ? browserStorage() : options.storage;
    const cached = readCache(storage, now());
    if (cached) {
      lastRead = cached.at;
      apply(cached.picked);
      return;
    }
    const doFetch = options.fetch ?? (typeof fetch === 'function' ? fetch : null);
    if (!doFetch) return;
    let picked: PickedReleases | null = null;
    try {
      const response = await doFetch(LIVE_RELEASES_URL, {
        headers: {accept: 'application/vnd.github+json'},
        // A stalled request must not hold later checks back.
        signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(10_000) : undefined,
      });
      if (response.ok) picked = pickReleases(await response.json());
    } catch {
      // Offline, blocked or rate limited: the built values stay.
    }
    lastRead = now();
    writeCache(storage, {at: lastRead, picked});
    apply(picked);
  };

  return {
    get: () => shown,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh() {
      if (reading) return reading;
      // A clock set back makes the time since the last read negative: read again then.
      const sinceRead = now() - lastRead;
      if (sinceRead >= 0 && sinceRead < LIVE_TTL_MS) return Promise.resolve();
      reading = read()
        .catch(() => undefined)
        .finally(() => {
          reading = null;
        });
      return reading;
    },
  };
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const store = createLiveReleaseStore();
const builtSnapshot = () => BUILT_DOWNLOADS;

/**
 * The downloads to render. The server render and the first client render give
 * the built values; after that they follow GitHub, and a tab that comes back
 * into view checks again.
 */
export function useSpecWithCodeRelease(): SpecWithCodeDownloads {
  const downloads = useSyncExternalStore(store.subscribe, store.get, builtSnapshot);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'hidden') void store.refresh();
    };
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', check);
    };
  }, []);
  return downloads;
}
