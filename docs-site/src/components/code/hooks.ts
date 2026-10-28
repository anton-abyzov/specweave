import type React from 'react';

/*
  Small motion helpers for /code. Motion only replays content that is already complete
  in the server render, so no-JS, print and screenshots show the finished state.
*/

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Pointer-follow glow: sets --mx/--my on the card. Decorative only. */
export function glowHandlers() {
  return {
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
  };
}
