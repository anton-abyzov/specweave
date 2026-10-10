import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';

const ease = Easing.bezier(0.65, 0, 0.35, 1);

/** Paper background with a slowly drifting dot grid. */
export const Backdrop: React.FC<{dark?: boolean}> = ({dark}) => {
  const frame = useCurrentFrame();
  const dot = dark ? 'rgba(246,244,238,.07)' : 'rgba(32,35,28,.085)';
  return <AbsoluteFill style={{background: dark ? C.ink : C.paper}}>
    <AbsoluteFill style={{
      backgroundImage: `radial-gradient(${dot} 1.4px, transparent 1.6px)`,
      backgroundSize: '34px 34px',
      backgroundPosition: `${-frame * 0.25}px ${-frame * 0.12}px`,
      maskImage: 'radial-gradient(ellipse 80% 70% at 60% 45%, black 30%, transparent 85%)',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 60% 45%, black 30%, transparent 85%)',
    }} />
  </AbsoluteFill>;
};

/** One line that slides up out of a mask. */
export const Reveal: React.FC<{delay?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({delay = 0, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 200, mass: 0.9}});
  return <div style={{overflow: 'hidden', paddingBottom: '0.08em', ...style}}>
    <div style={{transform: `translateY(${(1 - p) * 110}%)`, opacity: interpolate(p, [0, 0.4], [0, 1])}}>{children}</div>
  </div>;
};

export const Eyebrow: React.FC<{children: React.ReactNode; delay?: number; color?: string}> = ({children, delay = 0, color = C.rust}) =>
  <Reveal delay={delay}><div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 19, letterSpacing: '0.16em', textTransform: 'uppercase', color}}>{children}</div></Reveal>;

/** Eyebrow, two-line serif headline (second line italic), and a short body. */
export const Copy: React.FC<{eyebrow: string; line1: string; line2: string; body?: string; delay?: number; width?: number}> = ({eyebrow, line1, line2, body, delay = 6, width = 580}) =>
  <div style={{width}}>
    <Eyebrow delay={delay}>{eyebrow}</Eyebrow>
    <div style={{height: 26}} />
    <Reveal delay={delay + 5}><div style={{fontFamily: FONT.serif, fontSize: 62, lineHeight: 1.06, color: C.ink, letterSpacing: '-0.02em'}}>{line1}</div></Reveal>
    <Reveal delay={delay + 11}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 62, lineHeight: 1.1, color: C.olive, letterSpacing: '-0.02em'}}>{line2}</div></Reveal>
    {body && <><div style={{height: 30}} />
      <Reveal delay={delay + 20}><div style={{fontFamily: FONT.sans, fontSize: 27, lineHeight: 1.55, color: C.muted}}>{body}</div></Reveal></>}
  </div>;

/** A macOS-style window that rises into place and keeps a slow parallax tilt. */
export const Window: React.FC<{w: number; h: number; title?: string; delay?: number; children: React.ReactNode; dark?: boolean; tilt?: number}> = ({w, h, title, delay = 0, children, dark, tilt = 1}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 18, stiffness: 70, mass: 1}});
  const drift = interpolate(frame, [0, durationInFrames], [-3.5, 1.5]) * tilt;
  return <div style={{perspective: 2200}}>
    <div style={{
      width: w, height: h + 42, borderRadius: 16, overflow: 'hidden',
      background: dark ? C.terminal : C.card, border: `1px solid ${dark ? '#34372f' : C.line}`,
      boxShadow: '0 50px 90px -40px rgba(32,35,28,.45), 0 12px 30px -16px rgba(32,35,28,.25)',
      transform: `translateY(${(1 - p) * 90}px) rotateX(${(1 - p) * 14}deg) rotateY(${drift}deg) scale(${0.94 + 0.06 * p})`,
      opacity: interpolate(p, [0, 0.35], [0, 1], {extrapolateRight: 'clamp'}),
      transformOrigin: '50% 100%',
    }}>
      <div style={{height: 42, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', borderBottom: `1px solid ${dark ? '#34372f' : C.line}`, background: dark ? '#262922' : '#f3f2ec'}}>
        {['#e66b5b', '#e6b34a', '#7fae5b'].map((c) => <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.9}} />)}
        {title && <span style={{marginLeft: 14, fontFamily: FONT.sans, fontSize: 16, fontWeight: 500, color: dark ? '#b9bcae' : C.muted}}>{title}</span>}
      </div>
      <div style={{position: 'relative', width: w, height: h, overflow: 'hidden'}}>{children}</div>
    </div>
  </div>;
};

type Rect = [x: number, y: number, w: number];
export type CamKey = {f: number; r: Rect};

const ScaleCtx = createContext(1);

/** Plays a screen recording through a moving camera. Keys are source-pixel rects; height follows the frame's aspect. */
export const Shot: React.FC<{src: string; w: number; h: number; keys: CamKey[]; children?: React.ReactNode; srcW?: number; srcH?: number; opacity?: number; trimBefore?: number; rate?: number}> = ({src, w, h, keys, children, srcW = 1920, srcH = 1080, opacity = 1, trimBefore, rate = 1}) => {
  const frame = useCurrentFrame();
  let r = keys[0].r;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const t = ease((frame - a.f) / Math.max(1, b.f - a.f));
      r = [0, 1, 2].map((k) => a.r[k] + (b.r[k] - a.r[k]) * t) as Rect;
    } else if (frame > b.f) r = b.r;
  }
  const s = w / r[2];
  return <div style={{position: 'absolute', inset: 0, opacity}}>
    <div style={{position: 'absolute', width: srcW, height: srcH, transformOrigin: '0 0', transform: `scale(${s}) translate(${-r[0]}px, ${-r[1]}px)`}}>
      <OffthreadVideo src={staticFile(src)} muted trimBefore={trimBefore} playbackRate={rate} style={{width: srcW, height: srcH, display: 'block'}} />
      <ScaleCtx.Provider value={s}>{children}</ScaleCtx.Provider>
    </div>
  </div>;
};

/** A rounded outline that draws itself around a region of the screenshot. */
export const Highlight: React.FC<{x: number; y: number; w: number; h: number; from: number; to?: number; color?: string}> = ({x, y, w, h, from, to = 9999, color = C.rust}) => {
  const frame = useCurrentFrame();
  const s = useContext(ScaleCtx);
  const sw = 3.2 / s;
  const pad = 8 / s;
  const W = w + pad * 2, H = h + pad * 2, rad = 10 / s;
  const per = 2 * (W + H);
  const draw = interpolate(frame, [from, from + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const fade = interpolate(frame, [to, to + 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (frame < from) return null;
  return <svg style={{position: 'absolute', left: x - pad, top: y - pad, overflow: 'visible', opacity: fade}} width={W} height={H}>
    <rect x={0} y={0} width={W} height={H} rx={rad} fill={color} fillOpacity={0.07 * draw} />
    <rect x={0} y={0} width={W} height={H} rx={rad} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} strokeLinecap="round" />
  </svg>;
};

/** Pointer that glides between points (source pixels) and clicks with a ripple. */
export const Cursor: React.FC<{path: {f: number; x: number; y: number}[]; clickAt?: number}> = ({path, clickAt}) => {
  const frame = useCurrentFrame();
  const s = useContext(ScaleCtx);
  let x = path[0].x, y = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const t = ease((frame - a.f) / Math.max(1, b.f - a.f));
      x = a.x + (b.x - a.x) * t; y = a.y + (b.y - a.y) * t;
    } else if (frame > b.f) { x = b.x; y = b.y; }
  }
  const appear = interpolate(frame, [path[0].f - 8, path[0].f], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const press = clickAt === undefined ? 1 : interpolate(frame, [clickAt - 3, clickAt, clickAt + 5], [1, 0.82, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ripple = clickAt === undefined ? 0 : interpolate(frame, [clickAt, clickAt + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const k = 1 / s;
  return <>
    {clickAt !== undefined && frame >= clickAt && <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0}}>
      <div style={{position: 'absolute', left: -40 * k * ripple, top: -40 * k * ripple, width: 80 * k * ripple, height: 80 * k * ripple, borderRadius: '50%', border: `${3 * k}px solid ${C.olive}`, opacity: 1 - ripple}} />
    </div>}
    <svg style={{position: 'absolute', left: x - 4 * k, top: y - 2 * k, opacity: appear, transform: `scale(${press})`, transformOrigin: '0 0', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.3))'}} width={30 * k} height={40 * k} viewBox="0 0 30 40">
      <path d="M3 2 L3 31 L10.5 24 L15.5 36 L20.5 34 L15.5 22.5 L25.5 22.5 Z" fill="#111" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" />
    </svg>
  </>;
};

/** Small rounded label, e.g. a provider and model. */
export const Chip: React.FC<{children: React.ReactNode; tone?: 'ink' | 'olive' | 'rust' | 'soft'; size?: number; style?: React.CSSProperties}> = ({children, tone = 'ink', size = 22, style}) => {
  const tones = {
    ink: {background: C.ink, color: C.paper, border: C.ink},
    olive: {background: C.olive, color: '#fff', border: C.olive},
    rust: {background: C.rustSoft, color: C.rust, border: '#ebc3b2'},
    soft: {background: C.card, color: C.ink, border: C.line},
  }[tone];
  return <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, padding: `${size * 0.42}px ${size * 0.8}px`, borderRadius: 999, fontFamily: FONT.sans, fontWeight: 500, fontSize: size, background: tones.background, color: tones.color, border: `1.5px solid ${tones.border}`, whiteSpace: 'nowrap', ...style}}>{children}</div>;
};

/** Spring pop used for badges and chips. */
export const Pop: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 140}});
  return <div style={{transform: `scale(${p})`, opacity: Math.min(1, p * 2), ...style}}>{children}</div>;
};

/** Fine print in the corner that marks a scene as real captured UI. */
export const SourceNote: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'absolute', left: 120, bottom: 56, fontFamily: FONT.sans, fontSize: 17, color: C.muted, opacity: interpolate(frame, [20, 40], [0, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{children}</div>;
};
