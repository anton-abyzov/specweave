import React, {Fragment, type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
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
  type TranscriptCapture,
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

/** Where this guide sits in each path: step N of M, with the guides before and after it. */
function LearningPaths({tutorial}: {tutorial: Tutorial}) {
  const paths = pathsFor(tutorial.slug);
  if (!paths.length) return null;
  return (
    <section className={styles.section} aria-labelledby="path-title">
      <h2 id="path-title">{paths.length > 1 ? 'Learning paths' : 'Learning path'}</h2>
      {paths.map(path => {
        const {published, planned} = resolvePath(path);
        const index = published.findIndex(step => step.slug === tutorial.slug);
        const previous = published[index - 1];
        const next = published[index + 1];
        // The hub lists a path once it has two published guides.
        const hub = published.length >= 2 ? `/tutorials/#path-${path.id}` : '/tutorials/';
        return (
          <div key={path.id} className={styles.path}>
            <p className={styles.pathStep}>
              Step {index + 1} of {published.length} in <Link className="wv-link" to={hub}>{path.title}</Link>
              {planned.length > 0 && <span className={styles.muted}>, {planned.length === 1 ? 'one more guide' : `${planned.length} more guides`} planned</span>}.
            </p>
            {(previous || next) && (
              <ul className={styles.related}>
                {previous && (
                  <li>
                    <span className={styles.muted}>Previous</span>
                    <Link className="wv-link" to={guidePath(previous.slug)} rel="prev">{previous.title}</Link>
                  </li>
                )}
                {next && (
                  <li>
                    <span className={styles.muted}>Next</span>
                    <Link className="wv-link" to={guidePath(next.slug)} rel="next">{next.title}</Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** What differs for this agent, from the episode's script sources and recording notes. */
function AgentNotes({tutorial: t}: {tutorial: Tutorial}) {
  if (!t.agentNotes?.length) return null;
  const agent = agentLabel(t);
  return (
    <section className={styles.section} aria-labelledby="agent-title">
      <h2 id="agent-title">Using {agent} with SpecWithCode</h2>
      <p className={styles.muted}>What differs for {agent}{t.testedOn ? `, as recorded on ${t.testedOn}` : ''}.</p>
      <ul className={styles.agentNotes}>
        {t.agentNotes.map(note => <li key={note}><InlineCode text={note} /></li>)}
      </ul>
    </section>
  );
}

/** The transcript, open on the page, one section per chapter with a link that starts the video there. */
function Transcript({tutorial: t, transcript}: {tutorial: Tutorial; transcript: TranscriptSection[]}) {
  // Docs pages link #transcript-title; the build's anchor check only knows anchors registered here.
  const brokenLinks = useBrokenLinks();
  if (!transcript.length) return null;
  brokenLinks.collectAnchor('transcript-title');
  for (const section of transcript) brokenLinks.collectAnchor(`t-${Math.floor(section.start)}`);
  return (
    <section className={styles.section} aria-labelledby="transcript-title">
      <h2 id="transcript-title">Transcript</h2>
      <p className={styles.muted}>
        {t.audio === 'silent'
          ? 'Built from the on-screen captions of this silent video.'
          : 'Built from the caption file of the narration.'}
      </p>
      {transcript.map(section => {
        const start = Math.floor(section.start);
        const notes = (t.chapterNotes ?? []).filter(note => note.start === section.start);
        return (
          <div key={section.start} className={styles.transcriptSection}>
            <h3 id={`t-${start}`}>
              {/* A full load, so the player starts at this chapter. */}
              <a className={styles.time} href={`${guidePath(t.slug)}${start ? `?t=${start}` : ''}#video`}>{formatDuration(section.start)}</a>{' '}
              {section.title}
            </h3>
            <p>{section.text}</p>
            {notes.map(note => (
              <aside key={note.text} className={clsx('wv-note', styles.note)} aria-label="About this chapter">
                <Info aria-hidden="true" strokeWidth={1.5} />
                <p>
                  {note.text}
                  {note.to && <> <Link className="wv-link" to={note.to}>{note.label ?? 'Read the current guide'}</Link></>}
                </p>
              </aside>
            ))}
          </div>
        );
      })}
    </section>
  );
}

/** Real terminal runs from the recording session, trimmed by plugins/tutorial-pages. */
function Captures({captures}: {captures: TranscriptCapture[]}) {
  if (!captures.length) return null;
  return (
    <section className={styles.section} aria-labelledby="captures-title">
      <h2 id="captures-title">From the recording</h2>
      <p className={styles.muted}>Terminal runs from the recording session, with the home folder, user and host redacted.</p>
      {captures.map(c => (
        <figure key={c.command} className={styles.capture}>
          <figcaption><InlineCode text={c.label} /></figcaption>
          <pre className={styles.terminal}><code>{`$ ${c.command}\n${c.stdout}${c.truncated ? '\n...' : ''}`}</code></pre>
          <p className={styles.muted}>
            {c.exitCode === null ? 'Exit code not recorded' : `Exit code ${c.exitCode}`}, captured {formatDate(c.capturedAt)}.
          </p>
        </figure>
      ))}
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
export function GuideBody({tutorial: t, transcript = [], captures = [], startAt}: {
  tutorial: Tutorial;
  transcript?: TranscriptSection[];
  captures?: TranscriptCapture[];
  startAt?: number;
}): ReactNode {
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
            {/* Every SpecWithCode guide links the product page, whatever its action points at. */}
            <li>{t.product === 'specwithcode' ? <Link to="/code/">{productLabel(t.product)}</Link> : productLabel(t.product)}</li>
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
            {t.steps.map(step => <li key={step}><InlineCode text={step} /></li>)}
          </ol>
        </section>

        <aside className={clsx('wv-note', styles.note)} aria-label="About this recording">
          <Info aria-hidden="true" strokeWidth={1.5} />
          <p>{t.note}</p>
        </aside>

        <AgentNotes tutorial={t} />
        <Transcript tutorial={t} transcript={transcript} />
        <Captures captures={captures} />

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
