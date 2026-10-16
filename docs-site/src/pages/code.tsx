import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import CoordinatorFlow from '../components/ecosystem/CoordinatorFlow';
import SubscriptionValue from '../components/ecosystem/SubscriptionValue';
import WhySpecWithCode from '../components/ecosystem/WhySpecWithCode';
import StudioTutorialVideo from '../components/ecosystem/StudioTutorialVideo';
import {SPECWITHCODE_RELEASE as release} from '../data/specwithcodeRelease';
import styles from './code.module.css';

export default function Code() {
  return <Layout title="SpecWithCode: AI agents on your machines, under your control" description="Coordinate Claude Code, Codex and other agents on your own machines. Use eligible subscriptions, control access and approvals, and choose your cloud model providers.">
    <main className={styles.page}>
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.product}><img src="/img/studio/specwithcode-icon.png" alt="" width="32" height="32" /><span>SpecWithCode</span><span className={styles.free}>Free &amp; open source</span></div>
            <h1><span>Your agents.</span> <span>Your machines.</span> <span>Your control.</span></h1>
            <p className={styles.lead}>One workspace for Claude Code, Codex and the agents you choose. Coordinate the work. Keep your folders, permissions and approvals in your hands.</p>
            <div className={styles.actions}><a className={styles.primary} href={release.dmgUrl}>Download for Mac <span aria-hidden="true">↓</span></a><a className={styles.secondary} href="#workflow">See the workflow <span aria-hidden="true">↘</span></a></div>
            <p className={styles.qualification}><strong>Cloud models still receive prompts and relevant context through your chosen provider.</strong> Local execution does not mean offline AI.</p>
            <p className={styles.requirements}>Apple silicon · macOS 13+ · Early access<br />Signed with Developer ID and notarized by Apple.</p>
          </div>
          <figure className={styles.productStage}>
            <div className={styles.stageBack} aria-hidden="true" />
            <div className={styles.captureFrame}>
              <div className={styles.windowBar}><span><i /><i /><i /></span><span>Project / tip-calculator</span><span>SpecWithCode 1.0.21</span></div>
              <a href="/img/studio/code-hero-20261015.webp" aria-label="Open full-size coordinator screenshot"><img className={styles.capture} src="/img/studio/code-hero-20261015.webp" width="1889" height="1521" alt="Actual SpecWithCode 1.0.21 coordinator reporting that the README now shows the real python3 tip.py 50 18 output, next to the Codex worker thread with its report and 2 changed files" fetchPriority="high" /></a>
              <div className={styles.captureFooter}><span><b />Coordinator</span><span>Code + guide → one conversation</span></div>
            </div>
            <figure className={styles.floatProvider} aria-hidden="true"><img src="/img/studio/provider-status-20261008.png" width="273" height="195" alt="" /></figure>
            <div className={styles.stageAccent}><span aria-hidden="true">↳</span><div><strong>Every thread stays within reach.</strong><span>Inspect the work behind each result.</span></div></div>
            <figcaption>Actual app capture, SpecWithCode 1.0.21, 15 October 2026. <a href="/video/code-run-20261015.mp4">Watch this run (23 s).</a></figcaption>
          </figure>
        </header>

        <div className={styles.controlStrip} aria-label="What you control">
          <div><span aria-hidden="true">⌘</span><p><strong>Choose where it runs.</strong><span>This machine, a paired one, or an Anthropic cloud session.</span></p></div>
          <div><span aria-hidden="true">⇄</span><p><strong>Bring your providers.</strong><span>Keep eligible plans and sign-ins.</span></p></div>
          <div><span aria-hidden="true">✓</span><p><strong>Set the boundaries.</strong><span>Folders, tools and approvals.</span></p></div>
        </div>

        <WhySpecWithCode />

        <CoordinatorFlow />

        <SubscriptionValue />

        <section className={styles.network} aria-labelledby="network-title">
          <div><p className={styles.eyebrow}>A workspace that reaches your machines</p><h2 id="network-title">Start on one computer.<br />Connect the ones you trust.</h2><p>Pair approved machines over your network, SSH or private HTTPS with Tailscale. Choose where work runs; each machine keeps its own pairing and native account access. When no machine should stay awake, hand a task to an Anthropic cloud session on your claude.ai plan and bring the result back with <code>claude --teleport</code>.</p><p className={styles.finePrint}>Work continues while the executing machine is awake. Connecting computers does not add subscription entitlement or grant access to an entire company network.</p></div>
          <div className={styles.networkMap} aria-label="Private connection between your laptop and approved workstations, with a separate cloud model provider boundary">
            <div className={styles.host}><span aria-hidden="true">▱</span><strong>Your laptop</strong><small>Choose &amp; supervise</small></div>
            <div className={styles.privateRoute}>Private pairing <span aria-hidden="true">↔</span></div>
            <div className={styles.host}><span aria-hidden="true">▤</span><strong>Approved machines</strong><small>Execute &amp; retain files</small></div>
            <div className={styles.providerBoundary}><span aria-hidden="true">↗</span><div><strong>Your model providers</strong><p>Prompts and relevant context cross this boundary. Provider and integration data policies apply.</p></div></div>
          </div>
        </section>

        <section className={styles.watch} id="watch" aria-labelledby="watch-title"><div className={styles.watchHeading}><div><p className={styles.eyebrow}>See the product doing the work</p><h2 id="watch-title">One goal. Two workers.<br />The actual recording.</h2></div><p>Follow a coordinator, a Codex thread and a Claude Code thread through a small coding task. The later usage-limit example is simulated.</p></div><StudioTutorialVideo /></section>

        <section className={styles.faq} aria-labelledby="questions-title"><h2 id="questions-title">Clear boundaries.<br />Fewer surprises.</h2><div>
          <details><summary>Does everything stay on my machine?</summary><p>No. Agent processes and project files live on the selected machine, but cloud models receive prompts and relevant context, which can include code and file contents. Connected tools use their own services. Private machine connections do not make model inference local.</p></details>
          <details><summary>Can a subscription replace all API spending?</summary><p>No. Use eligible plans through their supported coding agents. Limits, seat rules and provider terms still apply; API keys or extra usage may create separate charges. Enterprise billing may differ. Measure your own workload before claiming savings.</p></details>
          <details><summary>Can work run in the cloud instead of on my machines?</summary><p>Yes, as an option. A coordinator can start an Anthropic cloud session: Claude Code on Anthropic's VM, billed to your claude.ai Pro, Max or Team plan, with no SpecWithCode charge. It needs a pushed GitHub branch or an upload of the committed files, and the transcript lives at claude.ai. Your machines stay the default.</p></details>
          <details><summary>What do I need to connect another machine?</summary><p>SpecWithCode running on a supported machine, a reachable private route and separate pairing permission. Tailscale is optional. Start with a small, approved setup before expanding; this page does not promise company-wide scale or universal hardware support.</p></details>
          <details><summary>What is free?</summary><p>SpecWithCode is free and open source. You bring your provider accounts and pay any provider charges directly. The <Link to="/docs/getting-started/">SpecWeave CLI</Link> keeps specs, task evidence and handoffs in git so another tool can continue the work.</p></details>
        </div></section>

        <section className={styles.final}><div><h2>Build with the agents you choose.</h2><p>Keep the work on machines you control.</p></div><div><a className={styles.primary} href={release.dmgUrl}>Download SpecWithCode <span aria-hidden="true">↓</span></a><a href={release.repoUrl} className={styles.repoLink}>View source on GitHub</a></div></section>
      </div>
    </main>
  </Layout>;
}
