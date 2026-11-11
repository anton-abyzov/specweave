import React from 'react';
import Translate, { translate } from '@docusaurus/Translate';
import HomeIcon, { type HomeIconName } from '../HomeIcon';
import { GateStage, HandoffStage, LedgerStage, PlanStage } from './Stages';
import s from './story.module.css';

/*
  #how: one increment told in four scenes, each with a stage that plays on its own.
    1. The plan             spec.md, written once
    2. The ledger in git    one line per claim and finish; the board is computed from it
    3. The handoff          Claude Code stops at its usage limit, Codex continues from git
    4. Verify and review    the gate: verify, a review by the other model, then complete
  The example increment and its formats are in data.ts. Behaviour described here is specweave
  3.1.0 and later (`review` and the verify.json closure gate arrived in 3.1.0).
*/

function Scene({ icon, title, stage, children }: { icon: HomeIconName; title: React.ReactNode; stage: React.ReactNode; children: React.ReactNode }) {
  return <li className={s.scene}>
    <div className={s.copy}>
      <HomeIcon name={icon} size={56} className={s.sceneIcon} />
      <h3>{title}</h3>
      {children}
    </div>
    {stage}
  </li>;
}

export default function Story({ cliVersion, cliDate }: { cliVersion: string; cliDate: string }) {
  return <ol className={s.story} aria-label={translate({ id: 'home.handoff.beats.ariaLabel', message: 'Four layers of one handoff', description: 'Accessible label of the list of the four handoff beats' })}>
    <Scene icon="plan" stage={<PlanStage />} title={<Translate id="home.story.plan.title" description="Heading of scene 1 of the handoff story: the plan, kept in spec.md">The plan</Translate>}>
      <p><Translate id="home.handoff.spec.body" description="Beat 1 text; {file} is the file name spec.md" values={{ file: <code>spec.md</code> }}>{'What done means, written once before any agent starts. {file}'}</Translate></p>
      <ul className={s.cmds}>
        <li><code>specweave create-increment "Resumable checkout"</code><span><Translate id="home.story.plan.create" description="Explains specweave create-increment; {criteria} and {task} are format samples, keep them" values={{ criteria: <code>- [ ] AC-01:</code>, task: <code>### T-01</code> }}>{'Starts the increment. Criteria are {criteria} lines and tasks are {task} headings, so any tool can read them.'}</Translate></span></li>
        <li><code data-format="">- AC: AC-01 | Files: … | Test: npm test</code><span><Translate id="home.story.plan.tasks" description="Explains the line under each task in spec.md">Each task names the criteria it covers, the files it touches and the test that proves it.</Translate></span></li>
      </ul>
    </Scene>

    <Scene icon="ledger" stage={<LedgerStage />} title={<Translate id="home.handoff.ledger.title" description="Heading of beat 3">The ledger in git</Translate>}>
      <p><Translate id="home.handoff.ledger.body" description="Beat 3 text; {file} is the file name ledger.jsonl" values={{ file: <code>ledger.jsonl</code> }}>{'Every claim, finish and release is one line, committed with the code. {file}'}</Translate></p>
      <ul className={s.cmds}>
        <li><code>specweave task claim T-01</code><span><Translate id="home.handoff.agents.claim" description="Explains specweave task claim T-01. Keep product names in English">Claude Code takes the first open task. The claim is a line in the ledger, so no other agent takes it too.</Translate></span></li>
        <li><code>specweave task done T-01 --run "npm test"</code><span><Translate id="home.handoff.agents.done" description="Explains specweave task done; {file} is a file path" values={{ file: <code>reports/task-T-01.txt</code> }}>{'Runs the task’s test. Exit 0 is the evidence, and the full output is saved in {file}.'}</Translate></span></li>
      </ul>
    </Scene>

    <Scene icon="handoff" stage={<HandoffStage />} title={<Translate id="home.handoff.handoff.title" description="Heading of beat 4">The handoff</Translate>}>
      <p><Translate id="home.handoff.handoff.body" description="Beat 4 text">Another tool continues from the same files, not from a chat window.</Translate></p>
      <ul className={s.cmds}>
        <li><code>specweave handoff</code><span><Translate id="home.handoff.handoff.release" description="Explains specweave handoff; {file} is handoff.md, {ref} and {branch} are git ref names, keep them" values={{ file: <code>handoff.md</code>, ref: <code>specweave-handoff</code>, branch: <code>wip/&lt;branch&gt;</code> }}>{'Releases the claim, writes {file} with what is next and pushes a snapshot to {ref} and {branch}.'}</Translate></span></li>
        <li><code>specweave pickup</code><span><Translate id="home.handoff.handoff.pickup" description="Explains specweave pickup. Keep Codex and T-02 in English">In Codex: fetches the handoff, applies the edits and prints T-02 with its two criteria.</Translate></span></li>
      </ul>
    </Scene>

    <Scene icon="verify" stage={<GateStage />} title={<Translate id="home.story.gate.title" description="Heading of scene 4 of the handoff story: the closure gate">Verify and review</Translate>}>
      <p><Translate id="home.story.gate.body" description="Scene 4 text">An increment closes when the checks pass and a second model agrees, not when an agent says it is done.</Translate></p>
      <ul className={s.cmds}>
        <li><code>specweave verify</code><span><Translate id="home.proof.verify.detail" description="Explains specweave verify; {spec} and {report} are file names, keep them" values={{ spec: <code>spec.md</code>, report: <code>reports/verify.json</code> }}>{'Runs your test, lint and build commands, checks that every criterion in {spec} is ticked and writes {report}.'}</Translate></span></li>
        <li><code>specweave review</code><span><Translate id="home.proof.review.detail" description="Explains specweave review; {report} is a file name, keep it. Keep product names in English" values={{ report: <code>reports/review-codex.md</code> }}>{'Hands the diff to a reviewer from the other model family: Codex reviews code Claude wrote, Claude reviews code Codex wrote. The report lands in {report}; exit 0 means ship.'}</Translate></span></li>
        <li><code>specweave complete</code><span><Translate id="home.proof.complete.detail" description="Explains specweave complete; {file} is a file name and {flag} a command flag, keep them" values={{ file: <code>verify.json</code>, flag: <code>--reason</code> }}>{'Refuses to close an increment without a passing {file}. Closing anyway takes {flag}, and the reason is stored with the increment.'}</Translate></span></li>
      </ul>
      <p className={s.fine}><Translate id="home.proof.caption" description="Caption; {version} is the CLI version, {date} its release date" values={{ version: cliVersion, date: cliDate }}>{'Behaviour of specweave {version}, released {date}.'}</Translate></p>
    </Scene>
  </ol>;
}
