import React from 'react';
import TutorialVideo from '@site/src/components/TutorialVideo';
import {getTutorial} from '@site/src/data/tutorials';

const walkthrough = getTutorial('agent-result-walkthrough')!;

export default function StudioAgentVideo() {
  return <TutorialVideo
    title={walkthrough.title}
    src={walkthrough.src}
    poster={walkthrough.poster}
    captionsVtt={walkthrough.captionsVtt}
    preload="none"
    durationSeconds={walkthrough.durationSeconds}
    chapters={walkthrough.chapters}
    style={{margin: 0}}
    ariaLabel="SpecWithCode browser walkthrough: an agent request, real tool output, result and model switching preview"
    caption={<>Actual SpecWithCode browser recording. The completed synthetic native task is from 7 October 2026 in a disposable repository; the model-switching scene previews the new confirmation UI in an isolated fixture. No new inference runs during recording. Read the <a href="/docs/overview/studio-architecture#under-the-hood-optional-cli-deep-dive">optional CLI deep dive</a> for the mechanics agents manage.</>}
  />;
}
