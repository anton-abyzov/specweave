import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import {ArrowRight, ArrowUpRight, ChevronDown, Gauge, GitMerge, Info, Layers, Network, Users} from 'lucide-react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop, SPECWITHCODE_OPERATING_SYSTEMS} from '../data/specwithcodeRelease';
import {useSpecWithCodeInstaller} from '../data/specwithcodeInstaller';
import FlowStage from '../components/code/FlowStage';
import styles from '../components/code/FreeLanding.module.css';

/*
  /code (specwithcode.com): the free campaign that starts 4 November 2026.

  The hero leads with Claude Code and Codex. Free: Codex on a free ChatGPT account, with DeepSeek
  (your own API key) on another machine. Subscriptions: the paid plans you already have, in parallel
  on your own machines. The hero diagram plays both on its own.
  Both were tested on 4 November 2026 on the maintainer's M4 Mac: Codex on a free account ran,
  and Claude Code and Codex threads continued on DeepSeek with their context. The Claude limit in
  that handoff test was triggered with the app's test switch.
  Never claim a Claude Code to Codex handoff (not retested), several accounts of one provider,
  or one free account per machine. The hero diagram (FlowStage) is an illustration, not a capture.
*/

const SITE = 'https://spec-weave.com';
const PAGE_URL = `${SITE}/code/`;
const TITLE = 'Claude Code and Codex on your own computers, never stuck on a limit: SpecWithCode (Spec with Code)';
const DESCRIPTION = 'SpecWithCode (Spec with Code): Claude Code and Codex in one chat on every machine. At a limit, the next agent picks it up. Free. macOS, Windows, Linux.';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`;

type Os = 'mac' | 'windows' | 'linux';
const DOWNLOADS: {os: Os; label: string; note: string; url: string}[] = [
  {os: 'mac', label: 'Mac', note: 'Apple silicon, macOS 13+', url: release.dmgUrl},
  {os: 'windows', label: 'Windows', note: 'Windows 10 and 11, x64', url: desktop.exe.url},
  {os: 'linux', label: 'Linux', note: 'AppImage, x64', url: desktop.appImage.url},
];

const UNSUPPORTED = {
  'intel-mac': 'This Mac has an Intel chip. SpecWithCode for Mac needs Apple silicon; use a Windows or Linux machine instead.',
  mobile: 'SpecWithCode runs on a Mac, Windows PC or Linux machine. Open this page there to download it.',
} as const;

const OS_ICON: Record<Os, React.ReactNode> = {
  mac: <svg viewBox="0 0 814 1000" aria-hidden="true"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>,
  windows: <svg viewBox="0 0 88 88" aria-hidden="true"><path fill="currentColor" d="m0 12.402 35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z" /></svg>,
  linux: <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c-2.3 0-3.3 2-3.2 4.3.1 1.3-.2 2.2-1 3.3-1 1.3-2.5 3.3-2.6 5.4-.1 1 .2 1.7.6 2.2-.6.4-1.6.6-1.8 1.4-.2.9.6 1.6.4 2.4-.1.5.3 1 .9 1 1 .1 2-.1 2.9.4.9.4 1.9.4 2.6-.2.5.1 1.5.1 2.4 0 .7.6 1.7.7 2.6.2.9-.5 1.9-.3 2.9-.4.6 0 1-.5.9-1-.2-.8.6-1.5.4-2.4-.2-.8-1.2-1-1.8-1.4.4-.5.7-1.2.6-2.2-.1-2.1-1.6-4.1-2.6-5.4-.8-1.1-1.1-2-1-3.3C15.3 4 14.3 2 12 2zm-1.3 3.6c.4 0 .7.5.7 1.1 0 .6-.3 1.1-.7 1.1-.4 0-.7-.5-.7-1.1 0-.6.3-1.1.7-1.1zm2.6 0c.4 0 .7.5.7 1.1 0 .6-.3 1.1-.7 1.1-.4 0-.7-.5-.7-1.1 0-.6.3-1.1.7-1.1zM12 8.4c.9 0 2 .6 2 1 0 .4-1.1 1.1-2 1.1s-2-.7-2-1.1c0-.4 1.1-1 2-1z" /></svg>,
};

/** Download buttons for Mac, Windows and Linux. The visitor's own system leads once the browser says which it is. */
function Downloads({placement}: {placement: string}) {
  const {installer, detected, unsupported} = useSpecWithCodeInstaller();
  const mine: Os | null = !detected || unsupported ? null : installer.key === 'mac' ? 'mac' : installer.key.startsWith('windows') ? 'windows' : installer.key.startsWith('linux') ? 'linux' : null;
  const lead = mine ?? 'mac';
  // The visitor's own system gets the build for its chip (arm64 Windows or Linux included).
  const ordered = DOWNLOADS
    .map(d => d.os === mine ? {...d, url: installer.url, note: installer.platformName} : d)
    .sort((a, b) => Number(b.os === lead) - Number(a.os === lead));
  return <div className={styles.downloads}>
    <ul className={styles.osButtons} aria-label="Download SpecWithCode">
      {ordered.map(d => <li key={d.os}>
        <a
          className={clsx('wv-btn', 'wv-btn--lg', d.os === lead ? 'wv-btn--primary' : 'wv-btn--secondary', styles.osButton)}
          href={d.url}
          data-track="download_click"
          data-placement={placement}
          data-os={d.os}
        >
          <span className={styles.osIcon}>{OS_ICON[d.os]}</span>
          <span className={styles.osText}><span>Download for {d.label}</span><small>{d.note}</small></span>
        </a>
      </li>)}
    </ul>
    {unsupported && <p className={styles.downloadsMore} role="note">{UNSUPPORTED[unsupported]}</p>}
    <p className={styles.downloadsMore}>Free, source available. <Link className="wv-link" to="/code/download/">Arm builds, .deb and install steps</Link></p>
  </div>;
}

/** One big button for the visitor's own system, with the other systems one click away. */
function HeroDownload() {
  const {installer, detected, unsupported} = useSpecWithCodeInstaller();
  const os: Os = !detected || unsupported ? 'mac' : installer.key === 'mac' ? 'mac' : installer.key.startsWith('windows') ? 'windows' : 'linux';
  const main = DOWNLOADS.find(d => d.os === os)!;
  const url = detected && !unsupported ? installer.url : main.url;
  const note = detected && !unsupported ? installer.platformName : main.note;
  return <div className={styles.heroDownload}>
    <a className={clsx('wv-btn', 'wv-btn--lg', 'wv-btn--primary', styles.bigButton)} href={url} data-track="download_click" data-placement="hero" data-os={os}>
      <span className={styles.osIcon}>{OS_ICON[os]}</span>
      <span className={styles.osText}><span>Get it free for {main.label}</span><small>{note}</small></span>
    </a>
    {unsupported && <p className={styles.heroNote} role="note">{UNSUPPORTED[unsupported]}</p>}
    <p className={styles.heroNote}>Also for {DOWNLOADS.filter(d => d.os !== os).map((d, i) => <React.Fragment key={d.os}>{i > 0 && ' and '}<a href={d.url} data-track="download_click" data-placement="hero-alt" data-os={d.os}>{d.label}</a></React.Fragment>)}. <a href="#download">All builds</a></p>
  </div>;
}

const SUBS: {icon: typeof Layers; title: string; body: React.ReactNode}[] = [
  {icon: Users, title: 'Every plan working at once', body: <>A coordinator splits one goal into threads and runs them on Claude Code, Codex and others in parallel, each on its own plan.</>},
  {icon: Network, title: 'Every machine you own', body: <>Each Mac, Windows PC or Linux server adds the limits of the plans signed in on it. One account per provider on each machine.</>},
  {icon: Gauge, title: 'Hand off at 98%, or where you choose', body: <>Set the point from 50% to 100% per project. Work moves to a plan with room before the provider refuses it.</>},
  {icon: GitMerge, title: 'Usage for every account', body: <>Usage › Limits shows each account, the machine it is signed in on, and what is left in every session and weekly window.</>},
];

const MORE: {id: string; icon: typeof Layers; title: string; body: React.ReactNode; to: string; link: string}[] = [
  {id: 'harnesses', icon: Layers, title: 'Each agent in its own harness', body: <>Claude Code, Codex, GitHub Copilot, Cursor, OpenCode and more run the way their vendors ship them, on your own sign-ins.</>, to: '/docs/studio/harnesses/', link: 'Harnesses and models'},
  {id: 'coordinator', icon: Users, title: 'A coordinator for bigger jobs', body: <>Give one goal. A coordinator splits it into worker threads on different agents, and you review the result.</>, to: '/docs/overview/studio', link: 'How projects work'},
  {id: 'machines', icon: Network, title: 'All your machines', body: <>Add a spare laptop, a Windows PC or a small Linux server as a worker, each signed in to its own accounts.</>, to: '/tutorials/add-a-machine/', link: 'Add a machine'},
  {id: 'built-with-itself', icon: GitMerge, title: 'Built with itself', body: <>367 pull requests to SpecWithCode were opened by its own worker threads and merged in the second half of October 2026.</>, to: release.repoUrl, link: 'View the source'},
];

const BRAND_FAQ = {q: 'Is Spec with Code the same as SpecWithCode?', a: 'Yes. SpecWithCode is written as one word and pronounced Spec with Code. It is a free interface for the coding agents you already use. SpecWeave is the separate CLI that keeps specifications, task evidence and handoffs in git.'};

/** Shown on the page and, as plain text, in the FAQPage structured data. */
const FAQ: {q: string; a: string}[] = [
  {q: 'Is SpecWithCode really free?', a: 'Yes. SpecWithCode is free, with source available, on Mac, Windows and Linux. It never resells tokens or adds a markup: you sign in with your own accounts. Codex works on a free ChatGPT account within that plan\'s usage limits. DeepSeek uses your own DeepSeek API key, and DeepSeek bills that usage directly.'},
  {q: 'What happens when Claude Code hits its usage limit?', a: 'The chat continues on the next agent you set up, such as Codex on a free ChatGPT account or DeepSeek, in the same thread and with its history. In our tests on 4 November 2026, with the Claude limit triggered by a test switch, Codex (SpecWithCode 1.0.191) and DeepSeek each still knew a code word given to Claude before the switch. For each project you choose whether SpecWithCode switches automatically, offers the switch, or waits for the limit to reset.'},
  {q: 'Do I need a paid Claude or ChatGPT plan?', a: 'No. You can start with Codex on a free ChatGPT account and add DeepSeek as the fallback. If you already pay for Claude Code or ChatGPT, sign in to those too and keep DeepSeek as the fallback.'},
  {q: 'Does everything stay on my machine?', a: 'No. Agent processes and project files live on your machine, but cloud models receive prompts and relevant context, which can include code and file contents, through the provider you chose.'},
  {q: 'Should one machine switch between accounts of the same provider?', a: 'No. Keep each machine signed in to one account per provider. For more capacity, add a machine with its own accounts instead of switching accounts by hand, and follow each provider\'s terms.'},
  BRAND_FAQ,
  {q: 'Is SpecWithCode a coding-agent harness?', a: 'No. A harness is the agent loop, tools, permissions and sign-in a vendor builds around its model, and Claude Code, Codex and GitHub Copilot CLI are harnesses. SpecWithCode is an interface to those native harnesses: each one keeps running its own agent, and the app adds projects, worker threads, usage limits, machines and context handoffs on top.'},
];

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
      isAccessibleForFree: true,
      image: OG_IMAGE,
      offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
      author: {
        '@type': 'Person',
        name: 'Anton Abyzov',
        url: 'https://github.com/anton-abyzov',
        sameAs: ['https://www.youtube.com/@antonabyzov', 'https://x.com/aabyzov'],
      },
      publisher: {'@id': `${SITE}/#org`},
    },
    {
      '@type': 'FAQPage',
      '@id': `${PAGE_URL}#faq`,
      mainEntity: FAQ.map(({q, a}) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}})),
    },
  ],
};

export default function Code() {
  const icon28 = useBaseUrl('/img/studio/specwithcode-icon.png');
  const providerBase = useBaseUrl('/img/studio/providers/');
  const logo = (file: string) => `${providerBase}${file}.svg?v=2`;
  const marks = {claude: logo('claude'), openai: logo('openai'), deepseek: logo('deepseek'), copilot: logo('copilot'), gemini: logo('gemini'), cursor: logo('cursor'), opencode: logo('opencode')};
  // Other pages link to /code/#harnesses and #built-with-itself; section ids on a custom page must be declared to the link checker.
  const brokenLinks = useBrokenLinks();
  for (const m of MORE) brokenLinks.collectAnchor(m.id);
  brokenLinks.collectAnchor('start');
  brokenLinks.collectAnchor('questions');
  brokenLinks.collectAnchor('subscriptions');

  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="SpecWithCode: one interface for your coding agents on macOS, Windows and Linux. Free, source available." />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="SpecWithCode: one interface for your coding agents. macOS, Windows and Linux." />
      <script type="application/ld+json">{JSON.stringify(SPECWITHCODE_LD)}</script>
    </Head>
    <main className={clsx('wv-root', styles.page)}>

      {/* ---------- Hero: two flows, one download ---------- */}
      <header className={styles.hero}>
        <div className={clsx(styles.shell, styles.heroGrid)}>
          <div className={styles.heroCopy}>
            <p className={styles.product}>
              <img src={icon28} alt="" width="28" height="28" />
              <span className={styles.productName}>SpecWithCode</span>
              <span className={styles.badge}>Free · source available</span>
            </p>
            <h1><span className={styles.h1Top}><img className={styles.h1Mark} src={marks.claude} alt="" width="48" height="48" /><img className={clsx(styles.h1Mark, styles.h1MarkDark)} src={marks.openai} alt="" width="48" height="48" />Claude Code and Codex.</span> <em>Never stuck on a limit.</em></h1>
            <p className={styles.lead}>One chat, every machine, every plan. Start with Codex on a free ChatGPT account, or add the Claude Max and ChatGPT Pro you already pay for. When Claude Code nears its limit, Codex picks up the same thread with its history.</p>
            <HeroDownload />
          </div>
          <div className={styles.heroMedia}>
            <FlowStage />
          </div>
        </div>
      </header>

      {/* ---------- Sourced numbers ---------- */}
      <section className={clsx(styles.shell, styles.vsSection)} aria-labelledby="vs-title">
        <h2 id="vs-title">The Codex millions use. <em>Free on your account.</em></h2>
        <ul className={styles.stats}>
          <li><strong>5M+</strong><span>people use Codex every week</span><a href="https://www.constellationr.com/insights/news/openai-touts-broadening-codex-usage-5-million-weekly-active-users" rel="noopener">OpenAI, June 2026</a></li>
          <li><strong>$0</strong><span>Codex on a free ChatGPT account</span><a href="https://openai.com/index/introducing-the-codex-app/" rel="noopener">OpenAI, for a limited time</a></li>
          <li><strong>98%</strong><span>where SpecWithCode hands off by default, before the limit stops you</span><small>You can set it from 50% to 100%</small></li>
        </ul>
      </section>

      {/* ---------- For people on paid plans ---------- */}
      <section id="subscriptions" className={clsx(styles.shell, styles.section)} aria-labelledby="subs-title">
        <div className={styles.sectionHead}>
          <h2 id="subs-title">Paying $200 a month? Use all of it.</h2>
          <p>SpecWithCode runs each agent on the plan you already pay for, across every machine you sign in, and keeps going when one plan runs low.</p>
        </div>
        <ul className={styles.more}>
          {SUBS.map(({icon: Icon, title, body}) => <li key={title} className={styles.moreCard}>
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </li>)}
        </ul>
        <ul className={styles.alsoMarks} aria-label="Plans shown here">
          <li><img src={marks.claude} alt="" width="20" height="20" />Claude Max and Pro</li>
          <li><img className={styles.darkPlate} src={marks.openai} alt="" width="20" height="20" />ChatGPT Pro and Plus</li>
          <li><img className={styles.darkPlate} src={marks.copilot} alt="" width="20" height="20" />GitHub Copilot</li>
        </ul>
      </section>

      {/* ---------- Three steps ---------- */}
      <section id="start" className={clsx(styles.shell, styles.section)} aria-labelledby="start-title">
        <div className={styles.sectionHead}>
          <h2 id="start-title">Set it up in three steps</h2>
          <p>About two minutes, and nothing to pay to try it.</p>
        </div>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">1</span>
            <h3>Install SpecWithCode</h3>
            <p>Download it for your Mac, Windows PC or Linux machine and open it. No SpecWithCode account needed.</p>
            <a className={clsx('wv-link', styles.stepLink)} href="#download">Downloads<ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></a>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">2</span>
            <h3><img className={styles.darkPlate} src={marks.openai} alt="" width="22" height="22" />Sign in to Codex with a free ChatGPT account</h3>
            <p>In Settings › Providers, choose Codex and sign in. No card on file. The free plan’s usage limits apply.</p>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">3</span>
            <h3><img src={marks.deepseek} alt="" width="22" height="22" />Add DeepSeek as your fallback</h3>
            <p>Add DeepSeek Harness in Settings › Providers with your own DeepSeek API key. When Codex or Claude Code hits a limit, the chat moves to DeepSeek with its context.</p>
            <p className={styles.stepFine}>DeepSeek bills its API usage to you directly. SpecWithCode adds nothing on top.</p>
          </li>
        </ol>
        <div className={clsx('wv-note', styles.note)}>
          <Info size={20} strokeWidth={1.5} aria-hidden="true" />
          <p><strong>Already pay for Claude Code or ChatGPT?</strong> Sign in to those too and keep using them. When one hits its limit, the chat can move to DeepSeek. Cloud models still receive prompts and relevant context through your chosen provider.</p>
        </div>
      </section>

      {/* ---------- Download ---------- */}
      <section id="download" className={clsx(styles.shell, styles.section)} aria-labelledby="download-title">
        <div className={styles.downloadPanel}>
          <h2 id="download-title">Get SpecWithCode</h2>
          <p>{release.version === desktop.version ? <>Version {release.version} for Mac, Windows and Linux.</> : <>Mac {release.version}, Windows and Linux {desktop.version}.</>} The Mac app is signed and notarized; the Windows and Linux installers are not code-signed yet.</p>
          <Downloads placement="download" />
        </div>
      </section>

      {/* ---------- Everything else, briefly ---------- */}
      <section className={clsx(styles.shell, styles.section)} aria-labelledby="more-title">
        <div className={styles.sectionHead}>
          <h2 id="more-title">There’s more when you need it</h2>
        </div>
        <ul className={styles.more}>
          {MORE.map(({id, icon: Icon, title, body, to, link}) => <li key={id} id={id} className={styles.moreCard}>
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
            {to.startsWith('http')
              ? <a className="wv-link" href={to}>{link}<ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" /></a>
              : <Link className="wv-link" to={to}>{link}<ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></Link>}
          </li>)}
        </ul>
        <ul className={styles.alsoMarks} aria-label="Other supported coding agents">
          <li><img className={styles.darkPlate} src={marks.copilot} alt="" width="20" height="20" />GitHub Copilot</li>
          <li><img src={marks.gemini} alt="" width="20" height="20" />Gemini CLI</li>
          <li><img className={styles.darkPlate} src={marks.cursor} alt="" width="20" height="20" />Cursor</li>
          <li><img className={styles.lightPlate} src={marks.opencode} alt="" width="20" height="20" />OpenCode</li>
          <li><Link className="wv-link" to="/docs/studio/harnesses/">and more</Link></li>
        </ul>
      </section>

      {/* ---------- Questions ---------- */}
      <section id="questions" className={clsx(styles.shell, styles.section)} aria-labelledby="questions-title">
        <h2 id="questions-title">Questions</h2>
        <div className={styles.faq}>
          {FAQ.map(item => <details key={item.q}>
            <summary><span>{item.q}</span><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className={clsx(styles.shell, styles.final)} aria-labelledby="final-title">
        <h2 id="final-title">Codex for free. Never stuck on a limit.</h2>
        <p>Free and source available. Your accounts, your machines. Add the optional SpecWeave CLI to keep <Link className="wv-link" to="/docs/compare/spec-as-code/">the spec with the code</Link>.</p>
        <div className={styles.finalActions}>
          <a className="wv-btn wv-btn--primary wv-btn--lg" href="#download">Download SpecWithCode</a>
          <a className="wv-btn wv-btn--secondary wv-btn--lg" href={release.repoUrl}>View source on GitHub<ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" /></a>
        </div>
      </section>
    </main>
  </Layout>;
}
