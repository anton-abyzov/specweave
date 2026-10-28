import React from 'react';
import clsx from 'clsx';
import s from './Crop.module.css';

/**
 * A readable region of a real screenshot, cut with CSS only (no new image files).
 * The frame takes the region's aspect ratio; the full image is scaled and shifted inside it.
 * `dark` swaps in the dark capture of the same moment when the site theme is dark.
 */
export type CropSpec = {
  src: string;
  dark?: string;
  /** Natural size of the source image, in pixels. */
  w: number;
  h: number;
  /** The region to show, in source pixels. */
  x: number;
  y: number;
  cw: number;
  ch: number;
  alt: string;
};

export default function Crop({ spec, eager = false, className }: { spec: CropSpec; eager?: boolean; className?: string }) {
  const { src, dark, w, h, x, y, cw, ch, alt } = spec;
  const style = {
    '--crop-w': `${(w / cw) * 100}%`,
    '--crop-x': `${(-x / cw) * 100}%`,
    '--crop-y': `${(-y / ch) * 100}%`,
    aspectRatio: `${cw} / ${ch}`,
  } as React.CSSProperties;
  const load = eager ? { fetchPriority: 'high' as const, decoding: 'async' as const } : { loading: 'lazy' as const, decoding: 'async' as const };
  return <span className={clsx(s.crop, className)} style={style}>
    <img className={dark ? s.light : undefined} src={src} width={w} height={h} alt={alt} {...load} />
    {dark && <img className={s.dark} src={dark} width={w} height={h} alt={alt} loading="lazy" decoding="async" />}
  </span>;
}

/** The current app window (SpecWithCode 1.0.103, 27 October 2026), light and dark taken a second apart. */
export const WINDOW = {
  src: '/img/studio/code-window-20261027-light.webp',
  dark: '/img/studio/code-window-20261027-dark.webp',
  w: 2400,
  h: 1500,
};
