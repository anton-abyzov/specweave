import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import Translate, {translate} from '@docusaurus/Translate';
import {ArrowRight, ArrowUpRight, ChevronDown, GitMerge, Info, Layers, Star} from 'lucide-react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import {SPECWITHCODE_OPERATING_SYSTEMS, SPECWITHCODE_REPO_URL, type SpecWithCodeMacRelease} from '../data/specwithcodeRelease';
import {useSpecWithCodeRelease, type SpecWithCodeDownloads} from '../data/specwithcodeLiveRelease';
import {useSpecWithCodeInstaller} from '../data/specwithcodeInstaller';
import FlowStage from '../components/code/FlowStage';
import Benefits from '../components/code/benefits/Benefits';
import {OS_ICON, type Os} from '../components/code/osIcons';
import MobileStores from '../components/code/MobileStores';
import {SPECS_URL} from '../components/code/BuiltWithItself';
import {CountUp} from '../components/sections/Motion';
import {CHROME_EXTENSION_URL} from '../components/home/chrome';
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

import {SPECWITHCODE_MOBILE} from '../data/specwithcodeMobile';
const APP_STORE_URL = SPECWITHCODE_MOBILE.ios.url;
const SITE = 'https://spec-weave.com';
const pageTitle = () => translate({id: 'code.meta.title', message: 'Claude Code and Codex on your own computers, never stuck on a limit: SpecWithCode (Spec with Code)', description: 'Page title of the SpecWithCode landing page. Keep product names in English'});
const pageDescription = () => translate({id: 'code.meta.description', message: 'SpecWithCode (Spec with Code): Claude Code and Codex on macOS, Windows and Linux. Free mobile companion apps for iPhone and Android.', description: 'Meta description of the SpecWithCode landing page. Keep product names in English'});
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`;

const getDownloads = ({release, desktop}: SpecWithCodeDownloads): {os: Os; label: string; note: string; url: string}[] => [
  {os: 'mac', label: 'Mac', note: translate({id: 'code.downloads.mac.note', message: 'Apple silicon, macOS 13+', description: 'Requirements note under the Mac download button. Keep product names in English'}), url: release.dmgUrl},
  {os: 'windows', label: 'Windows', note: translate({id: 'code.downloads.windows.note', message: 'Windows 10 and 11, x64', description: 'Requirements note under the Windows download button. Keep product names in English'}), url: desktop.exe.url},
  {os: 'linux', label: 'Linux', note: translate({id: 'code.downloads.linux.note', message: 'AppImage, x64', description: 'Package note under the Linux download button. Keep product names in English'}), url: desktop.appImage.url},
];

const getUnsupported = () => ({
  'intel-mac': translate({id: 'code.downloads.unsupported.intelMac', message: 'This Mac has an Intel chip. SpecWithCode for Mac needs Apple silicon; use a Windows or Linux machine instead.', description: 'Shown when the visitor uses an Intel Mac. Keep product names in English'}),
  mobile: translate({id: 'code.downloads.unsupported.mobile', message: 'SpecWithCode runs on a Mac, Windows PC or Linux machine. The mobile apps below connect to your computer.', description: 'Shown when the visitor is on a phone or tablet. Keep product names in English'}),
} as const);

/** Download buttons for Mac, Windows and Linux. The visitor's own system leads once the browser says which it is. */
function Downloads({placement}: {placement: string}) {
  const {installer, detected, unsupported} = useSpecWithCodeInstaller();
  const DOWNLOADS = getDownloads(useSpecWithCodeRelease());
  const UNSUPPORTED = getUnsupported();
  const mine: Os | null = !detected || unsupported ? null : installer.key === 'mac' ? 'mac' : installer.key.startsWith('windows') ? 'windows' : installer.key.startsWith('linux') ? 'linux' : null;
  const lead = mine ?? 'mac';
  // The visitor's own system gets the build for its chip (arm64 Windows or Linux included).
  const ordered = DOWNLOADS
    .map(d => d.os === mine ? {...d, url: installer.url, note: installer.platformName} : d)
    .sort((a, b) => Number(b.os === lead) - Number(a.os === lead));
  return <div className={styles.downloads}>
    <ul className={styles.osButtons} aria-label={translate({id: 'code.downloads.list.ariaLabel', message: 'Download SpecWithCode', description: 'Accessible label of the list of download buttons. Keep product names in English'})}>
      {ordered.map(d => <li key={d.os}>
        <a
          className={clsx('wv-btn', 'wv-btn--lg', d.os === lead ? 'wv-btn--primary' : 'wv-btn--secondary', styles.osButton)}
          href={d.url}
          data-track="download_click"
          data-placement={placement}
          data-os={d.os}
        >
          <span className={styles.osIcon}>{OS_ICON[d.os]}</span>
          <span className={styles.osText}><span><Translate id="code.downloads.button" description="Download button label; {os} is Mac, Windows or Linux" values={{os: d.label}}>{'Download for {os}'}</Translate></span><small>{d.note}</small></span>
        </a>
      </li>)}
    </ul>
    {unsupported && <p className={styles.downloadsMore} role="note">{UNSUPPORTED[unsupported]}</p>}
    <p className={styles.downloadsMore}><Translate id="code.downloads.more" description="Line under the download buttons; {link} links to the download page" values={{link: <Link className="wv-link" to="/code/download/"><Translate id="code.downloads.more.link" description="Link to the download page with Arm builds, .deb packages and install steps">Arm builds, .deb and install steps</Translate></Link>}}>{'Free and open source (MIT). {link}'}</Translate></p>
  </div>;
}

/** One big button for the visitor's own system, with the other systems one click away. */
function HeroDownload() {
  const {installer, detected, unsupported} = useSpecWithCodeInstaller();
  const DOWNLOADS = getDownloads(useSpecWithCodeRelease());
  const UNSUPPORTED = getUnsupported();
  const os: Os = !detected || unsupported ? 'mac' : installer.key === 'mac' ? 'mac' : installer.key.startsWith('windows') ? 'windows' : 'linux';
  const main = DOWNLOADS.find(d => d.os === os)!;
  const url = detected && !unsupported ? installer.url : main.url;
  const note = detected && !unsupported ? installer.platformName : main.note;
  return <div className={styles.heroDownload}>
    <a className={clsx('wv-btn', 'wv-btn--lg', 'wv-btn--primary', styles.bigButton)} href={url} data-track="download_click" data-placement="hero" data-os={os}>
      <span className={styles.osIcon}>{OS_ICON[os]}</span>
      <span className={styles.osText}><span><Translate id="code.hero.download.button" description="Main hero download button; {os} is Mac, Windows or Linux" values={{os: main.label}}>{'Get it free for {os}'}</Translate></span><small>{note}</small></span>
    </a>
    <MobileStores placement="hero" />
    <p className={styles.heroNote}><Translate id="code.hero.mobile.description">Mobile companion apps to follow your projects and answer approvals from your phone.</Translate></p>
    <a className={styles.companion} href={CHROME_EXTENSION_URL} target="_blank" rel="noopener" data-track="chrome_extension_click" data-placement="hero">
      <span className={styles.companionMark} aria-hidden="true"><ChromeMark /></span>
      <span className={styles.companionText}>
        <strong><Translate id="code.hero.chrome.title" description="Title of the Chrome extension card under the hero download button; a link to the Chrome Web Store. Keep product names in English">Add SpecWithCode Browser to Chrome</Translate></strong>
        <span><Translate id="code.hero.chrome.body" description="One line under the Chrome extension card title">Agents use your signed-in Chrome · free</Translate></span>
      </span>
      <ArrowUpRight className={styles.companionArrow} size={18} strokeWidth={2.25} aria-hidden="true" />
    </a>
    {unsupported && <p className={styles.heroNote} role="note">{UNSUPPORTED[unsupported]}</p>}
    <p className={styles.heroNote}><Translate id="code.hero.download.also" description="Line under the hero download button; {platforms} lists the other systems as links, {allBuilds} links to the download section" values={{
      platforms: DOWNLOADS.filter(d => d.os !== os).map((d, i) => <React.Fragment key={d.os}>{i > 0 && <>{' '}{translate({id: 'code.hero.download.also.and', message: 'and', description: 'Word joining two system names, as in "Windows and Linux"'})}{' '}</>}<a href={d.url} data-track="download_click" data-placement="hero-alt" data-os={d.os}>{d.label}</a></React.Fragment>),
      allBuilds: <a href="#download"><Translate id="code.hero.download.allBuilds" description="Link to the download section with every build">All builds</Translate></a>,
    }}>{'Also for {platforms}. {allBuilds}'}</Translate></p>
  </div>;
}

/** The Chrome mark, drawn inline so the card needs no image request. */
function ChromeMark() {
  return <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#fff" />
    <path d="M24 2a22 22 0 0 1 19.05 11H24a11 11 0 0 0-9.53 5.5L7.9 7.13A21.95 21.95 0 0 1 24 2Z" fill="#DB4437" />
    <path d="M43.05 13A22 22 0 0 1 24 46l10.3-17.84A11 11 0 0 0 33.9 13Z" fill="#F4B400" />
    <path d="M7.9 7.13 14.47 18.5a11 11 0 0 0 9.53 16.5h.6L17.3 45A22 22 0 0 1 7.9 7.13Z" fill="#0F9D58" />
    <circle cx="24" cy="24" r="8.5" fill="#4285F4" />
    <circle cx="24" cy="24" r="8.5" fill="none" stroke="#fff" strokeWidth={2} />
  </svg>;
}

const getMore = (): {id: string; icon: typeof Layers; title: string; body: React.ReactNode; to: string; link: string}[] => [
  {id: 'built-with-itself', icon: GitMerge, title: translate({id: 'code.more.builtWithItself.title', message: 'Built with itself', description: 'Card title in the "more" section'}), body: <Translate
    id="code.more.builtWithItself.body"
    description="Card text in the 'more' section; {link} is a link labelled 'source code'. Keep product names in English"
    values={{link: <a className="wv-link" href={SPECWITHCODE_REPO_URL}><Translate id="code.more.builtWithItself.sourceLink" description="Inline link to the source repository on GitHub">source code</Translate></a>}}>
    {'From 9 October to 7 November 2026, SpecWithCode was planned in 302 specs and got 1,393 merged pull requests, at least 418 of them from its own worker threads. Read the {link}.'}
  </Translate>, to: SPECS_URL, link: translate({id: 'code.more.builtWithItself.link', message: 'See the specs', description: 'Card link to the public folder of SpecWeave increments (specs) on GitHub'})},
];

/** Shown on the page and, as plain text, in the FAQPage structured data. */
const getFaq = (): {q: string; a: string}[] => [
  {q: translate({id: 'code.faq.free.q', message: 'Is SpecWithCode really free?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.free.a', message: 'Yes. SpecWithCode is free and open source under the MIT license, on Mac, Windows and Linux. It never resells tokens or adds a markup: you sign in with your own accounts. Codex works on a free ChatGPT account within that plan\'s usage limits. DeepSeek uses your own DeepSeek API key, and DeepSeek bills that usage directly.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.limit.q', message: 'What happens when Claude Code hits its usage limit?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.limit.a', message: 'The chat continues on the next agent you set up, such as Codex on a free ChatGPT account or DeepSeek, in the same thread and with its history. In our tests on 4 November 2026, with the Claude limit triggered by a test switch, Codex (SpecWithCode 1.0.191) and DeepSeek each still knew a code word given to Claude before the switch. For each project you choose whether SpecWithCode switches automatically, offers the switch, or waits for the limit to reset.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.paid.q', message: 'Do I need a paid Claude or ChatGPT plan?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.paid.a', message: 'No. You can start with Codex on a free ChatGPT account and add DeepSeek as the fallback. If you already pay for Claude Code or ChatGPT, sign in to those too and keep DeepSeek as the fallback.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.local.q', message: 'Does everything stay on my machine?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.local.a', message: 'No. Agent processes and project files live on your machine, but cloud models receive prompts and relevant context, which can include code and file contents, through the provider you chose.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.accounts.q', message: 'Should one machine switch between accounts of the same provider?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.accounts.a', message: 'No. Keep each machine signed in to one account per provider. For more capacity, add a machine with its own accounts instead of switching accounts by hand, and follow each provider\'s terms.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.brand.q', message: 'Is Spec with Code the same as SpecWithCode?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.brand.a', message: 'Yes. SpecWithCode is written as one word and pronounced Spec with Code. It is a free interface for the coding agents you already use. SpecWeave is the separate CLI that keeps specifications, task evidence and handoffs in git.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.harness.q', message: 'Is SpecWithCode a coding-agent harness?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.harness.a', message: 'No. A harness is the agent loop, tools, permissions and sign-in a vendor builds around its model, and Claude Code, Codex and GitHub Copilot CLI are harnesses. SpecWithCode is an interface to those native harnesses: each one keeps running its own agent, and the app adds projects, worker threads, usage limits, machines and context handoffs on top.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
];

/** pageUrl includes the locale base (/ru/code/), matching the page's canonical. */
const buildLd = (release: SpecWithCodeMacRelease, pageUrl: string, TITLE: string, DESCRIPTION: string, FAQ: {q: string; a: string}[]) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {'@type': 'MobileApplication', name: 'SpecWithCode for Android', operatingSystem: 'Android', applicationCategory: 'DeveloperApplication', installUrl: SPECWITHCODE_MOBILE.android.url, url: SPECWITHCODE_MOBILE.android.url},
    {'@type': 'MobileApplication', name: 'SpecWithCode for iPhone', operatingSystem: 'iOS', applicationCategory: 'DeveloperApplication', installUrl: APP_STORE_URL, url: APP_STORE_URL, description: 'Mobile companion to SpecWithCode on your computers.'},
    {
      '@type': 'WebPage',
      '@id': pageUrl,
      url: pageUrl,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: {'@id': `${SITE}/#website`},
      mainEntity: {'@id': `${pageUrl}#app`},
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${pageUrl}#app`,
      name: 'SpecWithCode',
      alternateName: 'Spec with Code',
      description: DESCRIPTION,
      url: pageUrl,
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
      '@id': `${pageUrl}#faq`,
      mainEntity: FAQ.map(({q, a}) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}})),
    },
  ],
});

export default function Code() {
  const icon28 = useBaseUrl('/img/studio/specwithcode-icon.png');
  const providerBase = useBaseUrl('/img/studio/providers/');
  const logo = (file: string) => `${providerBase}${file}.svg?v=2`;
  const marks = {claude: logo('claude'), openai: logo('openai'), deepseek: logo('deepseek'), copilot: logo('copilot'), gemini: logo('gemini'), cursor: logo('cursor'), opencode: logo('opencode')};
  // Other pages link to /code/#harnesses and #built-with-itself; section ids on a custom page must be declared to the link checker.
  const MORE = getMore();
  const brokenLinks = useBrokenLinks();
  for (const id of [...MORE.map(m => m.id), 'harnesses', 'coordinator', 'machines', 'one-window', 'aide', 'designs']) brokenLinks.collectAnchor(id);
  brokenLinks.collectAnchor('start');
  brokenLinks.collectAnchor('skills');
  brokenLinks.collectAnchor('questions');
  brokenLinks.collectAnchor('subscriptions');
  const TITLE = pageTitle();
  const DESCRIPTION = pageDescription();
  const FAQ = getFaq();
  const {release, desktop} = useSpecWithCodeRelease();
  const SPECWITHCODE_LD = buildLd(release, `${SITE}${useBaseUrl('/code/')}`, TITLE, DESCRIPTION, FAQ);

  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={translate({id: 'code.meta.ogImageAlt', message: 'SpecWithCode: one interface for your coding agents on macOS, Windows and Linux. Free and open source (MIT).', description: 'Alt text of the social preview image. Keep product names in English'})} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content={translate({id: 'code.meta.twitterImageAlt', message: 'SpecWithCode: one interface for your coding agents. macOS, Windows and Linux.', description: 'Alt text of the X/Twitter preview image. Keep product names in English'})} />
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
              <span className={styles.badge}><Translate id="code.hero.badge" description="Badge next to the product name in the hero">Free · open source (MIT)</Translate></span>
            </p>
            <h1><span className={styles.h1Top}><img className={styles.h1Mark} src={marks.claude} alt="" width="48" height="48" /><img className={clsx(styles.h1Mark, styles.h1MarkDark)} src={marks.openai} alt="" width="48" height="48" /><Translate id="code.hero.title.top" description="First line of the hero headline. Keep product names in English">Claude Code, Codex and more.</Translate></span> <em><Translate id="code.hero.title.emphasis" description="Second, emphasized part of the hero headline">Never stuck on a limit.</Translate></em></h1>
            <p className={styles.lead}><Translate id="code.hero.lead" description="Hero lead paragraph. Keep product names in English">One chat for all your coding agents, on every machine and every plan. Start with Codex on a free ChatGPT account. When Claude Code nears its limit, Codex picks up the same thread with its history.</Translate></p>
            <ul className={styles.heroMarks} aria-label={translate({id: 'code.hero.marks.label', message: 'Also runs', description: 'Accessible label of the row of other supported agents under the hero lead'})}>
              <li><img className={styles.darkPlate} src={marks.copilot} alt="" width="18" height="18" />Copilot</li>
              <li><img src={marks.gemini} alt="" width="18" height="18" />Gemini CLI</li>
              <li><img className={styles.darkPlate} src={marks.cursor} alt="" width="18" height="18" />Cursor</li>
              <li><img src={marks.deepseek} alt="" width="18" height="18" />DeepSeek</li>
              <li><Link className="wv-link" to="/docs/studio/harnesses/"><Translate id="code.more.agents.andMore" description="Last item of the agent list, links to all harnesses">and more</Translate></Link></li>
            </ul>
            <HeroDownload />
          </div>
          <div className={styles.heroMedia}>
            <FlowStage />
          </div>
        </div>
      </header>

      {/* ---------- The free start, with its sources ---------- */}
      <section className={clsx(styles.shell, styles.freeBand)} aria-labelledby="vs-title">
        <h2 id="vs-title"><Translate id="code.stats.title.main" description="First part of the stats section heading. Keep product names in English">The Codex millions use.</Translate> <em><Translate id="code.stats.title.emphasis" description="Second, emphasized part of the stats section heading">Free on your account.</Translate></em></h2>
        <ul className={styles.figures}>
          <li><strong><img className={styles.darkPlate} src={marks.openai} alt="" width="26" height="26" /><CountUp value={5} suffix="M+" /></strong><span><Translate id="code.stats.weeklyUsers.label" description="Stat label after 5M+. Keep product names in English">people use Codex every week</Translate></span><a href="https://www.constellationr.com/insights/news/openai-touts-broadening-codex-usage-5-million-weekly-active-users" rel="noopener"><Translate id="code.stats.weeklyUsers.source" description="Source link for the weekly users stat. Keep product names in English">OpenAI, June 2026</Translate></a></li>
          <li><strong>$0</strong><span><Translate id="code.stats.free.label" description="Stat label after $0. Keep product names in English">Codex on a free ChatGPT account</Translate></span><a href="https://openai.com/index/introducing-the-codex-app/" rel="noopener"><Translate id="code.stats.free.source" description="Source link for the free Codex stat. Keep product names in English">OpenAI, for a limited time</Translate></a></li>
          <li><strong><CountUp value={99} suffix="%" /></strong><span><Translate id="code.stats.threshold.label" description="Stat label after 99%. Keep product names in English">where SpecWithCode hands off by default, before the limit stops you</Translate></span><small><Translate id="code.stats.threshold.note" description="Small note under the 99% stat">You can set it from 50% to 100%</Translate></small></li>
        </ul>
      </section>

      {/* ---------- What is in the app: seven rows, each with its drawing ---------- */}
      <Benefits />

      {/* ---------- Three steps ---------- */}
      <section id="start" className={clsx(styles.shell, styles.section)} aria-labelledby="start-title">
        <div className={styles.sectionHead}>
          <h2 id="start-title"><Translate id="code.start.title" description="Heading of the setup steps section">Set it up in three steps</Translate></h2>
          <p><Translate id="code.start.intro" description="Intro of the setup steps section">About two minutes, and nothing to pay to try it.</Translate></p>
        </div>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">1</span>
            <h3><Translate id="code.start.step1.title" description="Setup step 1 title. Keep product names in English">Install SpecWithCode</Translate></h3>
            <p><Translate id="code.start.step1.body" description="Setup step 1 text. Keep product names in English">Download it for your Mac, Windows PC or Linux machine and open it. No SpecWithCode account needed.</Translate></p>
            <a className={clsx('wv-link', styles.stepLink)} href="#download"><Translate id="code.start.step1.link" description="Link to the download section">Downloads</Translate><ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></a>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">2</span>
            <h3><img className={styles.darkPlate} src={marks.openai} alt="" width="22" height="22" /><Translate id="code.start.step2.title" description="Setup step 2 title. Keep product names in English">Sign in to Codex with a free ChatGPT account</Translate></h3>
            <p><Translate id="code.start.step2.body" description="Setup step 2 text; Settings › Providers is a menu path in the app. Keep product names in English">In Settings › Providers, choose Codex and sign in. No card on file. The free plan’s usage limits apply.</Translate></p>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">3</span>
            <h3><img src={marks.deepseek} alt="" width="22" height="22" /><Translate id="code.start.step3.title" description="Setup step 3 title. Keep product names in English">Add DeepSeek as your fallback</Translate></h3>
            <p><Translate id="code.start.step3.body" description="Setup step 3 text; Settings › Providers is a menu path in the app. Keep product names in English">Add DeepSeek Harness in Settings › Providers with your own DeepSeek API key. When Codex or Claude Code hits a limit, the chat moves to DeepSeek with its context.</Translate></p>
            <p className={styles.stepFine}><Translate id="code.start.step3.fine" description="Fine print under setup step 3. Keep product names in English">DeepSeek bills its API usage to you directly. SpecWithCode adds nothing on top.</Translate></p>
          </li>
        </ol>
        <div className={clsx('wv-note', styles.note)}>
          <Info size={20} strokeWidth={1.5} aria-hidden="true" />
          <p><Translate id="code.start.note" description="Note under the setup steps; {question} is the bold lead-in question. Keep product names in English" values={{question: <strong><Translate id="code.start.note.question" description="Bold question opening the note under the setup steps. Keep product names in English">Already pay for Claude Code or ChatGPT?</Translate></strong>}}>{'{question} Sign in to those too and keep using them. When one hits its limit, the chat can move to DeepSeek. Cloud models still receive prompts and relevant context through your chosen provider.'}</Translate></p>
        </div>
      </section>

      {/* ---------- Download ---------- */}
      <section id="download" className={clsx(styles.shell, styles.section)} aria-labelledby="download-title">
        <div className={styles.downloadPanel}>
          <h2 id="download-title"><Translate id="code.downloads.title" description="Heading of the download section. Keep product names in English">Get SpecWithCode</Translate></h2>
          <p>{release.version === desktop.version ? <Translate id="code.downloads.version.same" description="Release line when all builds share one version; {version} is the version number. Keep product names in English" values={{version: release.version}}>{'Version {version} for Mac, Windows and Linux.'}</Translate> : <Translate id="code.downloads.version.split" description="Release line when the Mac build has a different version; {macVersion} and {desktopVersion} are version numbers. Keep product names in English" values={{macVersion: release.version, desktopVersion: desktop.version}}>{'Mac {macVersion}, Windows and Linux {desktopVersion}.'}</Translate>} <Translate id="code.downloads.signing" description="Signing status of the installers. Keep product names in English">The Mac app is signed and notarized; the Windows and Linux installers are not code-signed yet.</Translate></p>
          <Downloads placement="download" />
          <MobileStores placement="download" align="center" />
        </div>
      </section>

      {/* ---------- Built with itself, and the other agents ---------- */}
      <section className={clsx(styles.shell, styles.section)} aria-label={MORE[0].title}>
        {MORE.map(({id, icon: Icon, title, body, to, link}) => <div key={id} id={id} className={styles.builtBand}>
          <span className={styles.builtIcon}><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>
          <div>
            <h2>{title}</h2>
            <p>{body}</p>
          </div>
          {to.startsWith('http')
            ? <a className="wv-btn wv-btn--secondary" href={to}>{link}<ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" /></a>
            : <Link className="wv-btn wv-btn--secondary" to={to}>{link}<ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></Link>}
        </div>)}
        <ul className={styles.alsoMarks} aria-label={translate({id: 'code.more.agents.ariaLabel', message: 'Other supported coding agents', description: 'Accessible label of the list of other coding agents'})}>
          <li><img className={styles.darkPlate} src={marks.copilot} alt="" width="20" height="20" />GitHub Copilot</li>
          <li><img src={marks.gemini} alt="" width="20" height="20" />Gemini CLI</li>
          <li><img className={styles.darkPlate} src={marks.cursor} alt="" width="20" height="20" />Cursor</li>
          <li><img className={styles.lightPlate} src={marks.opencode} alt="" width="20" height="20" />OpenCode</li>
          <li><Link className="wv-link" to="/docs/studio/harnesses/"><Translate id="code.more.agents.andMore" description="Last item of the agent list, links to all harnesses">and more</Translate></Link></li>
        </ul>
      </section>

      {/* ---------- Questions ---------- */}
      <section id="questions" className={clsx(styles.shell, styles.section)} aria-labelledby="questions-title">
        <h2 id="questions-title"><Translate id="code.faq.title" description="Heading of the FAQ section">Questions</Translate></h2>
        <div className={styles.faq}>
          {FAQ.map(item => <details key={item.q}>
            <summary><span>{item.q}</span><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className={clsx(styles.shell, styles.final)} aria-labelledby="final-title">
        <h2 id="final-title"><Translate id="code.final.title" description="Heading of the closing call to action. Keep product names in English">Codex for free. Never stuck on a limit.</Translate></h2>
        <p><Translate id="code.final.body" description="Closing paragraph; {link} links to the spec-as-code comparison. Keep product names in English" values={{link: <Link className="wv-link" to="/docs/compare/spec-as-code/"><Translate id="code.final.body.link" description="Link text that ends the closing paragraph, as in keep the spec with the code">the spec with the code</Translate></Link>}}>{'Free and open source (MIT). Your accounts, your machines. Add the optional SpecWeave CLI to keep {link}.'}</Translate></p>
        <div className={styles.finalActions}>
          <a className="wv-btn wv-btn--primary wv-btn--lg" href="#download"><Translate id="code.final.download" description="Closing call-to-action button. Keep product names in English">Download SpecWithCode</Translate></a>
          <a className="wv-btn wv-btn--secondary wv-btn--lg" href={release.repoUrl} data-track="github_star_click"><Star size={16} strokeWidth={1.5} aria-hidden="true" /><Translate id="code.final.source" description="Closing link to the source repository, asking visitors to star it. Keep product names in English">Star on GitHub</Translate><img src="https://img.shields.io/github/stars/anton-abyzov/specwithcode?style=flat&label=SpecWithCode" alt="SpecWithCode GitHub stars" width="130" height="20" loading="lazy" /></a>
        </div>
      </section>
    </main>
  </Layout>;
}
