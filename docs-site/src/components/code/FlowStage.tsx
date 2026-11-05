import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {AnimatePresence, LayoutGroup, motion, MotionConfig} from 'motion/react';
import {ArrowRight, Check, Laptop, Monitor, Server} from 'lucide-react';
import styles from './FlowStage.module.css';

/*
  The /code hero: a self-running picture of how SpecWithCode works, with almost no text.
  Top to bottom: you give one goal, the coordinator splits it into threads, and each thread runs
  on an agent, a plan and a machine. Nothing to click: two scenes loop on their own, and the
  connectors flow from the coordinator down to the threads the whole time.
  - Free: you start on one Mac. Claude Code reaches the handoff point and Codex on a free ChatGPT
    account continues the same thread with its history (tested on 1.0.191 on 4 November 2026,
    Claude limit triggered by the test switch). Meanwhile a Windows PC and a Linux server connect
    and take threads on DeepSeek (your own API key) and Gemini CLI (free Google account).
    One free Codex account, no rotation.
  - Plans you pay for: the same picture on Claude Max (Opus 5.5), ChatGPT Pro and GitHub Copilot.
    When Claude Max nears its limit, the next task moves to a plan with room. No thread is handed
    from Claude Code to Codex here (not retested), and no provider has more than one account.
  The handoff point is the default, 98%. Task text is illustrative; there are no dated "real run"
  labels on this drawing. Server render and reduced motion show the free scene's finished state.
*/

export type Flow = 'free' | 'subs';
const THRESHOLD = 98;
type MachineId = 'mac' | 'windows' | 'linux';

const MACHINES: Record<MachineId, {name: string; icon: typeof Laptop}> = {
  mac: {name: 'Mac', icon: Laptop},
  windows: {name: 'Windows PC', icon: Monitor},
  linux: {name: 'Linux server', icon: Server},
};

type Agent = {mark: string; dark?: boolean; agent: string; plan: string; price: string};

type Thread = Agent & {
  id: string;
  task: string;
  machine: MachineId;
  /** ms into the scene when the machine connects and its card appears */
  connect: number;
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
  then?: Agent & {rest: number; steps: string[]};
};

type Message = {at: number; text: React.ReactNode};

type Scene = {
  length: number;
  coordinator: Agent;
  goal: string;
  threads: Thread[];
  messages: Message[];
  /** a task that waits on one thread and moves to another when the first reaches the handoff point */
  routed?: {task: string; to: string; from: string; at: number};
};

const SCENES: Record<Flow, Scene> = {
  free: {
    length: 13500,
    coordinator: {mark: 'claude', agent: 'Claude Code', plan: 'Your plan', price: ''},
    goal: 'Build the signup flow',
    threads: [
      {id: 'signup', task: 'Signup page', machine: 'mac', connect: 0, start: 800, fill: 5200, mark: 'claude', agent: 'Claude Code', plan: 'Your Claude plan', price: '',
        steps: ['Read 14 files', 'Wrote SignupForm.tsx', 'Tests: 18 passed'], atLimit: 'History kept',
        then: {mark: 'openai', dark: true, agent: 'Codex', plan: 'Free ChatGPT account', price: '$0', rest: 36, steps: ['Picked up with full history', 'Added email validation', 'Tests: 24 passed']}},
      {id: 'emails', task: 'Email templates', machine: 'windows', connect: 2600, start: 3200, rest: 58, mark: 'deepseek', agent: 'DeepSeek', plan: 'Your API key', price: '',
        steps: ['Read 6 templates', 'Wrote welcome.mjml', 'Previews rendered']},
      {id: 'tests', task: 'Tests and CI', machine: 'linux', connect: 4200, start: 4800, rest: 44, mark: 'gemini', agent: 'Gemini CLI', plan: 'Free Google account', price: '$0',
        steps: ['Added 30 tests', 'Fixed flaky e2e', 'CI green']},
    ],
    messages: [
      {at: 400, text: 'Started on your Mac.'},
      {at: 2700, text: 'Windows PC and Linux server joined: 3 threads.'},
      {at: 6500, text: <>Claude Code at {THRESHOLD}%. Codex on your free ChatGPT account continues the thread, history kept.</>},
      {at: 11600, text: <>Signup flow done. <Check size={13} strokeWidth={2.5} aria-hidden="true" /> 24 tests pass.</>},
    ],
  },
  subs: {
    length: 13000,
    coordinator: {mark: 'claude', agent: 'Claude Code', plan: 'Claude Max', price: '$200'},
    goal: 'Ship checkout v2',
    threads: [
      {id: 'claude', task: 'Payments API', machine: 'mac', connect: 0, start: 900, fill: 4800, mark: 'claude', agent: 'Claude Code', plan: 'Claude Max · Opus 5.5', price: '$200',
        steps: ['Planned 6 tasks', 'Wrote charge.ts', 'Tests: 31 passed'], atLimit: 'Done · next task moved'},
      {id: 'codex', task: 'Checkout screen', machine: 'windows', connect: 0, start: 1300, rest: 71, mark: 'openai', dark: true, agent: 'Codex', plan: 'ChatGPT Pro', price: '$200',
        steps: ['Read 22 files', 'Wrote Checkout.tsx', 'Tests: 12 passed']},
      {id: 'copilot', task: 'Tests and CI', machine: 'linux', connect: 0, start: 1700, rest: 46, mark: 'copilot', dark: true, agent: 'GitHub Copilot', plan: 'Copilot Pro+', price: '$39',
        steps: ['Added 40 tests', 'Fixed flaky e2e', 'CI green']},
    ],
    messages: [
      {at: 400, text: '3 threads on the plans you pay for.'},
      {at: 6200, text: <>Claude Max at {THRESHOLD}%. Refunds goes to Copilot, which has room.</>},
      {at: 11200, text: <>All done. <Check size={13} strokeWidth={2.5} aria-hidden="true" /> 3 pull requests to review.</>},
    ],
    routed: {task: 'Refunds', to: 'copilot', from: 'claude', at: 5900},
  },
};

const FLOWS: Flow[] = ['free', 'subs'];
const NEXT: Record<Flow, Flow> = {free: 'subs', subs: 'free'};
const HOLD = 1800;

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function prefersReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Scene clock: ms into the scene, and ms including the hold before the next one. The server render rests on the end. */
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

function usage(th: Thread, t: number): number {
  const e = t - th.start;
  if (e <= 0) return 0;
  if (th.fill) return ease(e / th.fill) * THRESHOLD;
  return ease(e / 6500) * (th.rest ?? 50);
}

const flip = {initial: {opacity: 0, rotateY: 90}, animate: {opacity: 1, rotateY: 0}, exit: {opacity: 0, rotateY: -90}, transition: {duration: 0.35}};
const slide = {initial: {opacity: 0, y: 8}, animate: {opacity: 1, y: 0}, exit: {opacity: 0, y: -8}, transition: {duration: 0.25}};
const spring = {type: 'spring', stiffness: 260, damping: 26} as const;

function Mark({mark, dark, size, base}: {mark: string; dark?: boolean; size: number; base: string}) {
  return <motion.img key={mark} className={clsx(styles.mark, dark && styles.darkPlate)} src={`${base}${mark}.svg?v=2`} alt="" width={size} height={size} {...flip} />;
}

function ThreadCard({flow, th, t, base, routed}: {flow: Flow; th: Thread; t: number; base: string; routed?: {task: string; here: 'from' | 'to'}}) {
  const queued = t < th.start;
  const justConnected = t - th.connect < 1800;
  const atLimit = !!th.fill && t - th.start >= th.fill;
  // At the handoff point the same card continues on the next agent: same thread, new agent.
  const next = atLimit && th.then ? th.then : undefined;
  const since = th.fill ? t - th.start - th.fill : 0;
  const u = next ? ease(since / 5000) * next.rest : usage(th, t);
  const steps = next ? next.steps : th.steps;
  const progress = next ? Math.min(1, since / 5000) : th.fill ? Math.min(1, (t - th.start) / th.fill) : Math.min(1, (t - th.start) / 6500);
  const shown = Math.ceil(progress * steps.length - 0.01);
  const who: Agent = next ?? th;
  const M = MACHINES[th.machine];
  const busy = !queued && !(atLimit && !next);
  return <motion.li
    layout
    initial={{opacity: 0, y: 18, scale: 0.96}}
    animate={{opacity: 1, y: 0, scale: 1}}
    exit={{opacity: 0, y: 12, scale: 0.96, transition: {duration: 0.25}}}
    transition={spring}
    className={clsx(styles.thread, queued && styles.threadQueued, busy && styles.threadBusy, atLimit && !next && styles.threadDone, next && styles.threadHanded)}
  >
    <span className={clsx(styles.machine, justConnected && th.connect > 0 && styles.machineNew)}><M.icon size={12} strokeWidth={2} aria-hidden="true" />{M.name}{justConnected && th.connect > 0 && <i>connected</i>}</span>
    <div className={styles.who}>
      <AnimatePresence mode="popLayout" initial={false}><Mark mark={who.mark} dark={who.dark} size={28} base={base} /></AnimatePresence>
      <span className={styles.agent}>
        <AnimatePresence mode="popLayout" initial={false}><motion.b key={who.agent} {...slide}>{who.agent}</motion.b></AnimatePresence>
        <AnimatePresence mode="popLayout" initial={false}><motion.small key={who.plan} {...slide}>{who.price && <em>{who.price}</em>}{who.plan}</motion.small></AnimatePresence>
      </span>
    </div>
    <p className={styles.task}>
      <AnimatePresence mode="popLayout" initial={false}><motion.span key={flow + th.id} {...slide}>{th.task}</motion.span></AnimatePresence>
      <span className={styles.pct}>{Math.round(u)}%</span>
    </p>
    <div className={styles.meter} aria-hidden="true"><span style={{width: `${u}%`}} /></div>
    <span className={styles.step}>{queued ? 'Starting' : atLimit && th.atLimit && (!next || since < 900) ? th.atLimit : steps[Math.max(0, shown - 1)]}</span>
    <AnimatePresence>
      {next && since < 3200 && <motion.span key="handed" className={clsx(styles.badge, styles.badgeBeam)} initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
        <span>Handed off at {THRESHOLD}%</span>
      </motion.span>}
    </AnimatePresence>
    {routed && <motion.span layoutId="routed" className={clsx(styles.badge, routed.here === 'from' && styles.badgeWaiting)} transition={{type: 'spring', stiffness: 200, damping: 24}}>
      <span>{routed.here === 'to' && <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />}{routed.here === 'from' ? 'Next: ' : ''}{routed.task}</span>
    </motion.span>}
  </motion.li>;
}

export default function FlowStage() {
  const base = useBaseUrl('/img/studio/providers/');
  const [flow, setFlow] = useState<Flow>('free');
  const [ref, onScreen] = useOnScreen<HTMLDivElement>();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [run, setRun] = useState(0);
  const [t, elapsed] = useSceneClock(flow, mounted && onScreen, run, () => setFlow(NEXT[flow]));
  const scene = SCENES[flow];
  const live = mounted && onScreen && !prefersReduced();
  const sceneProgress = live ? Math.min(1, elapsed / (scene.length + HOLD)) : 1;
  const messages = scene.messages.filter(m => t >= m.at);
  const latest = messages[messages.length - 1];
  const routed = scene.routed;
  const routedAt = routed ? (t >= routed.at ? routed.to : t >= routed.at - 2600 ? routed.from : undefined) : undefined;
  const connected = scene.threads.filter(th => t >= th.connect);
  const pick = (f: Flow) => { setRun(r => r + 1); setFlow(f); };

  return <MotionConfig reducedMotion="user">
    <div ref={ref} className={styles.stage}>
      <LayoutGroup>
        <div className={styles.tiers} role="tablist" aria-label="Two ways to run it">
          {FLOWS.map(f => <button key={f} type="button" role="tab" aria-selected={flow === f} className={clsx(styles.tier, flow === f && styles.tierOn)} onClick={() => pick(f)}>
            {flow === f && <motion.span layoutId="tierOn" className={styles.tierPill} transition={{type: 'spring', stiffness: 320, damping: 32}} aria-hidden="true" />}
            <span className={styles.tierDot} aria-hidden="true" />
            {f === 'free' ? <><span className={styles.long}>Free accounts</span><span className={styles.short}>Free</span><em>$0</em></> : <><span className={styles.long}>Plans you pay for</span><span className={styles.short}>Your plans</span><em>$200</em></>}
            {flow === f && <span className={styles.tierProgress} style={{transform: `scaleX(${sceneProgress})`}} aria-hidden="true" />}
          </button>)}
        </div>

        <div className={styles.flow}>
          <div className={styles.you}>
            <span className={styles.youChip}>You</span>
            <AnimatePresence mode="popLayout" initial={false}><motion.span key={flow} className={styles.goal} {...slide}>{scene.goal}</motion.span></AnimatePresence>
          </div>
          <div className={styles.coordBeam}>
            <div className={styles.coordinator}>
              <AnimatePresence mode="popLayout" initial={false}><Mark mark={scene.coordinator.mark} dark={scene.coordinator.dark} size={22} base={base} /></AnimatePresence>
              <span className={styles.coordName}>Coordinator<AnimatePresence mode="popLayout" initial={false}><motion.small key={flow} {...slide}>{scene.coordinator.agent} · {scene.coordinator.price && <em>{scene.coordinator.price}</em>}{scene.coordinator.plan}</motion.small></AnimatePresence></span>
              <span className={styles.coordSays} aria-live="off">
                <AnimatePresence mode="popLayout" initial={false}>{latest && <motion.span key={flow + latest.at} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}} transition={{duration: 0.3}}>{latest.text}</motion.span>}</AnimatePresence>
              </span>
            </div>
          </div>
          <span className={styles.stem} aria-hidden="true" />

          <ul className={clsx(styles.threads, connected.length === 1 && styles.threadsOne, connected.length === 2 && styles.threadsTwo)} aria-label="Worker threads">
            <AnimatePresence initial={false}>
              {scene.threads.map((th, i) => t >= th.connect && <ThreadCard key={`slot${i}`} flow={flow} th={th} t={t} base={base}
                routed={routed && routedAt && (routedAt === th.id) ? {task: routed.task, here: th.id === routed.to ? 'to' : 'from'} : undefined} />)}
            </AnimatePresence>
          </ul>
        </div>
      </LayoutGroup>
      <p className={styles.caption}>Hand off at {THRESHOLD}%, history kept. Set the point from 50% to 100% per project.</p>
    </div>
  </MotionConfig>;
}
