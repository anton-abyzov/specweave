import React, { useRef } from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import Translate, { translate } from '@docusaurus/Translate';
import base from '../../pages/continuity.module.css';
import InstallCommand from '../landing/InstallCommand';
import { SPECWITHCODE_RELEASE as release } from '../../data/specwithcodeRelease';
import Crop, { WINDOW, type CropSpec } from './Crop';
import { CHROME_EXTENSION_URL } from './chrome';
import usePointerGlow from './usePointerGlow';
import s from './FamilyCards.module.css';

/*
  #family: three product cards, each with one visual.
    SpecWeave CLI   real `specweave pickup` output (the same run quoted on /product, lines copied verbatim)
    SpecWithCode    real crop of the Threads pane, SpecWithCode 1.0.103, 27 October 2026
    Verified Skill  an illustration of what every skill page shows (labelled as one)
*/

// Real output from a second clone running as Codex after Claude Code handed off (src/pages/product.tsx, pickupLines).
const PICKUP: Array<[string, boolean?]> = [
  ['Picked up the handoff from claude@cloud (out of tokens): applied 7 uncommitted files.'],
  ['SpecWeave pickup · you are codex@laptop'],
  ['Increment 0001-resumable-checkout "Resumable checkout" (active) · tasks 1/2 done'],
  ['Next: T-02 Restore the draft on return', true],
  ['  AC-01: Returning within 24 hours restores the cart and shipping choice'],
  ['  AC-02: A paid order is never restored'],
];

function threadsCrop(): CropSpec {
  return {
    ...WINDOW, x: 1728, y: 56, cw: 604, ch: 470,
    alt: translate({ id: 'home.family.app.crop.alt', message: 'Crop of the SpecWithCode Threads pane: nothing is waiting on you, 2 working: README docs for --json and --people on Claude Code, and split.py --people option on Codex', description: 'Alt text of a screenshot crop. Keep product and file names and command flags in English' }),
  };
}

function skillRows(): Array<[string, string, string]> {
  return [
    [translate({ id: 'home.family.skill.row.source', message: 'Source', description: 'Row label in the illustrated skill page' }), translate({ id: 'home.family.skill.row.source.value', message: 'Repository link', description: 'Row value in the illustrated skill page, next to Source' }), 'iris'],
    [translate({ id: 'home.family.skill.row.scan', message: 'Security scan', description: 'Row label in the illustrated skill page' }), translate({ id: 'home.family.skill.row.scan.value', message: 'Every file scanned', description: 'Row value in the illustrated skill page, next to Security scan' }), 'pass'],
    [translate({ id: 'home.family.skill.row.eval', message: 'Evaluation', description: 'Row label in the illustrated skill page' }), translate({ id: 'home.family.skill.row.eval.value', message: 'When one exists', description: 'Row value in the illustrated skill page, next to Evaluation' }), 'muted'],
  ];
}

export default function FamilyCards({ cliVersion, cliDate }: { cliVersion: string; cliDate: string }) {
  const list = useRef<HTMLOListElement>(null);
  usePointerGlow(list);
  const THREADS = threadsCrop();
  const SKILL_ROWS = skillRows();
  const downloadLabel = translate({ id: 'home.download.ariaLabel', message: 'Download SpecWithCode {version} for macOS, Apple silicon, {size}', description: 'Accessible label of the Download for Mac button; {version} is the app version, {size} the file size. Keep product names in English' }, { version: release.version, size: release.size });
  return <ol className={s.cards} ref={list}>
    <li className={s.card} data-glow>
      <figure className={clsx(s.visual, s.term)}>
        <div className={s.termBar} aria-hidden="true"><i /><i /><i /><span>codex@laptop</span></div>
        <pre aria-label={translate({ id: 'home.family.cli.terminal.ariaLabel', message: 'Output of specweave pickup in a second clone running as Codex', description: 'Accessible label of the terminal output. Keep "specweave pickup" and "Codex" in English' })}><span className={s.prompt}>$ specweave pickup</span>{'\n'}{PICKUP.map(([t, hl], i) => <React.Fragment key={i}><span className={clsx(s.tline, hl && s.hl)} style={{ '--k': i } as React.CSSProperties}>{t}</span>{i < PICKUP.length - 1 ? '\n' : ''}</React.Fragment>)}</pre>
        <figcaption className={s.source}><Translate id="home.family.cli.source" description="Caption of the terminal output; {version} is the CLI version" values={{ version: cliVersion }}>{'Real output · specweave {version}'}</Translate></figcaption>
      </figure>
      <div className={s.body}>
        <h3>SpecWeave CLI</h3>
        <p className={s.kind}><Translate id="home.family.cli.kind" description="CLI card subtitle; {version} is the CLI version, {date} its release date. Keep npm and MIT in English" values={{ version: cliVersion, date: cliDate }}>{'Open source on npm, MIT. Version {version}, {date}.'}</Translate></p>
        <p><Translate id="home.family.cli.body" description="CLI card body; {command} is the shell command specweave handoff. Keep product names in English" values={{ command: <code>specweave handoff</code> }}>{'Writes the spec, the task ledger and the test evidence into your repository, and hands the work to the next tool with {command}. Start here if you work in a terminal with Claude Code, Codex or any agent that reads files.'}</Translate></p>
        <InstallCommand hint={translate({ id: 'home.family.cli.install.hint', message: 'Then run specweave init in your project.', description: 'Hint under the npm install command; keep "specweave init" in English' })} className={s.cmd} />
        <Link className={base.textLink} to="/product"><Translate id="home.family.cli.link" description="Link from the CLI card to the CLI page">How the CLI works</Translate></Link>
      </div>
    </li>

    <li className={clsx(s.card, s.featured)} data-glow>
      <figure className={clsx(s.visual, s.shot)}>
        <Crop spec={THREADS} />
        <figcaption className={s.source}><Translate id="home.family.app.source" description="Caption of the app screenshot crop. Keep product names and the version in English">Real capture · SpecWithCode 1.0.103, 27 Oct 2026</Translate></figcaption>
      </figure>
      <div className={s.body}>
        <h3>SpecWithCode</h3>
        <p className={s.kind}><Translate id="home.family.app.kind" description="App card subtitle; {version} is the app version. Keep OS names in English" values={{ version: release.version }}>{'Free app for Mac, Windows and Linux. Version {version}.'}</Translate></p>
        <p><Translate id="home.family.app.body" description="App card body. Keep product names in English">A coordinator per project starts worker threads in the agents you already pay for, on your own machines. Each thread shows its SpecWeave increment and task progress, and its reports are saved beside the increment. Start here if you want one window for several agents.</Translate></p>
        <p className={s.extra}><Translate id="home.family.app.chrome" description="App card extra line; {link} is a link to the Chrome extension labelled 'SpecWithCode Browser for Chrome'. 'Settings, Chrome' names the app's settings section. Keep product names in English" values={{ link: <a className={s.inline} href={CHROME_EXTENSION_URL} rel="noopener"><Translate id="home.family.app.chrome.link" description="Link text to the Chrome Web Store extension. Keep product names in English">SpecWithCode Browser for Chrome</Translate></a> }}>{'Agents can also open, read, click and screenshot pages in your own Chrome profile, in a tab group you can close: {link}, paired in Settings, Chrome.'}</Translate></p>
        <div className={s.actions}>
          <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}><Translate id="home.download.button" description="Primary button that downloads the Mac app">Download for Mac</Translate></a>
          <Link className={base.textLink} to="/code/"><Translate id="home.family.app.link" description="Link from the app card to the SpecWithCode page. Keep product names in English">See SpecWithCode</Translate></Link>
        </div>
      </div>
    </li>

    <li className={s.card} data-glow>
      <figure className={clsx(s.visual, s.skill)} aria-label={translate({ id: 'home.family.skill.illustration.ariaLabel', message: 'Illustration of the three facts every skill page shows', description: 'Accessible label of the skill page illustration' })}>
        <div className={s.skillHead} aria-hidden="true"><span className={s.skillIcon} /><span><strong><Translate id="home.family.skill.illustration.title" description="Title inside the skill page illustration">A skill page</Translate></strong><span>verified-skill.com</span></span></div>
        <ul aria-hidden="true">
          {SKILL_ROWS.map(([k, v, tone], i) => <li key={k} style={{ '--k': i } as React.CSSProperties}><span>{k}</span><span className={clsx(s.skillVal, s[tone])}>{v}</span></li>)}
        </ul>
        <figcaption className={s.source}><Translate id="home.family.skill.illustration.caption" description="Caption marking a picture as an illustration, not a real capture">Illustration</Translate></figcaption>
      </figure>
      <div className={s.body}>
        <h3>Verified Skill</h3>
        <p className={s.kind}><Translate id="home.family.skill.kind" description="Verified Skill card subtitle; keep the domain verified-skill.com">Free to browse at verified-skill.com.</Translate></p>
        <p><Translate id="home.family.skill.body" description="Verified Skill card body">A registry of agent skills. Each shows its source and its security scan, and its evaluation when one exists, so you know what you install before your agents use it.</Translate></p>
        <details className={s.details}>
          <summary><Translate id="home.family.skill.details.summary" description="Expandable details summary in the Verified Skill card">What every skill page shows</Translate></summary>
          <dl>
            <dt><Translate id="home.family.skill.details.source" description="Term in the skill page details list">Source</Translate></dt><dd><Translate id="home.family.skill.details.source.body" description="Definition of Source in the skill page details list">The repository the skill comes from, so you can read it first.</Translate></dd>
            <dt><Translate id="home.family.skill.details.scan" description="Term in the skill page details list">Security scan</Translate></dt><dd><Translate id="home.family.skill.details.scan.body" description="Definition of Security scan in the skill page details list">What the scan of every file found, before you install it.</Translate></dd>
            <dt><Translate id="home.family.skill.details.eval" description="Term in the skill page details list">Evaluation, when one exists</Translate></dt><dd><Translate id="home.family.skill.details.eval.body" description="Definition of Evaluation in the skill page details list">Whether the skill helped on a real task. Not every skill has one yet.</Translate></dd>
          </dl>
        </details>
        <a className={base.textLink} href="https://verified-skill.com"><Translate id="home.family.skill.link" description="Link to verified-skill.com; keep the domain">Explore skills on verified-skill.com</Translate></a>
      </div>
    </li>
  </ol>;
}
