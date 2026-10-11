import React from 'react';
import styles from './ecosystem.module.css';

export default function StudioAgentVideo() {
  return <figure className={styles.tutorial} style={{ margin: 0 }}>
    <video controls playsInline preload="none" poster="/img/studio/agent-driven-demo-cover.jpg" aria-label="SpecWithCode browser walkthrough: an agent request, real tool output, result and model switching preview">
      <source src="/img/studio/agent-driven-demo.mp4" type="video/mp4" />
      <track kind="captions" src="/img/studio/agent-driven-demo.vtt" srcLang="en" label="English" />
      Your browser does not support this video. <a href="/img/studio/agent-driven-demo.mp4">Download the browser walkthrough</a>.
    </video>
    <figcaption>Actual SpecWithCode browser recording. The completed synthetic native task is from 7 October 2026 in a disposable repository; the model-switching scene previews the new confirmation UI in an isolated fixture. No new inference runs during recording. Read the <a href="/docs/overview/studio-architecture#under-the-hood-optional-cli-deep-dive">optional CLI deep dive</a> for the mechanics agents manage.</figcaption>
  </figure>;
}
