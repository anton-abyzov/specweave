import React from 'react';
import Link from '@docusaurus/Link';
import TutorialVideo from '@site/src/components/TutorialVideo';
import {getTutorial} from '@site/src/data/tutorials';

const explainer = getTutorial('how-specwithcode-works')!;

export default function ExplainerVideo({id, style}: {id?: string; style?: React.CSSProperties}) {
  return <TutorialVideo
    id={id}
    title={explainer.title}
    src={explainer.src}
    poster={explainer.poster}
    captionsVtt={explainer.captionsVtt}
    preload="none"
    durationSeconds={explainer.durationSeconds}
    chapters={explainer.chapters}
    style={style}
    ariaLabel="How SpecWithCode works, narrated: subscriptions on your own machines, a private network between them, usage limits and fallbacks, a project coordinator that starts threads, auto-resolve, and which machines to use"
    caption={<>Under 3 minutes, narrated, captions available / Subscriptions on your machines, limits and fallbacks, one coordinator per project, and the hardware a worker needs. <Link to="/tutorials">All tutorials</Link></>}
  />;
}
