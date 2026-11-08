import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import ContinuityBoard from '../components/sections/ContinuityBoard';
import HowItWorks from '../components/code/HowItWorks';
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
    <button type="button" className="wv-cmd__copy" onClick={copy} aria-label={label}>{copied ? translate({id: 'product.command.copied', message: 'Copied', description: 'Copy button label after the command was copied'}) : translate({id: 'product.command.copy', message: 'Copy', description: 'Button that copies a shell command'})}</button>
  </div>;
}

/* The loop: the page's one scroll sequence. Each step names its command and the file it leaves behind. */
type LoopStep = { title: string; cmd: string; body: React.ReactNode; file: string; fileNote: string };

function getLoop(): LoopStep[] {
  return [
    {
      title: translate({id: 'product.loop.plan.title', message: 'Plan the increment', description: 'Loop step title'}),
      cmd: 'specweave create-increment "Resumable checkout"',
      body: <Translate id="product.loop.plan.body" description="Loop step body; {deepInterview} is a config key. Keep sw-increment in English" values={{deepInterview: <code>planning.deepInterview</code>}}>{'The agent fills in Problem, Scope, numbered acceptance criteria, Approach and Tasks. Before it writes, sw-increment asks only the decisions that need you, one at a time with a recommended answer: at most five by default, and {deepInterview} sets the depth.'}</Translate>,
      file: 'spec.md',
      fileNote: translate({id: 'product.loop.plan.fileNote', message: 'Each task names its criteria, its files and its test.', description: 'Note about the file spec.md'}),
    },
    {
      title: translate({id: 'product.loop.claim.title', message: 'Claim a task', description: 'Loop step title'}),
      cmd: 'specweave task claim T-02',
      body: <Translate id="product.loop.claim.body" description="Loop step body; {taskNext} is a command" values={{taskNext: <code>specweave task next</code>}}>{'The claim goes into the ledger, so a second agent asking for the same task is refused. A claim older than two hours is stale and can be taken over. {taskNext} prints the next task with the text of its criteria.'}</Translate>,
      file: 'ledger.jsonl',
      fileNote: translate({id: 'product.loop.claim.fileNote', message: 'Append-only: claim, done, release, skip and block events.', description: 'Note about the file ledger.jsonl'}),
    },
    {
      title: translate({id: 'product.loop.done.title', message: 'Prove it is done', description: 'Loop step title'}),
      cmd: 'specweave task done T-02 --run "npm test"',
      body: <Translate id="product.loop.done.body" description="Loop step body">{'The CLI runs the test itself. Only exit 0 records the task as done, with the commit and the tail of the output as evidence. A failing run records nothing.'}</Translate>,
      file: 'reports/task-T-02.txt',
      fileNote: translate({id: 'product.loop.done.fileNote', message: 'The full command output, with its exit code and time.', description: 'Note about the task report file'}),
    },
    {
      title: translate({id: 'product.loop.verify.title', message: 'Verify the increment', description: 'Loop step title'}),
      cmd: 'specweave verify',
      body: <Translate id="product.loop.verify.body" description="Loop step body; placeholders are config keys and file names. Keep Cargo, pytest and Go in English" values={{testingCommands: <code>testing.commands</code>, packageJson: <code>package.json</code>}}>{'Runs your test, lint and build commands, from {testingCommands} or detected from {packageJson}, Cargo, pytest or Go, and checks every acceptance criterion.'}</Translate>,
      file: 'reports/verify.json',
      fileNote: translate({id: 'product.loop.verify.fileNote', message: 'ok is true only when every command and criterion passes.', description: 'Note about verify.json; "ok" is a JSON field name, keep it in English'}),
    },
    {
      title: translate({id: 'product.loop.review.title', message: 'Review with the other model', description: 'Loop step title'}),
      cmd: 'specweave review',
      body: <Translate
        id="product.loop.review.body"
        description="Loop step body; {brief} is a CLI flag, {version} the CLI version, {link} a link to the review guide. Keep Codex, Claude and OpenAI in English"
        values={{
          brief: <code>--brief</code>,
          version: CLI_VERSION,
          link: <Link className={s.inlineLink} to="/docs/guides/cross-model-review">{translate({id: 'product.loop.review.link', message: 'Review with another model', description: 'Link text to the cross-model review guide'})}</Link>,
        }}
      >{"Hands the diff to a reviewer from a different model family than the one that wrote it: Codex reviews Claude's code, Claude reviews OpenAI's. Exit 0 means ship, exit 3 means fix first. {brief} prints the brief to paste into any tool. New in {version}; see {link}."}</Translate>,
      file: 'reports/review-codex.md',
      fileNote: translate({id: 'product.loop.review.fileNote', message: 'The findings and the verdict, named after the reviewer.', description: 'Note about the review report file'}),
    },
    {
      title: translate({id: 'product.loop.close.title', message: 'Close it', description: 'Loop step title'}),
      cmd: 'specweave complete 0001',
      body: <Translate id="product.loop.close.body" description="Loop step body; {verifyJson} is a file path, {reason} a CLI flag" values={{verifyJson: <code>reports/verify.json</code>, reason: <code>--reason</code>}}>{'Refuses while {verifyJson} is missing or not ok. Closing without it takes {reason}, and the reason is stored with the increment.'}</Translate>,
      file: 'metadata.json',
      fileNote: translate({id: 'product.loop.close.fileNote', message: 'Completed, or the reason it closed without proof.', description: 'Note about metadata.json'}),
    },
  ];
}

const LOOP_COUNT = 6;

function getLimitModes(): Array<{ mode: string; what: string; when: string }> {
  return [
    { mode: 'suggest', what: translate({id: 'product.limits.suggest.what', message: 'Tells you once that a handoff is ready and keeps working.', description: 'What the suggest mode does at the usage threshold'}), when: translate({id: 'product.limits.suggest.when', message: 'The default. You decide when to switch.', description: 'When to use the suggest mode'}) },
    { mode: 'enforce', what: translate({id: 'product.limits.enforce.what', message: 'Runs specweave handoff and stops the session.', description: 'What the enforce mode does; keep "specweave handoff" in English'}), when: translate({id: 'product.limits.enforce.when', message: 'Unattended runs that should stop cleanly at a task boundary.', description: 'When to use the enforce mode'}) },
    { mode: 'checkpoint', what: translate({id: 'product.limits.checkpoint.what', message: 'Only saves local checkpoints and never hands off.', description: 'What the checkpoint mode does'}), when: translate({id: 'product.limits.checkpoint.when', message: 'Plans where credits or a proxy keep working past the limit.', description: 'When to use the checkpoint mode'}) },
  ];
}

function getCoreSkills(): Array<[string, string]> {
  return [
    ['sw-increment', translate({id: 'product.skills.core.increment', message: 'Plans the increment as one spec.md and asks the critical decisions first.', description: 'Skill description; keep spec.md in English'})],
    ['sw-grill-me', translate({id: 'product.skills.core.grillMe', message: 'Interviews you in rounds until every decision in a plan is settled. With planning.deepInterview set to deep, every new increment runs it.', description: 'Skill description; keep planning.deepInterview and deep in English'})],
    ['sw-do', translate({id: 'product.skills.core.do', message: 'Works the increment task by task: claim, implement inside its files, test, commit, done with evidence. Alone, unattended or in parallel lanes.', description: 'Skill description'})],
    ['sw-auto', translate({id: 'product.skills.core.auto', message: 'Runs an increment unattended until every task is done, then verifies and closes it.', description: 'Skill description'})],
    ['sw-review', translate({id: 'product.skills.core.review', message: 'An adversarial review by a fresh context or another model family. Every finding cites a file and line.', description: 'Skill description'})],
    ['sw-done', translate({id: 'product.skills.core.done', message: 'Closes the increment: tasks done, verify green, a fresh-context review, then complete.', description: 'Skill description'})],
    ['sw-handoff', translate({id: 'product.skills.core.handoff', message: 'Hands the work to another tool, account or machine, and picks it up there.', description: 'Skill description'})],
  ];
}

function getOptionalSkills(): Array<[string, React.ReactNode]> {
  return [
    ['sw-glossary', <Translate id="product.skills.optional.glossary" description="Skill description; {file} is a file name, {cmd} a command" values={{file: <code>GLOSSARY.md</code>, cmd: <code>specweave glossary check --strict</code>}}>{"Builds {file}, the project's shared words. {cmd} fails CI on drift."}</Translate>],
    ['sw-sync', <Translate id="product.skills.optional.sync" description="Skill description; keep GitHub, Jira and Azure DevOps in English">{'Pushes increments to GitHub, Jira or Azure DevOps. On when the project has a tracker.'}</Translate>],
    ['sw-project', <Translate id="product.skills.optional.project" description="Skill description; {file} is a file path" values={{file: <code>.specweave/project/hub.json</code>}}>{'Reads and updates the project hub. On when {file} exists.'}</Translate>],
    ['sw-jev', <Translate id="product.skills.optional.jev" description="Skill description; keep Jev in English; {key} is a config key" values={{key: <code>jev.enabled</code>}}>{'Hands closed-set decisions to Jev. On when {key} is set.'}</Translate>],
  ];
}

function getRecord(): Array<{ what: string; where: React.ReactNode; how: React.ReactNode }> {
  return [
    { what: translate({id: 'product.record.done.what', message: 'What done means', description: 'Record card title'}), where: <code>spec.md</code>, how: translate({id: 'product.record.done.how', message: 'Written at planning and read before code.', description: 'Record card body'}) },
    { what: translate({id: 'product.record.happened.what', message: 'What happened', description: 'Record card title'}), where: <code>ledger.jsonl</code>, how: translate({id: 'product.record.happened.how', message: 'Claims, completions with evidence, notes and handoffs.', description: 'Record card body'}) },
    { what: translate({id: 'product.record.proved.what', message: 'What proved it', description: 'Record card title'}), where: <code>reports/</code>, how: <Translate id="product.record.proved.how" description="Record card body; placeholders are file names" values={{verifyMd: <code>verify.md</code>, verifyJson: <code>verify.json</code>}}>{'Task logs, {verifyMd}, {verifyJson} and review reports.'}</Translate> },
    { what: translate({id: 'product.record.stopped.what', message: 'Where you stopped', description: 'Record card title'}), where: <code>handoff.md</code>, how: <Translate id="product.record.stopped.how" description="Record card body; {cmd} is a command" values={{cmd: <code>specweave handoff</code>}}>{'Written by {cmd}.'}</Translate> },
    { what: translate({id: 'product.record.notes.what', message: 'Notes for the next agent', description: 'Record card title'}), where: <code>specweave note</code>, how: <Translate id="product.record.notes.how" description="Record card body; {cmd} is a command" values={{cmd: <code>pickup</code>}}>{'Stored in the ledger, and {cmd} shows them.'}</Translate> },
    { what: translate({id: 'product.record.memory.what', message: 'Decisions that outlive the session', description: 'Record card title'}), where: <code>.specweave/memory/</code>, how: <Translate id="product.record.memory.how" description="Record card body; {file} is a file name" values={{file: <code>MEMORY.md</code>}}>{'One file per fact, indexed in {file} and committed, so every tool and account sees it.'}</Translate> },
    { what: translate({id: 'product.record.board.what', message: 'A board of all of it', description: 'Record card title'}), where: <code>specweave dashboard</code>, how: translate({id: 'product.record.board.how', message: 'Local only, on 127.0.0.1 port 3456 by default. Reading it needs no model call.', description: 'Record card body'}) },
    { what: translate({id: 'product.record.report.what', message: 'Who did what, as a page', description: 'Record card title'}), where: <code>specweave report</code>, how: <Translate id="product.record.report.how" description="Record card body; {file} is a file path" values={{file: <code>reports/handoff-report.html</code>}}>{'An HTML timeline of tools, sessions, handoffs and evidence in {file}.'}</Translate> },
  ];
}

function getIntegrations(): Array<{ name: string; cmd: string; body: React.ReactNode; to: string; link: string }> {
  return [
    { name: translate({id: 'product.integrations.lsp.name', message: 'Code navigation', description: 'Integration card title'}), cmd: 'specweave lsp refs src/restore.js restoreDraft', body: <Translate id="product.integrations.lsp.body" description="Integration card body; {cmd} is a command" values={{cmd: <code>specweave lsp setup</code>}}>{'References, definitions, hover types and symbols from language servers, so agents stop grepping. {cmd} picks servers for the languages in your repository.'}</Translate>, to: '/docs/guides/lsp-integration', link: translate({id: 'product.integrations.lsp.link', message: 'LSP guide', description: 'Link to the LSP guide'}) },
    { name: 'Jev', cmd: 'specweave jev route "<prompt>"', body: <Translate id="product.integrations.jev.body" description="Integration card body; {cmd} is a command" values={{cmd: <code>specweave jev setup</code>}}>{'Closed-set decisions in about 250 ms: which skill or model tier, whether a shell command is safe to run, whether pulled text needs a second look. Opt in with {cmd}.'}</Translate>, to: '/jev', link: translate({id: 'product.integrations.jev.link', message: 'About Jev', description: 'Link to the Jev page; keep Jev in English'}) },
    { name: translate({id: 'product.integrations.hub.name', message: 'Project hub', description: 'Integration card title'}), cmd: 'specweave project brief', body: <Translate id="product.integrations.hub.body" description="Integration card body; {file} is a file path, {flag} a CLI flag" values={{file: <code>.specweave/project/hub.json</code>, flag: <code>--harness codex</code>}}>{'A shared goal, context, artifacts and routines in {file} that every tool reads. {flag} exports the brief for another tool.'}</Translate>, to: '/docs/guides/portable-projects', link: translate({id: 'product.integrations.hub.link', message: 'Portable projects guide', description: 'Link to the portable projects guide'}) },
    { name: translate({id: 'product.integrations.repos.name', message: 'Existing repositories', description: 'Integration card title'}), cmd: 'specweave get owner/repo', body: <Translate id="product.integrations.repos.body" description="Integration card body; {all} and {dryRun} are CLI flags" values={{all: <code>--all</code>, dryRun: <code>--dry-run</code>}}>{'Clones and registers a repository in the workspace, or every repository in an organization with {all}. {dryRun} previews adopting a checkout you already have.'}</Translate>, to: '/docs/guides/workspace-adoption', link: translate({id: 'product.integrations.repos.link', message: 'Workspace adoption guide', description: 'Link to the workspace adoption guide'}) },
    { name: translate({id: 'product.integrations.trackers.name', message: 'Issue trackers', description: 'Integration card title'}), cmd: 'specweave sync push', body: <Translate id="product.integrations.trackers.body" description="Integration card body; keep GitHub Issues, Jira and Azure DevOps in English">{'Optional. Push an increment to GitHub Issues, Jira or Azure DevOps when your team plans there.'}</Translate>, to: '/docs/guides/github-sync', link: translate({id: 'product.integrations.trackers.link', message: 'Tracker sync guide', description: 'Link to the tracker sync guide'}) },
  ];
}

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
  const loop = getLoop();
  const [refs, active] = useActiveBeat(LOOP_COUNT);
  return <div className={s.stage}>
    <div className={s.pin} aria-hidden="true">
      <div className={s.pipeline} data-active={active ?? 'all'}>
        <span className={s.rail}><i /></span>
        {loop.map((step, i) => <div key={step.file} className={s.node} data-state={active === null || i < active ? 'done' : i === active ? 'now' : 'next'}>
          <span className={s.nodeDot}>{i + 1}</span>
          <span className={s.nodeText}><b>{step.title}</b><code>{step.file}</code></span>
        </div>)}
      </div>
      <p className={m.tag}><Translate id="product.loop.illustrationTag" description="Label under the pipeline illustration">Illustration · the six files one increment leaves behind</Translate></p>
    </div>
    <ol className={s.loop} aria-label={translate({id: 'product.loop.ariaLabel', message: 'The SpecWeave loop', description: 'Accessible label for the list of loop steps; keep SpecWeave in English'})}>
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
  const limitModes = getLimitModes();
  const coreSkills = getCoreSkills();
  const optionalSkills = getOptionalSkills();
  const record = getRecord();
  const integrations = getIntegrations();
  return <Layout title={translate({id: 'product.meta.title', message: 'SpecWeave CLI', description: 'Page title of /product; keep product names in English'})} description={translate({id: 'product.meta.description', message: 'The SpecWeave CLI plans work as a short spec, records every task with its test output in git, and hands the work to any coding agent, account or machine.', description: 'Meta description of /product; keep product names in English'})}>
    <main className={`${styles.page} ${s.root}`}>
      <section className={`${styles.hero} ${s.hero}`}>
        <div className={`${styles.heroText} ${m.enter}`}>
          <p className={s.kicker} style={{['--i' as string]: 0}}><span className="wv-chip wv-chip--iris">SpecWeave CLI {CLI_VERSION}</span><span><Translate id="product.hero.freeOpenSource" description="Hero kicker next to the version chip">Free and open source</Translate></span></p>
          <h1 style={{['--i' as string]: 1}}><Translate id="product.hero.title" description="Hero headline of /product">The work outlives the session.</Translate></h1>
          <p className={styles.lead} style={{['--i' as string]: 2}}><Translate id="product.hero.lead" description="Hero lead paragraph; keep product names in English">Your agent writes the code. SpecWeave keeps what done means, what proved it and where you stopped, as plain files in git, so Claude Code, Codex or any other agent can continue the same task.</Translate></p>
          <div style={{['--i' as string]: 3}}><Command cmd="npm i -g specweave" label={translate({id: 'product.hero.copyInstall', message: 'Copy the install command', description: 'Accessible label of the copy button next to the install command'})} /></div>
          <div className={styles.actions} style={{['--i' as string]: 4}}>
            <Link className={styles.primary} to="/docs/getting-started"><Translate id="product.hero.cta.start" description="Primary hero button">Start in your project</Translate></Link>
            <Link className={styles.textLink} to="/docs/reference/commands"><Translate id="product.hero.cta.commands" description="Secondary hero link to the command reference">Every command</Translate></Link>
          </div>
          <p className={s.version} style={{['--i' as string]: 5}}><Translate id="product.hero.version" description="Release line; {version} is the CLI version, {date} its release date" values={{version: CLI_VERSION, date: CLI_RELEASED}}>{'Version {version}, released {date}. Free and open source.'}</Translate></p>
        </div>
        <figure className={s.heroCode}>
          <div className={`${s.heroGlow} ${m.planeBack}`} aria-hidden="true" />
          <div className={`${s.heroBehind} ${m.planeMid}`} aria-hidden="true">
            <pre className={`wv-code ${s.terminal}`}><Prompt>specweave handoff --reason "out of tokens"</Prompt>{'\n'}{handoffOutput.split('\n')[0]}</pre>
          </div>
          <pre className={`wv-code ${s.terminal} ${s.heroTerm}`} aria-label={translate({id: 'product.hero.terminalAria', message: 'Output of specweave pickup in a second clone running as Codex', description: 'Accessible label of the hero terminal; keep specweave pickup and Codex in English'})}><Prompt>specweave pickup</Prompt>{'\n'}<PickupOutput lines={pickupLines} /></pre>
          <span className={`${s.heroBadge} ${m.planeFront}`} aria-hidden="true"><span className="wv-chip wv-chip--pass"><Translate id="product.hero.pickedUpBadge" description="Badge on the hero terminal; keep Codex in English">Picked up by Codex</Translate></span></span>
          <figcaption className={s.caption}><Translate id="product.hero.caption" description="Caption of the hero terminal; keep product names in English">Real output from a second clone running as Codex, after Claude Code handed off.</Translate></figcaption>
        </figure>
      </section>

      <div className={s.band}><ExtensionStrip /></div>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="loop">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2><Translate id="product.loop.heading" description="Section heading">Six commands from plan to closed</Translate></h2>
          <p><Translate id="product.loop.intro" description="Section intro">Every step leaves a file behind. Nothing closes on a checkbox: the test runs, its output is stored, and the increment stays open until verification passes.</Translate></p>
        </div>
        <Loop />
        <p className={styles.caption}><Translate id="product.loop.caption" description="Caption under the loop; {version} is the CLI version" values={{version: CLI_VERSION}}>{'Commands, flags and file names as in specweave {version}. The increment, task and reviewer are the example used throughout this page.'}</Translate></p>
      </section>

      <section className={`${styles.section} ${styles.handoffSection} ${s.tight}`} id="handoff">
        <div className={m.reveal}>
          <h2><Translate id="product.handoff.heading" description="Section heading">Out of tokens is not the end</Translate></h2>
          <p className={styles.leadSmall}><Translate id="product.handoff.lead" description="Section lead; the quoted phrases are what the user says to the agent; {cmd} is a command, {ref} and {wip} are git refs. Keep Codex and Claude Code in English" values={{cmd: <code>specweave handoff</code>, ref: <code>specweave-handoff</code>, wip: <code>wip/&lt;branch&gt;</code>}}>{'Say "hand off" in the tool you are leaving and "pick up where I left off" in the next one. Codex can continue what Claude Code started, on the same machine or another one. Nothing is copied between tools: {cmd} pushes a snapshot to {ref} and {wip} and adds a ledger event.'}</Translate></p>
          <ul className={s.flags}>
            <li><code>handoff --all</code><span><Translate id="product.handoff.flag.all" description="Explains the handoff --all flag">Writes one index of every active increment and every nested repository with local-only work.</Translate></span></li>
            <li><code>pickup --list</code><span><Translate id="product.handoff.flag.list" description="Explains the pickup --list flag">Shows the pending handoffs, newest first, and changes nothing.</Translate></span></li>
            <li><code>pickup &lt;{translate({id: 'product.handoff.flag.idOrTitle', message: 'id or title', description: 'Placeholder argument in the command "pickup <id or title>"'})}&gt;</code><span><Translate id="product.handoff.flag.pick" description="Explains passing an id or title to pickup">Takes a specific one when several are waiting.</Translate></span></li>
            <li><code>handoff --no-push</code><span><Translate id="product.handoff.flag.noPush" description="Explains the handoff --no-push flag">Keeps the handoff on this machine instead of pushing it to your remote.</Translate></span></li>
          </ul>
          <Link className={styles.textLink} to="/docs/guides/cross-tool-handoff"><Translate id="product.handoff.guideLink" description="Link to the handoff guide">Handoff and pickup in detail</Translate></Link>
        </div>
        <div className={s.handoff}>
          <div className={`${s.machine} ${m.reveal}`}>
            <p className={s.machineLabel}><Translate id="product.handoff.leaving" description="Label above the terminal being left; keep Claude Code and claude@cloud in English">Leaving: Claude Code, as claude@cloud</Translate></p>
            <pre className={`wv-code ${s.terminal}`} aria-label={translate({id: 'product.handoff.leavingAria', message: 'specweave handoff in the session being left', description: 'Accessible label of a terminal; keep specweave handoff in English'})}><Prompt>specweave handoff --reason "out of tokens"</Prompt>{'\n'}{handoffOutput}</pre>
          </div>
          <div className={s.connector}>
            <span className={s.connectorLine} aria-hidden="true"><i className={s.packet} /></span>
            <p><Translate id="product.handoff.connector" description="Text between the two terminals; {ref} and {wip} are git refs" values={{ref: <code>specweave-handoff</code>, wip: <code>wip/&lt;branch&gt;</code>}}>{'A snapshot pushed to {ref} and {wip} on your remote, plus a handoff event in the ledger'}</Translate></p>
          </div>
          <div className={`${s.machine} ${m.reveal}`}>
            <p className={s.machineLabel}><Translate id="product.handoff.arriving" description="Label above the arriving terminal; keep Codex and codex@laptop in English">Arriving: Codex, as codex@laptop</Translate></p>
            <pre className={`wv-code ${s.terminal}`} aria-label={translate({id: 'product.handoff.arrivingAria', message: 'specweave pickup in the next tool', description: 'Accessible label of a terminal; keep specweave pickup in English'})}><Prompt>specweave pickup</Prompt>{'\n'}<PickupOutput lines={pickupLines.slice(0, 4)} /></pre>
          </div>
          <p className={s.caption}><Translate id="product.handoff.caption" description="Caption under the handoff terminals; keep Codex in English">{"The pickup lines are real output from a second clone running as Codex. The handoff lines are the CLI's exact message for the same run."}</Translate></p>
        </div>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="usage-limits">
        <div className={s.limitsHead}>
          <div className={m.reveal}>
            <h2><Translate id="product.limits.heading" description="Section heading">Usage limits, handled before they hit</Translate></h2>
            <p className={s.sectionLead}><Translate id="product.limits.lead" description="Section lead; {cmd} is a command. Keep product names in English" values={{cmd: <code className={s.inlineCode}>specweave auto-handoff on</code>}}>{'{cmd} adds hooks to Claude Code, Codex and Grok Build. Every hook saves a local checkpoint, and at 95% of any usage window the mode decides what happens (Grok reports no percentage, so its hook acts when a turn hits its rate limit).'}</Translate></p>
          </div>
          <Capture
            className={m.unveil}
            src="/img/studio/flow-usage-limits.webp"
            alt={translate({id: 'product.limits.capture.alt', message: 'SpecWithCode usage panel: Codex weekly 10% left, Claude session 2% left, weekly 54% left and weekly Fable 84% left, each with its reset time', description: 'Alt text of the usage panel screenshot; keep product names in English'})}
            width={1040} height={520} ratio="2 / 1"
            label={translate({id: 'product.limits.capture.label', message: 'Real capture · SpecWithCode usage panel, the windows a hook watches', description: 'Label under the usage panel screenshot; keep SpecWithCode in English'})}
          />
        </div>
        <ul className={`${s.modes} ${m.stagger}`} ref={glowModes} aria-label={translate({id: 'product.limits.modesAria', message: 'Modes at the threshold', description: 'Accessible label of the list of auto-handoff modes'})}>
          {limitModes.map((md, i) => <li key={md.mode} className={m.card} data-glow style={{['--i' as string]: i}}>
            <div className={s.modeHead}><span className={m.icon} aria-hidden="true">{MODE_ICONS[md.mode]}</span><code className={s.modeName}>{md.mode}</code>{i === 0 && <span className="wv-chip"><Translate id="product.limits.defaultChip" description="Chip marking the default mode">Default</Translate></span>}</div>
            <div className={s.gauge} aria-hidden="true"><span className={s.gaugeFill}><i className={m.drawX} /></span><span className={s.gaugeMark}>95%</span></div>
            <dl className={s.modeFacts}>
              <div><dt><Translate id="product.limits.atThreshold" description="Label: what the mode does at the threshold">At the threshold</Translate></dt><dd>{md.what}</dd></div>
              <div><dt><Translate id="product.limits.useFor" description="Label: when to use the mode">Use it for</Translate></dt><dd>{md.when}</dd></div>
            </dl>
          </li>)}
        </ul>
        <ul className={`${s.flags} ${s.flagsGrid}`}>
          <li><code>--at 90</code><span><Translate id="product.limits.flag.at" description="Explains the --at flag">Moves the threshold; the default is 95.</Translate></span></li>
          <li><code>--wait-under 30</code><span><Translate id="product.limits.flag.waitUnder" description="Explains the --wait-under flag">Does nothing when every full window resets within that many minutes; the default is 30.</Translate></span></li>
          <li><code>autocompact on</code><span><Translate id="product.limits.flag.autocompact" description="Explains autocompact on; keep Claude Code in English">Compacts Claude Code at 400K tokens instead of near a million, so late turns stay small.</Translate></span></li>
        </ul>
        <div className={`wv-note ${s.note}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          <p><Translate id="product.limits.note" description="Note; {link} is a link labelled SpecWithCode" values={{link: <Link className={s.inlineLink} to="/code/">SpecWithCode</Link>}}>{'Running agents in {link}? Use one machine per provider subscription: keep each machine signed in to one account per provider for good, and add a machine when you need more capacity instead of switching subscriptions by hand.'}</Translate></p>
        </div>
        <Link className={styles.textLink} to="/docs/guides/auto-handoff"><Translate id="product.limits.guideLink" description="Link to the auto-handoff guide">Auto-handoff guide</Translate></Link>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="skills">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2><Translate id="product.skills.heading" description="Section heading">Seven skills by default, four when you need them</Translate></h2>
          <p><Translate id="product.skills.intro" description="Section intro; {version} is the CLI version; {list}, {enable}, {disable} are commands" values={{version: CLI_VERSION, list: <code className={s.inlineCode}>specweave skills list</code>, enable: <code className={s.inlineCode}>enable</code>, disable: <code className={s.inlineCode}>disable</code>}}>{'Skills are short instructions your agent loads on demand. Since {version}, the optional ones turn on when your project calls for them. {list} shows why each is on, and {enable} or {disable} changes it.'}</Translate></p>
        </div>
        <h3 className={s.colTitle}><Translate id="product.skills.core.title" description="Heading of the default skills list">In every project</Translate></h3>
        <dl className={`${s.skills} ${m.stagger}`}>
          {coreSkills.map(([name, what], i) => <div key={name} style={{['--i' as string]: i}}><dt><code>{name}</code></dt><dd>{what}</dd></div>)}
        </dl>
        <h3 className={s.colTitle}><Translate id="product.skills.optional.title" description="Heading of the optional skills list">When the project calls for them</Translate></h3>
        <dl className={`${s.skills} ${s.skillsOptional} ${m.stagger}`}>
          {optionalSkills.map(([name, what], i) => <div key={name} style={{['--i' as string]: i}}><dt><code>{name}</code></dt><dd>{what}</dd></div>)}
        </dl>
        <Link className={styles.textLink} to="/docs/reference/skills"><Translate id="product.skills.referenceLink" description="Link to the skills reference">Skills reference</Translate></Link>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="record">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2><Translate id="product.record.heading" description="Section heading">A record you can inspect</Translate></h2>
          <p><Translate id="product.record.intro" description="Section intro">Everything above is ordinary files in your repository. Git review and access controls protect the history; these files are not a tamper-proof audit system.</Translate></p>
        </div>
        <ul className={`${s.record} ${m.stagger}`} ref={glowRecord}>
          {record.map((r, i) => <li key={r.what} className={m.card} data-glow style={{['--i' as string]: i}}>
            <span className={s.recordWhere}>{r.where}</span>
            <h3>{r.what}</h3>
            <p>{r.how}</p>
          </li>)}
        </ul>
        <h3 className={s.boardTitle}><Translate id="product.record.boardTitle" description="Heading above the dashboard table">What the dashboard reads for the example</Translate></h3>
        <div className={m.unveil}><ContinuityBoard /></div>
        <p className={styles.caption}><Translate id="product.record.boardCaption" description="Caption under the dashboard table; {pickup} and {dashboard} are commands" values={{pickup: <code>specweave pickup</code>, dashboard: <code>specweave dashboard</code>}}>{'Built from the same {pickup} run shown at the top of this page. Run {dashboard} in your project to see yours.'}</Translate></p>
      </section>

      <section className={`${styles.section} ${s.ruled} ${s.tight}`} id="integrations">
        <div className={`${styles.sectionHeading} ${m.reveal}`}>
          <h2><Translate id="product.integrations.heading" description="Section heading">Connected to the tools you already use</Translate></h2>
          <p><Translate id="product.integrations.intro" description="Section intro">Each one is optional and stays off until you set it up.</Translate></p>
        </div>
        <ul className={`${s.integrations} ${m.stagger}`} ref={glowInt}>
          {integrations.map((it, i) => <li key={it.name} className={m.card} data-glow style={{['--i' as string]: i}}>
            <div className={s.intHead}><span className={m.icon} aria-hidden="true">{INTEGRATION_ICONS[i]}</span><h3>{it.name}</h3></div>
            <pre className={`wv-code ${s.stepCmd}`}><Prompt>{it.cmd}</Prompt></pre>
            <p>{it.body}</p>
            <Link className={s.inlineLink} to={it.to}>{it.link}</Link>
          </li>)}
        </ul>
        <Link className={styles.textLink} to="/integrations"><Translate id="product.integrations.allLink" description="Link to the integrations page">All integrations</Translate></Link>
      </section>

      <section className={`${styles.section} ${styles.connectionSection} ${s.last} ${s.tight}`} id="specwithcode">
        <div className={m.reveal}>
          <h2><Translate id="product.specwithcode.heading" description="Section heading">Run the same increments in a desktop app</Translate></h2>
          <p><Translate id="product.specwithcode.body" description="Section body; keep SpecWithCode in English">{"A SpecWithCode worker thread works on one branch and opens one pull request, which is exactly an increment's shape. Its checklist is the increment's task list, and its ledger writes are the commands on this page. Threads leave each other notes in the ledger instead of editing each other's files."}</Translate></p>
          <Link className={styles.textLink} to="/code/"><Translate id="product.specwithcode.link" description="Link to the SpecWithCode page; keep SpecWithCode in English">See SpecWithCode</Translate></Link>
        </div>
        <HowItWorks showLink={false} className={`${s.window} ${m.unveil}`} />
      </section>

      <section className={`${styles.finalCta} ${s.final}`}>
        <h2><Translate id="product.final.heading" description="Final call-to-action heading">Write down what done means, then switch tools freely</Translate></h2>
        <Link className={styles.primary} to="/docs/getting-started"><Translate id="product.final.quickStart" description="Final call-to-action button">Quick start</Translate></Link>
        <Link className={styles.textLink} to="/docs/reference/changelog#310-17-october-2026"><Translate id="product.final.changelog" description="Link to the changelog; keep the version in English">What changed in 3.1</Translate></Link>
      </section>
    </main>
  </Layout>;
}
