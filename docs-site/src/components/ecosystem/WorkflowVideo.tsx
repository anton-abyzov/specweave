import React from 'react';
import styles from './ecosystem.module.css';

export default function WorkflowVideo() {
  return <figure className={styles.tutorial}>
    <video controls playsInline preload="none" poster="/img/studio/workflow-tutorial-cover.jpg" aria-label="SpecWeave workflow tutorial: a real task, tests and local handoff">
      <source src="https://postiz.easychamp.com/uploads/2026/10/08/732d1028a1360047c42f0a9dee749a2b4.mp4" type="video/mp4" />
      <track kind="captions" src="/img/studio/workflow-tutorial.vtt" srcLang="en" label="English" />
      Your browser does not support this video. <a href="https://postiz.easychamp.com/uploads/2026/10/08/732d1028a1360047c42f0a9dee749a2b4.mp4">Download the tutorial</a>.
    </video>
    <figcaption>60 seconds / SpecWeave 3.0.6. Actual CLI output from a disposable repository: two passing tests, one of two tasks complete, and a local handoff into a clean clone. No remote push or production changes. AI narration using Anton’s voice; music: “Make Funk” by HoliznaCC0, CC0.</figcaption>
  </figure>;
}
