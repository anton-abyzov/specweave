import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {ArrowUp, Check, ClipboardCheck, GitMerge, Split, Target} from 'lucide-react';
import styles from './HeroFlow.module.css';

/*
  /code hero: an illustration of one run, in four steps a first-time visitor can read in five seconds,
  with a strip of real captures of the same four moments from a recorded run underneath.
  The resting state (no JS, reduced motion, screenshots) is the finished run; a 12s loop replays it:
  0-14% goal sent, 14-30% plan, 20-68% agents, 72-100% review. The thread line draws across the loop.
  Real recorded runs are stepped through further down the page (CoordinatorFlow, #real-run).
*/

const icon = {size: 16, strokeWidth: 1.75, 'aria-hidden': true} as const;

const AGENTS: {provider: string; name: string; task: string}[] = [
  {provider: 'claude', name: 'Claude Code', task: 'Export button'},
  {provider: 'openai', name: 'Codex', task: 'CSV endpoint and tests'},
  {provider: 'cursor', name: 'Cursor', task: 'Docs and changelog'},
];

// Real captures of the same four moments, from the recorded tip-calculator run (SpecWithCode 1.0.21, 15 October 2026).
const CAPTURES: {src: string; w: number; h: number; label: string; alt: string; pos: string}[] = [
  {src: '/img/studio/flow-composer-20261015.webp', w: 947, h: 300, label: 'Composer', alt: 'Actual composer with model, effort and approval controls', pos: 'left center'},
  {src: '/img/studio/flow-dispatch-20261015.webp', w: 1064, h: 680, label: 'Coordinator starts two threads', alt: 'Actual coordinator reply starting two worker threads', pos: 'left 78%'},
  {src: '/img/studio/flow-worker-codex-20261015.webp', w: 690, h: 1090, label: 'Codex worker thread', alt: 'Actual Codex worker thread receiving the coordinator brief', pos: 'center 14%'},
  {src: '/img/studio/flow-coord-report-20261015.webp', w: 822, h: 875, label: 'Coordinator report', alt: 'Actual coordinator summary after both workers reported', pos: 'center top'},
];

function Capture({c, i}: {c: typeof CAPTURES[number]; i: number}) {
  const src = useBaseUrl(c.src);
  return <li className={styles.capture}>
    <span className={styles.captureFrame}>
      <img src={src} width={c.w} height={c.h} alt={c.alt} loading="lazy" decoding="async" style={{objectPosition: c.pos}} />
    </span>
    <span className={styles.captureLabel}><b>{i + 1}</b>{c.label}</span>
  </li>;
}

export default function HeroFlow() {
  const base = useBaseUrl('/img/studio/providers/');
  return (
    <figure className={clsx('wv-window', styles.flow)} aria-labelledby="hero-flow-caption">
      <div className="wv-window__bar"><span>How a goal becomes reviewed work</span><span>Illustration</span></div>
      <ol className={styles.steps}>
        <li className={clsx(styles.step, styles.s1)}>
          <p className={styles.label}><span>1</span>You give the goal</p>
          <div className={styles.card}>
            <Target {...icon} className={styles.cardIcon} />
            <p className={styles.goal}>Add CSV export to the Orders page. Done means tests pass.</p>
            <span className={styles.send} aria-hidden="true">Send<ArrowUp size={14} strokeWidth={2} /></span>
            <svg className={styles.cursor} viewBox="0 0 16 20" aria-hidden="true"><path d="M1 1 L1 16 L5 12.5 L8 19 L10.5 18 L7.6 11.6 L13 11.6 Z" /></svg>
          </div>
        </li>

        <li className={clsx(styles.step, styles.s2)}>
          <p className={styles.label}><span>2</span>The coordinator splits it</p>
          <div className={styles.card}>
            <p className={styles.cardHead}><Split {...icon} className={styles.cardIcon} />Plan · 3 tasks</p>
            <ul className={styles.plan}>
              {AGENTS.map(a => <li key={a.name}>{a.task}</li>)}
            </ul>
          </div>
        </li>

        <li className={clsx(styles.step, styles.s3)}>
          <p className={styles.label}><span>3</span>Agents work in parallel</p>
          <ul className={styles.agents}>
            {AGENTS.map(a => (
              <li key={a.name} className={styles.agent}>
                <img src={`${base}${a.provider}.svg`} alt="" width="22" height="22" />
                <span className={styles.agentText}><strong>{a.name}</strong><span>{a.task}</span></span>
                <span className={styles.state}>
                  <span className={clsx('wv-chip wv-chip--iris', styles.working)}>Working</span>
                  <span className={clsx('wv-chip wv-chip--pass', styles.done)}>Done</span>
                </span>
                <span className={styles.bar} aria-hidden="true"><span /></span>
              </li>
            ))}
          </ul>
        </li>

        <li className={clsx(styles.step, styles.s4)}>
          <p className={styles.label}><span>4</span>You review and merge</p>
          <div className={styles.card}>
            <p className={styles.cardHead}><ClipboardCheck {...icon} className={styles.cardIcon} />Ready for review</p>
            <p className={styles.tally}><span className={styles.count}>3</span><span>of 3 tasks done</span></p>
            <ul className={styles.checks}>
              <li><Check {...icon} />Tests pass</li>
              <li><Check {...icon} />One pull request</li>
            </ul>
            <span className={clsx('wv-btn wv-btn--primary', styles.merge)} aria-hidden="true"><GitMerge {...icon} />Review and merge</span>
          </div>
        </li>
      </ol>

      <div className={styles.real}>
        <p className={styles.realHead}><span className="wv-chip wv-chip--iris">Real captures</span><span>The same four moments in the app, from a recorded run on SpecWithCode 1.0.21, 15 October 2026.</span></p>
        <ol className={styles.captures}>
          {CAPTURES.map((c, i) => <Capture key={c.src} c={c} i={i} />)}
        </ol>
      </div>

      <figcaption id="hero-flow-caption">
        You give one goal; a coordinator agent splits it into tasks, worker agents such as Claude Code, Codex and Cursor do them in parallel, and you review one result. The four cards are an illustration; the strip under them shows real captures. <a className="wv-link" href="#real-run">Step through a real run</a>
      </figcaption>
    </figure>
  );
}
