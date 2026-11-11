import { useEffect, useRef, useState } from 'react';

/**
 * Step clock for a self-running stage. `times` are ms from the start of a loop; the hook returns
 * how many of them have passed. The stage plays only while it is on screen and motion is allowed,
 * then holds on the last step and starts again.
 * The server render, a browser without JavaScript, an off-screen stage and reduced motion all get
 * the last step, so the resting picture is always the complete one.
 */
export function useSteps<T extends HTMLElement>(times: readonly number[], hold = 3200): { ref: React.RefObject<T | null>; step: number; live: boolean } {
  const ref = useRef<T>(null);
  const total = times.length;
  const [step, setStep] = useState(total);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || typeof window.matchMedia !== 'function') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timers: number[] = [];
    let visible = false;
    const stop = () => { timers.forEach((t) => window.clearTimeout(t)); timers = []; };
    const play = () => {
      stop();
      setStep(0);
      times.forEach((at, i) => timers.push(window.setTimeout(() => setStep(i + 1), at)));
      timers.push(window.setTimeout(play, times[total - 1] + hold));
    };
    const rest = () => { stop(); setLive(false); setStep(total); };
    const sync = () => {
      if (visible && !reduced.matches && !document.hidden) { setLive(true); play(); }
      else rest();
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.3 });
    io.observe(el);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    // Paper gets the complete picture, not the step the loop happened to be on.
    window.addEventListener('beforeprint', rest);
    window.addEventListener('afterprint', sync);
    return () => {
      io.disconnect();
      reduced.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('beforeprint', rest);
      window.removeEventListener('afterprint', sync);
      stop();
    };
    // `times` is a module constant for every stage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, step, live };
}
