import React from 'react';
import TutorialVideo from '@site/src/components/TutorialVideo';

// Not in the /tutorials catalogue and does not preload: nothing is fetched until play.
const SRC = '/video/studio-overview.mp4';

export default function StudioOverviewVideo() {
  return <TutorialVideo
    title="SpecWithCode overview"
    src={SRC}
    poster="/img/studio/studio-overview-cover.jpg"
    captionsVtt="/img/studio/studio-overview.vtt"
    durationSeconds={30}
    preload="none"
    chapters={[
      {start: 0, title: 'Overview'},
      {start: 3.8, title: 'Providers and accounts'},
      {start: 11.9, title: 'One workbench'},
      {start: 18.6, title: 'Task ownership'},
    ]}
    ariaLabel="SpecWithCode overview with actual interface captures"
    caption={<>30 seconds / Actual early-access interface captures, 8 October 2026, with narrated navigation guidance. This overview is not a live execution recording. AI narration using Anton’s voice; music: “Make Funk” by HoliznaCC0, CC0.</>}
  />;
}
