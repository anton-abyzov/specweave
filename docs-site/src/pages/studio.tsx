import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Architecture from '../components/ecosystem/Architecture';
import styles from './continuity.module.css';
import ecosystem from '../components/ecosystem/ecosystem.module.css';
import studio from '../components/ecosystem/studio.module.css';
import StudioOverviewVideo from '../components/ecosystem/StudioOverviewVideo';
import StudioProjectMock from '../components/ecosystem/StudioProjectMock';
import { CloudCompare, ProjectFeatures, StudioFaq, StudioStack } from '../components/ecosystem/StudioSections';

const pilot = 'mailto:anton.abyzov@gmail.com?subject=SpecWeave%20Studio%20pilot&body=Team%20size%3A%0ACoding%20tools%3A%0AMachines%20and%20operating%20systems%3A%0AWorkflow%20to%20evaluate%3A%0A';

export default function Studio() {
  return <Layout title="SpecWeave Studio: projects for every coding agent on your machines" description="SpecWeave Studio runs a project's coordinator and workers on Claude Code, Codex, Grok and other agents, each with its own model, on machines you own, with memory, plans, approvals and handoff in git.">
    <main className={styles.page}>
      <header className={ecosystem.studioHero}>
        <div><span className={ecosystem.status}>SpecWeave Studio / private pilot</span><h1>Your agents.<br />Your machines.<br /><em>One project.</em></h1>
          <p className={styles.lead}>Give a project a goal. A coordinator splits the work across workers on Claude Code, Codex, Grok Build or Cursor, each with the model you pick, on the machines where your code and skills already live.</p>
          <div className={styles.actions}><a className={styles.primary} href={pilot}>Discuss a pilot ↗</a><Link className={styles.textLink} to="/docs/overview/studio/">Read the Studio overview</Link></div>
          <p className={ecosystem.note}>Private pilot, tested on three Macs. There is no public download yet; projects are being tested for the next pilot build.</p>
        </div><StudioProjectMock />
      </header>

      <section className={styles.section} aria-labelledby="projects-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>01 / Projects</span><h2 id="projects-title">A coordinator.<br /><em>Workers on any model.</em></h2></div><p>A project is one long conversation. Add tasks as they come up; the coordinator hands them out, collects results and keeps the plan honest. <span className={studio.badge}>Testing for the next pilot build</span></p></div>
        <ProjectFeatures />
      </section>

      <section className={styles.section} aria-labelledby="local-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>02 / Local first</span><h2 id="local-title">Built for your machines.<br /><em>Not a vendor’s cloud.</em></h2></div><p>Cloud project agents are easy to start. Studio is for people who want their own skills, folders, accounts and several vendors in the same project.</p></div>
        <CloudCompare />
      </section>

      <section className={styles.section} aria-labelledby="inside-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>03 / Sessions</span><h2 id="inside-title">Steer every worker.<br /><em>See every approval.</em></h2></div><p>Each worker is a native session with its own model, effort and supervision. Switch its provider mid-thread, queue a follow-up, steer a running turn or restore a checkpoint.</p></div>
        <StudioOverviewVideo />
        <div className={ecosystem.captures}><figure><img src="/img/studio/native-controls-20261008.png" width="739" height="151" alt="Actual Studio composer showing GPT-6.1-Sol, Low effort and Supervised controls" loading="lazy" /><figcaption>Native composer / model, effort and supervision remain separate choices.</figcaption></figure><figure><img src="/img/studio/provider-status-20261008.png" width="280" height="195" alt="Actual provider status: Codex authenticated; Claude needs attention" loading="lazy" /><figcaption>Provider status / this capture shows a Claude warning, not successful Claude execution.</figcaption></figure></div><p className={ecosystem.note}>Actual private-pilot UI, 8 October 2026. Cropped to exclude private account and workspace details.</p>
      </section>

      <section className={styles.section} aria-labelledby="machines-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>04 / Machines</span><h2 id="machines-title">One screen.<br /><em>Every machine you pair.</em></h2></div><p>Studio runs on each machine. Reach the others over your local network, an SSH tunnel the desktop app opens, or private HTTPS over Tailscale, and pair each one separately. New work can go to the machine with free capacity.</p></div>
        <div className={studio.machines}><Architecture /><div className={ecosystem.steps}><article><span className={styles.layerNumber}>01 / Connect</span><h3>Reach it privately.</h3><p>One machine needs nothing extra. Others pair over your local network or an SSH tunnel; Tailscale Serve adds private HTTPS from anywhere, never a public URL. Tailscale is optional.</p></article><article><span className={styles.layerNumber}>02 / Pair</span><h3>Permission is separate.</h3><p>Being reachable is not permission. Every machine and browser gets its own Studio pairing, and native sign-ins never leave their machine.</p></article><article><span className={styles.layerNumber}>03 / Balance</span><h3>Use the capacity you have.</h3><p>Studio reads each account’s limits. A capacity policy picks a fresh eligible subscription for new work; a running conversation keeps its machine and account.</p></article></div></div>
      </section>

      <section className={styles.section} aria-labelledby="stack-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>05 / The stack</span><h2 id="stack-title">Studio on top.<br /><em>Git underneath.</em></h2></div><p>Studio is where you work. The open-source SpecWeave CLI keeps the record any tool can continue from, so a usage limit or a new vendor is a handoff, not a restart.</p></div>
        <StudioStack />
        <Link className={styles.textLink} to="/docs/guides/cross-tool-handoff/">How handoff and pickup work ↗</Link>
      </section>

      <section className={styles.section} aria-labelledby="faq-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>06 / Questions</span><h2 id="faq-title">Tailscale, proxies<br /><em>and your skills.</em></h2></div><p>What you need, what is optional and what stays on your machine.</p></div>
        <StudioFaq />
      </section>

      <section className={styles.section}><div className={ecosystem.proof}><div><span className={styles.eyebrow}>Evidence / 8 October 2026</span><h3>Tested privately.<br />Described precisely.</h3><p>The accepted fleet delivery recorded native Codex execution on three Macs, with source and artifact readback. The smoke test completed one marker-reading turn per host, sequentially. Claude execution and the project coordinator still need their own live acceptance.</p><Link className={styles.textLink} to="/docs/overview/studio-architecture/#what-is-verified">Read the verification scope ↗</Link></div><div><h3>Evaluate the fit.</h3><ul><li>Start with one repository and one real workflow.</li><li>Check account ownership, approvals and reconnect behavior.</li><li>Measure accepted work and time spent recovering context.</li><li>Agree security, support and rollout needs before expanding.</li></ul><p>These checks do not establish enterprise concurrency, production ROI, certification or a service-level agreement.</p></div></div></section>
      <section className={styles.finalCta}><span className={styles.eyebrow}>For developers and teams running more than one agent</span><h2>Bring your agents.<br /><em>Keep your machines.</em></h2><a className={styles.primary} href={pilot}>Discuss a pilot ↗</a><Link className={styles.textLink} to="/docs/getting-started">Start with the open-source CLI</Link></section>
    </main>
  </Layout>;
}
