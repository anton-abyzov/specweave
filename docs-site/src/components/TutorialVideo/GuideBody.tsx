import React, {Fragment, type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {Info} from 'lucide-react';
import TutorialVideo from './index';
import {SPECWITHCODE_RELEASE} from '@site/src/data/specwithcodeRelease';
import {
  agentLabel,
  formatDate,
  formatDuration,
  getTutorial,
  guidePath,
  pathsFor,
  productLabel,
  resolvePath,
  type TranscriptSection,
  type Tutorial,
} from '@site/src/data/tutorials';
import styles from './guide.module.css';

/** Renders `backticked` spans as code; everything else stays plain text. */
export function InlineCode({text}: {text: string}): ReactNode {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2
      ? <code key={i}>{part.slice(1, -1)}</code>
      : <Fragment key={i}>{part}</Fragment>,
  );
}

function recordedLine(t: Tutorial): string {
  const parts: string[] = [];
  if (t.testedOn) parts.push(`Recorded on ${t.testedOn}`);
  parts.push(`added ${formatDate(t.uploadDate)}`);
  let line = parts.join(', ');
  line = line.charAt(0).toUpperCase() + line.slice(1);
  if (t.product === 'specwithcode') line += `. The current release is SpecWithCode ${SPECWITHCODE_RELEASE.version}`;
  return `${line}.`;
}

function LearningPaths({tutorial}: {tutorial: Tutorial}) {
  const paths = pathsFor(tutorial.slug);
  if (!paths.length) return null;
  return (
    <section className={styles.section} aria-labelledby="path-title">
      <h2 id="path-title">{paths.length > 1 ? 'Learning paths' : 'Learning path'}</h2>
      {paths.map(path => {
        const {published, planned} = resolvePath(path);
        return (
          <div key={path.id} className={styles.path}>
            <h3>{path.title}</h3>
            <p className={styles.muted}>{path.summary}</p>
            <ol className="wv-thread">
              {published.map(step => (
                <li key={step.slug} aria-current={step.slug === tutorial.slug ? 'step' : undefined}>
                  <p className="wv-thread__title">
                    {step.slug === tutorial.slug
                      ? <>{step.title} <span className={styles.here}>(this guide)</span></>
                      : <Link className="wv-link" to={guidePath(step.slug)}>{step.title}</Link>}
                  </p>
                  <p className="wv-thread__body">{formatDuration(step.durationSeconds)}, {productLabel(step.product)}</p>
                </li>
              ))}
            </ol>
            {planned.length > 0 && (
              <p className={styles.muted}>
                {planned.length === 1 ? 'One more guide is' : `${planned.length} more guides are`} planned for this path.
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}

function Related({tutorial}: {tutorial: Tutorial}) {
  const related = tutorial.related.map(getTutorial).filter((t): t is Tutorial => Boolean(t));
  if (!related.length) return null;
  return (
    <section className={styles.section} aria-labelledby="related-title">
      <h2 id="related-title">Related guides</h2>
      <ul className={styles.related}>
        {related.map(t => (
          <li key={t.slug}>
            <Link className="wv-link" to={guidePath(t.slug)}>{t.title}</Link>
            <span className={styles.muted}>{formatDuration(t.durationSeconds)}, {productLabel(t.product)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The guide template, without the page shell, so it renders the same in tests and on the site. */
export function GuideBody({tutorial: t, transcript = [], startAt}: {tutorial: Tutorial; transcript?: TranscriptSection[]; startAt?: number}): ReactNode {
  const audio = t.audio === 'silent' ? 'Captioned, no sound' : 'Narrated, with captions';
  return (
    <main className={clsx('wv-root', styles.page)}>
      <article className={styles.article}>
        <nav aria-label="Breadcrumbs" className={styles.breadcrumbs}>
          <ol>
            <li><Link to="/tutorials">Tutorials</Link></li>
            <li><Link to={`/tutorials?product=${t.product}`}>{productLabel(t.product)}</Link></li>
            <li aria-current="page">{t.title}</li>
          </ol>
        </nav>

        <header className={styles.header}>
          <h1>{t.title}</h1>
          <p className={styles.outcome}>{t.outcome}</p>
          <ul className={styles.facts} aria-label="About this guide">
            <li>{productLabel(t.product)}</li>
            <li>{formatDuration(t.durationSeconds)}</li>
            <li>{agentLabel(t)}</li>
            <li>{audio}</li>
          </ul>
          <p className={styles.muted}>{recordedLine(t)}</p>
          {t.prerequisites.length > 0 && (
            <p className={styles.prereq}>
              <span className={styles.prereqLabel}>Before you start:</span>{' '}
              {t.prerequisites.map((p, i) => (
                <Fragment key={p}>{i > 0 && '; '}<InlineCode text={p} /></Fragment>
              ))}.
            </p>
          )}
        </header>

        <TutorialVideo
          className={styles.player}
          id="video"
          title={t.title}
          src={t.src}
          poster={t.poster}
          captionsVtt={t.captionsVtt}
          captionsOn={t.captionsOn}
          captionsBurnedIn={t.captionsBurnedIn}
          durationSeconds={t.durationSeconds}
          chapters={t.chapters}
          startAt={startAt}
          ariaLabel={`${t.title}: ${audio.toLowerCase()}`}
        />

        <section className={styles.section} aria-labelledby="steps-title">
          <h2 id="steps-title">Steps</h2>
          <ol className={styles.steps}>
            {t.steps.map(step => <li key={step}><span><InlineCode text={step} /></span></li>)}
          </ol>
        </section>

        <aside className={clsx('wv-note', styles.note)} aria-label="About this recording">
          <Info aria-hidden="true" strokeWidth={1.5} />
          <p>{t.note}</p>
        </aside>

        {transcript.length > 0 && (
          <section className={styles.section} aria-labelledby="transcript-title">
            <details className={styles.transcript}>
              <summary><h2 id="transcript-title">Transcript</h2></summary>
              <p className={styles.muted}>
                {t.audio === 'silent'
                  ? 'Built from the on-screen captions of this silent video.'
                  : 'Built from the caption file of the narration.'}
              </p>
              {transcript.map(section => (
                <div key={section.start} className={styles.transcriptSection}>
                  <h3><span className={styles.time}>{formatDuration(section.start)}</span> {section.title}</h3>
                  <p>{section.text}</p>
                </div>
              ))}
            </details>
          </section>
        )}

        {(t.action || t.guide) && (
          <section className={styles.actions} aria-label="Next">
            {t.action && <Link className="wv-btn wv-btn--primary wv-btn--lg" to={t.action.to}>{t.action.label}</Link>}
            {t.guide && t.guide !== t.action?.to && <Link className="wv-btn wv-btn--secondary wv-btn--lg" to={t.guide}>Read the reference</Link>}
          </section>
        )}

        <LearningPaths tutorial={t} />
        <Related tutorial={t} />

        <p className={styles.back}><Link className="wv-link" to="/tutorials">All tutorials</Link></p>
      </article>
    </main>
  );
}
