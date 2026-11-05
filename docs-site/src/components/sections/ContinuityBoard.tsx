import React from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './ContinuityBoard.module.css';

/**
 * What the dashboard reads for the example increment on /product.
 * Every value comes from the real `specweave pickup` output shown on that page.
 */
function getRows(): Array<{ label: string; value: React.ReactNode }> {
  return [
    { label: translate({id: 'continuityBoard.increment.label', message: 'Increment', description: 'Dashboard table row label'}), value: <Translate id="continuityBoard.increment.value" description="Dashboard row value; {id} is the increment id, followed by the example increment title" values={{id: <code>0001-resumable-checkout</code>}}>{'{id} Resumable checkout'}</Translate> },
    { label: translate({id: 'continuityBoard.state.label', message: 'State', description: 'Dashboard table row label'}), value: <span className="wv-chip"><Translate id="continuityBoard.state.value" description="Increment state chip">Active</Translate></span> },
    { label: translate({id: 'continuityBoard.tasks.label', message: 'Tasks', description: 'Dashboard table row label'}), value: translate({id: 'continuityBoard.tasks.value', message: '{done} of {total} done', description: 'Task progress'}, {done: 1, total: 2}) },
    { label: translate({id: 'continuityBoard.next.label', message: 'Next task', description: 'Dashboard table row label'}), value: <Translate id="continuityBoard.next.value" description="Dashboard row value; {id} is a task id, followed by the example task title" values={{id: <code>T-02</code>}}>{'{id} Restore the draft on return'}</Translate> },
    { label: translate({id: 'continuityBoard.criteria.label', message: 'Criteria', description: 'Dashboard table row label'}), value: <Translate id="continuityBoard.criteria.value" description="Dashboard row value; {ac1} and {ac2} are acceptance criterion ids" values={{ac1: <code>AC-01</code>, ac2: <code>AC-02</code>}}>{'{ac1} Returning within 24 hours restores the cart and shipping choice. {ac2} A paid order is never restored.'}</Translate> },
    { label: translate({id: 'continuityBoard.files.label', message: 'Files and test', description: 'Dashboard table row label'}), value: <><code>src/restore.js</code>, <code>npm test</code></> },
    { label: translate({id: 'continuityBoard.handoff.label', message: 'Last handoff', description: 'Dashboard table row label'}), value: <Translate id="continuityBoard.handoff.value" description="Dashboard row value; {from} and {to} are agent identities" values={{from: <code>claude@cloud</code>, to: <code>codex@laptop</code>}}>{'{from}, out of tokens. Picked up by {to}.'}</Translate> },
  ];
}

export default function ContinuityBoard() {
  const rows = getRows();
  return <div className={styles.wrap}>
    <table className={styles.table}>
      <caption className={styles.srOnly}><Translate id="continuityBoard.caption" description="Screen-reader caption of the dashboard table; {id} is the increment id" values={{id: '0001-resumable-checkout'}}>{'What the dashboard reads for increment {id}'}</Translate></caption>
      <tbody>
        {rows.map(r => <tr key={r.label}><th scope="row">{r.label}</th><td>{r.value}</td></tr>)}
      </tbody>
    </table>
  </div>;
}
