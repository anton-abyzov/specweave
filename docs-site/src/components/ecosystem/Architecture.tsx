import React from 'react';
import Link from '@docusaurus/Link';
import styles from './ecosystem.module.css';

export function ProductMap() {
  return <div className={styles.products}>
    <article><span className={styles.kicker}>01 / The work</span><h3>SpecWeave</h3><p>Define done. Keep the spec, task claims, verification and handoff in your repository.</p><Link to="/docs/getting-started">Start the open-source workflow ↗</Link></article>
    <article><span className={styles.kicker}>02 / The expertise</span><h3>vskill + Skill Studio</h3><p>Inspect and install skills. Evaluate their behavior against a baseline in a dedicated workspace.</p><a href="https://verified-skill.com">Explore skills and evaluations ↗</a></article>
    <article><span className={styles.kicker}>03 / The workspace</span><h3>SpecWeave Studio</h3><p>A private pilot for native coding sessions across your machines, with explicit accounts and approvals.</p><Link to="/studio">Explore the private pilot ↗</Link></article>
  </div>;
}

export default function Architecture() {
  return <figure className={styles.architecture} aria-label="Studio architecture: browser, private network, paired machine, native provider and repository">
    <div className={styles.diagramHeader}><span className={styles.kicker}>Architecture / private fleet</span><span className={styles.diagramBadge}>Each boundary is explicit</span></div>
    <div className={styles.client}><span className={styles.nodeIcon} aria-hidden="true">◫</span><div><strong>Your browser</strong><span>Review the session. Approve the next action.</span></div></div>
    <div className={styles.connector}><span>HTTPS over your private Tailscale network</span></div>
    <div className={styles.transport}><span className={styles.kicker}>Network access</span><strong>Tailscale Serve</strong><p>Reaches the selected machine’s loopback service.</p></div>
    <div className={styles.connector}><span>Separate Studio pairing on every host</span></div>
    <div className={styles.hosts}>
      {['Your laptop', 'Your workstation', 'Your remote Mac'].map((host, index) => <div className={styles.host} key={host}><span className={styles.hostNumber}>0{index + 1}</span><strong>{host}</strong><span>Studio runtime</span><div>Native agent · selected account</div><small>Local repo + session state</small></div>)}
    </div>
    <div className={styles.provider}><span aria-hidden="true">↗</span><p><strong>Model provider boundary</strong><br />Native agents contact their configured providers. Private remote access does not make cloud inference local.</p></div>
    <figcaption>Architecture illustration. Host names are examples. Network access and permission to act are separate controls.</figcaption>
  </figure>;
}
