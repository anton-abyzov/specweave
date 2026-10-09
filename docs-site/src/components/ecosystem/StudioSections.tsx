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
    <p className={styles.compareNote}>Cloud project agents include Claude Code Projects and OpenAI Dots. Compared from their public documentation in October 2026; these products change quickly.</p>
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
