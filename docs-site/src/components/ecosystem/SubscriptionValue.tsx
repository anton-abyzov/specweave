import React, {useId, useState} from 'react';
import Link from '@docusaurus/Link';
import styles from './SubscriptionValue.module.css';

const PLANS = [20, 100, 200];
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

// Plain arithmetic on the visitor's own inputs. It never asserts a saving on its own.
export default function SubscriptionValue() {
  const [usage, setUsage] = useState(600);
  const [plan, setPlan] = useState(200);
  const sliderId = useId();
  const ratio = usage / plan;
  const shown = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;

  return <section className={styles.value} id="subscription-value" aria-labelledby="value-title">
    <div className={styles.copy}>
      <p className={styles.eyebrow}>Make your AI budget go further</p>
      <h2 id="value-title">Put the plans you already pay for to work.</h2>
      <p className={styles.lead}>API billing meters every token. A flat coding plan, such as a $200-a-month tier, includes a usage allowance for the same kind of agent work. For heavy, sustained coding, the plan can cost a fraction of the same usage billed at API rates.</p>
      <p>SpecWithCode puts those plans to work on machines you control: each agent runs where your files are, with the sign-in it already has. How much you save depends on your plan, model, limits and workload, so check it against your own bills.</p>
      <ul className={styles.points}>
        <li><b>Sign in the native way.</b> Claude Code and Codex use their own eligible plan sign-ins on each machine.</li>
        <li><b>See every limit in one place.</b> Session and weekly windows for each account, before you hit them.</li>
        <li><b>Keep going at a limit.</b> Continue the thread on another provider you have connected.</li>
      </ul>
      <figure className={styles.usageShot}>
        <img src="/img/studio/flow-usage-limits.webp" width={1040} height={520} loading="lazy" decoding="async" alt="Actual SpecWithCode Usage and Limits screen showing weekly and session windows for Codex and Claude accounts" />
        <figcaption>Usage and limits screen from the recorded tour, 10 October 2026.</figcaption>
      </figure>
    </div>

    <div className={styles.panel}>
      <figure className={styles.providerChip}>
        <img src="/img/studio/provider-status-20261008.png" width={273} height={195} loading="lazy" decoding="async" alt="Actual provider list: Codex authenticated with a ChatGPT Pro subscription; Claude needs attention" />
        <figcaption>Actual provider list, 8 October 2026</figcaption>
      </figure>
      <div className={styles.chartCard}>
        <div className={styles.chartHead}><span>Same work, two meters</span><span className={styles.legend}><i className={styles.apiKey} />API rates<i className={styles.planKey} />Flat plan</span></div>
        <svg className={styles.chart} viewBox="0 0 400 220" role="img" aria-label="Illustration: metered API cost rises with every token used, while a flat plan stays at its monthly price until its usage limits apply.">
          <defs>
            <linearGradient id="sv-gap" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".16" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient>
          </defs>
          <g className={styles.grid}>{[40, 85, 130, 175].map(y => <line key={y} x1="20" x2="388" y1={y} y2={y} />)}</g>
          <path className={styles.gap} d="M94 150 L330 22 L330 150 Z" fill="url(#sv-gap)" />
          <path className={styles.api} d="M20 190 L330 22" pathLength={1} />
          <path className={styles.plan} d="M20 150 H330" pathLength={1} />
          <path className={styles.planAfter} d="M330 150 H388" />
          <line className={styles.limit} x1="330" x2="330" y1="16" y2="196" />
          <text x="20" y="212" className={styles.axis}>Usage in a month →</text>
          <text x="326" y="210" className={styles.axis} textAnchor="end">Plan limits apply</text>
          <text x="150" y="110" className={styles.apiLabel} transform="rotate(-28.5 150 110)">Every token billed</text>
          <text x="120" y="170" className={styles.planLabel}>Fixed monthly price</text>
          <text x="255" y="120" className={styles.gapLabel} textAnchor="middle">The gap</text>
        </svg>

        <div className={styles.calc}>
          <label htmlFor={sliderId} className={styles.calcLabel}>Your usage at API rates <output htmlFor={sliderId}>{money(usage)}/mo</output></label>
          <input id={sliderId} type="range" min={50} max={4000} step={50} value={usage} onChange={e => setUsage(Number(e.target.value))} aria-valuetext={`${money(usage)} per month`} />
          <div className={styles.plans} role="radiogroup" aria-label="Plan price per month">
            {PLANS.map(p => <button key={p} type="button" role="radio" aria-checked={plan === p} onClick={() => setPlan(p)}>{money(p)} plan</button>)}
          </div>
          <p className={styles.result} aria-live="polite">
            {ratio > 1
              ? <><strong>{shown}×</strong><span>the plan price would go to API billing for this usage, if the work fits within the plan’s limits.</span></>
              : <><strong>API</strong><span>billing costs less at this level of use. A plan pays off as usage grows.</span></>}
          </p>
        </div>
        <p className={styles.fine}>Illustrative arithmetic with your own numbers, not a quote or a promised multiplier. Plans have session and weekly limits; extra usage, seat rules and provider terms can change the result. Enterprise plans can bill differently: Anthropic currently lists Enterprise as a seat fee plus API-rate usage. <a href="https://claude.com/pricing">Check current provider pricing.</a></p>
      </div>
      <Link to="/pricing" className={styles.inlineLink}>SpecWithCode itself is free. See pricing and team options <span aria-hidden="true">↗</span></Link>
    </div>
  </section>;
}
