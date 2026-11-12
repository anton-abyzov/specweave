/**
 * The SpecWithCode apps for phones. A store URL turns its card on the site into a link;
 * null shows the card as "coming soon". Set each one the day the listing goes live.
 */
export type MobileStoreKey = 'ios' | 'android';
export const SPECWITHCODE_MOBILE: Record<MobileStoreKey, {url: string | null}> = {
  ios: {url: 'https://apps.apple.com/app/specwithcode/id6824245458'},
  android: {url: 'https://play.google.com/store/apps/details?id=com.specwithcode.android'},
};

/**
 * Which store a browser belongs to, from its user agent: the App Store on an iPhone or iPad,
 * Google Play on Android, null on anything else. iPadOS asks for desktop sites as a Mac, and a
 * Mac has no touch screen, so touch points tell the two apart.
 */
export function phoneStoreFor(userAgent: string, maxTouchPoints = 0): MobileStoreKey | null {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return null;
}

/** Leaves for a store without keeping this page in the history, so Back does not bounce. */
export function openPhoneStore(url: string): void {
  window.location.replace(url);
}
