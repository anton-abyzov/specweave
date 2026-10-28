import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ContinuityBoard from '../components/sections/ContinuityBoard';
import styles from './continuity.module.css';
import s from './product.module.css';
import {Capture, ExtensionStrip, motion as m, useActiveBeat, useGlow} from '../components/sections/Motion';

/*
  /product: the SpecWeave CLI. Every command and flag on this page was checked
  against bin/specweave.js, bin/project.js and src/cli/commands in specweave 3.1.0
  (CHANGELOG.md, 17 October 2026).
*/

const CLI_VERSION = '3.1.0';
const CLI_RELEASED = '17 October 2026';

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
  'Handed off 0001-resumable-checkout (released T-02, pushed your uncommitted edits).',
  'To continue in any tool, machine or account, say "pick up" there (or run `specweave pickup`).',
  'Details: .specweave/increments/0001-resumable-checkout/handoff.md',
].join('\n');

function Prompt({ children }: { children: string }) {
  return <><span className="wv-dim">$ </span>{children}</>;
}

function PickupOutput({ lines }: { lines: typeof pickupLines }) {
  return <>{lines.map(([text, hl], i) => <React.Fragment key={i}>{hl ? <span className="wv-hl">{text}</span> : text}{i < lines.length - 1 ? '\n' : ''}</React.Fragment>)}</>;
}

function Command({ cmd, label }: { cmd: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      void navigator.clipboard?.writeText(cmd).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }, () => undefined);
    } catch { /* clipboard unavailable: the command stays selectable */ }
  };
  return <div className={`wv-cmd ${s.cmd}`}>
    <code>{cmd}</code>
    <button type="button" className="wv-cmd__copy" onClick={copy} aria-label={label}>{copied ? 'Copied' : 'Copy'}</button>
  </div>;
}

/* The loop: the page's one scroll sequence. Each step names its command and the file it leaves behind. */
const loop: Array<{ title: string; cmd: string; body: React.ReactNode; file: string; fileNote: string }> = [
  {
    title: 'Plan the increment',
    cmd: 'specweave create-increment "Resumable checkout"',
    body: <>The agent fills in Problem, Scope, numbered acceptance criteria, Approach and Tasks. Before it writes, sw-increment asks only the decisions that need you, one at a time with a recommended answer: at most five by default, and <code>planning.deepInterview</code> sets the depth.</>,
    file: 'spec.md',
    fileNote: 'Each task names its criteria, its files and its test.',
  },
  {
    title: 'Claim a task',
    cmd: 'specweave task claim T-02',
    body: <>The claim goes into the ledger, so a second agent asking for the same task is refused. A claim older than two hours is stale and can be taken over. <code>specweave task next</code> prints the next task with the text of its criteria.</>,
    file: 'ledger.jsonl',
    fileNote: 'Append-only: claim, done, release, skip and block events.',
  },
  {
    title: 'Prove it is done',
    cmd: 'specweave task done T-02 --run "npm test"',
    body: <>The CLI runs the test itself. Only exit 0 records the task as done, with the commit and the tail of the output as evidence. A failing run records nothing.</>,
    file: 'reports/task-T-02.txt',
    fileNote: 'The full command output, with its exit code and time.',
  },
  {
    title: 'Verify the increment',
    cmd: 'specweave verify',
    body: <>Runs your test, lint and build commands, from <code>testing.commands</code> or detected from <code>package.json</code>, Cargo, pytest or Go, and checks every acceptance criterion.</>,
    file: 'reports/verify.json',
    fileNote: 'ok is true only when every command and criterion passes.',
  },
  {
    title: 'Review with the other model',
    cmd: 'specweave review',
    body: <>Hands the diff to a reviewer from a different model family than the one that wrote it: Codex reviews Claude's code, Claude reviews OpenAI's. Exit 0 means ship, exit 3 means fix first. <code>--brief</code> prints the brief to paste into any tool. New in {CLI_VERSION}; see <Link className={s.inlineLink} to="/docs/guides/cross-model-review">Review with another model</Link>.</>,
    file: 'reports/review-codex.md',
    fileNote: 'The findings and the verdict, named after the reviewer.',
  },
  {
    title: 'Close it',
    cmd: 'specweave complete 0001',
    body: <>Refuses while <code>reports/verify.json</code> is missing or not ok. Closing without it takes <code>--reason</code>, and the reason is stored with the increment.</>,
    file: 'metadata.json',
    fileNote: 'Completed, or the reason it closed without proof.',
  },
];

const limitModes: Array<{ mode: string; what: string; when: string }> = [
  { mode: 'suggest', what: 'Tells you once that a handoff is ready and keeps working.', when: 'The default. You decide when to switch.' },
  { mode: 'enforce', what: 'Runs specweave handoff and stops the session.', when: 'Unattended runs that should stop cleanly at a task boundary.' },
  { mode: 'checkpoint', what: 'Only saves local checkpoints and never hands off.', when: 'Plans where credits or a proxy keep working past the limit.' },
];

const coreSkills: Array<[string, string]> = [
  ['sw-increment', 'Plans the increment as one spec.md and asks the critical decisions first.'],
  ['sw-grill-me', 'Interviews you in rounds until every decision in a plan is settled. With planning.deepInterview set to deep, every new increment runs it.'],
  ['sw-do', 'Works the increment task by task: claim, implement inside its files, test, commit, done with evidence. Alone, unattended or in parallel lanes.'],
  ['sw-auto', 'Runs an increment unattended until every task is done, then verifies and closes it.'],
  ['sw-review', 'An adversarial review by a fresh context or another model family. Every finding cites a file and line.'],
  ['sw-done', 'Closes the increment: tasks done, verify green, a fresh-context review, then complete.'],
  ['sw-handoff', 'Hands the work to another tool, account or machine, and picks it up there.'],
];

const optionalSkills: Array<[string, React.ReactNode]> = [
  ['sw-glossary', <>Builds <code>GLOSSARY.md</code>, the project's shared words. <code>specweave glossary check --strict</code> fails CI on drift.</>],
  ['sw-sync', <>Pushes increments to GitHub, Jira or Azure DevOps. On when the project has a tracker.</>],
  ['sw-project', <>Reads and updates the project hub. On when <code>.specweave/project/hub.json</code> exists.</>],
  ['sw-jev', <>Hands closed-set decisions to Jev. On when <code>jev.enabled</code> is set.</>],
];

const record: Array<{ what: string; where: React.ReactNode; how: React.ReactNode }> = [
  { what: 'What done means', where: <code>spec.md</code>, how: 'Written at planning and read before code.' },
  { what: 'What happened', where: <code>ledger.jsonl</code>, how: 'Claims, completions with evidence, notes and handoffs.' },
  { what: 'What proved it', where: <code>reports/</code>, how: <>Task logs, <code>verify.md</code>, <code>verify.json</code> and review reports.</> },
  { what: 'Where you stopped', where: <code>handoff.md</code>, how: <>Written by <code>specweave handoff</code>.</> },
  { what: 'Notes for the next agent', where: <code>specweave note</code>, how: <>Stored in the ledger, and <code>pickup</code> shows them.</> },
  { what: 'Decisions that outlive the session', where: <code>.specweave/memory/</code>, how: <>One file per fact, indexed in <code>MEMORY.md</code> and committed, so every tool and account sees it.</> },
  { what: 'A board of all of it', where: <code>specweave dashboard</code>, how: 'Local only, on 127.0.0.1 port 3456 by default. Reading it needs no model call.' },
  { what: 'Who did what, as a page', where: <code>specweave report</code>, how: <>An HTML timeline of tools, sessions, handoffs and evidence in <code>reports/handoff-report.html</code>.</> },
];

const integrations: Array<{ name: string; cmd: string; body: React.ReactNode; to: string; link: string }> = [
  { name: 'Code navigation', cmd: 'specweave lsp refs src/restore.js restoreDraft', body: <>References, definitions, hover types and symbols from language servers, so agents stop grepping. <code>specweave lsp setup</code> picks servers for the languages in your repository.</>, to: '/docs/guides/lsp-integration', link: 'LSP guide' },
  { name: 'Jev', cmd: 'specweave jev route "<prompt>"', body: <>Closed-set decisions in about 250 ms: which skill or model tier, whether a shell command is safe to run, whether pulled text needs a second look. Opt in with <code>specweave jev setup</code>.</>, to: '/jev', link: 'About Jev' },
  { name: 'Project hub', cmd: 'specweave project brief', body: <>A shared goal, context, artifacts and routines in <code>.specweave/project/hub.json</code> that every tool reads. <code>--harness codex</code> exports the brief for another tool.</>, to: '/docs/guides/portable-projects', link: 'Portable projects guide' },
  { name: 'Existing repositories', cmd: 'specweave get owner/repo', body: <>Clones and registers a repository in the workspace, or every repository in an organization with <code>--all</code>. <code>--dry-run</code> previews adopting a checkout you already have.</>, to: '/docs/guides/workspace-adoption', link: 'Workspace adoption guide' },
  { name: 'Issue trackers', cmd: 'specweave sync push', body: <>Optional. Push an increment to GitHub Issues, Jira or Azure DevOps when your team plans there.</>, to: '/docs/guides/github-sync', link: 'Tracker sync guide' },
];

const MODE_ICONS: Record<string, React.ReactNode> = {
  suggest: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3Z" /><path d="M9.5 20.5h5" /></svg>,
  enforce: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M10 9v6M14 9v6" /></svg>,
  checkpoint: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21V4h10l-2 4 2 4H6" /></svg>,
};

const INTEGRATION_ICONS: React.ReactNode[] = [
  <svg key="lsp" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></svg>,
  <svg key="jev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" /></svg>,
  <svg key="hub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="m7 7 3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" /></svg>,
  <svg key="repo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="8" r="2.5" /><path d="M6 8.5v7M18 10.5c0 4-6 3-11 6" /></svg>,
  <svg key="sync" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H8a4 4 0 0 0 0 8h1M4 17h12a4 4 0 0 0 0-8h-1" /><path d="m17 4 3 3-3 3M7 20l-3-3 3-3" /></svg>,
];

/* The loop as a pinned stage: a drawn pipeline on the left follows the step being read on the right. */
function Loop() {
  const [refs, active] = useActiveBeat(loop.length);
  return <div className={s.stage}>
    <div className={s.pin} aria-hidden="true">
      <div className={s.pipeline} data-active={active ?? 'all'}>
        <span className={s.rail}><i /></span>
        {loop.map((step, i) => <div key={step.file} className={s.node} data-state={active === null || i < active ? 'done' : i === active ? 'now' : 'next'}>
          <span className={s.nodeDot}>{i + 1}</span>
          <span className={s.nodeText}><b>{step.title}</b><code>{step.file}</code></span>
        </div>)}
      </div>
      <p className={m.tag}>Illustration · the six files one increment leaves behind</p>
    </div>
    <ol className={s.loop} aria-label="The SpecWeave loop">
      {loop.map((step, i) => <li key={step.title} ref={el => { refs.current[i] = el; }} className={`${s.step} ${active === i ? s.stepNow : ''}`}>
        <h3 className={s.stepTitle}><span className={s.stepNo}>{String(i + 1).padStart(2, '0')}</span> {step.title}</h3>
        <pre className={`wv-code ${s.stepCmd}`}><Prompt>{step.cmd}</Prompt></pre>
        <p className={s.stepBody}>{step.body}</p>
        <p className={s.stepFile}><code className={s.file}>{step.file}</code><span>{step.fileNote}</span></p>
      </li>)}
    </ol>
  </div>;
}

export default function Product() {
  const glowModes = useGlow<HTMLUListElement>();
  const glowRecord = useGlow<HTMLUListElement>();
  const glowInt = useGlow<HTMLUListElement>();
  return <Layout title="SpecWeave CLI" description="The SpecWeave CLI plans work as a short spec, records every task with its test output in git, and hands the work to any coding agent, account or machine.">
    <main className={`${styles.page} ${s.root}`}>
      <section className={`${styles.hero} ${s.hero}`}>
        <div className={`${styles.heroText} ${m.enter}`}>
          <p className={s.kicker} style={{['--i' as string]: 0}}><span className="wv-chip wv-chip--iris">SpecWeave CLI {CLI_VERSION}</span><span>Free and open source</span></p>
          <h1 style={{['--i' as string]: 1}}>The work outlives the session.</h1>
          <p className={styles.lead} style={{['--i' as string]: 2}}>Your agent writes the code. SpecWeave keeps what done means, what proved it and where you stopped, as plain files in git, so Claude Code, Codex or any other agent can continue the same task.</p>
          <div style={{['--i' as string]: 3}}><Command cmd="npm i -g specweave" label="Copy the install command" /></div>
          <div className={styles.actions} style={{['--i' as string]: 4}}>
            <Link className={styles.primary} to="/docs/getting-started">Start in your project</Link>
            <Link className={styles.textLink} to="/docs/reference/commands">Every command</Link>
          </div>
          <p className={s.version} style={{['--i' as string]: 5}}>Version {CLI_VERSION}, released {CLI_RELEASED}. Free and open source.</p>
        </div>
        <figure className={s.heroCode}>
          <div className={`${s.heroGlow} ${m.planeBack}`} aria-hidden="true" />
          <div className={`${s.heroBehind} ${m.planeMid}`} aria-hidden="true">
            <pre className={`wv-code ${s.terminal}`}><Prompt>specweave handoff --reason "out of tokens"</Prompt>{'\n'}{handoffOutput.split('\n')[0]}</pre>
          </div>
          <pre className={`wv-code ${s.terminal} ${s.heroTerm}`} aria-label="Output of specweave pickup in a second clone running as Codex"><Prompt>specweave pickup</Prompt>{'\n'}<PickupOutput lines={pickupLines} /></pre>
          <span className={`${s.heroBadge} ${m.planeFront}`} aria-hidden="true"><span className="wv-chip wv-chip--pass">Picked up by Codex</span></span>
          <figcaption className={s.caption}>Real output from a second clone running as Codex, after Claude Code handed off.</figcaption>
        </figure>
      </section>

      <div className={s.band}><ExtensionStrip /></div>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="loop">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2>Six commands from plan to closed</h2>
          <p>Every step leaves a file behind. Nothing closes on a checkbox: the test runs, its output is stored, and the increment stays open until verification passes.</p>
        </div>
        <Loop />
        <p className={styles.caption}>Commands, flags and file names as in specweave {CLI_VERSION}. The increment, task and reviewer are the example used throughout this page.</p>
      </section>

      <section className={`${styles.section} ${styles.handoffSection} ${s.tight}`} id="handoff">
        <div className={m.reveal}>
          <h2>Out of tokens is not the end</h2>
          <p className={styles.leadSmall}>Say "hand off" in the tool you are leaving and "pick up where I left off" in the next one. Codex can continue what Claude Code started, on the same machine or another one. Nothing is copied between tools: <code>specweave handoff</code> pushes a snapshot to <code>specweave-handoff</code> and <code>wip/&lt;branch&gt;</code> and adds a ledger event.</p>
          <ul className={s.flags}>
            <li><code>handoff --all</code><span>Writes one index of every active increment and every nested repository with local-only work.</span></li>
            <li><code>pickup --list</code><span>Shows the pending handoffs, newest first, and changes nothing.</span></li>
            <li><code>pickup &lt;id or title&gt;</code><span>Takes a specific one when several are waiting.</span></li>
            <li><code>handoff --no-push</code><span>Keeps the handoff on this machine instead of pushing it to your remote.</span></li>
          </ul>
          <Link className={styles.textLink} to="/docs/guides/cross-tool-handoff">Handoff and pickup in detail</Link>
        </div>
        <div className={s.handoff}>
          <div className={`${s.machine} ${m.reveal}`}>
            <p className={s.machineLabel}>Leaving: Claude Code, as claude@cloud</p>
            <pre className={`wv-code ${s.terminal}`} aria-label="specweave handoff in the session being left"><Prompt>specweave handoff --reason "out of tokens"</Prompt>{'\n'}{handoffOutput}</pre>
          </div>
          <div className={s.connector}>
            <span className={s.connectorLine} aria-hidden="true"><i className={s.packet} /></span>
            <p>A snapshot pushed to <code>specweave-handoff</code> and <code>wip/&lt;branch&gt;</code> on your remote, plus a handoff event in the ledger</p>
          </div>
          <div className={`${s.machine} ${m.reveal}`}>
            <p className={s.machineLabel}>Arriving: Codex, as codex@laptop</p>
            <pre className={`wv-code ${s.terminal}`} aria-label="specweave pickup in the next tool"><Prompt>specweave pickup</Prompt>{'\n'}<PickupOutput lines={pickupLines.slice(0, 4)} /></pre>
          </div>
          <p className={s.caption}>The pickup lines are real output from a second clone running as Codex. The handoff lines are the CLI's exact message for the same run.</p>
        </div>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="usage-limits">
        <div className={s.limitsHead}>
          <div className={m.reveal}>
            <h2>Usage limits, handled before they hit</h2>
            <p className={s.sectionLead}><code className={s.inlineCode}>specweave auto-handoff on</code> adds hooks to Claude Code, Codex and Grok Build. Every hook saves a local checkpoint, and at 95% of any usage window the mode decides what happens (Grok reports no percentage, so its hook acts when a turn hits its rate limit).</p>
          </div>
          <Capture
            className={m.unveil}
            src="/img/studio/flow-usage-limits.webp"
            alt="SpecWithCode usage panel: Codex weekly 10% left, Claude session 2% left, weekly 54% left and weekly Fable 84% left, each with its reset time"
            width={1040} height={520} ratio="2 / 1"
            label="Real capture · SpecWithCode usage panel, the windows a hook watches"
          />
        </div>
        <ul className={`${s.modes} ${m.stagger}`} ref={glowModes} aria-label="Modes at the threshold">
          {limitModes.map((md, i) => <li key={md.mode} className={m.card} data-glow style={{['--i' as string]: i}}>
            <div className={s.modeHead}><span className={m.icon} aria-hidden="true">{MODE_ICONS[md.mode]}</span><code className={s.modeName}>{md.mode}</code>{i === 0 && <span className="wv-chip">Default</span>}</div>
            <div className={s.gauge} aria-hidden="true"><span className={s.gaugeFill}><i className={m.drawX} /></span><span className={s.gaugeMark}>95%</span></div>
            <dl className={s.modeFacts}>
              <div><dt>At the threshold</dt><dd>{md.what}</dd></div>
              <div><dt>Use it for</dt><dd>{md.when}</dd></div>
            </dl>
          </li>)}
        </ul>
        <ul className={`${s.flags} ${s.flagsGrid}`}>
          <li><code>--at 90</code><span>Moves the threshold; the default is 95.</span></li>
          <li><code>--wait-under 30</code><span>Does nothing when every full window resets within that many minutes; the default is 30.</span></li>
          <li><code>autocompact on</code><span>Compacts Claude Code at 400K tokens instead of near a million, so late turns stay small.</span></li>
        </ul>
        <div className={`wv-note ${s.note}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          <p>Running agents in <Link className={s.inlineLink} to="/code/">SpecWithCode</Link>? Use one machine per provider subscription: keep each machine signed in to one account per provider for good, and add a machine when you need more capacity instead of switching subscriptions by hand.</p>
        </div>
        <Link className={styles.textLink} to="/docs/guides/auto-handoff">Auto-handoff guide</Link>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="skills">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2>Seven skills by default, four when you need them</h2>
          <p>Skills are short instructions your agent loads on demand. Since {CLI_VERSION}, the optional ones turn on when your project calls for them. <code className={s.inlineCode}>specweave skills list</code> shows why each is on, and <code className={s.inlineCode}>enable</code> or <code className={s.inlineCode}>disable</code> changes it.</p>
        </div>
        <h3 className={s.colTitle}>In every project</h3>
        <dl className={`${s.skills} ${m.stagger}`}>
          {coreSkills.map(([name, what], i) => <div key={name} style={{['--i' as string]: i}}><dt><code>{name}</code></dt><dd>{what}</dd></div>)}
        </dl>
        <h3 className={s.colTitle}>When the project calls for them</h3>
        <dl className={`${s.skills} ${s.skillsOptional} ${m.stagger}`}>
          {optionalSkills.map(([name, what], i) => <div key={name} style={{['--i' as string]: i}}><dt><code>{name}</code></dt><dd>{what}</dd></div>)}
        </dl>
        <Link className={styles.textLink} to="/docs/reference/skills">Skills reference</Link>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="record">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2>A record you can inspect</h2>
          <p>Everything above is ordinary files in your repository. Git review and access controls protect the history; these files are not a tamper-proof audit system.</p>
        </div>
        <ul className={`${s.record} ${m.stagger}`} ref={glowRecord}>
          {record.map((r, i) => <li key={r.what} className={m.card} data-glow style={{['--i' as string]: i}}>
            <span className={s.recordWhere}>{r.where}</span>
            <h3>{r.what}</h3>
            <p>{r.how}</p>
          </li>)}
        </ul>
        <h3 className={s.boardTitle}>What the dashboard reads for the example</h3>
        <div className={m.unveil}><ContinuityBoard /></div>
        <p className={styles.caption}>Built from the same <code>specweave pickup</code> run shown at the top of this page. Run <code>specweave dashboard</code> in your project to see yours.</p>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="integrations">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2>Connected to the tools you already use</h2>
          <p>Each one is optional and stays off until you set it up.</p>
        </div>
        <ul className={`${s.integrations} ${m.stagger}`} ref={glowInt}>
          {integrations.map((it, i) => <li key={it.name} className={m.card} data-glow style={{['--i' as string]: i}}>
            <div className={s.intHead}><span className={m.icon} aria-hidden="true">{INTEGRATION_ICONS[i]}</span><h3>{it.name}</h3></div>
            <pre className={`wv-code ${s.stepCmd}`}><Prompt>{it.cmd}</Prompt></pre>
            <p>{it.body}</p>
            <Link className={s.inlineLink} to={it.to}>{it.link}</Link>
          </li>)}
        </ul>
        <Link className={styles.textLink} to="/integrations">All integrations</Link>
      </section>

      <section className={`${styles.section} ${styles.connectionSection} ${s.last} ${s.tight}`} id="specwithcode">
        <div className={m.reveal}>
          <h2>Run the same increments in a desktop app</h2>
          <p>A SpecWithCode worker thread works on one branch and opens one pull request, which is exactly an increment's shape. Its checklist is the increment's task list, and its ledger writes are the commands on this page. Threads leave each other notes in the ledger instead of editing each other's files.</p>
          <Link className={styles.textLink} to="/code/">See SpecWithCode</Link>
        </div>
        <figure className={`wv-window ${s.window} ${m.unveil}`}>
          <div className="wv-window__bar"><span>SpecWithCode</span><span>Worker thread</span></div>
          <img src="/img/studio/flow-worker-claude-20261015.webp" alt="A SpecWithCode worker thread reporting its outcome, the command it ran with the output it printed, no blockers, and two changed files" width="691" height="797" loading="lazy" />
          <figcaption>A worker thread reports its outcome, its evidence and the files it changed. SpecWithCode 1.0.21, 15 October 2026.</figcaption>
        </figure>
      </section>

      <section className={`${styles.finalCta} ${s.final}`}>
        <h2>Write down what done means, then switch tools freely</h2>
        <Link className={styles.primary} to="/docs/getting-started">Quick start</Link>
        <Link className={styles.textLink} to="/docs/reference/changelog#310-17-october-2026">What changed in 3.1</Link>
      </section>
    </main>
  </Layout>;
}
