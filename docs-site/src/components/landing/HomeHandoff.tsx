import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import Translate, { translate } from '@docusaurus/Translate';
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

/** Beat labels for the progress rail, in the active locale; called during render. */
function beatLabels(): string[] {
  return [
    translate({ id: 'home.handoff.beat.spec', message: 'The spec', description: 'Progress rail label for beat 1 of the handoff story' }),
    translate({ id: 'home.handoff.beat.agents', message: 'The agents', description: 'Progress rail label for beat 2 of the handoff story' }),
    translate({ id: 'home.handoff.beat.ledger', message: 'The ledger', description: 'Progress rail label for beat 3 of the handoff story' }),
    translate({ id: 'home.handoff.beat.handoff', message: 'The handoff', description: 'Progress rail label for beat 4 of the handoff story' }),
  ];
}

const BEAT_COUNT = 4;

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
      const beat = String(Math.min(BEAT_COUNT - 1, Math.floor(p * BEAT_COUNT)));
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
      const top = window.scrollY + el.getBoundingClientRect().top + ((i + 0.5) / BEAT_COUNT) * range;
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
  return <figure className={s.diagram} aria-label={translate({ id: 'home.handoff.diagram.ariaLabel', message: 'Illustration: Claude Code writes to the repository until its usage limit; Codex reads the same spec, ledger and handoff from git and finishes the task.', description: 'Accessible label of the handoff diagram. Keep product names in English' })}>
    <div className={clsx(s.node, s.claude)} aria-hidden="true">
      <span className={s.plateLight}><img src="/img/studio/providers/claude.svg" alt="" width="22" height="22" /></span>
      <span className={s.nodeText}><strong>Claude Code</strong><span>claude@cloud</span></span>
      <span className={clsx('wv-chip', 'wv-chip--warn', s.limit)}><Translate id="home.handoff.chip.usageLimit" description="Warning chip: the agent hit its usage limit">Usage limit</Translate></span>
    </div>
    <span className={clsx(s.wire, s.w1)} aria-hidden="true"><span className={s.fill} /><span className={s.packet} /></span>
    <div className={clsx(s.node, s.repo)} aria-hidden="true">
      <span className={s.repoTitle}><Translate id="home.handoff.diagram.repo" description="Diagram node title for the git repository">Your repository, in git</Translate></span>
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
      <span className={clsx('wv-chip', 'wv-chip--pass', s.done)}><Translate id="home.handoff.diagram.verifyPass" description="Pass chip in the diagram; 'verify' is the CLI command name, keep it in English">verify: Pass</Translate></span>
    </div>
    <figcaption className={s.tag}><Translate id="home.handoff.diagram.caption" description="Caption marking a picture as an illustration, not a real capture">Illustration</Translate></figcaption>
  </figure>;
}

export default function HomeHandoff({ head }: { head?: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  useStage(root, pin);
  const BEATS = beatLabels();
  return <div className={s.root} ref={root}>
    <div className={s.pin} ref={pin}>
      {head}
      <Diagram />
      <ol className={s.progress} aria-hidden="true">
        {BEATS.map((b, i) => <li key={i} data-n={i}><span className={s.bar} /><span>{String(i + 1).padStart(2, '0')} {b}</span></li>)}
      </ol>
      <ol className={s.beats} aria-label={translate({ id: 'home.handoff.beats.ariaLabel', message: 'Four layers of one handoff', description: 'Accessible label of the list of the four handoff beats' })}>
        <li className={s.beat} data-i="0">
          <div className={s.label}>
            <h3><Translate id="home.handoff.spec.title" description="Heading of beat 1">The spec</Translate></h3>
            <p><Translate id="home.handoff.spec.body" description="Beat 1 text; {file} is the file name spec.md" values={{ file: <code>spec.md</code> }}>{'What done means, written once before any agent starts. {file}'}</Translate></p>
          </div>
          <pre className={clsx('wv-code', s.body, s.code)} aria-label={translate({ id: 'home.handoff.spec.ariaLabel', message: 'Excerpt of spec.md', description: 'Accessible label of the spec.md excerpt; keep the file name' })}>{SPEC}</pre>
        </li>

        <li className={s.beat} data-i="1">
          <div className={s.label}>
            <h3><Translate id="home.handoff.agents.title" description="Heading of beat 2">The agents</Translate></h3>
            <p><Translate id="home.handoff.agents.body" description="Beat 2 text">Any tool that can read the files claims a task, proves it and moves on.</Translate></p>
          </div>
          <ol className={clsx('wv-thread', 'wv-thread--across', s.body, s.thread)}>
            <li style={{ '--k': 0 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task claim T-01</code></p>
              <p className="wv-thread__body"><Translate id="home.handoff.agents.claim" description="Explains specweave task claim T-01. Keep product names in English">Claude Code takes the first open task. The claim is a line in the ledger, so no other agent takes it too.</Translate></p>
            </li>
            <li style={{ '--k': 1 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task done T-01 --run "npm test"</code></p>
              <p className="wv-thread__body"><Translate id="home.handoff.agents.done" description="Explains specweave task done; {file} is a file path" values={{ file: <code>reports/task-T-01.txt</code> }}>{'Runs the task’s test. Exit 0 is the evidence, and the full output is saved in {file}.'}</Translate></p>
            </li>
            <li aria-current="step" style={{ '--k': 2 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task claim T-02</code></p>
              <p className="wv-thread__body"><Translate id="home.handoff.agents.limit" description="Explains the second claim. Keep product names and T-02 in English">Claude Code claims T-02 and hits its usage limit halfway through.</Translate></p>
              <span className={clsx('wv-chip', 'wv-chip--warn', s.chip)}><Translate id="home.handoff.chip.usageLimit" description="Warning chip: the agent hit its usage limit">Usage limit</Translate></span>
            </li>
          </ol>
        </li>

        <li className={s.beat} data-i="2">
          <div className={s.label}>
            <h3><Translate id="home.handoff.ledger.title" description="Heading of beat 3">The ledger in git</Translate></h3>
            <p><Translate id="home.handoff.ledger.body" description="Beat 3 text; {file} is the file name ledger.jsonl" values={{ file: <code>ledger.jsonl</code> }}>{'Every claim, finish and release is one line, committed with the code. {file}'}</Translate></p>
          </div>
          <pre className={clsx('wv-code', s.body, s.code, s.ledgerCode)} tabIndex={0} role="region" aria-label={translate({ id: 'home.handoff.ledger.ariaLabel', message: 'Lines from ledger.jsonl after both agents', description: 'Accessible label of the ledger excerpt; keep the file name' })}>{LEDGER.map((l, i) => <React.Fragment key={i}><span className={s.line} style={{ '--k': i } as React.CSSProperties}>{l}</span>{i < LEDGER.length - 1 ? '\n' : ''}</React.Fragment>)}</pre>
        </li>

        <li className={s.beat} data-i="3">
          <div className={s.label}>
            <h3><Translate id="home.handoff.handoff.title" description="Heading of beat 4">The handoff</Translate></h3>
            <p><Translate id="home.handoff.handoff.body" description="Beat 4 text">Another tool continues from the same files, not from a chat window.</Translate></p>
            <p className={s.switch}>
              <span className={s.from}>claude@cloud</span>
              <span className={s.switchRule}><span className={s.srOnly}>{' '}{translate({ id: 'home.handoff.switch.srOnly', message: 'hands T-02 to', description: 'Screen-reader text between claude@cloud and codex@laptop; keep T-02' })}{' '}</span></span>
              <span className={s.to}>codex@laptop</span>
            </p>
          </div>
          <ol className={clsx('wv-thread', 'wv-thread--across', s.body, s.thread)}>
            <li style={{ '--k': 0 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave handoff</code></p>
              <p className="wv-thread__body"><Translate id="home.handoff.handoff.release" description="Explains specweave handoff; {file} is handoff.md, {ref} and {branch} are git ref names, keep them" values={{ file: <code>handoff.md</code>, ref: <code>specweave-handoff</code>, branch: <code>wip/&lt;branch&gt;</code> }}>{'Releases the claim, writes {file} with what is next and pushes a snapshot to {ref} and {branch}.'}</Translate></p>
            </li>
            <li style={{ '--k': 1 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave pickup</code></p>
              <p className="wv-thread__body"><Translate id="home.handoff.handoff.pickup" description="Explains specweave pickup. Keep Codex and T-02 in English">In Codex: fetches the handoff, applies the edits and prints T-02 with its two criteria.</Translate></p>
            </li>
            <li style={{ '--k': 2 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave task done T-02 --run "npm test"</code></p>
              <p className="wv-thread__body"><Translate id="home.handoff.handoff.done" description="Explains the second task done. Keep Codex and T-02 in English">Codex finishes T-02 against the same criteria, and the ledger cites the test output.</Translate></p>
            </li>
            <li aria-current="step" style={{ '--k': 3 } as React.CSSProperties}>
              <p className="wv-thread__title"><code>specweave verify</code></p>
              <p className="wv-thread__body"><Translate id="home.handoff.handoff.verify" description="Explains specweave verify; {file} is a file path" values={{ file: <code>reports/verify.json</code> }}>{'Runs test, lint and build, checks every criterion and writes {file}.'}</Translate></p>
              <span className={clsx('wv-chip', 'wv-chip--pass', s.chip)}><Translate id="home.handoff.chip.pass" description="Pass chip after a successful verify">Pass</Translate></span>
            </li>
          </ol>
        </li>
      </ol>
    </div>
  </div>;
}
