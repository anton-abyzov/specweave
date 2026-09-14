import React, { useState } from 'react';
import styles from '../../pages/continuity.module.css';

const work = [
  { id: 'INT-024', title: 'Make exports accessible', state: 'Backlog', summary: 'Customers need a readable export they can share with their team.', spec: 'No increment yet', tasks: 'Ready to scope', actor: 'Unassigned', evidence: 'An intent can start small. Attach a specification when the work needs acceptance criteria.' },
  { id: 'INT-023', title: 'Keep checkout resumable', state: 'In progress', summary: 'A customer can return to checkout without losing their choices.', spec: '0042 · Checkout recovery', tasks: '4 of 6 tasks complete', actor: 'Codex · Astra', evidence: 'The next agent gets the same acceptance criteria, completed task evidence, and next action.' },
  { id: 'INT-022', title: 'Preserve work across agents', state: 'Review', summary: 'Continue a feature in another tool without rebuilding the context.', spec: '0041 · Portable handoff', tasks: '6 of 6 tasks complete', actor: 'Claude Code → Codex', evidence: 'Implementation is complete. Review and verification still decide whether it is ready to close.' },
  { id: 'INT-021', title: 'Fix duplicate notifications', state: 'Done', summary: 'Send one notification per event, even when a request is retried.', spec: '0040 · Delivery checks', tasks: '3 of 3 tasks complete', actor: 'OpenCode · Local model', evidence: 'A passing verification report and completed acceptance criteria remain linked to the increment.' },
];

export default function ContinuityBoard() {
  const [selected, setSelected] = useState(work[1]);
  return <section className={styles.board} aria-label="Interactive example work board">
    <div className={styles.boardBar}><div><span className={styles.orangeDot} /> Product workspace <span className={styles.muted}>/ Work</span></div><span className={styles.sample}>Illustrative workspace</span></div>
    <div className={styles.boardMetrics}><span><b>4</b> intents</span><span><b>1</b> in progress</span><span><b>1</b> ready for review</span><span className={styles.localLabel}>Local files · no model calls</span></div>
    <div className={styles.boardColumns}>{work.map(item => <div className={styles.boardColumn} key={item.id}>
      <div className={styles.columnTitle}><span className={styles.statusDot} data-state={item.state} />{item.state}<span>1</span></div>
      <button className={`${styles.intentCard} ${selected.id === item.id ? styles.selectedCard : ''}`} onClick={() => setSelected(item)} aria-pressed={selected.id === item.id}>
        <span className={styles.cardId}>{item.id}</span><strong>{item.title}</strong><p>{item.summary}</p><span className={styles.specLink}>{item.spec}</span><span className={styles.cardProgress}>{item.tasks}</span><span className={styles.actor}>{item.actor}</span>
      </button>
    </div>)}</div>
    <div className={styles.boardDetail} aria-live="polite"><div><span className={styles.eyebrow}>Inside this intent</span><strong>{selected.title}</strong></div><p>{selected.evidence}</p><a href="/product">Explore the work model <span aria-hidden="true">↗</span></a></div>
  </section>;
}
