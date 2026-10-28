import React from 'react';
import clsx from 'clsx';
import {Check, ClipboardCheck, GitMerge, Split, Target} from 'lucide-react';
import styles from './HeroFlow.module.css';

/*
  /code hero: an illustration of one run, in four steps a first-time visitor can read in five seconds.
  The resting state (no JS, reduced motion, screenshots) is the finished run; motion only replays it.
  Real recorded runs live further down the page (CoordinatorFlow).
*/

const icon = {size: 16, strokeWidth: 1.75, 'aria-hidden': true} as const;

const AGENTS: {provider: string; name: string; task: string}[] = [
  {provider: 'claude', name: 'Claude Code', task: 'Export button'},
  {provider: 'openai', name: 'Codex', task: 'CSV endpoint and tests'},
  {provider: 'cursor', name: 'Cursor', task: 'Docs and changelog'},
];

export default function HeroFlow() {
  return (
    <figure className={clsx('wv-window', styles.flow)} aria-labelledby="hero-flow-caption">
      <div className="wv-window__bar"><span>How a goal becomes reviewed work</span><span>Illustration</span></div>
      <ol className={styles.steps}>
        <li className={clsx(styles.step, styles.s1)}>
          <p className={styles.label}><span>1</span>You give the goal</p>
          <div className={styles.card}>
            <Target {...icon} className={styles.cardIcon} />
            <p className={styles.goal}>Add CSV export to the Orders page. Done means tests pass.</p>
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
            {AGENTS.map((a, i) => (
              <li key={a.name} className={styles.agent} style={{'--i': i} as React.CSSProperties}>
                <img src={`/img/studio/providers/${a.provider}.svg`} alt="" width="22" height="22" />
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
            <ul className={styles.checks}>
              <li><Check {...icon} />3 of 3 tasks done</li>
              <li><Check {...icon} />Tests pass</li>
              <li><Check {...icon} />One pull request</li>
            </ul>
            <span className={clsx('wv-btn wv-btn--primary', styles.merge)} aria-hidden="true"><GitMerge {...icon} />Review and merge</span>
          </div>
        </li>
      </ol>
      <figcaption id="hero-flow-caption">
        You give one goal; a coordinator agent splits it into tasks, worker agents such as Claude Code, Codex and Cursor do them in parallel, and you review one result. <a className="wv-link" href="#real-run">Step through a real run</a>
      </figcaption>
    </figure>
  );
}
