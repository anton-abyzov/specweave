import React, {useEffect, useId, useMemo, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluralForm} from '@docusaurus/theme-common';
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

const FILTER_IDS: ReadonlyArray<ProductFilter> = ['all', 'cli', 'specwithcode'];

function getFilters(): ReadonlyArray<{id: ProductFilter; label: string}> {
  return [
    {id: 'all', label: translate({id: 'tutorials.filter.all', message: 'All', description: 'Product filter button showing guides for every product'})},
    {id: 'cli', label: productLabel('cli')},
    {id: 'specwithcode', label: productLabel('specwithcode')},
  ];
}

const VERIFIED_SKILL_WATCH = 'https://verified-skill.com/watch';

function isFilter(value: string | null): value is ProductFilter {
  return FILTER_IDS.some(id => id === value);
}

/** Paths shown on this hub: hosted here, with at least two published guides. */
const LOCAL_PATHS = PATHS.filter(p => !p.url && resolvePath(p).published.length >= 2);

/** Guides newest generation first, so the current app leads the list. */
const ORDERED = byRecency(TUTORIALS);

function PathColumn({path}: {path: LearningPath}) {
  const {published, planned} = resolvePath(path);
  const {selectMessage} = usePluralForm();
  // Guide pages link /tutorials/#path-<id>.
  useBrokenLinks().collectAnchor(`path-${path.id}`);
  return (
    <li className={clsx(styles.path, m.reveal)} id={`path-${path.id}`}>
      <div className={styles.pathHead}>
        <h3 className={styles.pathTitle}>{path.title}</h3>
        <p className={styles.pathProduct}>
          {selectMessage(published.length, translate({id: 'tutorials.path.meta', message: '{product} · {count} guide · {duration}|{product} · {count} guides · {duration}', description: 'Learning path meta line, plural forms separated by "|" (see https://docusaurus.io/docs/i18n/tutorial#plurals); {product} is a product name, {duration} a m:ss total length'}, {product: productLabel(path.product), count: published.length, duration: formatDuration(published.reduce((n, t) => n + t.durationSeconds, 0))}))}
        </p>
        <p className={styles.pathSummary}>{path.summary}</p>
        {path.url ? (
          <p className={styles.pathMore}>
            <Translate id="tutorials.path.external" description="Shown when a path's guides live on another site">These guides live with the registry.</Translate>{' '}
            <a className="wv-link" href={path.url}><Translate id="tutorials.path.externalLink" description="Link to the Verified Skill tutorials; keep Verified Skill in English">Watch the Verified Skill tutorials</Translate></a>
          </p>
        ) : planned.length > 0 && (
          <p className={styles.pathMore}>
            {selectMessage(planned.length, translate({id: 'tutorials.path.planned', message: 'One more guide is planned for this path.|{count} more guides are planned for this path.', description: 'Planned guides in a learning path, plural forms separated by "|"'}, {count: planned.length}))}
          </p>
        )}
      </div>
      {published.length > 0 && (
        <ol className={styles.rail} aria-label={translate({id: 'tutorials.path.railAria', message: '{title}, in order', description: 'Accessible label of the ordered list of guides in a learning path; {title} is the path title'}, {title: path.title})}>
          {published.map((step, i) => (
            <li key={step.slug} className={styles.railItem}>
              <Link className={styles.railLink} to={guidePath(step.slug)}>
                <span className={styles.poster}>
                  <img src={step.poster} alt="" width={640} height={360} loading="lazy" decoding="async" />
                  <span className={styles.stepBadge} aria-hidden="true">{i + 1}</span>
                  <span className={styles.lengthBadge}>{formatDuration(step.durationSeconds)}</span>
                </span>
                <span className={styles.railTitle}><span className={m.srOnly}>{translate({id: 'tutorials.path.step', message: 'Step {number}: ', description: 'Screen-reader prefix before a guide title in a path; keep the trailing space'}, {number: i + 1})}</span>{step.title}</span>
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
          <span>{tutorial.audio === 'silent'
            ? translate({id: 'tutorials.row.audio.silent', message: 'Captions, no sound', description: 'Guide meta: the video has captions and no audio'})
            : translate({id: 'tutorials.row.audio.narrated', message: 'Narrated', description: 'Guide meta: the video has a voiceover'})}</span>
          <span className={current ? styles.metaCurrent : undefined}>{current
            ? translate({id: 'tutorials.row.recordedOn', message: 'Recorded on {testedOn}, added {date}', description: 'Guide meta; {testedOn} is a product and version, {date} the date it was added'}, {testedOn: tutorial.testedOn, date: formatDate(tutorial.uploadDate)})
            : translate({id: 'tutorials.row.olderInterface', message: 'Older interface, added {date}', description: 'Guide meta for older recordings; {date} is the date it was added'}, {date: formatDate(tutorial.uploadDate)})}</span>
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
  const {selectMessage} = usePluralForm();
  const {siteConfig} = useDocusaurusContext();
  const searchId = useId();
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [query, setQuery] = useState('');
  const FILTERS = getFilters();

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
    () => Object.fromEntries(FILTER_IDS.map(id => [id, TUTORIALS.filter(t => matchesProduct(t, id)).length])),
    [],
  );
  const glow = useGlow<HTMLUListElement>();
  const jsonLd = useMemo(() => JSON.stringify(buildHubJsonLd(TUTORIALS, siteConfig.url, siteConfig.baseUrl)), [siteConfig.url, siteConfig.baseUrl]);

  return (
    <Layout
      title={translate({id: 'tutorials.meta.title', message: 'Tutorials: SpecWeave CLI and SpecWithCode guides', description: 'Page title of /tutorials; keep product names in English'})}
      description={translate({id: 'tutorials.meta.description', message: 'Short guides with real recordings of the SpecWeave CLI and SpecWithCode: plan and hand off work, run a project with a coordinator and workers, keep memory, verify and schedule. Each guide has steps, chapters, captions and a transcript.', description: 'Meta description of /tutorials; keep product names in English'})}
    >
      <Head>
        <script type="application/ld+json">{jsonLd}</script>
      </Head>
      <main className={clsx('wv-root', styles.page)}>
        <header className={styles.hero}>
          <div className={clsx(styles.heroText, m.enter)}>
            <h1 style={{['--i' as string]: 0}}><Translate id="tutorials.hero.title" description="Hero headline of /tutorials">Learn one task at a time</Translate></h1>
            <p className={styles.lead} style={{['--i' as string]: 1}}>
              <Translate id="tutorials.hero.lead" description="Hero lead paragraph; keep product names in English">Short guides built on real recordings of the SpecWeave CLI and SpecWithCode. Each one names the outcome, shows the video with chapters, lists the steps and prints the transcript.</Translate>
            </p>
            <p className={styles.heroStats} style={{['--i' as string]: 2}}>
              <span><Translate id="tutorials.hero.stats.guides" description="Hero stat; {count} is the number of guides" values={{count: <b><CountUp value={TUTORIALS.length} /></b>}}>{'{count} guides'}</Translate></span>
              <span><Translate id="tutorials.hero.stats.paths" description="Hero stat; {count} is the number of learning paths" values={{count: <b><CountUp value={LOCAL_PATHS.length} /></b>}}>{'{count} learning paths'}</Translate></span>
              <a className="wv-link" href="#all-title"><Translate id="tutorials.hero.browseAll" description="Link that jumps to the list of all guides">Browse all guides</Translate></a>
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
            <h2 id="paths-title">{LOCAL_PATHS.length === 1
              ? translate({id: 'tutorials.paths.heading.one', message: 'Learning path', description: 'Section heading when there is one learning path'})
              : translate({id: 'tutorials.paths.heading.other', message: 'Learning paths', description: 'Section heading when there are several learning paths'})}</h2>
            <p><Translate id="tutorials.paths.intro" description="Learning paths section intro">Follow a path from the first step to a finished result. Each step is its own guide; a path appears here once it has at least two.</Translate></p>
          </div>
          <ol className={styles.paths}>
            {LOCAL_PATHS.map(path => <PathColumn key={path.id} path={path} />)}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="all-title">
          <div className={styles.sectionHead}>
            <h2 id="all-title"><Translate id="tutorials.all.heading" description="Section heading of the full guide list">All guides</Translate></h2>
          </div>
          <div className={styles.controls}>
            <div className={styles.search}>
              <label htmlFor={searchId}><Translate id="tutorials.search.label" description="Label of the guide search box">Search guides</Translate></label>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={translate({id: 'tutorials.search.placeholder', message: 'handoff, usage, Codex', description: 'Example search words in the guide search box; keep Codex in English'})}
                autoComplete="off"
              />
            </div>
            <div className={styles.filters} role="group" aria-label={translate({id: 'tutorials.filter.groupAria', message: 'Product', description: 'Accessible label of the product filter buttons'})}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  className={styles.filter}
                  aria-pressed={filter === f.id}
                  aria-label={selectMessage(counts[f.id], translate({id: 'tutorials.filter.aria', message: '{label}, {count} guide|{label}, {count} guides', description: 'Accessible label of a filter button, plural forms separated by "|"; {label} is the filter name'}, {label: f.label, count: counts[f.id]}))}
                  onClick={() => choose(f.id)}
                >
                  {f.label}<span className={styles.count} aria-hidden="true">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>
          <p className={styles.resultCount} aria-live="polite">
            {visible.length === TUTORIALS.length
              ? translate({id: 'tutorials.results.all', message: '{count} guides', description: 'Result count when every guide is shown'}, {count: visible.length})
              : translate({id: 'tutorials.results.some', message: '{count} of {total} guides', description: 'Result count when a filter or search is active'}, {count: visible.length, total: TUTORIALS.length})}
          </p>
          {visible.length > 0 ? (
            <ul className={styles.rows} ref={glow}>
              {visible.map(t => <GuideRow key={t.slug} tutorial={t} />)}
            </ul>
          ) : (
            <p className={styles.empty}>
              <Translate
                id="tutorials.results.empty"
                description="Shown when no guide matches; {reset} is a button that clears the search"
                values={{reset: <button type="button" className={styles.reset} onClick={() => { setQuery(''); choose('all'); }}>{translate({id: 'tutorials.results.emptyReset', message: 'show all guides', description: 'Button text that clears the search and filter'})}</button>}}
              >{'No guide matches that yet. Try another word, or {reset}.'}</Translate>
            </p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="other-title">
          <div className={styles.sectionHead}>
            <h2 id="other-title"><Translate id="tutorials.other.heading" description="Section heading">From the other products</Translate></h2>
          </div>
          <p className={styles.other}>
            <Translate id="tutorials.other.body" description="Points to tutorials on another site; keep verified-skill.com in English">Guides for finding, testing and publishing agent skills live on verified-skill.com.</Translate>{' '}
            <a className="wv-link" href={VERIFIED_SKILL_WATCH}><Translate id="tutorials.other.link" description="Link to the Verified Skill tutorials; keep Verified Skill in English">Verified Skill tutorials</Translate></a>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="standards-title">
          <div className={styles.sectionHead}>
            <h2 id="standards-title"><Translate id="tutorials.standards.heading" description="Section heading">What every guide includes</Translate></h2>
          </div>
          <ul className={clsx(styles.standards, m.stagger)}>
            <li className={m.card} style={{['--i' as string]: 0}}>
              <span className={m.icon} aria-hidden="true">{STANDARD_ICONS[0]}</span>
              <span className="wv-evidence__name"><Translate id="tutorials.standards.recording.title" description="Standard card title">A real recording</Translate></span>
              <span className="wv-evidence__detail"><Translate id="tutorials.standards.recording.body" description="Standard card body">Footage of the running app or real command output, with sample projects. Each guide says which version it shows and when it was added; recordings of the current release come first.</Translate></span>
            </li>
            <li className={m.card} style={{['--i' as string]: 1}}>
              <span className={m.icon} aria-hidden="true">{STANDARD_ICONS[1]}</span>
              <span className="wv-evidence__name"><Translate id="tutorials.standards.captions.title" description="Standard card title">Captions, chapters and a transcript</Translate></span>
              <span className="wv-evidence__detail"><Translate id="tutorials.standards.captions.body" description="Standard card body; keep WebVTT in English">A WebVTT caption track, chapters you can jump to with the keyboard, and a transcript built from the captions.</Translate></span>
            </li>
            <li className={m.card} style={{['--i' as string]: 2}}>
              <span className={m.icon} aria-hidden="true">{STANDARD_ICONS[2]}</span>
              <span className="wv-evidence__name"><Translate id="tutorials.standards.hosted.title" description="Standard card title">Hosted on this site</Translate></span>
              <span className="wv-evidence__detail"><Translate id="tutorials.standards.hosted.body" description="Standard card body; keep spec-weave.com in English">Videos and posters load from spec-weave.com, with no third-party player or tracking.</Translate></span>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
