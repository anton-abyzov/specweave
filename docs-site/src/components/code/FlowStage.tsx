import React, {useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Translate, {translate} from '@docusaurus/Translate';
import {AnimatePresence, LayoutGroup, motion, MotionConfig} from 'motion/react';
import {ArrowRight, Check, Circle, CircleAlert, CircleCheck, Laptop, LoaderCircle, Monitor, Server} from 'lucide-react';
import styles from './FlowStage.module.css';

/*
  The /code hero: a self-running picture of how SpecWithCode works, with almost no text.
  Left: the one chat you talk to. You type a goal, the coordinator answers with a plan, and the
  plan's tasks tick from pending to running to done, or to "needs you" when a task does not finish.
  Right: the worker threads the coordinator starts, one per machine, each on an agent and a plan.
  Beaded connectors flow from the chat into every thread the whole time. Nothing to click: two
  scenes play in a loop, and a story bar at the top shows which one is playing and when it changes.
  - Free: you start on one Mac. Claude Code reaches the handoff point and Codex on a free ChatGPT
    account continues the same thread with its history (tested on 1.0.191 on 4 November 2026,
    Claude limit triggered by the test switch). Meanwhile a Windows PC and a Linux server connect
    and take threads on DeepSeek (your own API key) and GitHub Copilot on its free plan.
    One free Codex account, no rotation. The last task ends as "needs you", with failing tests.
  - Plans you pay for: the same picture on Claude Max (Opus 5.5), ChatGPT Pro and GitHub Copilot.
    When Claude Max nears its limit, the next task moves to a plan with room. No thread is handed
    from Claude Code to Codex here (not retested), and no provider has more than one account.
  The handoff point is the default, 98%. Task text is illustrative; there are no dated "real run"
  labels on this drawing. The server render shows the free scene's finished state. The scene clock
  and the beaded connectors run under prefers-reduced-motion too (the picture is the explanation;
  without them it reads as broken); only the decorative float, breathe, sweep and shimmer stop.
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
  /** ms into the scene when the task ends, and how */
  end: number;
  outcome: 'done' | 'needs';
  result: string;
};

/** text is a key into messageText(), so the line renders in the active locale. */
type Message = {at: number; text: MessageKey};

type Scene = {
  length: number;
  coordinator: Agent;
  goal: string;
  /** ms into the scene when the coordinator's plan appears */
  planAt: number;
  threads: Thread[];
  messages: Message[];
  /** a task that waits on one thread and moves to another when the first reaches the handoff point */
  routed?: {task: string; to: string; from: string; at: number; end: number};
};

type MessageKey = 'free.plan' | 'free.joined' | 'free.handoff' | 'free.needs' | 'subs.plan' | 'subs.routed' | 'subs.done';

const CHECK = <Check size={13} strokeWidth={2.5} aria-hidden="true" />;

/** The coordinator's lines, rendered in the active locale. */
function messageText(key: MessageKey): React.ReactNode {
  switch (key) {
    case 'free.plan': return <Translate id="code.flow.message.free.plan" description="Hero diagram, coordinator line: the plan has 3 tasks and starts on the Mac">Plan: 3 tasks. Starting on your Mac.</Translate>;
    case 'free.joined': return <Translate id="code.flow.message.free.joinedMachines" description="Hero diagram, coordinator line: two more machines connected">Windows PC and Linux server joined.</Translate>;
    case 'free.handoff': return <Translate id="code.flow.message.free.handoff" description="Hero diagram, coordinator line: Claude Code reached the handoff point ({threshold} is a number) and Codex continues. Keep product names in English" values={{threshold: THRESHOLD}}>{'Claude Code at {threshold}%. Codex on your free ChatGPT account continues the thread, history kept.'}</Translate>;
    case 'free.needs': return <Translate id="code.flow.message.free.needs" description="Hero diagram, coordinator line: two tasks finished and the Tests and CI task needs the person, because 2 tests fail">2 of 3 done. Tests and CI needs you: 2 tests fail on the Linux server.</Translate>;
    case 'subs.plan': return <Translate id="code.flow.message.subs.plan" description="Hero diagram, coordinator line: the plan has 4 tasks on paid subscriptions">Plan: 4 tasks on the plans you pay for.</Translate>;
    case 'subs.routed': return <Translate id="code.flow.message.subs.routed" description="Hero diagram, coordinator line: Claude Max reached the handoff point ({threshold} is a number) and the Refunds task moves to Copilot. Keep product names in English" values={{threshold: THRESHOLD}}>{'Claude Max at {threshold}%. Refunds goes to Copilot, which has room.'}</Translate>;
    case 'subs.done': return <Translate id="code.flow.message.subs.allDone" description="Hero diagram, coordinator line: all 4 tasks finished; {check} is a check-mark icon" values={{check: CHECK}}>{'All 4 done. {check} 3 pull requests to review.'}</Translate>;
  }
}

/**
 * Scene copy (goals, tasks, plans, steps, results, machine names) keyed by its English text in
 * SCENES, so the scene data stays readable and the text renders in the active locale.
 */
function flowCopy(): Record<string, string> {
  return {
    'Windows PC': translate({id: 'code.flow.machine.windows', message: 'Windows PC', description: 'Hero diagram, machine name'}),
    'Linux server': translate({id: 'code.flow.machine.linux', message: 'Linux server', description: 'Hero diagram, machine name'}),
    'Build the signup flow': translate({id: 'code.flow.goal.free', message: 'Build the signup flow', description: 'Hero diagram, the goal you give in the free scene'}),
    'Ship checkout v2': translate({id: 'code.flow.goal.subs', message: 'Ship checkout v2', description: 'Hero diagram, the goal you give in the paid plans scene'}),
    'Your plan': translate({id: 'code.flow.plan.yours', message: 'Your plan', description: 'Hero diagram, coordinator plan label'}),
    'Your Claude plan': translate({id: 'code.flow.plan.yourClaude', message: 'Your Claude plan', description: 'Hero diagram, plan label. Keep product names in English'}),
    'Free ChatGPT account': translate({id: 'code.flow.plan.freeChatGpt', message: 'Free ChatGPT account', description: 'Hero diagram, plan label. Keep product names in English'}),
    'Your API key': translate({id: 'code.flow.plan.apiKey', message: 'Your API key', description: 'Hero diagram, plan label for DeepSeek with your own API key'}),
    'Signup page': translate({id: 'code.flow.task.signup', message: 'Signup page', description: 'Hero diagram, thread task'}),
    'Email templates': translate({id: 'code.flow.task.emails', message: 'Email templates', description: 'Hero diagram, thread task'}),
    'Tests and CI': translate({id: 'code.flow.task.tests', message: 'Tests and CI', description: 'Hero diagram, thread task'}),
    'Payments API': translate({id: 'code.flow.task.payments', message: 'Payments API', description: 'Hero diagram, thread task'}),
    'Checkout screen': translate({id: 'code.flow.task.checkout', message: 'Checkout screen', description: 'Hero diagram, thread task'}),
    'Refunds': translate({id: 'code.flow.task.refunds', message: 'Refunds', description: 'Hero diagram, a task that moves to another thread'}),
    'Read 14 files': translate({id: 'code.flow.step.read14', message: 'Read 14 files', description: 'Hero diagram, thread progress step'}),
    'Wrote SignupForm.tsx': translate({id: 'code.flow.step.wroteSignupForm', message: 'Wrote SignupForm.tsx', description: 'Hero diagram, thread progress step; keep the file name'}),
    'Tests: 18 passed': translate({id: 'code.flow.step.tests18', message: 'Tests: 18 passed', description: 'Hero diagram, thread progress step'}),
    'History kept': translate({id: 'code.flow.step.historyKept', message: 'History kept', description: 'Hero diagram, thread label at the handoff point'}),
    'Picked up with full history': translate({id: 'code.flow.step.pickedUp', message: 'Picked up with full history', description: 'Hero diagram, thread progress step after the handoff'}),
    'Added email validation': translate({id: 'code.flow.step.emailValidation', message: 'Added email validation', description: 'Hero diagram, thread progress step'}),
    'Tests: 24 passed': translate({id: 'code.flow.step.tests24', message: 'Tests: 24 passed', description: 'Hero diagram, thread progress step'}),
    'Read 6 templates': translate({id: 'code.flow.step.read6Templates', message: 'Read 6 templates', description: 'Hero diagram, thread progress step'}),
    'Wrote welcome.mjml': translate({id: 'code.flow.step.wroteWelcome', message: 'Wrote welcome.mjml', description: 'Hero diagram, thread progress step; keep the file name'}),
    'Previews rendered': translate({id: 'code.flow.step.previews', message: 'Previews rendered', description: 'Hero diagram, thread progress step'}),
    'Added 30 tests': translate({id: 'code.flow.step.added30', message: 'Added 30 tests', description: 'Hero diagram, thread progress step'}),
    'Fixed flaky e2e': translate({id: 'code.flow.step.flakyE2e', message: 'Fixed flaky e2e', description: 'Hero diagram, thread progress step; e2e means end-to-end tests'}),
    'Running CI': translate({id: 'code.flow.step.runningCi', message: 'Running CI', description: 'Hero diagram, thread progress step: continuous integration is running'}),
    'CI green': translate({id: 'code.flow.step.ciGreen', message: 'CI green', description: 'Hero diagram, thread progress step: continuous integration passed'}),
    'Planned 6 tasks': translate({id: 'code.flow.step.planned6', message: 'Planned 6 tasks', description: 'Hero diagram, thread progress step'}),
    'Wrote charge.ts': translate({id: 'code.flow.step.wroteCharge', message: 'Wrote charge.ts', description: 'Hero diagram, thread progress step; keep the file name'}),
    'Tests: 31 passed': translate({id: 'code.flow.step.tests31', message: 'Tests: 31 passed', description: 'Hero diagram, thread progress step'}),
    'Read 22 files': translate({id: 'code.flow.step.read22', message: 'Read 22 files', description: 'Hero diagram, thread progress step'}),
    'Wrote Checkout.tsx': translate({id: 'code.flow.step.wroteCheckout', message: 'Wrote Checkout.tsx', description: 'Hero diagram, thread progress step; keep the file name'}),
    'Tests: 12 passed': translate({id: 'code.flow.step.tests12', message: 'Tests: 12 passed', description: 'Hero diagram, thread progress step'}),
    'Added 40 tests': translate({id: 'code.flow.step.added40', message: 'Added 40 tests', description: 'Hero diagram, thread progress step'}),
    'Done · pull request opened': translate({id: 'code.flow.result.prOpened', message: 'Done · pull request opened', description: 'Hero diagram, thread result: finished and a pull request was opened'}),
    'Done · next task moved': translate({id: 'code.flow.step.doneMoved', message: 'Done · next task moved', description: 'Hero diagram, thread label at the handoff point'}),
    '2 tests fail · asked you': translate({id: 'code.flow.result.needsYou', message: '2 tests fail · asked you', description: 'Hero diagram, thread result: 2 tests fail and the agent asked the person for help'}),
  };
}

/** Translates a piece of scene copy; brand names render as written. code-landing.test.ts checks every scene string has an entry. */
function useFlowText(): (text: string) => string {
  // The locale is fixed for a page load, so build the map once per component, not every frame.
  const copy = useMemo(flowCopy, []);
  return (text) => copy[text] ?? text;
}

function statusText(status: Status): string {
  switch (status) {
    case 'pending': return translate({id: 'code.flow.status.pending', message: 'Waiting', description: 'Hero diagram, plan task status: not started'});
    case 'running': return translate({id: 'code.flow.status.running', message: 'Running', description: 'Hero diagram, plan task status: in progress'});
    case 'done': return translate({id: 'code.flow.status.done', message: 'Done', description: 'Hero diagram, plan task status: finished'});
    case 'needs': return translate({id: 'code.flow.status.needs', message: 'Needs you', description: 'Hero diagram, plan task status: waiting for the person'});
  }
}

const SCENES: Record<Flow, Scene> = {
  free: {
    length: 15500,
    coordinator: {mark: 'claude', agent: 'Claude Code', plan: 'Your plan', price: ''},
    goal: 'Build the signup flow',
    planAt: 1500,
    threads: [
      {id: 'signup', task: 'Signup page', machine: 'mac', connect: 0, start: 1900, fill: 5200, end: 11200, outcome: 'done', result: 'Done · pull request opened', mark: 'claude', agent: 'Claude Code', plan: 'Your Claude plan', price: '',
        steps: ['Read 14 files', 'Wrote SignupForm.tsx', 'Tests: 18 passed'], atLimit: 'History kept',
        then: {mark: 'openai', dark: true, agent: 'Codex', plan: 'Free ChatGPT account', price: '$0', rest: 36, steps: ['Picked up with full history', 'Added email validation', 'Tests: 24 passed']}},
      {id: 'emails', task: 'Email templates', machine: 'windows', connect: 3300, start: 3700, rest: 58, end: 12300, outcome: 'done', result: 'Done · pull request opened', mark: 'deepseek', agent: 'DeepSeek', plan: 'Your API key', price: '',
        steps: ['Read 6 templates', 'Wrote welcome.mjml', 'Previews rendered']},
      {id: 'tests', task: 'Tests and CI', machine: 'linux', connect: 4500, start: 4900, rest: 44, end: 13200, outcome: 'needs', result: '2 tests fail · asked you', mark: 'copilot', dark: true, agent: 'GitHub Copilot', plan: 'Copilot Free', price: '$0',
        steps: ['Added 30 tests', 'Fixed flaky e2e', 'Running CI']},
    ],
    messages: [
      {at: 1500, text: 'free.plan'},
      {at: 3400, text: 'free.joined'},
      {at: 7500, text: 'free.handoff'},
      {at: 13600, text: 'free.needs'},
    ],
  },
  subs: {
    length: 15000,
    coordinator: {mark: 'claude', agent: 'Claude Code', plan: 'Claude Max', price: '$200'},
    goal: 'Ship checkout v2',
    planAt: 1500,
    threads: [
      {id: 'claude', task: 'Payments API', machine: 'mac', connect: 0, start: 1800, fill: 4800, end: 6600, outcome: 'done', result: 'Done · next task moved', mark: 'claude', agent: 'Claude Code', plan: 'Claude Max · Opus 5.5', price: '$200',
        steps: ['Planned 6 tasks', 'Wrote charge.ts', 'Tests: 31 passed']},
      {id: 'codex', task: 'Checkout screen', machine: 'windows', connect: 0, start: 2100, rest: 71, end: 11800, outcome: 'done', result: 'Done · pull request opened', mark: 'openai', dark: true, agent: 'Codex', plan: 'ChatGPT Pro', price: '$200',
        steps: ['Read 22 files', 'Wrote Checkout.tsx', 'Tests: 12 passed']},
      {id: 'copilot', task: 'Tests and CI', machine: 'linux', connect: 0, start: 2400, rest: 46, end: 12800, outcome: 'done', result: 'Done · pull request opened', mark: 'copilot', dark: true, agent: 'GitHub Copilot', plan: 'Copilot Pro+', price: '$39',
        steps: ['Added 40 tests', 'Fixed flaky e2e', 'CI green']},
    ],
    messages: [
      {at: 1500, text: 'subs.plan'},
      {at: 7000, text: 'subs.routed'},
      {at: 13900, text: 'subs.done'},
    ],
    routed: {task: 'Refunds', to: 'copilot', from: 'claude', at: 6600, end: 13600},
  },
};

const FLOWS: Flow[] = ['free', 'subs'];
const NEXT: Record<Flow, Flow> = {free: 'subs', subs: 'free'};
const HOLD = 2200;
const TYPE_MS = 55;
/** Scene times are authored at 1x; the clock runs faster so a scene lasts about 11 seconds and the change is seen. */
const SPEED = 1.4;

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** Scene clock: ms into the scene, and ms including the hold before the next one. The server render rests on the end. */
function useSceneClock(flow: Flow, playing: boolean, run: number, onEnd: () => void): [number, number] {
  const [[t, el], setT] = useState<[number, number]>([SCENES[flow].length, 0]);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (!playing) { setT([SCENES[flow].length, 0]); return; }
    const len = SCENES[flow].length;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    setT([0, 0]);
    const tick = (now: number) => {
      const e = (now - start) * SPEED;
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
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), {threshold: 0.1});
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on];
}

function usage(th: Thread, t: number): number {
  const e = Math.min(t, th.end) - th.start;
  if (e <= 0) return 0;
  if (th.fill) return ease(e / th.fill) * THRESHOLD;
  return ease(e / 6500) * (th.rest ?? 50);
}

type Status = 'pending' | 'running' | 'done' | 'needs';
const STATUS_ICON: Record<Status, React.ReactNode> = {
  pending: <Circle size={14} strokeWidth={2} aria-hidden="true" />,
  running: <LoaderCircle size={14} strokeWidth={2.5} aria-hidden="true" className={styles.spin} />,
  done: <CircleCheck size={14} strokeWidth={2.5} aria-hidden="true" />,
  needs: <CircleAlert size={14} strokeWidth={2.5} aria-hidden="true" />,
};

function threadStatus(th: Thread, t: number): Status {
  if (t < th.start) return 'pending';
  if (t >= th.end) return th.outcome;
  return 'running';
}

const flip = {initial: {opacity: 0, rotateY: 90}, animate: {opacity: 1, rotateY: 0}, exit: {opacity: 0, rotateY: -90}, transition: {duration: 0.35}};
const slide = {initial: {opacity: 0, y: 8}, animate: {opacity: 1, y: 0}, exit: {opacity: 0, y: -8}, transition: {duration: 0.25}};
const spring = {type: 'spring', stiffness: 260, damping: 26} as const;

function Mark({mark, dark, size, base}: {mark: string; dark?: boolean; size: number; base: string}) {
  return <motion.img key={mark} className={clsx(styles.mark, dark && styles.darkPlate)} src={`${base}${mark}.svg?v=2`} alt="" width={size} height={size} {...flip} />;
}

function ThreadCard({flow, th, t, base, routed}: {flow: Flow; th: Thread; t: number; base: string; routed?: {task: string; here: 'from' | 'to'}}) {
  const tx = useFlowText();
  const status = threadStatus(th, t);
  const queued = status === 'pending';
  const justConnected = t - th.connect < 1800;
  const atLimit = !!th.fill && t - th.start >= th.fill;
  // At the handoff point the same card continues on the next agent: same thread, new agent.
  const next = atLimit && th.then ? th.then : undefined;
  const since = th.fill ? Math.min(t, th.end) - th.start - th.fill : 0;
  const u = next ? ease(since / 5000) * next.rest : usage(th, t);
  const steps = next ? next.steps : th.steps;
  const progress = next ? Math.min(1, since / 5000) : th.fill ? Math.min(1, (t - th.start) / th.fill) : Math.min(1, (t - th.start) / 6500);
  const shown = Math.ceil(progress * steps.length - 0.01);
  const who: Agent = next ?? th;
  const M = MACHINES[th.machine];
  const busy = status === 'running';
  // The handoff is the moment to see: the card flashes while the next agent takes over.
  const handing = !!next && since < 1400 * SPEED;
  const label = queued ? translate({id: 'code.flow.step.starting', message: 'Starting', description: 'Hero diagram, thread status before it starts'}) : tx(status !== 'running' ? th.result : atLimit && th.atLimit && (!next || since < 900) ? th.atLimit : steps[Math.max(0, shown - 1)]);
  return <motion.li
    layout
    initial={{opacity: 0, x: 18, scale: 0.96}}
    animate={{opacity: 1, x: 0, scale: 1}}
    exit={{opacity: 0, x: 12, scale: 0.96, transition: {duration: 0.25}}}
    transition={spring}
    className={clsx(styles.thread, queued && styles.threadQueued, busy && styles.threadBusy, status === 'done' && styles.threadDone, status === 'needs' && styles.threadNeeds, next && styles.threadHanded, handing && styles.threadHandoff)}
  >
    <div className={styles.who}>
      <AnimatePresence mode="popLayout" initial={false}><Mark mark={who.mark} dark={who.dark} size={26} base={base} /></AnimatePresence>
      <span className={styles.agent}>
        <AnimatePresence mode="popLayout" initial={false}><motion.b key={who.agent} {...slide}>{who.agent}</motion.b></AnimatePresence>
        <AnimatePresence mode="popLayout" initial={false}><motion.small key={who.plan} {...slide}>{who.price && <em>{who.price}</em>}{tx(who.plan)}</motion.small></AnimatePresence>
      </span>
      <span className={clsx(styles.machine, justConnected && th.connect > 0 && styles.machineNew)}><M.icon size={12} strokeWidth={2} aria-hidden="true" />{tx(M.name)}{justConnected && th.connect > 0 && <i><Translate id="code.flow.machine.connected" description="Hero diagram, tag on a machine that just joined">connected</Translate></i>}</span>
    </div>
    <p className={styles.task}>
      <AnimatePresence mode="popLayout" initial={false}><motion.span key={flow + th.id} {...slide}>{tx(th.task)}</motion.span></AnimatePresence>
      <span className={clsx(styles.status, styles[`status_${status}`])}>{STATUS_ICON[status]}</span>
      <span className={styles.pct}>{Math.round(u)}%</span>
    </p>
    <div className={styles.meter} aria-hidden="true"><span style={{width: `${u}%`}} /></div>
    <span className={styles.step}>{label}</span>
    <AnimatePresence>
      {next && since < 3200 && <motion.span key="handed" className={clsx(styles.badge, styles.badgeBeam)} initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
        <span><Translate id="code.flow.badge.handedOff" description="Hero diagram, badge on a thread handed to the next agent; {threshold} is a number" values={{threshold: THRESHOLD}}>{'Handed off at {threshold}%'}</Translate></span>
      </motion.span>}
    </AnimatePresence>
    {routed && <motion.span layoutId="routed" className={clsx(styles.badge, routed.here === 'from' && styles.badgeWaiting)} transition={{type: 'spring', stiffness: 200, damping: 24}}>
      <span>{routed.here === 'to' && <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />}{routed.here === 'from' ? translate({id: 'code.flow.badge.next', message: 'Next: {task}', description: 'Hero diagram, badge for the task a thread will take next; {task} is the task name'}, {task: tx(routed.task)}) : tx(routed.task)}</span>
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
  const tx = useFlowText();
  const scene = SCENES[flow];
  const goal = tx(scene.goal);
  const live = mounted && onScreen;
  const sceneProgress = live ? Math.min(1, elapsed / (scene.length + HOLD)) : 1;
  const typed = live ? goal.slice(0, Math.floor(t / TYPE_MS)) : goal;
  const typing = live && t < goal.length * TYPE_MS + 500;
  const messages = scene.messages.filter(m => t >= m.at).slice(-2);
  const routed = scene.routed;
  const routedAt = routed ? (t >= routed.at ? routed.to : t >= routed.at - 2600 ? routed.from : undefined) : undefined;
  const plan: {task: string; status: Status}[] = [
    ...scene.threads.map(th => ({task: th.task, status: threadStatus(th, t)})),
    ...(routed ? [{task: routed.task, status: (t < routed.at ? 'pending' : t < routed.end ? 'running' : 'done') as Status}] : []),
  ];
  const doneCount = plan.filter(p => p.status === 'done').length;
  const pick = (f: Flow) => { setRun(r => r + 1); setFlow(f); };

  return <MotionConfig reducedMotion="user">
    <div ref={ref} className={styles.stage}>
      <div className={styles.story} role="tablist" aria-label={translate({id: 'code.flow.tiers.ariaLabel', message: 'Two ways to run it', description: 'Hero diagram, accessible label of the two scene tabs'})}>
        {FLOWS.map(f => <button key={f} type="button" role="tab" aria-selected={flow === f} className={clsx(styles.seg, flow === f && styles.segOn)} onClick={() => pick(f)}>
          <span className={styles.segLabel}>
            <span className={styles.segDot} aria-hidden="true" />
            {f === 'free' ? <><span className={styles.long}><Translate id="code.flow.tier.free.long" description="Hero diagram, tab for the free scene (wide screens)">Free accounts</Translate></span><span className={styles.short}><Translate id="code.flow.tier.free.short" description="Hero diagram, tab for the free scene (narrow screens)">Free</Translate></span><em>$0</em></> : <><span className={styles.long}><Translate id="code.flow.tier.subs.long" description="Hero diagram, tab for the paid plans scene (wide screens)">Plans you pay for</Translate></span><span className={styles.short}><Translate id="code.flow.tier.subs.short" description="Hero diagram, tab for the paid plans scene (narrow screens)">Your plans</Translate></span><em>$200</em></>}
          </span>
          <span className={styles.segTrack} aria-hidden="true"><span className={styles.segFill} style={{transform: `scaleX(${flow === f ? sceneProgress : 0})`}} /></span>
        </button>)}
      </div>

      <LayoutGroup>
        <div className={styles.body}>
          <section className={styles.chat} aria-label={translate({id: 'code.flow.chat.ariaLabel', message: 'The chat you talk to', description: 'Hero diagram, accessible label of the chat pane'})}>
            <p className={styles.paneTitle}>
              <AnimatePresence mode="popLayout" initial={false}><Mark mark={scene.coordinator.mark} dark={scene.coordinator.dark} size={16} base={base} /></AnimatePresence>
              <Translate id="code.flow.coordinator" description="Hero diagram, label of the coordinator agent">Coordinator</Translate>
              <AnimatePresence mode="popLayout" initial={false}><motion.small key={flow} {...slide}>{scene.coordinator.agent} · {scene.coordinator.price && <em>{scene.coordinator.price}</em>}{tx(scene.coordinator.plan)}</motion.small></AnimatePresence>
            </p>
            <ul className={styles.messages}>
              <motion.li layout key={`you-${flow}`} className={clsx(styles.msg, styles.you)} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}>
                {typed}{typing && <span className={styles.caret} aria-hidden="true" />}
              </motion.li>
              <AnimatePresence initial={false} mode="popLayout">
                {t >= scene.planAt && <motion.li layout key={`plan-${flow}`} className={clsx(styles.msg, styles.coord, styles.planCard)} initial={{opacity: 0, y: 10, scale: 0.97}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, x: -24, transition: {duration: 0.25}}} transition={spring}>
                  <b><Translate id="code.flow.plan.progress" description="Hero diagram, heading of the coordinator's plan card: {done} of {total} tasks finished" values={{done: doneCount, total: plan.length}}>{'Plan · {done} of {total} done'}</Translate></b>
                  <ol className={styles.plan}>
                    {plan.map(p => <li key={p.task} className={clsx(styles.planItem, styles[`status_${p.status}`])}>{STATUS_ICON[p.status]}<span>{tx(p.task)}</span><small>{statusText(p.status)}</small></li>)}
                  </ol>
                </motion.li>}
                {messages.map(m => <motion.li layout key={flow + m.at} className={clsx(styles.msg, styles.coord)}
                  initial={{opacity: 0, y: 10, scale: 0.97}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, x: -24, transition: {duration: 0.25}}} transition={spring}>
                  {messageText(m.text)}
                </motion.li>)}
              </AnimatePresence>
            </ul>
          </section>

          <ul className={styles.threads} aria-label={translate({id: 'code.flow.threads.ariaLabel', message: 'Worker threads', description: 'Hero diagram, accessible label of the thread list'})}>
            <AnimatePresence initial={false}>
              {scene.threads.map((th, i) => t >= th.connect && <ThreadCard key={`slot${i}`} flow={flow} th={th} t={t} base={base}
                routed={routed && routedAt && (routedAt === th.id) ? {task: routed.task, here: th.id === routed.to ? 'to' : 'from'} : undefined} />)}
            </AnimatePresence>
          </ul>
        </div>
      </LayoutGroup>
      <p className={styles.caption}><Translate id="code.flow.caption" description="Caption under the hero diagram; {threshold} is the default handoff percentage" values={{threshold: THRESHOLD}}>{'Hand off at {threshold}%, history kept. Set the point from 50% to 100% per project.'}</Translate></p>
    </div>
  </MotionConfig>;
}
