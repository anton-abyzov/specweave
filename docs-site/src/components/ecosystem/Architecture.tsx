import React from 'react';
import Link from '@docusaurus/Link';
import styles from './ecosystem.module.css';

export function ProductMap() {
  return <div className={styles.products}>
    <article><span className={styles.kicker}>01 / The workspace</span><h3>SpecWeave Studio</h3><p>Projects with a coordinator and workers, each on the provider and model you pick, running on your own machines with approvals you can see.</p><Link to="/studio">See Studio ↗</Link></article>
    <article><span className={styles.kicker}>02 / The record</span><h3>SpecWeave CLI</h3><p>The spec, task claims, test evidence and handoff live in your repository, so any agent or account can continue. Open source.</p><Link to="/docs/getting-started">Start the open-source workflow ↗</Link></article>
    <article><span className={styles.kicker}>03 / The expertise</span><h3>vskill + Skill Studio</h3><p>Inspect and install skills into every agent. Evaluate their behavior against a baseline before your team relies on them.</p><a href="https://verified-skill.com">Explore skills and evaluations ↗</a></article>
  </div>;
}

export default function Architecture() {
  return <figure className={styles.architecture} aria-label="Studio architecture: browser, optional private network, paired machines running native agents, model providers and repository">
    <div className={styles.diagramHeader}><span className={styles.kicker}>Architecture / your machines</span><span className={styles.diagramBadge}>Each boundary is explicit</span></div>
    <div className={styles.client}><span className={styles.nodeIcon} aria-hidden="true">◫</span><div><strong>Studio in your browser or desktop app</strong><span>Talk to the coordinator. Approve the next action.</span></div></div>
    <div className={styles.connector}><span>Same network, SSH tunnel or Tailscale</span></div>
    <div className={styles.transport}><span className={styles.kicker}>Network access</span><strong>Your choice of route</strong><p>Pair over your local network, let the desktop app open an SSH tunnel, or use Tailscale Serve when you are away from home.</p></div>
    <div className={styles.connector}><span>Separate Studio pairing on every host</span></div>
    <div className={styles.hosts}>
      {['Your laptop', 'Your workstation', 'Your remote Mac'].map((host, index) => <div className={styles.host} key={host}><span className={styles.hostNumber}>0{index + 1}</span><strong>{host}</strong><span>Studio runtime</span><div>Coordinator or workers · any provider</div><small>Local repo, skills + session state</small></div>)}
    </div>
    <div className={styles.provider}><span aria-hidden="true">↗</span><p><strong>Model provider boundary</strong><br />Native agents contact their configured providers. Private remote access does not make cloud inference local.</p></div>
    <figcaption>Architecture illustration. Host names are examples. Network access and permission to act are separate controls.</figcaption>
  </figure>;
}
