import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import TutorialVideo from './index';
import {getTutorial, guidePath} from '@site/src/data/tutorials';

/**
 * A catalogued tutorial embedded in a doc page: the shared player with its chapters,
 * the recording note and a link to the full guide. Media, captions and chapters come
 * from src/data/tutorials.json, so a doc never repeats them by hand.
 *
 * In MDX: <TutorialEmbed slug="projects-and-threads" />
 */
export default function TutorialEmbed({slug}: {slug: string}): ReactNode {
  const tutorial = getTutorial(slug);
  if (!tutorial) throw new Error(`TutorialEmbed: no published tutorial "${slug}" in src/data/tutorials.json`);
  return (
    <TutorialVideo
      id={`video-${tutorial.slug}`}
      title={tutorial.title}
      src={tutorial.src}
      poster={tutorial.poster}
      captionsVtt={tutorial.captionsVtt}
      captionsOn={tutorial.captionsOn}
      captionsBurnedIn={tutorial.captionsBurnedIn}
      durationSeconds={tutorial.durationSeconds}
      chapters={tutorial.chapters}
      preload="none"
      ariaLabel={`${tutorial.title}: ${tutorial.audio === 'silent' ? 'captioned, no sound' : 'narrated, with captions'}`}
      caption={<>{tutorial.note} <Link to={guidePath(tutorial.slug)}>Open the guide with steps and transcript</Link></>}
    />
  );
}
