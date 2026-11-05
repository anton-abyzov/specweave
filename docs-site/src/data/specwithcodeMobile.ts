/**
 * The SpecWithCode apps for phones. A store URL turns its card on the site into a link;
 * null shows the card as "coming soon". Set each one the day the listing goes live.
 */
export type MobileStoreKey = 'ios' | 'android';
export const SPECWITHCODE_MOBILE: Record<MobileStoreKey, {url: string | null}> = {
  ios: {url: null},      // https://apps.apple.com/app/specwithcode/id...
  android: {url: null},  // https://play.google.com/store/apps/details?id=...
};
