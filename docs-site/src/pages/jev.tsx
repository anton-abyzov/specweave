import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import evidence from '../../static/evidence/jev-easychamp-benchmark.json';
import replay from '../../static/evidence/jev-easychamp-replay.json';
import comparison from '../../static/evidence/jev-easychamp-agent-comparison.json';
import base from './continuity.module.css';
import styles from './jev.module.css';
import {CountUp, motion as m, useGlow} from '../components/sections/Motion';

const examples = [
  { id: 'h01', label: 'A paraphrase', explanation: 'The Python regex falls back. Jev selects the existing league read with 0.96 confidence, above the 0.95 gate. In this replay, the integration routes directly instead of asking a generative model to choose a tool.' },
  { id: 'h09', label: 'Another language', explanation: 'This Spanish request clears the read-only confidence gate. The application still checks access. Recognizing the request does not translate the existing English response template.' },
  { id: 'i02', label: 'A fallback', explanation: 'Jev selects get_leagues at 0.91 confidence, below the integration’s 0.95 threshold. The existing chat path handles it. That extra API call adds cost and latency without avoiding a generative routing step.' },
];

// Three recorded calls from the replay, one per path. Values come from the JSON, not the page.
const routeSteps = [
  { id: 'h02', title: 'Code first', body: 'Existing regex routes stay first. No model call for a decision code already handles.' },
  { id: 'h01', title: 'Jev picks an allowed read', body: 'For unmatched requests, Jev can select an allowed read operation. Confidence and policy gates can reject it.' },
  { id: 'i02', title: 'The fallback stays', body: 'Ambiguity, timeout, or an unsupported operation returns to the existing chat path. Access checks stay in the application.' },
];

function RouteFlow() {
  return <figure className={styles.routeFlow} aria-label="How a request is routed, with three recorded calls">
    <ol className={`wv-thread ${m.stagger}`}>
      {routeSteps.map(step => {
        const r = replay.rows.find(item => item.id === step.id)!;
        const accepted = r.jev.reason === 'accepted';
        const regex = r.jev.reason === 'regex_first';
        const chip = regex ? <span className="wv-chip">Regex match, no model call</span>
          : accepted ? <span className="wv-chip wv-chip--pass">{r.jev.confidence?.toFixed(2)}, above the {replay.threshold.toFixed(2)} gate</span>
          : <span className="wv-chip wv-chip--warn">{r.jev.confidence?.toFixed(2)}, below the gate</span>;
        return <li key={step.id} style={{['--i' as string]: routeSteps.indexOf(step)}}>
          <p className="wv-thread__title">{step.title}</p>
          <p className="wv-thread__body">{step.body}</p>
          <div className={styles.routeCall}><span className={styles.routeMessage}>“{r.message}”</span><span className={styles.routeResult}><code>{r.hybrid_route}</code>{chip}</span></div>
        </li>;
      })}
    </ol>
    <figcaption>Recorded calls {routeSteps.map(step => step.id).join(', ')} from the {replay.model} replay of September 22, 2026. Authored test inputs, not live chat.</figcaption>
  </figure>;
}

/* Bars drawn from the replay JSON: correct decisions before and after. */
function Improvement() {
  const rows = [
    {label: 'All 62 cases', base: replay.metrics.all.baseline_correct, hybrid: replay.metrics.all.hybrid_correct, of: replay.metrics.all.cases},
    {label: 'Held-out 36', base: replay.metrics.held_out.baseline_correct, hybrid: replay.metrics.held_out.hybrid_correct, of: replay.metrics.held_out.cases},
  ];
  return <figure className={styles.bars} aria-label="Correct routing decisions, regex baseline against the integration">
    {rows.map(r => <div key={r.label} className={styles.barGroup}>
      <p className={styles.barLabel}>{r.label}</p>
      <div className={styles.barRow}><span>Regex</span><span className={styles.barTrack}><i className={`${styles.barBase} ${m.drawX}`} style={{width: `${(r.base / r.of) * 100}%`}} /></span><b>{r.base}/{r.of}</b></div>
      <div className={styles.barRow}><span>With Jev</span><span className={styles.barTrack}><i className={`${styles.barHybrid} ${m.drawX}`} style={{width: `${(r.hybrid / r.of) * 100}%`}} /></span><b>{r.hybrid}/{r.of}</b></div>
    </div>)}
    <figcaption>Correct routing decisions in the September 22 replay, drawn from <code>jev-easychamp-replay.json</code>.</figcaption>
  </figure>;
}

const BOUNDARY_ICONS = [
  <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h6" /><circle cx="18" cy="16" r="3" /></svg>,
  <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>,
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>,
];

export default function Jev() {
  const glow = useGlow<HTMLDivElement>();
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  const row = replay.rows.find(item => item.id === example.id)!;
  return <Layout title="Jev: small decisions, inspectable evidence" description="See where Jev fits in a real EasyChamp routing workflow. Inspect recorded inputs, baseline comparisons, failures, and limits before enabling it.">
    <main className={`${base.page} ${styles.page}`}>
      <section className={styles.hero}>
        <div className={m.enter}><h1 style={{['--i' as string]: 0}}>Small decisions with clear boundaries</h1><p className={styles.lead} style={{['--i' as string]: 1}}>Use Jev when the possible answers are known, but the language is not. Route a request, classify a failure, or suggest a model tier—then let your code decide what happens.</p><div className={styles.actions} style={{['--i' as string]: 2}}><a className={base.primary} href="#easychamp">See the EasyChamp evidence</a><Link className={base.textLink} to="/docs/guides/jev-system-one#setup">Set up Jev</Link></div><p className={styles.disclosure} style={{['--i' as string]: 3}}>Optional. Paid API. Off by default. Your main coding model still writes the code.</p></div>
        <RouteFlow />
      </section>
      <nav className={styles.jumpLinks} aria-label="Jev page sections"><a href="#easychamp">EasyChamp example</a><a href="#measurements">Measured results</a><a href="#boundaries">When to use it</a><a href="#start">Try one decision</a></nav>
      <section className={styles.section} id="easychamp"><div className={styles.heading}><div><h2>A coach asks differently, and the route still matters</h2></div><p>EasyChamp has existing routes for leagues, teams, and standings. Exact phrases are cheap to match in code. Paraphrases and other languages are the gap worth testing.</p></div>
        <div className={`${styles.example} ${m.reveal}`}><div className={styles.exampleHeader}><strong>Explore the recorded calls</strong><span>Authored test inputs, not live chat</span></div><div className={styles.exampleButtons} role="group" aria-label="Choose a recorded example">{examples.map((item, index) => <button key={item.id} onClick={() => setSelected(index)} aria-pressed={selected === index}>{item.label}</button>)}</div><div className={styles.exampleBody} aria-live="polite"><blockquote>“{row.message}”</blockquote><div className={styles.results}><div><span>Regex baseline</span><code>{row.baseline_route}</code></div><div><span>Integrated result</span><code>{row.hybrid_route}</code></div><div><span>Reported confidence</span><strong>{row.jev.confidence?.toFixed(2)}</strong></div></div><p>{example.explanation}</p></div></div>
      </section>
      <section className={`${styles.section} ${styles.evidenceSection}`} id="measurements"><div className={styles.heading}><div><h2>Measured calls and honest limits</h2></div><p>A useful result needs its denominator, baseline, and failures. These measurements come from live API calls on synthetic, author-labelled messages.</p></div>
        <div className={styles.replayIntro}><p className={styles.tag}>Latest: actual Python integration replay, September 22, 2026 UTC</p><h3>Five extra reads routed without a generative routing call.</h3><p>In 62 authored cases, the new regex-first integration added five correct direct reads. All five came from the 36 held-out cases, fixed before this run. This is an observed routing result in a replay, not a measured production productivity gain.</p></div>
        <div className={`${styles.metrics} ${m.stagger}`} ref={glow}><div className={m.card} data-glow style={{['--i' as string]: 0}}><strong><CountUp value={replay.metrics.all.additional_correct_direct_routes} suffix=" added" /></strong><span>Correct direct read routes</span></div><div className={m.card} data-glow style={{['--i' as string]: 1}}><strong><CountUp value={replay.provider.calls} suffix=" calls" /></strong><span>Jev requests across 62 cases</span></div><div className={m.card} data-glow style={{['--i' as string]: 2}}><strong><CountUp value={Math.round(replay.provider.latency_p50_ms)} suffix=" ms" /></strong><span>Jev API latency, median</span></div><div className={m.card} data-glow style={{['--i' as string]: 3}}><strong>${replay.provider.cost_usd_reported.toFixed(6)}</strong><span>Reported API cost for the replay</span></div></div>
        <p className={styles.method}>Sequential live requests · {replay.model} · confidence gate {replay.threshold.toFixed(2)} · p95 {Math.round(replay.provider.latency_p95_ms)} ms · regex baseline median {replay.baseline_latency_p50_ms.toFixed(2)} ms. This replay measures routing only. A separate controlled handler comparison appears below; production API latency is not included.</p>
        <div className={styles.evidenceCopy}><div><h3>A narrow, testable improvement</h3><Improvement /><p>Correct routing decisions improved from {replay.metrics.all.baseline_correct}/{replay.metrics.all.cases} to {replay.metrics.all.hybrid_correct}/{replay.metrics.all.cases}, counting both direct reads and required fallbacks. Held-out decisions improved from {replay.metrics.held_out.baseline_correct}/{replay.metrics.held_out.cases} to {replay.metrics.held_out.hybrid_correct}/{replay.metrics.held_out.cases}. Jev introduced zero wrong accepted read routes in this run.</p><a className={styles.evidenceLink} href="/evidence/jev-easychamp-replay.json">Inspect all 62 cases and source revision (JSON)</a></div><div><h3>The remaining cost and risk</h3><p>41 API calls produced five added routes. Most calls still fell back, adding latency and cost. The classifier used 12.9 seconds across the replay: each of the five recovered routes would need to avoid more than 2.58 seconds of work to offset that total latency. Three wrong direct routes in the existing regex remained unchanged. A small, authored corpus cannot establish production accuracy.</p><p>Integration defaults to off. Multilingual requests still use the existing English response templates. No measured production time savings, retention gain, or end-to-end chat speedup. Before enabling it for users, measure fallback volume, corrections, total latency, and total cost.</p></div></div>
        <div className={styles.comparison}><p className={styles.tag}>Controlled comparison: live models, fixture data</p><h3>What changed in the actual chat handler?</h3><p>For “{comparison.rows[0].message}”, the existing Gemini fallback could not list leagues. With Jev enabled, the same Python handler reached its existing league read and returned the fixture result.</p><div className={`${styles.comparisonColumns} ${m.stagger}`}><article className={styles.off}><span>Jev off · {(comparison.rows[0].off.latency_ms / 1000).toFixed(2)} s</span><blockquote>{comparison.rows[0].off.output}</blockquote><small>Gemini 2.5 Flash · no list API call</small></article><article className={styles.on}><span>Jev on · {(comparison.rows[0].enabled.latency_ms / 1000).toFixed(3)} s</span><blockquote>I found 1 league(s):<br />Demo Community League</blockquote><small>Existing read route · no generative model call</small></article></div><p className={styles.method}>This is one selected demonstration, not an independent speed benchmark. The fallback currently lacks a general list tool; exposing that tool is another improvement to test. Five previously successful cases were rerun: four routed directly; one fell below the confidence gate. Network model calls were real, but EasyChamp API data was a fixture. Production HTTP, authorization, database latency, and billed Gemini cost were not measured.</p><a className={styles.evidenceLink} href="/evidence/jev-easychamp-agent-comparison.json">Read all five paired runs and full outputs (JSON)</a></div>
        <details className={styles.archive}><summary>Earlier benchmark: 26 intent labels, a different question</summary><p>The September 21 benchmark classified broad intent labels, including writes. Jev matched {evidence.suite.metrics.jev.correct}/26 labels; the ported JavaScript regex matched {evidence.suite.metrics.baseline.correct}/26. Median API latency was {evidence.suite.stats.latency.p50} ms; total cost was ${evidence.suite.stats.cost.toFixed(8)}.</p><p>Its broad labels and the new integration’s restricted read-or-fallback decisions are different tasks, so their accuracy figures are not directly comparable. The interactive examples above use the newer Python replay.</p><a className={styles.evidenceLink} href="/evidence/jev-easychamp-benchmark.json">Inspect the earlier 26-call dataset (JSON)</a></details>
      </section>
      <section className={styles.section} id="boundaries"><div className={styles.heading}><div><h2>Use a model where meaning matters</h2></div><p>If a rule or lookup already gives the answer, keep it. A smaller model is still slower and more expensive than no model call.</p></div><div className={`${styles.boundaries} ${m.stagger}`}><article className={m.card} style={{['--i' as string]: 0}}><span className={m.icon} aria-hidden="true">{BOUNDARY_ICONS[0]}</span><h3>Good candidates: a finite set, varied language</h3><ul><li>Suggest a read route for an unfamiliar phrase.</li><li>Classify a test failure for human triage.</li><li>Suggest a task’s model tier, with a fallback.</li></ul></article><article className={m.card} style={{['--i' as string]: 1}}><span className={m.icon} aria-hidden="true">{BOUNDARY_ICONS[1]}</span><h3>Keep deterministic: rules, facts, and authority</h3><ul><li>Permissions, payments, and write approvals.</li><li>Date arithmetic, counting, and exact lookups.</li><li>House policy, required checks, and release gates.</li></ul></article><article className={m.card} style={{['--i' as string]: 2}}><span className={m.icon} aria-hidden="true">{BOUNDARY_ICONS[2]}</span><h3>Keep generative: work without a closed answer set</h3><ul><li>Write code, specifications, or explanations.</li><li>Review an implementation or investigate a bug.</li><li>Resolve a request that needs more context.</li></ul></article></div>
        <div className={styles.faq}><details><summary>Is browser delegation a proven speedup?</summary><p>Not in our EasyChamp check. Jev twice selected “done” on the homepage before reaching the requested competition listing. The completion verifier rejected both attempts. Treat navigation as experimental and verify the actual destination; do not equate a model’s “done” with completed work.</p></details><details><summary>What leaves my machine?</summary><p>The state you submit is sent to your configured provider, OpenRouter or TypeSafe. That can include prompts, task text, shell commands, or page content. SpecWeave masks common secret patterns, but masking is best effort. Do not submit data you are not allowed to share.</p></details><details><summary>Can a high confidence score make a decision safe?</summary><p>No. Confidence is a model output, not authorization or proof. Validate allowed outcomes, retain deterministic access checks, measure errors on your own data, and route uncertain cases to the existing fallback.</p></details><details><summary>What happens if Jev is unavailable?</summary><p>SpecWeave’s Jev commands return exit code 4 when disabled, unconfigured, or unreachable. Continue with the existing workflow. The optional shell guard fails open on provider errors; it is advisory protection, not a security boundary.</p></details><details><summary>Will installing SpecWeave change my model or send my project?</summary><p>Jev is off by default. Setup requires a provider key and an explicit opt-in. Tier routing is a suggestion; it does not silently replace your coding model. Each enabled call sends the state supplied to that call.</p></details></div>
      </section>
      <section className={`${styles.start} ${m.reveal}`} id="start"><div><h2>Test the gap, keep what helps</h2><p>Choose a repeated classification. Label a representative sample. Compare your current route with Jev before enabling it for users.</p><pre className={`wv-code ${styles.setup}`}><span className="wv-dim">$ </span>specweave jev setup{'\n'}<span className="wv-dim">$ </span>specweave jev doctor{'\n'}<span className="wv-dim">$ </span>specweave jev usage</pre></div><div className={styles.startSide}><div className={styles.actions}><Link className={base.primary} to="/docs/guides/jev-system-one#setup">Follow the setup guide</Link><a className={base.textLink} href="https://github.com/anton-abyzov/specweave">Inspect the open-source implementation</a></div><p className={styles.disclosure}>New to SpecWeave? <Link to="/docs/getting-started">Install the CLI first.</Link> No Jev key needed for the local planning workflow.</p></div></section>
    </main>
  </Layout>;
}
