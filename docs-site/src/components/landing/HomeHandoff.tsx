import React from 'react';
import clsx from 'clsx';
import s from './HomeHandoff.module.css';

/**
 * The homepage's main scroll sequence (#how): four layers of one handoff, joined by an iris spine.
 *   1. The spec      spec.md, written once
 *   2. The agents    a tool claims tasks and proves them
 *   3. The ledger    ledger.jsonl, committed with the code
 *   4. The handoff   handoff, pickup in another tool, done, verify
 * Formats follow the CLI (specweave 3.1.0): criteria as `- [ ] AC-NN: text` under the template's
 * `## Acceptance Criteria` heading (parseSpecAcs in src/core/tasks/verify-runner.ts; template-creator.ts);
 * tasks as `### T-NN Title` plus an `- AC: | Files: | Test:` line;
 * ledger lines as one JSON object each (`t`, `e`, `by`, `at`, plus `evidence` or `note`); `handoff` releases
 * claims with note "handoff" and appends a `"t":"*"` handoff event (src/core/session/work-handoff.ts);
 * `task done --run` cites `reports/task-T-NN.txt` and HEAD (src/cli/commands/task.ts).
 * The increment matches the real pickup output on /product (codex@laptop after claude@cloud).
 * Motion lives only in HomeHandoff.module.css: the spine draws, the layer nodes light, and the handoff
 * node switches from claude@cloud to codex@laptop. The resting state is the final layout.
 */

const SPEC = `## Acceptance Criteria
- [ ] AC-01: Returning within 24 hours restores the cart and shipping choice
- [ ] AC-02: A paid order is never restored

### T-01 Save the cart as a draft
- AC: AC-01 | Files: src/draft.js | Test: npm test

### T-02 Restore the draft on return
- AC: AC-01, AC-02 | Files: src/restore.js | Test: npm test`;

const LEDGER = [
  '{"t":"T-01","e":"claim","by":"claude@cloud","at":"2026-10-15T14:02:11Z"}',
  '{"t":"T-01","e":"done","by":"claude@cloud","at":"2026-10-15T14:31:40Z","evidence":"a41c9e2"}',
  '{"t":"T-02","e":"claim","by":"claude@cloud","at":"2026-10-15T14:32:05Z"}',
  '{"t":"T-02","e":"release","by":"claude@cloud","at":"2026-10-15T14:58:47Z","note":"handoff"}',
  '{"t":"*","e":"handoff","by":"claude@cloud","at":"2026-10-15T14:58:47Z","note":"usage limit"}',
  '{"t":"T-02","e":"claim","by":"codex@laptop","at":"2026-10-15T15:04:19Z"}',
  '{"t":"T-02","e":"done","by":"codex@laptop","at":"2026-10-15T15:22:51Z","evidence":"npm test → exit 0\\nlog: .specweave/increments/0001-resumable-checkout/reports/task-T-02.txt\\nHEAD 7d03b1f"}',
];

export default function HomeHandoff() {
  return <ol className={s.stage} aria-label="Four layers of one handoff">
    <li className={clsx(s.plane, s.spec)}>
      <div className={s.label}>
        <h3>The spec</h3>
        <p>What done means, written once before any agent starts. <code>spec.md</code></p>
      </div>
      <pre className={clsx('wv-code', s.body, s.code)} aria-label="Excerpt of spec.md">{SPEC}</pre>
    </li>

    <li className={clsx(s.plane, s.agents)}>
      <div className={s.label}>
        <h3>The agents</h3>
        <p>Any tool that can read the files claims a task, proves it and moves on.</p>
      </div>
      <ol className={clsx('wv-thread', 'wv-thread--across', s.body, s.thread)}>
        <li>
          <p className="wv-thread__title"><code>specweave task claim T-01</code></p>
          <p className="wv-thread__body">Claude Code takes the first open task. The claim is a line in the ledger, so no other agent takes it too.</p>
        </li>
        <li>
          <p className="wv-thread__title"><code>specweave task done T-01 --run "npm test"</code></p>
          <p className="wv-thread__body">Runs the task’s test. Exit 0 is the evidence, and the full output is saved in <code>reports/task-T-01.txt</code>.</p>
        </li>
        <li aria-current="step">
          <p className="wv-thread__title"><code>specweave task claim T-02</code></p>
          <p className="wv-thread__body">Claude Code claims T-02 and hits its usage limit halfway through.</p>
          <span className={clsx('wv-chip', 'wv-chip--warn', s.chip)}>Usage limit</span>
        </li>
      </ol>
    </li>

    <li className={clsx(s.plane, s.ledger)}>
      <div className={s.label}>
        <h3>The ledger in git</h3>
        <p>Every claim, finish and release is one line, committed with the code. <code>ledger.jsonl</code></p>
      </div>
      <pre className={clsx('wv-code', s.body, s.code, s.ledgerCode)} aria-label="Lines from ledger.jsonl after both agents">{LEDGER.join('\n')}</pre>
    </li>

    <li className={clsx(s.plane, s.handoff)}>
      <div className={s.label}>
        <h3>The handoff</h3>
        <p>Another tool continues from the same files, not from a chat window.</p>
        <p className={s.switch}>
          <span className={s.from}>claude@cloud</span>
          <span className={s.switchRule}><span className={s.srOnly}> hands T-02 to </span></span>
          <span className={s.to}>codex@laptop</span>
        </p>
      </div>
      <ol className={clsx('wv-thread', 'wv-thread--across', s.body, s.thread)}>
        <li>
          <p className="wv-thread__title"><code>specweave handoff</code></p>
          <p className="wv-thread__body">Releases the claim, writes <code>handoff.md</code> with what is next and pushes a snapshot to <code>specweave-handoff</code> and <code>wip/&lt;branch&gt;</code>.</p>
        </li>
        <li>
          <p className="wv-thread__title"><code>specweave pickup</code></p>
          <p className="wv-thread__body">In Codex: fetches the handoff, applies the edits and prints T-02 with its two criteria.</p>
        </li>
        <li>
          <p className="wv-thread__title"><code>specweave task done T-02 --run "npm test"</code></p>
          <p className="wv-thread__body">Codex finishes T-02 against the same criteria, and the ledger cites the test output.</p>
        </li>
        <li aria-current="step">
          <p className="wv-thread__title"><code>specweave verify</code></p>
          <p className="wv-thread__body">Runs test, lint and build, checks every criterion and writes <code>reports/verify.json</code>.</p>
          <span className={clsx('wv-chip', 'wv-chip--pass', s.chip)}>Pass</span>
        </li>
      </ol>
    </li>
  </ol>;
}
