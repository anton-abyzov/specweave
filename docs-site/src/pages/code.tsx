import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {ChevronDown, Cloud, Download, Info, KeyRound, Laptop, ShieldCheck} from 'lucide-react';
import CoordinatorFlow from '../components/ecosystem/CoordinatorFlow';
import SubscriptionValue from '../components/ecosystem/SubscriptionValue';
import WhySpecWithCode from '../components/ecosystem/WhySpecWithCode';
import StudioTutorialVideo from '../components/ecosystem/StudioTutorialVideo';
import {SPECWITHCODE_RELEASE as release} from '../data/specwithcodeRelease';
import styles from './code.module.css';

const icon = {size: 20, strokeWidth: 1.5, 'aria-hidden': true} as const;
const btnIcon = {size: 16, strokeWidth: 1.5, 'aria-hidden': true} as const;

const CONTROLS = [
  {Icon: Laptop, title: 'Choose the machine', body: 'Run on this Mac or on a machine you paired privately.'},
  {Icon: KeyRound, title: 'Bring your providers', body: 'Keep your eligible plans and each agent’s own sign-in.'},
  {Icon: ShieldCheck, title: 'Set the boundaries', body: 'Decide which folders, tools and approvals each agent gets.'},
];

const FAQ: {q: string; a: React.ReactNode}[] = [
  {q: 'Does everything stay on my machine?', a: <>No. Agent processes and project files live on the selected machine, but cloud models receive prompts and relevant context, which can include code and file contents. Connected tools use their own services. Private machine connections do not make model inference local.</>},
  {q: 'Can a subscription replace all API spending?', a: <>No. Use eligible plans through their supported coding agents. Limits, seat rules and provider terms still apply; API keys or extra usage may create separate charges. Enterprise billing may differ. Measure your own workload before claiming savings.</>},
  {q: 'What do I need to connect another machine?', a: <>SpecWithCode running on a supported machine, a reachable private route and separate pairing permission. Tailscale is optional. Start with a small, approved setup before expanding; this page does not promise company-wide scale or universal hardware support.</>},
  {q: 'What is free?', a: <>SpecWithCode is free and open source. You bring your provider accounts and pay any provider charges directly. The <Link className="wv-link" to="/docs/getting-started/">SpecWeave CLI</Link> keeps specs, task evidence and handoffs in git so another tool can continue the work.</>},
];

export default function Code() {
  return <Layout title="SpecWithCode: AI agents on your machines, under your control" description="Coordinate Claude Code, Codex and other agents on your own machines. Use eligible subscriptions, control access and approvals, and choose your cloud model providers.">
    <main className={clsx('wv-root', styles.page)}>
      <header className={clsx(styles.shell, styles.hero)}>
        <div className={styles.heroCopy}>
          <p className={styles.product}>
            <img src="/img/studio/specwithcode-icon.png" alt="" width="28" height="28" />
            <span className={styles.productName}>SpecWithCode</span>
            <span className={styles.productNote}>Free and open source</span>
          </p>
          <h1>Coding agents on your machines, under your control.</h1>
          <p className={styles.lead}>One workspace for Claude Code, Codex and the agents you choose. Coordinate the work. Keep your folders, permissions and approvals in your hands.</p>
          <div className={styles.actions}>
            <a className="wv-btn wv-btn--primary wv-btn--lg" href={release.dmgUrl}><Download {...btnIcon} />Download for Mac</a>
            <a className="wv-btn wv-btn--secondary wv-btn--lg" href="#workflow">See how it works</a>
          </div>
          <p className={styles.requirements}>Version {release.version}, {release.size}. Apple silicon, macOS 13 or later, early access. Signed with Developer ID and notarized by Apple.</p>
          <div className={clsx('wv-note', styles.qualification)}>
            <Info {...icon} />
            <p><strong>Cloud models still receive prompts and relevant context through your chosen provider.</strong> Local execution does not mean offline AI.</p>
          </div>
        </div>

        <div className={styles.heroShot}>
          <figure className="wv-window">
            <div className="wv-window__bar"><span>tip-calculator</span><span>SpecWithCode 1.0.21</span></div>
            <a href="/img/studio/code-hero-20261015.webp" aria-label="Open the full-size coordinator screenshot">
              <img src="/img/studio/code-hero-20261015.webp" width="1889" height="1521" alt="Actual SpecWithCode 1.0.21 coordinator reporting that the README now shows the real python3 tip.py 50 18 output, next to the Codex worker thread with its report and 2 changed files" fetchPriority="high" />
            </a>
            <figcaption>Actual app capture, SpecWithCode 1.0.21, 15 October 2026. Each agent keeps its own sign-in with its provider. <a className="wv-link" href="/video/code-run-20261015.mp4">Watch this run (23 s)</a></figcaption>
          </figure>
        </div>
      </header>

      <ul className={clsx(styles.shell, styles.controls)} aria-label="What you control">
        {CONTROLS.map(({Icon, title, body}) => <li key={title}>
          <Icon {...icon} />
          <div><strong>{title}</strong><span>{body}</span></div>
        </li>)}
      </ul>

      <div className={styles.shell}><WhySpecWithCode /></div>

      <div className={styles.shell}><CoordinatorFlow /></div>

      <div className={styles.shell}><SubscriptionValue /></div>

      <section className={clsx(styles.shell, styles.section, styles.network)} aria-labelledby="network-title">
        <div className={styles.sectionHead}>
          <h2 id="network-title">Start on one computer, then connect the ones you trust</h2>
          <p>Pair approved machines over your network, SSH or private HTTPS with Tailscale. Choose where work runs; each machine keeps its own pairing and native account access.</p>
        </div>
        <ol className={clsx('wv-thread', 'wv-thread--across', styles.route)} aria-label="Private connection between your laptop and approved machines">
          <li><p className="wv-thread__title">Your laptop</p><p className="wv-thread__body">Choose the work and supervise it.</p></li>
          <li><p className="wv-thread__title">Private pairing</p><p className="wv-thread__body">Your network, SSH or Tailscale. Each machine is paired separately.</p></li>
          <li><p className="wv-thread__title">Approved machines</p><p className="wv-thread__body">Run the agents and keep the files.</p></li>
        </ol>
        <div className={clsx('wv-note', styles.boundary)}>
          <Cloud {...icon} />
          <p><strong>Your model providers sit outside this route.</strong> Prompts and relevant context cross this boundary. Provider and integration data policies apply.</p>
        </div>
        <p className={styles.fine}>Work continues while the executing machine is awake. Connecting computers does not add subscription entitlement or grant access to an entire company network.</p>
      </section>

      <section className={clsx(styles.shell, styles.section)} id="watch" aria-labelledby="watch-title">
        <div className={styles.sectionHead}>
          <h2 id="watch-title">Watch the recording: one goal, two workers</h2>
          <p>Follow a coordinator, a Codex thread and a Claude Code thread through a small coding task. The later usage-limit example is simulated.</p>
        </div>
        <StudioTutorialVideo />
      </section>

      <section className={clsx(styles.shell, styles.section, styles.faq)} aria-labelledby="questions-title">
        <h2 id="questions-title">Questions about boundaries</h2>
        <div className={styles.faqList}>
          {FAQ.map(item => <details key={item.q}>
            <summary><span>{item.q}</span><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className={clsx(styles.shell, styles.final)} aria-labelledby="final-title">
        <h2 id="final-title">Build with the agents you choose</h2>
        <p>Keep the work on machines you control.</p>
        <div className={styles.actions}>
          <a className="wv-btn wv-btn--primary wv-btn--lg" href={release.dmgUrl}><Download {...btnIcon} />Download SpecWithCode</a>
          <a className={clsx('wv-link', styles.finalLink)} href={release.repoUrl}>View source on GitHub</a>
        </div>
      </section>
    </main>
  </Layout>;
}
