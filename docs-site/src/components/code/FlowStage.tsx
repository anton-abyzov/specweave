import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {ArrowRight, Laptop, Server, Sparkles} from 'lucide-react';
import styles from './FlowStage.module.css';

/*
  The /code hero diagram: how SpecWithCode keeps a thread going, in two flows.

  Free: one free ChatGPT account on Codex works until the handoff point, then the same
  thread continues on DeepSeek (your own API key) with its context.
  Subscriptions: a coordinator runs workers on the paid plans you already have, in parallel
  on your own machines, and each thread hands off at the handoff point instead of stopping.

  Only tested handoffs are drawn: Codex to DeepSeek and Claude Code to DeepSeek.
  Never draw Claude Code to Codex (not retested), several accounts of one provider, or one
  free account per machine. The task text is illustrative, so no dates or "real run" labels.

  The animation is a 10-second loop driven by requestAnimationFrame. With reduced motion,
  and in the server render, it rests on the finished state.
*/

export type Flow = 'free' | 'subs';
const THRESHOLDS = [98, 99, 100] as const;
type Threshold = (typeof THRESHOLDS)[number];

const LOOP_MS = 10000;
/** Share of the loop spent filling the first provider to the handoff point. */
const FILL_END = 0.48;
const HANDOFF_END = 0.6;

type Lane = {
  mark: string;
  name: string;
  plan: string;
  dark?: boolean;
  steps: string[];
};

type Machine = {icon: typeof Laptop; name: string; task: string; first: Lane; next: Lane; offset: number};

const DEEPSEEK = (steps: string[]): Lane => ({mark: 'deepseek', name: 'DeepSeek', plan: 'Your API key', steps});

const SCENES: Record<Flow, {machines: Machine[]; caption: (t: number) => React.ReactNode}> = {
  free: {
    machines: [{
      icon: Laptop,
      name: 'Your laptop',
      task: 'Build the signup page',
      offset: 0,
      first: {mark: 'openai', name: 'Codex', plan: 'Free ChatGPT account', dark: true, steps: ['Read 14 files', 'Wrote SignupForm.tsx', 'Tests: 18 passed']},
      next: DEEPSEEK(['Picked up with full context', 'Added email validation', 'Tests: 24 passed']),
    }],
    caption: t => <>Codex works until <strong>{t}%</strong> of its limit, then the same thread continues on DeepSeek. Nothing to re-explain.</>,
  },
  subs: {
    machines: [
      {
        icon: Laptop,
        name: 'Your Mac',
        task: 'Payments API',
        offset: 0,
        first: {mark: 'claude', name: 'Claude Code', plan: 'Claude Max', steps: ['Planned 6 tasks', 'Wrote charge.ts', 'Tests: 31 passed']},
        next: DEEPSEEK(['Picked up with full context', 'Added refunds', 'Tests: 37 passed']),
      },
      {
        icon: Server,
        name: 'Your server',
        task: 'Mobile checkout screen',
        offset: 0.08,
        first: {mark: 'openai', name: 'Codex', plan: 'ChatGPT Pro', dark: true, steps: ['Read 22 files', 'Wrote Checkout.tsx', 'Tests: 12 passed']},
        next: DEEPSEEK(['Picked up with full context', 'Fixed Android layout', 'Tests: 15 passed']),
      },
    ],
    caption: t => <>A coordinator runs your paid plans side by side on your own machines. Each thread uses its plan up to <strong>{t}%</strong>, then hands off instead of stopping.</>,
  },
};

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function useLoop(active: boolean): number {
  // Server render and reduced motion rest on the finished state.
  const [p, setP] = useState(1);
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setP(1); return; }
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - last > 33) { last = now; setP(((now - start) % LOOP_MS) / LOOP_MS); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return p;
}

function useOnScreen<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), {threshold: 0.2});
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on];
}

function LaneRow({lane, usage, state, shown, base}: {lane: Lane; usage: number; state: 'idle' | 'working' | 'done'; shown: number; base: string}) {
  return <div className={clsx(styles.lane, styles[state])}>
    <div className={styles.laneHead}>
      <img className={clsx(styles.mark, lane.dark && styles.darkPlate)} src={`${base}${lane.mark}.svg`} alt="" width="22" height="22" />
      <span className={styles.laneName}>{lane.name}<small>{lane.plan}</small></span>
      <span className={styles.pct} aria-hidden="true">{Math.round(usage)}%</span>
    </div>
    <div className={styles.meter} aria-hidden="true"><span style={{width: `${usage}%`}} /></div>
    <ul className={styles.steps}>
      {lane.steps.map((s, i) => <li key={s} className={i < shown ? styles.stepOn : undefined}>{s}</li>)}
    </ul>
  </div>;
}

function MachineCard({m, p, threshold, base}: {m: Machine; p: number; threshold: Threshold; base: string}) {
  const q = Math.min(1, Math.max(0, p - m.offset) / (1 - m.offset));
  const fill = ease(q / FILL_END);
  const firstUsage = fill * threshold;
  const handed = q >= FILL_END;
  const flight = handed ? ease((q - FILL_END) / (HANDOFF_END - FILL_END)) : 0;
  const after = q >= HANDOFF_END ? ease((q - HANDOFF_END) / (1 - HANDOFF_END)) : 0;
  const Icon = m.icon;
  return <div className={styles.machine}>
    <div className={styles.machineHead}><Icon size={16} strokeWidth={1.75} aria-hidden="true" /><span>{m.name}</span><span className={styles.task}>{m.task}</span></div>
    <LaneRow lane={m.first} base={base} usage={firstUsage} state={handed ? 'done' : 'working'} shown={Math.ceil(fill * m.first.steps.length - 0.01)} />
    <div className={clsx(styles.handoff, handed && styles.handoffOn)} aria-hidden="true">
      <span className={styles.handoffLine}><span className={styles.packet} style={{top: `${flight * 100}%`, opacity: handed && flight < 1 ? 1 : 0}} /></span>
      <span className={styles.handoffLabel}><ArrowRight size={13} strokeWidth={2} />Hand off at {threshold}% · context kept</span>
    </div>
    <LaneRow lane={m.next} base={base} usage={after * 34} state={q >= HANDOFF_END ? 'working' : 'idle'} shown={Math.ceil(after * m.next.steps.length - 0.01)} />
  </div>;
}

export default function FlowStage({flow, onFlow}: {flow: Flow; onFlow: (f: Flow) => void}) {
  const base = useBaseUrl('/img/studio/providers/');
  const [threshold, setThreshold] = useState<Threshold>(98);
  const [ref, onScreen] = useOnScreen<HTMLDivElement>();
  const p = useLoop(onScreen);
  const scene = SCENES[flow];
  return <div ref={ref} className={styles.stage}>
    <div className={styles.controls}>
      <div className={styles.tabs} role="tablist" aria-label="Choose a flow">
        <button type="button" role="tab" aria-selected={flow === 'free'} className={clsx(flow === 'free' && styles.tabOn)} onClick={() => onFlow('free')}>Free <span className={styles.tabTag}>$0</span></button>
        <button type="button" role="tab" aria-selected={flow === 'subs'} className={clsx(flow === 'subs' && styles.tabOn)} onClick={() => onFlow('subs')}>With subscriptions</button>
      </div>
      <div className={styles.threshold} role="radiogroup" aria-label="Hand off at">
        <span>Hand off at</span>
        {THRESHOLDS.map(t => <button key={t} type="button" role="radio" aria-checked={threshold === t} className={clsx(threshold === t && styles.thOn)} onClick={() => setThreshold(t)}>{t}%</button>)}
      </div>
    </div>
    {flow === 'subs' && <div className={styles.coordinator}><Sparkles size={14} strokeWidth={2} aria-hidden="true" />Coordinator splits one goal into threads on your machines</div>}
    <div className={clsx(styles.machines, flow === 'subs' && styles.two)}>
      {scene.machines.map(m => <MachineCard key={m.name + flow} m={m} p={p} threshold={threshold} base={base} />)}
    </div>
    <p className={styles.caption} aria-live="polite">{scene.caption(threshold)}</p>
  </div>;
}
