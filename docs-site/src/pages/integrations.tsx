import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './continuity.module.css';
import x from './integrations.module.css';
import {ExtensionStrip, ProviderMark, motion as m, useGlow} from '../components/sections/Motion';

const AGENTS: Array<{tool: string; marks: string[]; reads: string; skills: string}> = [
  {tool: 'Claude Code, including Projects threads', marks: ['Claude Code'], reads: 'CLAUDE.md, which imports AGENTS.md', skills: '.claude/skills/'},
  {tool: 'Codex', marks: ['Codex'], reads: 'AGENTS.md', skills: '.agents/skills/'},
  {tool: 'Grok Build', marks: ['Grok'], reads: 'AGENTS.md and CLAUDE.md', skills: '.grok/skills/, .agents/skills/, Claude Code skills'},
  {tool: 'Cursor, GitHub Copilot, Gemini CLI, OpenCode', marks: ['Cursor', 'GitHub Copilot', 'Gemini CLI', 'OpenCode'], reads: 'AGENTS.md', skills: 'Their own folders, or the CLI directly'},
];

const TRACKERS: Array<{name: string; when: string; to: string; guide: string}> = [
  {name: 'GitHub Issues', when: 'Issues and code live in the same place.', to: '/docs/guides/github-sync', guide: 'GitHub'},
  {name: 'Jira', when: 'Product and engineering share an existing delivery process.', to: '/docs/guides/jira-ado-sync', guide: 'Jira and Azure DevOps'},
  {name: 'Azure DevOps', when: 'Your organization plans with work items and boards.', to: '/docs/guides/jira-ado-sync', guide: 'Jira and Azure DevOps'},
];

/* Illustration: every agent reads the same files in the repository. */
const RING = ['Claude Code', 'Codex', 'Cursor', 'OpenCode', 'Grok', 'GitHub Copilot'];

function RepoDiagram() {
  return <figure className={x.diagram} aria-labelledby="repo-diagram-caption">
    <div className={x.ring} aria-hidden="true">
      {RING.map((name, i) => <span key={name} className={x.spoke} style={{['--i' as string]: i, ['--n' as string]: RING.length}}>
        <span className={x.spokeLine}><i className={m.drawX} /></span>
        <span className={x.spokeAgent}><ProviderMark name={name} size={34} /><span>{name}</span></span>
      </span>)}
      <div className={x.repo}>
        <span className={x.repoTitle}>your-repo/</span>
        <code>AGENTS.md</code>
        <code>CLAUDE.md</code>
        <code>.specweave/</code>
      </div>
    </div>
    <figcaption id="repo-diagram-caption" className={m.tag}>Illustration · every agent reads the same files in your repository</figcaption>
  </figure>;
}

export default function Integrations() {
  const glowAgents = useGlow<HTMLUListElement>();
  const glowTrackers = useGlow<HTMLUListElement>();
  return <Layout title="AI coding agents and integrations" description="SpecWeave works with every coding agent that reads AGENTS.md. Issue tracker sync is optional."><main className={`${styles.page} ${x.page}`}>
    <header className={x.hero}>
      <div className={m.enter}>
        <h1 style={{['--i' as string]: 0}}>Every coding agent reads it.</h1>
        <p className={x.lead} style={{['--i' as string]: 1}}>SpecWeave needs no service and no account. Coding agents read the files in your repository, so Claude Code, Codex, Grok and the rest pick up the same spec and ledger.</p>
        <div style={{['--i' as string]: 2}} className={x.heroStrip}><ExtensionStrip /></div>
      </div>
      <RepoDiagram />
    </header>

    <section className={x.section} aria-labelledby="agents-title">
      <div className={x.head}>
        <h2 id="agents-title">Coding agents</h2>
        <p>The CLI is the same in every tool, so a tool without skills still runs the loop. Switching between them, or between two subscriptions of one, is a <Link className={x.link} to="/docs/guides/cross-tool-handoff">handoff and a pickup</Link>. More in <Link className={x.link} to="/docs/integrations/generic-ai-tools">Codex, Grok and others</Link>.</p>
      </div>
      <ul className={`${x.agents} ${m.stagger}`} ref={glowAgents}>
        {AGENTS.map((a, i) => <li key={a.tool} className={m.card} data-glow style={{['--i' as string]: i}}>
          <div className={x.marks}>{a.marks.map(n => <ProviderMark key={n} name={n} size={32} />)}</div>
          <h3>{a.tool}</h3>
          <dl className={x.facts}>
            <div><dt>Reads</dt><dd>{a.reads}</dd></div>
            <div><dt>Skills</dt><dd><code>{a.skills}</code></dd></div>
          </dl>
        </li>)}
      </ul>
    </section>

    <section className={x.section} aria-labelledby="trackers-title">
      <div className={x.head}>
        <h2 id="trackers-title">Issue trackers (optional)</h2>
        <p>A push is an external write, so it happens only when you run it. Starting, pausing or resuming an increment never touches a tracker, and nothing creates issues except a push. Completing an increment closes the issue a push linked only when the close-on-complete setting is on; <code>sync setup</code> turns it on, and you can turn it off. <code>sync pull</code> reports what changed in the tracker for you to review; it does not rewrite your local files.</p>
      </div>
      <ul className={`${x.trackers} ${m.stagger}`} ref={glowTrackers}>
        {TRACKERS.map((t, i) => <li key={t.name} className={m.card} data-glow style={{['--i' as string]: i}}>
          <h3>{t.name}</h3>
          <p><span className={x.factLabel}>Useful when</span>{t.when}</p>
          <Link className={x.link} to={t.to}>{t.guide}</Link>
        </li>)}
      </ul>
      <pre className={`wv-code ${x.code} ${m.reveal}`}>{'specweave sync setup           # connect a tracker\nspecweave sync status          # credentials, health, what would change\nspecweave sync push 0042       # publish progress, when you choose\nspecweave sync pull            # report changes made in the tracker'}</pre>
    </section>

    <section className={x.section} aria-labelledby="owns-title">
      <div className={x.head}>
        <h2 id="owns-title">Who owns what</h2>
        <p>A closed issue is not proof that acceptance criteria passed; a passing verify report is.</p>
      </div>
      <div className={`${x.owns} ${m.stagger}`}>
        <div className={`${m.card} ${x.ownsSpec}`} style={{['--i' as string]: 0}}>
          <span className="wv-chip wv-chip--iris">In your repository</span>
          <h3>The spec and the ledger</h3>
          <p>The spec and the ledger record what done means and what was verified.</p>
        </div>
        <div className={m.card} style={{['--i' as string]: 1}}>
          <span className="wv-chip">In the tracker</span>
          <h3>Planning context</h3>
          <p>The tracker holds planning context: priority, assignee, labels and the place stakeholders look.</p>
        </div>
      </div>
      <div className={x.faq}>
        <details><summary>Do I need a tracker?</summary><p>No. Specs, the ledger, handoffs and the dashboard all work locally. Add a tracker when it makes collaboration easier.</p></details>
        <details><summary>Will moving a card on the dashboard update Jira?</summary><p>No. Board changes are local. Run <code>specweave sync push</code> for the increment when you want the tracker updated.</p></details>
        <details><summary>How should a team evaluate this?</summary><p>Start with one repository and a throwaway tracker project. Check the mapping, permissions, reopened issues and partial failures with <code>sync push --dry-run</code> before connecting the real one.</p></details>
      </div>
    </section>

    <section className={x.section} aria-labelledby="also-title">
      <h2 id="also-title" className={x.alsoTitle}>Also from SpecWeave</h2>
      <div className={`${x.also} ${m.stagger}`}>
        <Link to="/jev" className={`${m.card} ${x.alsoCard}`} style={{['--i' as string]: 0}}>
          <h3>Jev (System One)</h3>
          <p>Answers closed-set decisions with a small fast model.</p>
        </Link>
        <a href="https://verified-skill.com" className={`${m.card} ${x.alsoCard}`} style={{['--i' as string]: 1}}>
          <h3>Verified Skill</h3>
          <p>A registry of security-checked agent skills, installed with <code>npx vskill</code>.</p>
        </a>
        <Link to="/docs/reference/sync-cli" className={`${m.card} ${x.alsoCard}`} style={{['--i' as string]: 2}}>
          <h3>specweave sync reference</h3>
          <p>The tracker sync commands in one reference page.</p>
        </Link>
      </div>
    </section>
  </main></Layout>;
}
