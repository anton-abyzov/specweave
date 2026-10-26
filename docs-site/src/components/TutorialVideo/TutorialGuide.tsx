import React, {useEffect, useState, type ReactNode} from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {buildGuideJsonLd, getTutorial, parseStart, type TranscriptCapture, type TranscriptSection} from '@site/src/data/tutorials';
import {GuideBody} from './GuideBody';

/**
 * Route component for /tutorials/<slug>/. plugins/tutorial-pages adds one route per
 * published tutorial and passes its slug, the transcript built from its captions and the
 * terminal captures named in tutorial-extras.json.
 */
export default function TutorialGuide({slug, transcript = [], captures = []}: {slug: string; transcript?: TranscriptSection[]; captures?: TranscriptCapture[]}): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const [startAt, setStartAt] = useState<number | undefined>();

  // Chapter links carry ?t=<s>; redirected hub links carry #t=<s>.
  useEffect(() => {
    setStartAt(parseStart(window.location.search, window.location.hash));
  }, []);

  const tutorial = getTutorial(slug);
  if (!tutorial) throw new Error(`No published tutorial "${slug}"`);
  const origin = siteConfig.url;

  return (
    <Layout title={tutorial.seoTitle} description={tutorial.seoDescription ?? tutorial.summary}>
      <Head>
        <meta property="og:type" content="article" />
        <meta property="og:image" content={`${origin}${tutorial.poster}`} />
        <script type="application/ld+json">{JSON.stringify(buildGuideJsonLd(tutorial, origin, transcript))}</script>
      </Head>
      <GuideBody tutorial={tutorial} transcript={transcript} captures={captures} startAt={startAt} />
    </Layout>
  );
}
