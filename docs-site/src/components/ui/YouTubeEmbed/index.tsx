import React, { useState } from 'react';
import styles from './styles.module.css';

interface Chapter {
  time: string;
  seconds: number;
  title: string;
}

interface TranscriptLine {
  time: string;
  text: string;
}

export interface YouTubeEmbedProps {
  videoId: string;
  /** Main title text */
  title?: string;
  /** Highlighted portion of the title (rendered in accent color) */
  titleAccent?: string;
  subtitle?: string;
  duration?: string;
  version?: string;
  channelName?: string;
  channelUrl?: string;
  chapters?: Chapter[];
  transcript?: TranscriptLine[];
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
  </svg>
);

export default function YouTubeEmbed({
  videoId,
  title = 'SpecWeave + ',
  titleAccent = 'OpenCode',
  subtitle,
  duration = '',
  version,
  channelName = 'Anton Abyzov',
  channelUrl = 'https://www.youtube.com/@antonabyzov',
  chapters = [],
  transcript = [],
}: YouTubeEmbedProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          {version && <span className={styles.badge}>SpecWeave v{version}</span>}
          {duration && <span className={styles.duration}>{duration}</span>}
        </div>
        <h2 className={styles.title}>
          {title}<span>{titleAccent}</span>
        </h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.videoSection}>
        <div className={styles.videoFrame}>
          <div className={styles.videoAspect}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={`${title}${titleAccent}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {chapters.length > 0 && (
        <div className={styles.chapters}>
          <div className={styles.chaptersLabel}>Chapters</div>
          <div className={styles.timeline}>
            {chapters.map((ch, i) => (
              <a
                key={i}
                className={styles.chapter}
                href={`${watchUrl}&t=${ch.seconds}s`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.chapterTime}>{ch.time}</div>
                <div className={styles.chapterTitle}>{ch.title}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {transcript.length > 0 && (
        <div className={styles.transcriptSection}>
          <button
            className={styles.transcriptToggle}
            onClick={() => setTranscriptOpen(!transcriptOpen)}
            aria-expanded={transcriptOpen}
          >
            <span>Transcript</span>
            <span className={`${styles.transcriptArrow} ${transcriptOpen ? styles.transcriptArrowOpen : ''}`}>
              &#9660;
            </span>
          </button>
          <div className={`${styles.transcriptBody} ${transcriptOpen ? styles.transcriptBodyOpen : ''}`}>
            <div className={styles.transcriptInner}>
              {transcript.map((line, i) => (
                <div key={i} className={styles.transcriptLine}>
                  <span className={styles.transcriptTimestamp}>{line.time}</span>
                  <span className={styles.transcriptText}>{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <a className={styles.channelLink} href={channelUrl} target="_blank" rel="noopener noreferrer">
            {channelName}
          </a>
          <span className={styles.ccNotice}>
            <span className={styles.ccBadge}>CC</span>
            Auto-translated subtitles
          </span>
        </div>
        <a className={styles.watchBtn} href={watchUrl} target="_blank" rel="noopener noreferrer">
          <PlayIcon />
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}
