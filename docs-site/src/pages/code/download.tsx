import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import {ChevronDown, Download, ShieldCheck} from 'lucide-react';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop} from '../../data/specwithcodeRelease';
import {providerSummary} from '../../data/tools';
import styles from '../code.module.css';

/*
  The page people land on when they search "specwithcode download" or "SpecWithCode for Mac".
  Install facts come from the app's docs/user/install.md (anton-abyzov/specwithcode-dev, main,
  19 October 2026) and the v1.0.53 release assets.
*/

const icon = {size: 20, strokeWidth: 1.5, 'aria-hidden': true} as const;
const btnIcon = {size: 16, strokeWidth: 1.5, 'aria-hidden': true} as const;

const SITE = 'https://spec-weave.com';
const PAGE_URL = `${SITE}/code/download/`;
const TITLE = 'Download SpecWithCode for Mac, Windows and Linux (free)';
const DESCRIPTION = 'Download SpecWithCode (Spec with Code), the free AI coding agent workspace, for Apple silicon Macs, Windows 10 and 11, and Linux.';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg`;
const SHA_URL = `${release.repoUrl}/releases/download/v${release.version}/SHA256SUMS`;
const CHROME_URL = 'https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb';

const STEPS: {title: string; body: React.ReactNode}[] = [
  {title: 'Download the .dmg', body: <>Click Download for Mac. You get <code>SpecWithCode-arm64.dmg</code>, the newest release, straight from GitHub.</>},
  {title: 'Drag SpecWithCode to Applications', body: <>Open the .dmg and drag the app into Applications. It is signed with an Apple Developer ID and notarized, so it opens without a security override.</>},
  {title: 'Open it and add a provider', body: <>The app starts its local service for you. Sign in to a coding agent you already use, such as Claude Code or Codex, and start your first thread.</>},
];

const DESKTOP_NOTES: {name: string; detail: React.ReactNode}[] = [
  {name: 'Windows', detail: <>Run <code>{desktop.exe.name}</code>. It installs for your user only, with no administrator prompt. The installer is not code-signed yet, so SmartScreen shows <strong>Windows protected your PC</strong> the first time: choose <strong>More info</strong>, then <strong>Run anyway</strong>.</>},
  {name: 'Debian and Ubuntu', detail: <><code>sudo apt install ./{desktop.deb.name}</code> installs the app with a menu entry.</>},
  {name: 'Other Linux', detail: <>Make the AppImage executable with <code>chmod +x</code> and run it. AppImages need FUSE 2 (<code>libfuse2</code>, or <code>libfuse2t64</code> on Ubuntu 24.04).</>},
  {name: 'What differs', detail: <>Computer use controls a Mac screen and is macOS only. The app updates itself from new releases on Windows and Linux too; the .deb update asks for your password.</>},
];

const NEXT: {name: string; detail: React.ReactNode}[] = [
  {name: 'Run your first task', detail: <>Step-by-step videos for <Link className="wv-link" to="/tutorials/specwithcode-claude-code/">Claude Code</Link>, <Link className="wv-link" to="/tutorials/specwithcode-codex/">Codex</Link>, <Link className="wv-link" to="/tutorials/specwithcode-opencode/">OpenCode</Link> and <Link className="wv-link" to="/tutorials/specwithcode-grok/">Grok</Link>.</>},
  {name: 'Never wait on a usage limit', detail: <>When one provider runs out, the same thread continues on another with its context. See <Link className="wv-link" to="/tutorials/provider-runs-out/">Keep working when a provider runs out</Link>.</>},
  {name: 'Let agents use your Chrome', detail: <>Add the free SpecWithCode extension from the <a className="wv-link" href={CHROME_URL}>Chrome Web Store</a> and pair it in Settings › Chrome. Agents then work in your own Chrome, in a tab group you can see.</>},
  {name: 'Add another machine', detail: <>Pair a second Mac or a Linux worker over Tailscale. See <Link className="wv-link" to="/tutorials/add-a-machine/">Add a second machine</Link>.</>},
];

const FAQ_TEXT: {q: string; a: string}[] = [
  {q: 'Is SpecWithCode free?', a: 'Yes. SpecWithCode is free and open source under the MIT license, with no account. You bring your own provider subscriptions or API keys and pay any provider charges directly.'},
  {q: 'Which Macs does SpecWithCode run on?', a: 'Apple silicon Macs (M1 or later) with macOS 13 or later. Intel Mac builds are not published yet; on an Intel Mac you can build the server from source.'},
  {q: 'Is there a Windows or Linux download?', a: `Yes. SpecWithCode ${desktop.version} has a Windows installer for 64-bit Windows 10 and 11, and a Linux AppImage and .deb for x64. The Windows installer is not code-signed yet, so Windows asks you to confirm the first run. Computer use is macOS only.`},
  {q: 'Is the download safe?', a: 'Every release is built in GitHub Actions, signed with an Apple Developer ID and notarized by Apple. Each release also publishes SHA256SUMS so you can check the file you downloaded.'},
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
      operatingSystem: 'macOS 13 or later (Apple silicon), Windows 10 and 11 (x64), Linux (x64)',
      softwareVersion: release.version,
      fileSize: release.size,
      downloadUrl: release.dmgUrl,
      installUrl: PAGE_URL,
      releaseNotes: release.notesUrl,
      license: 'https://opensource.org/licenses/MIT',
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
      <meta property="og:image:alt" content="SpecWithCode: run Claude Code and Codex agents on your own Macs. Free and open source." />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script type="application/ld+json">{JSON.stringify(DOWNLOAD_LD)}</script>
    </Head>
    <main className={clsx('wv-root', styles.page)}>
      <header className={clsx(styles.shell, styles.hero)}>
        <div className={styles.heroCopy}>
          <p className={styles.product}>
            <img src="/img/studio/specwithcode-icon.png" alt="" width="28" height="28" />
            <span className={styles.productName}><Link to="/code/">SpecWithCode</Link></span>
            <span className={styles.productNote}>Free and open source</span>
          </p>
          <h1>Download SpecWithCode</h1>
          <p>SpecWithCode, pronounced “Spec with Code”, brings your AI coding agents into one workspace.</p>
          <p className={styles.lead}>One free app for {providerSummary(4)}, on your own machines and the subscriptions you already pay for.</p>
          <div className={styles.actions}>
            <a className="wv-btn wv-btn--primary wv-btn--lg" href={release.dmgUrl} data-track="download_click" data-placement="download-page"><Download {...btnIcon} />Download for Mac ({release.size})</a>
            <a className="wv-btn wv-btn--secondary wv-btn--lg" href={release.releasesUrl}>All releases</a>
          </div>
          <p className={styles.requirements}>SpecWithCode {release.version}, <code>SpecWithCode-arm64.dmg</code>, {release.size}. Apple silicon, macOS 13 or later. <a className="wv-link" href={release.notesUrl}>Release notes</a> · <a className="wv-link" href={SHA_URL}>SHA256SUMS</a></p>
          <div className={clsx('wv-note', styles.qualification)}>
            <ShieldCheck {...icon} />
            <p><strong>Signed with an Apple Developer ID and notarized by Apple.</strong> The download comes straight from the open-source repository's GitHub releases.</p>
          </div>
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
          <p>SpecWithCode {desktop.version} for 64-bit Windows 10 and 11 and for x64 Linux. Threads, the project coordinator, providers and pairing work as on a Mac. <a className="wv-link" href={desktop.notesUrl}>Release notes</a> · <a className="wv-link" href={desktop.sumsUrl}>SHA256SUMS</a></p>
          <div className={styles.actions}>
            <a className="wv-btn wv-btn--primary" href={desktop.exe.url} data-track="download_click" data-placement="download-page-windows"><Download {...btnIcon} />Windows ({desktop.exe.size})</a>
            <a className="wv-btn wv-btn--secondary" href={desktop.appImage.url} data-track="download_click" data-placement="download-page-appimage"><Download {...btnIcon} />Linux AppImage ({desktop.appImage.size})</a>
            <a className="wv-btn wv-btn--secondary" href={desktop.deb.url} data-track="download_click" data-placement="download-page-deb"><Download {...btnIcon} />Linux .deb ({desktop.deb.size})</a>
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
          <h2 id="install-title">Install in three steps</h2>
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
        <h2 id="download-final-title">Get SpecWithCode for Mac</h2>
        <p>Free, open source, no account. Version {release.version} for Apple silicon Macs on macOS 13 or later.</p>
        <div className={styles.actions}>
          <a className="wv-btn wv-btn--primary wv-btn--lg" href={release.dmgUrl} data-track="download_click" data-placement="download-page-footer"><Download {...btnIcon} />Download SpecWithCode</a>
          <a className={clsx('wv-link', styles.finalLink)} href={release.repoUrl}>View source on GitHub</a>
        </div>
      </section>
    </main>
  </Layout>;
}
