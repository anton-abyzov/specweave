import React from 'react';
import TutorialVideo from '@site/src/components/TutorialVideo';

// Hosted off-site (postiz.easychamp.com) until it moves to first-party hosting, so it is not
// in the /tutorials catalogue and does not preload: nothing is fetched from that host until play.
const SRC = 'https://postiz.easychamp.com/uploads/2026/10/08/732d1028a1360047c42f0a9dee749a2b4.mp4';

export default function WorkflowVideo() {
  return <TutorialVideo
    title="SpecWeave workflow tutorial"
    src={SRC}
    poster="/img/studio/workflow-tutorial-cover.jpg"
    captionsVtt="/img/studio/workflow-tutorial.vtt"
    durationSeconds={60}
    preload="none"
    chapters={[
      {start: 0, title: 'A disposable demo repository'},
      {start: 7.1, title: 'Create an increment'},
      {start: 15.3, title: 'Claim the task'},
      {start: 18.4, title: 'Implement and test'},
      {start: 25.9, title: 'Commit and mark done'},
      {start: 33.6, title: 'Hand off'},
      {start: 43.2, title: 'Pick up in a clean clone'},
    ]}
    ariaLabel="SpecWeave workflow tutorial: a real task, tests and local handoff"
    caption={<>60 seconds / SpecWeave 3.0.6. Actual CLI output from a disposable repository: two passing tests, one of two tasks complete, and a local handoff into a clean clone. No remote push or production changes. AI narration using Anton’s voice; music: “Make Funk” by HoliznaCC0, CC0.</>}
  />;
}
