import React from 'react';
import styles from './ecosystem.module.css';

export default function StudioAgentVideo() {
  return <figure className={styles.tutorial} style={{ margin: 0 }}>
    <video controls playsInline preload="none" poster="/img/studio/agent-driven-demo-cover.jpg" aria-label="SpecWeave Studio browser walkthrough: an agent request, real tool output, result and model switching preview">
      <source src="/img/studio/agent-driven-demo.mp4" type="video/mp4" />
      <track kind="captions" src="/img/studio/agent-driven-demo.vtt" srcLang="en" label="English" />
      Your browser does not support this video. <a href="/img/studio/agent-driven-demo.mp4">Download the browser walkthrough</a>.
    </video>
    <figcaption>A recorded agent task and its file change, followed by an isolated preview of model-switch confirmation. Synthetic demo repository, 7 October 2026; no fresh inference. Music: <a href="https://freemusicarchive.org/music/holiznacc0/bassic/make-funk/">“Make Funk” by HoliznaCC0</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>. Read the <a href="/docs/overview/studio-architecture#under-the-hood-optional-cli-deep-dive">optional CLI deep dive</a> for the mechanics agents manage.</figcaption>
  </figure>;
}
