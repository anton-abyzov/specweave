import React, {useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import {Activity, ArrowRightLeft, Layers, Puzzle, ArrowUpRight, Check, ChevronDown, CirclePause, Cloud, Coins, Copy, Cpu, Download, FileCheck2, FileText, Gauge, Info, Laptop, ListChecks, MessagesSquare, Mic, MousePointerClick, Network, Route, Server, ShieldCheck, Users} from 'lucide-react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import CoordinatorFlow from '../components/ecosystem/CoordinatorFlow';
import HeroFlow from '../components/ecosystem/HeroFlow';
import SubscriptionValue from '../components/ecosystem/SubscriptionValue';
import WhySpecWithCode from '../components/ecosystem/WhySpecWithCode';
import StudioTutorialVideo from '../components/ecosystem/StudioTutorialVideo';
import HeroStage from '../components/code/HeroStage';
import BuiltWithItself from '../components/code/BuiltWithItself';
import HarnessStack from '../components/code/Harness';
import {BrowserDiagram, CHROME_STORE_URL, CardShot, Cards, ChromeAnnounce, FinishDiagram, GuideCards, MachinesDiagram, PolicyPicker, Tokens, WindowCrop, type CardItem} from '../components/code/Landing';
import landing from '../components/code/Landing.module.css';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_OPERATING_SYSTEMS} from '../data/specwithcodeRelease';
import {useSpecWithCodeInstaller} from '../data/specwithcodeInstaller';
import {PATHS, TUTORIALS, buildVideoObject, byRecency, getTutorial, resolvePath} from '../data/tutorials';
import styles from './code.module.css';

/*
  The feature sections originated from the 1.0.43/1.0.44 user-doc audit.
  Increment 1008 revises positioning against provider-adapter source and retained
  receipts. Source support, UI demonstrations and installed acceptance are distinct;
  this comment is not a blanket certification of every feature on the current build.
*/

const icon = {size: 20, strokeWidth: 1.5, 'aria-hidden': true} as const;
const btnIcon = {size: 16, strokeWidth: 1.5, 'aria-hidden': true} as const;

const THREADS: {name: string; detail: React.ReactNode}[] = [
  {name: 'Questions and decisions', detail: <>Agents ask with cards that offer lettered options. An answered decision folds into one line.</>},
  {name: 'Stop all, continue all', detail: <>Pause every thread at once, or type <code>/stop</code>, <code>/continue</code> or <code>/status</code>. Messages held after a stop or a restart wait with Resume and Discard.</>},
  {name: 'Reports you can reopen', detail: <>Long worker reports become cards, saved beside the increment under <code>.specweave/increments/&lt;id&gt;/reports/</code>. Short replies stay inline.</>},
  {name: 'Plan progress on the thread', detail: <>Link a thread to a SpecWeave increment and a chip shows how many of its tasks are done, read from <code>spec.md</code> and <code>ledger.jsonl</code>.</>},
];

const HARNESS: {name: string; detail: React.ReactNode}[] = [
  {name: 'Each agent at full strength', detail: <>The vendor’s own harness runs every thread, so its tools, permission rules and instruction files come with it, and the vendor’s updates reach you through the agent itself.</>},
  {name: 'Sign-ins stay with the vendor', detail: <>SpecWithCode starts the agent installed on your machine, which keeps its own sign-in and subscription. Your subscription is used through that agent, the way its vendor ships it.</>},
  {name: 'Skills follow you across harnesses', detail: <>Skills and plugins belong to each harness, so a skill set up for Claude Code is not there when a thread runs on Codex. The <a href="https://verified-skill.com">Verified Skill</a> CLI installs the same skill into every agent you use.</>},
  {name: 'One place above all of them', detail: <>A coordinator plans across harnesses, every thread shares the same view whichever agent runs it, and a thread can move to another harness with its context when a provider runs out.</>},
];

const LIMITS: {name: string; detail: React.ReactNode}[] = [
  {name: 'A rule for each project', detail: <>Under When a provider runs out, choose Switch automatically, Offer the fallback, or Wait for the reset. Continuation depends on a compatible, available provider and the policy you choose.</>},
  {name: 'Credits before the fallback, if you want them', detail: <>Redeem a Codex banked reset, spend Codex credits or use Claude API credits first. Each is off until you turn it on, and SpecWithCode never buys credits for you.</>},
  {name: 'The thread keeps its place', detail: <>Continuing hands the thread over with its context, in the same worktree. Tick Auto-continue when the limit resets, continue on another machine of the project, or undo a failover you did not want.</>},
  {name: 'Limits per account and machine', detail: <>Usage &gt; Limits names each account and the machine it is signed in on, with the share left in every session and weekly window.</>},
  {name: 'A status page with history', detail: <>The health of the app, your machines and each provider, with each day’s worst status kept on your computer for 90 days.</>},
];

const MACHINE_STEPS: {title: string; body: React.ReactNode}[] = [
  {title: 'Link SpecWithCode Connect', body: <>On the new machine, open Settings &gt; Connections, sign in to SpecWithCode Connect and turn on Enable SpecWithCode Connect. Only the worker needs it. On a server, run <code>specwithcode connect</code>. It works on any network, with nothing to change on your router.</>},
  {title: 'Invite the new machine', body: <>On it, open Settings &gt; Connections &gt; Your private machines and choose Invite this machine, or run the command below. You get one line that starts with <code>swc-machine-</code>. A Connect line works once, within an hour.</>},
  {title: 'Add it on your main machine', body: <>Paste the line into Settings &gt; Connections &gt; Your private machines &gt; Add a machine. It checks that the address answers as that machine before saving it.</>},
  {title: 'Allow workers', body: <>Choose Allow workers on the machine’s card. Coordinators can now start threads there.</>},
];

const CAPACITY: {name: string; detail: React.ReactNode}[] = [
  {name: 'Capacity grows with machines', detail: <>Each machine brings the limits of the accounts signed in on it. Two machines signed in to the same account share that account’s limits, so running agents on both spends them faster, not slower.</>},
  {name: 'Mac, Linux or Windows workers', detail: <>A Mac, a Linux machine on x64 or arm64, or a Windows 10 or 11 PC on x64 can join as a worker over Connect. Each one runs Claude Code, Codex and the other agents on their own sign-ins, your subscriptions included, the same way on every system. On a server you rent in a datacenter we recommend API keys instead of a subscription.</>},
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

const BRAND_FAQ = {q: 'Is Spec with Code the same as SpecWithCode?', a: 'Yes. SpecWithCode is written as one word and pronounced Spec with Code. It is a free interface for the coding agents you already use. SpecWeave is the separate CLI that keeps specifications, task evidence and handoffs in git.'};

const FAQ: {q: string; a: React.ReactNode}[] = [
  {q: 'Does everything stay on my machine?', a: <>No. Agent processes and project files live on the selected machine, but cloud models receive prompts and relevant context, which can include code and file contents. Connected tools use their own services. Private machine connections do not make model inference local.</>},
  {q: 'Can a subscription replace all API spending?', a: <>No. Use eligible plans through their supported coding agents. Limits, seat rules and provider terms still apply; API keys or extra usage may create separate charges. Enterprise billing may differ. Measure your own workload before claiming savings.</>},
  {q: 'What do I need to add another machine?', a: <>A Mac, a Linux machine (x64 or arm64) or a Windows 10 or 11 PC (x64) running SpecWithCode as a background service, linked to SpecWithCode Connect, and that machine’s own project checkout and provider sign-ins. Then invite it and add the line on your main machine. Adding a machine does not add subscription entitlement or open your company network.</>},
  {q: 'Should one machine switch between accounts of the same provider?', a: <>We recommend against it. Keep each machine signed in to one account per provider and leave it that way. For more capacity, add a machine with its own subscriptions instead of switching accounts by hand.</>},
  {q: 'What is free?', a: <>SpecWithCode is free, with source available. You bring your provider accounts and pay any provider charges directly. The <Link className="wv-link" to="/docs/getting-started/">SpecWeave CLI</Link> keeps specs, task evidence and handoffs in git so another tool can continue the work.</>},
  BRAND_FAQ,
  {q: 'Is SpecWithCode a coding-agent harness?', a: <>No. A harness is the agent loop, tools, permissions and sign-in a vendor builds around its model, and Claude Code, Codex and GitHub Copilot CLI are harnesses. SpecWithCode is an interface to those native harnesses: each one keeps running its own agent, and the app adds project coordination, worker threads, usage limits, machines and context handoffs on top. SpecWithCode is independently maintained, with its own settings, portable specs and handoff workflows. <a className="wv-link" href="#harnesses">How it works with harnesses</a></>},
  {q: 'Do I need SpecWeave increments?', a: <>Increments are optional. We strongly recommend them for work that spans several agents or sessions: write the acceptance criteria, record task evidence and review the result before closing. Add skills for the work at hand, such as design, testing or code review. Passing checks supports those specific results; it does not guarantee bug-free software.</>},
];

/** Plain-text copy of FAQ for the FAQPage structured data. Keep it in step with FAQ above. */
const FAQ_TEXT: {q: string; a: string}[] = [
  {q: FAQ[0].q, a: 'No. Agent processes and project files live on the selected machine, but cloud models receive prompts and relevant context, which can include code and file contents. Connected tools use their own services. Private machine connections do not make model inference local.'},
  {q: FAQ[1].q, a: 'No. Use eligible plans through their supported coding agents. Limits, seat rules and provider terms still apply; API keys or extra usage may create separate charges. Enterprise billing may differ. Measure your own workload before claiming savings.'},
  {q: FAQ[2].q, a: 'A Mac, a Linux machine (x64 or arm64) or a Windows 10 or 11 PC (x64) running SpecWithCode as a background service, linked to SpecWithCode Connect, and that machine’s own project checkout and provider sign-ins. Then invite it and add the line on your main machine. Adding a machine does not add subscription entitlement or open your company network.'},
  {q: FAQ[3].q, a: 'We recommend against it. Keep each machine signed in to one account per provider and leave it that way. For more capacity, add a machine with its own subscriptions instead of switching accounts by hand.'},
  {q: FAQ[4].q, a: 'SpecWithCode is free, with source available. You bring your provider accounts and pay any provider charges directly. The SpecWeave CLI keeps specs, task evidence and handoffs in git so another tool can continue the work.'},
  BRAND_FAQ,
  {q: FAQ[6].q, a: 'No. A harness is the agent loop, tools, permissions and sign-in a vendor builds around its model, and Claude Code, Codex and GitHub Copilot CLI are harnesses. SpecWithCode is an interface to those native harnesses: each one keeps running its own agent, and the app adds project coordination, worker threads, usage limits, machines and context handoffs on top. SpecWithCode is independently maintained, with its own settings, portable specs and handoff workflows.'},
  {q: FAQ[7].q, a: 'Increments are optional. We strongly recommend them for work that spans several agents or sessions: write the acceptance criteria, record task evidence and review the result before closing. Add skills for the work at hand, such as design, testing or code review. Passing checks supports those specific results; it does not guarantee bug-free software.'},
];

const SITE = 'https://spec-weave.com';
const PAGE_URL = `${SITE}/code/`;
const TITLE = 'SpecWithCode (Spec with Code): one interface for your coding agents on your own computers';
const DESCRIPTION = 'SpecWithCode (Spec with Code): one interface for Claude Code, Codex, Copilot and more, in their native harnesses. Free for macOS, Windows and Linux.';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`;
/** The SpecWithCode explainer on the AI Power YouTube channel. */
const EXPLAINER_URL = 'https://www.youtube.com/watch?v=eCLJSZ8wo9w';
const tour = getTutorial('specwithcode-tour');
// Server-rendered list of every SpecWithCode guide; the per-agent series gets its own heading
// once its path is published again (its episodes are being re-recorded).
const agentPath = PATHS.find(p => p.id === 'your-agent-in-specwithcode');
const AGENT_GUIDES = agentPath ? resolvePath(agentPath).published : [];
const OTHER_GUIDES = byRecency(TUTORIALS.filter(t => t.product === 'specwithcode' && !AGENT_GUIDES.includes(t)));
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
      applicationSubCategory: 'Agentic development environment',
      // Same wording as /code/download/, which offers the Mac, Windows and Linux builds.
      operatingSystem: SPECWITHCODE_OPERATING_SYSTEMS,
      softwareVersion: release.version,
      fileSize: release.size,
      downloadUrl: release.dmgUrl,
      releaseNotes: release.notesUrl,
      codeRepository: release.repoUrl,
      sameAs: [release.repoUrl],
      // The explainer is about the app, not the app itself, so it is subjectOf, not sameAs.
      subjectOf: {
        '@type': 'VideoObject',
        name: 'Claude Code + Codex on All Your Machines | SpecWithCode',
        url: EXPLAINER_URL,
        embedUrl: 'https://www.youtube.com/embed/eCLJSZ8wo9w',
        thumbnailUrl: 'https://i.ytimg.com/vi/eCLJSZ8wo9w/maxresdefault.jpg',
        uploadDate: '2026-10-13',
      },
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

/** Pair each list with an icon and, where one exists, a mini visual: real crops or tokens, never invented numbers. */
const withIcons = (items: {name: string; detail: React.ReactNode}[], extras: Omit<CardItem, 'name' | 'detail'>[]): CardItem[] =>
  items.map((item, i) => ({...item, ...extras[i]}));

const THREAD_CARDS = withIcons(THREADS, [
  {icon: MessagesSquare, visual: <Tokens items={['A', 'B', 'C']} active={1} />},
  {icon: CirclePause, visual: <Tokens items={['/stop', '/continue', '/status']} mono />},
  {icon: FileText, visual: <Tokens items={['reports/']} mono />},
  {icon: ListChecks, visual: <Tokens items={['spec.md', 'ledger.jsonl']} mono />},
]);

const LIMIT_CARDS = withIcons(LIMITS, [
  {icon: Route},
  {icon: Coins},
  {icon: ArrowRightLeft},
  {icon: Gauge, visual: <CardShot src="/img/studio/provider-status-20261008.png" w={280} h={195} alt="Actual SpecWithCode provider list: Codex authenticated on a ChatGPT Pro subscription, Claude needs attention" caption="Real capture, 8 October 2026" />},
  {icon: Activity},
]);

const HARNESS_CARDS = withIcons(HARNESS, [{icon: Layers}, {icon: ShieldCheck}, {icon: Puzzle}, {icon: ArrowRightLeft}]);

const CAPACITY_CARDS = withIcons(CAPACITY, [{icon: Cpu}, {icon: Server}, {icon: Network}, {icon: Laptop}]);

const REACH_CARDS = withIcons(REACH.filter(r => r.name !== 'SpecWithCode Browser'), [
  {icon: MousePointerClick},
  {icon: ShieldCheck},
  {icon: Mic},
]);
const CHROME = REACH.find(r => r.name === 'SpecWithCode Browser')!;

/** The closing download button: the Mac .dmg until the visitor's own platform is known. */
function FooterDownload() {
  const {installer} = useSpecWithCodeInstaller();
  return <a className="wv-btn wv-btn--primary wv-btn--lg" href={installer.url} data-track="download_click" data-placement="footer" data-os={installer.key}><Download {...btnIcon} />Download SpecWithCode</a>;
}

export default function Code() {
  const icon28 = useBaseUrl('/img/studio/specwithcode-icon.png');
  const providerBase = useBaseUrl('/img/studio/providers/');
  // Other pages link to /code/#harnesses and #built-with-itself; section ids on a custom page must be declared to the link checker.
  const brokenLinks = useBrokenLinks();
  brokenLinks.collectAnchor('harnesses');
  brokenLinks.collectAnchor('built-with-itself');
  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="SpecWithCode: one interface for Claude Code, Codex, GitHub Copilot and other coding agents on your own computers. macOS, Windows and Linux. Free, source available." />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="SpecWithCode: one interface for your coding agents. macOS, Windows and Linux." />
      <script type="application/ld+json">{JSON.stringify(SPECWITHCODE_LD)}</script>
    </Head>
    <main className={clsx('wv-root', styles.page, styles.landing)}>
      <header className={clsx(styles.shell, styles.top)}>
        <div className={styles.topCopy}>
          <ChromeAnnounce />
          <p className={styles.product}>
            <img src={icon28} alt="" width="28" height="28" />
            <span className={styles.productName}>SpecWithCode</span>
            <span className={styles.productNote}>Free, source available</span>
          </p>
          <h1><span className={styles.heroBrand}>SpecWithCode</span> Give the goal.<br /><em>Keep the whole picture.</em></h1>
          <p className={styles.lead}>One interface for Claude Code, Codex, GitHub Copilot and more, each in its own native harness on your computers. A coordinator keeps the brief, workers do the work, you review the result.</p>
          <div className={styles.actions}>
            <Link className="wv-btn wv-btn--primary wv-btn--lg" to="/code/download/" data-track="download_click" data-placement="hero"><Download {...btnIcon} />Download for macOS, Windows or Linux</Link>
            <a className="wv-btn wv-btn--secondary wv-btn--lg" href="#workflow">See how it works</a>
          </div>
          <ul className={styles.providers} aria-label="Some supported coding agents">
            {[['claude', 'Claude Code'], ['openai', 'Codex'], ['copilot', 'GitHub Copilot'], ['gemini', 'Gemini CLI'], ['cursor', 'Cursor'], ['opencode', 'OpenCode']].map(([file, name]) => <li key={name}><img src={`${providerBase}${file}.svg`} alt="" width="28" height="28" /><span>{name}</span></li>)}
            <li><a href="#harnesses">More agents</a></li>
          </ul>
        </div>
        <div className={styles.topMedia}>
          <HeroStage />
        </div>
        <div className={styles.topFine}>
          <p className={styles.requirements}>Early access for macOS 13 or later on Apple silicon, Windows 10 and 11 (x64 and arm64), and Linux (x64 and arm64). Mac releases are signed and notarized; Windows and Linux installers are unsigned. <Link className="wv-link" to="/code/download/">Downloads, versions and installation steps</Link></p>
          <div className={clsx('wv-note', styles.qualification)}>
            <Info {...icon} />
            <p><strong>Cloud models still receive prompts and relevant context through your chosen provider.</strong> Local execution does not mean offline AI.</p>
          </div>
        </div>
      </header>

      <section id="workflow" className={clsx(styles.shell, styles.flowBand)} aria-label="From your goal to a reviewed result">
        <HeroFlow />
      </section>

      <div className={styles.shell}><CoordinatorFlow /></div>

      <section className={clsx(styles.shell, styles.section)} id="harnesses" aria-labelledby="harnesses-title">
        <div className={clsx(styles.sectionHead, landing.reveal)}>
          <h2 id="harnesses-title">One interface. The native harnesses underneath.</h2>
          <p>A harness is everything a vendor builds around its model so it can write code: the agent loop, the tools, permissions, context handling and sign-in. Claude Code, Codex and GitHub Copilot CLI are harnesses. SpecWithCode does not replace them or rebuild them. It talks to each one natively and gives you one place to plan, steer and review the work they do.</p>
        </div>
        <HarnessStack />
        <div className={styles.harnessCards}><Cards items={HARNESS_CARDS} columns={4} label="What running native harnesses means" /></div>
      </section>

      <div className={clsx(styles.shell, styles.section)}><BuiltWithItself more={false} /></div>

      <section className={clsx(styles.shell, styles.section, styles.threads)} aria-labelledby="threads-title">
        <div className={styles.threadsMain}>
          <div className={clsx(styles.sectionHead, landing.reveal)}>
            <h2 id="threads-title">Stay in charge of every thread</h2>
            <p>The main window holds only the coordinator. Worker threads open in the right panel, and every mention of a thread is a link with its live status.</p>
          </div>
          <Cards items={THREAD_CARDS} columns={2} label="Thread controls and evidence" />
        </div>
        <WindowCrop region="threads" className={styles.threadsShot} label="Threads panel" alt="Actual SpecWithCode Threads panel: nothing is waiting on you, two threads working on Claude Code and Codex, and idle threads listed with their provider and model" />
      </section>

      <section className={clsx(styles.shell, styles.section)} id="limits" aria-labelledby="limits-title">
        <div className={styles.limitsHead}>
          <div className={clsx(styles.sectionHead, landing.reveal)}>
            <h2 id="limits-title">Keep working when a provider runs out</h2>
            <p>Every account’s session and weekly limits sit on one screen. When a thread stops on a limit, the rule you set for the project decides what happens next.</p>
            <p className={styles.fine}>Watch <Link className="wv-link" to="/tutorials/provider-runs-out/">Keep working when a provider runs out</Link>, or read <Link className="wv-link" to="/docs/guides/claude-code-usage-limit/">what to do when Claude Code hits its usage limit</Link>.</p>
          </div>
          <PolicyPicker />
        </div>
        <h3 className={styles.railTitle}>Policies, credits and availability</h3>
        <Cards items={LIMIT_CARDS} rail label="Policies, credits and availability" />
      </section>

      <div className={styles.shell}><SubscriptionValue /></div>

      <section className={clsx(styles.shell, styles.section)} id="machines" aria-labelledby="machines-title">
        <div className={styles.machinesHead}>
          <div className={clsx(styles.sectionHead, landing.reveal)}>
            <h2 id="machines-title">Add the machines you trust</h2>
            <p>Start on one computer. When you want more capacity, link a Mac, Linux or Windows worker to SpecWithCode Connect, add it with an invite line and let coordinators start workers there. Machines reach each other through Connect, whatever network each one is on. If two machines also share a Tailscale network, SpecWithCode can use that address as a direct fallback; Connect stays the primary route.</p>
          </div>
          <MachinesDiagram />
        </div>

        <ol className={clsx('wv-thread', 'wv-thread--across', styles.route)} aria-label="Add a machine in four steps">
          {MACHINE_STEPS.map((step, i) => <li key={step.title} className={landing.reveal} style={{'--i': i} as React.CSSProperties}>
            <p className="wv-thread__title"><span className={styles.stepNo}>{String(i + 1).padStart(2, '0')}</span>{step.title}</p>
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

          <Cards items={CAPACITY_CARDS} columns={2} label="Capacity and where work runs" />
        </div>

        <div className={clsx('wv-note', styles.boundary)}>
          <Cloud {...icon} />
          <p><strong>Your model providers sit outside this network.</strong> Each machine’s agents talk to their providers directly, from that machine’s own connection and sign-in. Prompts and relevant context leave your network; provider and integration data policies apply.</p>
        </div>
        <p className={styles.fine}>Work continues while the machine running it is awake. <Link className="wv-link" to="/docs/overview/studio">More about machines and pairing</Link></p>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.finishBand)} aria-labelledby="finish-title">
        <div className={clsx(styles.sectionHead, landing.reveal)}>
          <h2 id="finish-title">From thread to merged pull request</h2>
          <p>A worker’s branch does not sit forgotten in a worktree. Decide how each finished thread lands, and keep the review next to the work.</p>
          <div className={styles.finishDiagram}><FinishDiagram /></div>
        </div>
        <ol className={clsx('wv-thread', styles.finish)} aria-label="How a finished thread lands">
          {FINISH.map((step, i) => <li key={step.title} className={landing.reveal} style={{'--i': i} as React.CSSProperties}>
            <p className="wv-thread__title">{step.title}</p>
            <p className="wv-thread__body">{step.body}</p>
          </li>)}
        </ol>
      </section>

      <section className={clsx(styles.shell, styles.section)} id="reach" aria-labelledby="reach-title">
        <div className={clsx(styles.sectionHead, landing.reveal)}>
          <h2 id="reach-title">Let agents use your browser and, on macOS, your desktop</h2>
          <p>Some work happens outside a terminal. Give agents browser access when a task needs it. Native desktop control is macOS only and requires permission on that Mac.</p>
        </div>
        <div className={styles.reachGrid}>
          <article className={clsx(styles.chrome, landing.reveal)} aria-labelledby="chrome-title">
            <BrowserDiagram />
            <div className={styles.chromeCopy}>
              <h3 id="chrome-title">{CHROME.name}</h3>
              <p>{CHROME.detail}</p>
              <p className={styles.chromeWho}>For agents running in SpecWithCode, whichever provider: Claude Code, Codex, GitHub Copilot, Grok and others.</p>
              <a className="wv-btn wv-btn--secondary" href={CHROME_STORE_URL} data-track="chrome_extension_click" data-placement="reach">Get it from the Chrome Web Store<ArrowUpRight {...btnIcon} /></a>
            </div>
          </article>
          <Cards items={REACH_CARDS} columns={3} label="Other ways agents reach beyond the terminal" />
        </div>
      </section>

      <section className={clsx(styles.shell, styles.section)} aria-labelledby="specs-title">
        <div className={clsx(styles.specs, landing.reveal)}>
          <span className={styles.specsIcon}><FileCheck2 size={22} strokeWidth={1.5} aria-hidden="true" /></span>
          <div>
            <h2 id="specs-title">Keep the spec with the code</h2>
            <p>The optional SpecWeave CLI keeps acceptance criteria, task evidence and handoffs in your repository. Agents in SpecWithCode work against that record. <Link className="wv-link" to="/docs/compare/spec-as-code/">Compare spec as code, spec-driven and intent-first development</Link>, or <Link className="wv-link" to="/docs/compare/spec-driven-development-tools/">compare the planning tools</Link>. See also <Link className="wv-link" to="/docs/compare/specwithcode-vs-opencode-t3-code/">SpecWithCode vs OpenCode and other agent apps</Link> and <Link className="wv-link" to="/docs/compare/specwithcode-vs-bridgemind/">SpecWithCode vs BridgeMind</Link>.</p>
          </div>
          <div className={styles.specsFiles}><Tokens items={['spec.md', 'ledger.jsonl', 'reports/']} mono /></div>
        </div>
      </section>

      <div className={styles.shell}><WhySpecWithCode /></div>

      <section className={clsx(styles.shell, styles.section)} id="watch" aria-labelledby="watch-title">
        <div className={clsx(styles.sectionHead, landing.reveal)}>
          <h2 id="watch-title">Watch the recording: one goal, two workers</h2>
          <p>Follow a coordinator, a Codex thread and a Claude Code thread through a small coding task. The recording predates 1.0, so some screens have changed since, and the later usage-limit example is simulated. Or watch the <a className="wv-link" href={EXPLAINER_URL}>SpecWithCode explainer on YouTube</a>.</p>
        </div>
        <StudioTutorialVideo />
      </section>

      <section className={clsx(styles.shell, styles.section)} id="tutorials" aria-labelledby="tutorials-title">
        <div className={clsx(styles.sectionHead, landing.reveal)}>
          <h2 id="tutorials-title">SpecWithCode tutorials</h2>
          <p>Short guides built on real recordings, each with its steps and full transcript. <Link className="wv-link" to="/tutorials?product=specwithcode">All tutorials</Link></p>
        </div>
        {AGENT_GUIDES.length > 0 && <>
          <h3 className={styles.guidesTitle}>Run your first task with your agent</h3>
          <GuideCards guides={AGENT_GUIDES} rail />
        </>}
        <h3 className={styles.guidesTitle}>Projects, threads and machines</h3>
        <GuideCards guides={OTHER_GUIDES} />
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
        <div className={styles.finalPanel}>
          <span className={styles.finalGlow} aria-hidden="true" />
          <h2 id="final-title">Build with the agents you choose</h2>
          <p>Keep the work on machines you control. For work across agents or sessions, we strongly recommend an optional <Link className="wv-link" to="/product">SpecWeave increment</Link> with acceptance criteria, task evidence and a review before completion.</p>
          <div className={styles.actions}>
            <FooterDownload />
            <a className={clsx('wv-link', styles.finalLink)} href={release.repoUrl}>View source on GitHub</a>
          </div>
        </div>
      </section>
    </main>
  </Layout>;
}
