import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Translate, {translate} from '@docusaurus/Translate';
import {ArrowUp, Check, CircleCheck, FileCode2, FileText, GitMerge, GitPullRequest, LoaderCircle, Pause, Play} from 'lucide-react';
import styles from './HowItWorks.module.css';

/*
  How SpecWithCode works, in five beats that loop on their own (16 s):
  1 Request: the typed request reaches the coordinator.
  2 Split: the coordinator starts two workers, each owning its own file.
  3 Parallel: both workers run at once, each on the model you chose (both ran on Demo Mac).
  4 Evidence: the Codex worker's report comes back with commands, output and changed files.
  5 Ships: checks pass and the pull request merges (drawn in HTML, not a capture).
  The captures are the light and dark `howitworks-*` files from the released 1.0.216 server,
  8 November 2026; see static/img/studio/coordinator-capture-source.md. The pull request in
  beat 5 is illustrative: nothing in that run was committed.

  Timing is one CSS timeline: every animated element runs for --dur with a negative delay
  derived from its start time and --t, so setting --t (and pausing) shows any moment exactly.
  The only script pauses the timeline while the stage is off screen or the tab is hidden, or
  when the reader presses Pause (remembered in localStorage).
  Under prefers-reduced-motion the beats render as one static, complete summary.
*/

const CAPTURE_VERSION = '1.0.216';

type ShotProps = {
  name: string;
  /** natural size in CSS pixels (the files are 2x) */
  w: number;
  h: number;
  /** region shown in narrow containers: x, y, width, height in CSS pixels */
  crop?: [number, number, number, number];
  /** region shown in wide containers, same units; the whole capture when omitted */
  wide?: [number, number, number, number];
  eager?: boolean;
};

function Shot({name, w, h, crop, wide, eager}: ShotProps) {
  const light = useBaseUrl(`/img/studio/howitworks-${name}-light.webp`);
  const dark = useBaseUrl(`/img/studio/howitworks-${name}-dark.webp`);
  const [cx, cy, cw, ch] = crop ?? [0, 0, w, h];
  const [wx, wy, ww, wh] = wide ?? [0, 0, w, h];
  const vars = {'--w': w, '--h': h, '--cx': cx, '--cy': cy, '--cw': cw, '--ch': ch, '--wx': wx, '--wy': wy, '--ww': ww, '--wh': wh} as React.CSSProperties;
  const common = {width: w, height: h, alt: '', decoding: 'async' as const};
  // Eager is the light file only: the dark one (hidden in light theme) stays lazy and low
  // priority, so a light page never pays for both.
  return <span className={clsx(styles.shot, crop && styles.crop, wide && styles.wideCrop)} style={vars}>
    <img className={styles.light} src={light} {...common} loading={eager ? undefined : 'lazy'} />
    <img className={styles.dark} src={dark} {...common} loading="lazy" fetchPriority={eager ? 'low' : undefined} />
  </span>;
}

/** The request typed in the captured composer, word for word. */
const REQUEST = 'Add a --currency flag and a README usage section. Start a Codex worker for price.py and a Claude Code worker for README.md in parallel, and have each run the script and report the command and its output.';

/** Start offset (seconds into its beat) for an animated element. */
const at = (o: number) => ({'--o': `${o}s`} as React.CSSProperties);

const STEP_IDS = ['request', 'split', 'parallel', 'evidence', 'ships'] as const;
type StepId = typeof STEP_IDS[number];

function stepLabel(id: StepId): string {
  switch (id) {
    case 'request': return translate({id: 'code.howItWorks.step.request', message: 'Request', description: 'How it works animation, step 1 label: the user sends a request'});
    case 'split': return translate({id: 'code.howItWorks.step.split', message: 'Split', description: 'How it works animation, step 2 label: the work is split between workers'});
    case 'parallel': return translate({id: 'code.howItWorks.step.parallel', message: 'Parallel', description: 'How it works animation, step 3 label: workers run at the same time'});
    case 'evidence': return translate({id: 'code.howItWorks.step.evidence', message: 'Evidence', description: 'How it works animation, step 4 label: results come back with proof'});
    case 'ships': return translate({id: 'code.howItWorks.step.ships', message: 'Ships', description: 'How it works animation, step 5 label: the change is merged and shipped'});
  }
}

function stepSay(id: StepId): string {
  switch (id) {
    case 'request': return translate({id: 'code.howItWorks.say.request', message: 'You ask once. The request lands in the coordinator.', description: 'How it works animation, step 1 sentence'});
    case 'split': return translate({id: 'code.howItWorks.say.split', message: 'The coordinator splits it into workers. Each one owns its own files.', description: 'How it works animation, step 2 sentence'});
    case 'parallel': return translate({id: 'code.howItWorks.say.parallel', message: 'The workers run at once, each on the model you chose.', description: 'How it works animation, step 3 sentence'});
    case 'evidence': return translate({id: 'code.howItWorks.say.evidence', message: 'Each one reports back with the commands it ran, their output and the changed files.', description: 'How it works animation, step 4 sentence'});
    case 'ships': return translate({id: 'code.howItWorks.say.ships', message: 'Checks pass, the pull request merges, and the change ships.', description: 'How it works animation, step 5 sentence'});
  }
}

function Beat({i, id, className, children}: {i: number; id: StepId; className?: string; children: React.ReactNode}) {
  return <div className={clsx(styles.beat, className)} style={{'--i': i} as React.CSSProperties}>
    <div className={styles.say}>
      <span className={styles.tag}><b>{i + 1}</b>{stepLabel(id)}</span>
      <span>{stepSay(id)}</span>
    </div>
    {children}
  </div>;
}

function Owns({file, icon: Icon}: {file: string; icon: typeof FileCode2}) {
  return <span className={styles.owns}>
    <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
    <Translate id="code.howItWorks.owns" description="How it works animation: which file a worker is responsible for; {file} is a file name" values={{file: <span className={styles.mono}>{file}</span>}}>{'Owns {file}'}</Translate>
  </span>;
}

function Branch({className}: {className?: string}) {
  return <svg className={clsx(styles.branch, className)} viewBox="0 0 56 200" preserveAspectRatio="none" aria-hidden="true">
    <path className={styles.rail} d="M0 100 C30 100 26 50 56 50" />
    <path className={styles.rail} d="M0 100 C30 100 26 150 56 150" />
    <path className={styles.beads} d="M0 100 C30 100 26 50 56 50" />
    <path className={styles.beads} d="M0 100 C30 100 26 150 56 150" />
  </svg>;
}

function Done({o, slow}: {o: number; slow?: boolean}) {
  return <span className={clsx(styles.status, slow ? styles.slow : styles.fast)}>
    <span className={clsx(styles.running, styles.anim)} style={at(o)}><LoaderCircle size={13} strokeWidth={2} aria-hidden="true" /><Translate id="code.howItWorks.running" description="How it works animation: worker status while it runs">Running</Translate></span>
    <span className={clsx(styles.done, styles.anim)} style={at(o)}><Check size={13} strokeWidth={2.5} aria-hidden="true" /><Translate id="code.howItWorks.done" description="How it works animation: worker status when finished">Done</Translate></span>
  </span>;
}

const PAUSE_KEY = 'specwithcode.howItWorks.paused';

function useLivePause() {
  const ref = useRef<HTMLDivElement>(null);
  const [autoPaused, setAutoPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  useEffect(() => {
    try { setUserPaused(localStorage.getItem(PAUSE_KEY) === '1'); } catch { /* storage blocked */ }
  }, []);
  const toggle = () => setUserPaused((was) => {
    try { localStorage.setItem(PAUSE_KEY, was ? '0' : '1'); } catch { /* storage blocked */ }
    return !was;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    let onScreen = true;
    const update = () => setAutoPaused(!onScreen || document.hidden);
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); }, {threshold: 0.05});
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  return {ref, paused: autoPaused || userPaused, userPaused, toggle};
}

export default function HowItWorks({showLink = true, className}: {showLink?: boolean; className?: string}) {
  const {ref, paused, userPaused, toggle} = useLivePause();
  const label = translate({
    id: 'code.howItWorks.label',
    message: 'How SpecWithCode works: you send one request to the coordinator; it splits the work into workers that each own their files; the workers run at once on the models you chose; each one reports the commands it ran, their output and the changed files; then checks pass and the pull request merges.',
    description: 'Accessible description of the how it works animation. Keep SpecWithCode in English',
  });
  return <figure className={clsx(styles.figure, className)}>
    <div ref={ref} className={styles.stage} role="img" aria-label={label} data-paused={paused ? 'true' : undefined}>
      <div className={styles.steps}>
        <ol>
          {STEP_IDS.map((id, i) => <li key={id} className={styles.anim} style={{'--i': i} as React.CSSProperties}><b>{i + 1}</b><span>{stepLabel(id)}</span></li>)}
        </ol>
        <span className={styles.track}><span className={styles.fill} /></span>
      </div>

      <div className={styles.beats}>
        <Beat i={0} id="request" className={styles.request}>
          <span className={clsx(styles.pop, styles.anim)} style={at(0.15)}>
            <span className={styles.composerWide}><Shot name="1-composer" w={715} h={196} eager /></span>
            {/* Narrow stages: the request as live text so it wraps, above the capture's real model chip. */}
            <span className={styles.composerNarrow}>
              <span className={styles.composerBox}><span>{REQUEST}</span><span className={styles.send} aria-hidden="true"><ArrowUp size={14} strokeWidth={2.5} /></span></span>
              <Shot name="1-composer" w={715} h={196} crop={[34, 146, 228, 44]} />
            </span>
          </span>
          <span className={clsx(styles.drop, styles.anim)} style={at(0.8)} aria-hidden="true" />
          <span className={clsx(styles.node, styles.pop, styles.anim)} style={at(1.3)}>
            <span className={clsx(styles.ring, styles.anim)} style={at(1.4)} />
            <span className={styles.nodeDot} />
            <b><Translate id="code.howItWorks.coordinator" description="How it works animation: the coordinator thread that receives the request">Coordinator</Translate></b>
            <span className={styles.meta}>Claude Code · Opus 5.5 · Demo Mac</span>
          </span>
        </Beat>

        <Beat i={1} id="split" className={styles.split}>
          <span className={clsx(styles.pop, styles.anim, styles.capture)} style={at(0.1)}><Shot name="2-dispatch" w={703} h={347} crop={[0, 48, 470, 124]} wide={[0, 0, 703, 246]} /></span>
          <span className={clsx(styles.pop, styles.anim, styles.link)} style={at(0.6)}><Branch /></span>
          <div className={styles.pair}>
            <div className={clsx(styles.card, styles.pop, styles.anim)} style={at(0.95)}>
              <b>Add --currency flag</b>
              <span className={styles.meta}>Codex</span>
              <Owns file="price.py" icon={FileCode2} />
            </div>
            <div className={clsx(styles.card, styles.pop, styles.anim)} style={at(1.3)}>
              <b>README usage section</b>
              <span className={styles.meta}>Claude Code</span>
              <Owns file="README.md" icon={FileText} />
            </div>
          </div>
        </Beat>

        <Beat i={2} id="parallel" className={styles.parallel}>
          <span className={clsx(styles.pop, styles.anim, styles.capture)} style={at(0.1)}><Shot name="3-parallel-workers" w={459} h={280} crop={[0, 115, 459, 165]} /></span>
          <span className={clsx(styles.pop, styles.anim, styles.link)} style={at(0.2)}><Branch /></span>
          <div className={styles.pair}>
            <div className={clsx(styles.lane, styles.pop, styles.anim)} style={at(0.3)}>
              <span className={styles.laneHead}><b>Add --currency flag</b><Done o={0.3} /></span>
              <span className={styles.chip}>Codex · GPT-6-Luna · Demo Mac</span>
              <span className={styles.bar}><span className={clsx(styles.barFill, styles.fast, styles.anim)} style={at(0.3)} /></span>
            </div>
            <div className={clsx(styles.lane, styles.pop, styles.anim)} style={at(0.45)}>
              <span className={styles.laneHead}><b>README usage section</b><Done o={0.45} slow /></span>
              <span className={styles.chip}>Claude Code · Opus 5.5 · Demo Mac</span>
              <span className={styles.bar}><span className={clsx(styles.barFill, styles.slow, styles.anim)} style={at(0.45)} /></span>
            </div>
          </div>
        </Beat>

        <Beat i={3} id="evidence" className={styles.evidence}>
          <span className={clsx(styles.pop, styles.anim, styles.capture)} style={at(0.1)}><Shot name="4-worker-report" w={440} h={384} crop={[0, 0, 440, 186]} /></span>
          <ul className={styles.ticks}>
            <li className={clsx(styles.pop, styles.anim)} style={at(0.6)}><CircleCheck size={16} strokeWidth={2} aria-hidden="true" /><span><span className={styles.mono}>python3 price.py 19.99 3</span> → <span className={styles.mono}>Total: $59.97</span></span></li>
            <li className={clsx(styles.pop, styles.anim)} style={at(1.0)}><CircleCheck size={16} strokeWidth={2} aria-hidden="true" /><span><span className={styles.mono}>--currency EUR</span> → <span className={styles.mono}>Total: 59.97 EUR</span></span></li>
            <li className={clsx(styles.pop, styles.anim)} style={at(1.4)}><CircleCheck size={16} strokeWidth={2} aria-hidden="true" /><span><Translate id="code.howItWorks.evidence.files" description="How it works animation: number of files the worker changed">2 changed files</Translate> <span className={styles.meta}><span className={styles.mono}>price.py</span> <span className={styles.plus}>+4</span> <span className={styles.minus}>−1</span>, <span className={styles.mono}>README.md</span> <span className={styles.plus}>+2</span> <span className={styles.minus}>−2</span></span></span></li>
            <li className={clsx(styles.pop, styles.anim)} style={at(1.8)}><CircleCheck size={16} strokeWidth={2} aria-hidden="true" /><span><Translate id="code.howItWorks.evidence.sent" description="How it works animation: the worker sent its report to the coordinator thread">Report sent to the coordinator</Translate></span></li>
          </ul>
        </Beat>

        <Beat i={4} id="ships" className={styles.ships}>
          <div className={clsx(styles.pr, styles.pop, styles.anim)} style={at(0.1)}>
            <span className={styles.prHead}><GitPullRequest size={16} strokeWidth={1.75} aria-hidden="true" /><span className={styles.meta}><Translate id="code.howItWorks.ship.pr" description="How it works animation: label of the pull request card">Pull request</Translate></span></span>
            <b className={styles.prTitle}>Add --currency flag and README usage</b>
            <span className={styles.prFiles}>
              <span><FileCode2 size={14} strokeWidth={1.75} aria-hidden="true" /><span className={styles.mono}>price.py</span><span className={styles.meta}>Codex</span><span className={styles.plus}>+4</span><span className={styles.minus}>−1</span></span>
              <span><FileText size={14} strokeWidth={1.75} aria-hidden="true" /><span className={styles.mono}>README.md</span><span className={styles.meta}>Claude Code</span><span className={styles.plus}>+2</span><span className={styles.minus}>−2</span></span>
            </span>
            <span className={styles.checks}>
              <span className={clsx(styles.pop, styles.anim)} style={at(0.55)}><CircleCheck size={15} strokeWidth={2} aria-hidden="true" /><span className={styles.mono}>python3 price.py 19.99 3 --currency EUR</span></span>
              <span className={clsx(styles.pop, styles.anim)} style={at(0.9)}><CircleCheck size={15} strokeWidth={2} aria-hidden="true" /><span><Translate id="code.howItWorks.ship.readme" description="How it works animation: a check that re-ran the README examples">README examples re-run</Translate></span></span>
            </span>
            <span className={styles.prFoot}>
              <span className={clsx('wv-chip', 'wv-chip--pass', styles.pop, styles.anim)} style={at(1.2)}><Check size={13} strokeWidth={2.5} aria-hidden="true" /><Translate id="code.howItWorks.ship.checks" description="How it works animation: every check on the pull request passed">All checks passed</Translate></span>
              <span className={clsx('wv-chip', 'wv-chip--iris', styles.pop, styles.anim)} style={at(1.55)}><GitMerge size={13} strokeWidth={2} aria-hidden="true" /><Translate id="code.howItWorks.ship.merged" description="How it works animation: the pull request was merged">Merged</Translate></span>
            </span>
          </div>
          <span className={clsx(styles.stamp, styles.anim)} style={at(1.95)}><CircleCheck size={22} strokeWidth={2} aria-hidden="true" /><Translate id="code.howItWorks.ship.shipped" description="How it works animation: final state, the change is live">Shipped</Translate></span>
        </Beat>
      </div>
    </div>
    <figcaption className={styles.caption}>
      <span>
      <Translate id="code.howItWorks.caption" description="Caption under the how it works animation; {version} is an app version. Keep SpecWithCode in English" values={{version: CAPTURE_VERSION}}>{'Illustration built from SpecWithCode {version} captures, November 8, 2026.'}</Translate>
      {showLink && <>{' '}<Link className="wv-link" to="/code/"><Translate id="code.howItWorks.captionLink" description="Link from the how it works caption to the SpecWithCode page">See everything it does</Translate></Link></>}
      </span>
      <button type="button" className={styles.toggle} onClick={toggle}>
        {userPaused ? <Play size={12} strokeWidth={2.25} aria-hidden="true" /> : <Pause size={12} strokeWidth={2.25} aria-hidden="true" />}
        {userPaused
          ? <Translate id="code.howItWorks.play" description="Button under the how it works animation that resumes it">Play animation</Translate>
          : <Translate id="code.howItWorks.pause" description="Button under the how it works animation that pauses it">Pause animation</Translate>}
      </button>
    </figcaption>
  </figure>;
}
