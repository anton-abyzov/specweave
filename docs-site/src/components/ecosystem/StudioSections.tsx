import React from 'react';
import Link from '@docusaurus/Link';
import styles from './studio.module.css';

export const providers = ['Claude Code', 'Codex', 'Grok Build', 'Cursor', 'OpenCode', 'GitHub Copilot', 'Antigravity', 'Pi'];

const features: [string, string, React.ReactNode][] = [
  ['Coordinator', 'One conversation per goal.', <>Tell the coordinator what you want. It splits the work, starts or reuses workers, checks what they bring back and asks you only when a decision is yours.</>],
  ['Any provider', 'Each role picks its own model.', <>Run the coordinator on Claude Code and a worker on Codex, Grok Build or Cursor. Studio drives each provider’s official agent, so its own sign-in, approvals and limits apply, and you can switch a thread to another provider mid-conversation.</>],
  ['Memory', 'Said once, known by every worker.', <>Each project keeps its own memory, instructions and settings. A decision you give the coordinator reaches the next worker without you repeating it.</>],
  ['Plan', 'Reported done is not verified.', <>An optional plan holds the spec, tasks and assignments, or reads an existing SpecWeave increment. A task is verified only when its check runs and passes.</>],
  ['Folders and repos', 'A device folder plus several repositories.', <>Point a project at a folder on a machine, add approved neighbouring folders and the repository URLs it works across. Workers get their own worktrees.</>],
  ['Routines and Personal', 'Recurring work, not only code.', <>Schedule routines inside a project. A Personal project gets its own working folder and per-project tool grants for research, notes and everyday tasks.</>],
];

type UmbrellaStatus = 'pilot' | 'testing' | 'open';
const statusLabel: Record<UmbrellaStatus, string> = { pilot: 'In the pilot', testing: 'Next pilot build', open: 'Open source now' };

const umbrella: { job: string; instead: string[]; title: string; body: React.ReactNode; gap?: string; status: UmbrellaStatus }[] = [
  { job: 'Project agents', instead: ['Claude Code Projects', 'Codex cloud tasks'], title: 'A coordinator, and workers on any model.', body: 'One conversation per goal. Each worker picks its own provider, model, machine and worktree, and you can step into any of them.', status: 'testing' },
  { job: 'Personal agents', instead: ['OpenAI Dots', 'xAI Grok Bot', 'Meta Muse'], title: 'Personal projects that keep working.', body: 'A project with its own folder, memory and plan, scheduled routines, and tasks that a webhook can start.', gap: 'Runs while your machine is awake, not in a vendor cloud. No chat-app channels yet.', status: 'testing' },
  { job: 'Self-hosted agents', instead: ['Hermes Agent', 'OpenClaw'], title: 'Local first, with tools you grant.', body: 'Agents run on your machines. Tools come from local MCP servers you approve one tool at a time, and memory is plain files in the project.', gap: 'No Telegram, WhatsApp or Slack gateway yet.', status: 'testing' },
  { job: 'Coding agents', instead: ['Claude Code', 'Codex', 'Grok Build', 'Cursor', 'Copilot'], title: 'Every lab’s official agent.', body: 'Studio drives each provider’s own agent, so its sign-in, approvals and limits apply. Switch a thread to another provider mid-conversation.', status: 'pilot' },
  { job: 'Usage limits', instead: ['One usage page per account'], title: 'Every account’s limits on one screen.', body: 'Resume on the same account when a limit frees up, or let a capacity policy pick a fresh account for new work.', status: 'pilot' },
  { job: 'The record', instead: ['Memory locked in one vendor'], title: 'Spec, evidence and handoff in git.', body: <>The open-source SpecWeave CLI keeps it, and any tool continues with <code>specweave pickup</code>.</>, status: 'open' },
];

export function UmbrellaMap() {
  return <>
    <div className={styles.umbrella} role="list">
      {umbrella.map(row => <article key={row.job} className={styles.uRow} role="listitem">
        <div className={styles.uJob}>
          <span>{row.job}</span>
          <div className={styles.uChips} aria-label={`Instead of ${row.instead.join(', ')}`}>{row.instead.map(name => <i key={name}>{name}</i>)}</div>
        </div>
        <b className={styles.uArrow} aria-hidden="true">→</b>
        <div className={styles.uStudio}>
          <h3>{row.title}</h3>
          <p>{row.body}</p>
          {row.gap && <p className={styles.uGap}>{row.gap}</p>}
        </div>
        <strong className={styles.uStatus} data-status={row.status}>{statusLabel[row.status]}</strong>
      </article>)}
    </div>
    <p className={styles.compareNote}>Other products as described on their public pages and in launch coverage, October 2026; they change quickly. Status is Studio’s own: In the pilot means the current private pilot build, Next pilot build means in testing.</p>
  </>;
}

export function ProjectFeatures() {
  return <div className={styles.features}>
    {features.map(([label, title, body]) => <article key={label}><span>{label}</span><h3>{title}</h3><p>{body}</p></article>)}
  </div>;
}

const rows: [string, string, string][] = [
  ['Where work runs', 'A cloud container per thread, with a bridge to your computer in some products.', 'On machines you own: this computer, plus any you pair over your network, SSH or Tailscale.'],
  ['Models', 'One vendor’s models.', 'Claude Code, Codex, Grok Build, Cursor, OpenCode, Copilot and more. The coordinator and each worker choose their own.'],
  ['Your skills and folders', 'Upload skills to the account or a repository. Neighbouring local folders are out of reach.', 'The agent runs on your machine with its provider’s local configuration, so local skills, MCP servers and folders you approve are within reach.'],
  ['When a limit hits', 'Wait for the reset or change plans.', 'Switch the thread to another provider, which carries the recent conversation over; resume on the same account when the limit frees up; or hand off to another tool with SpecWeave.'],
  ['The record', 'Inside the vendor’s project.', 'Specs, task evidence and handoffs in git, readable by any tool.'],
  ['Laptop closed', 'Keeps running in the cloud.', 'Runs while the executing machine is awake, so a desktop or Mac mini can carry work while your laptop sleeps.'],
];

export function CloudCompare() {
  return <>
    <table className={styles.compare}>
      <thead><tr><th scope="col">Topic</th><th scope="col">Cloud project agents</th><th scope="col">SpecWeave Studio</th></tr></thead>
      <tbody>{rows.map(([topic, cloud, studio]) => <tr key={topic}><th scope="row">{topic}</th><td data-label="Cloud project agents">{cloud}</td><td data-label="SpecWeave Studio">{studio}</td></tr>)}</tbody>
    </table>
    <p className={styles.compareNote}>Cloud project agents include Claude Code Projects, OpenAI Dots and xAI Grok Bot. Compared from their public documentation in October 2026; these products change quickly.</p>
  </>;
}

export function StudioFaq() {
  return <div className={styles.faq}>
    <article>
      <h3>Do I need Tailscale?</h3>
      <p>No. One machine needs nothing extra: Studio runs at <code>localhost:8319</code>. A machine on the same home or office network can be paired directly once its network access is on, and the desktop app can open an SSH tunnel to a machine you already reach over SSH. Tailscale Serve is for private HTTPS from a phone or from away.</p>
      <p>Either way, being reachable is not permission. Every machine and every browser is paired with Studio separately, and Studio never uses Tailscale Funnel to go public.</p>
    </article>
    <article>
      <h3>What is CLIProxyAPI for?</h3>
      <p>It is optional. Native Claude Code and Codex sessions talk to their providers directly and never pass through it. If you already run a CLIProxyAPI hub, Studio can read it to show pooled accounts’ limits and redeem Codex reset credits.</p>
      <p>Keep the hub on loopback, since its management key reaches every pooled account, and check your providers’ terms before pooling subscriptions. AnyModel is a similar optional adapter for API and local models.</p>
    </article>
    <article>
      <h3>Will my local skills work?</h3>
      <p>Yes, on the machine where the agent runs. Studio starts the provider’s own agent there, so the skills, MCP servers and settings you configured for it apply, and a project can approve extra folders next to its main one. A skill on another machine has to be installed on that machine too.</p>
    </article>
    <article>
      <h3>How does handoff fit in?</h3>
      <p>Inside a thread you can switch provider: Studio passes a budgeted part of the conversation to the new agent, which keeps working in the same checkout. Studio does not yet switch on its own when a provider reaches a usage limit; the banner offers to check again or resume on the same account when the limit frees up.</p>
      <p>To continue in another tool, <Link to="/docs/guides/cross-tool-handoff/">hand off with SpecWeave</Link>: the spec, ledger and work in progress are committed, and the next agent runs <code>specweave pickup</code>.</p>
    </article>
    <article>
      <h3>Is it a personal agent like Dots or Hermes?</h3>
      <p>Partly. A Personal project has its own folder, memory and plan, runs scheduled routines and can be started by a webhook, all on your machine with the model you choose. It uses tools only from local MCP servers you grant tool by tool.</p>
      <p>It is not always on in a cloud: it works while the machine running it is awake. It cannot be messaged from Telegram, WhatsApp or Slack yet, and it has no managed Gmail or Calendar sign-in.</p>
    </article>
    <article>
      <h3>Does it replace Claude Code or Codex?</h3>
      <p>No. Studio runs them. Each worker is the provider’s own agent with its own sign-in, approvals and limits, so you keep the subscriptions you already pay for and add Grok Build, Cursor, Copilot or OpenCode next to them.</p>
      <p>What Studio adds is the layer above: one project across all of them, every account’s limits on one screen, and a record in git that any of them can continue from.</p>
    </article>
    <article>
      <h3>Is it a cloud service?</h3>
      <p>No. Studio is a local app on each machine, used in the browser, with a desktop app for Mac and Windows in development. Hosted relay, telemetry and self-update are off by default. Model calls still go to the providers you choose.</p>
    </article>
    <article>
      <h3>Can I use it today?</h3>
      <p>Studio is in a private pilot; there is no public download yet, and projects are being tested for the next pilot build. The SpecWeave CLI it builds on is open source and available now with <code>npm install -g specweave</code>.</p>
    </article>
  </div>;
}

export function StudioStack() {
  return <div className={styles.stack}>
    <div className={styles.layer} data-core="true"><div><small>Where you work</small><strong>SpecWeave Studio</strong></div><p>Projects, coordinator, workers, approvals, usage and machines. One screen for every agent.</p></div>
    <div className={styles.layer}><div><small>What survives the session</small><strong>SpecWeave CLI</strong></div><p>spec.md, ledger.jsonl and handoff in git. Studio can read a plan straight from an increment; any other tool can too.</p></div>
    <div className={styles.layer}><div><small>What the agents know</small><strong>vskill</strong></div><p>Verified skills installed once into Claude Code, Codex and 50+ other agents.</p></div>
  </div>;
}
