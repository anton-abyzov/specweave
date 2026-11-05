import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
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
const FOUNDERS_URL = 'https://relay.spec-weave.com/v1/public/founders';

type Founders = {seatCap: number; seatsLeft: number; grantsOpen: boolean};

/** Live founder seats from the Connect relay; null until it answers or if it fails. */
function useFounders(): Founders | null {
  const [state, setState] = React.useState<Founders | null>(null);
  React.useEffect(() => {
    const ctl = new AbortController();
    fetch(FOUNDERS_URL, {signal: ctl.signal})
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && typeof d.seatCap === 'number' && typeof d.seatsLeft === 'number') {
          setState({seatCap: d.seatCap, seatsLeft: d.seatsLeft, grantsOpen: d.grantsOpen !== false});
        }
      })
      .catch(() => {});
    return () => ctl.abort();
  }, []);
  return state;
}

function useWhy() {
  return [
    {title: translate({id: 'pricing.why.handoff.title', message: 'Another agent finishes the task', description: 'Reason card title'}), body: translate({id: 'pricing.why.handoff.body', message: 'Limit hit? When Claude Code nears its usage limit, the spec and progress hand off to Codex or the next tool you use.', description: 'Reason card body. Keep product names in English'})},
    {title: translate({id: 'pricing.why.noMarkup.title', message: 'No markup on your AI plans', description: 'Reason card title'}), body: translate({id: 'pricing.why.noMarkup.body', message: 'Agents run on the Claude, Codex, Gemini or Cursor plans you already pay for. We never resell tokens.', description: 'Reason card body. Keep product names in English'})},
    {title: translate({id: 'pricing.why.noSeatFees.title', message: 'No per-seat or per-run fees', description: 'Reason card title'}), body: translate({id: 'pricing.why.noSeatFees.body', message: 'Bring yourself or your whole team. Nothing counts agents, seats or hours. Machines you pair yourself are unlimited.', description: 'Reason card body'})},
  ];
}

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

function usePlans(): Plan[] {
  return [
    {
      name: translate({id: 'pricing.plan.free.name', message: 'Free', description: 'Plan name'}),
      price: '$0',
      unit: translate({id: 'pricing.plan.free.unit', message: 'forever, for every developer and team', description: 'Text after the $0 price of the Free plan'}),
      who: translate({id: 'pricing.plan.free.who', message: 'The SpecWithCode app and the SpecWeave CLI. The app needs no account with us.', description: 'Free plan summary. Keep product names in English'}),
      features: [
        translate({id: 'pricing.plan.free.feature.workspace', message: 'Claude Code, Codex, Grok, Gemini CLI, Cursor in one workspace', description: 'Free plan feature. Keep product names in English'}),
        translate({id: 'pricing.plan.free.feature.handoff', message: 'Auto-handoff before a usage limit stops you', description: 'Free plan feature'}),
        translate({id: 'pricing.plan.free.feature.connect', message: 'Connect: reach 3 machines from anywhere, and your phone', description: 'Free plan feature. Connect is a product name; keep it in English'}),
        translate({id: 'pricing.plan.free.feature.localRoutes', message: 'Local network and SSH routes, never counted', description: 'Free plan feature'}),
      ],
      cta: {label: translate({id: 'pricing.plan.free.cta', message: 'Download free', description: 'Free plan button'}), to: '/code/'},
      featured: true,
    },
    {
      tag: translate({id: 'pricing.plan.founders.tag', message: 'First 300', description: 'Chip on the Founders plan'}),
      name: translate({id: 'pricing.plan.founders.name', message: 'Founders', description: 'Plan name'}),
      price: '$0',
      unit: translate({id: 'pricing.plan.founders.unit', message: 'a founder seat, kept with your account', description: 'Text after the $0 price of the Founders plan'}),
      who: translate({id: 'pricing.plan.founders.who', message: 'The first 300 accounts to link a machine through Connect. No form: the seat is granted on that link.', description: 'Founders plan summary. Connect is a product name; keep it in English'}),
      features: [
        translate({id: 'pricing.plan.founders.feature.everythingFree', message: 'Everything in Free', description: 'Founders plan feature; Free is the plan name'}),
        translate({id: 'pricing.plan.founders.feature.machines', message: '10 Connect machines instead of 3', description: 'Founders plan feature. Connect is a product name; keep it in English'}),
        translate({id: 'pricing.plan.founders.feature.number', message: 'A founder number on your account', description: 'Founders plan feature'}),
        translate({id: 'pricing.plan.founders.feature.more', message: 'Need more than 10? Ask and we raise it', description: 'Founders plan feature'}),
      ],
      cta: {label: translate({id: 'pricing.plan.founders.cta', message: 'Claim a founder seat', description: 'Founders plan button'}), to: '/docs/studio/connect#link-a-machine'},
    },
    {
      tag: translate({id: 'pricing.plan.pro.tag', message: 'Waitlist', description: 'Chip on the Pro plan'}),
      name: 'Pro',
      price: '$20',
      unit: translate({id: 'pricing.plan.pro.unit', message: 'a month, per account', description: 'Text after the $20 price of the Pro plan'}),
      who: translate({id: 'pricing.plan.pro.who', message: 'For people who run many machines or share private skills. Not charged until it opens.', description: 'Pro plan summary'}),
      features: [
        translate({id: 'pricing.plan.pro.feature.unlimited', message: 'Unlimited Connect machines', description: 'Pro plan feature. Connect is a product name; keep it in English'}),
        translate({id: 'pricing.plan.pro.feature.privateSkills', message: 'Private skills, hosted and versioned', description: 'Pro plan feature'}),
        translate({id: 'pricing.plan.pro.feature.scan', message: 'Security scan on every skill version', description: 'Pro plan feature'}),
        translate({id: 'pricing.plan.pro.feature.billing', message: 'Billed in your SpecWithCode account', description: 'Pro plan feature. Keep product names in English'}),
      ],
      cta: {label: translate({id: 'pricing.plan.pro.cta', message: 'Join the waitlist', description: 'Pro plan button'}), href: WAITLIST_URL},
    },
    {
      name: translate({id: 'pricing.plan.teams.name', message: 'Teams', description: 'Plan name'}),
      price: translate({id: 'pricing.plan.teams.price', message: 'Custom', description: 'Price shown for the Teams plan'}),
      unit: translate({id: 'pricing.plan.teams.unit', message: 'annual contract', description: 'Text after the Teams plan price'}),
      who: translate({id: 'pricing.plan.teams.who', message: 'For teams of 2–10 who want hands-on setup, a support line and audit records.', description: 'Teams plan summary'}),
      features: [
        translate({id: 'pricing.plan.teams.feature.setup', message: 'Setup for your whole team', description: 'Teams plan feature'}),
        translate({id: 'pricing.plan.teams.feature.engineer', message: 'Named engineer, response times in contract', description: 'Teams plan feature'}),
        translate({id: 'pricing.plan.teams.feature.audit', message: 'Audit export of who ran what, with evidence', description: 'Teams plan feature'}),
        translate({id: 'pricing.plan.teams.feature.sso', message: 'SSO, policy or self-hosted registry, scoped with you', description: 'Teams plan feature'}),
      ],
      cta: {label: translate({id: 'pricing.plan.teams.cta', message: 'See the team plan', description: 'Teams plan button'}), to: '/docs/enterprise'},
    },
  ];
}

function usePilotSteps() {
  return [
    {when: translate({id: 'pricing.pilot.step1.when', message: 'Day 1', description: 'Pilot timeline step label'}), what: translate({id: 'pricing.pilot.step1.what', message: 'Pick the repo and the work', description: 'Pilot timeline step'})},
    {when: translate({id: 'pricing.pilot.step2.when', message: 'Days 2-5', description: 'Pilot timeline step label'}), what: translate({id: 'pricing.pilot.step2.what', message: 'SpecWeave in, on a branch you review', description: 'Pilot timeline step. Keep product names in English'})},
    {when: translate({id: 'pricing.pilot.step3.when', message: 'Days 6-9', description: 'Pilot timeline step label'}), what: translate({id: 'pricing.pilot.step3.what', message: 'Shared prompts become skills', description: 'Pilot timeline step'})},
    {when: translate({id: 'pricing.pilot.step4.when', message: 'Day 10', description: 'Pilot timeline step label'}), what: translate({id: 'pricing.pilot.step4.what', message: 'Live drill: Claude runs out, Codex finishes', description: 'Pilot timeline step. Keep product names in English'})},
  ];
}

function useFaq(): Array<{q: string; a: React.ReactNode}> {
  return [
    {q: translate({id: 'pricing.faq.free.q', message: 'Will it stay free?', description: 'Pricing FAQ question'}), a: <Translate id="pricing.faq.free.a" description="Pricing FAQ answer">Yes. The app, the CLI and running agents on your machines stay free, for one developer or a whole team. Paid plans only add what costs us to run (hosted relay capacity, hosted private skills) and support.</Translate>},
    {q: translate({id: 'pricing.faq.machines.q', message: 'How many machines can I connect?', description: 'Pricing FAQ question'}), a: <Translate id="pricing.faq.machines.a" description="Pricing FAQ answer. {link} is a link reading 'How Connect works'. Connect is a product name; keep it in English" values={{link: <Link to="/docs/studio/connect"><Translate id="pricing.faq.machines.a.link" description="Link text to the Connect docs. Connect is a product name; keep it in English">How Connect works</Translate></Link>}}>{'Connect, the hosted relay that reaches your machines from anywhere and from your phone, includes 3 machines. Founders get 10, and Pro will lift the limit. Direct routes over your local network or SSH are never counted. {link}.'}</Translate>},
    {q: translate({id: 'pricing.faq.founder.q', message: 'How do I become a founder?', description: 'Pricing FAQ question'}), a: <Translate id="pricing.faq.founder.a" description="Pricing FAQ answer. Keep product names in English">Sign in to Connect in SpecWithCode and link a machine. The first 300 accounts to do that get a founder number and 10 machines, granted on that link. The seat stays with your account and does not expire; Pro opening later does not take it away.</Translate>},
    {q: translate({id: 'pricing.faq.teams.q', message: 'What do teams pay for?', description: 'Pricing FAQ question'}), a: <Translate id="pricing.faq.teams.a" description="Pricing FAQ answer. Keep product names in English">Setup for your team of 2–10, support with response times, and controls like audit export or SSO. Pro covers hosted private skills and unlimited Connect machines for one account.</Translate>},
    {q: translate({id: 'pricing.faq.code.q', message: 'Where does our code go?', description: 'Pricing FAQ question'}), a: <Translate id="pricing.faq.code.a" description="Pricing FAQ answer">Nowhere new. Specs and handoffs are files in your repo, and agents run on your machines with your subscriptions.</Translate>},
    {q: translate({id: 'pricing.faq.autoHandoff.q', message: 'How does auto-handoff work?', description: 'Pricing FAQ question'}), a: <Translate id="pricing.faq.autoHandoff.a" description="Pricing FAQ answer. {onCommand} and {pickupCommand} are CLI commands shown as code; {link} is a link reading 'Details'" values={{onCommand: <code>specweave auto-handoff on</code>, pickupCommand: <code>specweave pickup</code>, link: <Link to="/docs/guides/auto-handoff"><Translate id="pricing.faq.autoHandoff.a.link" description="Link text to the auto-handoff guide">Details</Translate></Link>}}>{'{onCommand} hands off at 90 percent of a usage window, or a threshold you pick. The next tool runs {pickupCommand}. {link}.'}</Translate>},
    {q: translate({id: 'pricing.faq.ready.q', message: 'Is SpecWithCode ready?', description: 'Pricing FAQ question. Keep product names in English'}), a: <Translate id="pricing.faq.ready.a" description="Pricing FAQ answer. {command} is a CLI command shown as code. Keep product names in English" values={{command: <code>npm install -g specweave</code>}}>{'It is in early access with downloads for macOS (Apple silicon), Windows 10 and 11, and Linux (x64 and arm64). The SpecWeave CLI works everywhere with {command}.'}</Translate>},
    {q: translate({id: 'pricing.faq.pay.q', message: 'How do we pay?', description: 'Pricing FAQ question'}), a: <Translate id="pricing.faq.pay.a" description="Pricing FAQ answer. Keep product names in English">Today only the pilot is paid, invoiced once you pick a start date. Team contracts are invoiced annually. Pro will be billed by card in your SpecWithCode account when it opens; nobody on the waitlist is charged before then.</Translate>},
  ];
}

function Cta({cta, className}: {cta: Plan['cta']; className: string}) {
  return cta.to
    ? <Link className={className} to={cta.to}>{cta.label}</Link>
    : <a className={className} href={cta.href}>{cta.label}</a>;
}

const PLAN_ICONS: React.ReactNode[] = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 8h18M8 21h8M12 18v3" /></svg>,
  <svg key="f" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.4l6-.9L12 3Z" /></svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Z" /><path d="m9 12 2 2 4-4" /></svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5.5" /></svg>,
];

/* Mini diagrams for the three reasons. Illustrations, not captures. */
function WhyArt({index}: {index: number}) {
  if (index === 0) {
    return <div className={p.art} aria-hidden="true">
      <div className={p.artAgent}><ProviderMark name="Claude Code" size={26} /><span>Claude Code</span><span className={p.meter}><i className={m.drawX} /></span></div>
      <span className={p.artArrow}><i className={m.drawX} /></span>
      <div className={p.artAgent}><ProviderMark name="Codex" size={26} /><span>Codex</span><span className={`wv-chip wv-chip--pass ${p.artChip}`}><Translate id="pricing.why.art.picksUp" description="Diagram chip: the next agent picks up the task">picks up</Translate></span></div>
    </div>;
  }
  if (index === 1) {
    return <div className={p.art} aria-hidden="true">
      <div className={p.artBox}><Translate id="pricing.why.art.yourPlan" description="Diagram box: your AI subscription">Your plan</Translate></div>
      <span className={p.artArrow}><i className={m.drawX} /></span>
      <div className={`${p.artBox} ${p.artCut}`}><Translate id="pricing.why.art.reseller" description="Diagram box: a token reseller (crossed out)">Reseller</Translate></div>
      <span className={p.artArrow}><i className={m.drawX} /></span>
      <div className={`${p.artBox} ${p.artIris}`}><Translate id="pricing.why.art.agent" description="Diagram box: the coding agent">Agent</Translate></div>
    </div>;
  }
  return <div className={p.art} aria-hidden="true">
    <div className={p.team}>
      {Array.from({length: 10}, (_, i) => <span key={i} style={{['--i' as string]: i}} />)}
    </div>
    <span className={p.teamLabel}><Translate id="pricing.why.art.teamLabel" description="Diagram label under the team icons">One developer or a whole team · one free workspace</Translate></span>
  </div>;
}

function FoundersBand() {
  const f = useFounders();
  const cap = f?.seatCap ?? 300;
  const left = f ? Math.max(0, f.seatsLeft) : null;
  const taken = left === null ? 0 : cap - left;
  const open = f ? f.grantsOpen && left! > 0 : true;
  const capText = cap.toLocaleString('en-US');
  return <section className={`${p.founders} ${m.reveal}`} aria-labelledby="founders-title">
    <div className={p.foundersText}>
      <p className={p.kicker}><span className="wv-chip wv-chip--iris"><Translate id="pricing.founders.chip" description="Chip on the founders band">Founders</Translate></span><span>{open ? translate({id: 'pricing.founders.status.open', message: 'Open now', description: 'Founder seats are still available'}) : translate({id: 'pricing.founders.status.full', message: 'All seats taken', description: 'No founder seats are left'})}</span></p>
      <h2 id="founders-title"><Translate id="pricing.founders.title" description="Founders band heading">The first 300 accounts get 10 machines, free</Translate></h2>
      <p><Translate id="pricing.founders.body" description="Founders band body. Connect is a product name; keep it in English">Link a machine through Connect and your account takes the next founder seat: 10 machines from anywhere instead of 3, and a founder number. No form, no card, and the seat stays yours.</Translate></p>
      <Link className={styles.primary} to="/docs/studio/connect#link-a-machine"><Translate id="pricing.founders.cta" description="Founders band button">Link your first machine</Translate></Link>
    </div>
    <div className={p.seats} role="img" aria-label={left === null ? translate({id: 'pricing.founders.seats.aria.total', message: '{total} founder seats', description: 'Accessible label for the seat meter before the live count loads'}, {total: capText}) : translate({id: 'pricing.founders.seats.aria.left', message: '{left} of {total} founder seats left', description: 'Accessible label for the live seat meter'}, {left: left.toLocaleString('en-US'), total: capText})}>
      <p className={p.seatsCount}>
        {left === null ? <b>{capText}</b> : <b><CountUp value={left} /></b>}
        <span>{left === null ? translate({id: 'pricing.founders.seats.label.total', message: 'founder seats', description: 'Text after the total seat count'}) : translate({id: 'pricing.founders.seats.label.left', message: 'of {total} seats left', description: 'Text after the live count of seats left'}, {total: capText})}</span>
      </p>
      <span className={p.seatsBar} aria-hidden="true"><i style={{width: `${Math.max(1, (taken / cap) * 100)}%`}} /></span>
      <p className={p.seatsNote}>{left === null ? translate({id: 'pricing.founders.seats.note.pending', message: 'Live count from the Connect relay.', description: 'Note under the seat meter before the live count loads. Connect is a product name; keep it in English'}) : translate({id: 'pricing.founders.seats.note.live', message: 'Live from the Connect relay.', description: 'Note under the live seat meter. Connect is a product name; keep it in English'})}</p>
    </div>
  </section>;
}

export default function Pricing() {
  const glowWhy = useGlow<HTMLUListElement>();
  const glowPlans = useGlow<HTMLElement>();
  const WHY = useWhy();
  const PLANS = usePlans();
  const PILOT_STEPS = usePilotSteps();
  const FAQ = useFaq();
  return <Layout title={translate({id: 'pricing.meta.title', message: 'Pricing', description: 'Pricing page title'})} description={translate({id: 'pricing.meta.description', message: 'SpecWithCode and the SpecWeave CLI are free for every developer and team, with no markup on your AI subscriptions. The first 300 Connect accounts get 10 machines free. Pro adds unlimited machines and private skills; teams can buy setup and support.', description: 'Pricing page meta description. Keep product names in English'})}>
    <main className={`${styles.page} ${p.page}`}>
      <header className={p.hero}>
        <div className={`${p.heroText} ${m.enter}`}>
          <p className={p.kicker} style={{['--i' as string]: 0}}><span className="wv-chip wv-chip--iris"><Translate id="pricing.hero.chip" description="Hero chip">Pricing</Translate></span><span><Translate id="pricing.hero.kicker" description="Hero kicker next to the chip">Free for every developer and team</Translate></span></p>
          <h1 style={{['--i' as string]: 1}}><Translate id="pricing.hero.title" description="Pricing hero headline">Every coding agent in one workspace, free for everyone.</Translate></h1>
          <p className={p.sub} style={{['--i' as string]: 2}}><Translate id="pricing.hero.sub" description="Pricing hero subheading. Keep product names in English">SpecWithCode runs Claude Code, Codex, Cursor and more side by side, and hands the task to the next one when a usage limit hits. You keep your own subscriptions.</Translate></p>
          <div className={p.heroActions} style={{['--i' as string]: 3}}>
            <Link className={styles.primary} to="/code/"><Translate id="pricing.hero.cta.download" description="Hero download button. Keep product names in English">Download SpecWithCode</Translate></Link>
            <a className={styles.textLink} href="#plans"><Translate id="pricing.hero.cta.plans" description="Hero link that jumps to the plans">See plans</Translate></a>
          </div>
          <p className={p.runsOn} style={{['--i' as string]: 4}}>
            <span className={p.marks}>{['Claude Code', 'Codex', 'Cursor', 'OpenCode'].map(n => <ProviderMark key={n} name={n} size={28} />)}</span>
            <span><Translate id="pricing.hero.runsOn" description="Text next to the agent logos">Runs the agents you already pay for</Translate></span>
          </p>
        </div>
        <div className={p.stage}>
          <div className={`${p.glow} ${m.planeBack}`} aria-hidden="true" />
          <div className={m.planeMid}>
            <Capture
              src="/img/studio/code-window-20261027-light.webp"
              srcDark="/img/studio/code-window-20261027-dark.webp"
              alt={translate({id: 'pricing.hero.capture.alt', message: 'The SpecWithCode threads panel: a Claude Code thread and a Codex thread working side by side', description: 'Alt text for the hero screenshot. Keep product names in English'})}
              width={2400} height={1500} ratio="16 / 11" focus="100% 0%" zoom={2.3} eager className={p.heroCapture}
              label={translate({id: 'pricing.hero.capture.label', message: 'Real capture · SpecWithCode app window, 27 October 2026', description: 'Label on the hero screenshot. Keep product names in English'})}
            />
          </div>
          <div className={`${p.float} ${p.floatPrice} ${m.planeFront}`} aria-hidden="true">
            <b>$0</b><span><Translate id="pricing.hero.float.free" description="Floating badge text after $0">free forever</Translate></span>
          </div>
          <div className={`${p.float} ${p.floatHandoff} ${m.planeFront}`} aria-hidden="true">
            <ProviderMark name="Claude Code" size={22} /><span className={p.floatArrow}>→</span><ProviderMark name="Codex" size={22} /><span><Translate id="pricing.hero.float.handoff" description="Floating badge: automatic handoff between agents">Auto-handoff</Translate></span>
          </div>
        </div>
      </header>

      <div className={p.band}><ExtensionStrip /></div>

      <section className={p.why} aria-label={translate({id: 'pricing.why.aria', message: 'Why it is free', description: 'Accessible label for the reasons section'})}>
        <ul className={`${p.whyList} ${m.stagger}`} ref={glowWhy}>
          {WHY.map((w, i) => (
            <li key={w.title} className={`${m.card} ${p.whyCard}`} data-glow style={{['--i' as string]: i}}>
              <WhyArt index={i} />
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </li>
          ))}
        </ul>
        <p className={`${m.tag} ${p.artNote}`}><Translate id="pricing.why.artNote" description="Note under the reason diagrams">Diagrams are illustrations.</Translate></p>
      </section>

      <FoundersBand />

      <section id="plans" className={`${p.plans} ${m.stagger}`} aria-label={translate({id: 'pricing.plans.aria', message: 'Plans', description: 'Accessible label for the plans section'})} ref={glowPlans}>
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
            <p className={p.pilotPrice} aria-hidden="true"><CountUp value={990} prefix="$" /><span><Translate id="pricing.pilot.priceLabel" description="Text after the $990 pilot price">two-week pilot</Translate></span></p>
            <h2><Translate id="pricing.pilot.title" description="Pilot section heading">Founding team pilot: $990 to move your team of 2–10 onto it in two weeks</Translate></h2>
            <p><Translate id="pricing.pilot.body" description="Pilot section body">For teams of 2–10 people. Five places. If the handoff drill fails in your repo, you do not pay.</Translate></p>
          </div>
          <a className={styles.primary} href={PILOT_MAILTO}><Translate id="pricing.pilot.cta" description="Pilot apply button (opens email)">Apply for a pilot</Translate></a>
        </div>
        <div className={p.timeline}>
          <span className={p.timelineTrack} aria-hidden="true"><i className={m.drawX} /></span>
          <ol className={`wv-thread wv-thread--across ${p.steps} ${m.stagger}`}>
            {PILOT_STEPS.map((s, i) => <li key={s.when} style={{['--i' as string]: i}} aria-current={i === 0 ? 'step' : undefined}><p className="wv-thread__title">{s.when}</p><p className="wv-thread__body">{s.what}</p></li>)}
          </ol>
        </div>
      </section>

      <section className={p.faq}>
        <h2><Translate id="pricing.faq.title" description="FAQ section heading">Questions</Translate></h2>
        <div className={p.faqGrid}>
          {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </section>

      <section className={`${styles.finalCta} ${p.final}`}>
        <h2><Translate id="pricing.final.title" description="Final call-to-action heading">Free for everyone, with help when your team needs it</Translate></h2>
        <Link className={styles.primary} to="/code/"><Translate id="pricing.final.cta.download" description="Final download button. Keep product names in English">Download SpecWithCode</Translate></Link>
        <a className={styles.textLink} href={ENTERPRISE_MAILTO}><Translate id="pricing.final.cta.team" description="Final link that opens an email about team plans">Talk to us about your team</Translate></a>
      </section>
    </main>
  </Layout>;
}
