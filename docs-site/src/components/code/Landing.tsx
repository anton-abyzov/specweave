import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';
import {ArrowUpRight, Globe, MousePointer2} from 'lucide-react';
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
  return <a className={styles.announce} href={CHROME_STORE_URL} data-track="chrome_extension_click" data-placement="hero">
    <span className={styles.announceTag}><Globe size={14} strokeWidth={1.75} aria-hidden="true" />Chrome extension</span>
    <span className={styles.announceText}>Let agents use your Chrome<span className={styles.announceMeta}> For agents in Claude Code, Codex, GitHub Copilot, Grok and more</span></span>
    <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className={styles.announceArrow} />
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

/** Illustration: machines on one tailnet, providers outside it. */
export function MachinesDiagram() {
  return <figure className={clsx(styles.diagram, styles.reveal)}>
    <svg viewBox="0 0 560 300" role="img" aria-label="Illustration: a main Mac running the coordinator and two workers, a Mac and a Linux machine, joined on one private Tailscale network; each machine talks to its model providers directly, outside that network.">
      <rect className={styles.dNet} x="12" y="18" width="372" height="264" rx="16" />
      <text className={styles.dCaption} x="30" y="44">Your tailnet (Tailscale)</text>
      <path className={clsx(styles.dLink, styles.draw)} d="M118 150 C 180 150, 190 92, 262 92" />
      <path className={clsx(styles.dLink, styles.draw)} d="M118 150 C 180 150, 190 214, 262 214" />
      <g className={styles.dNode}>
        <rect x="32" y="112" width="120" height="76" rx="10" />
        <text className={styles.dTitle} x="46" y="142">Main Mac</text>
        <text className={styles.dSub} x="46" y="164">Coordinator</text>
      </g>
      <g className={styles.dNode}>
        <rect x="244" y="60" width="124" height="64" rx="10" />
        <text className={styles.dTitle} x="258" y="88">Mac worker</text>
        <text className={styles.dSub} x="258" y="108">Own sign-ins</text>
      </g>
      <g className={styles.dNode}>
        <rect x="244" y="182" width="124" height="64" rx="10" />
        <text className={styles.dTitle} x="258" y="210">Linux worker</text>
        <text className={styles.dSub} x="258" y="230">x64 or arm64</text>
      </g>
      <g className={styles.dCloud}>
        <rect x="430" y="104" width="118" height="92" rx="12" />
        <text className={styles.dTitle} x="446" y="138">Model</text>
        <text className={styles.dTitle} x="446" y="158">providers</text>
        <text className={styles.dSub} x="446" y="180">Outside</text>
      </g>
      <path className={clsx(styles.dOut, styles.draw)} d="M368 92 C 400 92, 404 130, 430 130" />
      <path className={clsx(styles.dOut, styles.draw)} d="M368 214 C 400 214, 404 172, 430 172" />
      <path className={clsx(styles.dOut, styles.draw)} d="M92 188 C 92 270, 400 280, 489 196" />
    </svg>
    <figcaption><span className={styles.illo}>Illustration</span> Machines reach each other by Tailscale name. Each one talks to its providers directly.</figcaption>
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
