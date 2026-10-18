import React from 'react';
import clsx from 'clsx';
import s from './HomeHandoff.module.css';

/**
 * The homepage's one scroll sequence (#how): the plan, the record and the agents as offset planes.
 * Formats follow AGENTS.md: tasks as `### T-NN Title` plus an `- AC: | Files: | Test:` line,
 * ledger lines as one JSON object each (`t`, `e`, `by`, `at`, plus `evidence` or `note`).
 * The increment matches the real pickup output shown on /product (codex@laptop after claude@cloud).
 * Motion lives only in HomeHandoff.module.css; the resting state is the final layout.
 */

const SPEC = `## Acceptance criteria
- AC-01: Returning within 24 hours restores the cart and shipping choice
- AC-02: A paid order is never restored

### T-01 Save the cart as a draft
- AC: AC-01 | Files: src/draft.js | Test: npm test

### T-02 Restore the draft on return
- AC: AC-01, AC-02 | Files: src/restore.js | Test: npm test`;

const LEDGER = [
  '{"t":"T-01","e":"claim","by":"claude@cloud","at":"2026-10-15T14:02:11Z"}',
  '{"t":"T-01","e":"done","by":"claude@cloud","at":"2026-10-15T14:31:40Z","evidence":"a41c9e2"}',
  '{"t":"T-02","e":"claim","by":"claude@cloud","at":"2026-10-15T14:32:05Z"}',
  '{"t":"T-02","e":"release","by":"claude@cloud","at":"2026-10-15T14:58:47Z","note":"handoff"}',
  '{"t":"T-02","e":"claim","by":"codex@laptop","at":"2026-10-15T15:04:19Z"}',
];

export default function HomeHandoff() {
  return <div className={s.stage}>
    <div className={clsx(s.plane, s.plan)}>
      <div className={s.label}>
        <h3>The plan</h3>
        <p>What done means, written once. <code>spec.md</code></p>
      </div>
      <pre className={clsx('wv-code', s.code)} aria-label="Excerpt of spec.md">{SPEC}</pre>
    </div>

    <div className={clsx(s.plane, s.record)}>
      <div className={s.label}>
        <h3>The record</h3>
        <p>Who claimed and finished what, appended in git. <code>ledger.jsonl</code></p>
      </div>
      <pre className={clsx('wv-code', s.code)} aria-label="Lines from ledger.jsonl">{LEDGER.join('\n')}</pre>
    </div>

    <div className={clsx(s.plane, s.agents)}>
      <div className={s.label}>
        <h3>The agents</h3>
        <p>Any tool that can read the files.</p>
      </div>
      <ol className={clsx('wv-thread', 'wv-thread--across', s.thread)}>
        <li>
          <p className="wv-thread__title">Claude Code</p>
          <p className="wv-thread__body">Hits its usage limit halfway through T-02.</p>
          <span className={clsx('wv-chip', 'wv-chip--warn', s.chip)}>Usage limit</span>
        </li>
        <li>
          <p className="wv-thread__title"><code>specweave handoff</code></p>
          <p className="wv-thread__body">Releases the claim, records why and what is next, pushes the branch and uncommitted edits.</p>
        </li>
        <li>
          <p className="wv-thread__title"><code>specweave pickup</code></p>
          <p className="wv-thread__body">Fetches the handoff, applies the edits and prints T-02 with its criteria.</p>
        </li>
        <li aria-current="step">
          <p className="wv-thread__title">Codex</p>
          <p className="wv-thread__body">Claims T-02 and finishes it against the same two criteria.</p>
          <span className={clsx('wv-chip', 'wv-chip--pass', s.chip)}>Working on T-02</span>
        </li>
      </ol>
    </div>
  </div>;
}
