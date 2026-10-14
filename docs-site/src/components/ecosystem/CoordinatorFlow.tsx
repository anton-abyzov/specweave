import React, {useEffect, useRef, useState} from 'react';
import styles from './CoordinatorFlow.module.css';

type Edge = 'goal' | 'codex' | 'claude';

// Every line of copy below is taken from the recorded tip-calculator run
// (docs-site/static/video/studio-tutorial.mp4, 10 October 2026).
const beats = [
  {
    label: 'Goal shared',
    title: 'Give the project one goal.',
    body: 'Describe the outcome once. The coordinator keeps the request, context and decisions in one conversation, and you choose the model, effort and approval mode.',
    shot: {src: '/img/studio/native-controls-20261008.png', w: 740, h: 151, alt: 'Actual SpecWithCode composer with model, effort and Supervised approval controls'},
    caption: 'Composer with model, effort and approval controls. Recorded app, 8 October 2026.',
  },
  {
    label: 'Work assigned',
    title: 'The coordinator splits the work.',
    body: 'It starts a worker thread for each part. Here Codex writes tip.py while Claude Code adds the usage guide. Each thread keeps its own provider, model and permissions on the machine you chose.',
    shot: {src: '/img/studio/flow-coord-threads.webp', w: 822, h: 588, alt: 'Actual Threads rail showing two working threads: Add README usage section on claude-haiku-5-5 and Write tip.py calculator on gpt-6-luna'},
    caption: 'Threads rail with two workers running. Recorded app, 10 October 2026.',
  },
  {
    label: 'Working in parallel',
    title: 'Workers run side by side.',
    body: 'Each worker receives the coordinator’s brief in its own thread. Open any thread to see the commands it ran, the files it changed and the output it got.',
    shot: {src: '/img/studio/flow-worker-codex.webp', w: 652, h: 580, alt: 'Actual Codex worker thread: created tip.py, ran python tip.py 50 18 which printed Tip $9.00 and Total $59.00'},
    back: {src: '/img/studio/flow-worker-claude.webp', w: 652, h: 580, alt: 'Actual Claude Code worker thread showing the message it received from the coordinator'},
    caption: 'Codex and Claude Code worker threads. Recorded app, 10 October 2026.',
  },
  {
    label: 'Results returned',
    title: 'Results come back to one conversation.',
    body: 'Workers report to the coordinator, which checks each result against the goal and tells you what is left. Review the evidence before you accept anything: a reported result still needs verification.',
    shot: {src: '/img/studio/coordinator-capture.webp', w: 1047, h: 587, alt: 'Actual coordinator conversation summarising the finished tip.py and README work, with nothing committed'},
    caption: 'Coordinator summary after both workers reported. Recorded app, 10 October 2026.',
  },
];

const status = {
  you: ['Build a tip calculator', 'Goal sent', 'Following along', 'Review the result'],
  coord: ['Reading the goal', 'Starting 2 threads', 'Watching 2 workers', 'Both tasks finished'],
  codex: ['Idle', 'Write tip.py calculator', 'Ran 2 commands, changed 1 file', 'Tip: $9.00 · Total: $59.00'],
  claude: ['Idle', 'Add README usage section', 'Message received from coordinator', 'Usage section reported back'],
};

const log: {phase: number; from: string; to?: string; text: string}[] = [
  {phase: 0, from: 'You', to: 'Coordinator', text: 'Build a tip calculator CLI with a usage guide.'},
  {phase: 1, from: 'Coordinator', to: 'Codex', text: 'Write tip.py at the repo root.'},
  {phase: 1, from: 'Coordinator', to: 'Claude Code', text: 'Add a Usage section to README.md.'},
  {phase: 2, from: 'Codex', text: 'Created tip.py · python tip.py 50 18'},
  {phase: 2, from: 'Claude Code', text: 'Editing README.md, keeping existing content.'},
  {phase: 3, from: 'Codex', to: 'Coordinator', text: 'Tip: $9.00 · Total: $59.00. Edge inputs checked.'},
  {phase: 3, from: 'Claude Code', to: 'Coordinator', text: 'README usage section reported back.'},
  {phase: 3, from: 'Coordinator', to: 'You', text: 'Both tasks are finished, and nothing is committed.'},
];

// Which edges carry messages in each phase, and in which direction.
const traffic: Record<number, {edge: Edge; reverse?: boolean}[]> = {
  0: [{edge: 'goal'}],
  1: [{edge: 'codex'}, {edge: 'claude'}],
  2: [],
  3: [{edge: 'codex', reverse: true}, {edge: 'claude', reverse: true}, {edge: 'goal', reverse: true}],
};

const layouts = {
  wide: {
    vb: [640, 340],
    goal: 'M118 170 H178',
    codex: 'M342 158 C 392 158, 392 78, 432 78',
    claude: 'M342 182 C 392 182, 392 262, 432 262',
  },
  narrow: {
    vb: [340, 350],
    goal: 'M170 52 V92',
    codex: 'M138 152 C 138 196, 88 192, 88 226',
    claude: 'M202 152 C 202 196, 252 192, 252 226',
  },
};

function edgeState(edge: Edge, phase: number) {
  const live = traffic[phase].some(t => t.edge === edge);
  const done = edge === 'goal' ? phase >= 1 : phase >= 2;
  return live ? 'live' : done ? 'done' : 'idle';
}

function Network({layout, phase}: {layout: 'wide' | 'narrow'; phase: number}) {
  const l = layouts[layout];
  return <svg className={styles[layout]} data-layout={layout} viewBox={`0 0 ${l.vb[0]} ${l.vb[1]}`} preserveAspectRatio="none" aria-hidden="true">
    {(['goal', 'codex', 'claude'] as Edge[]).map(edge => <g key={edge} data-state={edgeState(edge, phase)} className={styles.edge}>
      <path d={l[edge]} className={styles.edgeBase} vectorEffect="non-scaling-stroke" />
      <path d={l[edge]} data-edge={edge} className={styles.edgeFlow} vectorEffect="non-scaling-stroke" />
    </g>)}
  </svg>;
}

export default function CoordinatorFlow() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const packets = useRef<(HTMLSpanElement | null)[]>([]);
  const [active, setActive] = useState(3);
  const [hydrated, setHydrated] = useState(false);
  const phaseRef = useRef(3);
  phaseRef.current = active;

  // Scroll drives the phase on wide screens; on narrow screens (no sticky stage)
  // the diagram cycles on its own while visible. Reduced motion keeps the final state.
  useEffect(() => {
    const root = section.current;
    if (!root) return;
    setHydrated(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = window.matchMedia('(min-width: 961px)');
    if (reduce.matches) return;
    setActive(0);
    let frame = 0;
    let timer = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      if (!wide.matches) return;
      const center = window.innerHeight * 0.5;
      let best = -1, bestDistance = Infinity;
      root.querySelectorAll<HTMLElement>('[data-beat]').forEach(el => {
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - center);
        if (d < bestDistance) { bestDistance = d; best = Number(el.dataset.beat); }
      });
      if (best >= 0) setActive(best);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const cycle = () => {
      window.clearInterval(timer);
      if (wide.matches || !visible) return;
      timer = window.setInterval(() => setActive(p => (p + 1) % beats.length), 3200);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; cycle(); }, {threshold: 0.25});
    io.observe(canvas.current!);
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    wide.addEventListener('change', cycle);
    update();
    return () => {
      cancelAnimationFrame(frame); window.clearInterval(timer); io.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      wide.removeEventListener('change', cycle);
    };
  }, []);

  // Message packets travel along the live edges (motion-graphics style), drawn with rAF.
  useEffect(() => {
    if (!hydrated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let running = false;
    const start = performance.now();
    const tick = (now: number) => {
      const box = canvas.current;
      if (!box) return;
      const svg = Array.from(box.querySelectorAll<SVGSVGElement>('svg[data-layout]')).find(s => s.getBoundingClientRect().width > 0);
      const lanes = traffic[phaseRef.current];
      packets.current.forEach((p, i) => {
        if (!p) return;
        const lane = lanes[Math.floor(i / 2)];
        if (!svg || !lane) { p.style.opacity = '0'; return; }
        const path = svg.querySelector<SVGPathElement>(`[data-edge="${lane.edge}"]`);
        if (!path) return;
        const vb = svg.viewBox.baseVal;
        const len = path.getTotalLength();
        let t = (((now - start) / 1500) + (i % 2) * 0.5) % 1;
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const pt = path.getPointAtLength((lane.reverse ? 1 - eased : eased) * len);
        p.style.left = `${(pt.x / vb.width) * 100}%`;
        p.style.top = `${(pt.y / vb.height) * 100}%`;
        p.style.opacity = String(Math.min(1, Math.sin(Math.PI * t) * 1.6));
      });
      raf = running ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas.current!);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); };
  }, [hydrated]);

  function jump(index: number) {
    setActive(index);
    if (window.matchMedia('(min-width: 961px)').matches) {
      section.current?.querySelector(`[data-beat="${index}"]`)?.scrollIntoView({block: 'center'});
    }
  }

  const progress = (n: number) => (active > n ? 'done' : active === n ? 'now' : 'next');

  return <section ref={section} className={styles.flow} data-hydrated={hydrated} id="workflow" aria-labelledby="workflow-title">
    <div className={styles.intro}>
      <p className={styles.kicker}>From one request to reviewed work</p>
      <h2 id="workflow-title">One conversation.<br />A coordinated team.</h2>
      <p>A coordinator hands parts of the job to workers on different models, then brings their results back to you. Scroll to follow a real run.</p>
    </div>
    <div className={styles.story}>
      <div className={styles.sticky}>
        <div className={styles.stage} data-phase={active}>
          <div className={styles.stageTop}>
            <span className={styles.live}><i aria-hidden="true" />Illustration of a recorded run</span>
            <ol className={styles.rail} aria-hidden="true">{beats.map((b, i) => <li key={b.label} data-state={progress(i)} />)}</ol>
          </div>
          <div ref={canvas} className={styles.canvas} role="img" aria-label="Animated workflow: your goal reaches the project coordinator, which assigns tip.py to a Codex worker and the README usage section to a Claude Code worker; both report results back to the coordinator for your review.">
            <Network layout="wide" phase={active} />
            <Network layout="narrow" phase={active} />
            {[0, 1, 2, 3, 4, 5].map(i => <span key={i} ref={el => { packets.current[i] = el; }} className={styles.packet} aria-hidden="true" />)}
            <div className={`${styles.node} ${styles.you}`} data-on={active === 0 || active === 3}>
              <span className={styles.avatar}>You</span>
              <small>{status.you[active]}</small>
            </div>
            <div className={`${styles.node} ${styles.coord}`} data-on="true">
              <span className={styles.mark}>S</span>
              <div><strong>Coordinator</strong><small key={`c${active}`}>{status.coord[active]}</small></div>
              <span className={styles.pulse} aria-hidden="true" />
            </div>
            {(['codex', 'claude'] as const).map(w => <div key={w} className={`${styles.node} ${styles.worker} ${styles[w]}`} data-on={active >= 1}>
              <div className={styles.workerHead}>
                <span className={styles.glyph}>{w === 'codex' ? '◎' : '✳'}</span>
                <strong>{w === 'codex' ? 'Codex' : 'Claude Code'}</strong>
                <em>{w === 'codex' ? 'gpt-6-luna' : 'claude-haiku-5-5'}</em>
              </div>
              <small key={`${w}${active}`}>{status[w][active]}</small>
              <span className={styles.meter} data-phase={active}><i /></span>
              <span className={styles.badge} data-phase={active}>{active >= 3 ? 'Reported ✓' : active === 2 ? 'Working' : active === 1 ? 'Assigned' : 'Idle'}</span>
            </div>)}
          </div>
          <ol className={styles.log} aria-label="Messages in this run">
            {log.map((line, i) => <li key={`${i}-${line.phase === active ? active : 'k'}`} data-shown={line.phase <= active} data-new={line.phase === active} style={{animationDelay: `${(i - log.findIndex(l => l.phase === line.phase)) * 260}ms`}}>
              <b>{line.from}{line.to && <> <span aria-hidden="true">→</span><span className={styles.sr}> to </span> {line.to}</>}</b>
              <span>{line.text}</span>
            </li>)}
          </ol>
        </div>
        <div className={styles.steps} role="group" aria-label="Show a step of the workflow">
          {beats.map((beat, index) => <button key={beat.label} type="button" onClick={() => jump(index)} aria-pressed={active === index}><span>{index + 1}</span>{beat.label}</button>)}
        </div>
      </div>
      <div className={styles.beats}>
        {beats.map((beat, index) => <article key={beat.title} data-beat={index} data-active={active === index} className={styles.beat}>
          <span className={styles.number}>{String(index + 1).padStart(2, '0')} <i>/ {beat.label}</i></span>
          <h3>{beat.title}</h3>
          <p>{beat.body}</p>
          <figure className={styles.shot} data-stack={beat.back ? 'true' : undefined}>
            {beat.back && <img className={styles.shotBack} src={beat.back.src} width={beat.back.w} height={beat.back.h} alt={beat.back.alt} loading="lazy" decoding="async" />}
            <img className={styles.shotFront} src={beat.shot.src} width={beat.shot.w} height={beat.shot.h} alt={beat.shot.alt} loading="lazy" decoding="async" />
            <figcaption>{beat.caption}</figcaption>
          </figure>
        </article>)}
      </div>
    </div>
    <p className={styles.caption}>The animated diagram illustrates the recorded run above; screenshots are actual app captures. Your providers, models and permissions determine what runs.</p>
  </section>;
}
