import React from 'react';
import TutorialVideo from '@site/src/components/TutorialVideo';

// Hosted off-site (postiz.easychamp.com) until it moves to first-party hosting, so it is not
// in the /tutorials catalogue and does not preload: nothing is fetched from that host until play.
const SRC = 'https://postiz.easychamp.com/uploads/2026/10/08/7e93469bcb88a554216610c9041cad4fe.mp4';

export default function StudioOverviewVideo() {
  return <TutorialVideo
    title="SpecWithCode overview"
    src={SRC}
    poster="/img/studio/studio-overview-cover.jpg"
    captionsVtt="/img/studio/studio-overview.vtt"
    durationSeconds={28}
    preload="none"
    chapters={[
      {start: 0, title: 'Overview'},
      {start: 3.1, title: 'Providers and accounts'},
      {start: 11.1, title: 'One workbench'},
      {start: 17.3, title: 'Task ownership'},
    ]}
    ariaLabel="SpecWithCode overview with actual interface captures"
    caption={<>28 seconds / Actual early-access interface captures, 8 October 2026, with narrated navigation guidance. This overview is not a live execution recording. AI narration using Anton’s voice; music: “Make Funk” by HoliznaCC0, CC0.</>}
  />;
}
