import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ContinuityBoard from '../components/sections/ContinuityBoard';
import styles from './continuity.module.css';

const pickupOutput = `Picked up the handoff from claude@cloud (out of tokens): applied 7 uncommitted files.
SpecWeave pickup · you are codex@laptop
Increment 0001-resumable-checkout "Resumable checkout" (active) · tasks 1/2 done
Next: T-02 Restore the draft on return
  AC-01: Returning within 24 hours restores the cart and shipping choice
  AC-02: A paid order is never restored
  Files: src/restore.js | Test: npm test
Branch: main · in sync with origin/main · 3 uncommitted files
Last handoff: claude@cloud: out of tokens · next: finish restore on return
Notes:
- claude@cloud: Payment thread: drafts must never store card data`;

export default function Product() {
  return <Layout title="How SpecWeave works" description="SpecWeave keeps a short spec, an append-only task ledger and a portable handoff in your repository, so any coding agent, account or model can continue the work.">
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}><span className={styles.orangeDot} />Product / SpecWeave 3.0</span>
          <h1>The work outlives<br /><em>the session.</em></h1>
          <p className={styles.lead}>Your agent writes the code. SpecWeave keeps what done means, what actually happened and where you stopped, as plain files in git. Any tool, any account and any model can read them.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} to="/docs/getting-started">Start in your project <span aria-hidden="true">↗</span></Link>
            <Link className={styles.textLink} to="/docs/overview/how-it-works">How it works, with diagrams</Link>
          </div>
        </div>
        <figure className={styles.heroArt}>
          <img src="/img/v3/lean.webp" alt="A single burnt-orange ribbon threaded through a few sheets of paper" width="2000" height="762" loading="eager" />
          <figcaption className={styles.artCaption}><span>ONE FILE PER INCREMENT</span><span>spec.md, ledger.jsonl, handoff.md</span></figcaption>
        </figure>
      </section>

      <section className={`${styles.section} ${styles.layerSection}`}>
        <div className={styles.sectionHeading}><h2>Three records.<br /><em>Nothing else to read.</em></h2><p>The agent reads a short spec and edits it. The CLI appends everything else, so the record cannot be tidied up afterwards and no tokens go on bookkeeping.</p></div>
        <div className={styles.layers}>
          <article><span className={styles.layerNumber}>01 / spec.md</span><h3>What done means</h3><p>Problem, scope, numbered acceptance criteria, approach and tasks. Each task names the criteria it covers, the files it owns and the test that proves it.</p><span>You read it before code is written.</span></article>
          <article><span className={styles.layerNumber}>02 / ledger.jsonl</span><h3>What actually happened</h3><p>Append-only claims, completions with the commit and the real test output, notes between threads, and every handoff. A criterion is met when every task covering it is done.</p><span>Evidence, not a checkbox.</span></article>
          <article><span className={styles.layerNumber}>03 / handoff</span><h3>Where you stopped</h3><p>The reason, the next step, open questions and your work in progress, pushed to a wip branch that a cloud thread or another machine can fetch.</p><span>Picked up in one read.</span></article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.handoffSection}`}>
        <div>
          <span className={styles.eyebrow}>Switch tools / keep your place</span>
          <h2>Out of tokens is<br /><em>not the end.</em></h2>
          <p className={styles.leadSmall}>Say "hand off" in the tool you are leaving and "pick up where I left off" in the next one. Codex can continue what Claude Code started, and a second subscription can continue the first. Nothing is copied between tools; the handoff is a commit and a ledger event.</p>
          <Link className={styles.textLink} to="/docs/guides/cross-tool-handoff">Handoff and pickup in detail ↗</Link>
        </div>
        <div className={styles.handoffPanel}>
          <div className={styles.handoffStep}><span>1</span><div><b>Leave</b><p>Releases your claims, records why and what is next, pushes your branch and uncommitted edits.</p><code>specweave handoff</code></div></div>
          <div className={styles.handoffStep}><span>2</span><div><b>Arrive</b><p>Fetches the handoff, applies your edits, prints the next task with its criteria.</p><code>specweave pickup</code></div></div>
          <pre className={styles.pickupOut} aria-label="Real pickup output in a second clone running as Codex">{pickupOutput}</pre>
          <small>Real output from a second clone running as Codex, after Claude Code handed off.</small>
        </div>
      </section>

      <section className={`${styles.section} ${styles.connectionSection}`}>
        <div>
          <span className={styles.eyebrow}>Claude Code Projects / parallel threads</span>
          <h2>One thread,<br /><em>one increment.</em></h2>
          <p>A thread works on one branch and opens one pull request, which is exactly an increment's shape. The thread's checklist is the increment's task list. Threads leave each other notes in the ledger instead of editing each other's files, and decisions go into a committed memory folder in the same format as project memory, so they reach another account and another tool.</p>
          <Link className={styles.textLink} to="/docs/guides/claude-code-projects">Claude Code Projects guide ↗</Link>
        </div>
        <figure className={styles.figure}>
          <img src="/img/v3/threads.webp" alt="Several ribbons passing through shared paper frames, each on its own path" width="2000" height="762" loading="lazy" />
        </figure>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><h2>A board you can<br /><em>inspect.</em></h2><p>The dashboard reads the same files: intents, increments, claims and evidence. Reading it needs no model call. Moving a card is planning; only verification closes work.</p></div>
        <ContinuityBoard />
        <p className={styles.caption}>Illustrative board. Run <code>specweave dashboard</code> in your project for the real one.</p>
      </section>

      <section className={`${styles.section} ${styles.layerSection}`}>
        <div className={styles.sectionHeading}><h2>Less to carry<br /><em>in 3.0.</em></h2><p>Measured on a real project before and after the redesign.</p></div>
        <div className={styles.layers}>
          <article><span className={styles.layerNumber}>Instructions</span><h3>About 760 tokens</h3><p>AGENTS.md is the one instruction file every tool reads. CLAUDE.md imports it. In 2.x the same rules were written twice, about 3,300 tokens together.</p><span>Read once, by every tool.</span></article>
          <article><span className={styles.layerNumber}>Per task</span><h3>A few lines</h3><p>task next prints one task with the text of its criteria, so the agent stops rereading the whole spec for every task.</p><span>No tasks.md to rewrite.</span></article>
          <article><span className={styles.layerNumber}>Code</span><h3>A third removed</h3><p>Everything no command reached, and the commands nobody called, are gone. Issues are only created when you run sync push.</p><span>Nothing behind your back.</span></article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Write down what done means.<br /><em>Then switch tools freely.</em></h2>
        <Link className={styles.primary} to="/docs/getting-started">Quick start <span aria-hidden="true">↗</span></Link>
        <Link className={styles.textLink} to="/docs/guides/specweave-3">What changed in 3.0</Link>
      </section>
    </main>
  </Layout>;
}
