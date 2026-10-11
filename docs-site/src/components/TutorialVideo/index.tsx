import React, {useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import clsx from 'clsx';
import {formatDuration, type TutorialChapter} from '@site/src/data/tutorials';
import styles from './styles.module.css';

export interface TutorialVideoProps {
  /** Tutorial title; also the base of the player's accessible name. */
  title: string;
  /** MP4 source. When missing, a "Coming soon" placeholder renders instead of a player. */
  src?: string | null;
  poster?: string | null;
  /** WebVTT captions, offered as the English captions track. */
  captionsVtt?: string | null;
  /** Show the captions track by default. Leave off when captions are burned into the picture. */
  captionsOn?: boolean;
  /** Captions are burned into the picture, so no captions track is offered (it would show a second set). */
  captionsBurnedIn?: boolean;
  durationSeconds?: number | null;
  chapters?: readonly TutorialChapter[];
  /** Agent name shown on the placeholder card (and in the meta row). */
  agentLabel?: string;
  /** Planned sections listed on the placeholder card. */
  outline?: readonly string[];
  /** Overrides the default accessible name of the <video>. */
  ariaLabel?: string;
  /** Figure caption below the player. */
  caption?: ReactNode;
  /** Extra content for the details column (split layout) or above the chapters (stacked). */
  children?: ReactNode;
  preload?: 'none' | 'metadata' | 'auto';
  /** Seconds to seek to once metadata loads. */
  startAt?: number;
  /** `split` puts chapters beside the player when the container is wide enough. */
  layout?: 'stacked' | 'split';
  className?: string;
  style?: CSSProperties;
  /** Optional id for the <figure>, e.g. a deep-link anchor. */
  id?: string;
}

function activeChapterIndex(chapters: readonly TutorialChapter[], time: number): number {
  let index = -1;
  chapters.forEach((chapter, i) => {
    if (time + 0.05 >= chapter.start) index = i;
  });
  return index;
}

export default function TutorialVideo({
  title,
  src,
  poster,
  captionsVtt,
  captionsOn = false,
  captionsBurnedIn = false,
  durationSeconds,
  chapters = [],
  agentLabel,
  outline,
  ariaLabel,
  caption,
  children,
  preload = 'metadata',
  startAt,
  layout = 'stacked',
  className,
  style,
  id,
}: TutorialVideoProps): ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number | null>(durationSeconds ?? null);
  const [active, setActive] = useState(chapters.length ? 0 : -1);

  useEffect(() => setDuration(durationSeconds ?? null), [durationSeconds]);

  // A video rendered on the server may load its metadata before hydration, so
  // onLoadedMetadata never fires for it; seek here as well.
  useEffect(() => {
    const video = videoRef.current;
    if (video && startAt && startAt > 0 && video.readyState >= 1 && video.currentTime < 0.1) video.currentTime = startAt;
  }, [startAt]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!durationSeconds && Number.isFinite(video.duration)) setDuration(video.duration);
    if (startAt && startAt > 0 && video.currentTime < 0.1) video.currentTime = startAt;
  }, [durationSeconds, startAt]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video && chapters.length) setActive(activeChapterIndex(chapters, video.currentTime));
  }, [chapters]);

  const seek = useCallback((start: number, index: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = start;
    setActive(index);
    if (video.paused) {
      const played = video.play();
      if (played && typeof played.catch === 'function') played.catch(() => {});
    }
  }, []);

  if (!src) {
    return (
      <figure id={id} className={clsx(styles.root, layout === 'split' && styles.split, className)} style={style}>
        <div className={styles.placeholder} role="img" aria-label={`${title}. Coming soon.${outline?.length ? ` Planned: ${outline.join(', ')}.` : ''}`}>
          <span className={styles.placeholderEyebrow}>SpecWithCode tutorial</span>
          {agentLabel && <span className={styles.placeholderAgent}>{agentLabel}</span>}
          <span className={styles.soon}>Coming soon</span>
          {outline && outline.length > 0 && (
            <span className={styles.outline}>{outline.join(' / ')}</span>
          )}
        </div>
        {children && <div className={styles.details}>{children}</div>}
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>
    );
  }

  const label = ariaLabel ?? `${title}${captionsVtt ? ', captioned' : ''} tutorial video`;
  const hasDetails = Boolean(children) || chapters.length > 0 || duration !== null;

  return (
    <figure id={id} className={clsx(styles.root, layout === 'split' && styles.split, className)} style={style}>
      <div className={styles.frame}>
        <video
          ref={videoRef}
          className={styles.video}
          controls
          playsInline
          preload={preload}
          poster={poster ?? undefined}
          aria-label={label}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
        >
          <source src={src} type="video/mp4" />
          {captionsVtt && !captionsBurnedIn && <track kind="captions" src={captionsVtt} srcLang="en" label="English" default={captionsOn} />}
          Your browser does not support embedded video. <a href={src}>Download the video</a>.
        </video>
      </div>
      {hasDetails && (
        <div className={styles.details}>
          {children}
          {(duration !== null || captionsVtt || agentLabel) && (
            <p className={styles.meta}>
              {duration !== null && <span><span className={styles.metaKey}>Length</span> {formatDuration(duration)}</span>}
              {captionsVtt && <span>Captions</span>}
              {agentLabel && <span>{agentLabel}</span>}
            </p>
          )}
          {chapters.length > 0 && (
            <nav className={styles.chapters} aria-label={`Chapters: ${title}`}>
              <ol>
                {chapters.map((chapter, index) => (
                  <li key={`${chapter.start}-${chapter.title}`}>
                    <button
                      type="button"
                      className={styles.chapter}
                      aria-current={index === active ? 'true' : undefined}
                      onClick={() => seek(chapter.start, index)}
                    >
                      <span className={styles.time}>{formatDuration(chapter.start)}</span>{' '}
                      <span className={styles.chapterTitle}>{chapter.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      )}
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
