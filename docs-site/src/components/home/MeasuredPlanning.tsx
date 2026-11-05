import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './MeasuredPlanning.module.css';

/*
  "When a spec pays off", from the maintainer's own work, 6 October to 3 November 2026:
  merged pull requests in specwithcode-dev, specweave, vskill, vskill-platform and specweave-umb
  (releases excluded), the SpecWithCode thread records on the main Mac and Claude Code transcripts.
  Full method, tables and caveats: docs/guides/when-to-plan-an-increment.md. Keep the two in step.
*/

function stats(): {value: string; label: string}[] {
  return [
    {value: '1,476', label: translate({id: 'home.planning.stat.prs', message: 'merged pull requests measured over four weeks, alongside 1,142 agent threads that ran work', description: 'Label under the number 1,476'})},
    {value: '35%', label: translate({id: 'home.planning.stat.share', message: 'of them were tied to an increment; the rest were done directly', description: 'Label under the number 35%'})},
    {value: '≈ 1x', label: translate({id: 'home.planning.stat.small', message: 'hours open and output tokens under 300 changed lines, with an increment or without', description: 'Label under the value ≈ 1x'})},
    {value: '≈ 2x', label: translate({id: 'home.planning.stat.large', message: 'the messages and output tokens in increment-backed threads that shipped one pull request over 1,000 changed lines (17 against 11 threads)', description: 'Label under the value ≈ 2x'})},
  ];
}

function skipList(): string[] {
  return [
    translate({id: 'home.planning.skip.small', message: 'One pull request under about 300 changed lines', description: 'When to skip planning an increment, list item'}),
    translate({id: 'home.planning.skip.fix', message: 'A follow-up fix or a UI tweak', description: 'When to skip planning an increment, list item'}),
    translate({id: 'home.planning.skip.investigation', message: 'An investigation', description: 'When to skip planning an increment, list item'}),
  ];
}

function planList(): string[] {
  return [
    translate({id: 'home.planning.plan.multiDay', message: 'Multi-day work, one increment per pull request', description: 'When to plan an increment, list item'}),
    translate({id: 'home.planning.plan.risky', message: 'Cross-platform, auth, payments, migrations', description: 'When to plan an increment, list item'}),
    translate({id: 'home.planning.plan.handoff', message: 'Work another tool or machine will pick up', description: 'When to plan an increment, list item'}),
  ];
}

export default function MeasuredPlanning() {
  const STATS = stats();
  const SKIP = skipList();
  const PLAN = planList();
  return <section className={styles.band} id="when-to-plan" aria-labelledby="when-to-plan-title">
    <div className={styles.copy}>
      <p className={styles.kicker}><Translate id="home.planning.kicker" description="Small label above the 'when to plan' heading">Measured on our own work</Translate></p>
      <h2 id="when-to-plan-title"><Translate id="home.planning.title" description="Heading of the 'when to plan an increment' section">Plan when it pays off, skip it when it doesn’t</Translate></h2>
      <p className={styles.lead}><Translate id="home.planning.lead" description="Lead paragraph of the 'when to plan' section. Keep product names in English">We build these products with SpecWeave, so we looked at where a spec earns its keep. Small changes looked about the same either way. Large increment-backed ones took more messages, so we keep increments for work that Codex, another account or another machine will continue.</Translate></p>
      <dl className={styles.stats}>
        {STATS.map(s => <div key={s.value}><dt>{s.value}</dt><dd>{s.label}</dd></div>)}
      </dl>
    </div>
    <div className={styles.rule}>
      <div className={styles.col}>
        <h3><Translate id="home.planning.skip.title" description="Column heading: when to skip an increment">Skip the increment</Translate></h3>
        <ul>{SKIP.map(l => <li key={l}>{l}</li>)}</ul>
        <p><Translate id="home.planning.skip.command" description="{command} is the shell command specweave small-fix; keep it as is" values={{command: <code>specweave small-fix "&lt;why&gt;"</code>}}>{'{command} and ship.'}</Translate></p>
      </div>
      <div className={clsx(styles.col, styles.plan)}>
        <h3><Translate id="home.planning.plan.title" description="Column heading: when to plan an increment">Plan an increment</Translate></h3>
        <ul>{PLAN.map(l => <li key={l}>{l}</li>)}</ul>
        <p><Translate id="home.planning.plan.command" description="{command} is the shell command specweave create-increment; keep it as is" values={{command: <code>specweave create-increment "&lt;title&gt;"</code>}}>{'{command}. These win over size.'}</Translate></p>
      </div>
      <p className={styles.source}><Translate id="home.planning.source" description="Source note for the measurement. Keep product names in English">Merged pull requests, SpecWithCode thread records and Claude Code sessions, 6 October to 3 November 2026.</Translate> <Link className={clsx('wv-link', styles.link)} to="/docs/guides/when-to-plan-an-increment"><Translate id="home.planning.source.link" description="Link to the guide with the full measurement">Read the measurement</Translate></Link></p>
    </div>
  </section>;
}
