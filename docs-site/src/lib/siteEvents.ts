/**
 * Anonymous click counts for spec-weave.com.
 *
 * Cloudflare Web Analytics has no custom events, so a click on a control marked
 * with `data-track` is sent to the SpecWithCode relay's site-events endpoint
 * with navigator.sendBeacon. The payload carries only the event name, the
 * platform, the asset suffix, the control's placement and the page path: no
 * cookies, no storage, no identifiers. Sending never delays navigation and is
 * skipped when Do Not Track is on.
 *
 * The shapes below mirror the relay's validator (SpecWithCode
 * packages/shared/src/crashReport.ts); the relay drops anything else.
 */
export const SITE_EVENTS_DEFAULT_ORIGIN = 'https://relay.spec-weave.com';
export const SITE_EVENT_PATH = '/v1/site-events';
/** Marks a control whose activation is counted; the value is the event name. */
export const SITE_EVENT_ATTR = 'data-track';

export const SITE_EVENT_NAMES = [
  'download_click',
  'install_copy',
  'mobile_store_click',
  'chrome_extension_click',
  'github_star_click',
  'feedback_click',
] as const;
export type SiteEventName = (typeof SITE_EVENT_NAMES)[number];

export type SiteEventPlatform = 'mac' | 'windows' | 'linux-deb' | 'linux-appimage' | 'linux-server' | 'install-script' | 'other';

export interface SiteEvent {
  readonly v: 1;
  readonly event: SiteEventName;
  readonly platform: SiteEventPlatform;
  /** Asset suffix such as `arm64.dmg`, or the store or form the control leads to. */
  readonly asset?: string;
  /** Where on the page the control sits, e.g. `hero` or `download-page-windows`. */
  readonly placement?: string;
  /** Page path, e.g. `/code/download/`. */
  readonly page?: string;
}

const TOKEN = /^[A-Za-z0-9._:+-]+$/;
const PAGE = /^\/[A-Za-z0-9/_.-]{0,80}$/;

function token(value: string | null | undefined, max: number): string | undefined {
  const trimmed = (value ?? '').trim().slice(0, max);
  return trimmed && TOKEN.test(trimmed) ? trimmed : undefined;
}

export function siteEventsEndpoint(origin?: string | null): string {
  const raw = (origin ?? '').trim() || SITE_EVENTS_DEFAULT_ORIGIN;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('scheme');
    return `${url.origin}${SITE_EVENT_PATH}`;
  } catch {
    return `${SITE_EVENTS_DEFAULT_ORIGIN}${SITE_EVENT_PATH}`;
  }
}

/** Maps a release asset name or suffix to the download platform it serves. */
export function platformForAsset(asset: string): SiteEventPlatform {
  const name = asset.toLowerCase();
  if (name.endsWith('.dmg') || name.endsWith('-mac.zip')) return 'mac';
  if (name.endsWith('.exe') || name.endsWith('.msi')) return 'windows';
  if (name.endsWith('.deb')) return 'linux-deb';
  if (name.endsWith('.appimage')) return 'linux-appimage';
  if (/linux-(x64|arm64)/.test(name) && name.endsWith('.tar.gz')) return 'linux-server';
  if (name.endsWith('install.sh') || name.endsWith('install.ps1')) return 'install-script';
  return 'other';
}

/**
 * The suffix of the linked file name: `SpecWithCode-1.2.3-arm64.dmg` becomes
 * `arm64.dmg`. Links to pages, such as a releases page, have no asset.
 */
export function assetFromHref(href: string | null | undefined): string | undefined {
  if (!href) return undefined;
  let fileName: string;
  try {
    const path = new URL(href, 'https://example.invalid').pathname;
    fileName = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1));
  } catch {
    return undefined;
  }
  if (!/\.[A-Za-z0-9]+$/.test(fileName)) return undefined;
  const dash = fileName.lastIndexOf('-');
  return token(dash >= 0 ? fileName.slice(dash + 1) : fileName, 60);
}

interface TrackedElement {
  getAttribute(name: string): string | null;
}

/** Builds the event for a marked control, or null when its name is not one the relay counts. */
export function siteEventForElement(element: TrackedElement, page: string): SiteEvent | null {
  const event = element.getAttribute(SITE_EVENT_ATTR) as SiteEventName | null;
  if (!event || !SITE_EVENT_NAMES.includes(event)) return null;
  const asset = event === 'download_click'
    ? token(element.getAttribute('data-asset'), 60) ?? assetFromHref(element.getAttribute('href'))
    : token(element.getAttribute('data-store') ?? element.getAttribute('data-kind'), 60);
  const placement = token(element.getAttribute('data-placement'), 60);
  return {
    v: 1,
    event,
    platform: event === 'download_click' && asset ? platformForAsset(asset) : 'other',
    ...(asset ? {asset} : {}),
    ...(placement ? {placement} : {}),
    ...(PAGE.test(page) ? {page} : {}),
  };
}

export interface SiteEventEnvironment {
  readonly document: Pick<Document, 'addEventListener' | 'removeEventListener'>;
  readonly navigator: Pick<Navigator, 'sendBeacon'> & {readonly doNotTrack?: string | null};
  readonly location: Pick<Location, 'pathname'>;
}

/** Sends one event; never throws and never waits. */
export function sendSiteEvent(env: Pick<SiteEventEnvironment, 'navigator'>, endpoint: string, event: SiteEvent): void {
  try {
    if (env.navigator.doNotTrack === '1') return;
    if (typeof env.navigator.sendBeacon !== 'function') return;
    // text/plain keeps the beacon a simple request: no CORS preflight.
    env.navigator.sendBeacon(endpoint, new Blob([JSON.stringify(event)], {type: 'text/plain'}));
  } catch {
    // Best effort only.
  }
}

/**
 * Listens on the document for activation of marked controls. One listener
 * covers every page, so it survives client-side route changes. Returns a
 * function that stops listening.
 */
export function startSiteEvents(env: SiteEventEnvironment, origin?: string | null): () => void {
  const endpoint = siteEventsEndpoint(origin);
  // Pointer clicks and keyboard activation both fire `click`. Middle clicks
  // (open in a new tab) fire `auxclick`.
  const onClick = (e: Event) => {
    const button = (e as MouseEvent).button ?? 0;
    // Some browsers also fire a legacy `click` for a middle click; count it once.
    if (button !== (e.type === 'auxclick' ? 1 : 0)) return;
    const target = e.target as {closest?: (selector: string) => Element | null} | null;
    if (!target || typeof target.closest !== 'function') return;
    const element = target.closest(`[${SITE_EVENT_ATTR}]`);
    if (!element) return;
    const event = siteEventForElement(element, env.location.pathname);
    if (event) sendSiteEvent(env, endpoint, event);
  };
  const options = {capture: true, passive: true} as const;
  env.document.addEventListener('click', onClick, options);
  env.document.addEventListener('auxclick', onClick, options);
  return () => {
    env.document.removeEventListener('click', onClick, {capture: true});
    env.document.removeEventListener('auxclick', onClick, {capture: true});
  };
}
