import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ContinuityBoard from '../components/sections/ContinuityBoard';
import styles from './continuity.module.css';
import s from './product.module.css';
import { ProductMap } from '../components/ecosystem/Architecture';

// Real output from a second clone running as Codex, after Claude Code handed off.
// The second value marks the line to highlight (the next task).
const pickupLines: Array<[string, boolean?]> = [
  ['Picked up the handoff from claude@cloud (out of tokens): applied 7 uncommitted files.'],
  ['SpecWeave pickup · you are codex@laptop'],
  ['Increment 0001-resumable-checkout "Resumable checkout" (active) · tasks 1/2 done'],
  ['Next: T-02 Restore the draft on return', true],
  ['  AC-01: Returning within 24 hours restores the cart and shipping choice'],
  ['  AC-02: A paid order is never restored'],
  ['  Files: src/restore.js | Test: npm test'],
  ['Branch: main · in sync with origin/main · 3 uncommitted files'],
  ['Last handoff: claude@cloud: out of tokens · next: finish restore on return'],
  ['Notes:'],
  ['- claude@cloud: Payment thread: drafts must never store card data'],
];

const handoffOutput = [
  'Handed off (pushed your uncommitted edits).',
  'To continue in any tool, machine or account, say "pick up" there (or run `specweave pickup`).',
  'Details: .handoff/HANDOFF.md',
].join('\n');

function Prompt({ children }: { children: string }) {
  return <><span className="wv-dim">$ </span>{children}{'\n'}</>;
}

function PickupOutput({ lines }: { lines: typeof pickupLines }) {
  return <>{lines.map(([text, hl], i) => <React.Fragment key={i}>{hl ? <span className="wv-hl">{text}</span> : text}{i < lines.length - 1 ? '\n' : ''}</React.Fragment>)}</>;
}

const records = [
  { file: 'spec.md', title: 'What done means', body: 'Problem, scope, numbered acceptance criteria, approach and tasks. Each task names the criteria it covers, the files it owns and the test that proves it.', note: 'You read it before code is written.' },
  { file: 'ledger.jsonl', title: 'What actually happened', body: 'Append-only claims, completions with the commit and the real test output, notes between threads, and every handoff. A criterion is met when every task covering it is done.', note: 'Evidence, not a checkbox.' },
  { file: 'handoff.md', title: 'Where you stopped', body: 'The reason, the next step, open questions and your work in progress, pushed to a wip branch that a cloud thread or another machine can fetch.', note: 'Picked up in one read.' },
];

export default function Product() {
  return <Layout title="How SpecWeave works" description="SpecWeave keeps a short spec, an append-only task ledger and a portable handoff in your repository, so any coding agent, account or model can continue the work.">
    <main className={styles.page}>
      <section className={`${styles.hero} ${s.hero}`}>
        <div className={styles.heroText}>
          <h1>The work outlives the session.</h1>
          <p className={styles.lead}>Your agent writes the code. SpecWeave keeps what done means, what actually happened and where you stopped, as plain files in git. Any tool, any account and any model can read them, and <Link className={s.inlineLink} to="/code/">SpecWithCode</Link> can read its project plans from them.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} to="/docs/getting-started">Start in your project</Link>
            <Link className={styles.textLink} to="/docs/overview/how-it-works">How it works, with diagrams</Link>
          </div>
        </div>
        <figure className={s.heroCode}>
          <pre className={`wv-code ${s.terminal}`} aria-label="Output of specweave pickup in a second clone running as Codex"><Prompt>specweave pickup</Prompt><PickupOutput lines={pickupLines} /></pre>
          <figcaption className={s.caption}>Real output from a second clone running as Codex, after Claude Code handed off.</figcaption>
        </figure>
      </section>

      <section className={`${styles.section} ${s.ruled}`}>
        <div className={styles.sectionHeading}><h2>Three records and a clear place to start</h2><p>The agent reads a short spec. The CLI appends task events and evidence to the ledger. Git review and access controls protect the history; these ordinary files are not a tamper-proof audit system.</p></div>
        <ul className={s.records}>
          {records.map(r => <li key={r.file}>
            <code className={s.file}>{r.file}</code>
            <div><h3>{r.title}</h3><p>{r.body}</p><span className={s.recordNote}>{r.note}</span></div>
          </li>)}
        </ul>
      </section>

      <section className={`${styles.section} ${styles.handoffSection}`}>
        <div>
          <h2>Out of tokens is not the end</h2>
          <p className={styles.leadSmall}>Say "hand off" in the tool you are leaving and "pick up where I left off" in the next one. Codex can continue what Claude Code started, and a second subscription can continue the first. Nothing is copied between tools; the handoff is a commit and a ledger event.</p>
          <Link className={styles.textLink} to="/docs/guides/cross-tool-handoff">Handoff and pickup in detail</Link>
        </div>
        <div className={s.handoff}>
          <div className={s.machine}>
            <p className={s.machineLabel}>Leaving: Claude Code, as claude@cloud</p>
            <pre className={`wv-code ${s.terminal}`} aria-label="specweave handoff in the session being left"><Prompt>specweave handoff --reason "out of tokens"</Prompt>{handoffOutput}</pre>
          </div>
          <div className={s.connector}>
            <span className={s.connectorLine} aria-hidden="true" />
            <p>A handoff commit and <code>wip/main</code> on your remote, plus a handoff event in the ledger</p>
          </div>
          <div className={s.machine}>
            <p className={s.machineLabel}>Arriving: Codex, as codex@laptop</p>
            <pre className={`wv-code ${s.terminal}`} aria-label="specweave pickup in the next tool"><Prompt>specweave pickup</Prompt><PickupOutput lines={pickupLines.slice(0, 4)} /></pre>
          </div>
          <p className={s.caption}>Both terminals show real CLI output: the handoff from the session being left, the pickup from a second clone running as Codex.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.connectionSection}`}>
        <div>
          <h2>One thread, one increment</h2>
          <p>A SpecWithCode worker or a Claude Code Projects thread works on one branch and opens one pull request, which is exactly an increment's shape. A SpecWithCode project plan can read the increment directly, and a thread's checklist is the increment's task list. Threads leave each other notes in the ledger instead of editing each other's files, and decisions go into a committed memory folder in the same format as project memory, so they reach another account and another tool.</p>
          <Link className={styles.textLink} to="/docs/guides/claude-code-projects">Claude Code Projects guide</Link>
        </div>
        <figure className={`wv-window ${s.window}`}>
          <div className="wv-window__bar"><span>SpecWithCode</span><span>Worker thread</span></div>
          <img src="/img/studio/flow-worker-claude-20261015.webp" alt="A SpecWithCode worker thread reporting its outcome, the command it ran with the output it printed, no blockers, and two changed files" width="691" height="797" loading="lazy" />
          <figcaption>A worker thread reports its outcome, its evidence and the files it changed.</figcaption>
        </figure>
      </section>

      <section className={`${styles.section} ${s.ruled}`}>
        <div className={styles.sectionHeading}><h2>A board you can inspect</h2><p>The dashboard reads the same files: intents, increments, claims and evidence. Reading it needs no model call. Moving a card is planning; only verification closes work.</p></div>
        <ContinuityBoard />
        <p className={styles.caption}>What the files say about the example increment above, from the same <code>specweave pickup</code> run. Run <code>specweave dashboard</code> in your project to see yours.</p>
      </section>

      <section className={`${styles.section} ${s.ruled}`}>
        <div className={styles.sectionHeading}><h2>Less to carry in 3.0</h2><p>Measured on a real project before and after the redesign.</p></div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th scope="col">What</th><th scope="col">In 3.0</th><th scope="col">Details</th></tr></thead>
            <tbody>
              <tr><th scope="row">Instructions</th><td>About 760 tokens</td><td><code>AGENTS.md</code> is the one instruction file every tool reads, and <code>CLAUDE.md</code> imports it. In 2.x the same rules were written twice, about 3,300 tokens together.</td></tr>
              <tr><th scope="row">Per task</th><td>A few lines</td><td><code>task next</code> prints one task with the text of its criteria, so the agent stops rereading the whole spec for every task. No <code>tasks.md</code> to rewrite.</td></tr>
              <tr><th scope="row">Code</th><td>A third removed</td><td>Everything no command reached, and the commands nobody called, are gone. Issues are only created when you run <code>sync push</code>.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${styles.section} ${s.last}`}>
        <div className={styles.sectionHeading}><h2>One ecosystem, distinct jobs</h2><p>SpecWithCode is where you work, the CLI keeps the record and Verified Skill brings the skills.</p></div>
        <ProductMap />
        <Link className={styles.textLink} to="/docs/overview/studio-architecture">Read the architecture</Link>
      </section>

      <section className={styles.finalCta}>
        <h2>Write down what done means, then switch tools freely</h2>
        <Link className={styles.primary} to="/docs/getting-started">Quick start</Link>
        <Link className={styles.textLink} to="/docs/guides/specweave-3">What changed in 3.0</Link>
      </section>
    </main>
  </Layout>;
}
