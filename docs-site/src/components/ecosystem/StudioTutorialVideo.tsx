import React from 'react';
import Link from '@docusaurus/Link';
import TutorialVideo from '@site/src/components/TutorialVideo';
import {getTutorial} from '@site/src/data/tutorials';

const tour = getTutorial('specwithcode-tour')!;

export default function StudioTutorialVideo() {
  return <TutorialVideo
    title={tour.title}
    src={tour.src}
    poster={tour.poster}
    captionsVtt={tour.captionsVtt}
    durationSeconds={tour.durationSeconds}
    chapters={tour.chapters}
    style={{marginTop: 40}}
    ariaLabel="SpecWithCode tour, screen recordings: a project coordinator splits work between Codex and Claude workers, then a Claude thread at its usage limit continues on Codex and still knows the code word it was told"
    caption={<>61 seconds, no sound, descriptive captions / A project, two workers on different models, and a Claude thread that hits its usage limit and continues on Codex with its context. Screen recordings of SpecWithCode on a Mac, 10 October 2026; the usage limit in the handoff clip is simulated. <Link to="/tutorials">All tutorials</Link></>}
  />;
}
