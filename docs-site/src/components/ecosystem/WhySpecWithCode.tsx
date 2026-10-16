import React from 'react';
import Link from '@docusaurus/Link';
import styles from './WhySpecWithCode.module.css';

// Every claim here was checked against the app (1.0.37) and the vendors' own pages on 16 October 2026.
// Competitor cells must keep a source link; update CHECKED when you re-verify them.
const CHECKED = '16 October 2026';

const REASONS: {title: string; body: React.ReactNode}[] = [
  {title: 'Built for engineering work', body: <>A coordinator splits a goal into worker threads, each of which can work on its own branch or worktree. Every result comes back with a report and the files it changed, and a person marks the work verified.</>},
  {title: 'Get the most from the plans you pay for', body: <>Claude Max costs $100 or $200 a month and ChatGPT Pro $100, $200 or $500; each includes its coding agent within session and weekly limits. API billing charges for every token, and an agent resends its growing context on every turn, so long daily sessions add up fast. SpecWithCode shows each account’s limits, can move a thread to another signed-in provider before a limit, and reads pooled accounts from a CLIProxyAPI hub. <a href="#subscription-value">Run your own numbers</a>.</>},
  {title: 'Several machines, one workspace', body: <>Pair your other Macs over your network, SSH or Tailscale and choose where each thread runs. Move a project to another machine, or continue a thread on another device when one account runs out.</>},
  {title: 'Private by default, no SpecWithCode cloud', body: <>No account to create. Threads, plans and settings stay in a local database under <code>~/.specwithcode</code>, and telemetry is off unless you turn it on. Your code goes only to the model providers you choose. The optional Connect relay stays off until you sign in.</>},
  {title: 'A Mac app, not another terminal tab', body: <>Threads, diffs, usage limits and machines in one window. Built for Apple silicon, signed with Developer ID and notarized by Apple.</>},
  {title: 'Every agent in one place', body: <>Claude Code, Codex, Cursor, Grok, OpenCode, Muse Code, Antigravity and Pi, plus GitHub Copilot CLI and Gemini CLI through the ACP registry. Each runs as its own CLI with its own sign-in.</>},
  {title: 'Agents that can use your Chrome', body: <>The SpecWithCode Browser extension lets an agent open, read, click and screenshot pages in your own Chrome profile, inside a tab group you can see and close. It is not in the Chrome Web Store yet; the app prepares it for you to load unpacked.</>},
  {title: 'Specs when you want them', body: <>Link a thread to a <Link to="/docs/getting-started/">SpecWeave</Link> increment and its plan card shows the spec and task progress from <code>spec.md</code> and <code>ledger.jsonl</code>. Optional and read-only: the app never rewrites your spec.</>},
];

type Cell = React.ReactNode;
const COLUMNS = ['SpecWithCode', 'OpenCode', 'T3 Code', 'Cloud agents'];
const ROWS: {label: string; cells: Cell[]}[] = [
  {label: 'What runs the agent', cells: [
    'Each vendor’s own CLI: Claude Code, Codex, Cursor, Grok and more',
    <>Its own agent loop with build and plan agents, across 75+ model providers <Src href="https://opencode.ai/docs/providers/" /></>,
    <>Vendor CLIs: Claude Code, Codex, Cursor, Grok Build, OpenCode, Antigravity <Src href="https://github.com/pingdotgg/t3code" /></>,
    <>The vendor’s agent in the vendor’s environment <Src href="https://code.claude.com/docs/en/claude-code-on-the-web" /></>,
  ]},
  {label: 'Where your code runs', cells: [
    'Your Macs',
    <>Your machine <Src href="https://opencode.ai/docs/server/" /></>,
    <>Your machine <Src href="https://github.com/pingdotgg/t3code" /></>,
    <>A vendor-hosted container or VM that clones your repo <Src href="https://learn.chatgpt.com/docs/environments/cloud-environment" /></>,
  ]},
  {label: 'Claude Pro or Max plan', cells: [
    'Through Claude Code’s own sign-in on each machine',
    <>Its docs say Anthropic prohibits this; the plugin is no longer bundled <Src href="https://opencode.ai/docs/providers/" /></>,
    <>Through Claude Code (“works with your subscriptions”) <Src href="https://github.com/pingdotgg/t3code" /></>,
    'Billed through each vendor’s own plan',
  ]},
  {label: 'Other machines', cells: [
    'Pair Macs over your network, SSH or Tailscale; move projects between them',
    <>Run <code>opencode serve</code> or <code>web</code> on a reachable address <Src href="https://opencode.ai/docs/web/" /></>,
    <>Network, Tailscale, SSH or the T3 Connect relay <Src href="https://raw.githubusercontent.com/pingdotgg/t3code/main/docs/user/remote-access.md" /></>,
    'Runs in the vendor’s cloud',
  ]},
  {label: 'Apps', cells: [
    'macOS on Apple silicon (Electron)',
    <>Terminal, desktop for macOS, Windows and Linux, IDE extension <Src href="https://opencode.ai/download" /></>,
    <>Desktop (Electron), web, iOS, Android and a CLI <Src href="https://github.com/pingdotgg/t3code" /></>,
    'Web, IDE and GitHub',
  ]},
  {label: 'Price and license', cells: [
    'Free, open source (MIT)',
    <>Open source (MIT) <Src href="https://github.com/anomalyco/opencode" /></>,
    <>Open source (MIT) <Src href="https://github.com/pingdotgg/t3code" /></>,
    'Included in or billed by each vendor’s plan',
  ]},
];

function Src({href}: {href: string}) {
  return <a className={styles.src} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Source: ${new URL(href).hostname}`}>source</a>;
}

export default function WhySpecWithCode() {
  return <section className={styles.why} id="why" aria-labelledby="why-title">
    <div className={styles.head}>
      <p className={styles.eyebrow}>Why SpecWithCode</p>
      <h2 id="why-title">For engineers who run agents all day.</h2>
      <p>SpecWithCode is for people who build and maintain software with several coding agents at once, on the plans they already pay for, on machines they own. If you want the cheapest single prompt, a pay-per-token tool may suit you better.</p>
    </div>
    <ol className={styles.reasons}>
      {REASONS.map((r, i) => <li key={r.title}><span className={styles.num} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{r.title}</h3><p>{r.body}</p></li>)}
    </ol>

    <div className={styles.compare} id="compare">
      <div className={styles.compareHead}>
        <h3>How it compares</h3>
        <p>SpecWithCode is our product, so read this with that in mind. Competitor facts come from their own sites and docs, checked on {CHECKED}; follow the source links for the current state. Cloud agents here are Codex cloud, Claude Code on the web, the GitHub Copilot coding agent, Cursor cloud agents and Google Jules.</p>
      </div>
      <div className={styles.tableWrap} role="region" aria-label="Comparison table" tabIndex={0}>
        <table>
          <thead><tr><th scope="col"><span className={styles.srOnly}>Feature</span></th>{COLUMNS.map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead>
          <tbody>{ROWS.map(r => <tr key={r.label}><th scope="row">{r.label}</th>{r.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <ul className={styles.picks}>
        <li><b>Pick OpenCode</b> for one open agent loop across many API providers, or if you need Windows or Linux. SpecWithCode can also run OpenCode as one of its agents.</li>
        <li><b>Pick T3 Code</b> for a local CLI wrapper with web and phone clients.</li>
        <li><b>Pick a cloud agent</b> when work should keep running with your laptop closed and your repo already lives on GitHub.</li>
        <li><b>Pick SpecWithCode</b> to coordinate several agents across your own Macs, watch every subscription’s limits, and keep code off anyone else’s servers.</li>
      </ul>
      <p className={styles.sources}>Cloud agent sources: <a href="https://learn.chatgpt.com/docs/environments/cloud-environment">Codex cloud</a>, <a href="https://code.claude.com/docs/en/claude-code-on-the-web">Claude Code on the web</a>, <a href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment">Copilot coding agent</a>, <a href="https://cursor.com/docs/cloud-agent">Cursor cloud agents</a>, <a href="https://jules.google/docs">Jules</a>. Plan prices: <a href="https://support.claude.com/en/articles/11049741-what-is-the-max-plan">Claude Max</a>, <a href="https://learn.chatgpt.com/docs/pricing">ChatGPT and Codex</a>. Claude plan use in other apps: <a href="https://code.claude.com/docs/en/legal-and-compliance">Anthropic’s terms</a>.</p>
      <p className={styles.more}><Link to="/docs/compare/specwithcode-vs-opencode-t3-code">Full comparison with every source</Link></p>
    </div>
  </section>;
}
