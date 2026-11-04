import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';
import {ArrowUpRight, MousePointer2} from 'lucide-react';
import {formatDuration, guidePath, type Tutorial} from '@site/src/data/tutorials';
import {glowHandlers} from './hooks';
import styles from './Landing.module.css';

/*
  Building blocks for the /code sections: cards, rails, small drawn diagrams and real crops.
  Drawn diagrams say "Illustration"; crops of real captures say "Real capture" with the date.
  Every piece renders complete without JS; motion is CSS scroll-driven and progressive.
*/

export const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb';

export type CardItem = {name: string; detail: React.ReactNode; icon: React.ComponentType<{size?: number; strokeWidth?: number; 'aria-hidden'?: boolean}>; visual?: React.ReactNode};

/** Cards with an icon, an optional mini visual, a title and the full detail. `rail` scrolls sideways. */
export function Cards({items, rail, columns = 2, label}: {items: CardItem[]; rail?: boolean; columns?: 2 | 3 | 4; label?: string}) {
  return <ul className={clsx(styles.cards, rail ? styles.rail : styles[`cols${columns}`])} aria-label={label}>
    {items.map((item, i) => {
      const Icon = item.icon;
      return <li key={item.name} className={clsx(styles.card, styles.reveal)} style={{'--i': i} as React.CSSProperties} {...glowHandlers()}>
        <span className={styles.cardIcon}><Icon size={18} strokeWidth={1.75} aria-hidden /></span>
        {item.visual}
        <h3 className={styles.cardTitle}>{item.name}</h3>
        <p className={styles.cardBody}>{item.detail}</p>
      </li>;
    })}
  </ul>;
}

/** Slim link above the headline to the SpecWithCode Browser extension. */
export function ChromeAnnounce() {
  const chrome = useBaseUrl('/img/brands/chrome.svg');
  return <a className={styles.announce} href={CHROME_STORE_URL} data-track="chrome_extension_click" data-placement="hero" title="SpecWithCode Browser for Chrome: for agents in Claude Code, Codex, GitHub Copilot, Grok and more">
    <span className={styles.announceLogo}><img src={chrome} alt="" width="22" height="22" /></span>
    <span className={styles.announceTag}>New</span>
    <span className={styles.announceText}>Let agents use your Chrome</span>
    <span className={styles.announceCta}><span className={styles.announceCtaLabel}>Add to Chrome</span><ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" /></span>
  </a>;
}

/** A crop of the 27 October 2026 app window, in the visitor's theme. */
export function WindowCrop({region, alt, label, className}: {region: 'threads'; alt: string; label: string; className?: string}) {
  const light = useBaseUrl('/img/studio/code-window-20261027-light.webp');
  const dark = useBaseUrl('/img/studio/code-window-20261027-dark.webp');
  return <figure className={clsx('wv-window', styles.crop, styles[`crop_${region}`], className)}>
    <div className="wv-window__bar"><span>{label}</span><span>Real capture, 27 Oct 2026</span></div>
    <div className={styles.cropBox}>
      <ThemedImage sources={{light, dark}} width={2400} height={1500} alt={alt} loading="lazy" decoding="async" className={styles.cropImg} />
    </div>
  </figure>;
}

/** A small real capture used inside a card. */
export function CardShot({src, w, h, alt, caption}: {src: string; w: number; h: number; alt: string; caption: string}) {
  const url = useBaseUrl(src);
  return <figure className={styles.cardShot}>
    <img src={url} width={w} height={h} alt={alt} loading="lazy" decoding="async" />
    <figcaption>{caption}</figcaption>
  </figure>;
}

/** Inline row of tokens (commands, options) for a card's mini visual. */
export function Tokens({items, mono, active}: {items: string[]; mono?: boolean; active?: number}) {
  return <span className={clsx(styles.tokens, mono && styles.tokensMono)} aria-hidden="true">
    {items.map((t, i) => <span key={t} className={clsx(styles.token, i === active && styles.tokenOn)}>{t}</span>)}
  </span>;
}

/** Illustration: the three project rules for a provider limit, one selected in turn. */
export function PolicyPicker() {
  const options = ['Switch automatically', 'Offer the fallback', 'Wait for the reset'];
  return <figure className={clsx(styles.policy, styles.reveal)}>
    <p className={styles.policyHead}><span>When a provider runs out</span><span className={styles.illo}>Illustration</span></p>
    <div className={styles.policyRow} aria-hidden="true">
      {options.map(o => <span key={o} className={styles.policyOption}>{o}</span>)}
      <span className={styles.policyThumb} />
    </div>
    <div className={styles.handoff} aria-hidden="true">
      <span className={styles.handoffNode}><img src={useBaseUrl('/img/studio/providers/claude.svg')} alt="" width="20" height="20" />Thread at its limit</span>
      <span className={styles.handoffLine}><i /></span>
      <span className={styles.handoffNode}><img className={styles.plate} src={useBaseUrl('/img/studio/providers/openai.svg')} alt="" width="20" height="20" />Same worktree, same context</span>
    </div>
    <figcaption>The rule you set per project decides what happens next. Continuation depends on a compatible, available provider.</figcaption>
  </figure>;
}

/** Illustrative operations, not native captures. */
export function MachinesDiagram() {
  return <figure className={clsx(styles.diagram, styles.reveal)}>
    <div className={styles.machineOperations}>
      <div className={styles.machineOperation}>
        <h3>Remote control · work stays here</h3>
        <div className={styles.machineRoute}>
          <div><strong>Travel laptop</strong><span>Controller</span></div>
          <span aria-hidden="true">→</span>
          <div><strong>Office Mac</strong><span>Host · Runs on Office Mac</span></div>
        </div>
        <p>Control SpecWithCode through Connect. Agents and terminals keep running on Office Mac.</p>
      </div>
      <div className={styles.machineOperation}>
        <h3>Move thread · review first</h3>
        <div className={styles.machineRoute}>
          <div><strong>Office Mac</strong><span>Source</span></div>
          <span aria-hidden="true">→</span>
          <div><strong>Linux workstation</strong><span>Destination · review readiness</span></div>
        </div>
        <p>Review the project folder and supported context, then continue on the destination.</p>
      </div>
    </div>
    <figcaption><span className={styles.illo}>Illustration</span> Example machine names. Each machine talks to its providers with its own sign-ins.</figcaption>
  </figure>;
}

/** Illustration: how a finished thread lands. */
export function FinishDiagram() {
  const stages = ['Thread', 'Branch', 'Pull request', 'Checks and review', 'Merged'];
  return <figure className={clsx(styles.pipeline, styles.reveal)}>
    <ol aria-label="Illustration: a finished thread becomes a branch, then a pull request, then checks and review, then a merge">
      {stages.map((s, i) => <li key={s} style={{'--i': i} as React.CSSProperties}><span className={styles.pipeDot} />{s}</li>)}
    </ol>
    <Tokens items={['Leave the branch', 'Open a PR', 'PR and auto-merge']} active={2} />
    <figcaption><span className={styles.illo}>Illustration</span> New projects default to auto-merge.</figcaption>
  </figure>;
}

/** Illustration: an agent working in a visible tab group in your own Chrome. */
export function BrowserDiagram() {
  return <div className={styles.browser} aria-hidden="true">
    <div className={styles.browserBar}>
      <span className={styles.browserDots}><i /><i /><i /></span>
      <span className={styles.tabGroup}>SpecWithCode</span>
      <span className={clsx(styles.tab, styles.tabOn)}>Your app, staging</span>
      <span className={styles.tab}>Pull request</span>
      <span className={clsx(styles.tab, styles.tabYours)}>Your tabs</span>
    </div>
    <div className={styles.browserBody}>
      <span className={styles.line} style={{width: '62%'}} />
      <span className={styles.line} style={{width: '84%'}} />
      <span className={styles.line} style={{width: '48%'}} />
      <span className={styles.target}>Open report</span>
      <MousePointer2 className={styles.agentCursor} size={18} strokeWidth={1.75} />
      <span className={styles.flash} />
    </div>
    <span className={styles.illoTag}>Illustration</span>
  </div>;
}

/** Tutorials as poster cards; `rail` scrolls sideways. */
export function GuideCards({guides, rail}: {guides: readonly Tutorial[]; rail?: boolean}) {
  return <ul className={clsx(styles.guides, rail && styles.guidesRail)}>
    {guides.map((t, i) => <GuideCard key={t.slug} t={t} i={i} />)}
  </ul>;
}

function GuideCard({t, i}: {t: Tutorial; i: number}) {
  const poster = useBaseUrl(t.poster);
  return <li className={clsx(styles.guide, styles.reveal)} style={{'--i': i % 4} as React.CSSProperties}>
    <Link to={guidePath(t.slug)} className={styles.guideLink}>
      <span className={styles.guidePoster}><img src={poster} alt="" width={320} height={180} loading="lazy" decoding="async" /><span className={styles.guideTime}>{formatDuration(t.durationSeconds)}</span></span>
      <span className={styles.guideTitle}>{t.title}</span>
    </Link>
  </li>;
}
