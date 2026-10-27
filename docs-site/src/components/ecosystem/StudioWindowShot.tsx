import React from 'react';
import clsx from 'clsx';
import s from './StudioWindowShot.module.css';

/**
 * The whole SpecWithCode window from a real run (SpecWithCode 1.0.103, 27 October 2026):
 * project sidebar, coordinator chat and the Threads pane with two workers running.
 * Light and dark captures were taken a second apart and follow the site theme.
 * Provenance: static/img/studio/coordinator-capture-source.md.
 */
export const STUDIO_WINDOW = {
  light: '/img/studio/code-window-20261027-light.webp',
  dark: '/img/studio/code-window-20261027-dark.webp',
  width: 2400,
  height: 1500,
  alt: 'The whole SpecWithCode window: the trip-budget project in the sidebar, the Claude Code coordinator reporting that both changes are done and all 23 tests pass, and the Threads pane with a Claude Code worker and a Codex worker running and seven finished threads',
  caption: 'A Claude Code coordinator reports back while a Claude Code worker and a Codex worker run in the Threads pane. SpecWithCode 1.0.103, 27 October 2026.',
};

export default function StudioWindowShot({ eager = false, linked = false, className }: { eager?: boolean; linked?: boolean; className?: string }) {
  const w = STUDIO_WINDOW;
  const lazy = { loading: 'lazy' as const, decoding: 'async' as const };
  // Light is the default theme, so only it gets high priority; the hidden variant stays lazy.
  const variants = [
    { cls: s.light, src: w.light, load: eager ? { fetchPriority: 'high' as const } : lazy },
    { cls: s.dark, src: w.dark, load: lazy },
  ];
  return <span className={clsx(s.shot, className)}>
    {variants.map(({ cls, src, load }) => {
      const img = <img className={linked ? undefined : cls} src={src} width={w.width} height={w.height} alt={w.alt} {...load} />;
      return linked ? <a key={src} className={cls} href={src} aria-label="Open the full-size screenshot">{img}</a> : <React.Fragment key={src}>{img}</React.Fragment>;
    })}
  </span>;
}

/** "View full size" link to the capture matching the current theme. */
export function StudioWindowFullSize({ className }: { className?: string }) {
  return <>
    <a className={clsx(s.light, className)} href={STUDIO_WINDOW.light}>View full size</a>
    <a className={clsx(s.dark, className)} href={STUDIO_WINDOW.dark}>View full size</a>
  </>;
}
