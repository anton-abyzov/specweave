import React, { useState, useCallback } from 'react';
import styles from './styles.module.css';

/** Static manifest mapping slugs to video metadata */
export const VIDEO_MANIFEST: Record<
  string,
  { src: string; thumbnail: string; title: string; duration: number }
> = {
  'install-skill': {
    src: 'https://verified-skill.com/video/learn/install-skill.mp4',
    thumbnail: 'https://verified-skill.com/learn/thumbnails/install-skill.webp',
    title: 'Install a Skill in 30 Seconds',
    duration: 30,
  },
  'getting-started-101': {
    src: 'https://verified-skill.com/video/learn/getting-started-101.mp4',
    thumbnail: 'https://verified-skill.com/learn/thumbnails/getting-started-101.webp',
    title: 'Getting Started with vskill',
    duration: 62,
  },
  'cli-commands-101': {
    src: 'https://verified-skill.com/video/learn/cli-commands-101.mp4',
    thumbnail: 'https://verified-skill.com/learn/thumbnails/cli-commands-101.webp',
    title: 'CLI Commands Deep Dive',
    duration: 94,
  },
  'security-scan-101': {
    src: 'https://verified-skill.com/video/learn/security-scan-101.mp4',
    thumbnail: 'https://verified-skill.com/learn/thumbnails/security-scan-101.webp',
    title: 'Security Scanning Explained',
    duration: 88,
  },
  'plugin-marketplace-101': {
    src: 'https://verified-skill.com/video/learn/plugin-marketplace-101.mp4',
    thumbnail: 'https://verified-skill.com/learn/thumbnails/plugin-marketplace-101.webp',
    title: 'Browsing the Plugin Marketplace',
    duration: 75,
  },
};

export interface VideoEmbedProps {
  /** Slug that auto-resolves from VIDEO_MANIFEST */
  slug?: string;
  /** Full URL to mp4 video source (overrides manifest) */
  src?: string;
  /** Optional WebM video URL */
  webm?: string;
  /** Full URL to thumbnail image (overrides manifest) */
  thumbnail?: string;
  /** Video title (used for alt text and fallback, overrides manifest) */
  title?: string;
  /** Duration in seconds (overrides manifest) */
  duration?: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Derive a JPEG fallback URL from a WebP thumbnail URL */
function jpegFallback(thumbnail: string): string {
  if (thumbnail.endsWith('.webp')) {
    return thumbnail.replace('.webp', '.jpg');
  }
  return thumbnail;
}

/** Render a <picture> element with WebP source and JPEG fallback */
function ThumbnailPicture({
  thumbnail,
  alt,
  className,
}: {
  thumbnail: string;
  alt: string;
  className?: string;
}) {
  const isWebp = thumbnail.endsWith('.webp');
  return (
    <picture>
      {isWebp && <source type="image/webp" srcSet={thumbnail} />}
      <img
        src={isWebp ? jpegFallback(thumbnail) : thumbnail}
        alt={alt}
        className={className}
      />
    </picture>
  );
}

export default function VideoEmbed(props: VideoEmbedProps) {
  // Resolve from manifest if slug is provided
  const manifest = props.slug ? VIDEO_MANIFEST[props.slug] : undefined;

  // Explicit props override manifest values
  const src = props.src ?? manifest?.src ?? '';
  const webm = props.webm;
  const thumbnail = props.thumbnail ?? manifest?.thumbnail ?? '';
  const title = props.title ?? manifest?.title ?? '';
  const duration = props.duration ?? manifest?.duration ?? 0;

  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setPlaying(false);
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.fallback}>
          <ThumbnailPicture
            thumbnail={thumbnail}
            alt={title}
            className={styles.thumbnailImg}
          />
          <div className={styles.fallbackOverlay}>
            <span className={styles.fallbackText}>Video unavailable -- coming soon</span>
          </div>
        </div>
      </div>
    );
  }

  if (playing) {
    return (
      <div className={styles.container}>
        {webm ? (
          <video
            className={styles.video}
            autoPlay
            controls
            playsInline
            onError={handleError}
          >
            <source src={webm} type="video/webm" />
            <source src={src} type="video/mp4" />
          </video>
        ) : (
          <video
            className={styles.video}
            src={src}
            autoPlay
            controls
            playsInline
            onError={handleError}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.thumbnailWrapper}>
        <ThumbnailPicture
          thumbnail={thumbnail}
          alt={title}
          className={styles.thumbnailImg}
        />
        <div className={styles.overlay}>
          <button
            type="button"
            className={styles.playButton}
            onClick={handlePlay}
            aria-label={`Play ${title}`}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.6)" />
              <polygon points="19,14 37,24 19,34" fill="white" />
            </svg>
          </button>
          <span className={styles.durationBadge}>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}
