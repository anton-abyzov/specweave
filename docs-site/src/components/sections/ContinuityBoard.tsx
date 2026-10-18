import React from 'react';
import styles from './ContinuityBoard.module.css';

/**
 * What the dashboard reads for the example increment on /product.
 * Every value comes from the real `specweave pickup` output shown on that page.
 */
const rows: Array<{ label: string; value: React.ReactNode }> = [
  { label: 'Increment', value: <><code>0001-resumable-checkout</code> Resumable checkout</> },
  { label: 'State', value: <span className="wv-chip">Active</span> },
  { label: 'Tasks', value: '1 of 2 done' },
  { label: 'Next task', value: <><code>T-02</code> Restore the draft on return</> },
  { label: 'Criteria', value: <><code>AC-01</code> Returning within 24 hours restores the cart and shipping choice. <code>AC-02</code> A paid order is never restored.</> },
  { label: 'Files and test', value: <><code>src/restore.js</code>, <code>npm test</code></> },
  { label: 'Last handoff', value: <><code>claude@cloud</code>, out of tokens. Picked up by <code>codex@laptop</code>.</> },
];

export default function ContinuityBoard() {
  return <div className={styles.wrap}>
    <table className={styles.table}>
      <caption className={styles.srOnly}>What the dashboard reads for increment 0001-resumable-checkout</caption>
      <tbody>
        {rows.map(r => <tr key={r.label}><th scope="row">{r.label}</th><td>{r.value}</td></tr>)}
      </tbody>
    </table>
  </div>;
}
