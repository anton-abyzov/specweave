import { useEffect, useRef, useState, type RefObject } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Writes scroll and pointer offsets to CSS variables on the element so each
 * layer can move at its own depth: --sy (px scrolled past the element top),
 * --mx and --my (pointer position, -1 to 1). Skipped for reduced motion.
 */
export function useParallax<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = el.getBoundingClientRect().top;
      el.style.setProperty('--sy', String(Math.max(0, -top)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointermove', onPointer);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointermove', onPointer);
    };
  }, []);
  return ref;
}

/**
 * Tracks which step of a pinned scroll story is in the middle of the viewport,
 * and writes the section's overall progress (0 to 1) to --progress.
 */
export function useScrollSteps<T extends HTMLElement>(count: number): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const steps = Array.from(el.querySelectorAll<HTMLElement>('[data-step]'));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((step) => observer.observe(step));

    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      el.style.setProperty('--progress', Math.min(1, Math.max(0, -r.top / span)).toFixed(4));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [count]);
  return [ref, active];
}
