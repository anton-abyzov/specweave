import React, {useEffect, useRef, useState} from 'react';
import m from './Motion.module.css';

/*
  Scroll and motion helpers for the marketing pages (pricing, product, jev,
  integrations, tutorials). No dependencies. Every helper renders its final,
  complete state on the server, with reduced motion and without JavaScript;
  motion is only layered on top in the browser.
*/

export {m as motion};

function prefersReducedMotion(): boolean {
  return typeof window === 'undefined'
    || !window.matchMedia
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A real figure that counts up the first time it scrolls into view.
 * The server output, screen readers and reduced motion get the final value.
 */
export function CountUp({value, decimals = 0, prefix = '', suffix = '', durationMs = 1400}: {
  value: number; decimals?: number; prefix?: string; suffix?: string; durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = `${prefix}${value.toFixed(decimals)}${suffix}`;
  const [shown, setShown] = useState(final);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !('IntersectionObserver' in window)) return undefined;
    // Only animate figures that start below the fold, so nothing visible flickers.
    if (el.getBoundingClientRect().top < window.innerHeight) return undefined;
    let raf = 0;
    setShown(`${prefix}${(0).toFixed(decimals)}${suffix}`);
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(`${prefix}${(value * eased).toFixed(decimals)}${suffix}`);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, {threshold: 0.6});
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); setShown(final); };
  }, [value, decimals, prefix, suffix, durationMs, final]);

  return <span ref={ref} className={m.count}>
    <span className={m.srOnly}>{final}</span>
    <span aria-hidden="true">{shown}</span>
  </span>;
}

/**
 * Which beat of a pinned sequence is nearest the middle of the viewport.
 * Returns null until the sequence is on screen (callers then show every beat as done).
 */
export function useActiveBeat(count: number): [React.MutableRefObject<Array<HTMLElement | null>>, number | null] {
  const refs = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return undefined;
    const visible = new Set<number>();
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const i = refs.current.indexOf(e.target as HTMLElement);
        if (i < 0) continue;
        if (e.isIntersecting) visible.add(i); else visible.delete(i);
      }
      setActive(visible.size ? Math.max(...visible) : null);
    }, {rootMargin: '-42% 0px -42% 0px'});
    refs.current.slice(0, count).forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);
  return [refs, active];
}

/**
 * Pointer-follow glow for a grid of cards: sets --mx/--my on the hovered
 * [data-glow] child. Decorative only; carries no meaning.
 */
export function useGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return undefined;
    const move = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-glow]');
      if (!card || !host.contains(card)) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${ev.clientX - r.left}px`);
      card.style.setProperty('--my', `${ev.clientY - r.top}px`);
    };
    host.addEventListener('pointermove', move);
    return () => host.removeEventListener('pointermove', move);
  }, []);
  return ref;
}

/** A real app capture, cropped with CSS and labelled as a capture with its version and date. */
export function Capture({src, srcDark, alt, width, height, label, focus = '50% 0%', ratio, zoom = 1, eager = false, className}: {
  src: string; srcDark?: string; alt: string; width: number; height: number; label: string;
  /** object-position, and the origin a zoom crops toward. */
  focus?: string; ratio?: string; zoom?: number; eager?: boolean; className?: string;
}) {
  const imgProps = {
    alt, width, height,
    loading: eager ? 'eager' as const : 'lazy' as const,
    decoding: 'async' as const,
    style: zoom === 1 ? {objectPosition: focus} : {objectPosition: focus, transform: `scale(${zoom})`, transformOrigin: focus},
    ...(eager ? {fetchPriority: 'high' as const} : {}),
  };
  return <figure className={`${m.capture} ${className ?? ''}`}>
    <div className={m.captureFrame} style={ratio ? {aspectRatio: ratio} : undefined}>
      <img src={src} className={srcDark ? m.onlyLight : undefined} {...imgProps} />
      {srcDark && <img src={srcDark} className={m.onlyDark} {...imgProps} alt="" aria-hidden="true" />}
    </div>
    <figcaption className={m.captureLabel}><span className={m.realDot} aria-hidden="true" />{label}</figcaption>
  </figure>;
}

const CHROME_EXTENSION = 'https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb';

/** The SpecWithCode Browser extension, offered near the top of the marketing pages. */
export function ExtensionStrip({className}: {className?: string}) {
  return <aside className={`${m.extension} ${className ?? ''}`} aria-label="SpecWithCode Browser for Chrome">
    <span className={m.extensionIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M12 8.5h8.2M8.97 13.75 4.9 6.7M15.03 13.75l-4.1 7.1" /></svg>
    </span>
    <p className={m.extensionText}>
      <strong>New: SpecWithCode Browser for Chrome.</strong>{' '}
      Let Claude Code, Codex, GitHub Copilot, Grok or any agent in SpecWithCode open, read, click and screenshot pages in your own Chrome, inside a tab group you can close.
    </p>
    <a className={`wv-btn wv-btn--secondary ${m.extensionCta}`} href={CHROME_EXTENSION} target="_blank" rel="noopener noreferrer">
      Add to Chrome<span className={m.srOnly}> (opens the Chrome Web Store)</span>
    </a>
  </aside>;
}

/** Provider marks on their own plates; white marks sit on the dark #241523 plate. */
const PROVIDERS: Array<{name: string; src: string; dark?: boolean}> = [
  {name: 'Claude Code', src: '/img/studio/providers/claude.svg'},
  {name: 'Codex', src: '/img/studio/providers/openai.svg', dark: true},
  {name: 'Cursor', src: '/img/studio/providers/cursor.svg', dark: true},
  {name: 'OpenCode', src: '/img/studio/providers/opencode.svg', dark: true},
];

/** Lettered plates for tools without a mark in static/img/studio/providers. */
const ABBR: Record<string, string> = {'Grok': 'Gk', 'GitHub Copilot': 'Co', 'Gemini CLI': 'Ge'};

export function ProviderMark({name, size = 28}: {name: string; size?: number}) {
  const p = PROVIDERS.find(x => x.name === name);
  if (!p) {
    return <span className={m.plate} style={{width: size, height: size}} aria-hidden="true">
      <span className={m.plateLetter}>{ABBR[name] ?? name.slice(0, 2)}</span>
    </span>;
  }
  return <span className={`${m.plate} ${p.dark ? m.plateDark : ''}`} style={{width: size, height: size}} aria-hidden="true">
    <img src={p.src} alt="" width={size - 10} height={size - 10} loading="lazy" />
  </span>;
}
