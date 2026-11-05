import React, { useRef } from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import Translate, { translate } from '@docusaurus/Translate';
import base from '../../pages/continuity.module.css';
import InstallCommand from '../landing/InstallCommand';
import { STUDIO_WINDOW, StudioWindowFullSize } from '../ecosystem/StudioWindowShot';
import { SPECWITHCODE_RELEASE as release } from '../../data/specwithcodeRelease';
import Crop, { WINDOW, type CropSpec } from './Crop';
import { CHROME_EXTENSION_URL } from './chrome';
import usePointerGlow from './usePointerGlow';
import s from './HomeHero.module.css';

/*
  Home hero with depth. Four planes, each moving at its own rate on scroll (HomeHero.module.css):
    back   an iris light field and a dot grid (illustration, no content)
    mid    the real app window, cropped to the coordinator and the Threads pane
    front  three readable crops of real captures, floating at different depths
    text   the headline, which does not move
  Every picture is a real capture; crops are CSS only. Sources:
    window and its crops   code-window-20261027-{light,dark}.webp, SpecWithCode 1.0.103, 27 October 2026
    worker list            flow-dispatch-20261015.webp, recording of 15 October 2026
    usage limits           flow-usage-limits.webp, recording of 10 October 2026
*/

/** Crop specs with alt text in the active locale; called during render. */
function crops(): Record<'MAIN' | 'TESTS' | 'THREADS' | 'DISPATCH' | 'USAGE', CropSpec> {
  return {
    MAIN: { ...WINDOW, x: 470, y: 0, cw: 1930, ch: 1290, alt: STUDIO_WINDOW.alt },
    TESTS: {
      ...WINDOW, x: 528, y: 418, cw: 340, ch: 50,
      alt: translate({ id: 'home.hero.crop.tests.alt', message: 'Crop of the coordinator report: tests, 23 passed in 0.09s', description: 'Alt text of a screenshot crop' }),
    },
    THREADS: {
      ...WINDOW, x: 1728, y: 250, cw: 660, ch: 232,
      alt: translate({ id: 'home.hero.crop.threads.alt', message: 'Crop of the Threads pane: Working 2, README docs for --json and --people on Claude Code Opus 5.5, and split.py --people option on Codex GPT-6.1-Sol', description: 'Alt text of a screenshot crop. Keep product, model and file names and command flags in English' }),
    },
    DISPATCH: {
      src: '/img/studio/flow-dispatch-20261015.webp', w: 1064, h: 680, x: 20, y: 478, cw: 600, ch: 160,
      alt: translate({ id: 'home.hero.crop.dispatch.alt', message: 'Crop of a coordinator message: Write tip.py CLI, approval requested, and README usage for tip.py, working, each with View thread', description: 'Alt text of a screenshot crop. Keep file names in English' }),
    },
    USAGE: {
      src: '/img/studio/flow-usage-limits.webp', w: 1040, h: 520, x: 64, y: 214, cw: 300, ch: 82,
      alt: translate({ id: 'home.hero.crop.usage.alt', message: 'Crop of Usage and limits: Claude session, 2% left', description: 'Alt text of a screenshot crop. Keep "Claude" in English' }),
    },
  };
}

function ChromeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <line x1="21.17" x2="12" y1="8" y2="8" /><line x1="3.95" x2="8.54" y1="6.06" y2="14" /><line x1="10.88" x2="15.46" y1="21.94" y2="14" />
  </svg>;
}

export default function HomeHero() {
  const stage = useRef<HTMLDivElement>(null);
  usePointerGlow(stage, 6);
  const { MAIN, TESTS, THREADS, DISPATCH, USAGE } = crops();
  const downloadLabel = translate({ id: 'home.download.ariaLabel', message: 'Download SpecWithCode {version} for macOS, Apple silicon, {size}', description: 'Accessible label of the Download for Mac button; {version} is the app version, {size} the file size. Keep product names in English' }, { version: release.version, size: release.size });
  return <section className={s.hero}>
    <div className={s.text}>
      <a className={s.pill} href={CHROME_EXTENSION_URL} rel="noopener">
        <span className="wv-chip wv-chip--iris"><Translate id="home.hero.pill.new" description="Chip on the announcement pill above the hero headline">New</Translate></span>
        <ChromeIcon />
        <span><Translate id="home.hero.pill.text" description="Announcement pill above the hero headline. Keep product names in English">SpecWithCode Browser: let Claude Code, Codex, GitHub Copilot or Grok use your own Chrome</Translate></span>
      </a>
      <h1><Translate id="home.hero.title" description="Home page main headline">Switch AI tools without losing your place.</Translate></h1>
      <p className={s.lead}><Translate id="home.hero.lead" description="Hero lead paragraph; {specwithcode} is a link with the product name SpecWithCode. Keep product names in English" values={{ specwithcode: <Link className={s.inline} to="/code/">SpecWithCode</Link> }}>{'SpecWeave writes the plan and every finished task into git, so Claude Code, Codex or any other agent can pick up the same work. {specwithcode} (pronounced “Spec with Code”) is one interface over those agents’ own native harnesses, on your machines and subscriptions.'}</Translate></p>
      <div className={s.actions}>
        <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}><Translate id="home.download.button" description="Primary button that downloads the Mac app">Download for Mac</Translate></a>
        <Link className={base.secondary} to="/product"><Translate id="home.hero.getCli" description="Secondary hero button linking to the CLI page">Get the CLI</Translate></Link>
      </div>
      <p className={s.requirements}><Translate id="home.hero.requirements" description="System requirements line; {link} is a link labelled 'download SpecWithCode'. Keep product and OS names in English" values={{ link: <Link className={s.inline} to="/code/download/"><Translate id="home.hero.requirements.link" description="Link text to the download page. Keep product names in English">download SpecWithCode</Translate></Link> }}>{'Both free. The app runs on Apple silicon Macs with macOS 13 or later, Windows 10 and 11, and Linux: {link}.'}</Translate></p>
      <InstallCommand hint={translate({ id: 'home.hero.install.hint', message: 'The open-source CLI: MIT licensed, local first, no account.', description: 'Hint under the npm install command in the hero' })} />
    </div>

    <figure className={s.figure}>
      <div className={s.stage} ref={stage} data-glow>
        <div className={s.back} aria-hidden="true" />
        <div className={s.mid}>
          <div className={clsx('wv-window', s.window)}>
            <div className="wv-window__bar"><span>SpecWithCode</span><span>trip-budget</span></div>
            <Crop spec={MAIN} eager />
          </div>
        </div>
        <div className={clsx(s.float, s.fTests)}>
          <div className={clsx('wv-window', s.card)}><Crop spec={TESTS} /></div>
        </div>
        <div className={clsx(s.float, s.fThreads)}>
          <div className={clsx('wv-window', s.card)}>
            <Crop spec={THREADS} />
            <span className={s.tag}><Translate id="home.hero.tag.threads" description="Small tag on a floating screenshot crop">Threads pane · 27 Oct 2026</Translate></span>
          </div>
        </div>
        <div className={clsx(s.float, s.fDispatch)}>
          <div className={clsx('wv-window', s.card)}>
            <Crop spec={DISPATCH} />
            <span className={s.tag}><Translate id="home.hero.tag.dispatch" description="Small tag on a floating screenshot crop">Workers in parallel · 15 Oct 2026</Translate></span>
          </div>
        </div>
        <div className={clsx(s.float, s.fUsage)}>
          <div className={clsx('wv-window', s.card)}>
            <Crop spec={USAGE} />
            <span className={s.tag}><Translate id="home.hero.tag.usage" description="Small tag on a floating screenshot crop">Usage limit · 10 Oct 2026</Translate></span>
          </div>
        </div>
      </div>
      <figcaption className={s.caption}><Translate id="home.hero.caption" description="Caption of the hero screenshots; {windowCaption} is the main screenshot's own caption, {fullSize} a 'View full size' link. Keep product names in English" values={{ windowCaption: STUDIO_WINDOW.caption, fullSize: <StudioWindowFullSize className={s.inline} /> }}>{'Real captures, cropped. {windowCaption} Floating crops: the same window and SpecWithCode recordings of 15 and 10 October 2026. {fullSize}'}</Translate></figcaption>
    </figure>
  </section>;
}
