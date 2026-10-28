/* Swizzled from @docusaurus/theme-classic@3.9.2 -- WRAP mode.
   Adds TechArticle structured data to comparison pages and guides. */

import React, {type ReactNode} from 'react';
import Metadata from '@theme-original/DocItem/Metadata';
import Head from '@docusaurus/Head';
import {useDoc} from '@docusaurus/plugin-content-docs/client';

const origin = 'https://spec-weave.com';
// spec-as-code writes its own TechArticle and FAQPage graph.
const ownSchema = new Set(['/docs/compare/spec-as-code/']);

export function techArticle(doc: {title: string; description: string; permalink: string; lastUpdatedAt?: number | null}) {
  const {title, description, lastUpdatedAt} = doc;
  // Slugged docs report their permalink without the trailing slash the site serves.
  const permalink = doc.permalink.endsWith('/') ? doc.permalink : `${doc.permalink}/`;
  if (!/^\/docs\/(compare|guides)\//.test(permalink) || ownSchema.has(permalink)) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url: `${origin}${permalink}`,
    ...(lastUpdatedAt ? {dateModified: new Date(lastUpdatedAt).toISOString()} : {}),
    author: {'@type': 'Person', name: 'Anton Abyzov', url: 'https://github.com/anton-abyzov'},
    publisher: {'@id': `${origin}/#org`},
    isPartOf: {'@id': `${origin}/#website`},
  };
}

export default function DocItemMetadataWrapper(): ReactNode {
  const {metadata} = useDoc();
  const article = techArticle(metadata);
  return (
    <>
      <Metadata />
      {article && (
        <Head>
          <script type="application/ld+json">{JSON.stringify(article)}</script>
        </Head>
      )}
    </>
  );
}
