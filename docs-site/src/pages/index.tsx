import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ContinuityBoard from '../components/sections/ContinuityBoard';
import styles from './continuity.module.css';

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copyCommand() {
    try { await navigator.clipboard.writeText('npm install -g specweave'); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <Layout title="Change agents. Keep the thread." description="Open-source work continuity for AI-assisted engineering. Track intent, link specifications, verify progress, and continue across coding agents.">
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}><div className={styles.eyebrow}><span className={styles.orangeDot} /> Open source · Local first · Yours to keep</div>
          <h1>Change agents.<br /><em>Keep the thread.</em></h1>
          <p className={styles.lead}>Your tools will change. The work should stay clear. Keep intent, specifications, and verified progress together—across every coding session.</p>
          <div className={styles.actions}><Link className={styles.primary} to="/docs/getting-started">Start with your project <span aria-hidden="true">↗</span></Link><a className={styles.textLink} href="#work">Explore the workflow ↓</a></div>
          <div className={styles.install}><code>npm install -g specweave</code><button onClick={copyCommand} aria-label="Copy installation command">{copied ? 'Copied' : 'Copy'}</button></div>
          <span className={styles.copyStatus} role="status">{copyError ? 'Copy unavailable. Select the command above.' : copied ? 'Installation command copied.' : 'MIT licensed. No account required for the local workflow.'}</span>
        </div>
        <div className={styles.heroArt}><img src="/img/product/continuity.webp" alt="One orange thread continues through three separate frames" width="2048" height="1152" fetchPriority="high" /><div className={styles.artCaption}><span>01 / CONTINUITY</span><span>Different tools. One durable record.</span></div></div>
      </section>
      <div className={styles.toolStrip}><span>Bring your own workflow</span><strong>Codex</strong><strong>Claude Code</strong><strong>Cursor</strong><strong>OpenCode</strong><strong>Your local tools</strong><Link to="/product">CLI + files, across harnesses ↗</Link></div>
      <section className={styles.section} id="work"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>01 / See the work</span><h2>What matters,<br /><em>at a glance.</em></h2></div><p>Start with the outcome. See what is moving, what is waiting, and what is actually verified. Open an intent to find its specification and the work behind it.</p></div><ContinuityBoard /><p className={styles.caption}>Example data above. Your dashboard reads your project. Open it with <code>specweave dashboard</code>.</p></section>
      <section className={`${styles.section} ${styles.layerSection}`}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>02 / Go one layer deeper</span><h2>Enough structure.<br /><em>Only when needed.</em></h2></div><p>A small fix can stay small. Work that spans agents needs a shared definition of done.</p></div>
        <div className={styles.layers}>
          <article><span className={styles.layerNumber}>01</span><h3>Intent</h3><p>The outcome you asked for, in plain language. A useful title, a short explanation, and a place on the board.</p><span>What are we trying to change?</span></article>
          <article><span className={styles.layerNumber}>02</span><h3>Specification</h3><p>Attach an increment when scope needs to be explicit. Acceptance criteria and tasks give every agent the same target.</p><span>What will count as done?</span></article>
          <article><span className={styles.layerNumber}>03</span><h3>Evidence</h3><p>Task claims, completion records, checks, and handoffs. Open the record when a green status needs an explanation.</p><span>What proves the work is ready?</span></article>
        </div>
      </section>
      <section className={`${styles.section} ${styles.handoffSection}`} id="portability"><div><span className={styles.eyebrow}>03 / Continue with confidence</span><h2>A session ends.<br /><em>The context stays.</em></h2><p className={styles.leadSmall}>Switch because you hit a limit, need a different tool, or want a second opinion. A portable handoff records the next action, decisions, and unfinished work.</p><Link className={styles.textLink} to="/docs/guides/cross-tool-handoff">Read the handoff guide ↗</Link></div><div className={styles.handoffPanel}><div className={styles.handoffStep}><span>01</span><div><b>Start in Claude Code</b><p>Agree on the outcome. Claim the next task.</p></div></div><div className={styles.handoffStep}><span>02</span><div><b>Keep the evidence</b><p>Record completed work and write a handoff.</p><code>specweave handoff</code></div></div><div className={styles.handoffStep}><span>03</span><div><b>Continue in Codex</b><p>Read the same spec. Pick up the next task.</p></div></div><small>Harness, model, effort, and provider are different dimensions. Keep them distinct when comparing runs.</small></div></section>
      <section className={`${styles.section} ${styles.connectionSection}`}><div><span className={styles.eyebrow}>04 / Fit your team</span><h2>Your tracker.<br /><em>Your choice.</em></h2><p>Keep GitHub, Jira, or Azure DevOps where your team already plans. Connect delivery progress when it helps. The local workflow stands on its own.</p><Link className={styles.textLink} to="/integrations">Explore optional integrations ↗</Link></div><div className={styles.connectionList}>{[['GitHub', 'Issues and engineering progress'], ['Jira', 'Team planning and delivery links'], ['Azure DevOps', 'Existing enterprise work items']].map(([name, desc]) => <Link to="/integrations" key={name}><strong>{name}</strong><span>{desc}</span><b aria-hidden="true">↗</b></Link>)}</div></section>
      <section className={styles.skillsBanner}><div><span className={styles.eyebrow}>The companion project</span><h3>Better skills. Less baggage.</h3><p>Find focused expertise, inspect its source, and evaluate whether it helps your workflow.</p></div><a className={styles.secondary} href="https://verified-skill.com">Explore Verified Skills ↗</a></section>
      <section className={styles.finalCta}><span className={styles.eyebrow}>Your next session can start here</span><h2>Keep building.<br /><em>Keep the context.</em></h2><Link className={styles.primary} to="/docs/getting-started">Get started ↗</Link><a className={styles.textLink} href="https://github.com/anton-abyzov/specweave">Read the source</a></section>
    </main>
  </Layout>;
}
