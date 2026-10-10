import React from 'react';
import styles from './ecosystem.module.css';

export default function StudioTutorialVideo() {
  return <figure className={styles.tutorial} style={{marginTop: 40}}>
    <video controls playsInline preload="none" poster="/img/studio/studio-tutorial-cover.jpg" aria-label="SpecWeave Studio tour: a project coordinator splits work between Codex and Claude workers, then a Claude thread at its usage limit continues on Codex with its context">
      <source src="/video/studio-tutorial.mp4" type="video/mp4" />
      Your browser does not support this video. <a href="/video/studio-tutorial.mp4">Download the tour</a>.
    </video>
    <figcaption>72 seconds, no sound / A project, two workers on different models, and a Claude thread that hits its usage limit and continues on Codex with its context. Animated from real Studio captures taken 8 to 9 October 2026; not a live screen recording.</figcaption>
  </figure>;
}
