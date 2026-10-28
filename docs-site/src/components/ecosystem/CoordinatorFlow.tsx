import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './CoordinatorFlow.module.css';

/*
  /code #real-run: a pinned stage. On wide screens one app window stays in view and swaps
  real captures while four beats scroll past beside it; the run state under the window follows.
  On phones, with reduced motion, without JS and in print, it is a stacked list: every beat
  carries its own capture. The final beat is the resting state, so first paint shows the finished run.
*/

type Shot = {src: string; w: number; h: number; alt: string; pos?: string};

// Every line of copy below is taken from the recorded tip-calculator run
// (docs-site/static/video/code-run-20261015.mp4, SpecWithCode 1.0.21, 15 October 2026).
const beats: {label: string; title: string; body: string; shot: Shot; back?: Shot; caption: string}[] = [
  {
    label: 'Goal shared',
    title: 'Give the project one goal.',
    body: 'Describe the outcome once. The coordinator keeps the request, context and decisions in one conversation, and you choose the model, effort and approval mode.',
    shot: {src: '/img/studio/flow-composer-20261015.webp', w: 947, h: 300, alt: 'Actual SpecWithCode composer with Claude Code Opus 5.5, effort and thinking settings, and the Supervised approval mode'},
    caption: 'Composer with model, effort and approval controls. SpecWithCode 1.0.21, 15 October 2026.',
  },
  {
    label: 'Work assigned',
    title: 'The coordinator splits the work.',
    body: 'It starts a worker thread for each part. Here Codex writes tip.py while Claude Code adds the usage guide. Each thread keeps its own provider, model and permissions on the machine you chose.',
    shot: {src: '/img/studio/flow-dispatch-20261015.webp', w: 1064, h: 680, alt: 'Actual coordinator reply starting two workers: Write tip.py CLI with approval requested, and README usage for tip.py working', pos: 'left top'},
    caption: 'The coordinator starts two worker threads. SpecWithCode 1.0.21, 15 October 2026.',
  },
  {
    label: 'Working in parallel',
    title: 'Workers run side by side.',
    body: 'Each worker receives the coordinator’s brief in its own thread. Open any thread to see the commands it ran, the files it changed and the output it got, and approve commands when the mode asks you to.',
    shot: {src: '/img/studio/flow-worker-codex-20261015.webp', w: 690, h: 1090, alt: 'Actual Codex worker thread on gpt-6.1-sol showing the coordinator brief and a command approval with Decline and Approve', pos: 'center bottom'},
    back: {src: '/img/studio/flow-worker-claude-20261015.webp', w: 691, h: 797, alt: 'Actual Claude Code worker report: python3 tip.py 50 18 printed Tip $9.00 and Total $59.00, only README.md changed, nothing committed', pos: 'center top'},
    caption: 'Codex asks for a command approval; Claude Code reports its evidence. SpecWithCode 1.0.21, 15 October 2026.',
  },
  {
    label: 'Results returned',
    title: 'Results come back to one conversation.',
    body: 'Workers report to the coordinator, which checks each result against the goal and tells you what is left. Review the evidence before you accept anything: a reported result still needs verification.',
    shot: {src: '/img/studio/flow-coord-report-20261015.webp', w: 822, h: 875, alt: 'Actual coordinator summary: the README Usage example now shows the real output of python3 tip.py 50 18, only README.md changed and nothing is committed', pos: 'center top'},
    caption: 'Coordinator summary after a follow-up check. SpecWithCode 1.0.21, 15 October 2026.',
  },
];

const status = {
  you: ['Build a tip calculator', 'Goal sent', 'Following along', 'Review the result'],
  coord: ['Reading the goal', 'Starting 2 threads', 'Watching 2 workers', 'Both tasks finished'],
  codex: ['Idle', 'Write tip.py CLI', 'Command approved, writing tip.py', 'Tip: $9.00, Total: $59.00'],
  claude: ['Idle', 'README usage for tip.py', 'Message received from coordinator', 'Usage example uses the real output'],
};

const log: {phase: number; from: string; to?: string; text: string}[] = [
  {phase: 0, from: 'You', to: 'Coordinator', text: 'Codex writes tip.py, Claude Code adds a README Usage section. Don’t commit.'},
  {phase: 1, from: 'Coordinator', to: 'Codex', text: 'Write tip.py and run python3 tip.py 50 18 once.'},
  {phase: 1, from: 'Coordinator', to: 'Claude Code', text: 'Add a short Usage section to README.md.'},
  {phase: 2, from: 'Codex', text: 'Command approval requested, then approved.'},
  {phase: 2, from: 'Claude Code', text: 'Editing README.md only.'},
  {phase: 3, from: 'Codex', to: 'Coordinator', text: 'Tip: $9.00, Total: $59.00, exited 0.'},
  {phase: 3, from: 'Claude Code', to: 'Coordinator', text: 'Usage example now shows the exact output.'},
  {phase: 3, from: 'Coordinator', to: 'You', text: 'Only README.md changed, and nothing is committed.'},
];

const workerState = ['Idle', 'Assigned', 'Working', 'Reported'];
const workerChip = ['', '', 'wv-chip--iris', 'wv-chip--pass'];

function Img({shot, className, lazy = true}: {shot: Shot; className?: string; lazy?: boolean}) {
  const src = useBaseUrl(shot.src);
  return <img className={className} src={src} width={shot.w} height={shot.h} alt={shot.alt} loading={lazy ? 'lazy' : undefined} decoding="async" style={shot.pos ? {objectPosition: shot.pos} : undefined} />;
}

export default function CoordinatorFlow() {
  const beatRefs = useRef<(HTMLElement | null)[]>([]);
  // The final step is the resting state: no-JS, screenshots and first paint show the finished run.
  const [active, setActive] = useState(3);

  // The active beat is the last one whose top has passed 55% of the viewport. Reading the
  // scroll position (not a thin intersection band) means every beat, the last one included,
  // gets its full share of the pinned scroll, and a fast fling never skips a state.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.55;
      let next = 0;
      beatRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) next = i;
      });
      setActive(prev => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function jump(index: number) {
    const el = beatRefs.current[index];
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({block: 'center', behavior: reduce ? 'auto' : 'smooth'});
    setActive(index);
  }

  const people = [
    {name: 'You', status: status.you[active]},
    {name: 'Coordinator', status: status.coord[active]},
    {name: 'Codex', model: 'gpt-6.1-sol', status: status.codex[active], worker: true},
    {name: 'Claude Code', model: 'claude-opus-5-5', status: status.claude[active], worker: true},
  ];

  return <section className={styles.flow} id="real-run" aria-labelledby="workflow-title" style={{'--active': active} as React.CSSProperties}>
    <div className={styles.intro}>
      <p className={styles.kicker}>One brief. Work you can follow.</p>
      <h2 id="workflow-title">Step through a real run</h2>
      <p>A coordinator hands two parts of a small job to Codex and Claude Code, then brings their results back. Every screenshot below comes from that recorded run on SpecWithCode 1.0.21, 15 October 2026. Keep the decisions, see the work: scroll and the window follows each step.</p>
    </div>


    <div className={styles.stage}>
      <div className={styles.beats}>
        {beats.map((beat, index) => <article
          key={beat.title}
          ref={el => { beatRefs.current[index] = el; }}
          className={styles.beat}
          data-active={active === index}
          aria-labelledby={`flow-beat-${index}`}>
          <div className={styles.beatBody}>
          <p className={styles.beatLabel}><span>{String(index + 1).padStart(2, '0')}</span>{beat.label}</p>
          <h3 id={`flow-beat-${index}`}>{beat.title}</h3>
          <p>{beat.body}</p>
          <ol className={styles.log} aria-label={`Messages in step ${index + 1}`}>
            {log.filter(line => line.phase === index).map((line, i) => <li key={i}>
              <b>{line.from}{line.to && <> to {line.to}</>}</b>
              <span>{line.text}</span>
            </li>)}
          </ol>
          </div>
          {/* Stacked layout: each beat carries its own capture. Hidden while the pinned window shows it. */}
          <figure className={clsx(styles.inline, beat.back && styles.pair)}>
            <div className="wv-window"><Img shot={beat.shot} /></div>
            {beat.back && <div className="wv-window"><Img shot={beat.back} /></div>}
            <figcaption>{beat.caption}</figcaption>
          </figure>
        </article>)}
      </div>

      <div className={styles.pin}>
        <nav className={styles.steps} aria-label="Steps of the recorded run">
          <ol>
            {beats.map((beat, index) => <li key={beat.label}>
              <button type="button" aria-current={active === index ? 'step' : undefined} onClick={() => jump(index)}>
                <span className={styles.stepNum}>{index + 1}</span>{beat.label}
              </button>
            </li>)}
          </ol>
          <span className={styles.progress} aria-hidden="true"><span /></span>
        </nav>
        <div className={clsx('wv-window', styles.window)}>
          <div className="wv-window__bar"><span>Real capture · step {active + 1} of 4</span><span>SpecWithCode 1.0.21</span></div>
          <div className={styles.screen}>
            {beats.map((beat, index) => <div key={beat.title} className={clsx(styles.layer, beat.back && styles.layerPair)} data-active={active === index} data-before={index < active}>
              <Img shot={beat.shot} className={styles.layerImg} />
              {beat.back && <Img shot={beat.back} className={styles.layerImg} />}
            </div>)}
          </div>
          <p className={styles.screenCaption}>{beats[active].caption}</p>
        </div>

        <ul className={styles.people} aria-label={`Run state after step ${active + 1}, ${beats[active].label}`}>
          {people.map(p => <li key={p.name}>
            <span className={styles.who}>{p.name}{p.model && <code className={styles.model}>{p.model}</code>}</span>
            {p.worker && <span className={clsx('wv-chip', workerChip[active])}>{workerState[active]}</span>}
            <span className={styles.what}>{p.status}</span>
          </li>)}
        </ul>
      </div>
    </div>

    <p className={styles.caption}>The run state summarizes the recorded run; screenshots are actual app captures. Your providers, models and permissions determine what runs.</p>
  </section>;
}
