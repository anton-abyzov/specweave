import React, {useRef, useState} from 'react';
import clsx from 'clsx';
import styles from './CoordinatorFlow.module.css';

type Shot = {src: string; w: number; h: number; alt: string};

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
    shot: {src: '/img/studio/flow-dispatch-20261015.webp', w: 1064, h: 680, alt: 'Actual coordinator reply starting two workers: Write tip.py CLI with approval requested, and README usage for tip.py working'},
    caption: 'The coordinator starts two worker threads. SpecWithCode 1.0.21, 15 October 2026.',
  },
  {
    label: 'Working in parallel',
    title: 'Workers run side by side.',
    body: 'Each worker receives the coordinator’s brief in its own thread. Open any thread to see the commands it ran, the files it changed and the output it got, and approve commands when the mode asks you to.',
    shot: {src: '/img/studio/flow-worker-codex-20261015.webp', w: 690, h: 1090, alt: 'Actual Codex worker thread on gpt-6.1-sol showing the coordinator brief and a command approval with Decline and Approve'},
    back: {src: '/img/studio/flow-worker-claude-20261015.webp', w: 691, h: 797, alt: 'Actual Claude Code worker report: python3 tip.py 50 18 printed Tip $9.00 and Total $59.00, only README.md changed, nothing committed'},
    caption: 'Codex asks for a command approval; Claude Code reports its evidence. SpecWithCode 1.0.21, 15 October 2026.',
  },
  {
    label: 'Results returned',
    title: 'Results come back to one conversation.',
    body: 'Workers report to the coordinator, which checks each result against the goal and tells you what is left. Review the evidence before you accept anything: a reported result still needs verification.',
    shot: {src: '/img/studio/flow-coord-report-20261015.webp', w: 822, h: 875, alt: 'Actual coordinator summary: the README Usage example now shows the real output of python3 tip.py 50 18, only README.md changed and nothing is committed'},
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

function Frame({shot}: {shot: Shot}) {
  return <div className={clsx('wv-window', styles.frame)}>
    <img src={shot.src} width={shot.w} height={shot.h} alt={shot.alt} loading="lazy" decoding="async" />
  </div>;
}

export default function CoordinatorFlow() {
  const story = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  // The final step is the resting state: no-JS, screenshots and first paint show the finished run.
  const [active, setActive] = useState(3);


  function select(index: number, focus = false) {
    setActive(index);
    if (focus) tabs.current[index]?.focus();
    // The tabs stay pinned while a tall screenshot scrolls past; after a switch,
    // bring the start of the new step back into view instead of leaving the reader mid-image.
    const box = story.current;
    if (box && box.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      box.scrollIntoView({block: 'start', behavior: reduce ? 'auto' : 'smooth'});
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = beats.length - 1;
    const next = e.key === 'ArrowRight' ? Math.min(active + 1, last)
      : e.key === 'ArrowLeft' ? Math.max(active - 1, 0)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    select(next, true);
  }

  const people = [
    {name: 'You', status: status.you[active]},
    {name: 'Coordinator', status: status.coord[active]},
    {name: 'Codex', model: 'gpt-6.1-sol', status: status.codex[active], worker: true},
    {name: 'Claude Code', model: 'claude-opus-5-5', status: status.claude[active], worker: true},
  ];

  return <section className={styles.flow} id="workflow" aria-labelledby="workflow-title">
    <div className={styles.intro}>
      <h2 id="workflow-title">One conversation, a coordinated team</h2>
      <p>A coordinator hands parts of the job to workers on different models, then brings their results back to you. Step through a real run.</p>
    </div>

    <div className={styles.tabs} role="tablist" aria-label="Steps of the recorded run" onKeyDown={onKeyDown}>
      {beats.map((beat, index) => <button
        key={beat.label}
        ref={el => { tabs.current[index] = el; }}
        type="button"
        role="tab"
        id={`flow-tab-${index}`}
        aria-selected={active === index}
        aria-controls={`flow-panel-${index}`}
        tabIndex={active === index ? 0 : -1}
        onClick={() => select(index)}>
        <span className={styles.tabNum}>{index + 1}</span>{beat.label}
      </button>)}
    </div>

    <div ref={story} className={styles.story}>
      <div className={styles.panels}>
        {beats.map((beat, index) => <article
          key={beat.title}
          id={`flow-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`flow-tab-${index}`}
          className={styles.beat}
          hidden={active !== index}>
          <h3>{beat.title}</h3>
          <p>{beat.body}</p>
          <figure className={clsx(styles.shot, beat.back && styles.pair)}>
            <Frame shot={beat.shot} />
            {beat.back && <Frame shot={beat.back} />}
            <figcaption>{beat.caption}</figcaption>
          </figure>
        </article>)}
      </div>

      <aside className={styles.state} aria-label={`Run state after step ${active + 1}, ${beats[active].label}`}>
        <p className={styles.stateTitle}>Run state after step {active + 1}</p>
        <ul className={clsx('wv-evidence', styles.people)}>
          {people.map(p => <li key={p.name}>
            <span className="wv-evidence__name">{p.name}{p.model && <> <code className={styles.model}>{p.model}</code></>}</span>
            {p.worker ? <span className={clsx('wv-chip', workerChip[active])}>{workerState[active]}</span> : <span />}
            <span className="wv-evidence__detail">{p.status}</span>
          </li>)}
        </ul>
        <p className={styles.stateTitle}>Messages</p>
        <ol className={styles.log}>
          {log.filter(line => line.phase <= active).map((line, i) => <li key={i} data-current={line.phase === active}>
            <b>{line.from}{line.to && <> to {line.to}</>}</b>
            <span>{line.text}</span>
          </li>)}
        </ol>
      </aside>
    </div>

    <p className={styles.caption}>The run state summarizes the recorded run; screenshots are actual app captures. Your providers, models and permissions determine what runs.</p>
  </section>;
}
