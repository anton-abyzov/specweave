import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import {ArrowRight, ArrowUpRight, Check, ChevronDown, GitMerge, Info, Layers, Network, Users} from 'lucide-react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop, SPECWITHCODE_OPERATING_SYSTEMS} from '../data/specwithcodeRelease';
import {useSpecWithCodeInstaller} from '../data/specwithcodeInstaller';
import styles from '../components/code/FreeLanding.module.css';

/*
  /code (specwithcode.com) for the free campaign that starts 4 November 2026.

  One promise, one piece of evidence, three steps, a download for each system.
  Every claim on this page was tested on 4 November 2026 on the maintainer's M4 Mac:
  - Codex signed in with a free ChatGPT account (GPT-6 Luna) created a file in SpecWithCode.
  - A Claude Code usage limit (triggered with the app's test switch, not a real limit) moved the
    same chat to DeepSeek Harness, which still knew the code word given to Claude before the switch.
    The handoff and the context are real; never say Claude really hit its limit in this capture.
  - Codex Free also handed off to DeepSeek.
  Do not add a Claude Code to Codex handoff claim until that path is fixed and retested.
  The captures are crops of the original screenshots (handoff-thread.png, codexfree-thread.png);
  nothing in them is staged or redrawn.
*/

const SITE = 'https://spec-weave.com';
const PAGE_URL = `${SITE}/code/`;
const TITLE = 'SpecWithCode (Spec with Code): your coding agents, never stuck on a limit';
const DESCRIPTION = 'When Claude Code or Codex hits its usage limit, SpecWithCode continues the same chat on DeepSeek, context and all. Free and source available for Mac, Windows and Linux.';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`;

const HANDOFF = {
  src: '/img/studio/handoff-claude-deepseek-20261104.webp',
  w: 752,
  h: 562,
  alt: 'Actual SpecWithCode chat: "Claude Code limit reached, continued on DeepSeek Harness". Asked for the code word given before the switch, DeepSeek answers PELICAN-42.',
};
const CODEX_FREE = {
  src: '/img/studio/codex-free-chatgpt-20261104.webp',
  w: 752,
  h: 278,
  alt: 'Actual SpecWithCode chat on GPT-6 Luna through Codex signed in with a free ChatGPT account: it created hello.txt, one changed file.',
};

type Os = 'mac' | 'windows' | 'linux';
const DOWNLOADS: {os: Os; label: string; note: string; url: string; file: string}[] = [
  {os: 'mac', label: 'Mac', note: 'Apple silicon, macOS 13+', url: release.dmgUrl, file: 'SpecWithCode-arm64.dmg'},
  {os: 'windows', label: 'Windows', note: 'Windows 10 and 11, x64', url: desktop.exe.url, file: desktop.exe.name},
  {os: 'linux', label: 'Linux', note: 'AppImage, x64', url: desktop.appImage.url, file: desktop.appImage.name},
];

const OS_ICON: Record<Os, React.ReactNode> = {
  mac: <svg viewBox="0 0 814 1000" aria-hidden="true"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>,
  windows: <svg viewBox="0 0 88 88" aria-hidden="true"><path fill="currentColor" d="m0 12.402 35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z" /></svg>,
  linux: <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c-2.3 0-3.3 2-3.2 4.3.1 1.3-.2 2.2-1 3.3-1 1.3-2.5 3.3-2.6 5.4-.1 1 .2 1.7.6 2.2-.6.4-1.6.6-1.8 1.4-.2.9.6 1.6.4 2.4-.1.5.3 1 .9 1 1 .1 2-.1 2.9.4.9.4 1.9.4 2.6-.2.5.1 1.5.1 2.4 0 .7.6 1.7.7 2.6.2.9-.5 1.9-.3 2.9-.4.6 0 1-.5.9-1-.2-.8.6-1.5.4-2.4-.2-.8-1.2-1-1.8-1.4.4-.5.7-1.2.6-2.2-.1-2.1-1.6-4.1-2.6-5.4-.8-1.1-1.1-2-1-3.3C15.3 4 14.3 2 12 2zm-1.3 3.6c.4 0 .7.5.7 1.1 0 .6-.3 1.1-.7 1.1-.4 0-.7-.5-.7-1.1 0-.6.3-1.1.7-1.1zm2.6 0c.4 0 .7.5.7 1.1 0 .6-.3 1.1-.7 1.1-.4 0-.7-.5-.7-1.1 0-.6.3-1.1.7-1.1zM12 8.4c.9 0 2 .6 2 1 0 .4-1.1 1.1-2 1.1s-2-.7-2-1.1c0-.4 1.1-1 2-1z" /></svg>,
};

/** Download buttons for Mac, Windows and Linux. The visitor's own system leads once the browser says which it is. */
function Downloads({placement}: {placement: string}) {
  const {installer, detected} = useSpecWithCodeInstaller();
  const mine: Os | null = !detected ? null : installer.key === 'mac' ? 'mac' : installer.key.startsWith('windows') ? 'windows' : installer.key.startsWith('linux') ? 'linux' : null;
  const lead = mine ?? 'mac';
  const ordered = [...DOWNLOADS].sort((a, b) => Number(b.os === lead) - Number(a.os === lead));
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
    <p className={styles.downloadsMore}>Free, source available. <Link className="wv-link" to="/code/download/">Arm builds, .deb and install steps</Link></p>
  </div>;
}

function Capture({shot, caption, className, eager}: {shot: typeof HANDOFF; caption: React.ReactNode; className?: string; eager?: boolean}) {
  const src = useBaseUrl(shot.src);
  return <figure className={clsx(styles.capture, className)}>
    <div className={styles.window}>
      <div className={styles.windowBar} aria-hidden="true"><span /><span /><span /></div>
      <img src={src} width={shot.w} height={shot.h} alt={shot.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </div>
    <figcaption>{caption}</figcaption>
  </figure>;
}

const MORE: {id: string; icon: typeof Layers; title: string; body: React.ReactNode; to: string; link: string}[] = [
  {id: 'harnesses', icon: Layers, title: 'Each agent in its own harness', body: <>Claude Code, Codex, GitHub Copilot, Cursor, OpenCode and more run the way their vendors ship them, on your own sign-ins.</>, to: '/docs/studio/harnesses/', link: 'Harnesses and models'},
  {id: 'coordinator', icon: Users, title: 'A coordinator for bigger jobs', body: <>Give one goal. A coordinator splits it into worker threads on different agents, and you review the result.</>, to: '/docs/overview/studio', link: 'How projects work'},
  {id: 'machines', icon: Network, title: 'All your machines', body: <>Add a spare laptop, a Windows PC or a small Linux server as a worker, each signed in to its own accounts.</>, to: '/tutorials/add-a-machine/', link: 'Add a machine'},
  {id: 'built-with-itself', icon: GitMerge, title: 'Built with itself', body: <>367 pull requests to SpecWithCode were opened by its own worker threads and merged in the second half of October 2026.</>, to: release.repoUrl, link: 'View the source'},
];

const BRAND_FAQ = {q: 'Is Spec with Code the same as SpecWithCode?', a: 'Yes. SpecWithCode is written as one word and pronounced Spec with Code. It is a free interface for the coding agents you already use. SpecWeave is the separate CLI that keeps specifications, task evidence and handoffs in git.'};

/** Shown on the page and, as plain text, in the FAQPage structured data. */
const FAQ: {q: string; a: string; extra?: React.ReactNode}[] = [
  {q: 'Is SpecWithCode really free?', a: 'Yes. SpecWithCode is free, with source available, on Mac, Windows and Linux. It never resells tokens or adds a markup: you sign in with your own accounts. Codex works on a free ChatGPT account within that plan\'s usage limits. DeepSeek uses your own DeepSeek API key, and DeepSeek bills that usage directly.'},
  {q: 'What happens when Claude Code hits its usage limit?', a: 'The chat continues on the next agent you set up, such as DeepSeek, in the same thread and with its context. In our test on 4 November 2026, with the limit triggered by a test switch, DeepSeek still knew a code word given to Claude before the switch. For each project you choose whether SpecWithCode switches automatically, offers the switch, or waits for the limit to reset.'},
  {q: 'Do I need a paid Claude or ChatGPT plan?', a: 'No. You can start with Codex on a free ChatGPT account and add DeepSeek as the fallback. If you already pay for Claude Code or ChatGPT, sign in to those too and SpecWithCode uses them first.'},
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
      image: `${SITE}${HANDOFF.src}`,
      screenshot: `${SITE}${HANDOFF.src}`,
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
  const logo = (file: string) => `${providerBase}${file}.svg`;
  const marks = {claude: logo('claude'), openai: logo('openai'), deepseek: logo('deepseek'), copilot: logo('copilot'), gemini: logo('gemini'), cursor: logo('cursor'), opencode: logo('opencode')};
  // Other pages link to /code/#harnesses and #built-with-itself; section ids on a custom page must be declared to the link checker.
  const brokenLinks = useBrokenLinks();
  for (const m of MORE) brokenLinks.collectAnchor(m.id);
  brokenLinks.collectAnchor('start');
  brokenLinks.collectAnchor('questions');

  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="SpecWithCode: your coding agents, never stuck on a limit. Free and source available for macOS, Windows and Linux." />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="SpecWithCode: your coding agents, never stuck on a limit." />
      <script type="application/ld+json">{JSON.stringify(SPECWITHCODE_LD)}</script>
    </Head>
    <main className={clsx('wv-root', styles.page)}>

      {/* ---------- Hero: the promise and the proof ---------- */}
      <header className={styles.hero}>
        <div className={clsx(styles.shell, styles.heroGrid)}>
          <div className={styles.heroCopy}>
            <p className={styles.product}>
              <img src={icon28} alt="" width="28" height="28" />
              <span className={styles.productName}>SpecWithCode</span>
              <span className={styles.badge}>Free · source available</span>
            </p>
            <h1>Your coding agents, <em>never stuck on a limit</em></h1>
            <p className={styles.lead}>When Claude Code or Codex runs out, the same chat keeps going on DeepSeek, with everything it knew. Start with Codex on a free ChatGPT account.</p>
            <ul className={styles.proof}>
              <li><Check size={16} strokeWidth={2} aria-hidden="true" />Works on a free ChatGPT account</li>
              <li><Check size={16} strokeWidth={2} aria-hidden="true" />Keeps the context when it switches</li>
              <li><Check size={16} strokeWidth={2} aria-hidden="true" />Mac, Windows and Linux</li>
            </ul>
            <Downloads placement="hero" />
            <ul className={styles.marks} aria-label="Agents shown on this page">
              <li><img src={marks.claude} alt="" width="22" height="22" />Claude Code</li>
              <li><img className={styles.darkPlate} src={marks.openai} alt="" width="22" height="22" />Codex</li>
              <li><img src={marks.deepseek} alt="" width="22" height="22" />DeepSeek</li>
            </ul>
          </div>
          <Capture
            shot={HANDOFF}
            eager
            className={styles.heroShot}
            caption={<><strong>Real capture, 4 November 2026.</strong> When Claude’s limit hits, DeepSeek picks up the same chat and still knows the code word from before the switch. The limit here was triggered with a test switch; the handoff is real.</>}
          />
        </div>
      </header>

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
            <Capture shot={CODEX_FREE} className={styles.stepShot} caption="Real capture: GPT-6 Luna on a free account created hello.txt in 8.6 seconds." />
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
          <p><strong>Already pay for Claude Code or ChatGPT?</strong> Sign in to those too. SpecWithCode uses them first and moves on only when they run out. Cloud models still receive prompts and relevant context through your chosen provider.</p>
        </div>
      </section>

      {/* ---------- Download ---------- */}
      <section id="download" className={clsx(styles.shell, styles.section)} aria-labelledby="download-title">
        <div className={styles.downloadPanel}>
          <h2 id="download-title">Get SpecWithCode</h2>
          <p>Mac {release.version}, Windows and Linux {desktop.version}. The Mac app is signed and notarized; the Windows and Linux installers are not code-signed yet.</p>
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
        <h2 id="final-title">Never stuck on a limit again</h2>
        <p>Free and source available. Your accounts, your machines.</p>
        <div className={styles.finalActions}>
          <a className="wv-btn wv-btn--primary wv-btn--lg" href="#download" data-track="download_click" data-placement="footer">Download SpecWithCode</a>
          <a className="wv-btn wv-btn--secondary wv-btn--lg" href={release.repoUrl}>View source on GitHub<ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" /></a>
        </div>
      </section>
    </main>
  </Layout>;
}
