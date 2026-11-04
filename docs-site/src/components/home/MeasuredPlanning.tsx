import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './MeasuredPlanning.module.css';

/*
  "When a spec pays off", from the maintainer's own work, 6 October to 3 November 2026:
  merged pull requests in specwithcode-dev, specweave, vskill, vskill-platform and specweave-umb
  (releases excluded), the SpecWithCode thread records on the main Mac and Claude Code transcripts.
  Full method, tables and caveats: docs/guides/when-to-plan-an-increment.md. Keep the two in step.
*/

const STATS: {value: string; label: string}[] = [
  {value: '1,476', label: 'merged pull requests measured over four weeks, alongside 1,142 agent threads that ran work'},
  {value: '35%', label: 'of them were tied to an increment; the rest were done directly'},
  {value: '≈ 1x', label: 'hours open and output tokens under 300 changed lines, with an increment or without'},
  {value: '≈ 2x', label: 'the messages and output tokens in increment-backed threads that shipped one pull request over 1,000 changed lines (17 against 11 threads)'},
];

const SKIP = ['One pull request under about 300 changed lines', 'A follow-up fix or a UI tweak', 'An investigation'];
const PLAN = ['Multi-day work, one increment per pull request', 'Cross-platform, auth, payments, migrations', 'Work another tool or machine will pick up'];

export default function MeasuredPlanning() {
  return <section className={styles.band} id="when-to-plan" aria-labelledby="when-to-plan-title">
    <div className={styles.copy}>
      <p className={styles.kicker}>Measured on our own work</p>
      <h2 id="when-to-plan-title">Plan when it pays off, skip it when it doesn’t</h2>
      <p className={styles.lead}>We build these products with SpecWeave, so we looked at where a spec earns its keep. Small changes looked about the same either way. Large increment-backed ones took more messages, so we keep increments for work that Codex, another account or another machine will continue.</p>
      <dl className={styles.stats}>
        {STATS.map(s => <div key={s.value}><dt>{s.value}</dt><dd>{s.label}</dd></div>)}
      </dl>
    </div>
    <div className={styles.rule}>
      <div className={styles.col}>
        <h3>Skip the increment</h3>
        <ul>{SKIP.map(l => <li key={l}>{l}</li>)}</ul>
        <p><code>specweave small-fix "&lt;why&gt;"</code> and ship.</p>
      </div>
      <div className={clsx(styles.col, styles.plan)}>
        <h3>Plan an increment</h3>
        <ul>{PLAN.map(l => <li key={l}>{l}</li>)}</ul>
        <p><code>specweave create-increment "&lt;title&gt;"</code>. These win over size.</p>
      </div>
      <p className={styles.source}>Merged pull requests, SpecWithCode thread records and Claude Code sessions, 6 October to 3 November 2026. <Link className={clsx('wv-link', styles.link)} to="/docs/guides/when-to-plan-an-increment">Read the measurement</Link></p>
    </div>
  </section>;
}
