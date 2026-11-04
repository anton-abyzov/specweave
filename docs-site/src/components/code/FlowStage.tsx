import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {AnimatePresence, LayoutGroup, motion, MotionConfig} from 'motion/react';
import {ArrowRight, Check, Laptop, Monitor, Server} from 'lucide-react';
import styles from './FlowStage.module.css';

/*
  The /code hero: one SpecWithCode window, the way the app is organised.
  Left: the coordinator chat, the one window you talk to. Right: the worker threads it starts,
  each on an agent, a plan and a machine. Bottom: your machines.

  Two scenes play in a loop, Free then With subscriptions, so the page shows the step from one
  to the other. Picking a scene stops the loop on it.
  - Free: three machines. On the Mac a Claude Code thread reaches the handoff point and Codex on a
    free ChatGPT account continues the same thread with its history (tested on 1.0.191 on
    4 November 2026, Claude limit triggered by the test switch). DeepSeek (your own API key) runs
    other threads on the Windows PC and the Linux server. One free Codex account, no rotation.
  - With subscriptions: the coordinator runs Claude Code, Codex and GitHub Copilot threads on your
    Mac, Windows PC and Linux server in parallel, and gives the next task to a plan with room
    when one nears its limit. No thread is handed from Claude Code to Codex (not retested), and
    no provider has more than one account.
  Task text is illustrative; there are no dated "real run" labels on this drawing.
  Server render and reduced motion show each scene's finished state, without the loop.
*/

export type Flow = 'free' | 'subs';
const THRESHOLDS = [98, 99, 100] as const;
type Threshold = (typeof THRESHOLDS)[number];
type MachineId = 'laptop' | 'mac' | 'windows' | 'linux';

const MACHINES: Record<MachineId, {name: string; icon: typeof Laptop}> = {
  laptop: {name: 'Your laptop', icon: Laptop},
  mac: {name: 'Mac', icon: Laptop},
  windows: {name: 'Windows PC', icon: Monitor},
  linux: {name: 'Linux server', icon: Server},
};

type Thread = {
  id: string;
  task: string;
  mark: string;
  dark?: boolean;
  agent: string;
  plan: string;
  machine: MachineId;
  /** ms into the scene when the thread starts */
  start: number;
  /** ms to fill to the handoff point; undefined = never reaches it in this scene */
  fill?: number;
  /** usage it rests at when it never reaches the handoff point */
  rest?: number;
  steps: string[];
  /** label once it reaches the handoff point */
  atLimit?: string;
  /** the agent that continues this same thread at the handoff point */
  then?: {mark: string; dark?: boolean; agent: string; plan: string; rest: number; steps: string[]};
};

type Message = {at: number; from: 'you' | 'coordinator'; text: (t: Threshold) => React.ReactNode};

type Scene = {
  length: number;
  coordinator: {mark: string; dark?: boolean; label: string};
  machines: MachineId[];
  threads: Thread[];
  messages: Message[];
  /** a task chip that moves into a thread when the first thread reaches the handoff point */
  routed?: {task: string; to: string; at: number};
};

const SCENES: Record<Flow, Scene> = {
  free: {
    length: 13000,
    coordinator: {mark: 'openai', dark: true, label: 'Codex · free ChatGPT account'},
    machines: ['mac', 'windows', 'linux'],
    threads: [
      {id: 'signup', task: 'Signup page', mark: 'claude', agent: 'Claude Code', plan: 'Your Claude plan', machine: 'mac', start: 1200, fill: 4800,
        steps: ['Read 14 files', 'Wrote SignupForm.tsx', 'Tests: 18 passed'], atLimit: 'History kept',
        then: {mark: 'openai', dark: true, agent: 'Codex', plan: 'Free ChatGPT account', rest: 36, steps: ['Picked up with full history', 'Added email validation', 'Tests: 24 passed']}},
      {id: 'emails', task: 'Email templates', mark: 'deepseek', agent: 'DeepSeek', plan: 'Your API key', machine: 'windows', start: 1600, rest: 58,
        steps: ['Read 6 templates', 'Wrote welcome.mjml', 'Previews rendered']},
      {id: 'tests', task: 'Tests and CI', mark: 'deepseek', agent: 'DeepSeek', plan: 'Your API key', machine: 'linux', start: 2000, rest: 44,
        steps: ['Added 30 tests', 'Fixed flaky e2e', 'CI green']},
    ],
    messages: [
      {at: 0, from: 'you', text: () => 'Build the signup flow'},
      {at: 700, from: 'coordinator', text: () => 'Split into 3 threads on your machines.'},
      {at: 6300, from: 'coordinator', text: t => <>Claude reached {t}%. Codex on your free ChatGPT account picked up the same thread, history kept.</>},
      {at: 11200, from: 'coordinator', text: () => <>Signup flow is done. <Check size={13} strokeWidth={2.5} aria-hidden="true" /> 24 tests pass.</>},
    ],
  },
  subs: {
    length: 14000,
    coordinator: {mark: 'claude', label: 'Claude Code · Claude Max'},
    machines: ['mac', 'windows', 'linux'],
    threads: [
      {id: 'claude', task: 'Payments API', mark: 'claude', agent: 'Claude Code', plan: 'Claude Max', machine: 'mac', start: 1400, fill: 5600,
        steps: ['Planned 6 tasks', 'Wrote charge.ts', 'Tests: 31 passed'], atLimit: 'Done · next task routed'},
      {id: 'codex', task: 'Checkout screen', mark: 'openai', dark: true, agent: 'Codex', plan: 'ChatGPT Pro', machine: 'windows', start: 1700, rest: 71,
        steps: ['Read 22 files', 'Wrote Checkout.tsx', 'Tests: 12 passed']},
      {id: 'copilot', task: 'Tests and CI', mark: 'copilot', dark: true, agent: 'GitHub Copilot', plan: 'Copilot Pro+', machine: 'linux', start: 2000, rest: 46,
        steps: ['Added 40 tests', 'Fixed flaky e2e', 'CI green']},
    ],
    messages: [
      {at: 0, from: 'you', text: () => 'Ship checkout v2'},
      {at: 700, from: 'coordinator', text: () => 'Split into 3 threads on your machines.'},
      {at: 7300, from: 'coordinator', text: t => <>Claude Max is at {t}%. The next task, Refunds, goes to Copilot, which has room.</>},
      {at: 12200, from: 'coordinator', text: () => <>All threads finished. <Check size={13} strokeWidth={2.5} aria-hidden="true" /> 3 pull requests to review.</>},
    ],
    routed: {task: 'Refunds', to: 'copilot', at: 7300},
  },
};

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function prefersReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Scene clock. Returns ms into the current scene; the server render rests on the end. */
const HOLD = 1800;

/** Scene clock: ms into the scene, and ms including the hold before the next one. */
function useSceneClock(flow: Flow, playing: boolean, run: number, onEnd: () => void): [number, number] {
  const [[t, el], setT] = useState<[number, number]>([SCENES[flow].length, 0]);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (!playing || prefersReduced()) { setT([SCENES[flow].length, 0]); return; }
    const len = SCENES[flow].length;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    setT([0, 0]);
    const tick = (now: number) => {
      const e = now - start;
      if (e >= len + HOLD) { endRef.current(); return; }
      if (now - last > 40) { last = now; setT([Math.min(e, len), e]); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flow, playing, run]);
  return [t, el];
}

function useOnScreen<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), {threshold: 0.25});
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on];
}

function usage(th: Thread, t: number, threshold: Threshold): number {
  const e = t - th.start;
  if (e <= 0) return 0;
  if (th.fill) return ease(e / th.fill) * threshold;
  return ease(e / 6500) * (th.rest ?? 50);
}

function ThreadCard({flow, th, t, threshold, base, routed}: {flow: Flow; th: Thread; t: number; threshold: Threshold; base: string; routed?: string}) {
  const queued = t < th.start;
  const atLimit = !!th.fill && t - th.start >= th.fill;
  // At the handoff point the same card continues on the next agent: same thread, new agent.
  const next = atLimit && th.then ? th.then : undefined;
  const since = th.fill ? t - th.start - th.fill : 0;
  const u = next ? ease(since / 5000) * next.rest : usage(th, t, threshold);
  const steps = next ? next.steps : th.steps;
  const progress = next ? Math.min(1, since / 5000) : th.fill ? Math.min(1, (t - th.start) / th.fill) : Math.min(1, (t - th.start) / 6500);
  const shown = Math.ceil(progress * steps.length - 0.01);
  const who = next ?? th;
  const M = MACHINES[th.machine];
  return <motion.li
    layout
    initial={{opacity: 0, y: 14, scale: 0.98}}
    animate={{opacity: queued ? 0.5 : atLimit && !next ? 0.66 : 1, y: 0, scale: 1}}
    exit={{opacity: 0}}
    transition={{type: 'spring', stiffness: 260, damping: 26}}
    className={clsx(styles.thread, atLimit && !next && styles.threadDone, next && styles.threadHanded)}
  >
    <div className={styles.threadHead}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img key={who.mark} className={clsx(styles.mark, who.dark && styles.darkPlate)} src={`${base}${who.mark}.svg`} alt="" width="20" height="20"
          initial={{opacity: 0, rotateY: 90}} animate={{opacity: 1, rotateY: 0}} exit={{opacity: 0, rotateY: -90}} transition={{duration: 0.35}} />
      </AnimatePresence>
      <motion.span key={flow + th.id} className={styles.threadTitle} initial={{opacity: 0, x: 12}} animate={{opacity: 1, x: 0}} transition={{type: 'spring', stiffness: 300, damping: 30}}>{th.task}<small>{next ? <><s>{th.agent}</s> → {next.agent} · {next.plan}</> : <>{th.agent} · {th.plan}</>}</small></motion.span>
      <span className={styles.pct}>{Math.round(u)}%</span>
    </div>
    <div className={styles.meter} aria-hidden="true"><span style={{width: `${u}%`}} /></div>
    <div className={styles.threadFoot}>
      <span className={styles.machineChip}><M.icon size={12} strokeWidth={2} aria-hidden="true" />{M.name}</span>
      <span className={styles.step}>{queued ? 'Queued' : atLimit && th.atLimit && (!next || since < 900) ? th.atLimit : steps[Math.max(0, shown - 1)]}</span>
    </div>
    <AnimatePresence>
      {next && since < 2600 && <motion.span key="handed" className={styles.handed} initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
        Handed off at {threshold}%
      </motion.span>}
    </AnimatePresence>
    <AnimatePresence>
      {routed && <motion.span key="routed" className={styles.routed} initial={{opacity: 0, x: -40, scale: 0.8}} animate={{opacity: 1, x: 0, scale: 1}} transition={{type: 'spring', stiffness: 220, damping: 20}}>
        <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />Next: {routed}
      </motion.span>}
    </AnimatePresence>
  </motion.li>;
}

export default function FlowStage({flow, onFlow}: {flow: Flow; onFlow: (f: Flow) => void}) {
  const base = useBaseUrl('/img/studio/providers/');
  const [threshold, setThreshold] = useState<Threshold>(98);
  const [auto, setAuto] = useState(true);
  const [ref, onScreen] = useOnScreen<HTMLDivElement>();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [run, setRun] = useState(0);
  const [t, elapsed] = useSceneClock(flow, mounted && onScreen, run, () => {
    if (auto) onFlow(flow === 'free' ? 'subs' : 'free');
    else setRun(r => r + 1); // replay the chosen scene
  });
  const scene = SCENES[flow];
  const threads = scene.threads.filter(th => t >= th.start);
  const live = mounted && onScreen && !prefersReduced();
  const sceneProgress = live ? Math.min(1, elapsed / (scene.length + HOLD)) : 1;
  const messages = scene.messages.filter(m => t >= m.at);
  const routed = scene.routed && t >= scene.routed.at ? scene.routed : undefined;
  const pick = (f: Flow) => { setAuto(false); setRun(r => r + 1); onFlow(f); };

  return <MotionConfig reducedMotion="user">
    <div ref={ref} className={styles.stage}>
      <div className={styles.controls}>
        <div className={styles.steps} role="tablist" aria-label="Choose a flow">
          <button type="button" role="tab" aria-selected={flow === 'free'} className={clsx(flow === 'free' && styles.stepOn)} onClick={() => pick('free')}><span className={styles.stepNo}>1</span><span className={styles.long}>Free ChatGPT account</span><span className={styles.short}>Free</span> <span className={styles.tag}>$0</span>{flow === 'free' && <span className={styles.tabProgress} style={{transform: `scaleX(${sceneProgress})`}} aria-hidden="true" />}</button>
          <ArrowRight className={styles.stepArrow} size={14} strokeWidth={2} aria-hidden="true" />
          <button type="button" role="tab" aria-selected={flow === 'subs'} className={clsx(flow === 'subs' && styles.stepOn)} onClick={() => pick('subs')}><span className={styles.stepNo}>2</span><span className={styles.long}>Plans you already pay for</span><span className={styles.short}>Plans you pay for</span>{flow === 'subs' && <span className={styles.tabProgress} style={{transform: `scaleX(${sceneProgress})`}} aria-hidden="true" />}</button>
        </div>
        <div className={styles.threshold} role="radiogroup" aria-label="Hand off at">
          <span>Hand off at</span>
          {THRESHOLDS.map(v => <button key={v} type="button" role="radio" aria-checked={threshold === v} className={clsx(threshold === v && styles.thOn)} onClick={() => setThreshold(v)}>{v}%</button>)}
        </div>
      </div>

      <LayoutGroup>
        <motion.div layout className={styles.window} transition={{type: 'spring', stiffness: 200, damping: 28}}>
          <div className={styles.titlebar} aria-hidden="true"><span /><span /><span /><b>SpecWithCode</b><em>Checkout project</em></div>
          <div className={styles.body}>
            <section className={styles.chat} aria-label="Coordinator chat">
              <p className={styles.paneTitle}>
                <AnimatePresence mode="popLayout" initial={false}><motion.img key={scene.coordinator.mark} className={clsx(styles.mark, scene.coordinator.dark && styles.darkPlate)} src={`${base}${scene.coordinator.mark}.svg`} alt="" width="16" height="16" initial={{opacity: 0, rotateY: 90}} animate={{opacity: 1, rotateY: 0}} exit={{opacity: 0, rotateY: -90}} transition={{duration: 0.35}} /></AnimatePresence>
                Coordinator<AnimatePresence mode="popLayout" initial={false}><motion.small key={scene.coordinator.label} initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -6}}>{scene.coordinator.label}</motion.small></AnimatePresence>
              </p>
              <p className={styles.oneWindow}>The one window you talk to</p>
              <ul className={styles.messages}>
                <AnimatePresence initial={false} mode="popLayout">
                  {messages.map(m => <motion.li key={flow + m.at} layout className={clsx(styles.msg, m.from === 'you' ? styles.you : styles.coord)}
                    initial={{opacity: 0, y: 10, scale: 0.96}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, x: -24, transition: {duration: 0.25}}} transition={{type: 'spring', stiffness: 320, damping: 28}}>
                    {m.text(threshold)}
                  </motion.li>)}
                </AnimatePresence>
              </ul>
            </section>
            <section className={styles.threads} aria-label="Worker threads">
              <p className={styles.paneTitle}>Threads<small>{`${threads.length} of ${scene.threads.length} running`}</small></p>
              <ul className={styles.threadList}>
                <AnimatePresence initial={false}>
                  {scene.threads.map((th, i) => <ThreadCard key={`slot${i}`} flow={flow} th={th} t={t} threshold={threshold} base={base} routed={routed?.to === th.id ? routed.task : undefined} />)}
                </AnimatePresence>
              </ul>
            </section>
          </div>
          <motion.ul layout className={styles.machines} aria-label="Your machines">
            {scene.machines.map(id => {
              const M = MACHINES[id];
              const busy = threads.some(th => th.machine === id);
              return <motion.li key={id} layout initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} className={clsx(styles.machine, busy && styles.machineBusy)}>
                <M.icon size={14} strokeWidth={2} aria-hidden="true" />{M.name}<span className={styles.dot} aria-hidden="true" />
              </motion.li>;
            })}
          </motion.ul>
        </motion.div>
      </LayoutGroup>
      <p className={styles.note}>SpecWithCode itself is free in both. The second view just adds subscriptions you already have.</p>
    </div>
  </MotionConfig>;
}
