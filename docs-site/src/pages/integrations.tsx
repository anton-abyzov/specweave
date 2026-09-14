import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './continuity.module.css';

export default function Integrations() {
  return <Layout title="Optional integrations" description="Connect SpecWeave to GitHub, Jira, or Azure DevOps when delivery evidence belongs in your team's existing tracker."><main className={styles.page}>
    <header className={styles.articleHero}><span className={styles.eyebrow}>Product / Optional integrations</span><h1>Keep your tracker.<br /><em>Connect the evidence.</em></h1><p>Planning already has a home. Link engineering progress to GitHub, Jira, or Azure DevOps when your team needs it. Run SpecWeave locally without configuring any of them.</p></header>
    <div className={styles.articleBody}><table><thead><tr><th>Connection</th><th>Useful when</th><th>Start here</th></tr></thead><tbody>
      <tr><td>GitHub</td><td>Issues and repository work belong together.</td><td><Link to="/docs/guides/github-sync">GitHub guide ↗</Link></td></tr><tr><td>Jira</td><td>Product and engineering share an existing delivery process.</td><td><Link to="/docs/guides/jira-ado-sync">Jira setup ↗</Link></td></tr><tr><td>Azure DevOps</td><td>Your organization plans with work items and boards.</td><td><Link to="/docs/guides/jira-ado-sync">Azure DevOps setup ↗</Link></td></tr>
      </tbody></table>
      <h2>One explicit sync surface.</h2><pre>{'specweave sync setup\nspecweave sync status\nspecweave sync push <increment-id>\nspecweave sync pull <increment-id>'}</pre><p>Configure the target before pushing. A push can update remote issues; it is an external write. Review the configuration and run it at meaningful milestones rather than after every small file edit.</p>
      <h2>Keep authority clear.</h2><p>The local specification and ledger record engineering intent and verified task progress. A remote ticket provides planning context and a familiar place for stakeholders. A closed remote issue alone is not proof that local acceptance criteria passed.</p><p>The current pull command reports external changes for review. It does not merge those changes into local files. Automatic two-way reconciliation, silent conflict resolution, and universal hierarchy mapping are not promises of this release.</p>
      <details><summary>Do I need an integration?</summary><p>No. The board, specifications, task ledger, and handoffs work locally. Add a tracker only when it makes collaboration easier.</p></details>
      <details><summary>Will changing a card update Jira?</summary><p>A board state change is local. Use the explicit sync workflow for a linked increment when you want to publish progress to a configured tracker.</p></details>
      <details><summary>How should an enterprise evaluate this?</summary><p>Start with one repository and a disposable tracker project. Verify mappings, permissions, reopened tickets, partial failures, and retry behavior before expanding. Keep your established tracker as the planning surface.</p></details>
      <details><summary>Why not replace Linear, Jira, or Azure Boards?</summary><p>SpecWeave focuses on a different boundary: carrying intent and implementation evidence across coding tools. If your tracker and harness already solve that boundary for your team, avoid adding duplicate process.</p></details>
      <h2>Go deeper when it helps.</h2><p><Link to="/docs/integrations">Integration architecture and ownership</Link> · <Link to="/docs/reference/sync-cli">CLI reference</Link> · <Link to="/product">The work model</Link></p>
    </div></main></Layout>;
}
