import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './Benefits.module.css';

/*
  Shared pieces of the /code benefit diagrams: the step clock, provider marks, brand marks and
  the small controls the drawings reuse. Every diagram is an illustration of a real surface in
  the app, drawn with Weave tokens so it follows light and dark.
*/

/**
 * Steps a diagram through `count` states while it is on screen. The server render, reduced motion
 * and browsers without IntersectionObserver rest on `rest`, which is each diagram's complete state.
 */
export function useStep<T extends Element>(count: number, rest: number, ms = 2600): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [step, setStep] = useState(rest);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { if (timer) clearInterval(timer); timer = undefined; };
    const io = new IntersectionObserver(([e]) => {
      stop();
      if (!e.isIntersecting) return;
      setStep(0);
      timer = setInterval(() => setStep(s => (s + 1) % count), ms);
    }, {threshold: 0.35});
    io.observe(el);
    return () => { stop(); io.disconnect(); };
  }, [count, ms]);
  return [ref, step];
}

/** White marks sit on a plate that stays dark in both themes; OpenCode's dark mark on a light one. */
const DARK = new Set(['openai', 'copilot', 'cursor']);
const LIGHT = new Set(['opencode']);

export function Logo({name, size = 20, className}: {name: string; size?: number; className?: string}) {
  const base = useBaseUrl('/img/studio/providers/');
  return <img
    className={clsx(styles.logo, DARK.has(name) && styles.logoDark, LIGHT.has(name) && styles.logoLight, className)}
    src={`${base}${name}.svg?v=2`} alt="" width={size} height={size} loading="lazy" decoding="async" />;
}

/* Brand marks from Simple Icons (CC0), each in its brand colour. */
const BRANDS = {
  gmail: {color: '#EA4335', d: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z'},
  calendar: {color: '#4285F4', d: 'M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z'},
  drive: {color: '#4285F4', d: 'M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z'},
  telegram: {color: '#26A5E4', d: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'},
} as const;
export type BrandName = keyof typeof BRANDS;

export function Brand({name, size = 16}: {name: BrandName; size?: number}) {
  const b = BRANDS[name];
  return <svg className={styles.brand} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path fill={b.color} d={b.d} /></svg>;
}

/** A drawn switch: state only, nothing to click. */
export function Toggle({on}: {on: boolean}) {
  return <span className={clsx(styles.toggle, on && styles.toggleOn)} aria-hidden="true"><i /></span>;
}

/** The frame every diagram sits in. */
export const Stage = React.forwardRef<HTMLDivElement, {label: string; className?: string; children: React.ReactNode}>(
  function Stage({label, className, children}, ref) {
    return <div ref={ref} className={clsx(styles.stage, className)} role="img" aria-label={label}>
      <div className={styles.stageInner} aria-hidden="true">{children}</div>
    </div>;
  },
);
