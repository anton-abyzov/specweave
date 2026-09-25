import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './continuity.module.css';

export default function Integrations() {
  return <Layout title="Integrations" description="SpecWeave works with every coding agent that reads AGENTS.md, and pushes progress to GitHub, Jira or Azure DevOps only when you ask."><main className={styles.page}>
    <header className={styles.articleHero}><span className={styles.eyebrow}>Product / Integrations</span><h1>Every agent reads it.<br /><em>Trackers only when you ask.</em></h1><p>SpecWeave needs no service and no account. Coding agents read the files in your repository. Issue trackers are optional, and in 3.0 nothing reaches them unless you run <code>specweave sync push</code>.</p></header>
    <div className={styles.articleBody}>
      <h2>Coding agents</h2>
      <table><thead><tr><th>Tool</th><th>Reads</th><th>Skills</th></tr></thead><tbody>
        <tr><td>Claude Code, including Projects threads</td><td>CLAUDE.md, which imports AGENTS.md</td><td>.claude/skills/</td></tr>
        <tr><td>Codex</td><td>AGENTS.md</td><td>.agents/skills/</td></tr>
        <tr><td>Grok Build</td><td>AGENTS.md and CLAUDE.md</td><td>.grok/skills/, .agents/skills/, Claude Code skills</td></tr>
        <tr><td>Cursor, GitHub Copilot, Gemini CLI, OpenCode</td><td>AGENTS.md</td><td>Their own folders, or the CLI directly</td></tr>
      </tbody></table>
      <p>The CLI is the same in every tool, so a tool without skills still runs the loop. Switching between them, or between two subscriptions of one, is a <Link to="/docs/guides/cross-tool-handoff">handoff and a pickup</Link>. More in <Link to="/docs/integrations/generic-ai-tools">Codex, Grok and others</Link>.</p>

      <h2>Issue trackers</h2>
      <table><thead><tr><th>Tracker</th><th>Useful when</th><th>Guide</th></tr></thead><tbody>
        <tr><td>GitHub Issues</td><td>Issues and code live in the same place.</td><td><Link to="/docs/guides/github-sync">GitHub</Link></td></tr>
        <tr><td>Jira</td><td>Product and engineering share an existing delivery process.</td><td><Link to="/docs/guides/jira-ado-sync">Jira and Azure DevOps</Link></td></tr>
        <tr><td>Azure DevOps</td><td>Your organization plans with work items and boards.</td><td><Link to="/docs/guides/jira-ado-sync">Jira and Azure DevOps</Link></td></tr>
      </tbody></table>
      <pre>{'specweave sync setup           # connect a tracker\nspecweave sync status          # credentials, health, what would change\nspecweave sync push 0042       # publish progress, when you choose\nspecweave sync pull            # report changes made in the tracker'}</pre>
      <p>A push is an external write, so it happens only when you run it. Starting, pausing or resuming an increment never touches a tracker, and nothing creates issues except a push. Completing an increment closes the GitHub issue a push linked it to. <code>sync pull</code> reports what changed in the tracker for you to review; it does not rewrite your local files.</p>

      <h2>Who owns what</h2>
      <p>The spec and the ledger record what done means and what was verified. The tracker holds planning context: priority, assignee, labels and the place stakeholders look. A closed issue is not proof that acceptance criteria passed; a passing verify report is.</p>

      <details><summary>Do I need a tracker?</summary><p>No. Specs, the ledger, handoffs and the dashboard all work locally. Add a tracker when it makes collaboration easier.</p></details>
      <details><summary>Will moving a card on the dashboard update Jira?</summary><p>No. Board changes are local. Run <code>specweave sync push</code> for the increment when you want the tracker updated.</p></details>
      <details><summary>What is changing in 3.1?</summary><p>The sync engine is being rewritten around one issue per increment and one link field, with Jira and Azure DevOps as small adapters. 3.0 keeps the existing push behaviour, minus the writes on status changes.</p></details>
      <details><summary>How should a team evaluate this?</summary><p>Start with one repository and a throwaway tracker project. Check the mapping, permissions, reopened issues and partial failures with <code>sync push --dry-run</code> before connecting the real one.</p></details>

      <h2>Also from SpecWeave</h2>
      <p><Link to="/jev">Jev (System One)</Link> answers closed-set decisions with a small fast model. <a href="https://verified-skill.com">Verified Skill</a> is a registry of security-checked agent skills, installed with <code>npx vskill</code>. <Link to="/docs/reference/sync-cli">specweave sync reference</Link>.</p>
    </div></main></Layout>;
}
