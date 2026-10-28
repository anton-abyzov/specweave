import React, {useEffect, useId, useMemo, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  PATHS,
  TUTORIALS,
  agentLabel,
  buildHubJsonLd,
  byRecency,
  formatDate,
  formatDuration,
  guidePath,
  isCurrentRecording,
  legacyRedirect,
  matchesProduct,
  matchesQuery,
  productLabel,
  resolvePath,
  type LearningPath,
  type ProductFilter,
  type Tutorial,
} from '@site/src/data/tutorials';
import styles from './tutorials.module.css';
import {CountUp, motion as m, useGlow} from '@site/src/components/sections/Motion';

const FILTERS: ReadonlyArray<{id: ProductFilter; label: string}> = [
  {id: 'all', label: 'All'},
  {id: 'cli', label: productLabel('cli')},
  {id: 'specwithcode', label: productLabel('specwithcode')},
];

const VERIFIED_SKILL_WATCH = 'https://verified-skill.com/watch';

function isFilter(value: string | null): value is ProductFilter {
  return FILTERS.some(f => f.id === value);
}

/** Paths shown on this hub: hosted here, with at least two published guides. */
const LOCAL_PATHS = PATHS.filter(p => !p.url && resolvePath(p).published.length >= 2);

/** Guides newest generation first, so the current app leads the list. */
const ORDERED = byRecency(TUTORIALS);

function PathColumn({path}: {path: LearningPath}) {
  const {published, planned} = resolvePath(path);
  // Guide pages link /tutorials/#path-<id>.
  useBrokenLinks().collectAnchor(`path-${path.id}`);
  return (
    <li className={clsx(styles.path, m.reveal)} id={`path-${path.id}`}>
      <div className={styles.pathHead}>
        <h3 className={styles.pathTitle}>{path.title}</h3>
        <p className={styles.pathProduct}>
          {productLabel(path.product)} · {published.length} {published.length === 1 ? 'guide' : 'guides'} · {formatDuration(published.reduce((n, t) => n + t.durationSeconds, 0))}
        </p>
        <p className={styles.pathSummary}>{path.summary}</p>
        {path.url ? (
          <p className={styles.pathMore}>
            These guides live with the registry.{' '}
            <a className="wv-link" href={path.url}>Watch the Verified Skill tutorials</a>
          </p>
        ) : planned.length > 0 && (
          <p className={styles.pathMore}>
            {planned.length === 1 ? 'One more guide is' : `${planned.length} more guides are`} planned for this path.
          </p>
        )}
      </div>
      {published.length > 0 && (
        <ol className={styles.rail} aria-label={`${path.title}, in order`}>
          {published.map((step, i) => (
            <li key={step.slug} className={styles.railItem}>
              <Link className={styles.railLink} to={guidePath(step.slug)}>
                <span className={styles.poster}>
                  <img src={step.poster} alt="" width={640} height={360} loading="lazy" decoding="async" />
                  <span className={styles.stepBadge} aria-hidden="true">{i + 1}</span>
                  <span className={styles.lengthBadge}>{formatDuration(step.durationSeconds)}</span>
                </span>
                <span className={styles.railTitle}><span className={m.srOnly}>Step {i + 1}: </span>{step.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function GuideRow({tutorial}: {tutorial: Tutorial}) {
  const current = isCurrentRecording(tutorial);
  return (
    <li className={clsx(styles.row, m.card)} data-glow>
      <span className={styles.rowPoster}>
        <img src={tutorial.poster} alt="" width={640} height={360} loading="lazy" decoding="async" />
        <span className={styles.lengthBadge}>{formatDuration(tutorial.durationSeconds)}</span>
      </span>
      <div className={styles.rowText}>
        <h3 className={styles.rowTitle}>
          <Link className={styles.rowLink} to={guidePath(tutorial.slug)}>{tutorial.title}</Link>
        </h3>
        <p className={styles.rowOutcome}>{tutorial.outcome}</p>
        <p className={styles.rowMeta}>
          <span>{productLabel(tutorial.product)}</span>
          <span>{agentLabel(tutorial)}</span>
          <span>{tutorial.audio === 'silent' ? 'Captions, no sound' : 'Narrated'}</span>
          <span className={current ? styles.metaCurrent : undefined}>{current ? `Recorded on ${tutorial.testedOn}` : 'Older interface'}, added {formatDate(tutorial.uploadDate)}</span>
        </p>
      </div>
    </li>
  );
}

const STANDARD_ICONS = [
  <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>,
  <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h4M13 15h4M7 11h10" /></svg>,
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Z" /></svg>,
];

/** The three newest posters, stacked as the hero's depth planes. */
const HERO_POSTERS = ORDERED.slice(0, 3);

export default function Tutorials() {
  const {siteConfig} = useDocusaurusContext();
  const searchId = useId();
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [query, setQuery] = useState('');

  // Old deep links (/tutorials/?v=<slug>&t=<s>) open the guide page; ?product= presets the filter.
  useEffect(() => {
    const target = legacyRedirect(window.location.search);
    if (target) {
      window.location.replace(target);
      return;
    }
    const product = new URLSearchParams(window.location.search).get('product');
    if (isFilter(product)) setFilter(product);
  }, []);

  const choose = (next: ProductFilter) => {
    setFilter(next);
    const url = next === 'all' ? window.location.pathname : `${window.location.pathname}?product=${next}`;
    window.history.replaceState(null, '', url);
  };

  const visible = ORDERED.filter(t => matchesProduct(t, filter) && matchesQuery(t, query));
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(f => [f.id, TUTORIALS.filter(t => matchesProduct(t, f.id)).length])),
    [],
  );
  const glow = useGlow<HTMLUListElement>();
  const jsonLd = useMemo(() => JSON.stringify(buildHubJsonLd(TUTORIALS, siteConfig.url)), [siteConfig.url]);

  return (
    <Layout
      title="Tutorials: SpecWeave CLI and SpecWithCode guides"
      description="Short guides with real recordings of the SpecWeave CLI and SpecWithCode: plan and hand off work, run a project with a coordinator and workers, keep memory, verify and schedule. Each guide has steps, chapters, captions and a transcript."
    >
      <Head>
        <script type="application/ld+json">{jsonLd}</script>
      </Head>
      <main className={clsx('wv-root', styles.page)}>
        <header className={styles.hero}>
          <div className={clsx(styles.heroText, m.enter)}>
            <h1 style={{['--i' as string]: 0}}>Learn one task at a time</h1>
            <p className={styles.lead} style={{['--i' as string]: 1}}>
              Short guides built on real recordings of the SpecWeave CLI and SpecWithCode. Each one names the outcome, shows the
              video with chapters, lists the steps and prints the transcript.
            </p>
            <p className={styles.heroStats} style={{['--i' as string]: 2}}>
              <span><b><CountUp value={TUTORIALS.length} /></b> guides</span>
              <span><b><CountUp value={LOCAL_PATHS.length} /></b> learning paths</span>
              <a className="wv-link" href="#all-title">Browse all guides</a>
            </p>
          </div>
          <div className={styles.stack} aria-hidden="true">
            <div className={clsx(styles.stackGlow, m.planeBack)} />
            {HERO_POSTERS.map((t, i) => (
              <div key={t.slug} className={clsx(styles.stackCard, styles[`stack${i}`], i === 0 ? m.planeFront : i === 1 ? m.planeMid : m.planeBack)}>
                <img src={t.poster} alt="" width={640} height={360} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                <span>{t.title}</span>
              </div>
            ))}
          </div>
        </header>

        <section className={styles.section} aria-labelledby="paths-title">
          <div className={styles.sectionHead}>
            <h2 id="paths-title">{LOCAL_PATHS.length === 1 ? 'Learning path' : 'Learning paths'}</h2>
            <p>Follow a path from the first step to a finished result. Each step is its own guide; a path appears here once it has at least two.</p>
          </div>
          <ol className={styles.paths}>
            {LOCAL_PATHS.map(path => <PathColumn key={path.id} path={path} />)}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="all-title">
          <div className={styles.sectionHead}>
            <h2 id="all-title">All guides</h2>
          </div>
          <div className={styles.controls}>
            <div className={styles.search}>
              <label htmlFor={searchId}>Search guides</label>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="handoff, usage, Codex"
                autoComplete="off"
              />
            </div>
            <div className={styles.filters} role="group" aria-label="Product">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  className={styles.filter}
                  aria-pressed={filter === f.id}
                  aria-label={`${f.label}, ${counts[f.id]} ${counts[f.id] === 1 ? 'guide' : 'guides'}`}
                  onClick={() => choose(f.id)}
                >
                  {f.label}<span className={styles.count} aria-hidden="true">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>
          <p className={styles.resultCount} aria-live="polite">
            {visible.length === TUTORIALS.length ? `${visible.length} guides` : `${visible.length} of ${TUTORIALS.length} guides`}
          </p>
          {visible.length > 0 ? (
            <ul className={styles.rows} ref={glow}>
              {visible.map(t => <GuideRow key={t.slug} tutorial={t} />)}
            </ul>
          ) : (
            <p className={styles.empty}>
              No guide matches that yet. Try another word, or{' '}
              <button type="button" className={styles.reset} onClick={() => { setQuery(''); choose('all'); }}>show all guides</button>.
            </p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="other-title">
          <div className={styles.sectionHead}>
            <h2 id="other-title">From the other products</h2>
          </div>
          <p className={styles.other}>
            Guides for finding, testing and publishing agent skills live on verified-skill.com.{' '}
            <a className="wv-link" href={VERIFIED_SKILL_WATCH}>Verified Skill tutorials</a>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="standards-title">
          <div className={styles.sectionHead}>
            <h2 id="standards-title">What every guide includes</h2>
          </div>
          <ul className={clsx(styles.standards, m.stagger)}>
            <li className={m.card} style={{['--i' as string]: 0}}>
              <span className={m.icon} aria-hidden="true">{STANDARD_ICONS[0]}</span>
              <span className="wv-evidence__name">A real recording</span>
              <span className="wv-evidence__detail">Footage of the running app or real command output, with sample projects. Each guide says which version it shows and when it was added; recordings of the current release come first.</span>
            </li>
            <li className={m.card} style={{['--i' as string]: 1}}>
              <span className={m.icon} aria-hidden="true">{STANDARD_ICONS[1]}</span>
              <span className="wv-evidence__name">Captions, chapters and a transcript</span>
              <span className="wv-evidence__detail">A WebVTT caption track, chapters you can jump to with the keyboard, and a transcript built from the captions.</span>
            </li>
            <li className={m.card} style={{['--i' as string]: 2}}>
              <span className={m.icon} aria-hidden="true">{STANDARD_ICONS[2]}</span>
              <span className="wv-evidence__name">Hosted on this site</span>
              <span className="wv-evidence__detail">Videos and posters load from spec-weave.com, with no third-party player or tracking.</span>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
