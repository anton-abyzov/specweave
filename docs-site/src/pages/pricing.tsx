import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './continuity.module.css';
import teams from './pricing.module.css';

const PILOT_MAILTO =
  'mailto:anton.abyzov@gmail.com?subject=SpecWeave%20founding%20team%20pilot' +
  '&body=Team%20size%3A%0ATools%20you%20use%20(Claude%20Code%2C%20Codex%2C%20other)%3A%0A' +
  'Repository%20to%20start%20with%3A%0AWhat%20breaks%20today%20when%20someone%20hits%20a%20usage%20limit%3A%0A';

const ENTERPRISE_MAILTO =
  'mailto:anton.abyzov@gmail.com?subject=SpecWithCode%20for%20our%20company' +
  '&body=Company%3A%0AEngineers%20using%20AI%20coding%20agents%3A%0ATools%20in%20use%20(Claude%20Code%2C%20Codex%2C%20Cursor%2C%20other)%3A%0A' +
  'What%20you%20need%20(rollout%2C%20support%2C%20audit%2C%20SSO%2C%20policy%2C%20other)%3A%0A';

const WAITLIST_URL = 'https://verified-skill.com/pricing';

const PLANS = [
  {
    label: '01 / Free forever',
    name: 'SpecWithCode and SpecWeave',
    price: '$0',
    period: 'for individuals and teams',
    lead: 'The whole workspace and the CLI. No account with us, no seat count, no usage cap from us.',
    features: [
      'SpecWithCode desktop app: a coordinator, worker threads, plans and routines',
      'Claude Code, Codex, Grok, Gemini CLI, Cursor and more, on your own subscriptions',
      'Specs, task ledger and evidence in git, with auto-handoff at 90 percent of a usage limit',
      'Skills from public and private GitHub repositories, installed locally',
      'GitHub, Jira and Azure DevOps sync',
    ],
    cta: {label: 'Download SpecWithCode', to: '/studio'},
    highlight: true,
  },
  {
    label: '02 / Hosted, waitlist',
    name: 'Verified Skill Pro and Team',
    price: '$20',
    period: 'a month, or $30 a seat for teams of 3+, when it opens',
    lead: 'Private skills we host for your team. Hosted private publishing is not open yet, so nothing is charged; join the waitlist to hear first.',
    features: [
      'Private skills hosted and versioned for your team',
      'Security scan on every version',
      'One install into Claude Code, Codex and 50+ agents',
      'Seats added or removed any time',
    ],
    cta: {label: 'Join the waitlist', href: WAITLIST_URL},
  },
  {
    label: '03 / Enterprise',
    name: 'For your company',
    price: 'Custom',
    period: 'annual contract',
    lead: 'For companies putting coding agents in front of many engineers, who need a rollout, evidence and a support line.',
    features: [
      'Rollout across your teams, with SpecWeave set up in your repositories',
      'Priority support with a named engineer and response times in the contract',
      'Export of who ran which agent, on which machine, with what evidence',
      'SSO, SCIM, provider and model policy, or a self-hosted skill registry, scoped with you',
      'Security review pack and invoice billing',
    ],
    cta: {label: 'See the enterprise plan', to: '/docs/enterprise'},
  },
];

export default function Pricing() {
  return <Layout title="Pricing" description="SpecWithCode and the SpecWeave CLI are free for every developer and team, with no markup on your AI subscriptions. Companies pay for hosted private skills, enterprise rollout and support.">
    <main className={styles.page}>
      <header className={styles.articleHero}>
        <span className={styles.eyebrow}>Pricing</span>
        <h1>Free for every developer and team.<br /><em>Companies pay for what we host and support.</em></h1>
        <p>SpecWithCode and the SpecWeave CLI are free. You bring your own Claude, Codex, Grok or Cursor subscriptions. We never resell tokens, add a markup or charge a seat to run agents on your own machines.</p>
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
        <div className={teams.note}>What is free today stays free: the app, the CLI and running agents on your own machines. Paid plans only add things we host for you, control a company needs, and support.</div>
      </section>

      <div className={styles.articleBody}>
        <h2>Founding team pilot, $990</h2>
        <p>Two weeks to get a whole team of up to 10 engineers onto one workflow that survives a usage limit. Five places at this price. If the handoff drill does not work in your repository, you do not pay.</p>
        <table><thead><tr><th>When</th><th>What happens</th></tr></thead><tbody>
          <tr><td>Day 1</td><td>A call to pick the repository and the work in flight. We read your current CLAUDE.md, AGENTS.md and prompts.</td></tr>
          <tr><td>Days 2 to 5</td><td>SpecWeave goes in on a branch you review: one AGENTS.md every tool reads, specs for the work in flight, local recovery checkpoints and an explicit handoff workflow.</td></tr>
          <tr><td>Days 6 to 9</td><td>Shared prompts become skills in a private repository, installed with one command into Claude Code and Codex. SpecWithCode set up on your machines if you want it.</td></tr>
          <tr><td>Day 10</td><td>The drill: an engineer runs out of Claude Code mid-task and Codex picks it up from the handoff. You get the HTML evidence report, and we ask whether we may write the pilot up as a case study.</td></tr>
        </tbody></table>
        <p>Pilot teams also get three months of Verified Skill Team for 5 seats once hosted publishing opens. <a href={PILOT_MAILTO}>Apply for a pilot</a>.</p>

        <h2>Questions teams ask</h2>
        <details><summary>Will SpecWithCode stay free?</summary><p>Yes. <Link to="/studio">SpecWithCode</Link>, the SpecWeave CLI and running agents on your own machines stay free for individuals and teams. We will not resell tokens or put a markup on your subscriptions. SpecWithCode is in early access today, with a macOS download for Apple silicon.</p></details>
        <details><summary>What do companies pay for?</summary><p>Things that cost us to run or that only a company needs: hosted private skills, a rollout across many engineers, support with response times, and controls such as audit export, SSO or a self-hosted registry. Enterprise items beyond rollout and support are scoped and scheduled with each contract.</p></details>
        <details><summary>Do we need the pilot to use SpecWeave?</summary><p>No. <code>npm install -g specweave</code> and the <Link to="/docs/getting-started">quick start</Link> are enough for one developer. The pilot is for teams that want it set up across several people and tools at once.</p></details>
        <details><summary>What triggers a handoff automatically?</summary><p><code>specweave auto-handoff on</code> hands off when a usage window passes 90 percent, or a threshold you pick, and saves local checkpoints between turns. The next tool runs <code>specweave pickup</code>. Details in <Link to="/docs/guides/auto-handoff">auto-handoff rules</Link>.</p></details>
        <details><summary>Where does our code go?</summary><p>Nowhere new. Specs, the ledger and handoffs are files in your repository, and agents run on your machines with your subscriptions. Private skills live in your own GitHub repositories.</p></details>
        <details><summary>How do we pay?</summary><p>Today the only paid item is the pilot, invoiced once you have picked a start date. Pro and Team open from the <a href={WAITLIST_URL}>waitlist</a> when hosted private publishing is ready. Enterprise contracts are invoiced annually.</p></details>
      </div>

      <section className={styles.finalCta}>
        <h2>Free for every developer.<br /><em>Talk to us when the whole company needs it.</em></h2>
        <Link className={styles.primary} to="/studio">Download SpecWithCode <span aria-hidden="true">↗</span></Link>
        <a className={styles.textLink} href={ENTERPRISE_MAILTO}>Talk to us about your company</a>
      </section>
    </main>
  </Layout>;
}
