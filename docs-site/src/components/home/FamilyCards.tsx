import React, { useRef } from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
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

const THREADS: CropSpec = {
  ...WINDOW, x: 1728, y: 56, cw: 604, ch: 470,
  alt: 'Crop of the SpecWithCode Threads pane: nothing is waiting on you, 2 working: README docs for --json and --people on Claude Code, and split.py --people option on Codex',
};

const SKILL_ROWS: Array<[string, string, string]> = [
  ['Source', 'Repository link', 'iris'],
  ['Security scan', 'Every file scanned', 'pass'],
  ['Evaluation', 'When one exists', 'muted'],
];

const downloadLabel = `Download SpecWithCode ${release.version} for macOS, Apple silicon, ${release.size}`;

export default function FamilyCards({ cliVersion, cliDate }: { cliVersion: string; cliDate: string }) {
  const list = useRef<HTMLOListElement>(null);
  usePointerGlow(list);
  return <ol className={s.cards} ref={list}>
    <li className={s.card} data-glow>
      <figure className={clsx(s.visual, s.term)}>
        <div className={s.termBar} aria-hidden="true"><i /><i /><i /><span>codex@laptop</span></div>
        <pre aria-label="Output of specweave pickup in a second clone running as Codex"><span className={s.prompt}>$ specweave pickup</span>{'\n'}{PICKUP.map(([t, hl], i) => <React.Fragment key={i}><span className={clsx(s.tline, hl && s.hl)} style={{ '--k': i } as React.CSSProperties}>{t}</span>{i < PICKUP.length - 1 ? '\n' : ''}</React.Fragment>)}</pre>
        <figcaption className={s.source}>Real output · specweave {cliVersion}</figcaption>
      </figure>
      <div className={s.body}>
        <h3>SpecWeave CLI</h3>
        <p className={s.kind}>Open source on npm, MIT. Version {cliVersion}, {cliDate}.</p>
        <p>Writes the spec, the task ledger and the test evidence into your repository, and hands the work to the next tool with <code>specweave handoff</code>. Start here if you work in a terminal with Claude Code, Codex or any agent that reads files.</p>
        <InstallCommand hint="Then run specweave init in your project." className={s.cmd} />
        <Link className={base.textLink} to="/product">How the CLI works</Link>
      </div>
    </li>

    <li className={clsx(s.card, s.featured)} data-glow>
      <figure className={clsx(s.visual, s.shot)}>
        <Crop spec={THREADS} />
        <figcaption className={s.source}>Real capture · SpecWithCode 1.0.103, 27 Oct 2026</figcaption>
      </figure>
      <div className={s.body}>
        <h3>SpecWithCode</h3>
        <p className={s.kind}>Free app for Mac, Windows and Linux. Version {release.version}.</p>
        <p>A coordinator per project starts worker threads in the agents you already pay for, on your own machines. Each thread shows its SpecWeave increment and task progress, and its reports are saved beside the increment. Start here if you want one window for several agents.</p>
        <p className={s.extra}>Agents can also open, read, click and screenshot pages in your own Chrome profile, in a tab group you can close: <a className={s.inline} href={CHROME_EXTENSION_URL} rel="noopener">SpecWithCode Browser for Chrome</a>, paired in Settings, Chrome.</p>
        <div className={s.actions}>
          <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>Download for Mac</a>
          <Link className={base.textLink} to="/code/">See SpecWithCode</Link>
        </div>
      </div>
    </li>

    <li className={s.card} data-glow>
      <figure className={clsx(s.visual, s.skill)} aria-label="Illustration of the three facts every skill page shows">
        <div className={s.skillHead} aria-hidden="true"><span className={s.skillIcon} /><span><strong>A skill page</strong><span>verified-skill.com</span></span></div>
        <ul aria-hidden="true">
          {SKILL_ROWS.map(([k, v, tone], i) => <li key={k} style={{ '--k': i } as React.CSSProperties}><span>{k}</span><span className={clsx(s.skillVal, s[tone])}>{v}</span></li>)}
        </ul>
        <figcaption className={s.source}>Illustration</figcaption>
      </figure>
      <div className={s.body}>
        <h3>Verified Skill</h3>
        <p className={s.kind}>Free to browse at verified-skill.com.</p>
        <p>A registry of agent skills. Each shows its source and its security scan, and its evaluation when one exists, so you know what you install before your agents use it.</p>
        <details className={s.details}>
          <summary>What every skill page shows</summary>
          <dl>
            <dt>Source</dt><dd>The repository the skill comes from, so you can read it first.</dd>
            <dt>Security scan</dt><dd>What the scan of every file found, before you install it.</dd>
            <dt>Evaluation, when one exists</dt><dd>Whether the skill helped on a real task. Not every skill has one yet.</dd>
          </dl>
        </details>
        <a className={base.textLink} href="https://verified-skill.com">Explore skills on verified-skill.com</a>
      </div>
    </li>
  </ol>;
}
