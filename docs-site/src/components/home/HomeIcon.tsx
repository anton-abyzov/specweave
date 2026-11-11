import React from 'react';
import clsx from 'clsx';
import s from './HomeIcon.module.css';

/** The generated icon set of the home page; files live in static/img/home/icons/<name>.webp (192 px). */
export const HOME_ICONS = ['plan', 'ledger', 'handoff', 'verify', 'review', 'folder', 'terminal', 'skill', 'chart', 'machines', 'play', 'tag', 'blocks', 'braid', 'limit'] as const;
export type HomeIconName = typeof HOME_ICONS[number];

/** Decorative: the heading beside it names the thing. */
export default function HomeIcon({ name, size = 48, className }: { name: HomeIconName; size?: number; className?: string }) {
  return <img className={clsx(s.icon, className)} src={`/img/home/icons/${name}.webp`} alt="" width={size} height={size} loading="lazy" decoding="async" />;
}
