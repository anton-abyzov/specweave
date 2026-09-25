import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { art, beats, mapping, stats } from './content';
import { useParallax, useScrollSteps } from './useLayerMotion';
import styles from './landing.module.css';

type Depth = React.CSSProperties & { '--d': number };
const depth = (d: number): Depth => ({ '--d': d });

/** Hero art in four planes: photo, ribbon, file card, terminal card. */
export function LayeredHeroArt() {
  const ref = useParallax<HTMLDivElement>();
  return <div ref={ref} className={styles.heroStage} aria-hidden="true">
    <div className={styles.plane} style={depth(0.08)}>
      <img className={styles.heroPhoto} src={art.hero} alt="" width="2000" height="1123" fetchPriority="high" />
    </div>
    <div className={clsx(styles.plane, styles.floatA)} style={depth(0.3)}>
      <div className={styles.chip}><span className={styles.chipDot} />spec.md<b>2 of 3 tasks done</b></div>
    </div>
    <div className={clsx(styles.plane, styles.floatB)} style={depth(0.6)}>
      <div className={styles.chip}><span className={styles.chipDot} data-tone="ok" />handoff pushed<b>wip/0042-checkout</b></div>
    </div>
    <div className={clsx(styles.plane, styles.floatC)} style={depth(0.9)}>
      <div className={clsx(styles.chip, styles.chipDark)}>$ specweave pickup</div>
    </div>
  </div>;
}

/** Pinned sequence: the text scrolls, the stage on the right swaps beats. */
export function ScrollStory() {
  const [ref, active] = useScrollSteps<HTMLElement>(beats.length);
  const introRef = useParallax<HTMLDivElement>();
  return <section ref={ref} className={styles.story} id="how" aria-labelledby="how-title">
    <div ref={introRef} className={styles.storyIntro}>
      {art.ribbon && <img className={styles.introRibbon} src={art.ribbon} alt="" width="1600" height="900" loading="lazy" aria-hidden="true" />}
      <span className={styles.eyebrow}>01 / How it works</span>
      <h2 id="how-title">The work lives in your repo.<br /><em>Tools come and go.</em></h2>
    </div>
    <div className={styles.storyGrid}>
      <ol className={styles.storySteps}>
        {beats.map((beat, i) => <li key={beat.id} data-step={i} className={clsx(styles.storyStep, i === active && styles.storyStepActive)}>
          <span className={styles.stepLabel}>{String(i + 1).padStart(2, '0')} · {beat.label}</span>
          <h3>{beat.title}</h3>
          <p>{beat.body}</p>
          <div className={styles.inlinePanel}><StagePanel index={i} /></div>
        </li>)}
      </ol>
      <div className={styles.stageColumn} aria-hidden="true">
        <div className={styles.stage}>
          {beats.map((beat, i) => <div key={beat.id} className={clsx(styles.stageBeat, i === active && styles.stageBeatActive)}>
            <StagePanel index={i} />
          </div>)}
          <div className={styles.stageProgress}><span /></div>
          <div className={styles.stageDots}>{beats.map((b, i) => <i key={b.id} data-on={i <= active} />)}</div>
        </div>
      </div>
    </div>
  </section>;
}

function StagePanel({ index }: { index: number }) {
  const beat = beats[index];
  const photo = art.beats[index];
  return <div className={styles.panelWrap}>
    <div className={styles.panelArt} data-beat={beat.id}>{photo && <img src={photo} alt="" loading="lazy" />}</div>
    <div className={styles.panelWindow}>
      <div className={styles.panelBar}><i /><i /><i /><span>{beat.file}</span></div>
      {beat.panel}
    </div>
  </div>;
}

/** Claude Code Projects concepts on the left, where SpecWeave keeps each one on the right. */
export function ThreadMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setShown(false);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); observer.disconnect(); }
    }, { rootMargin: '0px 0px -20% 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={clsx(styles.map, shown && styles.mapShown)}>
    <div className={styles.mapHead}><span>In a Claude Code Project</span><span>In SpecWeave 3.0</span></div>
    {mapping.map(([left, right], i) => <div className={styles.mapRow} key={left} style={{ transitionDelay: `${i * 90}ms` }}>
      <span>{left}</span>
      <svg viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 C 40 0, 80 12, 120 6" /></svg>
      <strong>{right}</strong>
    </div>)}
  </div>;
}

function Counter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || value < 10 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setShown(0);
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { rootMargin: '0px 0px -25% 0px' });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref}>{prefix}{shown.toLocaleString('en-US')}</span>;
}

export function LeanStats() {
  return <div className={styles.stats}>
    {stats.map((s) => <div className={styles.stat} key={s.label}>
      <div className={styles.statValue}><Counter value={s.value} prefix={s.prefix} /><small>{s.unit}</small></div>
      <strong>{s.label}</strong>
      <span>{s.was}</span>
    </div>)}
  </div>;
}
