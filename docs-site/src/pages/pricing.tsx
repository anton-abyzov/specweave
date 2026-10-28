import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './continuity.module.css';
import p from './pricing.module.css';
import {CountUp, Capture, ExtensionStrip, ProviderMark, motion as m, useGlow} from '../components/sections/Motion';

const PILOT_MAILTO =
  'mailto:anton.abyzov@gmail.com?subject=SpecWeave%20founding%20team%20pilot' +
  '&body=Team%20size%20(2%E2%80%9310)%3A%0ATools%20you%20use%20(Claude%20Code%2C%20Codex%2C%20other)%3A%0A' +
  'Repository%20to%20start%20with%3A%0AWhat%20breaks%20today%20when%20someone%20hits%20a%20usage%20limit%3A%0A';

const ENTERPRISE_MAILTO =
  'mailto:anton.abyzov@gmail.com?subject=SpecWithCode%20for%20our%20team' +
  '&body=Team%3A%0APeople%20on%20the%20team%20(2%E2%80%9310)%3A%0ATools%20in%20use%20(Claude%20Code%2C%20Codex%2C%20Cursor%2C%20other)%3A%0A' +
  'What%20you%20need%20(rollout%2C%20support%2C%20audit%2C%20SSO%2C%20policy%2C%20other)%3A%0A';

const WAITLIST_URL = 'https://verified-skill.com/pricing';

const WHY = [
  {title: 'Another agent finishes the task', body: 'Limit hit? When Claude Code nears its usage limit, the spec and progress hand off to Codex or the next tool you use.'},
  {title: 'No markup on your AI plans', body: 'Agents run on the Claude, Codex, Gemini or Cursor plans you already pay for. We never resell tokens.'},
  {title: 'No per-seat or per-run fees', body: 'Add your whole team of 2–10. Nothing counts agents, seats or hours. Machines you pair yourself are unlimited.'},
];

type Plan = {
  /** Shown as a neutral chip after the price when the plan is not open yet. */
  tag?: string;
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
    name: 'SpecWithCode + SpecWeave',
    price: '$0',
    unit: 'free forever, built for teams of 2–10 people',
    who: 'The desktop workspace and the CLI. No account with us.',
    features: [
      'All your coding agents in one workspace',
      'Claude Code, Codex, Grok, Gemini CLI, Cursor',
      'Auto-handoff before a usage limit stops you',
      'Specs, tasks and evidence kept in git',
    ],
    cta: {label: 'Download free', to: '/code/'},
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
    name: 'For your team',
    price: 'Custom',
    unit: 'annual contract',
    who: 'For teams of 2–10 people on coding agents who want hands-on setup and a support line.',
    features: [
      'Setup for your whole team of 2–10',
      'Named engineer, response times in contract',
      'Audit export of who ran what, with evidence',
      'SSO, policy or self-hosted registry, scoped with you',
    ],
    cta: {label: 'See the team plan', to: '/docs/enterprise'},
  },
];

const PILOT_STEPS = [
  {when: 'Day 1', what: 'Pick the repo and the work'},
  {when: 'Days 2-5', what: 'SpecWeave in, on a branch you review'},
  {when: 'Days 6-9', what: 'Shared prompts become skills'},
  {when: 'Day 10', what: 'Live drill: Claude runs out, Codex finishes'},
];

const FAQ = [
  {q: 'Will it stay free?', a: <>Yes. The app, the CLI and running agents on your machines stay free. Paid plans only add hosting, team controls and support.</>},
  {q: 'How many machines can I connect?', a: <>As many as you pair yourself over your own network. Connect, the hosted relay for your phone and remote machines, includes 3 machines. The first 1,000 Connect accounts are founders and get 10 machines free for a year.</>},
  {q: 'What do teams pay for?', a: <>Hosted private skills, setup for your team of 2–10, support with response times, and controls like audit export or SSO.</>},
  {q: 'Where does our code go?', a: <>Nowhere new. Specs and handoffs are files in your repo, and agents run on your machines with your subscriptions.</>},
  {q: 'How does auto-handoff work?', a: <><code>specweave auto-handoff on</code> hands off at 90 percent of a usage window, or a threshold you pick. The next tool runs <code>specweave pickup</code>. <Link to="/docs/guides/auto-handoff">Details</Link>.</>},
  {q: 'Is SpecWithCode ready?', a: <>It is in early access with a macOS download for Apple silicon. The SpecWeave CLI works everywhere with <code>npm install -g specweave</code>.</>},
  {q: 'How do we pay?', a: <>Today only the pilot is paid, invoiced once you pick a start date. Team contracts are invoiced annually.</>},
];

function Cta({cta, className}: {cta: Plan['cta']; className: string}) {
  return cta.to
    ? <Link className={className} to={cta.to}>{cta.label}</Link>
    : <a className={className} href={cta.href}>{cta.label}</a>;
}

const PLAN_ICONS: React.ReactNode[] = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 8h18M8 21h8M12 18v3" /></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Z" /><path d="m9 12 2 2 4-4" /></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5.5" /></svg>,
];

/* Mini diagrams for the three reasons. Illustrations, not captures. */
function WhyArt({index}: {index: number}) {
  if (index === 0) {
    return <div className={p.art} aria-hidden="true">
      <div className={p.artAgent}><ProviderMark name="Claude Code" size={26} /><span>Claude Code</span><span className={p.meter}><i className={m.drawX} /></span></div>
      <span className={p.artArrow}><i className={m.drawX} /></span>
      <div className={p.artAgent}><ProviderMark name="Codex" size={26} /><span>Codex</span><span className={`wv-chip wv-chip--pass ${p.artChip}`}>picks up</span></div>
    </div>;
  }
  if (index === 1) {
    return <div className={p.art} aria-hidden="true">
      <div className={p.artBox}>Your plan</div>
      <span className={p.artArrow}><i className={m.drawX} /></span>
      <div className={`${p.artBox} ${p.artCut}`}>Reseller</div>
      <span className={p.artArrow}><i className={m.drawX} /></span>
      <div className={`${p.artBox} ${p.artIris}`}>Agent</div>
    </div>;
  }
  return <div className={p.art} aria-hidden="true">
    <div className={p.team}>
      {Array.from({length: 10}, (_, i) => <span key={i} style={{['--i' as string]: i}} />)}
    </div>
    <span className={p.teamLabel}>2–10 people · one free workspace</span>
  </div>;
}

export default function Pricing() {
  const glowWhy = useGlow<HTMLUListElement>();
  const glowPlans = useGlow<HTMLElement>();
  return <Layout title="Pricing" description="SpecWithCode and the SpecWeave CLI are built for teams of 2–10 people and free, with no markup on your AI subscriptions. Teams pay only for hosted private skills, setup help and support.">
    <main className={`${styles.page} ${p.page}`}>
      <header className={p.hero}>
        <div className={`${p.heroText} ${m.enter}`}>
          <p className={p.kicker} style={{['--i' as string]: 0}}><span className="wv-chip wv-chip--iris">Pricing</span><span>Free for teams of 2–10</span></p>
          <h1 style={{['--i' as string]: 1}}>Every coding agent in one workspace, free.</h1>
          <p className={p.sub} style={{['--i' as string]: 2}}>SpecWithCode runs Claude Code, Codex, Cursor and more side by side, and hands the task to the next one when a usage limit hits. You keep your own subscriptions.</p>
          <div className={p.heroActions} style={{['--i' as string]: 3}}>
            <Link className={styles.primary} to="/code/">Download SpecWithCode</Link>
            <a className={styles.textLink} href="#plans">See plans</a>
          </div>
          <p className={p.runsOn} style={{['--i' as string]: 4}}>
            <span className={p.marks}>{['Claude Code', 'Codex', 'Cursor', 'OpenCode'].map(n => <ProviderMark key={n} name={n} size={28} />)}</span>
            <span>Runs the agents you already pay for</span>
          </p>
        </div>
        <div className={p.stage}>
          <div className={`${p.glow} ${m.planeBack}`} aria-hidden="true" />
          <div className={m.planeMid}>
            <Capture
              src="/img/studio/code-window-20261027-light.webp"
              srcDark="/img/studio/code-window-20261027-dark.webp"
              alt="The SpecWithCode threads panel: a Claude Code thread and a Codex thread working side by side"
              width={2400} height={1500} ratio="16 / 11" focus="100% 0%" zoom={2.3} eager className={p.heroCapture}
              label="Real capture · SpecWithCode app window, 27 October 2026"
            />
          </div>
          <div className={`${p.float} ${p.floatPrice} ${m.planeFront}`} aria-hidden="true">
            <b>$0</b><span>free forever</span>
          </div>
          <div className={`${p.float} ${p.floatHandoff} ${m.planeFront}`} aria-hidden="true">
            <ProviderMark name="Claude Code" size={22} /><span className={p.floatArrow}>→</span><ProviderMark name="Codex" size={22} /><span>Auto-handoff</span>
          </div>
        </div>
      </header>

      <div className={p.band}><ExtensionStrip /></div>

      <section className={p.why} aria-label="Why it is free">
        <ul className={`${p.whyList} ${m.stagger}`} ref={glowWhy}>
          {WHY.map((w, i) => (
            <li key={w.title} className={`${m.card} ${p.whyCard}`} data-glow style={{['--i' as string]: i}}>
              <WhyArt index={i} />
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </li>
          ))}
        </ul>
        <p className={`${m.tag} ${p.artNote}`}>Diagrams are illustrations.</p>
      </section>

      <section id="plans" className={`${p.plans} ${m.stagger}`} aria-label="Plans" ref={glowPlans}>
        {PLANS.map((plan, i) => (
          <article key={plan.name} data-glow style={{['--i' as string]: i}} className={`${m.card} ${plan.featured ? `${p.plan} ${p.featured}` : p.plan}`}>
            <div className={p.planHead}>
              <span className={m.icon} aria-hidden="true">{PLAN_ICONS[i]}</span>
              <h2 className={p.name}>{plan.name}</h2>
            </div>
            <p className={p.price}>
              <b>{plan.price === '$20' ? <CountUp value={20} prefix="$" /> : plan.price}</b>
              <span>{plan.unit}</span>
              {plan.tag && <span className="wv-chip">{plan.tag}</span>}
            </p>
            <p className={p.who}>{plan.who}</p>
            <ul className={p.features}>
              {plan.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Cta cta={plan.cta} className={plan.featured ? `${styles.primary} ${p.cta}` : `${styles.secondary} ${p.cta}`} />
          </article>
        ))}
      </section>

      <section className={`${p.pilot} ${m.reveal}`}>
        <div className={p.pilotHead}>
          <div>
            <p className={p.pilotPrice} aria-hidden="true"><CountUp value={990} prefix="$" /><span>two-week pilot</span></p>
            <h2>Founding team pilot: $990 to move your team of 2–10 onto it in two weeks</h2>
            <p>For teams of 2–10 people. Five places. If the handoff drill fails in your repo, you do not pay.</p>
          </div>
          <a className={styles.primary} href={PILOT_MAILTO}>Apply for a pilot</a>
        </div>
        <div className={p.timeline}>
          <span className={p.timelineTrack} aria-hidden="true"><i className={m.drawX} /></span>
          <ol className={`wv-thread wv-thread--across ${p.steps} ${m.stagger}`}>
            {PILOT_STEPS.map((s, i) => <li key={s.when} style={{['--i' as string]: i}} aria-current={i === 0 ? 'step' : undefined}><p className="wv-thread__title">{s.when}</p><p className="wv-thread__body">{s.what}</p></li>)}
          </ol>
        </div>
      </section>

      <section className={p.faq}>
        <h2>Questions</h2>
        <div className={p.faqGrid}>
          {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </section>

      <section className={`${styles.finalCta} ${p.final}`}>
        <h2>Built for teams of 2–10 and free, with help when your team needs it</h2>
        <Link className={styles.primary} to="/code/">Download SpecWithCode</Link>
        <a className={styles.textLink} href={ENTERPRISE_MAILTO}>Talk to us about your team</a>
      </section>
    </main>
  </Layout>;
}
