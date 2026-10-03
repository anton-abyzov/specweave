import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './continuity.module.css';
import teams from './pricing.module.css';

const PILOT_MAILTO =
  'mailto:anton.abyzov@gmail.com?subject=SpecWeave%20founding%20team%20pilot' +
  '&body=Team%20size%3A%0ATools%20you%20use%20(Claude%20Code%2C%20Codex%2C%20other)%3A%0A' +
  'Repository%20to%20start%20with%3A%0AWhat%20breaks%20today%20when%20someone%20hits%20a%20usage%20limit%3A%0A';

const PLANS = [
  {
    label: '01 / Open source',
    name: 'SpecWeave',
    price: '$0',
    period: 'MIT, forever',
    lead: 'Everything one developer needs to switch tools without losing their place.',
    features: [
      'Specs, task ledger and evidence in git',
      'Handoff and pickup across Claude Code, Codex, Grok, Gemini CLI and others',
      'Auto-handoff at 90 percent of a usage limit',
      'Optional GitHub, Jira and Azure DevOps sync',
    ],
    cta: {label: 'Quick start', to: '/docs/getting-started'},
  },
  {
    label: '02 / Private skills',
    name: 'Verified Skill Pro and Team',
    price: '$20',
    period: 'a month, or $30 a seat for teams of 3+',
    lead: "Your team's prompts and skills, private, installed into every agent.",
    features: [
      'Skills synced from your private GitHub repositories',
      'One install for Claude Code, Codex and 50+ agents',
      'Security scan on every version',
      'Seats added or removed any time',
    ],
    cta: {label: 'Plans on Verified Skill', href: 'https://verified-skill.com/pricing'},
  },
  {
    label: '03 / Founding team pilot',
    name: 'Set up with you',
    price: '$990',
    period: 'one time, up to 10 engineers',
    lead: 'Two weeks to get a whole team onto one workflow that survives a usage limit.',
    features: [
      'SpecWeave set up in one of your repositories, with your AGENTS.md written',
      'Auto-handoff between Claude Code and Codex for every engineer',
      "Your shared prompts moved into a private skill repository",
      'A live handoff drill with your team, then a written report',
      'Three months of Verified Skill Team for 5 seats included',
    ],
    cta: {label: 'Apply for a pilot', href: PILOT_MAILTO},
    highlight: true,
  },
];

export default function Pricing() {
  return <Layout title="Pricing for teams" description="SpecWeave is free and open source. Teams pay for private agent skills on Verified Skill, and for a founding pilot that sets up handoff between Claude Code and Codex across the whole team.">
    <main className={styles.page}>
      <header className={styles.articleHero}>
        <span className={styles.eyebrow}>Teams / Pricing</span>
        <h1>Free for every developer.<br /><em>Paid when a team needs it to stick.</em></h1>
        <p>SpecWeave stays MIT. Teams pay for two things: private skills their agents share, and help putting every engineer on the same workflow, so a usage limit in one tool is a handoff instead of a lost afternoon.</p>
      </header>

      <section className={styles.section}>
        <div className={teams.plans}>
          {PLANS.map((plan) => (
            <article key={plan.label} className={plan.highlight ? `${teams.plan} ${teams.highlight}` : teams.plan}>
              <span className={styles.layerNumber}>{plan.label}</span>
              <h2 className={teams.name}>{plan.name}</h2>
              <p className={teams.price}><b>{plan.price}</b> <span>{plan.period}</span></p>
              <p className={teams.lead}>{plan.lead}</p>
              <ul className={teams.features}>
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              {'to' in plan.cta
                ? <Link className={plan.highlight ? styles.primary : styles.secondary} to={plan.cta.to}>{plan.cta.label} <span aria-hidden="true">↗</span></Link>
                : <a className={plan.highlight ? styles.primary : styles.secondary} href={plan.cta.href}>{plan.cta.label} <span aria-hidden="true">↗</span></a>}
            </article>
          ))}
        </div>
        <div className={teams.note}>Five pilot places at this price. If the handoff drill does not work in your repository, you do not pay.</div>
      </section>

      <div className={styles.articleBody}>
        <h2>What a pilot looks like</h2>
        <table><thead><tr><th>When</th><th>What happens</th></tr></thead><tbody>
          <tr><td>Day 1</td><td>A call to pick the repository and the work in flight. We read your current CLAUDE.md, AGENTS.md and prompts.</td></tr>
          <tr><td>Days 2 to 5</td><td>SpecWeave goes in on a branch you review: one AGENTS.md every tool reads, specs for the work in flight, auto-handoff on for each engineer's tools.</td></tr>
          <tr><td>Days 6 to 9</td><td>Shared prompts become skills in a private repository, installed with one command into Claude Code and Codex.</td></tr>
          <tr><td>Day 10</td><td>The drill: an engineer runs out of Claude Code mid-task and Codex picks it up from the handoff. You get the HTML evidence report.</td></tr>
        </tbody></table>

        <h2>Questions teams ask</h2>
        <details><summary>Do we need the pilot to use SpecWeave?</summary><p>No. <code>npm install -g specweave</code> and the <Link to="/docs/getting-started">quick start</Link> are enough for one developer. The pilot is for teams that want it set up across several people and tools at once.</p></details>
        <details><summary>What triggers a handoff automatically?</summary><p><code>specweave auto-handoff on</code> hands off when a usage window passes 90 percent, or a threshold you pick. The next tool runs <code>specweave pickup</code>. Details in <Link to="/docs/guides/cross-tool-handoff">handoff and pickup</Link>.</p></details>
        <details><summary>Where does our code go?</summary><p>Nowhere new. Specs, the ledger and handoffs are files in your repository. Private skills live in your own GitHub repositories; Verified Skill syncs and scans them for install.</p></details>
        <details><summary>How do we pay?</summary><p>Verified Skill plans are paid by card on <a href="https://verified-skill.com/pricing">verified-skill.com</a>. The pilot is invoiced once you have picked a start date.</p></details>
      </div>

      <section className={styles.finalCta}>
        <h2>One workflow for the team.<br /><em>Any tool for each engineer.</em></h2>
        <a className={styles.primary} href={PILOT_MAILTO}>Apply for a pilot <span aria-hidden="true">↗</span></a>
        <Link className={styles.textLink} to="/docs/guides/cross-tool-handoff">See how handoff works</Link>
      </section>
    </main>
  </Layout>;
}
