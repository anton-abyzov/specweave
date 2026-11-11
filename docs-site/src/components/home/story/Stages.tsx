import React from 'react';
import clsx from 'clsx';
import Translate, { translate } from '@docusaurus/Translate';
import { ArrowRight, Circle, CircleCheck, FileText, GitBranch, LoaderCircle } from 'lucide-react';
import { useSteps } from './useSteps';
import { GATE_TIMES, HANDOFF_TIMES, INCREMENT, LEDGER, LEDGER_TIMES, PICKUP, PLAN_TIMES, SPEC_LINES, TITLE, VERIFY_LINES, type LedgerLine, type SpecLine } from './data';
import s from './story.module.css';

/*
  The four stages of #how. Each one plays a list of steps while it is on screen (useSteps) and is
  drawn from the step number alone; story.module.css does the motion. An element that a step has
  reached carries data-on="1" ("0" before that, which hides it in place). Without data-live (server render, no JavaScript, off screen, reduced
  motion) every step has been reached and nothing animates, so the resting picture is complete.
  The moving picture is hidden from assistive technology; each figure has a label that says what
  it shows, and the copy beside it carries the explanation.
*/

const on = (reached: boolean) => (reached ? '1' : '0');
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

export type Agent = 'claude' | 'codex' | 'cursor' | 'gemini' | 'copilot' | 'opencode' | 'grok' | 'antigravity';

/** Logo file and whether the mark is light (needs the dark plate in both themes). */
export const AGENTS: Record<Agent, { name: string; file: string; plate?: 'dark' | 'light' }> = {
  claude: { name: 'Claude Code', file: 'claude' },
  codex: { name: 'Codex', file: 'openai', plate: 'dark' },
  cursor: { name: 'Cursor', file: 'cursor', plate: 'dark' },
  gemini: { name: 'Gemini CLI', file: 'gemini' },
  copilot: { name: 'GitHub Copilot CLI', file: 'copilot', plate: 'dark' },
  opencode: { name: 'OpenCode', file: 'opencode', plate: 'light' },
  grok: { name: 'Grok', file: 'grok', plate: 'dark' },
  antigravity: { name: 'Antigravity', file: 'antigravity' },
};

export function Mark({ who, size = 18 }: { who: Agent; size?: number }) {
  const a = AGENTS[who];
  return <span className={clsx(s.mark, a.plate === 'dark' && s.markDark, a.plate === 'light' && s.markLight)}><img src={`/img/studio/providers/${a.file}.svg?v=2`} alt="" width={size} height={size} loading="lazy" decoding="async" /></span>;
}

type Stage = ReturnType<typeof useSteps<HTMLElement>>;

function Frame({ stage, total, label, file, children }: { stage: Stage; total: number; label: string; file: React.ReactNode; children: React.ReactNode }) {
  return <figure ref={stage.ref} className={s.stage} data-live={stage.live ? '' : undefined} aria-label={label} style={{ '--p': stage.step / total } as React.CSSProperties}>
    <div className={s.bar} aria-hidden="true">
      <span className={s.file}>{file}</span>
      <span className={s.track}><span /></span>
    </div>
    <div className={s.body} aria-hidden="true">{children}</div>
    <figcaption className={s.tag}><Translate id="home.handoff.diagram.caption" description="Caption marking a picture as an illustration, not a real capture">Illustration</Translate></figcaption>
  </figure>;
}

function Cmd({ reached, children, d = 0 }: { reached: boolean; children: React.ReactNode; d?: number }) {
  return <p className={s.cmd} data-on={on(reached)} style={delay(d)}><span className={s.prompt}>$</span><span className={s.typed}>{children}</span></p>;
}

/* ---------- 1. The plan: spec.md is written ---------- */

function specLine(l: SpecLine): React.ReactNode {
  if (l.kind === 'h1' || l.kind === 'h2') {
    const cut = l.text.indexOf(' ');
    return <><i>{l.text.slice(0, cut + 1)}</i><b>{l.text.slice(cut + 1)}</b></>;
  }
  if (l.kind === 'ac') {
    const m = /^(- \[ \] )(AC-\d+)(: .*)$/.exec(l.text);
    return m ? <><i>{m[1]}</i><em>{m[2]}</em>{m[3]}</> : l.text;
  }
  if (l.kind === 'task') {
    const m = /^(### )(T-\d+)( .*)$/.exec(l.text);
    return m ? <><i>{m[1]}</i><em>{m[2]}</em><b>{m[3]}</b></> : l.text;
  }
  return l.text.split(/(AC-\d+)/).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part));
}

// Lines of one step type one after another.
const SPEC_ORDER = SPEC_LINES.map((l, i) => SPEC_LINES.slice(0, i).filter((p) => p.at === l.at && p.kind !== 'gap').length);

export function PlanStage() {
  const stage = useSteps<HTMLElement>(PLAN_TIMES);
  const { step } = stage;
  const criteria = step >= 4 ? 2 : step >= 3 ? 1 : 0;
  const tasks = step >= 6 ? 2 : step >= 5 ? 1 : 0;
  return <Frame stage={stage} total={PLAN_TIMES.length} file={<><FileText size={14} strokeWidth={2} />spec.md</>}
    label={translate({ id: 'home.story.plan.ariaLabel', message: 'Illustration: specweave create-increment writes spec.md with two acceptance criteria, AC-01 and AC-02, and two tasks, T-01 and T-02, each naming its criteria, files and test.', description: 'Accessible label of the animated plan illustration. Keep command, file and id names in English' })}>
    <Cmd reached={step >= 1}>specweave create-increment "{TITLE}"</Cmd>
    <div className={s.editor} data-on={on(step >= 2)}>
      {SPEC_LINES.map((l, i) => <span key={i} className={clsx(s.ln, s[`k_${l.kind}`])} data-on={on(step >= l.at)} style={delay(SPEC_ORDER[i] * 420)}><span className={s.typed}>{specLine(l)}</span></span>)}
    </div>
    <ul className={s.counts}>
      <li data-on={on(criteria > 0)}><b key={criteria}>{criteria}</b><Translate id="home.story.count.criteria" description="Counter label in the plan illustration: number of acceptance criteria">Criteria</Translate></li>
      <li data-on={on(tasks > 0)}><b key={tasks}>{tasks}</b><Translate id="home.story.count.tasks" description="Counter label in the plan illustration: number of tasks">Tasks</Translate></li>
      <li data-on={on(tasks > 0)}><b key={tasks}>{tasks}</b><Translate id="home.story.count.tests" description="Counter label in the plan illustration: number of tests named by tasks">Tests</Translate></li>
      <li className={s.covered} data-on={on(step >= 7)}><CircleCheck size={15} strokeWidth={2.25} /><Translate id="home.story.plan.covered" description="Result line in the plan illustration">Every criterion has a task and a test</Translate></li>
    </ul>
  </Frame>;
}

/* ---------- 2. The ledger: one line per event, the board is computed from it ---------- */

const LEDGER_CMDS = ['specweave task claim T-01', 'specweave task done T-01 --run "npm test"', 'specweave task claim T-02'];

function Json({ line }: { line: LedgerLine }) {
  const entries = Object.entries(line);
  return <>{entries.map(([k, v], i) => <React.Fragment key={k}><span>{i === 0 && '{'}<i>"{k}":</i><b data-k={k}>{JSON.stringify(v)}</b>{i < entries.length - 1 ? <i>,</i> : '}'}</span><wbr /></React.Fragment>)}</>;
}

const who = (by: string): Agent => (by.startsWith('codex') ? 'codex' : 'claude');

type TaskState = 'open' | 'claimed' | 'done';

function TaskRow({ id, title, state, by, evidence }: { id: string; title: string; state: TaskState; by: Agent; evidence?: string }) {
  return <li className={s.task} data-state={state}>
    <span className={s.taskIcon} key={state}>{state === 'done' ? <CircleCheck size={16} strokeWidth={2.25} /> : state === 'claimed' ? <LoaderCircle size={16} strokeWidth={2.25} className={s.spin} /> : <Circle size={16} strokeWidth={2} />}</span>
    <span className={s.taskName}><em>{id}</em>{title}</span>
    <span className={s.taskState} key={`${state}-state`}>
      {state === 'open' && <Translate id="home.story.status.open" description="Task status in the board illustration: nobody has claimed it">Open</Translate>}
      {state === 'claimed' && <><Mark who={by} size={14} /><Translate id="home.story.status.claimed" description="Task status in the board illustration: an agent claimed it">Claimed</Translate></>}
      {state === 'done' && <><Translate id="code.flow.status.done" description="Hero diagram, plan task status: finished">Done</Translate><code>{evidence}</code></>}
    </span>
  </li>;
}

export function LedgerStage() {
  const stage = useSteps<HTMLElement>(LEDGER_TIMES);
  const { step } = stage;
  const shown = Math.floor(step / 2);
  const cmd = Math.min(LEDGER_CMDS.length - 1, Math.floor((Math.max(step, 1) - 1) / 2));
  return <Frame stage={stage} total={LEDGER_TIMES.length} file={<><GitBranch size={14} strokeWidth={2} />ledger.jsonl</>}
    label={translate({ id: 'home.story.ledger.ariaLabel', message: 'Illustration: each specweave task command appends one JSON line to ledger.jsonl, and the task board is computed from those lines: T-01 done with its evidence, T-02 claimed by claude@cloud.', description: 'Accessible label of the animated ledger illustration. Keep command, file and id names in English' })}>
    <Cmd key={cmd} reached={step >= 1}>{LEDGER_CMDS[cmd]}</Cmd>
    <ol className={s.ledger}>
      {LEDGER.slice(0, 3).map((l, i) => <li key={i} data-on={on(shown > i)} data-new={on(stage.live && shown === i + 1)}><Mark who={who(l.by)} size={14} /><code><Json line={l} /></code></li>)}
    </ol>
    <div className={s.board}>
      <p className={s.boardTitle}><Translate id="home.story.ledger.board" description="Title of the task board in the ledger illustration">Task board, computed from the ledger</Translate></p>
      <ul>
        <TaskRow id="T-01" title="Save the cart as a draft" state={shown >= 2 ? 'done' : shown >= 1 ? 'claimed' : 'open'} by="claude" evidence="exit 0" />
        <TaskRow id="T-02" title="Restore the draft on return" state={shown >= 3 ? 'claimed' : 'open'} by="claude" />
      </ul>
    </div>
  </Frame>;
}

/* ---------- 3. The handoff: Claude Code stops, Codex continues from git ---------- */

const OTHERS: Agent[] = ['cursor', 'gemini', 'copilot', 'opencode', 'grok', 'antigravity'];
// The pickup lines that fit a card: the handoff, the next task and its criteria.
const PICKUP_SHOWN = [PICKUP[0], PICKUP[3], PICKUP[4], PICKUP[5]];

export function HandoffStage() {
  const stage = useSteps<HTMLElement>(HANDOFF_TIMES);
  const { step } = stage;
  return <Frame stage={stage} total={HANDOFF_TIMES.length} file={<><FileText size={14} strokeWidth={2} />handoff.md</>}
    label={translate({ id: 'home.story.handoff.ariaLabel', message: 'Illustration: Claude Code reaches its usage limit on T-02 and runs specweave handoff. The handoff goes to git. Codex runs specweave pickup, gets T-02 with its two criteria and finishes it. Any agent that reads files and runs commands can pick up the same way.', description: 'Accessible label of the animated handoff illustration. Keep product, command and id names in English' })}>
    <div className={s.relay}>
      <div className={s.agent} data-limit={on(step >= 2)} data-rest={on(step >= 5)}>
        <p className={s.agentHead}>
          <Mark who="claude" size={22} />
          <span className={s.agentName}><b>Claude Code</b><small>claude@cloud</small></span>
        </p>
        <p className={s.usage}>
          <span><Translate id="home.story.handoff.working" description="Label in the handoff illustration: the agent is working on task T-02. Keep T-02">Working on T-02</Translate></span>
          <span className={clsx('wv-chip', 'wv-chip--warn', s.chip)} data-on={on(step >= 2)}><Translate id="home.handoff.chip.usageLimit" description="Warning chip: the agent hit its usage limit">Usage limit</Translate></span>
          <span className={s.meter}><i data-on={on(step >= 1)} /></span>
        </p>
        <Cmd reached={step >= 3}>specweave handoff</Cmd>
        <p className={s.out} data-on={on(step >= 4)}>Handed off {INCREMENT} (released T-02, pushed your uncommitted edits).</p>
      </div>

      <span className={s.wire} data-on={on(step >= 4)}><span /></span>
      <div className={s.repo}>
        <p className={s.repoTitle}><GitBranch size={13} strokeWidth={2} /><Translate id="home.handoff.diagram.repo" description="Diagram node title for the git repository">Your repository, in git</Translate></p>
        <span className={s.repoFile}>spec.md</span>
        <span className={s.repoFile} data-pulse={on(stage.live && step === 4)}>ledger.jsonl</span>
        <span className={clsx(s.repoFile, s.repoNew)} data-on={on(step >= 4)}>handoff.md</span>
      </div>
      <span className={s.wire} data-on={on(step >= 5)}><span /></span>

      <div className={s.agent} data-active={on(step >= 5)} data-wait={on(step < 5)}>
        <p className={s.agentHead}>
          <Mark who="codex" size={22} />
          <span className={s.agentName}><b>Codex</b><small>codex@laptop</small></span>
          <span className={clsx('wv-chip', 'wv-chip--pass', s.chip)} data-on={on(step >= 7)} style={delay(900)}>exit 0</span>
        </p>
        <Cmd reached={step >= 5} d={500}>specweave pickup</Cmd>
        <p className={s.out} data-on={on(step >= 6)}>{PICKUP_SHOWN.map(([text, hl], i) => <span key={i} className={clsx(s.outLine, hl && s.hl, i > 1 && s.clip)}>{text}</span>)}</p>
        <Cmd reached={step >= 7}>specweave task done T-02 --run "npm test"</Cmd>
      </div>
    </div>
    <p className={s.others} data-on={on(step >= 8)}>
      <span className={s.otherMarks}>{OTHERS.map((a, i) => <span key={a} style={delay(i * 110)}><Mark who={a} size={16} /></span>)}</span>
      <Translate id="home.story.handoff.others" description="Line under the handoff illustration, after a row of agent logos">Any agent that reads files and runs commands picks up the same way.</Translate>
    </p>
  </Frame>;
}

/* ---------- 4. Verify and review: the gate ---------- */

export function GateStage() {
  const stage = useSteps<HTMLElement>(GATE_TIMES);
  const { step } = stage;
  return <Frame stage={stage} total={GATE_TIMES.length} file={<><FileText size={14} strokeWidth={2} />reports/verify.json</>}
    label={translate({ id: 'home.story.gate.ariaLabel', message: 'Illustration: specweave complete is blocked while reports/verify.json is missing. specweave verify runs test, lint and build and checks both criteria: pass. specweave review by the other model returns fix first, then ship. specweave complete then closes the increment.', description: 'Accessible label of the animated verify and review illustration. Keep command and file names in English' })}>
    <ol className={s.gate}>
      <li className={s.station} data-state={step >= 4 ? 'pass' : step >= 3 ? 'run' : 'wait'}>
        <p className={s.stationHead}><code>verify</code><span className={clsx('wv-chip', 'wv-chip--pass', s.chip)} data-on={on(step >= 4)}><Translate id="home.proof.verify.chip" description="Pass chip for specweave verify">Pass</Translate></span></p>
        <Cmd reached={step >= 3}>specweave verify</Cmd>
        <p className={s.out}>{VERIFY_LINES.map(([text, kind], i) => <span key={i} className={clsx(s.outLine, s[`v_${kind}`])} data-on={on(step >= (kind === 'pass' ? 4 : 3))} style={delay(kind === 'pass' ? 0 : 500 + i * 340)}>{text}</span>)}</p>
      </li>
      <li className={s.station} data-state={step >= 6 ? 'pass' : step >= 5 ? 'warn' : 'wait'}>
        <p className={s.stationHead}><code>review</code>
          {step >= 6
            ? <span key="ship" className={clsx('wv-chip', 'wv-chip--pass', s.chip)} data-on="1"><Translate id="home.story.gate.ship" description="Pass chip for specweave review: exit code 0 means ship">Exit 0, ship</Translate></span>
            : <span key="fix" className={clsx('wv-chip', 'wv-chip--warn', s.chip)} data-on={on(step >= 5)} style={delay(900)}><Translate id="home.proof.review.chip" description="Warning chip for specweave review: exit code 3 means fix first">Exit 3, fix first</Translate></span>}
        </p>
        <p className={s.pair}><Mark who="codex" size={14} /><ArrowRight size={12} strokeWidth={2.5} /><Mark who="claude" size={14} /><Translate id="home.story.gate.reviewer" description="Label in the review illustration. Keep product names in English">Codex reviews what Claude Code wrote</Translate></p>
        <Cmd reached={step >= 5}>specweave review</Cmd>
        <p className={s.out}>
          <span className={clsx(s.outLine, s.finding)} data-on={on(step >= 5)} data-old={on(step >= 6)} style={delay(500)}>high src/restore.js:41 a paid order is restored before the status check</span>
          <span className={s.outLine} data-on={on(step >= 5)} data-old={on(step >= 6)} style={delay(900)}>Verdict: fix first → reports/review-codex.md</span>
          <span className={clsx(s.outLine, s.v_pass)} data-on={on(step >= 6)}>Verdict: ship → reports/review-codex.md</span>
        </p>
      </li>
      <li className={s.station} data-state={step >= 7 ? 'pass' : step >= 2 ? 'fail' : 'wait'}>
        <p className={s.stationHead}><code>complete</code>
          {step >= 7
            ? <span key="closed" className={clsx('wv-chip', 'wv-chip--pass', s.chip)} data-on="1" style={delay(600)}><Translate id="home.story.gate.closed" description="Pass chip for specweave complete: the increment is closed">Closed</Translate></span>
            : <span key="blocked" className={clsx('wv-chip', 'wv-chip--fail', s.chip)} data-on={on(step >= 2)}><Translate id="home.proof.complete.chip" description="Fail chip for specweave complete">Blocked</Translate></span>}
        </p>
        <Cmd reached={step >= 1}>specweave complete</Cmd>
        <p className={s.out}>
          <span className={clsx(s.outLine, s.v_fail)} data-on={on(step >= 2)} data-old={on(step >= 7)}>reports/verify.json missing</span>
        </p>
        <Cmd reached={step >= 7}>specweave complete</Cmd>
        <p className={s.out}>
          <span className={clsx(s.outLine, s.v_pass)} data-on={on(step >= 7)} style={delay(600)}>✅ Increment {INCREMENT} completed!</span>
        </p>
      </li>
    </ol>
  </Frame>;
}
