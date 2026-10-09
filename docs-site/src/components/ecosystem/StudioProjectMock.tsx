import React from 'react';
import styles from './studio.module.css';

const workers = [
  { task: 'T-01 Save the checkout draft', agent: 'Codex', model: 'GPT-6.1-Sol', host: 'Studio Mac', place: 'worktree', state: 'Running', tone: 'run' },
  { task: 'T-02 Restore it on return', agent: 'Grok Build', model: 'grok-4.7', host: 'Mac mini', place: 'worktree', state: 'Needs your approval', tone: 'ask' },
  { task: 'T-03 Never restore a paid order', agent: 'Claude Code', model: 'Sonnet 5.5', host: 'This Mac', place: 'worktree', state: 'Verified · npm test', tone: 'done' },
];

/** An illustration of a Studio project: one coordinator, workers on different providers and machines, one plan. */
export default function StudioProjectMock({ caption = true }: { caption?: boolean }) {
  return <figure className={styles.mock} aria-label="Illustration of a Studio project: a Claude Code coordinator assigns three tasks to workers running Codex, Grok Build and Claude Code on three machines, and one plan tracks what is verified.">
    <div className={styles.window} aria-hidden="true">
      <div className={styles.bar}><i /><i /><i /><span>Checkout recovery</span><b>Project · 3 machines</b></div>
      <div className={styles.body}>
        <div className={styles.coordinator}>
          <div className={styles.paneHead}><span>Coordinator</span><em>Claude Code · Opus 5.5</em></div>
          <p className={styles.you}>Customers lose their cart when they leave checkout. Fix it, and never restore a paid order.</p>
          <p className={styles.agent}>Planned three tasks from increment 0042. T-01 goes to Codex on the Studio Mac, T-02 to Grok Build on the Mac mini, T-03 stays here. I will check each result against its acceptance criteria.</p>
          <p className={styles.memory}><span>Memory</span>Release moved to Friday. All workers see it.</p>
        </div>
        <div className={styles.workers}>
          <div className={styles.paneHead}><span>Workers</span><em>own provider and model</em></div>
          {workers.map((w) => <div className={styles.worker} key={w.task}>
            <strong>{w.task}</strong>
            <span>{w.agent} · {w.model}</span>
            <small>{w.host} · {w.place}</small>
            <b data-tone={w.tone}>{w.state}</b>
          </div>)}
        </div>
      </div>
      <div className={styles.plan}>
        <span>Plan · SpecWeave increment 0042</span>
        <div className={styles.meter}><i data-tone="done" /><i data-tone="run" /><i data-tone="ask" /></div>
        <span>1 verified · 1 running · 1 waiting on you</span>
      </div>
    </div>
    {caption && <figcaption>Illustration. Task names, models and machines are examples; your providers and machines decide what is available.</figcaption>}
  </figure>;
}
