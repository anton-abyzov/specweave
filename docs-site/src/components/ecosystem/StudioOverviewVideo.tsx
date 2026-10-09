import React from 'react';
import styles from './ecosystem.module.css';

export default function StudioOverviewVideo() {
  return <figure className={styles.tutorial}>
    <video controls playsInline preload="none" poster="/img/studio/studio-overview-cover.jpg" aria-label="SpecWeave Studio private pilot overview with actual interface captures">
      <source src="https://postiz.easychamp.com/uploads/2026/10/08/7e93469bcb88a554216610c9041cad4fe.mp4" type="video/mp4" />
      <track kind="captions" src="/img/studio/studio-overview.vtt" srcLang="en" label="English" />
      Your browser does not support this video. <a href="https://postiz.easychamp.com/uploads/2026/10/08/7e93469bcb88a554216610c9041cad4fe.mp4">Download the overview</a>.
    </video>
    <figcaption>28 seconds / Actual private-pilot interface captures, 8 October 2026, with narrated navigation guidance. This overview is not a live execution recording. AI narration using Anton’s voice; music: “Make Funk” by HoliznaCC0, CC0.</figcaption>
  </figure>;
}
