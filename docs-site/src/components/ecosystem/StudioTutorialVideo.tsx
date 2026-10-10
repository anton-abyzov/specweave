import React from 'react';
import styles from './ecosystem.module.css';

export default function StudioTutorialVideo() {
  return <figure className={styles.tutorial} style={{marginTop: 40}}>
    <video controls playsInline preload="none" poster="/img/studio/studio-tutorial-cover.jpg" aria-label="SpecWeave Studio tour, screen recordings: a project coordinator splits work between Codex and Claude workers, then a Claude thread at its usage limit continues on Codex and still knows the code word it was told">
      <source src="/video/studio-tutorial.mp4" type="video/mp4" />
      Your browser does not support this video. <a href="/video/studio-tutorial.mp4">Download the tour</a>.
    </video>
    <figcaption>61 seconds, no sound / A project, two workers on different models, and a Claude thread that hits its usage limit and continues on Codex with its context. Screen recordings of Studio on a Mac, 10 October 2026; the usage limit in the handoff clip is simulated.</figcaption>
  </figure>;
}
