// Docusaurus 3.9.2 wrap: preserve the shared layout and complete archive metadata.
import React, {type ReactNode} from 'react';
import OriginalLayout from '@theme-original/Layout';
import type {Props} from '@theme/Layout';
import {useLocation} from '@docusaurus/router';
import {PageMetadata} from '@docusaurus/theme-common';
import Head from '@docusaurus/Head';

const archiveMetadata: Record<string, {title: string; description: string}> = {
  '/blog/authors/': {
    title: 'Blog authors',
    description: 'Meet the people writing SpecWeave announcements, AI coding workflow guides and agent skill security articles.',
  },
  '/blog/authors/antonabyzov/': {
    title: 'Anton Abyzov: SpecWeave articles',
    description: 'Read SpecWeave announcements and AI agent workflow articles by Anton Abyzov, the creator of SpecWeave.',
  },
  '/blog/tags/': {
    title: 'Blog topics',
    description: 'Browse SpecWeave articles by topic, including AI coding, spec-driven development, Claude Code and agent skill security.',
  },
  '/docs/tags/': {
    title: 'Documentation topics',
    description: 'Find SpecWeave documentation by topic, including specifications, extensible skills, customization and dynamic context injection.',
  },
  '/search/': {
    title: 'Search the SpecWeave documentation',
    description: 'Search SpecWeave guides, command references and articles to find answers about AI coding workflows and portable handoffs.',
  },
};

export default function LayoutWrapper(props: Props): ReactNode {
  const {pathname} = useLocation();
  const path = `${pathname.replace(/\/$/, '')}/`;
  let metadata = archiveMetadata[path];
  const docTag = path.match(/^\/docs\/tags\/([^/]+)\/$/);
  if (docTag) {
    const topic = decodeURIComponent(docTag[1]).replace(/-/g, ' ');
    metadata = {
      title: `${topic.charAt(0).toUpperCase()}${topic.slice(1)} documentation`,
      description: `Browse SpecWeave guides on ${topic}, with links to the original documentation.`,
    };
  }

  return (
    <>
      <OriginalLayout {...props} />
      {metadata && <PageMetadata {...metadata} />}
      {path === '/search/' && (
        <Head><meta name="robots" content="noindex, follow" /></Head>
      )}
    </>
  );
}
