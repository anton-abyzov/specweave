import React, {useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import {Check, ChevronDown, Cloud, Copy, Download, Info, Users} from 'lucide-react';
import FleetSequence from '../components/ecosystem/FleetSequence';
import CoordinatorFlow from '../components/ecosystem/CoordinatorFlow';
import SubscriptionValue from '../components/ecosystem/SubscriptionValue';
import WhySpecWithCode from '../components/ecosystem/WhySpecWithCode';
import StudioTutorialVideo from '../components/ecosystem/StudioTutorialVideo';
import {SPECWITHCODE_RELEASE as release} from '../data/specwithcodeRelease';
import {providerSummary} from '../data/tools';
import {buildVideoObject, getTutorial} from '../data/tutorials';
import styles from './code.module.css';

/*
  Every product claim on this page was checked against specwithcode 1.0.43 and 1.0.44
  (anton-abyzov/specwithcode releases v1.0.43 and v1.0.44, both 18 October 2026) and the app's
  own user docs at v1.0.44: docs/user/usage.md, install.md, add-a-machine.md, linux-worker.md,
  computer-use.md, source-control.md. Each feature has one section; others link to it.
*/

const icon = {size: 20, strokeWidth: 1.5, 'aria-hidden': true} as const;
const btnIcon = {size: 16, strokeWidth: 1.5, 'aria-hidden': true} as const;

const THREADS: {name: string; detail: React.ReactNode}[] = [
  {name: 'Questions and decisions', detail: <>Agents ask with cards that offer lettered options. An answered decision folds into one line.</>},
  {name: 'Stop all, continue all', detail: <>Pause every thread at once, or type <code>/stop</code>, <code>/continue</code> or <code>/status</code>. Messages held after a stop or a restart wait with Resume and Discard.</>},
  {name: 'Reports you can reopen', detail: <>Long worker reports become cards, saved beside the increment under <code>.specweave/increments/&lt;id&gt;/reports/</code>. Short replies stay inline.</>},
  {name: 'Plan progress on the thread', detail: <>Link a thread to a SpecWeave increment and a chip shows how many of its tasks are done, read from <code>spec.md</code> and <code>ledger.jsonl</code>.</>},
];

const LIMITS: {name: string; detail: React.ReactNode}[] = [
  {name: 'A rule for each project', detail: <>Under When a provider runs out, choose Switch automatically (the default), Offer the fallback, or Wait for the reset. A thread moves before the limit, at 95% by default, and never in the middle of a turn.</>},
  {name: 'Credits before the fallback, if you want them', detail: <>Redeem a banked reset, spend Codex credits or use Claude API credits first. Each is off until you turn it on, and SpecWithCode never buys credits for you.</>},
  {name: 'The thread keeps its place', detail: <>Continuing hands the thread over with its context, in the same worktree. Tick Auto-continue when the limit resets, continue on another machine of the project, or undo a failover you did not want.</>},
  {name: 'Limits per account and machine', detail: <>Usage &gt; Limits names each account and the machine it is signed in on, with the share left in every session and weekly window.</>},
  {name: 'A status page with history', detail: <>The health of the app, your machines and each provider, with each day’s worst status kept on your Mac for 90 days.</>},
];

const MACHINE_STEPS: {title: string; body: React.ReactNode}[] = [
  {title: 'Join Tailscale on every machine', body: <>The same tailnet, with MagicDNS on and HTTPS certificates allowed. Each machine keeps its private name on any network.</>},
  {title: 'Invite the new machine', body: <>On it, open Settings &gt; Connections and choose Invite this machine, or run the command below. You get one line that starts with <code>swc-machine-</code>.</>},
  {title: 'Add it on your main machine', body: <>Paste the line into Settings &gt; Connections &gt; Add a machine. It checks that the address answers as that machine before saving it.</>},
  {title: 'Allow workers', body: <>Choose Allow workers on the machine’s card. Coordinators can now start threads there.</>},
];

const CAPACITY: {name: string; detail: React.ReactNode}[] = [
  {name: 'Capacity grows with machines', detail: <>Each machine brings the limits of the accounts signed in on it. Two machines signed in to the same account share that account’s limits, so running agents on both spends them faster, not slower.</>},
  {name: 'Linux machines for API keys', detail: <>A Linux machine on x64 or arm64, such as a small VPS, can join as a worker. On a rented server, sign the provider CLIs in with an API key rather than a subscription; the app warns before you sign a subscription in there.</>},
  {name: 'You choose where work runs', detail: <>Threads run on the coordinator’s machine unless the project or the coordinator names another machine you allowed. A usage limit never moves a thread to another machine by itself.</>},
  {name: 'Nothing is copied between machines', detail: <>Each machine needs its own checkout of the project, with the same remote, and its own provider sign-ins. If a machine drops, a chat can continue on another one.</>},
];

const FINISH: {title: string; body: React.ReactNode}[] = [
  {title: 'The thread finishes', body: <>Leave the branch, open a PR, or open a PR and auto-merge. New projects default to auto-merge.</>},
  {title: 'Review in one place', body: <>The Code Review view collects the checks and reviews for finished branches, and you can merge from the thread.</>},
  {title: 'Conflicts go back to their owner', body: <>A conflicting pull request is resolved in the thread that owns it, with that thread’s context.</>},
  {title: 'On the host you already use', body: <>GitHub, GitLab, Forgejo, Gitea, Bitbucket or Azure DevOps.</>},
];

const REACH: {name: string; detail: React.ReactNode}[] = [
  {name: 'Computer use', detail: <>Agents can see and control the Mac the app runs on: take screenshots, click, type and scroll in any native app. Every provider gets it. It is set per machine, and macOS asks once for Screen Recording and Accessibility.</>},
  {name: 'SpecWithCode Browser', detail: <>A Chrome extension that lets an agent open, read, click and screenshot pages in your own Chrome profile, inside a tab group you can see and close. Install it from the <a href="https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb">Chrome Web Store</a> and pair it in Settings › Chrome.</>},
  {name: 'Isolated agent tabs', detail: <>Agents open pages in the app’s browser signed out by default: an isolated session that keeps no logins and is cleared when the app closes. To let agents use saved logins, choose a SpecWithCode browser profile for them, for every project or per project.</>},
  {name: 'Voice calls with the coordinator', detail: <>Talk to the coordinator out loud. Speech recognition and speech run on your Mac; an ElevenLabs voice is optional and uses your own key.</>},
];

const BRAND_FAQ = {q: 'Is Spec with Code the same as SpecWithCode?', a: 'Yes. SpecWithCode is written as one word and pronounced Spec with Code. It is the free AI coding agent workspace. SpecWeave is the separate CLI that keeps specifications, task evidence and handoffs in git.'};

const FAQ: {q: string; a: React.ReactNode}[] = [
  {q: 'Does everything stay on my machine?', a: <>No. Agent processes and project files live on the selected machine, but cloud models receive prompts and relevant context, which can include code and file contents. Connected tools use their own services. Private machine connections do not make model inference local.</>},
  {q: 'Can a subscription replace all API spending?', a: <>No. Use eligible plans through their supported coding agents. Limits, seat rules and provider terms still apply; API keys or extra usage may create separate charges. Enterprise billing may differ. Measure your own workload before claiming savings.</>},
  {q: 'What do I need to add another machine?', a: <>A Mac or a Linux machine (x64 or arm64) running SpecWithCode as a background service, Tailscale on every machine in the same tailnet, and that machine’s own project checkout and provider sign-ins. Then invite it and add the line on your main machine. Windows machines cannot run workers. Adding a machine does not add subscription entitlement or open your company network.</>},
  {q: 'Should one machine switch between accounts of the same provider?', a: <>We recommend against it. Keep each machine signed in to one account per provider and leave it that way. For more capacity, add a machine with its own subscriptions instead of switching accounts by hand.</>},
  {q: 'What is free?', a: <>SpecWithCode is free and open source. You bring your provider accounts and pay any provider charges directly. The <Link className="wv-link" to="/docs/getting-started/">SpecWeave CLI</Link> keeps specs, task evidence and handoffs in git so another tool can continue the work.</>},
  BRAND_FAQ,
];

/** Plain-text copy of FAQ for the FAQPage structured data. Keep it in step with FAQ above. */
const FAQ_TEXT: {q: string; a: string}[] = [
  {q: FAQ[0].q, a: 'No. Agent processes and project files live on the selected machine, but cloud models receive prompts and relevant context, which can include code and file contents. Connected tools use their own services. Private machine connections do not make model inference local.'},
  {q: FAQ[1].q, a: 'No. Use eligible plans through their supported coding agents. Limits, seat rules and provider terms still apply; API keys or extra usage may create separate charges. Enterprise billing may differ. Measure your own workload before claiming savings.'},
  {q: FAQ[2].q, a: 'A Mac or a Linux machine (x64 or arm64) running SpecWithCode as a background service, Tailscale on every machine in the same tailnet, and that machine’s own project checkout and provider sign-ins. Then invite it and add the line on your main machine. Windows machines cannot run workers. Adding a machine does not add subscription entitlement or open your company network.'},
  {q: FAQ[3].q, a: 'We recommend against it. Keep each machine signed in to one account per provider and leave it that way. For more capacity, add a machine with its own subscriptions instead of switching accounts by hand.'},
  {q: FAQ[4].q, a: 'SpecWithCode is free and open source. You bring your provider accounts and pay any provider charges directly. The SpecWeave CLI keeps specs, task evidence and handoffs in git so another tool can continue the work.'},
  BRAND_FAQ,
];

const SITE = 'https://spec-weave.com';
const PAGE_URL = `${SITE}/code/`;
const TITLE = 'SpecWithCode (Spec with Code): Claude Code & Codex workspace';
const DESCRIPTION = 'SpecWithCode (Spec with Code) is a free AI coding agent workspace. Run Claude Code, Codex and Cursor on your own machines with your existing accounts.';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg`;
const tour = getTutorial('specwithcode-tour');
const tourVideo = tour ? buildVideoObject(tour, SITE) : null;

const SPECWITHCODE_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': PAGE_URL,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: {'@id': `${SITE}/#website`},
      mainEntity: {'@id': `${PAGE_URL}#app`},
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${PAGE_URL}#app`,
      name: 'SpecWithCode',
      alternateName: 'Spec with Code',
      description: DESCRIPTION,
      url: PAGE_URL,
      applicationCategory: 'DeveloperApplication',
      applicationSubCategory: 'AI coding agent workspace',
      operatingSystem: 'macOS 13 or later (Apple silicon); Linux workers',
      softwareVersion: release.version,
      fileSize: release.size,
      downloadUrl: release.dmgUrl,
      releaseNotes: release.notesUrl,
      codeRepository: release.repoUrl,
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      image: `${SITE}/img/studio/code-hero-worker-20261015.webp`,
      screenshot: `${SITE}/img/studio/code-hero-worker-20261015.webp`,
      offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
      author: {
        '@type': 'Person',
        name: 'Anton Abyzov',
        url: 'https://github.com/anton-abyzov',
        sameAs: ['https://www.youtube.com/@antonabyzov', 'https://x.com/aabyzov'],
      },
      publisher: {'@id': `${SITE}/#org`},
    },
    ...(tourVideo ? [tourVideo] : []),
    {
      '@type': 'FAQPage',
      '@id': `${PAGE_URL}#faq`,
      mainEntity: FAQ_TEXT.map(({q, a}) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}})),
    },
  ],
};

const INVITE = 'specwithcode fleet invite';

function InviteCommand() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(INVITE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return <div className={clsx('wv-cmd', styles.cmd)}>
    <code>{INVITE}</code>
    <button type="button" className="wv-cmd__copy" onClick={copy}>
      {copied ? <Check size={14} strokeWidth={1.5} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.5} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  </div>;
}

function Evidence({items}: {items: {name: string; detail: React.ReactNode}[]}) {
  return <ul className={clsx('wv-evidence', styles.list)}>
    {items.map(item => <li key={item.name}>
      <span className="wv-evidence__name">{item.name}</span>
      <span className="wv-evidence__detail">{item.detail}</span>
    </li>)}
  </ul>;
}

export default function Code() {
  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="SpecWithCode: run Claude Code and Codex agents on your own Macs. Free and open source." />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script type="application/ld+json">{JSON.stringify(SPECWITHCODE_LD)}</script>
    </Head>
    <main className={clsx('wv-root', styles.page)}>
      <header className={clsx(styles.shell, styles.hero)}>
        <div className={styles.heroCopy}>
          <p className={styles.product}>
            <img src="/img/studio/specwithcode-icon.png" alt="" width="28" height="28" />
            <span className={styles.productName}>SpecWithCode</span>
            <span className={styles.productNote}>Free and open source</span>
          </p>
          <h1>SpecWithCode: run Claude Code, Codex and Cursor agents on your own machines</h1>
          <p className={styles.lead}>SpecWithCode (pronounced “Spec with Code”) is a free, open-source AI coding agent workspace on your own machines.</p>
          <p className={styles.lead}>One coordinator per project starts worker threads in {providerSummary(6)}, each on its own branch or worktree.</p>
          <div className={styles.actions}>
            <a className="wv-btn wv-btn--primary wv-btn--lg" href={release.dmgUrl} data-track="download_click" data-placement="hero"><Download {...btnIcon} />Download for Mac</a>
            <a className="wv-btn wv-btn--secondary wv-btn--lg" href="#workflow">See how it works</a>
          </div>
          <p className={styles.requirements}>Version {release.version}, {release.size}. Apple silicon, macOS 13 or later, early access. Signed with Developer ID and notarized by Apple. Linux machines can join as workers. <Link className="wv-link" to="/docs/reference/changelog#specwithcode-releases">What is new in {release.version}</Link> · <Link className="wv-link" to="/code/download/">Download and install steps</Link></p>
          <div className={clsx('wv-note', styles.qualification)}>
            <Info {...icon} />
            <p><strong>Cloud models still receive prompts and relevant context through your chosen provider.</strong> Local execution does not mean offline AI.</p>
          </div>
        </div>

        <div className={styles.heroShot}>
          <figure className="wv-window">
            <div className="wv-window__bar"><span>Worker thread</span><span>Codex, GPT-6.1-Sol</span></div>
            <a href="/img/studio/code-hero-worker-20261015.webp" aria-label="Open the full-size worker thread screenshot">
              <img src="/img/studio/code-hero-worker-20261015.webp" width="920" height="1130" alt="Actual SpecWithCode Codex worker thread reporting its outcome: created tip.py, python3 tip.py 50 18 exited 0 with Tip $9.00 and Total $59.00, no blockers, and 2 changed files" fetchPriority="high" />
            </a>
            <figcaption>A Codex worker reports its outcome, the command it ran with its output, and the files it changed. App capture, SpecWithCode 1.0.21, 15 October 2026. <a className="wv-link" href="#real-run">Step through the whole run</a></figcaption>
          </figure>
        </div>
      </header>

      <div className={styles.shell}><FleetSequence /></div>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="threads-title">
        <div className={styles.sectionHead}>
          <h2 id="threads-title">Stay in charge of every thread</h2>
          <p>The main window holds only the coordinator. Worker threads open in the right panel, and every mention of a thread is a link with its live status.</p>
        </div>
        <Evidence items={THREADS} />
      </section>

      <div className={styles.shell}><CoordinatorFlow /></div>

      <section className={clsx(styles.shell, styles.section, styles.split)} id="limits" aria-labelledby="limits-title">
        <div className={styles.sectionHead}>
          <h2 id="limits-title">Keep working when a provider runs out</h2>
          <p>Every account’s session and weekly limits sit on one screen. When a thread stops on a limit, the rule you set for the project decides what happens next.</p>
          <p className={styles.fine}>Watch <Link className="wv-link" to="/tutorials/provider-runs-out/">Keep working when a provider runs out</Link>, or read <Link className="wv-link" to="/docs/guides/claude-code-usage-limit/">what to do when Claude Code hits its usage limit</Link>.</p>
        </div>
        <Evidence items={LIMITS} />
      </section>

      <div className={styles.shell}><SubscriptionValue /></div>

      <section className={clsx(styles.shell, styles.section)} id="machines" aria-labelledby="machines-title">
        <div className={styles.sectionHead}>
          <h2 id="machines-title">Add the machines you trust</h2>
          <p>Start on one Mac. When you want more capacity, add another Mac or a Linux machine to your private Tailscale network and let coordinators start workers there. Each machine reaches the others by its own Tailscale name, whatever network it is on.</p>
        </div>

        <ol className={clsx('wv-thread', 'wv-thread--across', styles.route)} aria-label="Add a machine in four steps">
          {MACHINE_STEPS.map(step => <li key={step.title}>
            <p className="wv-thread__title">{step.title}</p>
            <p className="wv-thread__body">{step.body}</p>
          </li>)}
        </ol>

        <div className={styles.machineGrid}>
          <div className={styles.machineCmd}>
            <p className={styles.cmdLabel}>On the machine you are adding</p>
            <InviteCommand />
            <p className={styles.fine}>The line holds a management credential: treat it like a password, keep it out of chat, and revoke it in Settings &gt; Connections when you no longer need it. By default it stays valid for a year.</p>

            <div className={clsx('wv-note', styles.recommend)}>
              <Users {...icon} />
              <p><strong>One machine per subscription.</strong> Sign each machine in to one account per provider, for example Claude Code to one Claude account and Codex to one ChatGPT account, and leave it that way. Switching subscriptions by hand on a machine makes it unclear which account a thread is using and whose limits apply. For more capacity, add another machine with its own subscriptions.</p>
            </div>
          </div>

          <Evidence items={CAPACITY} />
        </div>

        <div className={clsx('wv-note', styles.boundary)}>
          <Cloud {...icon} />
          <p><strong>Your model providers sit outside this network.</strong> Each machine’s agents talk to their providers directly, from that machine’s own connection and sign-in. Prompts and relevant context leave your network; provider and integration data policies apply.</p>
        </div>
        <p className={styles.fine}>Work continues while the machine running it is awake. <Link className="wv-link" to="/docs/overview/studio">More about machines and pairing</Link></p>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="finish-title">
        <div className={styles.sectionHead}>
          <h2 id="finish-title">From thread to merged pull request</h2>
          <p>A worker’s branch does not sit forgotten in a worktree. Decide how each finished thread lands, and keep the review next to the work.</p>
        </div>
        <ol className={clsx('wv-thread', styles.finish)} aria-label="How a finished thread lands">
          {FINISH.map(step => <li key={step.title}>
            <p className="wv-thread__title">{step.title}</p>
            <p className="wv-thread__body">{step.body}</p>
          </li>)}
        </ol>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="reach-title">
        <div className={styles.sectionHead}>
          <h2 id="reach-title">Let agents use your Mac and your browser</h2>
          <p>Some work happens outside a terminal. Give agents the desktop and the browser when a task needs them, on the machines where you allow it.</p>
        </div>
        <Evidence items={REACH} />
      </section>

      <section className={clsx(styles.shell, styles.section)} aria-labelledby="specs-title">
        <div className={styles.sectionHead}>
          <h2 id="specs-title">Keep the spec with the code</h2>
          <p>The optional SpecWeave CLI keeps acceptance criteria, task evidence and handoffs in your repository. SpecWithCode runs the agents against that record. <Link className="wv-link" to="/docs/compare/spec-as-code/">Compare spec as code, spec-driven and intent-first development</Link>, or <Link className="wv-link" to="/docs/compare/spec-driven-development-tools/">compare the planning tools</Link>.</p>
        </div>
      </section>

      <div className={styles.shell}><WhySpecWithCode /></div>

      <section className={clsx(styles.shell, styles.section)} id="watch" aria-labelledby="watch-title">
        <div className={styles.sectionHead}>
          <h2 id="watch-title">Watch the recording: one goal, two workers</h2>
          <p>Follow a coordinator, a Codex thread and a Claude Code thread through a small coding task. The recording predates 1.0, so some screens have changed since, and the later usage-limit example is simulated.</p>
        </div>
        <StudioTutorialVideo />
      </section>

      <section className={clsx(styles.shell, styles.section, styles.faq)} aria-labelledby="questions-title">
        <h2 id="questions-title">Questions about SpecWithCode</h2>
        <div className={styles.faqList}>
          {FAQ.map(item => <details key={item.q}>
            <summary><span>{item.q}</span><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className={clsx(styles.shell, styles.final)} aria-labelledby="final-title">
        <h2 id="final-title">Build with the agents you choose</h2>
        <p>Keep the work on machines you control. Link a thread to a SpecWeave increment and the <Link className="wv-link" to="/product">CLI</Link> can pick up the same work.</p>
        <div className={styles.actions}>
          <a className="wv-btn wv-btn--primary wv-btn--lg" href={release.dmgUrl} data-track="download_click" data-placement="footer"><Download {...btnIcon} />Download SpecWithCode</a>
          <a className={clsx('wv-link', styles.finalLink)} href={release.repoUrl}>View source on GitHub</a>
        </div>
      </section>
    </main>
  </Layout>;
}
