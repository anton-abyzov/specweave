// Sections that are not translated. Every locale serves them in English, their
// canonical URL is the English page, and they stay out of translated sitemaps.
// Used by docusaurus.config.ts (sitemap) and src/theme/Layout (canonical).
export const ENGLISH_ONLY_SECTIONS = ['docs', 'blog', 'search', 'privacy', 'support', 'delete-account', 'jev', 'specwithcode'];

/** True for an unprefixed path such as "/docs/x/" or "/tutorials/join-a-mac/" (the tutorials index is translated). */
export function isEnglishOnlyPath(path: string): boolean {
  const [first, second] = path.split('/').filter(Boolean);
  return ENGLISH_ONLY_SECTIONS.includes(first) || (first === 'tutorials' && Boolean(second));
}

/** Sitemap ignore globs for one translated locale. */
export function englishOnlySitemapPatterns(locale: string): string[] {
  return [
    ...ENGLISH_ONLY_SECTIONS.flatMap((s) => [`/${locale}/${s}`, `/${locale}/${s}/**`]),
    `/${locale}/tutorials/*`,
    `/${locale}/tutorials/*/**`,
  ];
}
