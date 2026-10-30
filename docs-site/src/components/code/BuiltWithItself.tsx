import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {GitMerge} from 'lucide-react';
import styles from './BuiltWithItself.module.css';

/*
  "SpecWithCode is built with SpecWithCode", shared by /code and the home page.
  Numbers come from the thread records (orchestration_v2_projection_threads, pullRequests with
  source "agent" and state "merged", repository anton-abyzov/specwithcode-dev) on the maintainer's
  main Mac, read on 30 October 2026; merges ran from 10 to 29 October 2026. A pull request linked
  by two threads counts once in the total and once per provider below it.
  The screenshot is a crop of the 1144 handoff E2E capture (30-worker-thread-on-ministorm.png),
  with the sidebar (account and personal chats) cut away.
*/

const STATS: {value: string; label: string}[] = [
  {value: '367', label: 'pull requests to SpecWithCode opened by worker threads and merged, 10 to 29 October 2026'},
  {value: '164', label: 'worker threads behind them: 97 on Claude Code, 65 on Codex, the rest on Gemini CLI and Copilot'},
  {value: '2,473', label: 'threads on the maintainer’s main Mac since 9 October, across six projects'},
];

const MERGED: {n: number; title: string; agent: string}[] = [
  {n: 961, title: 'Keep user goals open beyond completed source milestones', agent: 'Codex'},
  {n: 954, title: 'Skills in this session popover in the composer', agent: 'Gemini CLI'},
  {n: 927, title: 'Prefer Connect fleet routes and support unlimited account capacity', agent: 'Codex'},
  {n: 880, title: 'Point the thread machine chip at Hand off to', agent: 'Claude Code'},
  {n: 873, title: 'Ask on return by default; idle compaction opt-in', agent: 'Claude Code'},
  {n: 837, title: 'PPTX artifacts open with a slide preview', agent: 'Claude Code'},
];

const SHOT = '/img/studio/built-with-itself-ministorm-20261030.webp';

export default function BuiltWithItself({id = 'built-with-itself', more = true}: {id?: string; more?: boolean}) {
  const titleId = `${id}-title`;
  return <section className={styles.band} id={id} aria-labelledby={titleId}>
    <div className={styles.top}>
      <div className={styles.copy}>
        <p className={styles.kicker}>SpecWithCode · free, early access</p>
        <h2 id={titleId}>SpecWithCode is built with SpecWithCode</h2>
        <p className={styles.lead}>We build the app in the app. A coordinator keeps each project’s brief, worker threads on Claude Code, Codex and other agents write the changes and open the pull requests, and the work runs across a Mac and a Linux worker joined over SpecWithCode Connect.</p>
        <dl className={styles.stats}>
          {STATS.map(s => <div key={s.value}><dt>{s.value}</dt><dd>{s.label}</dd></div>)}
        </dl>
        <p className={styles.source}>Counted from the app’s own thread records on 30 October 2026.</p>
      </div>
      <figure className={clsx('wv-window', styles.shot)}>
        <div className="wv-window__bar"><span>SpecWithCode</span><span>Mac coordinator, Linux worker</span></div>
        <a href={SHOT} aria-label="Open the full-size screenshot of a worker thread on ministorm">
          <img src={SHOT} width={1238} height={760} loading="lazy" decoding="async" alt="Actual SpecWithCode project: the coordinator on the m4 Mac starts the Ministorm e2e proof thread on ministorm, a Linux machine; the worker replies with uname output Linux ministorm 7.0.0-38-generic x86_64 and Hello, ministorm, and saves e2e-proof.txt" />
        </a>
        <figcaption>Real capture, 30 October 2026, from our end-to-end test. The coordinator on the Mac starts a worker on ministorm, a Linux machine, and the worker reports from there. When Claude Code reached its limit, the coordinator carried on with Grok.</figcaption>
      </figure>
    </div>
    <div className={styles.merged}>
      <h3><GitMerge size={18} strokeWidth={1.5} aria-hidden="true" />Recently merged from threads</h3>
      <ol aria-label="Pull requests merged from worker threads">
        {MERGED.map(m => <li key={m.n}>
          <span className={styles.prNo}>#{m.n}</span>
          <span className={styles.prTitle}>{m.title}</span>
          <span className={styles.agent}>{m.agent} thread</span>
          <span className={styles.state}>Merged</span>
        </li>)}
      </ol>
      <p className={styles.source}>From the thread records: each pull request was opened and linked by the worker thread named beside it. They land in our development repository; the public <a className={clsx('wv-link', styles.link)} href="https://github.com/anton-abyzov/specwithcode">source repository</a> gets regular snapshots.</p>
    </div>
    {more && <p className={styles.more}><Link className={clsx('wv-link', styles.link)} to="/code/#built-with-itself">See how SpecWithCode builds itself</Link></p>}
  </section>;
}
