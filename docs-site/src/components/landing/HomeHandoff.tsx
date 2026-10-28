import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import s from './HomeHandoff.module.css';

/**
 * The homepage's pinned stage (#how): one handoff told in four beats over a drawn diagram.
 *   1. The spec      spec.md, written once
 *   2. The agents    a tool claims tasks and proves them, then hits its usage limit
 *   3. The ledger    ledger.jsonl, committed with the code (lines type in)
 *   4. The handoff   handoff, pickup in another tool, done, verify
 * Formats follow the CLI (specweave 3.1.0): criteria as `- [ ] AC-NN: text` under the template's
 * `## Acceptance Criteria` heading (parseSpecAcs in src/core/tasks/verify-runner.ts; template-creator.ts);
 * tasks as `### T-NN Title` plus an `- AC: | Files: | Test:` line;
 * ledger lines as one JSON object each (`t`, `e`, `by`, `at`, plus `evidence` or `note`); `handoff` releases
 * claims with note "handoff" and appends a `"t":"*"` handoff event (src/core/session/work-handoff.ts);
 * `task done --run` cites `reports/task-T-NN.txt` and HEAD (src/cli/commands/task.ts).
 * The increment matches the real pickup output on /product (codex@laptop after claude@cloud).
 *
 * Rendering: the server output (no JS), phones, short windows and reduced motion get the static
 * layout: the diagram in its final state and the four beats one under another. On wide screens with
 * motion allowed, the hook below sets data-live and data-beat on the root; the stage then pins
 * (position: sticky) while the page scrolls ~65vh per beat, and only the current beat shows.
 * Pinning keeps DOM order, so focus order is unchanged; focusing inside a beat scrolls to it.
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

const BEATS = ['The spec', 'The agents', 'The ledger', 'The handoff'];

// Very tall viewports (full-page captures, which grow the viewport to the page) get the static layout.
const LIVE_QUERY = '(min-width: 960px) and (min-height: 680px) and (max-height: 1600px) and (prefers-reduced-motion: no-preference)';

/** Pins the stage and tracks the current beat from scroll progress. Writes data attributes only. */
function useStage(root: React.RefObject<HTMLDivElement | null>, pin: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    const stage = pin.current;
    if (!el || !stage || typeof window === 'undefined') return;
    const mq = window.matchMedia(LIVE_QUERY);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const range = el.offsetHeight - stage.offsetHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / range)) : 1;
      const beat = String(Math.min(BEATS.length - 1, Math.floor(p * BEATS.length)));
      if (el.dataset.beat !== beat) el.dataset.beat = beat;
      el.style.setProperty('--progress', p.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const onFocus = (e: FocusEvent) => {
      const li = (e.target as Element).closest<HTMLElement>('[data-i]');
      if (!li || !('live' in el.dataset)) return;
      const i = Number(li.dataset.i);
      if (el.dataset.beat === String(i)) return;
      const range = el.offsetHeight - stage.offsetHeight;
      const top = window.scrollY + el.getBoundingClientRect().top + ((i + 0.5) / BEATS.length) * range;
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
    };
    const setup = () => {
      if (mq.matches) {
        el.dataset.live = '';
        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
      } else {
        delete el.dataset.live;
        delete el.dataset.beat;
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };
    setup();
    mq.addEventListener('change', setup);
    el.addEventListener('focusin', onFocus);
    return () => {
      mq.removeEventListener('change', setup);
      el.removeEventListener('focusin', onFocus);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root, pin]);
}

function Diagram() {
  return <figure className={s.diagram} aria-label="Illustration: Claude Code writes to the repository until its usage limit; Codex reads the same spec, ledger and handoff from git and finishes the task.">
    <div className={clsx(s.node, s.claude)} aria-hidden="true">
      <span className={s.plateLight}><img src="/img/studio/providers/claude.svg" alt="" width="22" height="22" /></span>
      <span className={s.nodeText}><strong>Claude Code</strong><span>claude@cloud</span></span>
      <span className={clsx('wv-chip', 'wv-chip--warn', s.limit)}>Usage limit</span>
    </div>
    <span className={clsx(s.wire, s.w1)} aria-hidden="true"><span className={s.fill} /><span className={s.packet} /></span>
    <div className={clsx(s.node, s.repo)} aria-hidden="true">
      <span className={s.repoTitle}>Your repository, in git</span>
      <span className={s.files}>
        <span className={s.file} data-f="spec">spec.md</span>
        <span className={s.file} data-f="ledger">ledger.jsonl</span>
        <span className={s.file} data-f="handoff">handoff.md</span>
      </span>
    </div>
    <span className={clsx(s.wire, s.w2)} aria-hidden="true"><span className={s.fill} /><span className={s.packet} /></span>
    <div className={clsx(s.node, s.codex)} aria-hidden="true">
      <span className={s.plateDark}><img src="/img/studio/providers/openai.svg" alt="" width="22" height="22" /></span>
      <span className={s.nodeText}><strong>Codex</strong><span>codex@laptop</span></span>
      <span className={clsx('wv-chip', 'wv-chip--pass', s.done)}>verify: Pass</span>
    </div>
    <figcaption className={s.tag}>Illustration</figcaption>
  </figure>;
}

export default function HomeHandoff({ head }: { head?: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  useStage(root, pin);
  return <div className={s.root} ref={root}>
    <div className={s.pin} ref={pin}>
      {head}
      <Diagram />
      <ol className={s.progress} aria-hidden="true">
        {BEATS.map((b, i) => <li key={b} data-n={i}><span className={s.bar} /><span>{String(i + 1).padStart(2, '0')} {b}</span></li>)}
      </ol>
      <ol className={s.beats} aria-label="Four layers of one handoff">
        <li className={s.beat} data-i="0">
          <div className={s.label}>
            <h3>The spec</h3>
            <p>What done means, written once before any agent starts. <code>spec.md</code></p>
          </div>
          <pre className={clsx('wv-code', s.body, s.code)} aria-label="Excerpt of spec.md">{SPEC}</pre>
        </li>

        <li className={s.beat} data-i="1">
          <div className={s.label}>
            <h3>The agents</h3>
            <p>Any tool that can read the files claims a task, proves it and moves on.</p>
          </div>
          <ol className={clsx('wv-thread', 'wv-thread--across', s.body, s.thread)}>
            <li style={{ '--k': 0 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task claim T-01</code></p>
              <p className="wv-thread__body">Claude Code takes the first open task. The claim is a line in the ledger, so no other agent takes it too.</p>
            </li>
            <li style={{ '--k': 1 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task done T-01 --run "npm test"</code></p>
              <p className="wv-thread__body">Runs the task’s test. Exit 0 is the evidence, and the full output is saved in <code>reports/task-T-01.txt</code>.</p>
            </li>
            <li aria-current="step" style={{ '--k': 2 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task claim T-02</code></p>
              <p className="wv-thread__body">Claude Code claims T-02 and hits its usage limit halfway through.</p>
              <span className={clsx('wv-chip', 'wv-chip--warn', s.chip)}>Usage limit</span>
            </li>
          </ol>
        </li>

        <li className={s.beat} data-i="2">
          <div className={s.label}>
            <h3>The ledger in git</h3>
            <p>Every claim, finish and release is one line, committed with the code. <code>ledger.jsonl</code></p>
          </div>
          <pre className={clsx('wv-code', s.body, s.code, s.ledgerCode)} tabIndex={0} role="region" aria-label="Lines from ledger.jsonl after both agents">{LEDGER.map((l, i) => <React.Fragment key={i}><span className={s.line} style={{ '--k': i } as React.CSSProperties}>{l}</span>{i < LEDGER.length - 1 ? '\n' : ''}</React.Fragment>)}</pre>
        </li>

        <li className={s.beat} data-i="3">
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
            <li style={{ '--k': 0 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave handoff</code></p>
              <p className="wv-thread__body">Releases the claim, writes <code>handoff.md</code> with what is next and pushes a snapshot to <code>specweave-handoff</code> and <code>wip/&lt;branch&gt;</code>.</p>
            </li>
            <li style={{ '--k': 1 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave pickup</code></p>
              <p className="wv-thread__body">In Codex: fetches the handoff, applies the edits and prints T-02 with its two criteria.</p>
            </li>
            <li style={{ '--k': 2 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task done T-02 --run "npm test"</code></p>
              <p className="wv-thread__body">Codex finishes T-02 against the same criteria, and the ledger cites the test output.</p>
            </li>
            <li aria-current="step" style={{ '--k': 3 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave verify</code></p>
              <p className="wv-thread__body">Runs test, lint and build, checks every criterion and writes <code>reports/verify.json</code>.</p>
              <span className={clsx('wv-chip', 'wv-chip--pass', s.chip)}>Pass</span>
            </li>
          </ol>
        </li>
      </ol>
    </div>
  </div>;
}
