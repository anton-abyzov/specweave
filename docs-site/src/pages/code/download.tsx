import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import {ChevronDown, Download, Info, ShieldCheck} from 'lucide-react';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop, SPECWITHCODE_OPERATING_SYSTEMS} from '../../data/specwithcodeRelease';
import {providerSummary} from '../../data/tools';
import {ALL_DOWNLOADS_ANCHOR, MAC_INSTALLER, useSpecWithCodeInstaller} from '../../data/specwithcodeInstaller';
import styles from '../code.module.css';

/*
  The page people land on when they search "specwithcode download" or "SpecWithCode for Mac".
  Install facts come from the app's docs/user/install.md (anton-abyzov/specwithcode-dev, main,
  19 October 2026) and the v1.0.132 release assets (30 October 2026).
*/

const icon = {size: 20, strokeWidth: 1.5, 'aria-hidden': true} as const;
const btnIcon = {size: 16, strokeWidth: 1.5, 'aria-hidden': true} as const;

const SITE = 'https://spec-weave.com';
const PAGE_URL = `${SITE}/code/download/`;
const TITLE = 'Download SpecWithCode for Mac, Windows and Linux (free)';
const DESCRIPTION = 'Download SpecWithCode (Spec with Code), the free AI coding agent workspace, for Apple silicon Macs, Windows 10 and 11, and Linux.';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`;
const SHA_URL = `${release.repoUrl}/releases/download/v${release.version}/SHA256SUMS`;
const CHROME_URL = 'https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb';

const STEPS: {title: string; body: React.ReactNode}[] = [
  {title: 'Download the .dmg', body: <>Click Download for Mac. You get <code>SpecWithCode-arm64.dmg</code>, the newest release, straight from GitHub.</>},
  {title: 'Drag SpecWithCode to Applications', body: <>Open the .dmg and drag the app into Applications. It is signed with an Apple Developer ID and notarized, so it opens without a security override.</>},
  {title: 'Open it and add a provider', body: <>The app starts its local service for you. Sign in to a coding agent you already use, such as Claude Code or Codex, and start your first thread.</>},
];

const DESKTOP_NOTES: {name: string; detail: React.ReactNode}[] = [
  {name: 'Which file', detail: <>Most Windows PCs and Linux machines are x64. Pick arm64 for an Arm device such as a Snapdragon Windows laptop or an Arm Linux machine; on Linux, <code>uname -m</code> prints <code>aarch64</code> there and <code>x86_64</code> on x64.</>},
  {name: 'Windows', detail: <>Run <code>{desktop.exe.name}</code>, or <code>{desktop.exeArm64.name}</code> on Arm. It installs for your user only, with no administrator prompt. The installer is not code-signed yet, so SmartScreen shows <strong>Windows protected your PC</strong> the first time: choose <strong>More info</strong>, then <strong>Run anyway</strong>.</>},
  {name: 'Debian and Ubuntu', detail: <><code>sudo apt install ./{desktop.deb.name}</code> (x64) or <code>sudo apt install ./{desktop.debArm64.name}</code> (arm64) installs the app with a menu entry.</>},
  {name: 'Other Linux', detail: <>Make the AppImage for your architecture executable with <code>chmod +x</code> and run it. The app needs a glibc-based distribution.</>},
  {name: 'Linux servers', detail: <>A machine without a desktop runs the server from the release's <code>studio-{desktop.version}-linux-x64</code> or <code>linux-arm64</code> archive as a worker. See <Link className="wv-link" to="/docs/studio/linux-worker">Linux worker</Link>.</>},
  {name: 'What differs', detail: <>Computer use controls a Mac screen and is macOS only. The app updates itself from new releases on Windows and Linux too; the .deb update asks for your password.</>},
];

const NEXT: {name: string; detail: React.ReactNode}[] = [
  {name: 'Run your first task', detail: <>Short <Link className="wv-link" to="/tutorials/">video tutorials</Link> walk through projects, threads and machines; per-agent first-task videos are being re-recorded.</>},
  {name: 'Never wait on a usage limit', detail: <>When one provider runs out, the same thread continues on another with its context. See <Link className="wv-link" to="/tutorials/provider-runs-out/">Keep working when a provider runs out</Link>.</>},
  {name: 'Let agents use your Chrome', detail: <>Add the free SpecWithCode extension from the <a className="wv-link" href={CHROME_URL}>Chrome Web Store</a> and pair it in Settings › Chrome. Agents then work in your own Chrome, in a tab group you can see.</>},
  {name: 'Add another machine', detail: <>Add a second Mac or a Linux worker over SpecWithCode Connect. See <Link className="wv-link" to="/tutorials/add-a-machine/">Add a second machine</Link>.</>},
];

const FAQ_TEXT: {q: string; a: string}[] = [
  {q: 'Is SpecWithCode free?', a: 'Yes. SpecWithCode is free, with no account. You bring your own provider subscriptions or API keys and pay any provider charges directly.'},
  {q: 'Which Macs does SpecWithCode run on?', a: 'Apple silicon Macs (M1 or later) with macOS 13 or later. Intel Macs are not supported.'},
  {q: 'Is there a Windows or Linux download?', a: `Yes. SpecWithCode ${desktop.version} has Windows installers for Windows 10 and 11 on x64 and arm64, and a Linux AppImage and .deb for x64 and arm64 on glibc-based distributions. The Windows installers are is not code-signed yet, so Windows asks you to confirm the first run. Computer use is macOS only.`},
  {q: 'Is the download safe?', a: 'Every release is built in GitHub Actions. The Mac app is signed with an Apple Developer ID and notarized by Apple. The Windows installer and the Linux AppImage and .deb are not code-signed yet; check them against the SHA256SUMS-windows-linux file published with each release. The Mac download has its own SHA256SUMS file.'},
  {q: 'How do I update SpecWithCode?', a: 'Download the newest .dmg from this page and replace the app in Applications. When a machine runs an older server than your app, SpecWithCode shows an update notice in the conversation and in Settings › Connections.'},
];

const DOWNLOAD_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': PAGE_URL,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: {'@id': `${SITE}/#website`},
      about: {'@id': `${SITE}/code/#app`},
      breadcrumb: {'@id': `${PAGE_URL}#breadcrumb`},
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        {'@type': 'ListItem', position: 1, name: 'SpecWithCode', item: `${SITE}/code/`},
        {'@type': 'ListItem', position: 2, name: 'Download', item: PAGE_URL},
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE}/code/#app`,
      name: 'SpecWithCode',
      alternateName: 'Spec with Code',
      url: `${SITE}/code/`,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: SPECWITHCODE_OPERATING_SYSTEMS,
      softwareVersion: release.version,
      fileSize: release.size,
      downloadUrl: release.dmgUrl,
      installUrl: PAGE_URL,
      releaseNotes: release.notesUrl,
      isAccessibleForFree: true,
      offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
    },
    {
      '@type': 'HowTo',
      '@id': `${PAGE_URL}#install`,
      name: 'Install SpecWithCode on a Mac',
      step: [
        {'@type': 'HowToStep', position: 1, name: 'Download the .dmg', text: 'Download SpecWithCode-arm64.dmg, the newest release, from spec-weave.com/code/download.', url: release.dmgUrl},
        {'@type': 'HowToStep', position: 2, name: 'Drag SpecWithCode to Applications', text: 'Open the .dmg and drag SpecWithCode into Applications. It is signed and notarized, so it opens without a security override.'},
        {'@type': 'HowToStep', position: 3, name: 'Open it and add a provider', text: 'Open SpecWithCode, sign in to a coding agent you already use, such as Claude Code or Codex, and start a thread.'},
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${PAGE_URL}#faq`,
      mainEntity: FAQ_TEXT.map(({q, a}) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}})),
    },
  ],
};

/*
  The hero leads with the installer for the visitor's computer. The server render
  (and a visitor without JavaScript) gets the Mac .dmg; after hydration Windows and
  Linux visitors get theirs, matched to x64 or arm64 where the browser reports it.
*/
function HeroDownload() {
  const {installer, detected, unsupported, archGuessed} = useSpecWithCodeInstaller();
  const isMac = installer.key === 'mac';
  return <>
    <div className={styles.actions}>
      <a className="wv-btn wv-btn--primary wv-btn--lg" href={installer.url} data-track="download_click" data-placement="download-page" data-os={installer.key}><Download {...btnIcon} />{installer.label} ({installer.size})</a>
      {installer.alt && <a className="wv-btn wv-btn--secondary wv-btn--lg" href={installer.alt.url} data-track="download_click" data-placement="download-page-alt" data-os={installer.key}><Download {...btnIcon} />{installer.alt.label} ({installer.alt.size})</a>}
      {!isMac && <a className="wv-btn wv-btn--secondary wv-btn--lg" href={MAC_INSTALLER.url} data-track="download_click" data-placement="download-page-mac" data-os="mac"><Download {...btnIcon} />Mac ({MAC_INSTALLER.size})</a>}
      {isMac && <a className="wv-btn wv-btn--secondary wv-btn--lg" href={ALL_DOWNLOADS_ANCHOR}>Windows and Linux</a>}
    </div>
    <p className={styles.requirements} data-testid="download-requirements">
      SpecWithCode {installer.version}, <code>{installer.file}</code>, {installer.size}. {isMac ? 'Apple silicon, macOS 13 or later.' : `${installer.platformName}.`}
      {detected && !unsupported && <> Picked for your computer{archGuessed ? '; on an Arm machine choose arm64 below' : ''}. <a className="wv-link" href={ALL_DOWNLOADS_ANCHOR}>Other platforms</a>.</>}
      {' '}<a className="wv-link" href={isMac ? release.notesUrl : desktop.notesUrl}>Release notes</a> · <a className="wv-link" href={isMac ? SHA_URL : desktop.sumsUrl}>SHA256SUMS</a>
    </p>
    {unsupported === 'intel-mac' && <div className={clsx('wv-note', styles.qualification)} role="note">
      <Info {...icon} />
      <p><strong>This looks like an Intel Mac.</strong> SpecWithCode for macOS needs Apple silicon (M1 or later); there is no Intel build. A Linux or Windows machine can run it instead, see <a className="wv-link" href={ALL_DOWNLOADS_ANCHOR}>Windows and Linux</a>.</p>
    </div>}
    {unsupported === 'mobile' && <div className={clsx('wv-note', styles.qualification)} role="note">
      <Info {...icon} />
      <p><strong>SpecWithCode is a desktop app.</strong> Open this page on your Mac, Windows or Linux computer to download it.</p>
    </div>}
    {isMac
      ? !unsupported && <div className={clsx('wv-note', styles.qualification)}>
        <ShieldCheck {...icon} />
        <p><strong>Signed with an Apple Developer ID and notarized by Apple.</strong> The download comes straight from the project's GitHub releases.</p>
      </div>
      : <div className={clsx('wv-note', styles.qualification)}>
        <Info {...icon} />
        <p><strong>Not code-signed yet.</strong> The download comes straight from the project's GitHub releases; compare it with SHA256SUMS. Install notes are under <a className="wv-link" href={ALL_DOWNLOADS_ANCHOR}>Windows and Linux</a>.</p>
      </div>}
  </>;
}

function FooterDownload() {
  const {installer} = useSpecWithCodeInstaller();
  return <>
    <a className="wv-btn wv-btn--primary wv-btn--lg" href={installer.url} data-track="download_click" data-placement="download-page-footer" data-os={installer.key}><Download {...btnIcon} />{installer.label}</a>
    <a className="wv-btn wv-btn--secondary" href={ALL_DOWNLOADS_ANCHOR}>{installer.key === 'mac' ? 'Windows and Linux downloads' : 'All platforms'}</a>
  </>;
}

export default function CodeDownload() {
  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="SpecWithCode: run Claude Code and Codex agents on your own computers. macOS, Windows and Linux. Free, source available." />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="SpecWithCode: agents on your own computers. macOS, Windows and Linux." />
      <script type="application/ld+json">{JSON.stringify(DOWNLOAD_LD)}</script>
    </Head>
    <main className={clsx('wv-root', styles.page)}>
      <header className={clsx(styles.shell, styles.hero)}>
        <div className={styles.heroCopy}>
          <p className={styles.product}>
            <img src="/img/studio/specwithcode-icon.png" alt="" width="28" height="28" />
            <span className={styles.productName}><Link to="/code/">SpecWithCode</Link></span>
            <span className={styles.productNote}>Free, source available</span>
          </p>
          <h1>Download SpecWithCode</h1>
          <p>SpecWithCode, pronounced “Spec with Code”, brings your AI coding agents into one workspace.</p>
          <p className={styles.lead}>One free app for {providerSummary(4)}, on your own machines and the subscriptions you already pay for.</p>
          <HeroDownload />
        </div>
        <div className={styles.heroShot}>
          <figure className="wv-window">
            <div className="wv-window__bar"><span>Worker thread</span><span>Codex, GPT-6.1-Sol</span></div>
            <img src="/img/studio/code-hero-worker-20261015.webp" width="920" height="1130" alt="SpecWithCode on a Mac: a Codex worker thread reporting the command it ran and the files it changed" />
            <figcaption>SpecWithCode on macOS. App capture, 15 October 2026. <Link className="wv-link" to="/code/">See everything it does</Link></figcaption>
          </figure>
        </div>
      </header>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="windows-linux-title">
        <div className={styles.sectionHead}>
          <h2 id="windows-linux-title">Windows and Linux</h2>
          <p>SpecWithCode {desktop.version} for Windows 10 and 11 on x64 and arm64, and for Linux on x64 and arm64 (glibc). The installers are not code-signed yet. Live-provider and native-feature parity with macOS is not established, and Windows and Linux desktop builds may trail Mac releases. <a className="wv-link" href={desktop.notesUrl}>Release notes</a> · <a className="wv-link" href={desktop.sumsUrl}>SHA256SUMS</a></p>
          <div className={styles.actions}>
            <a className="wv-btn wv-btn--primary" href={desktop.exe.url} data-track="download_click" data-placement="download-page-windows"><Download {...btnIcon} />Windows x64 ({desktop.exe.size})</a>
            <a className="wv-btn wv-btn--secondary" href={desktop.exeArm64.url} data-track="download_click" data-placement="download-page-windows-arm64"><Download {...btnIcon} />Windows arm64 ({desktop.exeArm64.size})</a>
          </div>
          <div className={styles.actions}>
            <a className="wv-btn wv-btn--secondary" href={desktop.appImage.url} data-track="download_click" data-placement="download-page-appimage"><Download {...btnIcon} />Linux x64 AppImage ({desktop.appImage.size})</a>
            <a className="wv-btn wv-btn--secondary" href={desktop.deb.url} data-track="download_click" data-placement="download-page-deb"><Download {...btnIcon} />Linux x64 .deb ({desktop.deb.size})</a>
            <a className="wv-btn wv-btn--secondary" href={desktop.appImageArm64.url} data-track="download_click" data-placement="download-page-appimage-arm64"><Download {...btnIcon} />Linux arm64 AppImage ({desktop.appImageArm64.size})</a>
            <a className="wv-btn wv-btn--secondary" href={desktop.debArm64.url} data-track="download_click" data-placement="download-page-deb-arm64"><Download {...btnIcon} />Linux arm64 .deb ({desktop.debArm64.size})</a>
          </div>
        </div>
        <ul className={clsx('wv-evidence', styles.list)}>
          {DESKTOP_NOTES.map(item => <li key={item.name}>
            <span className="wv-evidence__name">{item.name}</span>
            <span className="wv-evidence__detail">{item.detail}</span>
          </li>)}
        </ul>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="install-title">
        <div className={styles.sectionHead}>
          <h2 id="install-title">Install on a Mac in three steps</h2>
          <p>About a minute on a recent Mac. Nothing to configure before the first launch.</p>
        </div>
        <ol className={clsx('wv-evidence', styles.list)}>
          {STEPS.map(step => <li key={step.title}>
            <span className="wv-evidence__name">{step.title}</span>
            <span className="wv-evidence__detail">{step.body}</span>
          </li>)}
        </ol>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="next-title">
        <div className={styles.sectionHead}>
          <h2 id="next-title">After you install</h2>
          <p>Short videos and guides for the first hour.</p>
        </div>
        <ul className={clsx('wv-evidence', styles.list)}>
          {NEXT.map(item => <li key={item.name}>
            <span className="wv-evidence__name">{item.name}</span>
            <span className="wv-evidence__detail">{item.detail}</span>
          </li>)}
        </ul>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.faq)} aria-labelledby="download-questions-title">
        <h2 id="download-questions-title">Download questions</h2>
        <div className={styles.faqList}>
          {FAQ_TEXT.map(item => <details key={item.q}>
            <summary><span>{item.q}</span><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className={clsx(styles.shell, styles.final)} aria-labelledby="download-final-title">
        <h2 id="download-final-title">Get SpecWithCode for your computer</h2>
        <p>Free, source available, no account. Choose macOS on Apple silicon, Windows 10 and 11 (x64 or arm64), or Linux (x64 or arm64).</p>
        <div className={styles.actions}>
          <FooterDownload />
          <a className={clsx('wv-link', styles.finalLink)} href={release.repoUrl}>View source on GitHub</a>
        </div>
      </section>
    </main>
  </Layout>;
}
