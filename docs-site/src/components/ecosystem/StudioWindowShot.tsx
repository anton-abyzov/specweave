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

export default function StudioWindowShot({ eager = false, className, imgClassName }: { eager?: boolean; className?: string; imgClassName?: string }) {
  const w = STUDIO_WINDOW;
  const load = eager ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const, decoding: 'async' as const };
  return <span className={clsx(s.shot, className)}>
    <img className={clsx(s.light, imgClassName)} src={w.light} width={w.width} height={w.height} alt={w.alt} {...load} />
    <img className={clsx(s.dark, imgClassName)} src={w.dark} width={w.width} height={w.height} alt={w.alt} {...load} />
  </span>;
}

/** "View full size" link to the capture matching the current theme. */
export function StudioWindowFullSize({ className }: { className?: string }) {
  return <>
    <a className={clsx(s.light, className)} href={STUDIO_WINDOW.light}>View full size</a>
    <a className={clsx(s.dark, className)} href={STUDIO_WINDOW.dark}>View full size</a>
  </>;
}
