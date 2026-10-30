import React from 'react';
import clsx from 'clsx';
import styles from './FleetSequence.module.css';

/*
  The /code scroll sequence: one coordinator, workers on several machines, results back.
  A diagram, not a capture. Behaviour it shows, checked against specwithcode 1.0.43 and 1.0.44:
  - a coordinator starts worker threads, each with its own provider and model
    (docs/studio/project-orchestration.md);
  - threads run on the coordinator's machine unless the project or the launch names
    another allowed machine (docs/user/usage.md, docs/user/linux-worker.md:
    studio_thread_launch {machine});
  - every worker reports back to the coordinator, and long reports are saved as
    cards under .specweave/increments/<id>/reports/ (1.0.1);
  - a finished thread can leave its branch, open a PR, or open a PR and auto-merge (1.0.42).
  The markup is the final state. CSS draws it in on scroll where supported; without
  that, with reduced motion, or in a screenshot, the whole picture is already there.
*/

const workers = [
  {machine: 'This Mac', where: 'Where the coordinator runs', task: 'Write the parser', agent: 'Codex on this Mac’s ChatGPT plan'},
  {machine: 'Second Mac', where: 'Added over Connect', task: 'Add the tests', agent: 'Claude Code on that Mac’s own Claude plan'},
  {machine: 'Linux VPS', where: 'Added over Connect', task: 'Update the docs', agent: 'OpenCode with an API key'},
];

export default function FleetSequence() {
  return <section className={styles.fleet} id="workflow" aria-labelledby="fleet-title">
    <div className={styles.head}>
      <h2 id="fleet-title">One goal, workers on several machines</h2>
      <p>You talk to one coordinator per project. It splits the goal into worker threads, starts each one on a machine you allowed with the provider that suits it, and gathers every result back into the same conversation.</p>
    </div>

    <figure className={styles.stage} aria-labelledby="fleet-caption">
      <div className={clsx(styles.layer, styles.coord)}>
        <p className={styles.colTitle}>1. You and the coordinator</p>
        <div className={styles.node}>
          <p className={styles.nodeName}>You</p>
          <p className={styles.nodeBody}>“Add a CSV import with tests and docs.”</p>
        </div>
        <div className={clsx(styles.node, styles.nodeCoord)}>
          <p className={styles.nodeName}>Coordinator</p>
          <p className={styles.nodeBody}>Splits the goal, picks a machine and provider for each part, asks you only when a decision is yours.</p>
        </div>
      </div>

      <div className={clsx(styles.layer, styles.workers)}>
        <p className={styles.colTitle}>2. Workers where you allowed them</p>
        <ol className={styles.machines}>
          {workers.map(w => <li key={w.machine} className={styles.machine}>
            <div className={styles.machineHead}>
              <span className={styles.machineName}>{w.machine}</span>
              <span className={styles.machineWhere}>{w.where}</span>
            </div>
            <div className={styles.thread}>
              <span className={styles.threadTask}>{w.task}</span>
              <span className="wv-chip wv-chip--pass">Reported</span>
              <span className={styles.threadAgent}>{w.agent}</span>
            </div>
          </li>)}
        </ol>
      </div>

      <div className={clsx(styles.layer, styles.results)}>
        <p className={styles.colTitle}>3. Results come back</p>
        <ul className="wv-evidence">
          <li>
            <span className="wv-evidence__name">A report from every worker</span>
            <span className="wv-evidence__detail">What changed, the commands it ran and their output, saved under <code>.specweave/increments/&lt;id&gt;/reports/</code>.</span>
          </li>
          <li>
            <span className="wv-evidence__name">The coordinator checks them</span>
            <span className="wv-evidence__detail">It compares each result with the goal and tells you what is left.</span>
          </li>
          <li>
            <span className="wv-evidence__name">You decide how it lands</span>
            <span className="wv-evidence__detail">Leave the branch, open a PR, or open a PR and auto-merge.</span>
          </li>
        </ul>
      </div>
    </figure>

    <p className={styles.caption} id="fleet-caption">A diagram of the flow, not a capture; machine, task and provider names are examples. Threads run on the coordinator’s machine unless the project or the coordinator names another machine you allowed. Checked against SpecWithCode 1.0.44, 18 October 2026.</p>
  </section>;
}
