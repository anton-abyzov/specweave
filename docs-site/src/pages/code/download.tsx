import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Translate, {translate} from '@docusaurus/Translate';
import {ChevronDown, Download, Info, ShieldCheck} from 'lucide-react';
import {SPECWITHCODE_RELEASE as release, SPECWITHCODE_WINDOWS_LINUX as desktop, SPECWITHCODE_OPERATING_SYSTEMS} from '../../data/specwithcodeRelease';
import {providerSummary} from '../../data/tools';
import MobileStores from '../../components/code/MobileStores';
import {ALL_DOWNLOADS_ANCHOR, MAC_INSTALLER, useSpecWithCodeInstaller} from '../../data/specwithcodeInstaller';
import styles from '../code.module.css';

/*
  The page people land on when they search "specwithcode download" or "SpecWithCode for Mac".
  Install facts come from the app's docs/user/install.md (anton-abyzov/specwithcode-dev, main,
  19 October 2026) and the v1.0.152 release assets (2 November 2026).
*/

const icon = {size: 20, strokeWidth: 1.5, 'aria-hidden': true} as const;
const btnIcon = {size: 16, strokeWidth: 1.5, 'aria-hidden': true} as const;

const SITE = 'https://spec-weave.com';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`;
const CHROME_URL = 'https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb';

function pageTitle(): string {
  return translate({id: 'code.download.meta.title', message: 'Download SpecWithCode for Mac, Windows and Linux (free)', description: 'Download page title. Keep product names in English'});
}

function pageDescription(): string {
  return translate({id: 'code.download.meta.description', message: 'Download SpecWithCode (Spec with Code), the free AI coding agent workspace, for Apple silicon Macs, Windows 10 and 11, and Linux.', description: 'Download page meta description. Keep product names in English'});
}

function getSteps(): {title: string; body: React.ReactNode}[] {
  return [
    {
      title: translate({id: 'code.download.steps.download.title', message: 'Download the .dmg', description: 'Mac install step 1 title'}),
      body: <Translate id="code.download.steps.download.body" description="Mac install step 1 body; {file} is the installer file name. Keep product names in English" values={{file: <code>SpecWithCode-arm64.dmg</code>}}>{'Click Download for Mac. You get {file}, from the release listed on this page.'}</Translate>,
    },
    {
      title: translate({id: 'code.download.steps.drag.title', message: 'Drag SpecWithCode to Applications', description: 'Mac install step 2 title. Keep product names in English'}),
      body: <Translate id="code.download.steps.drag.body" description="Mac install step 2 body. Keep product names in English">Open the .dmg and drag the app into Applications. It is signed with an Apple Developer ID and notarized, so it opens without a security override.</Translate>,
    },
    {
      title: translate({id: 'code.download.steps.open.title', message: 'Open it and add a provider', description: 'Mac install step 3 title'}),
      body: <Translate id="code.download.steps.open.body" description="Mac install step 3 body. Keep product names in English">The app starts its local service for you. Sign in to a coding agent you already use, such as Claude Code or Codex, and start your first thread.</Translate>,
    },
  ];
}

function getDesktopNotes(): {name: string; detail: React.ReactNode}[] {
  return [
    {
      name: translate({id: 'code.download.desktopNotes.whichFile.name', message: 'Which file', description: 'Windows/Linux install note label: which installer file to pick'}),
      detail: <Translate id="code.download.desktopNotes.whichFile.detail" description="Which installer to pick; {uname}, {aarch64} and {x86_64} are code. Keep product names in English" values={{uname: <code>uname -m</code>, aarch64: <code>aarch64</code>, x86_64: <code>x86_64</code>}}>{'Most Windows PCs and Linux machines are x64. Pick arm64 for an Arm device such as a Snapdragon Windows laptop or an Arm Linux machine; on Linux, {uname} prints {aarch64} there and {x86_64} on x64.'}</Translate>,
    },
    {
      name: 'Windows',
      detail: <Translate
        id="code.download.desktopNotes.windows.detail"
        description="Windows install note; {exe} and {exeArm64} are file names; {protected}, {moreInfo} and {runAnyway} are the bold Windows SmartScreen dialog texts. Keep product names in English"
        values={{
          exe: <code>{desktop.exe.name}</code>,
          exeArm64: <code>{desktop.exeArm64.name}</code>,
          protected: <strong><Translate id="code.download.desktopNotes.windows.smartscreenTitle" description="Title of the Windows SmartScreen dialog, as Windows shows it">Windows protected your PC</Translate></strong>,
          moreInfo: <strong><Translate id="code.download.desktopNotes.windows.moreInfo" description="Windows SmartScreen dialog link text, as Windows shows it">More info</Translate></strong>,
          runAnyway: <strong><Translate id="code.download.desktopNotes.windows.runAnyway" description="Windows SmartScreen dialog button text, as Windows shows it">Run anyway</Translate></strong>,
        }}>{'Run {exe}, or {exeArm64} on Arm. It installs for your user only, with no administrator prompt. The installer is not code-signed yet, so SmartScreen shows {protected} the first time: choose {moreInfo}, then {runAnyway}.'}</Translate>,
    },
    {
      name: translate({id: 'code.download.desktopNotes.debian.name', message: 'Debian and Ubuntu', description: 'Install note label for Debian and Ubuntu. Keep product names in English'}),
      detail: <Translate id="code.download.desktopNotes.debian.detail" description="Debian/Ubuntu install note; {x64Command} and {arm64Command} are shell commands. Keep product names in English" values={{x64Command: <code>sudo apt install ./{desktop.deb.name}</code>, arm64Command: <code>sudo apt install ./{desktop.debArm64.name}</code>}}>{'{x64Command} (x64) or {arm64Command} (arm64) installs the app with a menu entry.'}</Translate>,
    },
    {
      name: translate({id: 'code.download.desktopNotes.otherLinux.name', message: 'Other Linux', description: 'Install note label for other Linux distributions. Keep product names in English'}),
      detail: <Translate id="code.download.desktopNotes.otherLinux.detail" description="Other Linux install note; {chmod} is a shell command. Keep product names in English" values={{chmod: <code>chmod +x</code>}}>{'Make the AppImage for your architecture executable with {chmod} and run it. The app needs a glibc-based distribution.'}</Translate>,
    },
    {
      name: translate({id: 'code.download.desktopNotes.servers.name', message: 'Linux servers', description: 'Install note label for headless Linux servers. Keep product names in English'}),
      detail: <Translate
        id="code.download.desktopNotes.servers.detail"
        description="Linux server note; {x64Archive} and {arm64Archive} are archive names, {link} links to the Linux worker guide. Keep product names in English"
        values={{
          x64Archive: <code>studio-{desktop.version}-linux-x64</code>,
          arm64Archive: <code>linux-arm64</code>,
          link: <Link className="wv-link" to="/docs/studio/linux-worker"><Translate id="code.download.desktopNotes.servers.link" description="Link text to the Linux worker guide. Keep product names in English">Linux worker</Translate></Link>,
        }}>{"A machine without a desktop runs the server from the release's {x64Archive} or {arm64Archive} archive as a worker. See {link}."}</Translate>,
    },
    {
      name: translate({id: 'code.download.desktopNotes.differs.name', message: 'What differs', description: 'Install note label: what differs from the Mac app'}),
      detail: <Translate id="code.download.desktopNotes.differs.detail" description="What differs on Windows and Linux. Keep product names in English">Computer use controls a Mac screen and is macOS only. The app updates itself from new releases on Windows and Linux too; the .deb update asks for your password.</Translate>,
    },
  ];
}

function getNext(): {name: string; detail: React.ReactNode}[] {
  return [
    {
      name: translate({id: 'code.download.next.firstTask.name', message: 'Run your first task', description: 'After-install item label'}),
      detail: <Translate id="code.download.next.firstTask.detail" description="After-install item; {link} links to the video tutorials" values={{link: <Link className="wv-link" to="/tutorials/"><Translate id="code.download.next.firstTask.link" description="Link text to the video tutorials">video tutorials</Translate></Link>}}>{'Short {link} walk through projects, threads and machines; per-agent first-task videos are being re-recorded.'}</Translate>,
    },
    {
      name: translate({id: 'code.download.next.usageLimit.name', message: 'Never wait on a usage limit', description: 'After-install item label'}),
      detail: <Translate id="code.download.next.usageLimit.detail" description="After-install item; {link} links to a tutorial" values={{link: <Link className="wv-link" to="/tutorials/provider-runs-out/"><Translate id="code.download.next.usageLimit.link" description="Link text: tutorial title">Keep working when a provider runs out</Translate></Link>}}>{'When one provider runs out, the same thread continues on another with its context. See {link}.'}</Translate>,
    },
    {
      name: translate({id: 'code.download.next.chrome.name', message: 'Let agents use your Chrome', description: 'After-install item label. Keep product names in English'}),
      detail: <Translate id="code.download.next.chrome.detail" description="After-install item; {link} is the Chrome Web Store link; Settings › Chrome is a menu path in the app. Keep product names in English" values={{link: <a className="wv-link" href={CHROME_URL}>Chrome Web Store</a>}}>{'Add the free SpecWithCode extension from the {link} and pair it in Settings › Chrome. Agents then work in your own Chrome, in a tab group you can see.'}</Translate>,
    },
    {
      name: translate({id: 'code.download.next.machine.name', message: 'Add another machine', description: 'After-install item label'}),
      detail: <Translate id="code.download.next.machine.detail" description="After-install item; {link} links to a tutorial. Keep product names in English" values={{link: <Link className="wv-link" to="/tutorials/add-a-machine/"><Translate id="code.download.next.machine.link" description="Link text: tutorial title">Add a second machine</Translate></Link>}}>{'Add a second Mac or a Linux worker over SpecWithCode Connect. See {link}.'}</Translate>,
    },
  ];
}

function getFaq(): {q: string; a: string}[] {
  return [
    {
      q: translate({id: 'code.download.faq.free.q', message: 'Is SpecWithCode free?', description: 'FAQ question. Keep product names in English'}),
      a: translate({id: 'code.download.faq.free.a', message: 'Yes. SpecWithCode is free. Local use does not require a SpecWithCode account. You bring your own provider subscriptions or API keys and pay any provider charges directly.', description: 'FAQ answer. Keep product names in English'}),
    },
    {
      q: translate({id: 'code.download.faq.macs.q', message: 'Which Macs does SpecWithCode run on?', description: 'FAQ question. Keep product names in English'}),
      a: translate({id: 'code.download.faq.macs.a', message: 'Apple silicon Macs (M1 or later) with macOS 13 or later. Intel Macs are not supported.', description: 'FAQ answer. Keep product names in English'}),
    },
    {
      q: translate({id: 'code.download.faq.windowsLinux.q', message: 'Is there a Windows or Linux download?', description: 'FAQ question. Keep product names in English'}),
      a: translate({id: 'code.download.faq.windowsLinux.a', message: 'Yes. SpecWithCode {version} has Windows installers for Windows 10 and 11 on x64 and arm64, and a Linux AppImage and .deb for x64 and arm64 on glibc-based distributions. The Windows installers are not code-signed yet, so Windows asks you to confirm the first run. Computer use is macOS only.', description: 'FAQ answer; {version} is the release version. Keep product names in English'}, {version: desktop.version}),
    },
    {
      q: translate({id: 'code.download.faq.safe.q', message: 'Is the download safe?', description: 'FAQ question'}),
      a: translate({id: 'code.download.faq.safe.a', message: 'Every release is built in GitHub Actions. The Mac app is signed with an Apple Developer ID and notarized by Apple. The Windows installer and the Linux AppImage and .deb are not code-signed yet; check them against the SHA256SUMS-windows-linux file published with each release. The Mac download has its own SHA256SUMS file.', description: 'FAQ answer; SHA256SUMS file names stay as is. Keep product names in English'}),
    },
    {
      q: translate({id: 'code.download.faq.update.q', message: 'How do I update SpecWithCode?', description: 'FAQ question. Keep product names in English'}),
      a: translate({id: 'code.download.faq.update.a', message: 'Download the newest .dmg from the SpecWithCode GitHub releases and replace the app in Applications. When a machine runs an older server than your app, SpecWithCode shows an update notice in the conversation and in Settings › Connections.', description: 'FAQ answer; Settings › Connections is a menu path in the app. Keep product names in English'}),
    },
  ];
}

/** pageUrl and codeUrl include the locale base (/ru/code/download/), matching each page's canonical. */
function downloadLd(pageUrl: string, codeUrl: string, title: string, description: string, steps: {title: string}[], faq: {q: string; a: string}[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': pageUrl,
        url: pageUrl,
        name: title,
        description,
        isPartOf: {'@id': `${SITE}/#website`},
        about: {'@id': `${SITE}/code/#app`},
        breadcrumb: {'@id': `${pageUrl}#breadcrumb`},
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {'@type': 'ListItem', position: 1, name: 'SpecWithCode', item: codeUrl},
          {'@type': 'ListItem', position: 2, name: translate({id: 'code.download.ld.breadcrumb.download', message: 'Download', description: 'Breadcrumb name of the download page (structured data)'}), item: pageUrl},
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
        installUrl: pageUrl,
        releaseNotes: release.notesUrl,
        isAccessibleForFree: true,
        offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
      },
      {
        '@type': 'HowTo',
        '@id': `${pageUrl}#install`,
        name: translate({id: 'code.download.ld.howto.name', message: 'Install SpecWithCode on a Mac', description: 'Structured-data how-to name. Keep product names in English'}),
        step: [
          {'@type': 'HowToStep', position: 1, name: steps[0].title, text: translate({id: 'code.download.ld.howto.step1', message: 'Download SpecWithCode-arm64.dmg from spec-weave.com/code/download.', description: 'Structured-data how-to step 1 text; keep the file name and address as is'}), url: release.dmgUrl},
          {'@type': 'HowToStep', position: 2, name: steps[1].title, text: translate({id: 'code.download.ld.howto.step2', message: 'Open the .dmg and drag SpecWithCode into Applications. It is signed and notarized, so it opens without a security override.', description: 'Structured-data how-to step 2 text. Keep product names in English'})},
          {'@type': 'HowToStep', position: 3, name: steps[2].title, text: translate({id: 'code.download.ld.howto.step3', message: 'Open SpecWithCode, sign in to a coding agent you already use, such as Claude Code or Codex, and start a thread.', description: 'Structured-data how-to step 3 text. Keep product names in English'})},
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: faq.map(({q, a}) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}})),
      },
    ],
  };
}

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
      <a className={clsx('wv-btn', unsupported ? 'wv-btn--secondary' : 'wv-btn--primary', 'wv-btn--lg')} href={installer.url} data-track="download_click" data-placement="download-page" data-os={installer.key}><Download {...btnIcon} />{installer.label} ({installer.size})</a>
      {installer.alt && <a className="wv-btn wv-btn--secondary wv-btn--lg" href={installer.alt.url} data-track="download_click" data-placement="download-page-alt" data-os={installer.key}><Download {...btnIcon} />{installer.alt.label} ({installer.alt.size})</a>}
      {!isMac && <a className="wv-btn wv-btn--secondary wv-btn--lg" href={MAC_INSTALLER.url} data-track="download_click" data-placement="download-page-mac" data-os="mac"><Download {...btnIcon} />Mac ({MAC_INSTALLER.size})</a>}
      {isMac && <a className="wv-btn wv-btn--secondary wv-btn--lg" href={ALL_DOWNLOADS_ANCHOR}><Translate id="code.download.hero.windowsLinuxButton" description="Button that jumps to the Windows and Linux downloads. Keep product names in English">Windows and Linux</Translate></a>}
    </div>
    <p className={styles.requirements} data-testid="download-requirements">
      <Translate id="code.download.hero.requirements" description="Installer facts under the download button; {version} is the version, {file} the file name, {size} the download size. Keep product names in English" values={{version: installer.version, file: <code>{installer.file}</code>, size: installer.size}}>{'SpecWithCode {version}, {file}, {size}.'}</Translate>{' '}{isMac ? translate({id: 'code.download.hero.macRequirements', message: 'Apple silicon, macOS 13 or later.', description: 'Mac system requirements. Keep product names in English'}) : translate({id: 'code.download.hero.platformSentence', message: '{platform}.', description: 'Who the installer is for, as a sentence; {platform} is a phrase such as Windows 10 and 11 on x64'}, {platform: installer.platformName})}
      {detected && !unsupported && <>{' '}{archGuessed
        ? <Translate id="code.download.hero.pickedArmGuess" description="Shown when the installer was picked for the visitor but the CPU is unknown; {link} jumps to other platforms" values={{link: <a className="wv-link" href={ALL_DOWNLOADS_ANCHOR}><Translate id="code.download.hero.otherPlatforms" description="Link to the downloads for other platforms">Other platforms</Translate></a>}}>{'Picked for your computer; on an Arm machine choose arm64 below. {link}.'}</Translate>
        : <Translate id="code.download.hero.picked" description="Shown when the installer was picked for the visitor; {link} jumps to other platforms" values={{link: <a className="wv-link" href={ALL_DOWNLOADS_ANCHOR}><Translate id="code.download.hero.otherPlatforms" description="Link to the downloads for other platforms">Other platforms</Translate></a>}}>{'Picked for your computer. {link}.'}</Translate>}</>}
      {' '}<a className="wv-link" href={isMac ? release.notesUrl : desktop.notesUrl}><Translate id="code.download.releaseNotes" description="Link to the release notes">Release notes</Translate></a> · <a className="wv-link" href={isMac ? release.sumsUrl : desktop.sumsUrl}>SHA256SUMS</a>
    </p>
    {unsupported === 'intel-mac' && <div className={clsx('wv-note', styles.qualification)} role="note">
      <Info {...icon} />
      <p><strong><Translate id="code.download.intelMac.title" description="Bold lead of the Intel Mac notice. Keep product names in English">This looks like an Intel Mac.</Translate></strong>{' '}<Translate id="code.download.intelMac.body" description="Intel Mac notice; {link} jumps to the Windows and Linux downloads. Keep product names in English" values={{link: <a className="wv-link" href={ALL_DOWNLOADS_ANCHOR}><Translate id="code.download.intelMac.link" description="Link to the Windows and Linux downloads. Keep product names in English">Windows and Linux</Translate></a>}}>{'SpecWithCode for macOS needs Apple silicon (M1 or later); there is no Intel build. A Linux or Windows machine can run it instead, see {link}.'}</Translate></p>
    </div>}
    {unsupported === 'mobile' && <div className={clsx('wv-note', styles.qualification)} role="note">
      <Info {...icon} />
      <p><strong><Translate id="code.download.mobile.title" description="Bold lead of the phone visitor notice. Keep product names in English">SpecWithCode is a desktop app.</Translate></strong>{' '}<Translate id="code.download.mobile.body" description="Phone visitor notice. Keep product names in English">Open this page on your Mac, Windows or Linux computer to download it.</Translate></p>
    </div>}
    {isMac
      ? !unsupported && <div className={clsx('wv-note', styles.qualification)}>
        <ShieldCheck {...icon} />
        <p><strong><Translate id="code.download.signed.title" description="Bold lead of the Mac signing notice. Keep product names in English">Signed with an Apple Developer ID and notarized by Apple.</Translate></strong>{' '}<Translate id="code.download.signed.body" description="Mac signing notice. Keep product names in English">{"The download comes straight from the project's GitHub releases."}</Translate></p>
      </div>
      : <div className={clsx('wv-note', styles.qualification)}>
        <Info {...icon} />
        <p><strong><Translate id="code.download.unsigned.title" description="Bold lead of the Windows/Linux signing notice">Not code-signed yet.</Translate></strong>{' '}<Translate id="code.download.unsigned.body" description="Windows/Linux signing notice; {link} jumps to the Windows and Linux install notes. Keep product names in English" values={{link: <a className="wv-link" href={ALL_DOWNLOADS_ANCHOR}><Translate id="code.download.unsigned.link" description="Link to the Windows and Linux install notes. Keep product names in English">Windows and Linux</Translate></a>}}>{"The download comes straight from the project's GitHub releases; compare it with SHA256SUMS. Install notes are under {link}."}</Translate></p>
      </div>}
  </>;
}

function FooterDownload() {
  const {installer} = useSpecWithCodeInstaller();
  return <>
    <a className="wv-btn wv-btn--primary wv-btn--lg" href={installer.url} data-track="download_click" data-placement="download-page-footer" data-os={installer.key}><Download {...btnIcon} />{installer.label}</a>
    <a className="wv-btn wv-btn--secondary" href={ALL_DOWNLOADS_ANCHOR}>{installer.key === 'mac'
      ? translate({id: 'code.download.footer.windowsLinuxDownloads', message: 'Windows and Linux downloads', description: 'Footer link to the Windows and Linux downloads. Keep product names in English'})
      : translate({id: 'code.download.footer.allPlatforms', message: 'All platforms', description: 'Footer link to the downloads for every platform'})}</a>
  </>;
}

export default function CodeDownload() {
  const TITLE = pageTitle();
  const DESCRIPTION = pageDescription();
  const STEPS = getSteps();
  const DESKTOP_NOTES = getDesktopNotes();
  const NEXT = getNext();
  const FAQ_TEXT = getFaq();
  const pageBase = useBaseUrl('/code/download/');
  const codeBase = useBaseUrl('/code/');
  const DOWNLOAD_LD = downloadLd(`${SITE}${pageBase}`, `${SITE}${codeBase}`, TITLE, DESCRIPTION, STEPS, FAQ_TEXT);
  return <Layout title={TITLE} description={DESCRIPTION}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={translate({id: 'code.download.meta.ogImageAlt', message: 'SpecWithCode: run Claude Code and Codex agents on your own computers. macOS, Windows and Linux. Free and open source (MIT).', description: 'Social share image alt text. Keep product names in English'})} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content={translate({id: 'code.download.meta.twitterImageAlt', message: 'SpecWithCode: agents on your own computers. macOS, Windows and Linux.', description: 'Twitter share image alt text. Keep product names in English'})} />
      <script type="application/ld+json">{JSON.stringify(DOWNLOAD_LD)}</script>
    </Head>
    <main className={clsx('wv-root', styles.page)}>
      <header className={clsx(styles.shell, styles.hero)}>
        <div className={styles.heroCopy}>
          <p className={styles.product}>
            <img src="/img/studio/specwithcode-icon.png" alt="" width="28" height="28" />
            <span className={styles.productName}><Link to="/code/">SpecWithCode</Link></span>
            <span className={styles.productNote}><Translate id="code.download.hero.productNote" description="Short note next to the product name">Free and open source (MIT)</Translate></span>
          </p>
          <h1><Translate id="code.download.hero.title" description="Download page headline. Keep product names in English">Download SpecWithCode</Translate></h1>
          <p><Translate id="code.download.hero.pronounced" description="Hero sentence explaining the product name; keep SpecWithCode and Spec with Code in English">SpecWithCode, pronounced “Spec with Code”, brings your AI coding agents into one workspace.</Translate></p>
          <p className={styles.lead}><Translate id="code.download.hero.lead" description="Hero lead; {providers} is a list of coding agent product names" values={{providers: providerSummary(4)}}>{'One free app for {providers}, on your own machines and the subscriptions you already pay for.'}</Translate></p>
          <HeroDownload />
        </div>
        <div className={styles.heroShot}>
          <figure className="wv-window">
            <div className="wv-window__bar"><span><Translate id="code.download.hero.shot.bar" description="Title bar label of the app screenshot">Worker thread</Translate></span><span>Codex, GPT-6.1-Sol</span></div>
            <img src="/img/studio/code-hero-worker-20261015.webp" width="920" height="1130" alt={translate({id: 'code.download.hero.shot.alt', message: 'SpecWithCode on a Mac: a Codex worker thread reporting the command it ran and the files it changed', description: 'Alt text of the app screenshot. Keep product names in English'})} />
            <figcaption><Translate id="code.download.hero.shot.caption" description="Screenshot caption; {link} links to the SpecWithCode page. Keep product names in English" values={{link: <Link className="wv-link" to="/code/"><Translate id="code.download.hero.shot.captionLink" description="Link from the screenshot caption to the SpecWithCode page">See everything it does</Translate></Link>}}>{'SpecWithCode on macOS. App capture, 15 October 2026. {link}'}</Translate></figcaption>
          </figure>
        </div>
      </header>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="windows-linux-title">
        <div className={styles.sectionHead}>
          <h2 id="windows-linux-title"><Translate id="code.download.windowsLinux.title" description="Section heading. Keep product names in English">Windows and Linux</Translate></h2>
          <p><Translate id="code.download.windowsLinux.body" description="Windows and Linux section intro; {version} is the release version. Keep product names in English" values={{version: desktop.version}}>{'SpecWithCode {version} for Windows 10 and 11 on x64 and arm64, and for Linux on x64 and arm64 (glibc). The installers are not code-signed yet. Live-provider and native-feature parity with macOS is not established, and Windows and Linux desktop builds may trail Mac releases.'}</Translate>{' '}<a className="wv-link" href={desktop.notesUrl}><Translate id="code.download.releaseNotes" description="Link to the release notes">Release notes</Translate></a> · <a className="wv-link" href={desktop.sumsUrl}>SHA256SUMS</a></p>
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

      <section className={clsx(styles.shell, styles.section)} aria-labelledby="phones-title">
        <div className={styles.sectionHead}>
          <h2 id="phones-title"><Translate id="code.download.phones.title" description="Section heading for the phone apps. Keep product names in English">On your phone</Translate></h2>
          <p><Translate id="code.download.phones.body" description="Phone apps section intro. Keep product names in English">SpecWithCode for Android is on Google Play. The iPhone app is on its way; its App Store card becomes a link the day the listing goes live.</Translate></p>
          <MobileStores placement="download-page" kicker={false} />
        </div>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.split)} aria-labelledby="install-title">
        <div className={styles.sectionHead}>
          <h2 id="install-title"><Translate id="code.download.install.title" description="Section heading. Keep product names in English">Install on a Mac in three steps</Translate></h2>
          <p><Translate id="code.download.install.body" description="Mac install section intro. Keep product names in English">About a minute on a recent Mac. Nothing to configure before the first launch.</Translate></p>
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
          <h2 id="next-title"><Translate id="code.download.next.title" description="Section heading">After you install</Translate></h2>
          <p><Translate id="code.download.next.body" description="After-install section intro">Short videos and guides for the first hour.</Translate></p>
        </div>
        <ul className={clsx('wv-evidence', styles.list)}>
          {NEXT.map(item => <li key={item.name}>
            <span className="wv-evidence__name">{item.name}</span>
            <span className="wv-evidence__detail">{item.detail}</span>
          </li>)}
        </ul>
      </section>

      <section className={clsx(styles.shell, styles.section, styles.faq)} aria-labelledby="download-questions-title">
        <h2 id="download-questions-title"><Translate id="code.download.faq.title" description="FAQ section heading">Download questions</Translate></h2>
        <div className={styles.faqList}>
          {FAQ_TEXT.map(item => <details key={item.q}>
            <summary><span>{item.q}</span><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className={clsx(styles.shell, styles.final)} aria-labelledby="download-final-title">
        <h2 id="download-final-title"><Translate id="code.download.final.title" description="Closing section heading. Keep product names in English">Get SpecWithCode for your computer</Translate></h2>
        <p><Translate id="code.download.final.body" description="Closing section text. Keep product names in English">Free, open source (MIT), no account. Choose macOS on Apple silicon, Windows 10 and 11 (x64 or arm64), or Linux (x64 or arm64).</Translate></p>
        <div className={styles.actions}>
          <FooterDownload />
          <a className={clsx('wv-link', styles.finalLink)} href={release.repoUrl}><Translate id="code.download.final.viewSource" description="Link to the source code. Keep product names in English">View source on GitHub</Translate></a>
        </div>
      </section>
    </main>
  </Layout>;
}
