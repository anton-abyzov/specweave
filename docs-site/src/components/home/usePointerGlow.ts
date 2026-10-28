import { useEffect, type RefObject } from 'react';

/**
 * Pointer-follow light for cards: sets --mx/--my (pixels) and --tilt-x/--tilt-y (degrees) on the
 * nearest [data-glow] element under the pointer. Decoration only: nothing reads these for meaning.
 * Off for coarse pointers and reduced motion.
 */
export default function usePointerGlow(ref: RefObject<HTMLElement | null>, maxTilt = 0) {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof window === 'undefined') return;
    const ok = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!ok.matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-glow]');
      if (!el || !root.contains(el)) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      if (maxTilt) {
        el.style.setProperty('--tilt-x', `${((y / r.height) - 0.5) * -maxTilt}deg`);
        el.style.setProperty('--tilt-y', `${((x / r.width) - 0.5) * maxTilt}deg`);
      }
    };
    const move = (e: PointerEvent) => { last = e; if (!frame) frame = requestAnimationFrame(apply); };
    const leave = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-glow]');
      if (el && maxTilt) { el.style.setProperty('--tilt-x', '0deg'); el.style.setProperty('--tilt-y', '0deg'); }
    };
    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerout', leave, { passive: true });
    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerout', leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, maxTilt]);
}
