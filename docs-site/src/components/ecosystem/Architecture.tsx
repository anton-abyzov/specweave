import React from 'react';
import Link from '@docusaurus/Link';
import styles from './ecosystem.module.css';
import pm from './ProductMap.module.css';
import {Cloud, Monitor, Network} from 'lucide-react';

const icon = {size: 20, strokeWidth: 1.5, 'aria-hidden': true} as const;

export function ProductMap() {
  return <ul className={pm.products}>
    <li><h3>SpecWithCode</h3><p className={pm.role}>The workspace</p><p>Projects with a coordinator and workers, each on the provider and model you pick, running on your own machines with approvals you can see.</p><Link to="/code/">See SpecWithCode</Link></li>
    <li><h3>SpecWeave CLI</h3><p className={pm.role}>The record</p><p>The spec, task claims, test evidence and handoff live in your repository, so any agent or account can continue. Open source.</p><Link to="/docs/getting-started">Start the open-source workflow</Link></li>
    <li><h3>Verified Skill</h3><p className={pm.role}>The skill registry</p><p>Agent skills, each with its source, security scan and evaluation shown. The vskill CLI installs them into every agent.</p><a href="https://verified-skill.com">Explore skills and evaluations</a></li>
  </ul>;
}

export default function Architecture() {
  return <figure className={styles.architecture} aria-label="SpecWithCode architecture: browser, optional private network, paired machines running native agents, model providers and repository">
    <div className={styles.diagramHeader}><strong>Your machines</strong><span className="wv-chip">Each boundary is explicit</span></div>
    <div className={styles.node}><Monitor {...icon} /><div><strong>SpecWithCode in your browser or desktop app</strong><span>Talk to the coordinator. Approve the next action.</span></div></div>
    <div className={styles.connector}><span>SpecWithCode Connect, same network or SSH tunnel</span></div>
    <div className={styles.node}><Network {...icon} /><div><strong>Your choice of route</strong><p>Sign in to SpecWithCode Connect to reach your machines from anywhere. You can also pair over your local network or let the desktop app open an SSH tunnel.</p></div></div>
    <div className={styles.connector}><span>Separate SpecWithCode pairing on every host</span></div>
    <div className={styles.hosts}>
      {['Your laptop', 'Your workstation', 'Your remote Mac'].map(host => <div className={styles.host} key={host}><strong>{host}</strong><span>SpecWithCode runtime</span><div>Coordinator or workers on any provider</div><small>Local repo, skills and session state</small></div>)}
    </div>
    <div className={styles.provider}><Cloud {...icon} /><p><strong>Model provider boundary.</strong> Native agents contact their configured providers. Private remote access does not make cloud inference local.</p></div>
    <figcaption>Architecture illustration. Host names are examples. Network access and permission to act are separate controls.</figcaption>
  </figure>;
}
