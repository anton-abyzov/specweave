/* Swizzled from @docusaurus/theme-classic@3.9.2 -- EJECT mode.
   One change: pages in src/data/englishOnlyPaths.ts (docs, blog, ...) are English in every
   locale and canonicalize to English, so they emit no hreflang alternates.
   On upgrade, diff against theme-classic/lib/theme/SiteMetadata/index.js and port manually. */

import React, {type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {PageMetadata, useThemeConfig} from '@docusaurus/theme-common';
import {DEFAULT_SEARCH_TAG, useAlternatePageUtils, keyboardFocusedClassName} from '@docusaurus/theme-common/internal';
import {useLocation} from '@docusaurus/router';
import {applyTrailingSlash} from '@docusaurus/utils-common';
import SearchMetadata from '@theme/SearchMetadata';
import useUnprefixedPathname from '@site/src/hooks/useUnprefixedPathname';
import {isEnglishOnlyPath} from '@site/src/data/englishOnlyPaths';

// See https://developers.google.com/search/docs/advanced/crawling/localized-versions
function AlternateLangHeaders(): ReactNode {
  const {
    i18n: {currentLocale, defaultLocale, localeConfigs},
  } = useDocusaurusContext();
  const alternatePageUtils = useAlternatePageUtils();
  const currentHtmlLang = localeConfigs[currentLocale]!.htmlLang;
  // Open Graph uses underscores instead of dashes: https://ogp.me/#optional
  const bcp47ToOpenGraphLocale = (code: string) => code.replace('-', '_');
  return (
    <Head>
      {Object.entries(localeConfigs).map(([locale, {htmlLang}]) => (
        <link key={locale} rel="alternate" href={alternatePageUtils.createUrl({locale, fullyQualified: true})} hrefLang={htmlLang} />
      ))}
      <link rel="alternate" href={alternatePageUtils.createUrl({locale: defaultLocale, fullyQualified: true})} hrefLang="x-default" />
      <meta property="og:locale" content={bcp47ToOpenGraphLocale(currentHtmlLang)} />
      {Object.values(localeConfigs)
        .filter((config) => currentHtmlLang !== config.htmlLang)
        .map((config) => (
          <meta key={`meta-og-${config.htmlLang}`} property="og:locale:alternate" content={bcp47ToOpenGraphLocale(config.htmlLang)} />
        ))}
    </Head>
  );
}

// Default canonical url inferred from current page location pathname
function useDefaultCanonicalUrl() {
  const {
    siteConfig: {url: siteUrl, baseUrl, trailingSlash},
  } = useDocusaurusContext();
  const {pathname} = useLocation();
  const canonicalPathname = applyTrailingSlash(useBaseUrl(pathname), {trailingSlash, baseUrl});
  return siteUrl + canonicalPathname;
}

function CanonicalUrlHeaders({permalink}: {permalink?: string}): ReactNode {
  const {
    siteConfig: {url: siteUrl},
  } = useDocusaurusContext();
  const defaultCanonicalUrl = useDefaultCanonicalUrl();
  const canonicalUrl = permalink ? `${siteUrl}${permalink}` : defaultCanonicalUrl;
  return (
    <Head>
      <meta property="og:url" content={canonicalUrl} />
      <link rel="canonical" href={canonicalUrl} />
    </Head>
  );
}

export default function SiteMetadata(): ReactNode {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const {metadata, image: defaultImage} = useThemeConfig();
  const englishOnly = isEnglishOnlyPath(useUnprefixedPathname());
  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary_large_image" />
        {/* The keyboard focus class name need to be applied when SSR so links are outlined when JS is disabled */}
        <body className={keyboardFocusedClassName} />
      </Head>

      {defaultImage && <PageMetadata image={defaultImage} />}

      <CanonicalUrlHeaders />

      {!englishOnly && <AlternateLangHeaders />}

      <SearchMetadata tag={DEFAULT_SEARCH_TAG} locale={currentLocale} />

      {/* A separate <Head> lets react-helmet override earlier defaults such as twitter:card. */}
      <Head>
        {metadata.map((metadatum, i) => (
          <meta key={i} {...metadatum} />
        ))}
      </Head>
    </>
  );
}
