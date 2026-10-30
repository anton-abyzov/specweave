import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';
import {Pause, Play, Volume2, VolumeX} from 'lucide-react';
import {prefersReducedMotion} from './hooks';
import {mediaUrl} from '@site/src/lib/media';
import styles from './HeroStage.module.css';

/*
  /code hero media in three planes: an iris light field (back), the app window (mid)
  and callouts quoting the capture (front). Scroll moves the planes at different rates.

  The window shows the promo video from R2 at /video/promo/ (see src/lib/media.ts).
  The server render shows the real app capture of 27 October 2026, so no-JS and screenshots are complete;
  the browser swaps in the video and returns to the capture if the video fails to load.
*/

const PROMO = {
  video: mediaUrl('/video/promo/specwithcode-promo.mp4'),
  poster: '/video/promo/specwithcode-promo-poster.jpg',
  captions: '/video/promo/specwithcode-promo.vtt',
};

/** Render the video once the page is hydrated; fall back to the capture only if the browser cannot load it. */
function usePromo(): [boolean, () => void] {
  const [state, setState] = useState<'pending' | 'video' | 'failed'>('pending');
  useEffect(() => setState(s => (s === 'pending' ? 'video' : s)), []);
  return [state === 'video', () => setState('failed')];
}

function PromoVideo({src, poster, captions, onFail}: {src: string; poster: string; captions: string; onFail: () => void}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  // Starts false: iOS refuses autoplay in Low Power Mode, so only a real 'playing' event shows Pause.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (prefersReducedMotion()) {
      v.pause();
      setPlaying(false);
      return;
    }
    // Play only while the hero is on screen.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !v.dataset.userPaused) v.play().catch(() => setPlaying(false));
      else v.pause();
    }, {threshold: 0.25});
    io.observe(v);
    return () => io.disconnect();
  }, []);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      delete v.dataset.userPaused;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.dataset.userPaused = '1';
      v.pause();
      setPlaying(false);
    }
  }

  function sound() {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) v.play().then(() => setPlaying(true)).catch(() => undefined);
  }

  return <div className={styles.video}>
    <video ref={ref} muted playsInline loop autoPlay preload="metadata" poster={poster} aria-label="SpecWithCode promo video" onClick={toggle} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}>
      <source src={src} type="video/mp4" onError={onFail} />
      {captions && <track kind="captions" src={captions} srcLang="en" label="English" />}
    </video>
    {!playing && <button type="button" className={styles.bigPlay} onClick={toggle} aria-label="Play the promo video">
      <Play size={28} strokeWidth={1.75} aria-hidden="true" />
    </button>}
    <div className={styles.videoControls}>
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause the promo video' : 'Play the promo video'}>
        {playing ? <Pause size={16} strokeWidth={1.75} aria-hidden="true" /> : <Play size={16} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button type="button" onClick={sound} aria-pressed={!muted}>
        {muted ? <VolumeX size={16} strokeWidth={1.75} aria-hidden="true" /> : <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />}
        <span>{muted ? 'Sound on' : 'Mute'}</span>
      </button>
    </div>
  </div>;
}

export default function HeroStage() {
  const video = useBaseUrl(PROMO.video);
  const poster = useBaseUrl(PROMO.poster);
  const captions = useBaseUrl(PROMO.captions);
  const light = useBaseUrl('/img/studio/code-window-20261027-light.webp');
  const dark = useBaseUrl('/img/studio/code-window-20261027-dark.webp');
  const claude = useBaseUrl('/img/studio/providers/claude.svg');
  const openai = useBaseUrl('/img/studio/providers/openai.svg');
  const [showVideo, failVideo] = usePromo();
  const stage = useRef<HTMLDivElement>(null);

  // Decorative pointer parallax on the front plane; carries no meaning.
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = stage.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }

  return <div ref={stage} className={styles.stage} onPointerMove={onPointerMove} onPointerLeave={() => { stage.current?.style.setProperty('--px', '0'); stage.current?.style.setProperty('--py', '0'); }}>
    <div className={styles.back} aria-hidden="true"><span className={styles.orb} /><span className={styles.grid} /></div>

    <figure className={clsx('wv-window', styles.window)}>
      <div className="wv-window__bar">
        <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>
        <span>{showVideo ? 'SpecWithCode promo' : 'Real app capture'}</span>
        <span>{showVideo ? 'Video' : 'SpecWithCode, 27 Oct 2026'}</span>
      </div>
      {showVideo
        ? <PromoVideo src={video} poster={poster} captions={captions} onFail={failVideo} />
        : <div className={styles.crop}>
          <ThemedImage
            className={styles.shot}
            sources={{light, dark}}
            width={2400}
            height={1500}
            fetchPriority="high"
            decoding="async"
            alt="Actual SpecWithCode window: the trip-budget coordinator reports both changes done with all 23 tests passing, lists the evidence, and links the three worker threads"
          />
        </div>}
    </figure>

    {!showVideo && <div className={styles.front} aria-hidden="true">
      <span className={clsx(styles.callout, styles.c1)}><i className={styles.live} />3 worker threads linked in the reply</span>
      <span className={clsx(styles.callout, styles.c2)}><i className={styles.ok} />tests · 23 passed in 0.09s</span>
      <span className={clsx(styles.callout, styles.c3)}>
        <img src={claude} alt="" width="18" height="18" />Claude Code
        <img src={openai} alt="" width="18" height="18" className={styles.plate} />Codex
      </span>
    </div>}
  </div>;
}
