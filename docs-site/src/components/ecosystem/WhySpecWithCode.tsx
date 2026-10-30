import React from 'react';
import Link from '@docusaurus/Link';
import styles from './WhySpecWithCode.module.css';

// SpecWithCode claims were checked against the app at 1.0.44 on 18 October 2026 (Cursor runs through @cursor/sdk, not its CLI); competitor cells
// against the vendors' own pages on 16 October 2026.
// Competitor cells must keep a source link; update CHECKED when you re-verify them.
const CHECKED = '16 October 2026';

type Cell = React.ReactNode;
const COLUMNS = ['SpecWithCode', 'OpenCode', 'Cloud agents'];
const ROWS: {label: string; cells: Cell[]}[] = [
  {label: 'What runs the agent', cells: [
    'Each vendor’s own agent: the Claude Code, Codex and Grok CLIs, Cursor through its official SDK, and more',
    <>Its own agent loop with build and plan agents, across 75+ model providers <Src href="https://opencode.ai/docs/providers/" /></>,
    <>The vendor’s agent in the vendor’s environment <Src href="https://code.claude.com/docs/en/claude-code-on-the-web" /></>,
  ]},
  {label: 'Where your code runs', cells: [
    'Your own computers',
    <>Your machine <Src href="https://opencode.ai/docs/server/" /></>,
    <>A vendor-hosted container or VM that clones your repo <Src href="https://learn.chatgpt.com/docs/environments/cloud-environment" /></>,
  ]},
  {label: 'Claude Pro, Max or Ultra plan', cells: [
    'Through Claude Code’s own sign-in on each machine',
    <>Its docs say Anthropic prohibits this; the plugin is no longer bundled <Src href="https://opencode.ai/docs/providers/" /></>,
    'Billed through each vendor’s own plan',
  ]},
  {label: 'Other machines', cells: [
    'Add Macs and Linux machines over SpecWithCode Connect; choose where workers run',
    <>Run <code>opencode serve</code> or <code>web</code> on a reachable address <Src href="https://opencode.ai/docs/web/" /></>,
    'Runs in the vendor’s cloud',
  ]},
  {label: 'Apps', cells: [
    'macOS on Apple silicon (Electron), Windows 10 and 11, and Linux, on x64 and arm64; Linux machines also as workers',
    <>Terminal, desktop for macOS, Windows and Linux, IDE extension <Src href="https://opencode.ai/download" /></>,
    'Web, IDE and GitHub',
  ]},
  {label: 'Price and license', cells: [
    'Free, source available',
    <>Open source (MIT) <Src href="https://github.com/anomalyco/opencode" /></>,
    'Included in or billed by each vendor’s plan',
  ]},
];

function Src({href}: {href: string}) {
  return <a className={styles.src} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Source: ${new URL(href).hostname}`}>source</a>;
}

export default function WhySpecWithCode() {
  return <section className={styles.why} id="why" aria-labelledby="why-title">
    <div className={styles.head}>
      <h2 id="why-title">Who it is for</h2>
      <p>SpecWithCode is for developers and teams who build and maintain software with several coding agents at once, on the plans they already pay for, on machines they own. If you want the cheapest single prompt, a pay-per-token tool may suit you better.</p>
      <p>Specs stay yours: link a thread to a <Link className="wv-link" to="/docs/getting-started/">SpecWeave</Link> increment and its plan card shows task progress from <code>spec.md</code> and <code>ledger.jsonl</code>. Optional and read-only: the app never rewrites your spec.</p>
    </div>

    <div className={styles.compare} id="compare">
      <div className={styles.compareHead}>
        <h2 id="compare-title">How it compares</h2>
        <p>SpecWithCode is our product, so read this with that in mind. Competitor facts come from their own sites and docs, checked on {CHECKED}; follow the source links for the current state. Cloud agents here are Codex cloud, Claude Code on the web, the GitHub Copilot cloud agent, Cursor cloud agents and Google Jules.</p>
      </div>
      <div className={styles.tableWrap} role="region" aria-label="Comparison table" tabIndex={0}>
        <table>
          <thead><tr><th scope="col"><span className={styles.srOnly}>Feature</span></th>{COLUMNS.map((c, i) => <th scope="col" key={c} className={i === 0 ? styles.ours : undefined}>{c}</th>)}</tr></thead>
          <tbody>{ROWS.map(r => <tr key={r.label}><th scope="row">{r.label}</th>{r.cells.map((c, i) => <td key={i} className={i === 0 ? styles.ours : undefined}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <ul className={styles.picks}>
        <li><b>Pick OpenCode</b> for one open agent loop across many API providers. SpecWithCode can also run OpenCode as one of its agents.</li>
        <li><b>Pick a cloud agent</b> when work should keep running with your laptop closed and your repo already lives on GitHub.</li>
        <li><b>Pick SpecWithCode</b> to coordinate several agents across your own machines, watch every subscription’s limits, and keep code off anyone else’s servers.</li>
      </ul>
      <p className={styles.sources}>Cloud agent sources: <a href="https://learn.chatgpt.com/docs/environments/cloud-environment">Codex cloud</a>, <a href="https://code.claude.com/docs/en/claude-code-on-the-web">Claude Code on the web</a>, <a href="https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment">Copilot cloud agent</a>, <a href="https://cursor.com/docs/cloud-agent">Cursor cloud agents</a>, <a href="https://jules.google/docs">Jules</a>. Plan prices: <a href="https://support.claude.com/en/articles/11049741-what-is-the-max-plan">Claude Max</a>, <a href="https://learn.chatgpt.com/docs/pricing">ChatGPT and Codex</a>. Claude plan use in other apps: <a href="https://code.claude.com/docs/en/legal-and-compliance">Anthropic’s terms</a>.</p>
      <p className={styles.more}><Link className="wv-link" to="/docs/compare/specwithcode-vs-bridgemind/">SpecWithCode vs BridgeMind</Link></p>
    </div>
  </section>;
}
