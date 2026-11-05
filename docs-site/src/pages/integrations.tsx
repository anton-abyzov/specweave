import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './continuity.module.css';
import x from './integrations.module.css';
import {ExtensionStrip, ProviderMark, motion as m, useGlow} from '../components/sections/Motion';

type Agent = {tool: string; marks: string[]; reads: string; skills: string};
type Tracker = {name: string; when: string; to: string; guide: string};

function useAgents(): Agent[] {
  return [
    {tool: translate({id: 'integrations.agents.claude.tool', message: 'Claude Code, including Projects threads', description: 'Agent card title. Keep product names in English'}), marks: ['Claude Code'], reads: translate({id: 'integrations.agents.claude.reads', message: 'CLAUDE.md, which imports AGENTS.md', description: 'Files the agent reads. Keep file names in English'}), skills: '.claude/skills/'},
    {tool: 'Codex', marks: ['Codex'], reads: 'AGENTS.md', skills: '.agents/skills/'},
    {tool: 'Grok Build', marks: ['Grok'], reads: translate({id: 'integrations.agents.grok.reads', message: 'AGENTS.md and CLAUDE.md', description: 'Files the agent reads. Keep file names in English'}), skills: translate({id: 'integrations.agents.grok.skills', message: '.grok/skills/, .agents/skills/, Claude Code skills', description: 'Skill folders the agent loads. Keep folder paths and product names in English'})},
    {tool: 'Cursor, GitHub Copilot, Gemini CLI, OpenCode', marks: ['Cursor', 'GitHub Copilot', 'Gemini CLI', 'OpenCode'], reads: 'AGENTS.md', skills: translate({id: 'integrations.agents.others.skills', message: 'Their own folders, or the CLI directly', description: 'Where other agents load skills from'})},
  ];
}

function useTrackers(): Tracker[] {
  const jiraAdo = translate({id: 'integrations.trackers.guide.jiraAdo', message: 'Jira and Azure DevOps', description: 'Link label to the Jira and Azure DevOps sync guide. Keep product names in English'});
  return [
    {name: 'GitHub Issues', when: translate({id: 'integrations.trackers.github.when', message: 'Issues and code live in the same place.', description: 'When GitHub Issues is useful'}), to: '/docs/guides/github-sync', guide: 'GitHub'},
    {name: 'Jira', when: translate({id: 'integrations.trackers.jira.when', message: 'Product and engineering share an existing delivery process.', description: 'When Jira is useful'}), to: '/docs/guides/jira-ado-sync', guide: jiraAdo},
    {name: 'Azure DevOps', when: translate({id: 'integrations.trackers.ado.when', message: 'Your organization plans with work items and boards.', description: 'When Azure DevOps is useful'}), to: '/docs/guides/jira-ado-sync', guide: jiraAdo},
  ];
}

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
    <figcaption id="repo-diagram-caption" className={m.tag}><Translate id="integrations.diagram.caption" description="Caption under the repository diagram">Illustration · every agent reads the same files in your repository</Translate></figcaption>
  </figure>;
}

export default function Integrations() {
  const glowAgents = useGlow<HTMLUListElement>();
  const glowTrackers = useGlow<HTMLUListElement>();
  const AGENTS = useAgents();
  const TRACKERS = useTrackers();
  return <Layout title={translate({id: 'integrations.meta.title', message: 'AI coding agents and integrations', description: 'Integrations page title'})} description={translate({id: 'integrations.meta.description', message: 'SpecWeave works with every coding agent that reads AGENTS.md. Issue tracker sync is optional.', description: 'Integrations page meta description. Keep product and file names in English'})}><main className={`${styles.page} ${x.page}`}>
    <header className={x.hero}>
      <div className={m.enter}>
        <h1 style={{['--i' as string]: 0}}><Translate id="integrations.hero.title" description="Integrations page hero headline">Every coding agent reads it.</Translate></h1>
        <p className={x.lead} style={{['--i' as string]: 1}}><Translate id="integrations.hero.lead" description="Integrations hero lead paragraph. Keep product names in English">SpecWeave needs no service and no account. Coding agents read the files in your repository, so Claude Code, Codex, Grok and the rest pick up the same spec and ledger.</Translate></p>
        <div style={{['--i' as string]: 2}} className={x.heroStrip}><ExtensionStrip /></div>
      </div>
      <RepoDiagram />
    </header>

    <section className={x.section} aria-labelledby="agents-title">
      <div className={x.head}>
        <h2 id="agents-title"><Translate id="integrations.agents.title" description="Coding agents section heading">Coding agents</Translate></h2>
        <p><Translate
          id="integrations.agents.intro"
          description="Coding agents section intro. {handoffLink} is a link reading 'handoff and a pickup'; {othersLink} is a link reading 'Codex, Grok and others'"
          values={{
            handoffLink: <Link className={x.link} to="/docs/guides/cross-tool-handoff"><Translate id="integrations.agents.intro.handoffLink" description="Link text to the cross-tool handoff guide">handoff and a pickup</Translate></Link>,
            othersLink: <Link className={x.link} to="/docs/integrations/generic-ai-tools"><Translate id="integrations.agents.intro.othersLink" description="Link text to the generic AI tools guide. Keep product names in English">Codex, Grok and others</Translate></Link>,
          }}>
          {'The CLI is the same in every tool, so a tool without skills still runs the loop. Switching between them, or between two subscriptions of one, is a {handoffLink}. More in {othersLink}.'}
        </Translate></p>
      </div>
      <ul className={`${x.agents} ${m.stagger}`} ref={glowAgents}>
        {AGENTS.map((a, i) => <li key={a.tool} className={m.card} data-glow style={{['--i' as string]: i}}>
          <div className={x.marks}>{a.marks.map(n => <ProviderMark key={n} name={n} size={32} />)}</div>
          <h3>{a.tool}</h3>
          <dl className={x.facts}>
            <div><dt><Translate id="integrations.agents.facts.reads" description="Label: files an agent reads">Reads</Translate></dt><dd>{a.reads}</dd></div>
            <div><dt><Translate id="integrations.agents.facts.skills" description="Label: where an agent loads skills from">Skills</Translate></dt><dd><code>{a.skills}</code></dd></div>
          </dl>
        </li>)}
      </ul>
    </section>

    <section className={x.section} aria-labelledby="trackers-title">
      <div className={x.head}>
        <h2 id="trackers-title"><Translate id="integrations.trackers.title" description="Issue trackers section heading">Issue trackers (optional)</Translate></h2>
        <p><Translate
          id="integrations.trackers.intro"
          description="Issue trackers section intro. {syncSetup} and {syncPull} are CLI commands shown as code"
          values={{syncSetup: <code>sync setup</code>, syncPull: <code>sync pull</code>}}>
          {'A push is an external write, so it happens only when you run it. Starting, pausing or resuming an increment never touches a tracker, and nothing creates issues except a push. Completing an increment closes the issue a push linked only when the close-on-complete setting is on; {syncSetup} turns it on, and you can turn it off. {syncPull} reports what changed in the tracker for you to review; it does not rewrite your local files.'}
        </Translate></p>
      </div>
      <ul className={`${x.trackers} ${m.stagger}`} ref={glowTrackers}>
        {TRACKERS.map((t, i) => <li key={t.name} className={m.card} data-glow style={{['--i' as string]: i}}>
          <h3>{t.name}</h3>
          <p><span className={x.factLabel}><Translate id="integrations.trackers.usefulWhen" description="Label before when a tracker is useful">Useful when</Translate></span>{t.when}</p>
          <Link className={x.link} to={t.to}>{t.guide}</Link>
        </li>)}
      </ul>
      <pre className={`wv-code ${x.code} ${m.reveal}`}>{'specweave sync setup           # ' + translate({id: 'integrations.trackers.code.setup', message: 'connect a tracker', description: 'Shell comment after specweave sync setup'}) + '\nspecweave sync status          # ' + translate({id: 'integrations.trackers.code.status', message: 'credentials, health, what would change', description: 'Shell comment after specweave sync status'}) + '\nspecweave sync push 0042       # ' + translate({id: 'integrations.trackers.code.push', message: 'publish progress, when you choose', description: 'Shell comment after specweave sync push'}) + '\nspecweave sync pull            # ' + translate({id: 'integrations.trackers.code.pull', message: 'report changes made in the tracker', description: 'Shell comment after specweave sync pull'})}</pre>
    </section>

    <section className={x.section} aria-labelledby="owns-title">
      <div className={x.head}>
        <h2 id="owns-title"><Translate id="integrations.owns.title" description="Ownership section heading">Who owns what</Translate></h2>
        <p><Translate id="integrations.owns.intro" description="Ownership section intro">A closed issue is not proof that acceptance criteria passed; a passing verify report is.</Translate></p>
      </div>
      <div className={`${x.owns} ${m.stagger}`}>
        <div className={`${m.card} ${x.ownsSpec}`} style={{['--i' as string]: 0}}>
          <span className="wv-chip wv-chip--iris"><Translate id="integrations.owns.repo.chip" description="Chip: owned in your repository">In your repository</Translate></span>
          <h3><Translate id="integrations.owns.repo.title" description="Card title: what the repository owns">The spec and the ledger</Translate></h3>
          <p><Translate id="integrations.owns.repo.body" description="Card body: what the repository owns">The spec and the ledger record what done means and what was verified.</Translate></p>
        </div>
        <div className={m.card} style={{['--i' as string]: 1}}>
          <span className="wv-chip"><Translate id="integrations.owns.tracker.chip" description="Chip: owned in the issue tracker">In the tracker</Translate></span>
          <h3><Translate id="integrations.owns.tracker.title" description="Card title: what the tracker owns">Planning context</Translate></h3>
          <p><Translate id="integrations.owns.tracker.body" description="Card body: what the tracker owns">The tracker holds planning context: priority, assignee, labels and the place stakeholders look.</Translate></p>
        </div>
      </div>
      <div className={x.faq}>
        <details><summary><Translate id="integrations.faq.needTracker.q" description="FAQ question">Do I need a tracker?</Translate></summary><p><Translate id="integrations.faq.needTracker.a" description="FAQ answer">No. Specs, the ledger, handoffs and the dashboard all work locally. Add a tracker when it makes collaboration easier.</Translate></p></details>
        <details><summary><Translate id="integrations.faq.boardJira.q" description="FAQ question. Keep product names in English">Will moving a card on the dashboard update Jira?</Translate></summary><p><Translate id="integrations.faq.boardJira.a" description="FAQ answer. {command} is a CLI command shown as code" values={{command: <code>specweave sync push</code>}}>{'No. Board changes are local. Run {command} for the increment when you want the tracker updated.'}</Translate></p></details>
        <details><summary><Translate id="integrations.faq.evaluate.q" description="FAQ question">How should a team evaluate this?</Translate></summary><p><Translate id="integrations.faq.evaluate.a" description="FAQ answer. {command} is a CLI command shown as code" values={{command: <code>sync push --dry-run</code>}}>{'Start with one repository and a throwaway tracker project. Check the mapping, permissions, reopened issues and partial failures with {command} before connecting the real one.'}</Translate></p></details>
      </div>
    </section>

    <section className={x.section} aria-labelledby="also-title">
      <h2 id="also-title" className={x.alsoTitle}><Translate id="integrations.also.title" description="Related products heading. Keep product names in English">Also from SpecWeave</Translate></h2>
      <div className={`${x.also} ${m.stagger}`}>
        <Link to="/jev" className={`${m.card} ${x.alsoCard}`} style={{['--i' as string]: 0}}>
          <h3>Jev (System One)</h3>
          <p><Translate id="integrations.also.jev.body" description="Jev card description">Answers closed-set decisions with a small fast model.</Translate></p>
        </Link>
        <a href="https://verified-skill.com" className={`${m.card} ${x.alsoCard}`} style={{['--i' as string]: 1}}>
          <h3>Verified Skill</h3>
          <p><Translate id="integrations.also.vskill.body" description="Verified Skill card description. {command} is a CLI command shown as code" values={{command: <code>npx vskill</code>}}>{'A registry of security-checked agent skills, installed with {command}.'}</Translate></p>
        </a>
        <Link to="/docs/reference/sync-cli" className={`${m.card} ${x.alsoCard}`} style={{['--i' as string]: 2}}>
          <h3><Translate id="integrations.also.syncRef.title" description="Card title. Keep the command specweave sync in English">specweave sync reference</Translate></h3>
          <p><Translate id="integrations.also.syncRef.body" description="Sync reference card description">The tracker sync commands in one reference page.</Translate></p>
        </Link>
      </div>
    </section>
  </main></Layout>;
}
