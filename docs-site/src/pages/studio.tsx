import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Architecture, { ProductMap } from '../components/ecosystem/Architecture';
import styles from './continuity.module.css';
import ecosystem from '../components/ecosystem/ecosystem.module.css';
import WorkflowVideo from '../components/ecosystem/WorkflowVideo';
import StudioOverviewVideo from '../components/ecosystem/StudioOverviewVideo';

const pilot = 'mailto:anton.abyzov@gmail.com?subject=SpecWeave%20Studio%20pilot&body=Team%20size%3A%0ACoding%20tools%3A%0AMachines%20and%20operating%20systems%3A%0AWorkflow%20to%20evaluate%3A%0A';

export default function Studio() {
  return <Layout title="SpecWeave Studio — your agents, your machines" description="Explore the private SpecWeave Studio pilot: native coding sessions across your machines, private Tailscale access, explicit account selection and human approvals.">
    <main className={styles.page}>
      <header className={ecosystem.studioHero}>
        <div><span className={ecosystem.status}>SpecWeave Studio / private pilot</span><h1>Your agents.<br />Your machines.<br /><em>One clear view.</em></h1>
          <p className={styles.lead}>Keep native coding sessions within reach across your Macs. See the machine, account, work and approvals behind each session.</p>
          <div className={styles.actions}><a className={styles.primary} href={pilot}>Discuss a team pilot ↗</a><Link className={styles.textLink} to="/docs/overview/studio-architecture">Read the architecture</Link></div>
          <p className={ecosystem.note}>Privately validated on three Macs. Public distribution and enterprise service commitments are not announced.</p>
        </div><Architecture />
      </header>
      <section className={styles.section} aria-labelledby="inside-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Inside the private pilot</span><h2 id="inside-title">The actual controls.<br /><em>The actual state.</em></h2></div><p>Choose the model, effort and supervision. Inspect provider health before asking it to work.</p></div>
        <StudioOverviewVideo />
        <div className={ecosystem.captures}><figure><img src="/img/studio/native-controls-20261008.png" width="739" height="151" alt="Actual Studio composer showing GPT-6.1-Sol, Low effort and Supervised controls" loading="lazy" /><figcaption>Native composer / model, effort and supervision remain separate choices.</figcaption></figure><figure><img src="/img/studio/provider-status-20261008.png" width="280" height="195" alt="Actual provider status: Codex authenticated; Claude needs attention" loading="lazy" /><figcaption>Provider status / this capture shows a Claude warning, not successful Claude execution.</figcaption></figure></div><p className={ecosystem.note}>Actual private-pilot UI, 8 October 2026. Cropped to exclude private account and workspace details. Versions and availability reflect that capture.</p>
      </section>
      <section className={styles.section} aria-labelledby="ecosystem-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Three products / distinct jobs</span><h2 id="ecosystem-title">The work. The expertise.<br /><em>The workspace.</em></h2></div><p>Use the open-source workflow today. Add skills when they help. Evaluate the new native workspace through a pilot.</p></div><ProductMap /></section>
      <section className={styles.section} aria-labelledby="tutorial-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Start with SpecWeave</span><h2 id="tutorial-title">One task.<br /><em>Evidence you can follow.</em></h2></div><p>Watch a real CLI workflow from spec to tests to a local handoff. This is the repository workflow available today.</p></div><WorkflowVideo /></section>
      <section className={styles.section} aria-labelledby="boundaries-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Designed around real boundaries</span><h2 id="boundaries-title">Reach a machine.<br /><em>Keep control of the work.</em></h2></div><p>A network connection, an account and permission to run are different things. Studio keeps them visible.</p></div>
        <div className={ecosystem.steps}><article><span className={styles.layerNumber}>01 / Connect</span><h3>Your private network.</h3><p>Tailscale Serve reaches a host’s loopback service over private HTTPS. Each host also requires its own scoped Studio pairing.</p></article><article><span className={styles.layerNumber}>02 / Work</span><h3>Native sessions.</h3><p>The runtime uses the selected machine and account. Review the output and handle the agent’s approval requests before it continues.</p></article><article><span className={styles.layerNumber}>03 / Continue</span><h3>Evidence stays useful.</h3><p>Keep project specs and task evidence in git with SpecWeave. Explicit handoff moves work when you choose; local checkpoints help recover it.</p></article></div>
      </section>
      <section className={styles.section}><div className={ecosystem.proof}><div><span className={styles.eyebrow}>Evidence / 8 October 2026</span><h3>Tested privately.<br />Described precisely.</h3><p>The accepted fleet delivery recorded native Codex execution on three Macs, with source and artifact readback. The smoke test completed one marker-reading turn per host, sequentially.</p><Link className={styles.textLink} to="/docs/overview/studio-architecture#what-is-verified">Read the verification scope ↗</Link></div><div><h3>Evaluate the fit.</h3><ul><li>Start with one repository and one real workflow.</li><li>Check account ownership, approvals and reconnect behavior.</li><li>Measure accepted work and time spent recovering context.</li><li>Agree security, support and rollout needs before expanding.</li></ul><p>These checks do not establish enterprise concurrency, production ROI, certification or a service-level agreement.</p></div></div></section>
      <section className={styles.finalCta}><span className={styles.eyebrow}>For engineering leads and platform teams</span><h2>Start with a workflow.<br /><em>Prove it with your team.</em></h2><a className={styles.primary} href={pilot}>Discuss a team pilot ↗</a><Link className={styles.textLink} to="/docs/overview/studio-architecture">Architecture and first steps</Link></section>
    </main>
  </Layout>;
}
