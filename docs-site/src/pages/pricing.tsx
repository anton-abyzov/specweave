import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './continuity.module.css';
import p from './pricing.module.css';

const PILOT_MAILTO =
  'mailto:anton.abyzov@gmail.com?subject=SpecWeave%20founding%20team%20pilot' +
  '&body=Team%20size%3A%0ATools%20you%20use%20(Claude%20Code%2C%20Codex%2C%20other)%3A%0A' +
  'Repository%20to%20start%20with%3A%0AWhat%20breaks%20today%20when%20someone%20hits%20a%20usage%20limit%3A%0A';

const ENTERPRISE_MAILTO =
  'mailto:anton.abyzov@gmail.com?subject=SpecWithCode%20for%20our%20company' +
  '&body=Company%3A%0AEngineers%20using%20AI%20coding%20agents%3A%0ATools%20in%20use%20(Claude%20Code%2C%20Codex%2C%20Cursor%2C%20other)%3A%0A' +
  'What%20you%20need%20(rollout%2C%20support%2C%20audit%2C%20SSO%2C%20policy%2C%20other)%3A%0A';

const WAITLIST_URL = 'https://verified-skill.com/pricing';

const WHY = [
  {big: 'Limit hit?', title: 'Another agent finishes the task', body: 'When Claude Code nears its usage limit, the spec and progress hand off to Codex or the next tool you use.'},
  {big: '0%', title: 'Markup on your AI', body: 'Agents run on the Claude, Codex, Gemini or Cursor plans you already pay for. We never resell tokens.'},
  {big: '$0', title: 'Per seat, per run, per machine', body: 'Add the whole team. Nothing counts agents, seats or hours.'},
];

type Plan = {
  tag: string;
  name: string;
  price: string;
  unit: string;
  who: string;
  features: string[];
  cta: {label: string; to?: string; href?: string};
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    tag: 'Free forever',
    name: 'SpecWithCode + SpecWeave',
    price: '$0',
    unit: 'for every developer and team',
    who: 'The desktop workspace and the CLI. No account with us.',
    features: [
      'All your coding agents in one workspace',
      'Claude Code, Codex, Grok, Gemini CLI, Cursor',
      'Auto-handoff before a usage limit stops you',
      'Specs, tasks and evidence kept in git',
      'GitHub, Jira and Azure DevOps sync',
    ],
    cta: {label: 'Download free', to: '/studio'},
    featured: true,
  },
  {
    tag: 'Waitlist',
    name: 'Hosted skills',
    price: '$20',
    unit: 'a month · $30 a seat for teams',
    who: 'Private skills we host for your team. Not charged until it opens.',
    features: [
      'Private skills hosted and versioned',
      'Security scan on every version',
      'One install into 50+ agents',
    ],
    cta: {label: 'Join the waitlist', href: WAITLIST_URL},
  },
  {
    tag: 'Enterprise',
    name: 'For your company',
    price: 'Custom',
    unit: 'annual contract',
    who: 'For many engineers on coding agents who need a rollout and a support line.',
    features: [
      'Rollout across your teams',
      'Named engineer, response times in contract',
      'Audit export of who ran what, with evidence',
      'SSO, policy or self-hosted registry, scoped with you',
    ],
    cta: {label: 'See the enterprise plan', to: '/docs/enterprise'},
  },
];

const PILOT_STEPS = [
  {when: 'Day 1', what: 'Pick the repo and the work'},
  {when: 'Days 2-5', what: 'SpecWeave in, on a branch you review'},
  {when: 'Days 6-9', what: 'Shared prompts become skills'},
  {when: 'Day 10', what: 'Live drill: Claude runs out, Codex finishes'},
];

const FAQ = [
  {q: 'Will it stay free?', a: <>Yes. The app, the CLI and running agents on your machines stay free for individuals and teams. Paid plans only add hosting, company controls and support.</>},
  {q: 'What do companies pay for?', a: <>Hosted private skills, rollout across many engineers, support with response times, and controls like audit export or SSO.</>},
  {q: 'Where does our code go?', a: <>Nowhere new. Specs and handoffs are files in your repo, and agents run on your machines with your subscriptions.</>},
  {q: 'How does auto-handoff work?', a: <><code>specweave auto-handoff on</code> hands off at 90 percent of a usage window, or a threshold you pick. The next tool runs <code>specweave pickup</code>. <Link to="/docs/guides/auto-handoff">Details</Link>.</>},
  {q: 'Is SpecWithCode ready?', a: <>It is in early access with a macOS download for Apple silicon. The SpecWeave CLI works everywhere with <code>npm install -g specweave</code>.</>},
  {q: 'How do we pay?', a: <>Today only the pilot is paid, invoiced once you pick a start date. Enterprise contracts are invoiced annually.</>},
];

function Cta({cta, className}: {cta: Plan['cta']; className: string}) {
  return cta.to
    ? <Link className={className} to={cta.to}>{cta.label} <span aria-hidden="true">→</span></Link>
    : <a className={className} href={cta.href}>{cta.label} <span aria-hidden="true">↗</span></a>;
}

export default function Pricing() {
  return <Layout title="Pricing" description="SpecWithCode and the SpecWeave CLI are free for every developer and team, with no markup on your AI subscriptions. Companies pay for hosted private skills, enterprise rollout and support.">
    <main className={`${styles.page} ${p.page}`}>
      <header className={p.hero}>
        <span className={styles.eyebrow}><span className={styles.orangeDot} />Pricing</span>
        <h1>Every coding agent in one workspace.<br /><em>Free.</em></h1>
        <p className={p.sub}>SpecWithCode runs Claude Code, Codex, Cursor and more side by side, and hands the task to the next one when a usage limit hits. You keep your own subscriptions.</p>
        <div className={p.heroActions}>
          <Link className={styles.primary} to="/studio">Download SpecWithCode <span aria-hidden="true">→</span></Link>
          <a className={styles.textLink} href="#plans">See plans</a>
        </div>
      </header>

      <section className={p.why} aria-label="Why it is free">
        {WHY.map((w) => (
          <div key={w.title} className={p.whyItem}>
            <b>{w.big}</b>
            <h3>{w.title}</h3>
            <p>{w.body}</p>
          </div>
        ))}
      </section>

      <section id="plans" className={p.plans}>
        {PLANS.map((plan) => (
          <article key={plan.tag} className={plan.featured ? `${p.plan} ${p.featured}` : p.plan}>
            <span className={p.tag}>{plan.tag}</span>
            <h2 className={p.name}>{plan.name}</h2>
            <p className={p.price}><b>{plan.price}</b><span>{plan.unit}</span></p>
            <p className={p.who}>{plan.who}</p>
            <ul className={p.features}>
              {plan.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Cta cta={plan.cta} className={plan.featured ? p.ctaFeatured : `${styles.secondary} ${p.cta}`} />
          </article>
        ))}
      </section>

      <section className={p.pilot}>
        <div className={p.pilotHead}>
          <span className={p.tag}>Founding team pilot</span>
          <h2>$990 to move your whole team onto it in two weeks.</h2>
          <p>Up to 10 engineers. Five places. If the handoff drill fails in your repo, you do not pay.</p>
          <a className={styles.primary} href={PILOT_MAILTO}>Apply for a pilot <span aria-hidden="true">↗</span></a>
        </div>
        <ol className={p.steps}>
          {PILOT_STEPS.map((s) => <li key={s.when}><b>{s.when}</b><span>{s.what}</span></li>)}
        </ol>
      </section>

      <section className={p.faq}>
        <h2>Questions</h2>
        <div className={p.faqGrid}>
          {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Free for every developer.<br /><em>Talk to us when the company needs it.</em></h2>
        <Link className={styles.primary} to="/studio">Download SpecWithCode <span aria-hidden="true">→</span></Link>
        <a className={styles.textLink} href={ENTERPRISE_MAILTO}>Talk to us about your company</a>
      </section>
    </main>
  </Layout>;
}
