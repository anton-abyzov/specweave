import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import TutorialVideo from '@site/src/components/TutorialVideo';
import {useReducedMotion} from '@site/src/hooks/useReducedMotion';
import {
  AGENTS,
  TUTORIALS,
  agentLabel,
  buildVideoJsonLd,
  formatDuration,
  getTutorial,
  matchesFilter,
  type Tutorial,
  type TutorialFilter,
} from '@site/src/data/tutorials';
import base from './continuity.module.css';
import styles from './tutorials.module.css';

const FILTERS: ReadonlyArray<{id: TutorialFilter; label: string}> = [
  {id: 'all', label: 'All'},
  ...AGENTS,
  {id: 'basics', label: 'App basics'},
];

const published = TUTORIALS.filter(t => t.status === 'published');
const upcoming = TUTORIALS.filter(t => t.status === 'coming-soon');

function Card({tutorial, selected, onSelect}: {tutorial: Tutorial; selected: boolean; onSelect: (slug: string) => void}) {
  const label = agentLabel(tutorial);
  const soon = tutorial.status === 'coming-soon';
  return (
    <li>
      <article className={clsx(styles.card, selected && styles.cardSelected)}>
        <div className={styles.thumb}>
          {tutorial.poster ? (
            <img src={tutorial.poster} alt="" width={1920} height={1080} loading="lazy" decoding="async" />
          ) : (
            <span className={styles.thumbPlaceholder} aria-hidden="true">
              <span className={styles.thumbAgent}>{label}</span>
            </span>
          )}
          <span className={clsx(styles.badge, soon && styles.badgeSoon)}>
            {soon || !tutorial.durationSeconds ? 'Coming soon' : formatDuration(tutorial.durationSeconds)}
          </span>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.cardAgent}>{label}</p>
          <h3 className={styles.cardTitle}>
            <button
              type="button"
              className={styles.cardButton}
              aria-current={selected ? 'true' : undefined}
              aria-describedby={`summary-${tutorial.slug}`}
              onClick={() => onSelect(tutorial.slug)}
            >
              {tutorial.title}
            </button>
          </h3>
          <p id={`summary-${tutorial.slug}`} className={styles.cardSummary}>{tutorial.summary}</p>
          <p className={styles.cardMeta}>
            {soon ? (
              <span>{tutorial.outline?.join(' / ') ?? 'In production'}</span>
            ) : (
              <>
                <span>{tutorial.chapters.length} chapters</span>
                {tutorial.captionsVtt && <span>Captions</span>}
                {tutorial.audio === 'silent' && <span>No sound</span>}
              </>
            )}
          </p>
        </div>
      </article>
    </li>
  );
}

export default function Tutorials() {
  const {siteConfig} = useDocusaurusContext();
  const reducedMotion = useReducedMotion();
  const [filter, setFilter] = useState<TutorialFilter>('all');
  const [selectedSlug, setSelectedSlug] = useState(published[0].slug);
  const [startAt, setStartAt] = useState<number | undefined>();
  const playerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Deep links: /tutorials/?v=<slug>&t=<seconds> (chapter URLs in the VideoObject data use them).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('v');
    if (slug && getTutorial(slug)) {
      setSelectedSlug(slug);
      const t = Number(params.get('t'));
      if (Number.isFinite(t) && t > 0) setStartAt(t);
    }
  }, []);

  const select = useCallback((slug: string) => {
    setSelectedSlug(slug);
    setStartAt(undefined);
    window.history.replaceState(null, '', `${window.location.pathname}?v=${encodeURIComponent(slug)}`);
    playerRef.current?.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth', block: 'start'});
    headingRef.current?.focus({preventScroll: true});
  }, [reducedMotion]);

  const selected = getTutorial(selectedSlug) ?? published[0];
  const visible = TUTORIALS.filter(t => matchesFilter(t, filter));
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(f => [f.id, TUTORIALS.filter(t => matchesFilter(t, f.id)).length])),
    [],
  );
  const jsonLd = useMemo(() => JSON.stringify(buildVideoJsonLd(TUTORIALS, siteConfig.url)), [siteConfig.url]);
  const selectedSoon = selected.status === 'coming-soon';

  return (
    <Layout
      title="Tutorials: SpecWithCode and specweave videos"
      description="Short, captioned video tutorials for SpecWithCode and the specweave CLI: projects, threads, memory, plans and handoff, plus one narrated walkthrough per agent for Claude Code, Codex, OpenCode, Grok and Antigravity with Gemini, with Cursor next."
    >
      <Head>
        <script type="application/ld+json">{jsonLd}</script>
      </Head>
      <main className={clsx(base.page, styles.tutorials)}>
        <header className={styles.hero}>
          <div className={styles.heroText}>
            <span className={base.eyebrow}><span className={base.orangeDot} />Tutorials / SpecWithCode and the specweave CLI</span>
            <h1>Short videos.<br /><em>Real recordings.</em></h1>
            <p className={base.lead}>Every walkthrough is actual application footage with synthetic projects, hosted on this site, with captions and chapters you can jump between.</p>
          </div>
          <dl className={styles.stats}>
            <div><dt>Published</dt><dd>{published.length}</dd></div>
            <div><dt>Coming soon</dt><dd>{upcoming.length}</dd></div>
            <div><dt>Captioned</dt><dd>{published.filter(t => t.captionsVtt).length} of {published.length}</dd></div>
          </dl>
        </header>

        <section ref={playerRef} className={styles.player} aria-labelledby="player-title">
          <div className={styles.playerInfo}>
            <div>
              <p className={styles.playerAgent}>
                <span>{agentLabel(selected)}</span>
                <span>{selectedSoon ? 'Coming soon' : 'Now playing'}</span>
              </p>
              <h2 id="player-title" ref={headingRef} tabIndex={-1} className={styles.playerTitle}>{selected.title}</h2>
              <p className={styles.playerSummary}>{selected.summary}</p>
            </div>
            {selected.guide && <Link className={styles.guideLink} to={selected.guide}>Read the written guide <span aria-hidden="true">→</span></Link>}
          </div>
          <TutorialVideo
            key={selected.slug}
            id={selected.slug}
            layout={selectedSoon ? 'stacked' : 'split'}
            title={selected.title}
            src={selected.src}
            poster={selected.poster}
            captionsVtt={selected.captionsVtt}
            captionsOn={selected.captionsOn}
            captionsBurnedIn={selected.captionsBurnedIn}
            durationSeconds={selected.durationSeconds}
            chapters={selected.chapters}
            outline={selected.outline}
            agentLabel={selectedSoon ? agentLabel(selected) : undefined}
            startAt={startAt}
            caption={selected.note}
          />
        </section>

        <section className={styles.gallery} aria-labelledby="gallery-title">
          <div className={styles.galleryHeading}>
            <div>
              <span className={base.eyebrow}>All tutorials</span>
              <h2 id="gallery-title">Pick a walkthrough.<br /><em>Or pick your agent.</em></h2>
            </div>
            <p>Each agent gets one tutorial: setup, one real task through a project, and the result, in 60 to 90 seconds.</p>
          </div>
          <div className={styles.filters} role="group" aria-labelledby="filter-label">
            <span id="filter-label" className={styles.filterLabel}>Agent</span>
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                className={styles.filter}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}<span className={styles.count}>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <p className={styles.resultCount} aria-live="polite">
            Showing {visible.length} of {TUTORIALS.length} tutorials
          </p>
          <ul className={styles.grid}>
            {visible.map(t => <Card key={t.slug} tutorial={t} selected={t.slug === selected.slug} onSelect={select} />)}
          </ul>
        </section>

        <section className={styles.standards} aria-labelledby="standards-title">
          <h2 id="standards-title" className={styles.standardsTitle}>What every tutorial includes</h2>
          <ul>
            <li><strong>Real footage.</strong> Recorded from the running app or real command output, with synthetic projects and no personal accounts on screen.</li>
            <li><strong>Captions and chapters.</strong> A WebVTT caption track and chapter markers you can jump to with the keyboard.</li>
            <li><strong>First-party hosting.</strong> Videos and posters load from spec-weave.com, with no third-party player or tracking.</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
