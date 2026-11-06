import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import Translate, {translate} from '@docusaurus/Translate';
import {ArrowRight, ArrowUpRight, ChevronDown, Gauge, GitMerge, Info, Layers, Network, Users} from 'lucide-react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop, SPECWITHCODE_OPERATING_SYSTEMS} from '../data/specwithcodeRelease';
import {useSpecWithCodeInstaller} from '../data/specwithcodeInstaller';
import FlowStage from '../components/code/FlowStage';
import MobileStores from '../components/code/MobileStores';
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

type Os = 'mac' | 'windows' | 'linux';
const getDownloads = (): {os: Os; label: string; note: string; url: string}[] => [
  {os: 'mac', label: 'Mac', note: translate({id: 'code.downloads.mac.note', message: 'Apple silicon, macOS 13+', description: 'Requirements note under the Mac download button. Keep product names in English'}), url: release.dmgUrl},
  {os: 'windows', label: 'Windows', note: translate({id: 'code.downloads.windows.note', message: 'Windows 10 and 11, x64', description: 'Requirements note under the Windows download button. Keep product names in English'}), url: desktop.exe.url},
  {os: 'linux', label: 'Linux', note: translate({id: 'code.downloads.linux.note', message: 'AppImage, x64', description: 'Package note under the Linux download button. Keep product names in English'}), url: desktop.appImage.url},
];

const getUnsupported = () => ({
  'intel-mac': translate({id: 'code.downloads.unsupported.intelMac', message: 'This Mac has an Intel chip. SpecWithCode for Mac needs Apple silicon; use a Windows or Linux machine instead.', description: 'Shown when the visitor uses an Intel Mac. Keep product names in English'}),
  mobile: translate({id: 'code.downloads.unsupported.mobile', message: 'SpecWithCode runs on a Mac, Windows PC or Linux machine. The mobile apps below connect to your computer.', description: 'Shown when the visitor is on a phone or tablet. Keep product names in English'}),
} as const);

const OS_ICON: Record<Os, React.ReactNode> = {
  mac: <svg viewBox="0 0 814 1000" aria-hidden="true"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>,
  windows: <svg viewBox="0 0 88 88" aria-hidden="true"><path fill="currentColor" d="m0 12.402 35.687-4.86.016 34.423-35.67.203zm35.67 33.529.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z" /></svg>,
  linux: <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c-2.3 0-3.3 2-3.2 4.3.1 1.3-.2 2.2-1 3.3-1 1.3-2.5 3.3-2.6 5.4-.1 1 .2 1.7.6 2.2-.6.4-1.6.6-1.8 1.4-.2.9.6 1.6.4 2.4-.1.5.3 1 .9 1 1 .1 2-.1 2.9.4.9.4 1.9.4 2.6-.2.5.1 1.5.1 2.4 0 .7.6 1.7.7 2.6.2.9-.5 1.9-.3 2.9-.4.6 0 1-.5.9-1-.2-.8.6-1.5.4-2.4-.2-.8-1.2-1-1.8-1.4.4-.5.7-1.2.6-2.2-.1-2.1-1.6-4.1-2.6-5.4-.8-1.1-1.1-2-1-3.3C15.3 4 14.3 2 12 2zm-1.3 3.6c.4 0 .7.5.7 1.1 0 .6-.3 1.1-.7 1.1-.4 0-.7-.5-.7-1.1 0-.6.3-1.1.7-1.1zm2.6 0c.4 0 .7.5.7 1.1 0 .6-.3 1.1-.7 1.1-.4 0-.7-.5-.7-1.1 0-.6.3-1.1.7-1.1zM12 8.4c.9 0 2 .6 2 1 0 .4-1.1 1.1-2 1.1s-2-.7-2-1.1c0-.4 1.1-1 2-1z" /></svg>,
};

/** Download buttons for Mac, Windows and Linux. The visitor's own system leads once the browser says which it is. */
function Downloads({placement}: {placement: string}) {
  const {installer, detected, unsupported} = useSpecWithCodeInstaller();
  const DOWNLOADS = getDownloads();
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
    <p className={styles.downloadsMore}><Translate id="code.downloads.more" description="Line under the download buttons; {link} links to the download page" values={{link: <Link className="wv-link" to="/code/download/"><Translate id="code.downloads.more.link" description="Link to the download page with Arm builds, .deb packages and install steps">Arm builds, .deb and install steps</Translate></Link>}}>{'Free, source available. {link}'}</Translate></p>
  </div>;
}

/** One big button for the visitor's own system, with the other systems one click away. */
function HeroDownload() {
  const {installer, detected, unsupported} = useSpecWithCodeInstaller();
  const DOWNLOADS = getDownloads();
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

const getSubs = (): {icon: typeof Layers; title: string; body: React.ReactNode}[] => [
  {icon: Users, title: translate({id: 'code.subs.parallel.title', message: 'Every plan working at once', description: 'Card title in the paid plans section'}), body: <>{translate({id: 'code.subs.parallel.body', message: 'A coordinator splits one goal into threads and runs them on Claude Code, Codex and others in parallel, each on its own plan.', description: 'Card text in the paid plans section. Keep product names in English'})}</>},
  {icon: Network, title: translate({id: 'code.subs.machines.title', message: 'Every machine you own', description: 'Card title in the paid plans section'}), body: <>{translate({id: 'code.subs.machines.body', message: 'Each Mac, Windows PC or Linux server adds the limits of the plans signed in on it. One account per provider on each machine.', description: 'Card text in the paid plans section. Keep product names in English'})}</>},
  {icon: Gauge, title: translate({id: 'code.subs.handoff.title', message: 'Hand off at 98%, or where you choose', description: 'Card title in the paid plans section; 98% is the default handoff point'}), body: <>{translate({id: 'code.subs.handoff.body', message: 'Set the point from 50% to 100% per project. Work moves to a plan with room before the provider refuses it.', description: 'Card text in the paid plans section'})}</>},
  {icon: GitMerge, title: translate({id: 'code.subs.usage.title', message: 'Usage for every account', description: 'Card title in the paid plans section'}), body: <>{translate({id: 'code.subs.usage.body', message: 'Usage › Limits shows each account, the machine it is signed in on, and what is left in every session and weekly window.', description: 'Card text in the paid plans section; "Usage › Limits" is a menu path in the app, translate it as the app labels it'})}</>},
];

const getMore = (): {id: string; icon: typeof Layers; title: string; body: React.ReactNode; to: string; link: string}[] => [
  {id: 'harnesses', icon: Layers, title: translate({id: 'code.more.harnesses.title', message: 'Each agent in its own harness', description: 'Card title in the "more" section'}), body: <>{translate({id: 'code.more.harnesses.body', message: 'Claude Code, Codex, GitHub Copilot, Cursor, OpenCode and more run the way their vendors ship them, on your own sign-ins.', description: 'Card text in the "more" section. Keep product names in English'})}</>, to: '/docs/studio/harnesses/', link: translate({id: 'code.more.harnesses.link', message: 'Harnesses and models', description: 'Card link to the harnesses docs'})},
  {id: 'coordinator', icon: Users, title: translate({id: 'code.more.coordinator.title', message: 'A coordinator for bigger jobs', description: 'Card title in the "more" section'}), body: <>{translate({id: 'code.more.coordinator.body', message: 'Give one goal. A coordinator splits it into worker threads on different agents, and you review the result.', description: 'Card text in the "more" section'})}</>, to: '/docs/overview/studio', link: translate({id: 'code.more.coordinator.link', message: 'How projects work', description: 'Card link to the projects docs'})},
  {id: 'machines', icon: Network, title: translate({id: 'code.more.machines.title', message: 'All your machines', description: 'Card title in the "more" section'}), body: <>{translate({id: 'code.more.machines.body', message: 'Add a spare laptop, a Windows PC or a small Linux server as a worker, each signed in to its own accounts.', description: 'Card text in the "more" section. Keep product names in English'})}</>, to: '/tutorials/add-a-machine/', link: translate({id: 'code.more.machines.link', message: 'Add a machine', description: 'Card link to the add-a-machine tutorial'})},
  {id: 'built-with-itself', icon: GitMerge, title: translate({id: 'code.more.builtWithItself.title', message: 'Built with itself', description: 'Card title in the "more" section'}), body: <>{translate({id: 'code.more.builtWithItself.body', message: '367 pull requests to SpecWithCode were opened by its own worker threads and merged in the second half of October 2026.', description: 'Card text in the "more" section. Keep product names in English'})}</>, to: release.repoUrl, link: translate({id: 'code.more.builtWithItself.link', message: 'View the source', description: 'Card link to the source repository on GitHub'})},
];

/** Shown on the page and, as plain text, in the FAQPage structured data. */
const getFaq = (): {q: string; a: string}[] => [
  {q: translate({id: 'code.faq.free.q', message: 'Is SpecWithCode really free?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.free.a', message: 'Yes. SpecWithCode is free, with source available, on Mac, Windows and Linux. It never resells tokens or adds a markup: you sign in with your own accounts. Codex works on a free ChatGPT account within that plan\'s usage limits. DeepSeek uses your own DeepSeek API key, and DeepSeek bills that usage directly.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.limit.q', message: 'What happens when Claude Code hits its usage limit?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.limit.a', message: 'The chat continues on the next agent you set up, such as Codex on a free ChatGPT account or DeepSeek, in the same thread and with its history. In our tests on 4 November 2026, with the Claude limit triggered by a test switch, Codex (SpecWithCode 1.0.191) and DeepSeek each still knew a code word given to Claude before the switch. For each project you choose whether SpecWithCode switches automatically, offers the switch, or waits for the limit to reset.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.paid.q', message: 'Do I need a paid Claude or ChatGPT plan?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.paid.a', message: 'No. You can start with Codex on a free ChatGPT account and add DeepSeek as the fallback. If you already pay for Claude Code or ChatGPT, sign in to those too and keep DeepSeek as the fallback.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.local.q', message: 'Does everything stay on my machine?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.local.a', message: 'No. Agent processes and project files live on your machine, but cloud models receive prompts and relevant context, which can include code and file contents, through the provider you chose.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.accounts.q', message: 'Should one machine switch between accounts of the same provider?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.accounts.a', message: 'No. Keep each machine signed in to one account per provider. For more capacity, add a machine with its own accounts instead of switching accounts by hand, and follow each provider\'s terms.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.brand.q', message: 'Is Spec with Code the same as SpecWithCode?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.brand.a', message: 'Yes. SpecWithCode is written as one word and pronounced Spec with Code. It is a free interface for the coding agents you already use. SpecWeave is the separate CLI that keeps specifications, task evidence and handoffs in git.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
  {q: translate({id: 'code.faq.harness.q', message: 'Is SpecWithCode a coding-agent harness?', description: 'FAQ question. Keep product names in English'}), a: translate({id: 'code.faq.harness.a', message: 'No. A harness is the agent loop, tools, permissions and sign-in a vendor builds around its model, and Claude Code, Codex and GitHub Copilot CLI are harnesses. SpecWithCode is an interface to those native harnesses: each one keeps running its own agent, and the app adds projects, worker threads, usage limits, machines and context handoffs on top.', description: 'FAQ answer, also used in the FAQPage structured data. Keep product names in English'})},
];

/** pageUrl includes the locale base (/ru/code/), matching the page's canonical. */
const buildLd = (pageUrl: string, TITLE: string, DESCRIPTION: string, FAQ: {q: string; a: string}[]) => ({
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
  for (const {id} of MORE) brokenLinks.collectAnchor(id);
  brokenLinks.collectAnchor('start');
  brokenLinks.collectAnchor('questions');
  brokenLinks.collectAnchor('subscriptions');
  const TITLE = pageTitle();
  const DESCRIPTION = pageDescription();
  const SUBS = getSubs();
  const FAQ = getFaq();
  const SPECWITHCODE_LD = buildLd(`${SITE}${useBaseUrl('/code/')}`, TITLE, DESCRIPTION, FAQ);

  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={translate({id: 'code.meta.ogImageAlt', message: 'SpecWithCode: one interface for your coding agents on macOS, Windows and Linux. Free, source available.', description: 'Alt text of the social preview image. Keep product names in English'})} />
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
              <span className={styles.badge}><Translate id="code.hero.badge" description="Badge next to the product name in the hero">Free · source available</Translate></span>
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

      {/* ---------- Sourced numbers ---------- */}
      <section className={clsx(styles.shell, styles.vsSection)} aria-labelledby="vs-title">
        <h2 id="vs-title"><Translate id="code.stats.title.main" description="First part of the stats section heading. Keep product names in English">The Codex millions use.</Translate> <em><Translate id="code.stats.title.emphasis" description="Second, emphasized part of the stats section heading">Free on your account.</Translate></em></h2>
        <ul className={styles.stats}>
          <li><strong>5M+</strong><span><Translate id="code.stats.weeklyUsers.label" description="Stat label after 5M+. Keep product names in English">people use Codex every week</Translate></span><a href="https://www.constellationr.com/insights/news/openai-touts-broadening-codex-usage-5-million-weekly-active-users" rel="noopener"><Translate id="code.stats.weeklyUsers.source" description="Source link for the weekly users stat. Keep product names in English">OpenAI, June 2026</Translate></a></li>
          <li><strong>$0</strong><span><Translate id="code.stats.free.label" description="Stat label after $0. Keep product names in English">Codex on a free ChatGPT account</Translate></span><a href="https://openai.com/index/introducing-the-codex-app/" rel="noopener"><Translate id="code.stats.free.source" description="Source link for the free Codex stat. Keep product names in English">OpenAI, for a limited time</Translate></a></li>
          <li><strong>98%</strong><span><Translate id="code.stats.threshold.label" description="Stat label after 98%. Keep product names in English">where SpecWithCode hands off by default, before the limit stops you</Translate></span><small><Translate id="code.stats.threshold.note" description="Small note under the 98% stat">You can set it from 50% to 100%</Translate></small></li>
        </ul>
      </section>

      {/* ---------- For people on paid plans ---------- */}
      <section id="subscriptions" className={clsx(styles.shell, styles.section)} aria-labelledby="subs-title">
        <div className={styles.sectionHead}>
          <h2 id="subs-title"><Translate id="code.subs.title" description="Heading of the paid plans section">Paying $200 a month? Use all of it.</Translate></h2>
          <p><Translate id="code.subs.intro" description="Intro of the paid plans section. Keep product names in English">SpecWithCode runs each agent on the plan you already pay for, across every machine you sign in, and keeps going when one plan runs low.</Translate></p>
        </div>
        <ul className={styles.more}>
          {SUBS.map(({icon: Icon, title, body}) => <li key={title} className={styles.moreCard}>
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </li>)}
        </ul>
        <ul className={styles.alsoMarks} aria-label={translate({id: 'code.subs.plans.ariaLabel', message: 'Plans shown here', description: 'Accessible label of the list of paid plans'})}>
          <li><img src={marks.claude} alt="" width="20" height="20" /><Translate id="code.subs.plans.claude" description="Paid plan names. Keep product names in English">Claude Max and Pro</Translate></li>
          <li><img className={styles.darkPlate} src={marks.openai} alt="" width="20" height="20" /><Translate id="code.subs.plans.chatgpt" description="Paid plan names. Keep product names in English">ChatGPT Pro and Plus</Translate></li>
          <li><img className={styles.darkPlate} src={marks.copilot} alt="" width="20" height="20" />GitHub Copilot</li>
        </ul>
      </section>

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

      {/* ---------- Everything else, briefly ---------- */}
      <section className={clsx(styles.shell, styles.section)} aria-labelledby="more-title">
        <div className={styles.sectionHead}>
          <h2 id="more-title"><Translate id="code.more.title" description="Heading of the more section">There’s more when you need it</Translate></h2>
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
        <p><Translate id="code.final.body" description="Closing paragraph; {link} links to the spec-as-code comparison. Keep product names in English" values={{link: <Link className="wv-link" to="/docs/compare/spec-as-code/"><Translate id="code.final.body.link" description="Link text that ends the closing paragraph, as in keep the spec with the code">the spec with the code</Translate></Link>}}>{'Free and source available. Your accounts, your machines. Add the optional SpecWeave CLI to keep {link}.'}</Translate></p>
        <div className={styles.finalActions}>
          <a className="wv-btn wv-btn--primary wv-btn--lg" href="#download"><Translate id="code.final.download" description="Closing call-to-action button. Keep product names in English">Download SpecWithCode</Translate></a>
          <a className="wv-btn wv-btn--secondary wv-btn--lg" href={release.repoUrl}><Translate id="code.final.source" description="Closing link to the source repository. Keep product names in English">View source on GitHub</Translate><ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" /></a>
        </div>
      </section>
    </main>
  </Layout>;
}
